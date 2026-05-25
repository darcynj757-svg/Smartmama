# Промт для Replit Agent: Telegram-бот + Mini App «Смарт Мама»

> **Как использовать:** скопируй этот документ целиком в окно Replit Agent. Промт построен на анализе работающего прототипа: исходного кода Python-бота, HTML главного файла Mini App, конфигов монорепо и десятков скриншотов рабочих экранов и багов. Всё, что я не видел в исходниках, явно помечено как **[реконструировать]** или **[уточнить]** — не выдумывай данные, если упоминается такая пометка, спроси у пользователя.

---

## 0. Цель проекта

Telegram-бот **«Смарт Мама»** (`@smart_mama_ai_bot` — пример) для русскоязычных мам с детьми 0–6 лет. Бот отвечает только за онбординг и кнопку запуска Mini App. **Весь функционал — внутри Mini App** (AI-чат, трекеры, дневник, нейрофото, выплаты, питание).

Целевая аудитория: мамы из России и СНГ, оплата в рублях через ЮKassa или Telegram Stars.

---

## 1. Технологический стек

### 1.1. Telegram-бот (папка `bot/`)
- **Python 3.11**
- **aiogram 3.27.0** (long polling в dev, webhook в production)
- **aiosqlite 0.22.1** — основная БД пользователей в `bot/data/smartmama.db`
- **aiohttp 3.13.5** — web-сервер для webhook + раздача статики Mini App
- **pydantic 2.12.5**, **python-dotenv 1.2.2**

### 1.2. API-сервер (`artifacts/api-server/`)
- **Node.js + Express (TypeScript)**, сборка через **esbuild**
- Запускается в dev-режиме; в production бот сам раздаёт Mini App
- Эндпоинты — см. раздел 5

### 1.3. Mini App (`bot/webapp/`)
- Чистый **HTML / CSS / JavaScript** без сборки (один файл `index.html`, один `styles.css`, один `app.js`)
- **Telegram WebApp SDK** (`telegram-web-app.js`)
- Шрифты Google Fonts: **Comfortaa 700** (заголовки) + **Nunito 400/600/700/800** (текст)
- Поддержка PWA-метатегов (`viewport-fit=cover`, `theme-color`)

### 1.4. Монорепо (pnpm workspaces, TypeScript)
- **pnpm** только (есть `preinstall`-скрипт, блокирующий npm/yarn)
- **Минимальный возраст npm-пакетов 1440 минут** (защита от supply-chain) — задано в `pnpm-workspace.yaml`, **не отключать**
- TypeScript ~5.9.2, project references, composite-сборка
- **Drizzle ORM 0.45.2 + PostgreSQL** (`lib/db`) — для будущей миграции с SQLite
- **Orval 8.5.3** — кодогенерация из `openapi.yaml` → React Query клиент + Zod схемы
- **@tanstack/react-query** для клиента
- Под Replit оверрайды собирают только `linux-x64`-бинари (esbuild, lightningcss, tailwind-oxide, rollup, ngrok)

