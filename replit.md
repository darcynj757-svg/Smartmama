# Смарт Мама

AI-помощник для русскоязычных мам — Telegram-бот + Mini App с AI-чатом, трекерами, дневником, нейрофото и информацией о пособиях.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — запустить API сервер (порт 8080)
- `python -m bot.main` — запустить Telegram бот (long polling)
- `pnpm run typecheck` — полная проверка TypeScript
- `pnpm run build` — сборка всех пакетов
- `pip install -r bot/requirements.txt` — установить Python зависимости

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + multer + better-sqlite3
- Bot: Python aiogram 3.27 + aiosqlite (long polling в dev, webhook в prod)
- DB: SQLite (bot/data/smartmama.db — пишет бот, API читает через better-sqlite3)
- AI: OpenAI GPT-4o-mini (чат, рецепты, речь, игры, здоровье, выплаты) + DALL-E 3 (нейрофото)
- Mini App: Vanilla HTML/CSS/JS (bot/webapp/)

## Where things live

- `bot/` — Python Telegram бот (aiogram 3)
  - `bot/main.py` — точка входа, schedulers, webhook/polling режим
  - `bot/handlers.py` — onboarding FSM, admin commands
  - `bot/database.py` — async SQLite через aiosqlite
  - `bot/keyboards.py` — клавиатуры
  - `bot/texts.py` — советы по развитию (5 категорий × возрасты)
  - `bot/webapp/` — Mini App (index.html, styles.css, app.js)
  - `bot/data/smartmama.db` — SQLite база данных
- `artifacts/api-server/src/routes/` — Express API маршруты
  - `ai.ts` — AI endpoints (chat, vision, fridge, recipe, neuro, benefits, speech, games, health)
  - `user.ts` — sync профиля из SQLite
  - `admin.ts` — admin stats/users/gift
  - `payment.ts` — YooKassa интеграция (создание, webhook)
  - `lib/telegram-auth.ts` — проверка Telegram initData

## Architecture decisions

- SQLite общая: бот пишет через aiosqlite, API сервер читает через better-sqlite3 (sync, readonly для статистики)
- Mini App авторизуется через Telegram initData (X-Telegram-Init-Data заголовок)
- Бот в dev запускается в long polling, в prod (с PORT env) переключается на webhook
- AI лимиты: бесплатно 10/день, стартер 20/день, премиум — безлимит
- Платежи через YooKassa (требуются YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY)

## Product

- **AI-чат** — 5 специализированных чатов (общий, речь, игры, питание, здоровье) с GPT-4o-mini
- **Трекеры** — сон и питание с нормами по возрасту, хранятся в localStorage
- **Дневник** — события, прививки, рост/вес, болезни, документы
- **Нейрофото** — AI-портреты малыша в 16 стилях через DALL-E 3
- **Питание** — анализ фото холодильника + AI рецепты
- **Выплаты** — AI-информация о пособиях по региону
- **Тарифы** — Бесплатно / Стартер 290₽ / Премиум 490₽ с периодами 1/3/6/12 мес
- **Реферальная программа** — 3 уровня амбассадоров
- **Рассылки** — 5 schedulers: советы в 9:00, питание в 10:00, игры в 14:00, речь в 16:00, пятничный вечер в 21:00 МСК

## User preferences

- Язык: русский везде (UI, AI ответы, ботовые сообщения)
- AI: OpenAI GPT-4o-mini (не Gemini)
- Свободный лимит AI: 10/день

## Gotchas

- Перед запуском бота в polling режиме нужно удалить webhook: `GET https://api.telegram.org/bot{TOKEN}/deleteWebhook`
- better-sqlite3 требует разрешения сборки в pnpm-workspace.yaml (`onlyBuiltDependencies`)
- В prod режиме (PORT задан) бот поднимает aiohttp-сервер и принимает webhook на /bot
- YooKassa платежи вернут 503 пока не заданы YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY
- Mini App URL нужен PUBLIC_BASE_URL (из REPLIT_DOMAINS) — в dev без него кнопка открытия приложения не показывает web_app

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
