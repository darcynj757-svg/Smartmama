#!/bin/bash
# Запускается один раз на чистом Ubuntu 22.04 от root
# Использование: bash setup.sh YOUR_DOMAIN.ru
set -e

DOMAIN="${1:-YOUR_DOMAIN.ru}"
APP_DIR="/opt/smartmama"
APP_USER="smartmama"

echo "=== Smart Mama — Установка на сервере ==="
echo "Домен: $DOMAIN"

# ─── Системные пакеты ──────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv build-essential

# ─── Node.js 22 ───────────────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm

# ─── Пользователь приложения ──────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d "$APP_DIR" -s /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR/data"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─── Клонируем репозиторий ────────────────────────────────────────────────────
echo ""
echo "Введи URL репозитория (или Enter чтобы пропустить если уже есть код):"
read -r REPO_URL
if [ -n "$REPO_URL" ]; then
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# ─── Python venv ──────────────────────────────────────────────────────────────
sudo -u "$APP_USER" bash -c "
    cd $APP_DIR
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r bot/requirements.txt
"

# ─── Node.js зависимости и сборка ─────────────────────────────────────────────
sudo -u "$APP_USER" bash -c "
    cd $APP_DIR
    pnpm install --frozen-lockfile
    pnpm --filter @workspace/api-server run build
"

# ─── .env файл ────────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/deploy/.env.example" "$APP_DIR/.env"
    sed -i "s|YOUR_DOMAIN.ru|$DOMAIN|g" "$APP_DIR/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    chmod 600 "$APP_DIR/.env"
    echo ""
    echo "⚠️  ВАЖНО: Заполни секреты в файле $APP_DIR/.env"
    echo "    nano $APP_DIR/.env"
fi

# ─── nginx ────────────────────────────────────────────────────────────────────
cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/smartmama"
sed -i "s|YOUR_DOMAIN.ru|$DOMAIN|g" /etc/nginx/sites-available/smartmama
ln -sf /etc/nginx/sites-available/smartmama /etc/nginx/sites-enabled/smartmama
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ─── SSL через Let's Encrypt ─────────────────────────────────────────────────
echo ""
echo "Получаем SSL сертификат для $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
    echo "⚠️  SSL не установлен — запусти вручную: certbot --nginx -d $DOMAIN"

# ─── systemd сервисы ──────────────────────────────────────────────────────────
cp "$APP_DIR/deploy/smartmama-api.service" /etc/systemd/system/
cp "$APP_DIR/deploy/smartmama-bot.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable smartmama-api smartmama-bot
systemctl start smartmama-api smartmama-bot

echo ""
echo "=== Готово! ==="
echo "Проверь статус:"
echo "  systemctl status smartmama-api"
echo "  systemctl status smartmama-bot"
echo "  journalctl -u smartmama-api -f"
echo "  journalctl -u smartmama-bot -f"
echo ""
echo "Сайт: https://$DOMAIN"