### 1.5. AI
- **Gemini 2.5 Flash через Replit AI Integrations** (env: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`)

---

## 2. Структура репозитория

```
.
├── bot/
│   ├── main.py              # точка входа: long polling (dev) / webhook (prod) + 5 schedulers
│   ├── config.py            # env-конфиг + бренд-цвета + цены
│   ├── database.py          # aiosqlite CRUD: users, usage, diary, admins
│   ├── fsm_storage.py       # SqliteStorage для aiogram FSM
│   ├── handlers.py          # ТОЛЬКО онбординг (5 шагов) + fallback → Mini App
│   ├── keyboards.py         # reply_app_kb, open_app_kb, gender_kb
│   ├── texts.py             # все строки + DAILY_TIPS / get_*_tip
│   ├── data/
│   │   ├── smartmama.db     # SQLite пользователей
│   │   └── fsm.db           # SQLite FSM-состояний
│   └── webapp/
│       ├── index.html       # Mini App SPA
│       ├── styles.css
│       └── app.js
├── artifacts/
│   └── api-server/          # Express + esbuild (TypeScript)
│       └── src/
│           ├── index.ts
│           ├── routes/
│           │   ├── ai.ts        # /api/ai/* — Gemini
│           │   ├── user.ts      # /api/user/* — HMAC проверка initData
│           │   ├── admin.ts     # /api/admin/* — ADMIN_TOKEN
│           │   └── payment.ts   # /api/payment/webhook — ЮKassa
│           └── lib/
├── lib/
│   ├── db/                  # Drizzle + pg (Postgres) [пока без моделей]
│   ├── api-spec/            # orval.config.ts + openapi.yaml
│   ├── api-zod/             # сгенерированные Zod-схемы
│   └── api-client-react/    # сгенерированный React Query клиент + customFetch
├── scripts/                 # tsx-скрипты
├── pyproject.toml           # aiogram, aiohttp, aiosqlite, pydantic, dotenv
├── requirements.txt         # дубль pyproject — для Replit
├── package.json             # корневой workspace
├── pnpm-workspace.yaml      # каталог зависимостей + safety overrides
├── tsconfig.json + tsconfig.base.json
├── post-merge.sh            # git-хук: pnpm install + db push
└── replit.md                # документация
```

---

## 3. Бренд и дизайн-система

### 3.1. Цвета (из `bot/config.py`)
```python
BRAND_PRIMARY = "#F8C1CC"  # розовый — кнопки, акценты
BRAND_ACCENT  = "#A8DADC"  # мятный — иконки трекеров
BRAND_BG      = "#FAF3E7"  # бежевый — фон Mini App
```
Дополнительно используются:
- `#FDF6EF` — фон meta theme-color
- `#3D2E39` — основной тёмный текст
- `#8A7A85` — вторичный серо-розовый текст
- Лавандовый (`tile-dr`), кораллово-персиковый (`tile-fd`) для иконок плиток

### 3.2. Типографика
```html
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
```
- Заголовки экранов и эмодзи-блоки — **Comfortaa 700**
- Основной текст и UI — **Nunito 400/600/700/800**

### 3.3. Компоненты Mini App (по index.html — точные классы)

| Класс | Назначение |
|---|---|
| `.tile`, `.tile-full` | Карточки-плитки на главной (2×N сетка) |
| `.tile-top.tile-{xx}-b` | Цветная полоска сверху карточки |
| `.tile-ico.tile-{xx}` | Круглая иконка-эмодзи в плитке |
| `.tile-stat` | Цифра-статистика в углу плитки (кормления, сон) |
| `.ai-banner`, `.neuro-banner`, `.moms-chat-banner`, `.price-banner`, `.ref-home-banner` | Широкие баннеры на главной |
| `.ai-caps` + `.ai-cap` | Горизонтальная лента чипов под AI-баннером |
| `.chat-screen`, `.msgs-area`, `.chat-bar` | Экраны AI-чатов |
| `.chat-hdr.pink / .green / .teal / .lav` | Цветные шапки чатов |
| `.chip`, `.chips-scroll`, `.chips-wrap` | Чипы быстрых вопросов |
| `.tr-card`, `.tr-val`, `.tr-norm`, `.tr-bar-bg`, `.tr-bar` | Карточки трекеров с прогресс-баром |
| `.form-card`, `.field-label`, `.field-input`, `.field-select`, `.form-btns`, `.btn-pri`, `.btn-out` | Формы |
| `.price-card.free-c / .start-c / .prem-c` | Карточки тарифов |
| `.period-toggle`, `.period-btn`, `.period-badge` | Селектор периода подписки (1/3/6/12 мес) |
| `.amb-card.level-{1,2,3}` | Карточки уровней реферальной программы |
| `.diary-modal-overlay`, `.diary-modal-sheet`, `.modal-handle` | Bottom-sheet модалки |
| `.entry-list`, `.norm-list`, `.sec-title` | Списки и подзаголовки |

### 3.4. Навигация
- **Топбар** (`#topbar`) фиксированный сверху: логотип 🌸 + «Смарт Мама»
- **Круглая кнопка профиля** (`#profile-btn`) в правом верхнем углу, эмодзи-аватар
- **Bottom-nav** (`#bottom-nav`) фиксированный, 4 пункта: 🏠 Главная · 👩‍💼 AI Чат · 🥗 Питание · 💎 Тарифы
- Все экраны — `<section class="screen">`, переключение через `go(screen)` JS-функцию

---

## 4. Telegram-бот

### 4.1. Конфигурация (`config.py`)
Все значения через `os.environ.get`:
- `BOT_TOKEN` — обязателен
- `PORT` — если задан, бот работает в webhook-режиме; иначе long polling
- `ADMIN_USER_ID` — список через запятую (поддерживай и одиночный ID для обратной совместимости)
- `ADMIN_TOKEN` — для админ-эндпоинтов API
- `REPLIT_DOMAINS` → `PUBLIC_BASE_URL = https://{first_domain}`
- `REPLIT_DEPLOYMENT` → `WEBAPP_PATH = "/"` (иначе `/webapp/`)
- `WEBAPP_URL = PUBLIC_BASE_URL + WEBAPP_PATH`
- Цены: `PRICE_MONTHLY=490`, `PRICE_YEARLY=3900`
- **Добавь дополнительно** (в текущем `config.py` их нет, но в UI они используются): `PRICE_STARTER=290`, `PRICE_NEUROPHOTO=199`, `PRICE_BENEFITS_GUIDE=149`
- `FREE_LIMIT_PER_DAY = 3` (фактически в UI показано **10** AI-ответов в день — **уточни с пользователем** какое значение каноничное)

### 4.2. База данных (`database.py`)

#### Таблицы (CREATE IF NOT EXISTS + миграции через `ALTER TABLE ADD COLUMN` в try/except)

**`users`** — основная:
```sql
user_id          INTEGER PRIMARY KEY,
username         TEXT,
first_name       TEXT,
mama_name        TEXT,
child_name       TEXT,
child_age_months INTEGER,
child_gender     TEXT,
region           TEXT,
premium_until    TEXT,
referrer_id      INTEGER,
created_at       TEXT,
last_seen        TEXT,
last_tip_date    TEXT,
webapp_json      TEXT   -- JSON с расширенным профилем (несколько детей, аллергии, группа крови, педиатр)
```

**`usage`** — счётчики использования для админ-статистики:
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER, feature TEXT, used_at TEXT
```

**`diary`** — записи дневника:
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER, entry_type TEXT, title TEXT, value TEXT,
event_date TEXT, created_at TEXT
```

**`admins`** — дополнительные администраторы (помимо `ADMIN_USER_IDS` из env):
```sql
user_id INTEGER PRIMARY KEY, added_by INTEGER, added_at TEXT
```

#### Обязательные функции (точные сигнатуры из исходника)
- `init_db()` — создание + миграции
- `upsert_user(user_id, username, first_name)`
- `get_user(user_id) -> dict | None`
- `update_profile(user_id, **fields)`
- `set_referrer(user_id, referrer_id)` — только если ещё нет реферера и это не самореферал
- `get_users_for_daily_tip()` — фильтр: `child_name IS NOT NULL AND last_tip_date != today`
- `mark_tip_sent(user_id)` — **обязательно вызывай после успешной отправки рассылки** (в оригинале забыт — см. раздел 13)
- `get_user_by_username(username)` — регистронезависимый поиск по `@ник`
- `search_users_by_name(query, limit=5)`
- `get_recent_users(limit=20)`
- `is_admin(user_id) -> bool` — проверяет env-список И таблицу `admins`
- `add_admin / remove_admin / get_admins`
- `gift_subscription(user_id, days) -> (bool, "YYYY-MM-DD")` — продлевает от текущей даты окончания, если ещё активна
- `get_admin_stats() -> dict` — total, with_child, premium, today_new, week_new, active_today, active_week, ai_today, recent[5], premium_users[]

### 4.3. Онбординг — единственный флоу бота (`handlers.py`)

**5 шагов FSM**, состояния по аналогии с aiogram 3 (StatesGroup):
1. **Имя мамы** (`Как тебя зовут, мамочка? 🌸`) — текст
2. **Имя малыша** (`Как зовут малыша?`) — текст
3. **Возраст в месяцах** (`Сколько месяцев малышу? (введи число)`) — int с валидацией 0–216
4. **Пол малыша** — **инлайн-кнопки** `gender_kb()` (Мальчик / Девочка), callback `ob:gender:boy|girl`
5. **Регион** (`В каком регионе России вы живёте?`) — текст

После шага 5 — сообщение `«✨ Открыть Smart Mama»` с `open_app_kb()` (WebApp-кнопка).

**⚠️ Критичный баг оригинала, который НЕ повторяй:**
На шаге «регион» FSM теряется и сообщение попадает в fallback `«Не понял запрос 🌷»`. Убедись, что хендлер региона:
- Подписан на текущее FSM-состояние `Onboarding.region`
- Не блокируется глобальным `@router.message()` без фильтра
- Очищает состояние после успешного сохранения через `state.clear()`

**Возврат пользователя** (`/start` или любое сообщение когда онбординг уже пройден) → отправляй сообщение `«Все функции доступны в Mini App 👇»` с `open_app_kb()`.

**Реферальные ссылки** формата `https://t.me/{bot}?start=ref_{user_id}`:
- В `/start` парси аргумент после `ref_`
- Вызывай `set_referrer(new_user_id, ref_user_id)` ДО онбординга
- Не позволяй саморефералов (уже зашито в `set_referrer`)

### 4.4. Планировщики рассылок (`main.py`)

**5 параллельных асинхронных задач**, каждая в своём `asyncio.create_task()`:

| Задача | Время МСК | Функция в `texts.py` |
|---|---|---|
| Советы дня | 09:00 ежедневно | `get_daily_tip(age_months, day_of_year)` |
| Развивающие игры | 14:00 ежедневно | `get_game_tip(age, day)` |
| Игры для речи | 16:00 ежедневно | `get_speech_tip(age, day)` |
| Рацион питания | 10:00 ежедневно | `get_food_tip(age, day)` |
| Пятничное напоминание | 21:00 по пятницам | `get_evening_reminder(day)` |

**Реализация:**
- Московское время: `datetime.now(timezone.utc) + timedelta(hours=3)`
- Функция `_seconds_until_hour(target_hour)` — рассчёт сна до следующего срабатывания
- Глобальные защитные переменные `_*_sent_date` (in-memory) **И** обновление `last_tip_date` в БД через `mark_tip_sent()` — двойная защита от дублей при рестарте
- `_broadcast(bot, make_text, label)` — общая функция: `sleep(0.3)` между отправками, ловит исключения и логирует

### 4.5. FSM хранилище (`fsm_storage.py`)
Кастомный `SqliteStorage(BaseStorage)` для aiogram 3:
- Одна таблица `fsm_storage(key TEXT PRIMARY KEY, state TEXT, data TEXT DEFAULT '{}')`
- Ключ: `f"{bot_id}:{chat_id}:{user_id}"`
- `data` хранится как `json.dumps(..., ensure_ascii=False)`
- БД: `bot/data/fsm.db` (отдельная от `smartmama.db`)

### 4.6. Запуск (`main.py`)

```python
async def main():
    if not BOT_TOKEN: raise RuntimeError(...)
    await db.init_db()
    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=SqliteStorage("bot/data/fsm.db"))
    dp.include_router(router)
    
    if os.getenv("PORT"):
        await run_production(bot, dp, int(PORT))   # webhook + aiohttp + статика Mini App + healthcheck
    else:
        await run_development(bot, dp)              # long polling
```

**Webhook-режим:**
- URL: `{PUBLIC_BASE_URL}/bot`
- `bot.set_webhook(url=..., drop_pending_updates=True, allowed_updates=dp.resolve_used_update_types())`
- aiohttp app: `SimpleRequestHandler` на `/bot`, статика Mini App из `bot/webapp/` на `/`, GET `/healthz` → `{"status":"ok"}`
- Перед стартом — `_clear_menu(bot)`: `set_chat_menu_button(MenuButtonDefault())` + `set_my_commands([])` для очистки старых меню

### 4.7. Админ-команды бота
Из скриншотов восстановлены следующие команды для админа (точная реализация — **[реконструировать]**):
- `/admin` — общая статистика (`get_admin_stats`)
- `/listusers` — последние пользователи с тегами `FREE` / `PREMIUM` (Img из серии скриншотов)
- `/addadmin <user_id или @username>` — добавление админа через таблицу `admins`
- `/removeadmin <user_id или @username>` — удаление
- `/gift` — двушаговый FSM-флоу: «Кому дарим? @ник или ID» → «Сколько дней?» → `gift_subscription()`
- `/userinfo <user_id или @username>` — детали пользователя

**⚠️ Критичные баги, которые НЕ повторяй (см. раздел 13):**
- `/gift` без аргументов перехватывается онбординг-хендлером (вопрос «мальчик или девочка»)
- Поиск по `@username` не находит существующих пользователей — проверь, что `LOWER()` применяется и к запросу, и к колонке

---

## 5. API-сервер (`artifacts/api-server/`)

### 5.1. Эндпоинты

| Метод | Путь | Описание | Защита |
|---|---|---|---|
| POST | `/api/ai/chat` | AI-чат с историей сообщений | initData HMAC |
| POST | `/api/ai/chat-vision` | Анализ фото + вопрос | initData HMAC |
| POST | `/api/ai/fridge` | Анализ фото холодильника → список блюд (вернуть **распарсенный JSON**, не raw) | initData HMAC |
| POST | `/api/ai/food-recipe` | Рецепт выбранного блюда | initData HMAC |
| POST | `/api/ai/neuro-photo` | AI-портрет (base64) | initData HMAC + лимит |
| POST | `/api/ai/benefits` | Информация о выплатах по региону | initData HMAC |
| POST | `/api/ai/speech-exercise` | Упражнения для речи | initData HMAC |
| POST | `/api/ai/game-idea` | Идея развивающей игры | initData HMAC |
| POST | `/api/ai/health-advice` | Консультация по симптомам | initData HMAC |
| GET | `/api/user/sync` | Возвращает план подписки + полный профиль из SQLite (включая `webapp_json`) | initData HMAC |
| POST | `/api/user/save` | Сохраняет профиль из Mini App в `users.webapp_json` | initData HMAC |
| GET | `/api/user/usage` | Текущие лимиты и счётчики | initData HMAC |
| GET/POST | `/api/admin/*` | Админ-панель (stats, users, gift, etc.) | `Authorization: Bearer {ADMIN_TOKEN}` |
| POST | `/api/payment/webhook` | ЮKassa webhook (см. раздел 8) | Подпись ЮKassa |
| POST | `/api/payment/create` | Создание платежа | initData HMAC |
| GET | `/healthz` | Health check | — |

### 5.2. Авторизация Mini App
Все `/api/user/*` и `/api/ai/*` требуют заголовок **`X-Telegram-Init-Data`** с подписью, которую Telegram передаёт в `Telegram.WebApp.initData`.

Проверка по официальному алгоритму HMAC-SHA256 с ключом `HMAC-SHA256("WebAppData", BOT_TOKEN)`. Проверяй `auth_date` — отклоняй initData старше 24 часов.

---

## 6. Mini App — экраны (точная спецификация из `index.html`)

> **Каждый экран — `<section class="screen">` с уникальным `id="screen-{name}"`.** Переключение через JS-функцию `go(screen)`. Bottom-nav обновляется через `data-go` атрибуты.

### 6.1. Главный экран (`#screen-home`)

Сверху вниз:
1. **Полоса детей** (`#home-children-bar`) — переключатель между профилями детей + кнопка «+ Добавь малыша»
2. **Карточка «Дневник ребёнка»** на всю ширину (`.tile.tile-full`)
3. **AI-баннер «AI Smart Mama чат»** (`.ai-banner`, розовый)
4. **Лента чипов** (`.ai-caps`) — 6 шт: 🎈 Речь, 🎮 Игры, 🏥 Здоровье, 🥗 Рецепты, 💡 Советы, 📅 Развитие (каждый с `data-q` для предзаполнения вопроса)
5. **Заголовок «Трекеры»** + 2 плитки (`.section-grid`):
   - 🍼 Трекер питания + `tile-stat` с числом кормлений сегодня
   - 💤 Трекер сна + `tile-stat` с временем сна (`Xч Yмин`)
6. **Заголовок «Инструменты»** + 2 плитки:
   - 🥗 Питание (AI рецепты · Фото еды)
   - 💰 Выплаты (По твоему региону)
7. **Нейрофотосессия** (`.neuro-banner`, фиолетовый градиент): «AI-портреты малыша в 16 стилях»
8. **Чат для умных мам** (`.moms-chat-banner`, ссылка в Telegram-канал)
9. **Тариф-баннер** (`.price-banner`, розово-фиолетовый градиент) — динамический текст в зависимости от текущего плана:
   - Бесплатный: «Стартер 290 ₽/мес · Премиум 490 ₽/мес»
   - Платный: «Твой тариф: {Plan} ✅»
10. **Программа Амбассадоров** (`.ref-home-banner`) — реферальная программа

**Важно про синхронизацию `tile-stat`** (баг оригинала, см. раздел 13): после загрузки сегодняшних записей в трекерах **обязательно обновляй** `#tile-feed-stat` и `#tile-sleep-stat` на главной. В оригинале они оставались пустыми, хотя данные есть.

### 6.2. AI Smart Mama чат (`#screen-aichat`)

- Шапка `.chat-hdr.pink` с эмодзи 👩‍💼 + кнопка `‹` назад
- `#aichat-msgs` — лента сообщений (свои справа розовым, AI слева белым)
- 6 чипов: «Что делать сегодня?», «Плохо спит», «Горшок», «Игрушки», «Нормы возраста», «Развитие речи»
- Счётчик AI-ответов (`#aichat-ai-counter`) — скрыт по умолчанию, показывается при приближении к лимиту
- **Chat-bar:** камера 📷 → `aichat-photo-input` → отправка в `/api/ai/chat-vision`; textarea с авто-ростом; микрофон 🎤; кнопка ➤
- **Голосовые сообщения:** запись через MediaRecorder API, отправка как `multipart/form-data`, на бэке распознавание — **[реконструировать API эндпоинт]**

### 6.3. Развитие речи (`#screen-speech`)
- Шапка `.pink`, эмодзи 🎈, подзаголовок «AI подберёт упражнение»
- 6 чипов: Упражнение сейчас / Норма или нет? / Игры дома / Гимнастика / Когда к логопеду? / Первые слова
- Без камеры — только текст
- Эндпоинт: `/api/ai/speech-exercise` (с возрастом ребёнка в payload)

### 6.4. Развивающие игры (`#screen-games`)
- Шапка `.green`, эмодзи 🎮
- 6 чипов: Игра на сегодня / Тихая игра / Творческая / Активная / Моторика / На улице
- Эндпоинт: `/api/ai/game-idea`

### 6.5. Питание (`#screen-nutrition`)
- Шапка `.teal`, эмодзи 🥗, подзаголовок «📷 Фото еды · AI рецепты»
- 5 чипов: Что приготовить? / Завтрак / Первый прикорм / Пюре малышу / Плохо ест
- **Камера**: `capture="environment"` → отправка фото в `/api/ai/fridge` → отображение списка блюд → клик по блюду → `/api/ai/food-recipe`
- **⚠️ Баг оригинала:** ответ AI приходит как сырой JSON `{"summary":"..."}` — парси на фронте, отображай только `summary` или структурированный список (см. раздел 13)

### 6.6. Здоровье (`#screen-health`)
- Шапка `.lav` (лавандовая), эмодзи 🏥
- **Перманентный alert вверху:** `⚠️ При тревожных симптомах — 103 или 112`
- 7 чипов: 🌡 Температура / 😷 Кашель / 🍽 Не ест / 🚽 Стул / 👨‍⚕️ К врачу / 🚨 Подавился / 💉 Прививки
- AI **должен в конце каждого ответа напоминать** про обращение к педиатру при сомнениях
- Эндпоинт: `/api/ai/health-advice`

### 6.7. Трекер сна (`#screen-sleep`)

**Карточка статистики** (`.tr-card`):
- Заголовок «Сон сегодня»
- Большое значение `Xч Yмин` (`#sleep-val`)
- Норма по возрасту (`#sleep-norm-txt`) — **выбирается по `child_age_months`**:
  - 0–3 мес: 14–17 ч
  - 3–6 мес: 12–16 ч
  - 6–12 мес: 12–15 ч
  - 1–2 года: 11–14 ч
- Прогресс-бар (`.tr-bar` от `.tr-bar-bg`) — заполнение в % от середины нормы

**Форма добавления:**
- Кнопка `+ Записать сон` → раскрывается форма
- Поля: Уложила (time), Проснулся (time), Заметка (text «дневной, ночной…»)
- Кнопки Отмена / Сохранить

**Список «Сегодня»** + раскрывающаяся «📋 История сна»

**Список «Нормы сна»** — статичный, все 4 возрастные группы

### 6.8. Трекер питания (`#screen-feed`)

**Карточка** (`.tr-card.teal`):
- «Кормлений сегодня», крупная цифра, норма по возрасту:
  - до 6 мес: ГВ/смесь — 8–12 раз/сут
  - 6–9 мес: ГВ + прикорм 1–2 раза
  - 9–12 мес: 4–5 кормлений в сутки
  - 1–3 года: 4–5 приёмов пищи в сутки

**Форма:**
- Время (time), Тип (select: 🤱 Грудь / 🍼 Смесь / 🥄 Пюре / 🥣 Каша / 🍲 Суп / 🍎 Фрукт / 💧 Вода / 🍽 Другое), Количество (text «150 мл, 100 г…»)

### 6.9. Дневник малыша (`#screen-diary`)

**Карточка ребёнка** сверху (имя, возраст, регион, рост/вес из последней записи)

**Архив документов** (`.diary-docs-block`):
- 8 категорий: 🪪 СНИЛС, 🏥 Полис ОМС, 📜 Свидетельство о рождении, 📗 Паспорт, 👨‍⚕️ Справка от врача, 💊 Рецепт, 💉 Прививочная карта, 📁 Другое
- Bottom-sheet модалка: выбор категории → загрузка фото → подтверждение
- Модалка просмотра: фото на весь экран + кнопки 🗑 Удалить / ✕ Закрыть
- **Хранение:** base64 в `users.webapp_json.docs[]` ИЛИ отдельная таблица `documents` — **[уточнить]**. **Не загружай на внешние CDN** без согласия пользователя.

**Вкладки записей** (`.diary-tabs`): Все / Рост / Прививки / Болезни / События

**Типы записей** (по скриншотам): Рост/вес, Прививка, Болезнь, Температура, Первый раз, Настроение, Лекарство, Врач, Смешное, Событие

**Bottom-sheet модалка добавления:**
- Чипы выбора типа
- Если «Рост/вес» — два числовых поля (рост см, вес кг)
- Иначе — textarea
- Поле «Дата» (date input)

### 6.10. Выплаты и пособия (`#screen-benefits`)

**Селектор региона:**
- Текстовое поле + кнопка «Найти»
- 8 чипов: Москва / СПб / Краснодар / Казань / Екатеринбург / Новосибирск / Ростов / Н.Новгород
- Любой регион можно ввести вручную

**После выбора:**
- Бейдж региона
- Заголовок «🇷🇺 Федеральные выплаты — бесплатно»
- Список карточек: Материнский капитал (1-й/2-й ребёнок, цифры из 2025), Молочная кухня, Родовой сертификат, Единое пособие и т.д. — генерируется через `/api/ai/benefits`

**Paywall (для бесплатного тарифа):**
- Карточка «Полный гайд по выплатам — 149 ₽»
- Список преимуществ
- Кнопка покупки → ЮKassa

**Unlocked-карточка (после оплаты или для Премиум):**
- «📤 Получить гайд в Telegram» — бот пришлёт PDF
- Блок ссылок-ресурсов для региона: Госуслуги, СФР, МФЦ, Калькулятор пособий
- Кнопка «Изменить регион»

### 6.11. Нейрофотосессия (`#screen-neuro`)

- Карточка-интро с описанием
- Бейдж лимита (`#neuro-usage-badge`): «1 бесплатно / 20 в месяц на Премиум»
- Сетка стилей (`#neuro-styles`) — **загружается из конфига**. По `replit.md` — **16 стилей**, но в текущем UI отображается **6**. Сделай **16** (`replit.md` каноничный):
  - Реалистичный портрет, Аниме, Disney/Pixar, Акварель, Масляная живопись, Цифровой арт, Винтаж, Сказочный, Космический, Подводный, Лесной, Праздничный, Чёрно-белый, Поп-арт, Минимализм, **Свой стиль** (раскрывает textarea)
- Загрузка фото малыша
- Кнопка «✨ Создать портрет» (заблокирована до выбора стиля + загрузки фото)
- Paywall для не-Премиум: «Подключить — 199 ₽/мес»

### 6.12. Тарифы (`#screen-pricing`)

**Заголовок «💎 Тарифы»** + tagline «Начни бесплатно, расширяй возможности когда нужно»

**Селектор периода** (`.period-toggle`): **1 мес** (active) / 3 мес (−5%) / 6 мес (−10%) / 12 мес (−15%)

**3 карточки тарифов:**

| | Бесплатно | Стартер | Премиум |
|---|---|---|---|
| Цена | 0 ₽ | 290 ₽/мес | 490 ₽/мес |
| Эмодзи | 🆓 | 🌸 | 💎 |
| Бейдж | — | Популярный | Хит 🔥 |
| Все 8 разделов | ✅ | ✅ | ✅ |
| Трекеры | ✅ | ✅ | ✅ |
| Дневник | ✅ | ✅ | ✅ |
| AI-ответов/день | 10 | 20 в каждом чате | Безлимит 24/7 |
| Анализы холодильника | 1/день | 5/день | Безлимит |
| AI речь / игры / здоровье | — | ✅ | ✅ |
| Гайд по пособиям | закрыт | 149 ₽ отдельно | включён |
| Нейрофото | — | 2/мес | (отдельно 199 ₽/мес) |
| Программа развития по неделям | — | — | ✅ |
| Приоритетная поддержка | — | — | ✅ |

**При смене периода** — пересчитывай цены и показывай бейдж скидки + «итого за период» (`#starter-total`, `#premium-total`).

**Footer:** «💳 Оплата картой, СБП или Telegram Stars. Поддержка: @polyakovalinka»

### 6.13. Программа Амбассадоров (`#screen-referral`)

**Шапка** + общий заголовок «Программа Амбассадоров»

**Стат-бар:**
- Сколько подруг пригласила (`#ref-invited-count`)
- Текущий статус (`#ref-level-label`): «Нет статуса» / «Мама-Помощница» / «Мама-Звезда» / «Смарт Мама Амбассадор»

**3 уровня:**

| Уровень | Бейдж | Требование | Награды |
|---|---|---|---|
| 1. Мама-Помощница | 🌸 | 2 оплаченные подруги | +15 AI-запросов/день в каждом чате, значок 🌸 |
| 2. Мама-Звезда | ⭐ | 5 оплаченных подруг | Стартер бесплатно пока 5+ активных, ранний доступ, значок ⭐ |
| 3. Смарт Мама Амбассадор | 💎 | 10 оплаченных подруг | Премиум навсегда, упоминание в канале, бета-доступ, значок 💎 |

**Footer:** «🎁 Подруга получает первый месяц со скидкой 50% по твоей ссылке»

**Кнопки:**
- «📤 Поделиться с подругой» — `Telegram.WebApp.openTelegramLink('https://t.me/share/url?url={ref_link}&text=...')`
- «📋 Скопировать реферальную ссылку» — `navigator.clipboard.writeText(ref_link)`

Ссылка формата: `https://t.me/{bot_username}?start=ref_{user_id}`

### 6.14. Профиль (`#screen-profile`)

**Переключатель детей** (`#children-bar`) + кнопка «+ Добавить ребёнка»

**Авто-синхронизированная статистика из дневника** (`#profile-diary-stats`) — последние рост/вес и т.д.

**Форма «Основное»:**
- Имя малыша, Пол (select), Дата рождения (date), Возраст (number 0–216), Регион

**Форма «Здоровье»:**
- Группа крови (select: I (O)+/−, II (A)+/−, III (B)+/−, IV (AB)+/−)
- Аллергии (text)
- Педиатр (text)
- Заметки о здоровье (textarea)

**Карточка тарифа** + кнопка «Изменить»

**Карточка техподдержки:** ссылка на `@polyakovalinka`

**Кнопка «Сохранить»** — POST в `/api/user/save`, тело — весь профиль включая массив детей.

---

## 7. Тарифная модель — точные лимиты

```javascript
const PLANS = {
  free: {
    price: 0,
    ai_per_day_per_chat: 10,
    fridge_per_day: 1,
    neurophoto: 0,
    benefits_guide: false,
    sections: 'all_8'
  },
  starter: {
    price_monthly: 290,
    ai_per_day_per_chat: 20,
    fridge_per_day: 5,
    neurophoto_per_month: 2,
    speech_ai: true, games_ai: true, health_ai: true,
    benefits_guide: false  // отдельно 149 ₽
  },
  premium: {
    price_monthly: 490,
    ai: 'unlimited',
    fridge: 'unlimited',
    neurophoto_per_month: 20,
    benefits_guide: true,
    weekly_program: true,
    priority_support: true
  },
  neurophoto_addon: {  // отдельный продукт поверх любого плана
    price_monthly: 199,
    photos_per_month: 20,
    styles: 16
  },
  benefits_guide: {  // разовая покупка
    price_once: 149
  }
};

const DISCOUNTS = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.15 };
```

**Реферальные бонусы** добавляются поверх лимитов плана.

---

## 8. Платежи — ЮKassa

### 8.1. Настройка
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` в env
- Webhook URL в админке ЮKassa: `{PUBLIC_BASE_URL}/api/payment/webhook`
- **Обязательно отметь подписки на события** в личном кабинете ЮKassa (в оригинале забыто):
  - `payment.succeeded`
  - `payment.waiting_for_capture`
  - `payment.canceled`
  - `refund.succeeded`

### 8.2. Поток оплаты
1. Mini App → POST `/api/payment/create` с `{plan, period, user_id, return_url}`
2. Сервер создаёт платёж через YooKassa API → возвращает `confirmation_url`
3. Mini App: `Telegram.WebApp.openLink(confirmation_url)` (или `openInvoice` для Stars)
4. После оплаты ЮKassa POST'ит на `/api/payment/webhook` с подписью → обновляем `users.premium_until`
5. Mini App при возврате вызывает `/api/user/sync` → обновляет UI

### 8.3. Telegram Stars (опционально)
- `bot.send_invoice(...)` с `currency="XTR"`
- Обработчик `pre_checkout_query` + `successful_payment`

### 8.4. Платёжные продукты
- Стартер: 290 / 826 (3 мес) / 1566 (6 мес) / 2958 (12 мес)
- Премиум: 490 / 1396 / 2646 / 4998
- Нейрофото (аддон): 199 / мес
- Гайд по выплатам: 149 разово

---

## 9. Окружение (Environment Variables)

```bash
# Обязательные
BOT_TOKEN=                          # от @BotFather
REPLIT_DOMAINS=                     # автоматически в Replit
DATABASE_URL=                       # если используем Postgres + Drizzle; иначе только SQLite

# AI
AI_INTEGRATIONS_GEMINI_BASE_URL=
AI_INTEGRATIONS_GEMINI_API_KEY=

# Платежи
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

# Админка
ADMIN_USER_ID=                      # через запятую: 123,456,789
ADMIN_TOKEN=                        # для /api/admin/* (Bearer)

# Опционально
PORT=                               # если задан → webhook-режим
REPLIT_DEPLOYMENT=                  # auto в production deploy
```

---

## 10. Развёртывание на Replit

1. Создай **Reserved VM Deployment** (не Autoscale — бот должен быть всегда активен для планировщиков)
2. Тип запуска: `python bot/main.py` (или `pnpm start` если будет orchestrator)
3. Health check: `/healthz`
4. Persistence: смонтируй `bot/data/` как persistent volume (иначе SQLite потеряется при рестарте)
5. Если переходишь на Postgres — используй Replit DB или внешний (Neon, Supabase). Запусти миграции: `pnpm --filter db push`

---

## 11. КРИТИЧНО: список багов оригинала — **НЕ ПОВТОРЯЙ**

Этот список основан на скриншотах реального запущенного продукта. **Все эти проблемы должны быть исправлены в новой версии.**

### Backend / Бот
1. **Онбординг падает на шаге «регион»** — FSM теряется, ответ пользователя проваливается в fallback. Причина: глобальный handler без фильтра state. Реши: правильная подписка на `Onboarding.region` state.
2. **Дубли сообщений в онбординге** — несколько раз спрашивает «мальчик или девочка?». Проверь, что callback от инлайн-кнопки очищает предыдущее сообщение и переходит к следующему шагу.
3. **`mark_tip_sent()` не вызывается** после рассылок. В оригинале защита от дублей только через in-memory переменные `_*_sent_date`, которые сбрасываются при рестарте. Обязательно обновляй БД.
4. **`/gift` без аргументов** перехватывается онбординг-хендлером. Используй `Command("gift")` фильтр и убедись, что админ-команды имеют приоритет над state-handlers.
5. **Поиск по `@username` не находит существующих** — баг с регистром. В `get_user_by_username` приведи и запрос и колонку к `LOWER()`, заранее срежь `@`.
6. **Меню/клавиатура показываются одновременно** — две кнопки внизу. `_clear_menu()` вызывай не только перед запуском, но и **после онбординга** для конкретного чата.
7. **`food_tips_scheduler` docstring говорит 19:00, но `FOOD_HOUR = 10`** — приведи в соответствие.
8. **Двойная рассылка в один час** при рестарте процесса — добавь sleep до конца минуты после отправки + проверку БД.

### Frontend / Mini App
9. **CSS периодически не загружается** (Img 1–7 от 14:19) — весь UI падает в plain HTML. Возможные причины:
   - Версионирование стилей (`styles.css?v=...`) не инвалидирует кэш Telegram WebView
   - CSS-файл вернул 404 на момент запроса
   - Inline `<link rel="stylesheet">` без fallback на critical CSS
   - **Решение:** инлайнить critical CSS прямо в `<head>` (`<style>...</style>`) для каркаса, основные стили — по ссылке; добавь обработчик `link.onerror` с fallback; проверь, что nginx/aiohttp отдаёт CSS с правильным `content-type: text/css`.
10. **Сломанный layout при открытии из Instagram** (Img 8) — bottom-nav стопкой, сетка карточек разваливается. Telegram WebApp API недоступен → JS падает молча. Решение: оборачивай `Telegram.WebApp.*` в try/catch, делай graceful fallback на обычный браузер.
11. **Стат-бар главного экрана не синхронизирован с карточками трекеров** (Img 10) — наверху «1 кормлений / 2ч 1мин», но в `.tile-stat` пусто. После загрузки данных трекеров **всегда** обновляй `#tile-feed-stat` и `#tile-sleep-stat`.
12. **AI Питания отдаёт сырой JSON** (Img 6) — `{"summary":"..."}` показывается как текст. Парси на бэке, отдавай structured response, не дублируй raw.
13. **HTML-теги в ответах не рендерятся** (`<b>...</b>` показывается как текст). Используй DOM API или sanitize-html для безопасного рендера.
14. **Шапка Mini App перекрывает заголовок** (Img 6, 7 из последней серии) — системная кнопка `X Smart mama` наезжает на `.topbar-logo`. Добавь `padding-top: env(safe-area-inset-top)` + достаточный отступ для шапки Telegram.
15. **Mini App «Тарифы» падает с `Unauthorized`** (Img 13 из 2-й партии). Скорее всего initData expired или не передаётся. Перепроверяй `auth_date` и обновляй initData перед каждым запросом.
16. **Имя ребёнка пропадает из шапки** в некоторых состояниях (пометки красными прямоугольниками в Img 1, 3, 4 от 21:48). Проверь, что `home-children-bar` рендерится после `/api/user/sync`.
17. **«Нейрофотосессия в 16 стилях»** в `replit.md` vs **«6 стилей»** в UI — приведи к 16, как в исходной спецификации.
18. **ЮKassa webhook URL добавлен, события не отмечены** галочками в админке. После создания магазина — обязательно вручную выбери все нужные события.

### Reliability
19. **Логирование падений рассылок** — в оригинале есть `log.warning`, но нет агрегации. Добавь Sentry или хотя бы запись в БД таблицу `errors`.
20. **Нет миграций БД** — только `ALTER TABLE ADD COLUMN` в try/except. Это рабочий стиль для прототипа, но при росте перейди на Alembic (Python) или drizzle-kit (если переход на Postgres).

---

## 12. Что я НЕ видел в исходниках — **реконструировать с нуля или уточнить у пользователя**

При генерации **прямо спроси пользователя** про эти файлы перед написанием кода:

- `bot/handlers.py` — точная FSM-логика онбординга, обработчики callback'ов, fallback-хендлер, `/start` с ref_-параметром, все админ-команды
- `bot/texts.py` — все строки бота: онбординг, fallback'и, описания тарифов, функции `get_daily_tip()`, `get_game_tip()`, `get_speech_tip()`, `get_food_tip()`, `get_evening_reminder()` с массивами `DAILY_TIPS`, `GAME_TIPS` и т.д.
- `bot/webapp/styles.css` — все стили компонентов (классы перечислены в разделе 3.3)
- `bot/webapp/app.js` — клиентская логика Mini App: роутинг, API-клиент, FSM экранов, рендеринг сообщений, валидация форм
- `bot/ai_helper.py` — обёртка над Gemini API: формирование промтов, history management, vision API
- `bot/yookassa_helper.py` — создание платежей, обработка webhook, обновление подписок
- `artifacts/api-server/src/**` — весь Express-сервер
- `lib/db/src/schema/*` — Drizzle-модели (пока только пустой stub есть)
- Все скрипты деплоя

---

## 13. Чек-лист реализации (для self-review)

После генерации проверь:

- [ ] Бот запускается в long polling, отвечает на `/start`
- [ ] Все 5 шагов онбординга проходят без ошибок
- [ ] Регион принимается как любой текст
- [ ] После онбординга появляется кнопка «✨ Открыть Smart Mama»
- [ ] Mini App открывается, главный экран рендерится со всеми блоками
- [ ] Переключение между экранами работает (bottom-nav + back-кнопки)
- [ ] AI Smart Mama чат отправляет/получает сообщения
- [ ] Трекеры сохраняют записи и пересчитывают статистику
- [ ] `.tile-stat` на главной обновляется после записи в трекер
- [ ] Дневник позволяет добавить рост/вес и другие события
- [ ] Выплаты загружают регион через AI
- [ ] Тарифы корректно пересчитываются при смене периода
- [ ] Реферальная ссылка генерируется и копируется
- [ ] CSS не падает ни в одном из браузерных контекстов
- [ ] Все 5 планировщиков рассылок запускаются (можно проверить логами без ожидания 09:00)
- [ ] ЮKassa webhook принимает подписанные запросы
- [ ] HMAC-проверка `X-Telegram-Init-Data` отклоняет невалидные запросы
- [ ] Admin-команды работают только для `ADMIN_USER_IDS` + таблицы `admins`
- [ ] При webhook-режиме `/healthz` отвечает 200
- [ ] Persistent storage для `bot/data/` настроен в Replit deployment

---

## 14. Стиль работы (для Agent)

1. **Не выдумывай** API ключи, цены, тексты, которые не указаны. Если нужны — спрашивай.
2. **Используй точные значения** из этого промта (цены, эмодзи, классы CSS, времена рассылок).
3. **Не упрощай** структуру — все 14 экранов Mini App должны быть реализованы.
4. **Реализуй пункты раздела 11** как фичи, не как «потом исправим».
5. **Не подключай новые зависимости** без необходимости — стек уже определён.
6. **Не отключай** `minimumReleaseAge: 1440` в `pnpm-workspace.yaml`.
7. **Все строки на русском**, без машинного перевода. Тон — тёплый, материнский, на «ты».

---

**Когда закончишь генерацию — выведи короткое саммари: что создано, какие env-переменные нужно задать, как запустить.**
