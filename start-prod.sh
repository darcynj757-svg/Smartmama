#!/bin/bash
set -e

echo "=== Смарт Мама — Production Startup ==="

# Создаём папку для базы данных
mkdir -p bot/data

# Запускаем Telegram бот в polling-режиме в фоне
# Python-зависимости уже установлены в build-шаге
echo "Starting Telegram bot (polling mode)..."
env -u PORT python3 -m bot.main &
BOT_PID=$!
echo "Bot PID: $BOT_PID"

# Сразу запускаем API сервер в foreground (обслуживает /api и /webapp)
echo "Starting API server on port ${PORT:-8080}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
