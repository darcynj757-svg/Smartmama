#!/bin/bash
set -e

DATA_DIR="${DATA_DIR:-bot/data}"
mkdir -p "$DATA_DIR"
echo "[render-start] Data dir: $DATA_DIR"

echo "[render-start] Starting Telegram Bot in polling mode..."
env -u PORT python3 -m bot.main &
BOT_PID=$!
echo "[render-start] Bot PID: $BOT_PID"

echo "[render-start] Starting API server on port $PORT..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
