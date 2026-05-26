#!/bin/bash
set -e

echo "=== Смарт Мама — Production Startup ==="

# Устанавливаем Python зависимости
echo "Installing Python dependencies..."
pip install -r bot/requirements.txt --quiet --no-cache-dir 2>&1 | tail -5

# Создаём папку для базы данных
mkdir -p bot/data

# Запускаем Telegram бот в polling-режиме (убираем PORT чтобы не пытался поднять webhook)
echo "Starting Telegram bot (polling mode)..."
env -u PORT python -m bot.main &
BOT_PID=$!
echo "Bot PID: $BOT_PID"

# Ждём инициализации бота
sleep 3

# Запускаем API сервер в foreground (обслуживает /api и /webapp)
echo "Starting API server on port ${PORT:-8080}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
