---
name: Smart Mama project
description: Architecture decisions and gotchas for the Смарт Мама Telegram bot + Mini App project.
---

## Key decisions

- **Shared SQLite DB**: `bot/data/smartmama.db` is written by the Python bot (async aiosqlite) and read by the Node API (better-sqlite3, sync, readonly). No PostgreSQL — single-file DB avoids need for DATABASE_URL.
- **better-sqlite3 build**: Must be listed in `pnpm-workspace.yaml` `onlyBuiltDependencies` or it won't compile. Already added.
- **Telegram auth**: Mini App sends `X-Telegram-Init-Data` header; `lib/telegram-auth.ts` verifies HMAC signature. Max age 24h.
- **Bot modes**: Long polling when PORT env is not set (dev). Webhook mode when PORT is set (prod/deployed). Before switching to polling, must call `deleteWebhook` on Telegram API.
- **AI model**: OpenAI GPT-4o-mini for all chat features; DALL-E 3 for neuro-photos. User explicitly chose OpenAI over Gemini.
- **Free AI limit**: 10/day (confirmed by user — UI shows 10, not 3 which was an earlier code value).

**Why:** Single SQLite file avoids provisioning a Postgres DB for a small-scale Telegram bot. better-sqlite3 is synchronous which works well in Express route handlers alongside async/await.

**How to apply:** When adding new API routes that read user data, use `better-sqlite3` via dynamic import. When modifying the schema, update `bot/database.py` (aiosqlite) — the Node side reads directly without migrations.
