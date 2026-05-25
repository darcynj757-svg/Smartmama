from aiogram import Router, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery
from aiogram.exceptions import TelegramBadRequest

import bot.database as db
from bot.config import ADMIN_USER_IDS
from bot.keyboards import open_app_kb, gender_kb

router = Router()


class Onboarding(StatesGroup):
    mama_name = State()
    child_name = State()
    child_age = State()
    child_gender = State()
    region = State()


class AdminGift(StatesGroup):
    target = State()
    days = State()


# ─── /start ──────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    user = message.from_user
    await db.upsert_user(user.id, user.username or "", user.first_name or "")

    # Реферальная ссылка
    args = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else ""
    if args.startswith("ref_"):
        try:
            ref_id = int(args[4:])
            await db.set_referrer(user.id, ref_id)
        except ValueError:
            pass

    # Если уже прошли онбординг
    existing = await db.get_user(user.id)
    if existing and existing.get("child_name"):
        await state.clear()
        await message.answer(
            "Все функции доступны в Mini App 👇",
            reply_markup=open_app_kb()
        )
        return

    await state.set_state(Onboarding.mama_name)
    await message.answer(
        "Привет! 🌸 Я — <b>Смарт Мама</b>, твой AI-помощник для воспитания малыша.\n\n"
        "Как тебя зовут, мамочка?",
        parse_mode="HTML"
    )


# ─── Онбординг: имя мамы ─────────────────────────────────────────────────────

@router.message(Onboarding.mama_name)
async def ob_mama_name(message: Message, state: FSMContext):
    await state.update_data(mama_name=message.text.strip())
    await state.set_state(Onboarding.child_name)
    await message.answer("Как зовут малыша? 👶")


# ─── Онбординг: имя ребёнка ──────────────────────────────────────────────────

@router.message(Onboarding.child_name)
async def ob_child_name(message: Message, state: FSMContext):
    await state.update_data(child_name=message.text.strip())
    await state.set_state(Onboarding.child_age)
    await message.answer("Сколько месяцев малышу? (введи число от 0 до 216) 🎂")


# ─── Онбординг: возраст ──────────────────────────────────────────────────────

@router.message(Onboarding.child_age)
async def ob_child_age(message: Message, state: FSMContext):
    try:
        age = int(message.text.strip())
        if not 0 <= age <= 216:
            raise ValueError
    except ValueError:
        await message.answer("Пожалуйста, введи число от 0 до 216 🔢")
        return
    await state.update_data(child_age_months=age)
    await state.set_state(Onboarding.child_gender)
    await message.answer("Кто твой малыш? 👶", reply_markup=gender_kb())


# ─── Онбординг: пол (callback) ───────────────────────────────────────────────

@router.callback_query(Onboarding.child_gender, F.data.startswith("ob:gender:"))
async def ob_child_gender(callback: CallbackQuery, state: FSMContext):
    gender = "boy" if callback.data == "ob:gender:boy" else "girl"
    await state.update_data(child_gender=gender)
    await state.set_state(Onboarding.region)
    try:
        await callback.message.edit_reply_markup(reply_markup=None)
    except TelegramBadRequest:
        pass
    await callback.answer()
    await callback.message.answer("В каком регионе России вы живёте? 🗺")


# ─── Онбординг: регион ───────────────────────────────────────────────────────

