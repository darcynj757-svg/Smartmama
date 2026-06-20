#!/bin/bash
set -e

echo "=== Смарт Мама — Production Startup ==="

# Создаём папку для базы данных
mkdir -p bot/data

# Устанавливаем Python зависимости в пользовательскую директорию
echo "Installing Python dependencies..."
pip install --user -r bot/requirements.txt --quiet --no-cache-dir 2>&1 | tail -5

# Запускаем Telegram бот в polling-режиме (убираем PORT чтобы не пытался поднять webhook)
echo "Starting Telegram bot (polling mode)..."
env -u PORT python3 -m bot.main &
BOT_PID=$!
echo "Bot PID: $BOT_PID"

# Ждём инициализации бота
sleep 3

# Запускаем API сервер в foreground (обслуживает /api и /webapp)
echo "Starting API server on port ${PORT:-5000}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
