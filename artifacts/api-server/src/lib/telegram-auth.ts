import crypto from "crypto";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface ParsedInitData {
  user: TelegramUser | null;
  auth_date: number;
  hash: string;
}

export function verifyInitData(initDataRaw: string | undefined): ParsedInitData | null {
  if (!initDataRaw) return null;

  const botToken = process.env["BOT_TOKEN"];
  if (!botToken) return null;

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get("hash");
    if (!hash) return null;

    const authDate = parseInt(params.get("auth_date") || "0");
    if (!authDate) return null;

    // Проверка времени — не старше 24 часов
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computedHash !== hash) return null;

    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : null;

    return { user, auth_date: authDate, hash };
  } catch {
    return null;
  }
}

export function verifyInitDataLax(initDataRaw: string | undefined): ParsedInitData | null {
  if (!initDataRaw) return null;
  // В dev режиме разрешаем без строгой проверки если это тестовые данные
  if (process.env["NODE_ENV"] === "development" && initDataRaw === "dev_test") {
    return { user: { id: 0, first_name: "Dev" }, auth_date: Math.floor(Date.now() / 1000), hash: "" };
  }
  return verifyInitData(initDataRaw);
}
