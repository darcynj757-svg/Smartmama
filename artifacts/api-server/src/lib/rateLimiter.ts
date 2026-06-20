import type { Request, Response, NextFunction } from "express";

interface BucketEntry { count: number; resetAt: number; }
const buckets = new Map<string, BucketEntry>();

// Clean up stale buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}, 10 * 60 * 1000);

function makeRateLimiter(maxPerMinute: number, keyFn?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn ? keyFn(req) : (req.headers["x-telegram-init-data"] as string || req.ip || "unknown");
    const now = Date.now();
    const windowMs = 60_000;

    let entry = buckets.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count++;

    if (entry.count > maxPerMinute) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Слишком много запросов. Попробуй через минуту." });
      return;
    }
    next();
  };
}

export const aiRateLimit = makeRateLimiter(20);
export const apiRateLimit = makeRateLimiter(120);
