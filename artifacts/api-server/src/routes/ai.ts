import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { verifyInitDataLax } from "../lib/telegram-auth";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function getOpenAI() {
  return new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
}

function getSystemPrompt(childName: string, ageMonths: number, role: string) {
  return `Ты — ${role} приложения «Смарт Мама» для русскоязычных мам. Малыша зовут ${childName || "малыш"}, ему ${ageMonths || 0} месяцев. Отвечай тепло, на «ты», по-русски. Используй эмодзи умеренно.`;
}

function getUser(initDataRaw: string) {
  return verifyInitDataLax(initDataRaw);
}

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messages, childName, ageMonths } = req.body;
  if (!messages) { res.status(400).json({ error: "messages required" }); return; }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: getSystemPrompt(childName, ageMonths, "AI-помощник по воспитанию детей") },
        ...messages,
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI chat error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/chat-vision
router.post("/chat-vision", upload.single("photo"), async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const question = req.body.question || "Что на фото?";
  const childName = req.body.childName || "";
  const ageMonths = parseInt(req.body.ageMonths || "0");
  const file = req.file;

  if (!file) { res.status(400).json({ error: "photo required" }); return; }

  try {
    const openai = getOpenAI();
    const b64 = file.buffer.toString("base64");
    const mimeType = file.mimetype as "image/jpeg" | "image/png" | "image/webp";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: getSystemPrompt(childName, ageMonths, "AI-помощник") },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
            { type: "text", text: question },
          ],
        },
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI vision error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/fridge
router.post("/fridge", upload.single("photo"), async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const childName = req.body.childName || "";
  const ageMonths = parseInt(req.body.ageMonths || "0");
  const file = req.file;
  if (!file) { res.status(400).json({ error: "photo required" }); return; }

  try {
    const openai = getOpenAI();
    const b64 = file.buffer.toString("base64");
    const mimeType = file.mimetype as "image/jpeg" | "image/png" | "image/webp";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты — диетолог для детей. Малышу ${childName} ${ageMonths} месяцев. Посмотри на содержимое холодильника и предложи 5–7 блюд, которые можно приготовить для ребёнка этого возраста. Верни JSON-массив: [{"name": "Название блюда", "description": "Короткое описание"}, ...]. ТОЛЬКО JSON, без текста вокруг.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
            { type: "text", text: "Что можно приготовить малышу из этих продуктов?" },
          ],
        },
      ],
      max_tokens: 1024,
    });
    const rawText = response.choices[0]?.message?.content || "[]";
    let dishes: Array<{ name: string; description: string }> = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) dishes = JSON.parse(jsonMatch[0]);
    } catch {
      dishes = [{ name: "Блюдо из найденных продуктов", description: rawText.substring(0, 200) }];
    }
    res.json({ dishes });
  } catch (err) {
    logger.error({ err }, "AI fridge error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/workout
router.post("/workout", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messages, question, childName, ageMonths } = req.body;
  if (!messages) { res.status(400).json({ error: "messages required" }); return; }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты — персональный AI-тренер приложения «Смарт Мама» для русскоязычных мам. Малышу ${childName || "малыш"} ${ageMonths || 0} месяцев. Специализируешься на тренировках для молодых мам: восстановление после родов, упражнения дома без оборудования, йога с малышом, укрепление кора и спины. Составляй конкретные программы с описанием упражнений, подходов и времени. Отвечай тепло, мотивируй, используй эмодзи умеренно. Учитывай, что мама может быть ограничена по времени и находится рядом с малышом.`,
        },
        ...messages,
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI workout error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/food-recipe
router.post("/food-recipe", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { dishName, childName, ageMonths } = req.body;
  if (!dishName) { res.status(400).json({ error: "dishName required" }); return; }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Ты — детский диетолог. Малышу ${childName || "малыш"} ${ageMonths || 0} месяцев.` },
        { role: "user", content: `Дай подробный рецепт блюда «${dishName}» для ребёнка этого возраста. Укажи ингредиенты и пошаговое приготовление.` },
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI recipe error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/neuro-photo
router.post("/neuro-photo", upload.single("photo"), async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const style = req.body.style || "Реалистичный портрет";
  const childName = req.body.childName || "малыш";

  try {
    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Детский портрет в стиле "${style}". Милый ребёнок по имени ${childName}. Высококачественное изображение, подходящее для детского альбома.`,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });
    const imageData = response.data ?? [];
    const b64 = (imageData[0] as { b64_json?: string } | undefined)?.b64_json ?? "";
    res.json({ b64_json: b64, mimeType: "image/png" });
  } catch (err) {
    logger.error({ err }, "AI neuro-photo error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/benefits
router.post("/benefits", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { region, ageMonths } = req.body;
  if (!region) { res.status(400).json({ error: "region required" }); return; }

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Ты — эксперт по социальным выплатам и льготам для семей с детьми в России. Отвечай структурированно, с суммами и условиями получения. Данные актуальны на 2025 год.",
        },
        {
          role: "user",
          content: `Расскажи о выплатах и льготах для семьи с ребёнком ${ageMonths || 0} месяцев в регионе: ${region}. Укажи федеральные и региональные выплаты с суммами.`,
        },
      ],
      max_tokens: 2048,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI benefits error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/speech-exercise
router.post("/speech-exercise", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { question, childName, ageMonths } = req.body;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Ты — детский логопед. Малышу ${childName || "малыш"} ${ageMonths || 0} месяцев. Давай практические советы для развития речи.` },
        { role: "user", content: question || "Дай упражнение для развития речи" },
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI speech error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/game-idea
router.post("/game-idea", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { question, childName, ageMonths } = req.body;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Ты — детский психолог и специалист по развивающим играм. Малышу ${childName || "малыш"} ${ageMonths || 0} месяцев.` },
        { role: "user", content: question || "Придумай развивающую игру" },
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI game error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/health-advice
router.post("/health-advice", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { question, childName, ageMonths } = req.body;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты — педиатр-консультант. Малышу ${childName || "малыш"} ${ageMonths || 0} месяцев. Давай рекомендации, но ВСЕГДА в конце напоминай обратиться к педиатру при сомнениях. При экстренных симптомах — срочно к врачу или 103/112.`,
        },
        { role: "user", content: question || "Что делать?" },
      ],
      max_tokens: 1024,
    });
    const text = response.choices[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    logger.error({ err }, "AI health error");
    res.status(500).json({ error: "AI error" });
  }
});

// POST /api/ai/transcribe
router.post("/transcribe", upload.single("audio"), async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const file = req.file;
  if (!file) { res.status(400).json({ error: "audio required" }); return; }

  try {
    const openai = getOpenAI();
    const { toFile } = await import("openai");
    const ext = file.mimetype.includes("webm") ? "webm" : file.mimetype.includes("mp4") ? "mp4" : "webm";
    const audioFile = await toFile(file.buffer, `voice.${ext}`, { type: file.mimetype });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ru",
    });
    res.json({ text: transcription.text });
  } catch (err) {
    logger.error({ err }, "AI transcribe error");
    res.status(500).json({ error: "Transcription error" });
  }
});

export default router;
