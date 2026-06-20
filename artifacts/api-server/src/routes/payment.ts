import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import path from "path";
import { verifyInitDataLax } from "../lib/telegram-auth";
import { logger } from "../lib/logger";

const router = Router();
const DB_PATH = path.join(process.env["DATA_DIR"] ?? path.join(process.cwd(), "bot/data"), "smartmama.db");

const PLANS: Record<string, Record<number, number>> = {
  starter: { 1: 290, 3: 826, 6: 1566, 12: 2958 },
  premium: { 1: 490, 3: 1396, 6: 2646, 12: 4998 },
};

async function getDb() {
  const mod = await import("better-sqlite3");
  const Database = mod.default;
  return new Database(DB_PATH);
}

// POST /api/payment/create
router.post("/create", async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyInitDataLax(req.headers["x-telegram-init-data"] as string);
  if (!parsed?.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { plan, period, return_url } = req.body;
  const shopId = process.env["YOOKASSA_SHOP_ID"];
  const secretKey = process.env["YOOKASSA_SECRET_KEY"];

  if (!shopId || !secretKey) {
    res.status(503).json({ error: "Payment not configured" });
    return;
  }

  const amount = PLANS[plan]?.[period];
  if (!amount) { res.status(400).json({ error: "Invalid plan/period" }); return; }

  try {
    const idempotenceKey = crypto.randomUUID();
    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: { value: amount.toFixed(2), currency: "RUB" },
        confirmation: { type: "redirect", return_url: return_url || "https://t.me" },
        description: `Подписка Smart Mama: ${plan} на ${period} мес`,
        metadata: { user_id: parsed.user.id, plan, period },
        capture: true,
      }),
    });

    const data = await response.json() as { confirmation?: { confirmation_url?: string }; id?: string };
    if (data.confirmation?.confirmation_url) {
      res.json({ confirmation_url: data.confirmation.confirmation_url, payment_id: data.id });
    } else {
      logger.error({ data }, "YooKassa error");
      res.status(502).json({ error: "Payment creation failed" });
    }
  } catch (err) {
    logger.error({ err }, "Payment create error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/payment/webhook
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body as {
      event: string;
      object?: { metadata?: { user_id?: string; plan?: string; period?: string } };
    };
    if (event.event !== "payment.succeeded") {
      res.json({ ok: true });
      return;
    }

    const metadata = event.object?.metadata;
    if (!metadata?.user_id || !metadata?.plan || !metadata?.period) {
      res.status(400).json({ error: "Invalid metadata" });
      return;
    }

    const userId = parseInt(metadata.user_id);
    const period = parseInt(metadata.period);
    const daysMap: Record<number, number> = { 1: 30, 3: 92, 6: 183, 12: 365 };
    const days = daysMap[period] ?? 30;

    const db = await getDb();
    const today = new Date();
    const row = db.prepare("SELECT premium_until FROM users WHERE user_id=?").get(userId) as { premium_until?: string } | undefined;
    let base = today;
    if (row?.premium_until) {
      const existing = new Date(row.premium_until);
      if (existing > today) base = existing;
    }
    const newDate = new Date(base.getTime() + days * 86400000).toISOString().split("T")[0];
    db.prepare("UPDATE users SET premium_until=?, plan=?, plan_period=? WHERE user_id=?").run(newDate, metadata.plan, period, userId);
    db.close();

    logger.info({ userId, plan: metadata.plan, period, until: newDate }, "Payment succeeded");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Payment webhook error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
