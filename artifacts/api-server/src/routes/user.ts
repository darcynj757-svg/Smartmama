import { Router, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { verifyInitDataLax } from "../lib/telegram-auth";
import { logger } from "../lib/logger";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(process.env["DATA_DIR"] ?? path.join(process.cwd(), "bot/data"), "smartmama.db");

async function getDb() {
  const mod = await import("better-sqlite3");
  const Database = mod.default;
  return new Database(DB_PATH);
}

// GET /api/user/sync
router.get("/sync", async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyInitDataLax(req.headers["x-telegram-init-data"] as string);
  if (!parsed?.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = parsed.user.id;

  try {
    let userData: Record<string, unknown> | null = null;
    try {
      const db = await getDb();
      const row = db.prepare("SELECT * FROM users WHERE user_id=?").get(userId) as Record<string, unknown> | undefined;
      db.close();
      userData = row ?? null;
    } catch {
      // DB not accessible yet
    }

    if (!userData) {
      res.json({ user_id: userId, plan: "free", premium_until: null, profile: { children: [] } });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const hasActiveSub = userData.premium_until && (userData.premium_until as string) >= today;
    const storedPlan = (userData.plan as string) ?? "free";
    const plan = hasActiveSub ? (storedPlan === "starter" ? "starter" : "premium") : "free";

    let webappData: Record<string, unknown> = {};
    try {
      if (userData.webapp_json) webappData = JSON.parse(userData.webapp_json as string);
    } catch { /* ignore */ }

    res.json({
      user_id: userId,
      plan,
      premium_until: userData.premium_until ?? null,
      plan_period: userData.plan_period ?? 1,
      mama_name: userData.mama_name ?? "",
      child_name: userData.child_name ?? "",
      child_age_months: userData.child_age_months ?? 0,
      child_gender: userData.child_gender ?? "",
      region: userData.region ?? "",
      profile: webappData,
    });
  } catch (err) {
    logger.error({ err }, "User sync error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/save
router.post("/save", async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyInitDataLax(req.headers["x-telegram-init-data"] as string);
  if (!parsed?.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = parsed.user.id;
  const tgUser = parsed.user;
  const profileData = req.body;

  try {
    const db = await getDb();
    const now = new Date().toISOString();

    // Upsert: create user row if not exists (e.g. opened Mini App without bot onboarding)
    db.prepare(`
      INSERT OR IGNORE INTO users (user_id, username, first_name, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tgUser.username ?? "", tgUser.first_name ?? "", now, now);

    // Update last_seen
    db.prepare("UPDATE users SET last_seen=? WHERE user_id=?").run(now, userId);

    // Extract main profile fields sent from Mini App
    const childName      = typeof profileData.child_name === "string"       ? profileData.child_name.trim()       : null;
    const childAgeMonths = typeof profileData.child_age_months === "number" ? profileData.child_age_months        : null;
    const childGender    = typeof profileData.child_gender === "string"     ? profileData.child_gender            : null;
    const region         = typeof profileData.region === "string"           ? profileData.region.trim()           : null;
    const mamaName       = typeof profileData.mama_name === "string"        ? profileData.mama_name.trim()        : null;

    // Update main columns so the bot can use them for broadcasts and messages
    if (childName      !== null) db.prepare("UPDATE users SET child_name=? WHERE user_id=?").run(childName, userId);
    if (childAgeMonths !== null) db.prepare("UPDATE users SET child_age_months=? WHERE user_id=?").run(childAgeMonths, userId);
    if (childGender    !== null) db.prepare("UPDATE users SET child_gender=? WHERE user_id=?").run(childGender, userId);
    if (region         !== null) db.prepare("UPDATE users SET region=? WHERE user_id=?").run(region, userId);
    if (mamaName       !== null) db.prepare("UPDATE users SET mama_name=? WHERE user_id=?").run(mamaName, userId);

    // Also persist full profile blob in webapp_json for extended fields
    const webappJson = JSON.stringify(profileData);
    db.prepare("UPDATE users SET webapp_json=? WHERE user_id=?").run(webappJson, userId);

    db.close();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "User save error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/user/usage
router.get("/usage", async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyInitDataLax(req.headers["x-telegram-init-data"] as string);
  if (!parsed?.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = parsed.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const db = await getDb();
    const row1 = db.prepare(
      "SELECT COUNT(*) as cnt FROM usage WHERE user_id=? AND feature='ai_chat' AND DATE(used_at)=?"
    ).get(userId, today) as { cnt: number };
    const row2 = db.prepare(
      "SELECT COUNT(*) as cnt FROM usage WHERE user_id=? AND feature='fridge' AND DATE(used_at)=?"
    ).get(userId, today) as { cnt: number };
    db.close();
    res.json({ ai_chat_today: row1?.cnt ?? 0, fridge_today: row2?.cnt ?? 0 });
  } catch {
    res.json({ ai_chat_today: 0, fridge_today: 0 });
  }
});

export default router;
