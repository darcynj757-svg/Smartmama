import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);

export const DB_PATH = path.join(
  process.env["DATA_DIR"] ?? path.join(process.cwd(), "bot/data"),
  "smartmama.db"
);

let _db: import("better-sqlite3").Database | null = null;

export function getDb(): import("better-sqlite3").Database {
  if (_db) return _db;
  const Database = _require("better-sqlite3") as typeof import("better-sqlite3");
  _db = new (Database as unknown as new (p: string) => import("better-sqlite3").Database)(DB_PATH);
  // WAL mode: allows concurrent reads from Python bot + Node API without SQLITE_BUSY errors
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.pragma("cache_size = -8000");
  _db.pragma("foreign_keys = ON");
  return _db;
}
