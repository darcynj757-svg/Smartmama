import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { verifyInitDataLax } from "../lib/telegram-auth";
import { logger } from "../lib/logger";
import { getDb } from "../lib/db";

const router = Router();

const PLANS: Record<string, Record<number, number>> = {
  starter: { 1: 290, 3: 826, 6: 1566, 12: 2958 },
  premium: { 1: 490, 3: 1396, 6: 2646, 12: 4998 },
};

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
    const shopId = process.env["YOOKASSA_SHOP_ID"];
    const secretKey = process.env["YOOKASSA_SECRET_KEY"];
    if (!shopId || !secretKey) {
      res.status(503).json({ error: "Payment not configured" });
      return;
    }

    const incoming = req.body as { event?: string; object?: { id?: string } };
    if (incoming.event !== "payment.succeeded") {
      res.json({ ok: true });
      return;
    }

    const paymentId = incoming.object?.id;
    if (!paymentId) {
      res.status(400).json({ error: "No payment id" });
      return;
    }

    // Проверяем платёж напрямую в YooKassa (защита от подделки вебхука)
    const verifyResp = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
      },
    });
    if (!verifyResp.ok) {
      logger.error({ status: verifyResp.status, paymentId }, "YooKassa verify failed");
      res.status(502).json({ error: "Verification failed" });
      return;
    }

    const payment = await verifyResp.json() as {
      status?: string;
      paid?: boolean;
      metadata?: { user_id?: string; plan?: string; period?: string };
    };

    // Доверяем только подтверждённому самой YooKassa платежу
    if (payment.status !== "succeeded" || payment.paid !== true) {
      logger.warn({ paymentId, status: payment.status }, "Payment not confirmed");
      res.json({ ok: true });
      return;
    }

    const metadata = payment.metadata;
    if (!metadata?.user_id || !metadata?.plan || !metadata?.period) {
      res.status(400).json({ error: "Invalid metadata" });
      return;
    }

    const userId = parseInt(metadata.user_id);
    const period = parseInt(metadata.period);
    const daysMap: Record<number, number> = { 1: 30, 3: 92, 6: 183, 12: 365 };
    const days = daysMap[period] ?? 30;

    const db = getDb();
    const today = new Date();
    const row = db.prepare("SELECT premium_until FROM users WHERE user_id=?").get(userId) as { premium_until?: string } | undefined;
    let base = today;
    if (row?.premium_until) {
      const existing = new Date(row.premium_until);
      if (existing > today) base = existing;
    }
    const newDate = new Date(base.getTime() + days * 86400000).toISOString().split("T")[0];
    db.prepare("UPDATE users SET premium_until=?, plan=?, plan_period=? WHERE user_id=?").run(newDate, metadata.plan, period, userId);

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Webhook error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