@router.message(Onboarding.region)
async def ob_region(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()

    user = message.from_user
    await db.update_profile(
        user.id,
        mama_name=data.get("mama_name", ""),
        child_name=data.get("child_name", ""),
        child_age_months=data.get("child_age_months", 0),
        child_gender=data.get("child_gender", ""),
        region=message.text.strip(),
    )

    child_name = data.get("child_name", "малыш")
    mama_name = data.get("mama_name", "")
    await message.answer(
        f"Отлично, {mama_name}! 🎉\n\n"
        f"Всё готово для {child_name}. Открывай приложение — там тебя ждут AI-чат, трекеры, дневник и многое другое!",
        reply_markup=open_app_kb()
    )


# ─── Админ-команды ───────────────────────────────────────────────────────────

@router.message(Command("admin"))
async def cmd_admin(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS and not await db.is_admin(message.from_user.id):
        return
    stats = await db.get_admin_stats()
    text = (
        f"📊 <b>Статистика Smart Mama</b>\n\n"
        f"👥 Всего пользователей: <b>{stats['total']}</b>\n"
        f"👶 С заполненным профилем: <b>{stats['with_child']}</b>\n"
        f"💎 Премиум: <b>{stats['premium']}</b>\n\n"
        f"📅 Новых сегодня: <b>{stats['today_new']}</b>\n"
        f"📅 За неделю: <b>{stats['week_new']}</b>\n\n"
        f"🟢 Активны сегодня: <b>{stats['active_today']}</b>\n"
        f"🟢 Активны за неделю: <b>{stats['active_week']}</b>\n\n"
        f"🤖 AI запросов сегодня: <b>{stats['ai_today']}</b>"
    )
    await message.answer(text, parse_mode="HTML")


@router.message(Command("listusers"))
async def cmd_listusers(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS and not await db.is_admin(message.from_user.id):
        return
    users = await db.get_recent_users(20)
    lines = []
    from datetime import date
    today = date.today().isoformat()
    for u in users:
        plan = "💎 PREMIUM" if (u.get("premium_until") and u["premium_until"] >= today) else "🆓 FREE"
        name = u.get("mama_name") or u.get("first_name") or "—"
        lines.append(f"• {name} (ID: {u['user_id']}) — {plan}")
    text = "👥 <b>Последние 20 пользователей:</b>\n\n" + "\n".join(lines) if lines else "Пользователей пока нет"
    await message.answer(text, parse_mode="HTML")


@router.message(Command("addadmin"))
async def cmd_addadmin(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS:
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Использование: /addadmin @username или /addadmin 123456")
        return
    target = args[1].strip()
    if target.startswith("@"):
        user = await db.get_user_by_username(target)
        if not user:
            await message.answer(f"Пользователь {target} не найден")
            return
        uid = user["user_id"]
    else:
        try:
            uid = int(target)
        except ValueError:
            await message.answer("Неверный формат ID")
            return
    await db.add_admin(uid, message.from_user.id)
    await message.answer(f"✅ Пользователь {uid} добавлен в администраторы")


@router.message(Command("removeadmin"))
async def cmd_removeadmin(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS:
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Использование: /removeadmin @username или /removeadmin 123456")
        return
    target = args[1].strip()
    if target.startswith("@"):
        user = await db.get_user_by_username(target)
        if not user:
            await message.answer(f"Пользователь {target} не найден")
            return
        uid = user["user_id"]
    else:
        try:
            uid = int(target)
        except ValueError:
            await message.answer("Неверный формат ID")
            return
    await db.remove_admin(uid)
    await message.answer(f"✅ Пользователь {uid} удалён из администраторов")


@router.message(Command("gift"))
async def cmd_gift(message: Message, state: FSMContext):
    if message.from_user.id not in ADMIN_USER_IDS and not await db.is_admin(message.from_user.id):
        return
    await state.set_state(AdminGift.target)
    await message.answer("🎁 Кому дарим подписку? Укажи @username или ID пользователя")


@router.message(AdminGift.target)
async def gift_target(message: Message, state: FSMContext):
    target = message.text.strip()
    if target.startswith("@"):
        user = await db.get_user_by_username(target)
        if not user:
            await message.answer(f"Пользователь {target} не найден. Попробуй ещё раз или /cancel")
            return
        uid = user["user_id"]
    else:
        try:
            uid = int(target)
        except ValueError:
            await message.answer("Неверный формат. Введи @username или числовой ID")
            return
    await state.update_data(target_uid=uid)
    await state.set_state(AdminGift.days)
    await message.answer(f"Пользователь {uid}. Сколько дней подписки подарить?")


@router.message(AdminGift.days)
async def gift_days(message: Message, state: FSMContext):
    try:
        days = int(message.text.strip())
        if days <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Введи положительное число дней")
        return
    data = await state.get_data()
    uid = data["target_uid"]
    success, until = await db.gift_subscription(uid, days)
    await state.clear()
    await message.answer(f"✅ Подписка на {days} дней добавлена пользователю {uid}. Действует до: {until}")


@router.message(Command("userinfo"))
async def cmd_userinfo(message: Message):
    if message.from_user.id not in ADMIN_USER_IDS and not await db.is_admin(message.from_user.id):
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer("Использование: /userinfo @username или /userinfo 123456")
        return
    target = args[1].strip()
    if target.startswith("@"):
        user = await db.get_user_by_username(target)
    else:
        try:
            user = await db.get_user(int(target))
        except ValueError:
            await message.answer("Неверный формат")
            return
    if not user:
        await message.answer("Пользователь не найден")
        return
    from datetime import date
    today = date.today().isoformat()
    plan = "💎 PREMIUM" if (user.get("premium_until") and user["premium_until"] >= today) else "🆓 FREE"
    text = (
        f"👤 <b>Пользователь {user['user_id']}</b>\n"
        f"Имя мамы: {user.get('mama_name') or '—'}\n"
        f"Малыш: {user.get('child_name') or '—'}, {user.get('child_age_months') or 0} мес, "
        f"{'мальчик' if user.get('child_gender') == 'boy' else 'девочка' if user.get('child_gender') == 'girl' else '—'}\n"
        f"Регион: {user.get('region') or '—'}\n"
        f"Тариф: {plan}\n"
        f"Подписка до: {user.get('premium_until') or 'нет'}\n"
        f"Зарегистрирован: {(user.get('created_at') or '')[:10]}\n"
        f"Последний визит: {(user.get('last_seen') or '')[:10]}"
    )
    await message.answer(text, parse_mode="HTML")


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Отменено ✅")


# ─── Fallback ─────────────────────────────────────────────────────────────────

@router.message()
async def fallback(message: Message, state: FSMContext):
    current_state = await state.get_state()
    if current_state:
        return
    user = await db.get_user(message.from_user.id)
    if user and user.get("child_name"):
        await message.answer(
            "Все функции доступны в Mini App 👇",
            reply_markup=open_app_kb()
        )
    else:
        await message.answer(
            "Привет! 🌸 Напиши /start чтобы начать"
        )
