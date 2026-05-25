import { Router, type Request, type Response } from "express";
import path from "path";
import { logger } from "../lib/logger";

const router = Router();
const DB_PATH = path.join(process.cwd(), "bot/data/smartmama.db");

async function getDb(readonly = false) {
  const mod = await import("better-sqlite3");
  const Database = mod.default;
  return new Database(DB_PATH, readonly ? { readonly: true } : {});
}

function checkAdminAuth(req: Request, res: Response): boolean {
  const auth = req.headers["authorization"] as string;
  const token = process.env["ADMIN_TOKEN"];
  if (!auth || !token || auth !== `Bearer ${token}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /api/admin/stats
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  try {
    const db = await getDb(true);
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const q = (sql: string, ...params: unknown[]) =>
      (db.prepare(sql).get(...params) as { cnt: number })?.cnt ?? 0;

    const stats = {
      total: q("SELECT COUNT(*) as cnt FROM users"),
      with_child: q("SELECT COUNT(*) as cnt FROM users WHERE child_name IS NOT NULL"),
      premium: q("SELECT COUNT(*) as cnt FROM users WHERE premium_until >= ?", today),
      today_new: q("SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at)=?", today),
      week_new: q("SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at)>=?", weekAgo),
      active_today: q("SELECT COUNT(*) as cnt FROM users WHERE DATE(last_seen)=?", today),
      ai_today: q("SELECT COUNT(*) as cnt FROM usage WHERE feature='ai_chat' AND DATE(used_at)=?", today),
      recent: db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 10").all(),
    };

    db.close();
    res.json(stats);
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/users
router.get("/users", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  try {
    const db = await getDb(true);
    const limit = parseInt(req.query["limit"] as string) || 50;
    const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ?").all(limit);
    db.close();
    res.json({ users });
  } catch (err) {
    logger.error({ err }, "Admin users error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/gift
router.post("/gift", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { user_id, days } = req.body;
  if (!user_id || !days) { res.status(400).json({ error: "user_id and days required" }); return; }

  try {
    const db = await getDb();
    const today = new Date();
    const row = db.prepare("SELECT premium_until FROM users WHERE user_id=?").get(user_id) as { premium_until?: string } | undefined;
    let base = today;
    if (row?.premium_until) {
      const existing = new Date(row.premium_until);
      if (existing > today) base = existing;
    }
    const newDate = new Date(base.getTime() + days * 86400000).toISOString().split("T")[0];
    db.prepare("UPDATE users SET premium_until=? WHERE user_id=?").run(newDate, user_id);
    db.close();
    res.json({ success: true, premium_until: newDate });
  } catch (err) {
    logger.error({ err }, "Admin gift error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
