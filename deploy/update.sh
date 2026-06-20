#!/bin/bash
# Обновление приложения без downtime
# Запускать от root: bash /opt/smartmama/deploy/update.sh
set -e

APP_DIR="/opt/smartmama"
APP_USER="smartmama"

echo "=== Smart Mama — Обновление ==="
cd "$APP_DIR"

# Получаем новый код
sudo -u "$APP_USER" git pull origin main

# Обновляем Python зависимости (если изменились)
sudo -u "$APP_USER" bash -c "
    cd $APP_DIR
    .venv/bin/pip install -r bot/requirements.txt -q
"

# Обновляем Node.js зависимости и пересобираем
sudo -u "$APP_USER" bash -c "
    cd $APP_DIR
    pnpm install --frozen-lockfile
    pnpm --filter @workspace/api-server run build
"

# Перезапускаем сервисы
systemctl restart smartmama-api
systemctl restart smartmama-bot

echo "✅ Обновление завершено!"
echo ""
systemctl status smartmama-api --no-pager -l
