import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta, date

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import MenuButtonDefault

import bot.database as db
from bot.config import BOT_TOKEN, PORT, PUBLIC_BASE_URL, WEBAPP_PATH
from bot.fsm_storage import SqliteStorage
from bot.handlers import router
from bot.texts import get_daily_tip, get_game_tip, get_speech_tip, get_food_tip, get_evening_reminder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
log = logging.getLogger("smartmama")

# ─── Защита от двойных рассылок ──────────────────────────────────────────────
_daily_sent_date = None
_games_sent_date = None
_speech_sent_date = None
_food_sent_date = None
_evening_sent_date = None


def _seconds_until_hour(target_hour: int) -> float:
    now = datetime.now(timezone.utc) + timedelta(hours=3)  # МСК
    target = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def _broadcast(bot: Bot, make_text, label: str):
    users = await db.get_users_for_daily_tip()
    sent = 0
    for u in users:
        try:
            age = u.get("child_age_months") or 0
            day = date.today().timetuple().tm_yday
            text = make_text(age, day)
            await bot.send_message(u["user_id"], text)
            await db.mark_tip_sent(u["user_id"])
            sent += 1
            await asyncio.sleep(0.3)
        except Exception as e:
            log.warning(f"[{label}] Не удалось отправить {u['user_id']}: {e}")
    log.info(f"[{label}] Отправлено {sent} сообщений")


async def scheduler_daily(bot: Bot):
    global _daily_sent_date
    while True:
        await asyncio.sleep(_seconds_until_hour(9))
        today = date.today().isoformat()
        if _daily_sent_date != today:
            _daily_sent_date = today
            await _broadcast(bot, get_daily_tip, "daily_tip")
        await asyncio.sleep(60)


async def scheduler_games(bot: Bot):
    global _games_sent_date
    while True:
        await asyncio.sleep(_seconds_until_hour(14))
        today = date.today().isoformat()
        if _games_sent_date != today:
            _games_sent_date = today
            await _broadcast(bot, get_game_tip, "game_tip")
        await asyncio.sleep(60)


async def scheduler_speech(bot: Bot):
    global _speech_sent_date
    while True:
        await asyncio.sleep(_seconds_until_hour(16))
        today = date.today().isoformat()
        if _speech_sent_date != today:
            _speech_sent_date = today
            await _broadcast(bot, get_speech_tip, "speech_tip")
        await asyncio.sleep(60)


async def scheduler_food(bot: Bot):
    global _food_sent_date
    while True:
        await asyncio.sleep(_seconds_until_hour(10))
        today = date.today().isoformat()
        if _food_sent_date != today:
            _food_sent_date = today
            await _broadcast(bot, get_food_tip, "food_tip")
        await asyncio.sleep(60)


async def scheduler_evening(bot: Bot):
    global _evening_sent_date
    while True:
        await asyncio.sleep(_seconds_until_hour(21))
        now = datetime.now(timezone.utc) + timedelta(hours=3)
        today = date.today().isoformat()
        if now.weekday() == 4 and _evening_sent_date != today:  # пятница
            _evening_sent_date = today
            users = await db.get_users_for_daily_tip()
            day = date.today().timetuple().tm_yday
            for u in users:
                try:
                    await bot.send_message(u["user_id"], get_evening_reminder(day))
                    await asyncio.sleep(0.3)
                except Exception as e:
                    log.warning(f"[evening] {u['user_id']}: {e}")
        await asyncio.sleep(60)


async def _clear_menu(bot: Bot):
    try:
        await bot.set_chat_menu_button(menu_button=MenuButtonDefault())
        await bot.set_my_commands([])
    except Exception:
        pass


async def run_development(bot: Bot, dp: Dispatcher):
    await _clear_menu(bot)
    log.info("Запуск в режиме long polling...")
    await dp.start_polling(bot, skip_updates=True)


async def run_production(bot: Bot, dp: Dispatcher, port: int):
    from aiohttp import web
    from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

    webhook_url = f"{PUBLIC_BASE_URL}/bot"
    await _clear_menu(bot)
    await bot.set_webhook(
        url=webhook_url,
        drop_pending_updates=True,
        allowed_updates=dp.resolve_used_update_types()
    )
    log.info(f"Webhook установлен: {webhook_url}")

    app = web.Application()

    async def healthz(request):
        return web.Response(text='{"status":"ok"}', content_type="application/json")

    app.router.add_get("/healthz", healthz)

    # Статика Mini App
    webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")
    if os.path.exists(webapp_dir):
        app.router.add_static("/webapp", webapp_dir, show_index=True)

    SimpleRequestHandler(dispatcher=dp, bot=bot).register(app, path="/bot")
    setup_application(app, dp, bot=bot)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    log.info(f"Webhook-сервер запущен на порту {port}")
    await asyncio.Event().wait()


async def main():
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN не задан")

    await db.init_db()
    from bot.config import ADMIN_USER_IDS
    db.set_admin_ids_cache(ADMIN_USER_IDS)

    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=SqliteStorage("bot/data/fsm.db"))
    dp.include_router(router)

    asyncio.create_task(scheduler_daily(bot))
    asyncio.create_task(scheduler_games(bot))
    asyncio.create_task(scheduler_speech(bot))
    asyncio.create_task(scheduler_food(bot))
    asyncio.create_task(scheduler_evening(bot))

    if PORT:
        await run_production(bot, dp, int(PORT))
    else:
        await run_development(bot, dp)


if __name__ == "__main__":
    asyncio.run(main())
