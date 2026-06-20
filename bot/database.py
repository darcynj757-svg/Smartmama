import aiosqlite
import json
from datetime import date, datetime, timedelta
from typing import Optional
import os

_data_dir = os.environ.get("DATA_DIR", "bot/data")
DB_PATH = os.path.join(_data_dir, "smartmama.db")


async def init_db():
    os.makedirs(_data_dir, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        # WAL mode: разрешает одновременные чтения и запись из нескольких процессов
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA synchronous=NORMAL")
        await db.execute("PRAGMA cache_size=-8000")  # 8 MB page cache
        await db.execute("PRAGMA foreign_keys=ON")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
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
                webapp_json      TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                feature TEXT,
                used_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS diary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                entry_type TEXT,
                title TEXT,
                value TEXT,
                event_date TEXT,
                created_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                user_id INTEGER PRIMARY KEY,
                added_by INTEGER,
                added_at TEXT
            )
        """)
        # Индексы для ускорения запросов при 1000+ пользователях
        await db.execute("CREATE INDEX IF NOT EXISTS idx_usage_user_feature_date ON usage(user_id, feature, used_at)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_diary_user_date ON diary(user_id, event_date)")
        # Миграции
        for col_def in [
            "ALTER TABLE users ADD COLUMN webapp_json TEXT",
            "ALTER TABLE users ADD COLUMN last_tip_date TEXT",
            "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN plan_period INTEGER DEFAULT 1",
        ]:
            try:
                await db.execute(col_def)
            except Exception:
                pass
        await db.commit()


async def upsert_user(user_id: int, username: str, first_name: str):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        existing = await db.execute("SELECT user_id FROM users WHERE user_id=?", (user_id,))
        row = await existing.fetchone()
        if row:
            await db.execute(
                "UPDATE users SET username=?, first_name=?, last_seen=? WHERE user_id=?",
                (username, first_name, now, user_id)
            )
        else:
            await db.execute(
                "INSERT INTO users (user_id, username, first_name, created_at, last_seen) VALUES (?,?,?,?,?)",
                (user_id, username, first_name, now, now)
            )
        await db.commit()


async def get_user(user_id: int) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users WHERE user_id=?", (user_id,))
        row = await cur.fetchone()
        if row:
            return dict(row)
        return None


async def update_profile(user_id: int, **fields):
    if not fields:
        return
    set_clause = ", ".join(f"{k}=?" for k in fields)
    values = list(fields.values()) + [user_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE users SET {set_clause} WHERE user_id=?", values)
        await db.commit()


async def set_referrer(user_id: int, referrer_id: int):
    if user_id == referrer_id:
        return
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT referrer_id FROM users WHERE user_id=?", (user_id,))
        row = await cur.fetchone()
        if row and row[0] is None:
            await db.execute("UPDATE users SET referrer_id=? WHERE user_id=?", (referrer_id, user_id))
            await db.commit()


async def get_users_for_daily_tip() -> list:
    today = date.today().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM users WHERE child_name IS NOT NULL AND (last_tip_date IS NULL OR last_tip_date != ?)",
            (today,)
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def mark_tip_sent(user_id: int):
    today = date.today().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET last_tip_date=? WHERE user_id=?", (today, user_id))
        await db.commit()


async def get_user_by_username(username: str) -> Optional[dict]:
    username = username.lstrip("@").lower()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM users WHERE LOWER(username)=?", (username,)
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def search_users_by_name(query: str, limit: int = 5) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM users WHERE LOWER(mama_name) LIKE ? OR LOWER(first_name) LIKE ? LIMIT ?",
            (f"%{query.lower()}%", f"%{query.lower()}%", limit)
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def get_recent_users(limit: int = 20) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def is_admin(user_id: int) -> bool:
    if user_id in ADMIN_USER_IDS_CACHE:
        return True
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT user_id FROM admins WHERE user_id=?", (user_id,))
        row = await cur.fetchone()
        return row is not None


ADMIN_USER_IDS_CACHE: list = []


def set_admin_ids_cache(ids: list):
    global ADMIN_USER_IDS_CACHE
    ADMIN_USER_IDS_CACHE = ids


async def add_admin(user_id: int, added_by: int):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO admins (user_id, added_by, added_at) VALUES (?,?,?)",
            (user_id, added_by, now)
        )
        await db.commit()


async def remove_admin(user_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM admins WHERE user_id=?", (user_id,))
        await db.commit()


async def get_admins() -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM admins")
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def gift_subscription(user_id: int, days: int):
    today = date.today()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT premium_until FROM users WHERE user_id=?", (user_id,))
        row = await cur.fetchone()
        if row and row[0]:
            try:
                current = date.fromisoformat(row[0])
                if current > today:
                    new_date = current + timedelta(days=days)
                else:
                    new_date = today + timedelta(days=days)
            except ValueError:
                new_date = today + timedelta(days=days)
        else:
            new_date = today + timedelta(days=days)
        new_date_str = new_date.isoformat()
        await db.execute("UPDATE users SET premium_until=? WHERE user_id=?", (new_date_str, user_id))
        await db.commit()
        return True, new_date_str


async def get_admin_stats() -> dict:
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        total = (await (await db.execute("SELECT COUNT(*) FROM users")).fetchone())[0]
        with_child = (await (await db.execute("SELECT COUNT(*) FROM users WHERE child_name IS NOT NULL")).fetchone())[0]
        premium = (await (await db.execute("SELECT COUNT(*) FROM users WHERE premium_until >= ?", (today,))).fetchone())[0]
        today_new = (await (await db.execute("SELECT COUNT(*) FROM users WHERE DATE(created_at) = ?", (today,))).fetchone())[0]
        week_new = (await (await db.execute("SELECT COUNT(*) FROM users WHERE DATE(created_at) >= ?", (week_ago,))).fetchone())[0]
        active_today = (await (await db.execute("SELECT COUNT(*) FROM users WHERE DATE(last_seen) = ?", (today,))).fetchone())[0]
        active_week = (await (await db.execute("SELECT COUNT(*) FROM users WHERE DATE(last_seen) >= ?", (week_ago,))).fetchone())[0]
        ai_today = (await (await db.execute("SELECT COUNT(*) FROM usage WHERE feature='ai_chat' AND DATE(used_at) = ?", (today,))).fetchone())[0]

        recent_cur = await db.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT 5")
        recent = [dict(r) for r in await recent_cur.fetchall()]

        prem_cur = await db.execute("SELECT * FROM users WHERE premium_until >= ? ORDER BY premium_until DESC", (today,))
        premium_users = [dict(r) for r in await prem_cur.fetchall()]

        return {
            "total": total,
            "with_child": with_child,
            "premium": premium,
            "today_new": today_new,
            "week_new": week_new,
            "active_today": active_today,
            "active_week": active_week,
            "ai_today": ai_today,
            "recent": recent,
            "premium_users": premium_users,
        }


async def log_usage(user_id: int, feature: str):
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO usage (user_id, feature, used_at) VALUES (?,?,?)",
            (user_id, feature, now)
        )
        await db.commit()


async def get_usage_today(user_id: int, feature: str) -> int:
    today = date.today().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "SELECT COUNT(*) FROM usage WHERE user_id=? AND feature=? AND DATE(used_at)=?",
            (user_id, feature, today)
        )
        row = await cur.fetchone()
        return row[0] if row else 0
