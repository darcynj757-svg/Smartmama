import aiosqlite
import json
import os
from typing import Any, Optional
from aiogram.fsm.storage.base import BaseStorage, StorageKey, StateType


class SqliteStorage(BaseStorage):
    def __init__(self, db_path: str = "bot/data/fsm.db"):
        self.db_path = db_path

    async def _init(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS fsm_storage (
                    key TEXT PRIMARY KEY,
                    state TEXT,
                    data TEXT DEFAULT '{}'
                )
            """)
            await db.commit()

    def _make_key(self, key: StorageKey) -> str:
        return f"{key.bot_id}:{key.chat_id}:{key.user_id}"

    async def set_state(self, key: StorageKey, state: StateType = None):
        await self._init()
        k = self._make_key(key)
        state_str = state.state if hasattr(state, "state") else str(state) if state else None
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO fsm_storage (key, state, data) VALUES (?, ?, COALESCE((SELECT data FROM fsm_storage WHERE key=?), '{}'))",
                (k, state_str, k)
            )
            await db.commit()

    async def get_state(self, key: StorageKey) -> Optional[str]:
        await self._init()
        k = self._make_key(key)
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute("SELECT state FROM fsm_storage WHERE key=?", (k,))
            row = await cur.fetchone()
            return row[0] if row else None

    async def set_data(self, key: StorageKey, data: dict):
        await self._init()
        k = self._make_key(key)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO fsm_storage (key, state, data) VALUES (?, COALESCE((SELECT state FROM fsm_storage WHERE key=?), NULL), ?)",
                (k, k, json.dumps(data, ensure_ascii=False))
            )
            await db.commit()

    async def get_data(self, key: StorageKey) -> dict:
        await self._init()
        k = self._make_key(key)
        async with aiosqlite.connect(self.db_path) as db:
            cur = await db.execute("SELECT data FROM fsm_storage WHERE key=?", (k,))
            row = await cur.fetchone()
            if row and row[0]:
                return json.loads(row[0])
            return {}

    async def close(self):
        pass
