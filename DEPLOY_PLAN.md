# План деплоя Smart Mama на российский хостинг

## Архитектура запуска
- Один сервер, два параллельных процесса: Python-бот aiogram 3.27 в polling-режиме (python3 -m bot.main) и Node.js API-сервер Express 5 на порту 5000, раздаёт /api и Mini App /webapp.
- Polling означает, что входящий HTTPS-webhook от Telegram НЕ нужен.
- HTTPS нужен только для открытия Mini App в браузере пользователя.
- Общая база данных: SQLite bot/data/smartmama.db.
- Секреты: бот через python-dotenv из .env, Node через переменные окружения.

## Приоритет 1 — БЛОКЕРЫ
1. Верификация вебхука YooKassa в payment.ts /webhook: сейчас нет проверки источника, любой может подделать payment.succeeded. Решение: проверка по IP YooKassa ИЛИ повторный запрос статуса платежа через API по payment_id.
2. PUBLIC_URL: на своём сервере нет REPLIT_DEPLOYMENT/RENDER, поэтому WEBAPP_PATH=/webapp/. Задать PUBLIC_URL=https://домен.ru в .env, иначе кнопка Mini App нерабочая.
3. Секреты в .env: BOT_TOKEN, OPENAI_API_KEY, ADMIN_USER_ID, ADMIN_TOKEN, PUBLIC_URL, PORT, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY. Создать .env.example.
4. Доступ к OpenAI из РФ: OpenAI блокирует российские IP. Нужен исходящий прокси для Node, зарубежный VPS-прокси или российский LLM с OpenAI-совместимым API.

## Приоритет 2 — ВАЖНОЕ
1. Исправить database.py: 8 type-ошибок (None-индекс в get_admin_stats, строки 260-263) и 2 предупреждения о deprecated datetime.utcnow.
2. systemd: два юнита (бот и API) с Restart=always вместо фонового запуска через амперсанд в start-prod.sh.
3. rateLimiter: считать лимиты из SQLite (таблица usage), а не в памяти.
4. Бэкапы SQLite: ежедневный cron с sqlite3 .backup.

## Приоритет 3 — ИНФРАСТРУКТУРА
1. VPS в РФ (Timeweb, Selectel, Yandex Cloud, REG.RU), Ubuntu 22.04+, Node 20, Python 3.11, pnpm.
2. Домен и HTTPS через nginx и Let's Encrypt, прокси на localhost:5000.
3. В BotFather задать menu button на https://домен/webapp/, что равно PUBLIC_URL.
4. Smoke-тест: /start, открытие Mini App, telegram-auth, AI-эндпоинт, тестовый платёж.

## Финал
Рабочее приложение Smart Mama на российском хостинге. Серверные шаги (VPS, домен, реальные секреты, приём платежей) выполняет владелец; Claude готовит код, конфиги и инструкции.
