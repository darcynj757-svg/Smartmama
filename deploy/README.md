# Деплой Smart Mama на российский VPS

## Что тебе нужно

| Что | Минимум | Рекомендую |
|-----|---------|------------|
| VPS | 1 vCPU, 1 GB RAM | 2 vCPU, 2 GB RAM |
| ОС | Ubuntu 22.04 | Ubuntu 22.04 LTS |
| Домен | любой .ru/.com | Timeweb / Reg.ru |
| Провайдеры | Beget, Reg.ru | **Timeweb Cloud** |

---

## Шаг 1 — Покупаем VPS

**Timeweb Cloud** (рекомендуется):
1. Идём на [timeweb.cloud](https://timeweb.cloud)
2. Облачные серверы → Создать сервер
3. Выбираем: Ubuntu 22.04, тариф **Cloud-1** (1 vCPU, 1 GB, 500₽/мес)
4. Добавляем SSH ключ (или запоминаем root пароль из письма)
5. Ждём 1–2 минуты — сервер готов

---

## Шаг 2 — Домен и DNS

1. Покупаем домен на [reg.ru](https://reg.ru) или [nic.ru](https://nic.ru)
2. В панели DNS создаём A-запись:
   ```
   @ → IP вашего VPS
   www → IP вашего VPS
   ```
3. Ждём до 30 минут пока DNS обновится

---

## Шаг 3 — Заливаем код на сервер

**Вариант А — через GitHub (рекомендуется):**
```bash
# На своём компьютере — публикуем в git
git init && git add . && git commit -m "deploy"
git remote add origin https://github.com/ВАШ_АККАУНТ/smartmama.git
git push -u origin main
```

**Вариант Б — через rsync (если не хочешь git):**
```bash
# На своём компьютере
rsync -avz --exclude=node_modules --exclude=.git --exclude='bot/data' \
    /путь/к/smartmama/ root@ВАШ_IP:/opt/smartmama/
```

---

## Шаг 4 — Установка (один раз)

Подключаемся к серверу:
```bash
ssh root@ВАШ_IP
```

Запускаем скрипт установки:
```bash
# Если использовал GitHub:
apt-get install -y git
git clone https://github.com/ВАШ_АККАУНТ/smartmama.git /opt/smartmama
cd /opt/smartmama

# Запускаем установку
bash deploy/setup.sh ВАШ_ДОМЕН.ru
```

---

## Шаг 5 — Заполняем секреты

```bash
nano /opt/smartmama/.env
```

Заполняем все значения:
```env
BOT_TOKEN=токен из @BotFather
OPENAI_API_KEY=ключ из platform.openai.com
PUBLIC_URL=https://ВАШ_ДОМЕН.ru
ADMIN_USER_ID=твой Telegram ID
ADMIN_TOKEN=любая секретная строка для API
DATA_DIR=/opt/smartmama/data
```

После заполнения перезапускаем:
```bash
systemctl restart smartmama-api smartmama-bot
```

---

## Шаг 6 — Проверяем

```bash
# Статус сервисов
systemctl status smartmama-api
systemctl status smartmama-bot

# Логи в реальном времени
journalctl -u smartmama-api -f
journalctl -u smartmama-bot -f

# Проверяем что API отвечает
curl https://ВАШ_ДОМЕН.ru/webapp/
```

---

## Обновление кода

После изменений в коде — деплоим так:

```bash
# На своём компьютере
git add . && git commit -m "update" && git push

# На сервере
bash /opt/smartmama/deploy/update.sh
```

---

## Команды управления

```bash
systemctl start/stop/restart smartmama-api   # управление API
systemctl start/stop/restart smartmama-bot   # управление ботом
journalctl -u smartmama-api -n 100           # последние 100 строк логов API
journalctl -u smartmama-bot -n 100           # последние 100 строк логов бота
certbot renew                                 # обновление SSL (автоматически раз в 90 дней)
```

---

## Решение проблем

**Бот не отвечает:**
```bash
journalctl -u smartmama-bot -n 50
# Проверь BOT_TOKEN в .env
```

**API отдаёт ошибку 502:**
```bash
journalctl -u smartmama-api -n 50
# Проверь что порт 3000 открыт: ss -tlnp | grep 3000
```

**SSL не работает:**
```bash
certbot --nginx -d ВАШ_ДОМЕН.ru
# DNS должен указывать на IP сервера
```

**Конфликт бота (два экземпляра):**
```bash
# Если была Replit продакшн версия — удаляем webhook:
curl "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook"
systemctl restart smartmama-bot
```
