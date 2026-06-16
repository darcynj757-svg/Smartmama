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

function getUser(initDataRaw: string) {
  return verifyInitDataLax(initDataRaw);
}

interface ChildProfile {
  childName?: string;
  ageMonths?: number;
  gender?: string;
  region?: string;
  mamaName?: string;
  bloodType?: string;
  allergies?: string;
  doctor?: string;
  healthNotes?: string;
  dob?: string;
}

function extractProfile(body: Record<string, unknown>): ChildProfile {
  let p: ChildProfile = {};
  if (typeof body.profile === "string") {
    try { p = JSON.parse(body.profile) as ChildProfile; } catch { p = {}; }
  } else if (body.profile && typeof body.profile === "object") {
    p = body.profile as ChildProfile;
  }
  return {
    childName:   String(p.childName   || body.childName   || "малыш"),
    ageMonths:   parseInt(String(p.ageMonths ?? body.ageMonths ?? 0)) || 0,
    gender:      String(p.gender      || body.gender      || ""),
    region:      String(p.region      || body.region      || ""),
    mamaName:    String(p.mamaName    || body.mamaName    || ""),
    bloodType:   String(p.bloodType   || body.bloodType   || ""),
    allergies:   String(p.allergies   || body.allergies   || ""),
    doctor:      String(p.doctor      || body.doctor      || ""),
    healthNotes: String(p.healthNotes || body.healthNotes || ""),
    dob:         String(p.dob         || body.dob         || ""),
  };
}

function buildSystemPrompt(p: ChildProfile, role: string): string {
  const name    = p.childName || "малыш";
  const months  = p.ageMonths || 0;
  const isGirl  = p.gender === "girl";
  const isBoy   = p.gender === "boy";
  const gWord   = isGirl ? "девочка" : isBoy ? "мальчик" : "";
  const gPron   = isGirl ? "она" : isBoy ? "он" : "";
  const gAdj    = isGirl ? "маленькой" : isBoy ? "маленького" : "";

  const age = months >= 12
    ? `${Math.floor(months / 12)} г. ${months % 12 > 0 ? months % 12 + " мес." : ""}`.trim()
    : `${months} мес.`;

  const childLine = [
    `Малыша зовут ${name}`,
    gWord,
    `возраст — ${age}`,
    p.region ? `из региона ${p.region}` : "",
  ].filter(Boolean).join(", ") + ".";

  const mamaLine = p.mamaName ? `Маму зовут ${p.mamaName}.` : "";

  const healthLines: string[] = [];
  if (p.allergies   && p.allergies   !== "")  healthLines.push(`⚠️ Аллергии: ${p.allergies}.`);
  if (p.bloodType   && p.bloodType   !== "")  healthLines.push(`Группа крови: ${p.bloodType}.`);
  if (p.doctor      && p.doctor      !== "")  healthLines.push(`Педиатр: ${p.doctor}.`);
  if (p.healthNotes && p.healthNotes !== "")  healthLines.push(`Особенности здоровья: ${p.healthNotes}.`);

  return `Ты — ${role} приложения «Смарт Мама».
${mamaLine}
${childLine}
${healthLines.length ? healthLines.join(" ") + "\n" : ""}
СТИЛЬ ОБЩЕНИЯ:
— Обращайся на «ты», как близкая подруга-эксперт: тепло, но без лишних слов.
— Называй малыша по имени: ${name}.${gPron ? ` Правильный род: ${gPron}.` : ""}
— Возраст ${name} — ${age}. Ты уже знаешь профиль — никогда не спрашивай про возраст, имя или то, что уже есть в профиле.
${p.allergies ? `— ВАЖНО: аллергии (${p.allergies}) — учитывай при любых советах по питанию.` : ""}

ГЛАВНОЕ ПРАВИЛО — сразу давай конкретный совет:
— НЕ задавай уточняющих вопросов если запрос понятен. Для большинства запросов — сразу отвечай конкретно.
— Уточняй ТОЛЬКО если от ответа кардинально меняется совет (например при симптомах болезни). Даже тогда — ОДИН вопрос с конкретным вариантом ответа (не «расскажи подробнее», а «температура выше 38?»).
— Каждый совет ОБЯЗАН содержать: конкретное действие + КАК именно делать + сколько времени/раз. Например: не «укладывай в одно время», а «укладывай в 20:30, ровно через 20 мин после купания — это якорь для биоритмов».
— Возраст ${age} — ключ к совету. Первое предложение должно опираться на то, что актуально именно в этом возрасте.

СТРУКТУРА КАЖДОГО ОТВЕТА (строго):
1. Конкретное действие #1 — что делать, как, сколько (под возраст ${age}).
2. Ещё 1–2 варианта — кратко, без вступлений.
3. ПОСЛЕДНЯЯ строка ВСЕГДА: «Хочешь другой вариант или уточни — скажи 😊»

ЗАПРЕЩЕНО говорить (никогда, ни при каких условиях):
— «Ты делаешь всё возможное», «Ты молодец», «Это очень важно», «Замечательно»
— «Отличный вопрос», «Я понимаю как это непросто», «Ты справляешься»
— Любые похвалы и поддакивания в конце ответа — только если мама сама попросила поддержки
— Вступления вроде «Проблема в том, что...», «Конечно, вот что можно сделать...»

— Ответ — не длиннее 100 слов.
— Эмодзи — не более 1–2, только уместные.
— Никогда не осуждай выбор мамы.
— Отвечай исключительно по-русски.`;
}

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const user = getUser(req.headers["x-telegram-init-data"] as string);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messages } = req.body;
  if (!messages) { res.status(400).json({ error: "messages required" }); return; }

  const profile = extractProfile(req.body as Record<string, unknown>);

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(profile, "твой главный AI-помощник по материнству и воспитанию детей") },
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
  const file = req.file;
  if (!file) { res.status(400).json({ error: "photo required" }); return; }

  const profile = extractProfile(req.body as Record<string, unknown>);

  try {
    const openai = getOpenAI();
    const b64 = file.buffer.toString("base64");
    const mimeType = file.mimetype as "image/jpeg" | "image/png" | "image/webp";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(profile, "внимательный AI-помощник, который анализирует фото и даёт конкретные советы") },
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

  const file = req.file;
  if (!file) { res.status(400).json({ error: "photo required" }); return; }

  const p = extractProfile(req.body as Record<string, unknown>);
  const allergyNote = p.allergies ? ` Аллергии у ${p.childName}: ${p.allergies} — эти продукты исключить!` : "";

  try {
    const openai = getOpenAI();
    const b64 = file.buffer.toString("base64");
    const mimeType = file.mimetype as "image/jpeg" | "image/png" | "image/webp";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты — детский диетолог. Малышу ${p.childName} ${p.ageMonths} мес.${allergyNote} Посмотри на холодильник и предложи 5–7 блюд по возрасту. Верни ТОЛЬКО JSON-массив: [{"name":"...","description":"..."}].`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
            { type: "text", text: `Что можно приготовить ${p.childName} из этих продуктов?` },
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

  const { messages } = req.body;
  if (!messages) { res.status(400).json({ error: "messages required" }); return; }

  const p = extractProfile(req.body as Record<string, unknown>);
  const mamaAddress = p.mamaName ? p.mamaName : "мама";

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(p, `персональный AI-тренер для молодых мам. Специализируешься на восстановлении после родов, тренировках дома без оборудования, йоге с малышом, укреплении кора и спины. Давай конкретные программы с упражнениями, подходами, временем выполнения. Учитывай, что ${mamaAddress} рядом с ребёнком и ограничена по времени — максимум 15–20 мин`),
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

  const { dishName } = req.body;
  if (!dishName) { res.status(400).json({ error: "dishName required" }); return; }

  const p = extractProfile(req.body as Record<string, unknown>);
  const allergyNote = p.allergies ? ` Аллергии: ${p.allergies} — обязательно учти при составлении рецепта.` : "";

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Ты — детский диетолог. Малышу ${p.childName} ${p.ageMonths} мес.${allergyNote}` },
        { role: "user", content: `Дай подробный рецепт «${dishName}» для ${p.childName} (${p.ageMonths} мес.). Ингредиенты, пошаговое приготовление, температура и консистенция для возраста.` },
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

  const { question, messages } = req.body;
  const p = extractProfile(req.body as Record<string, unknown>);

  try {
    const openai = getOpenAI();
    const history = Array.isArray(messages) ? messages : [];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(p, `детский логопед. Помогаешь развивать речь у малышей. Давай конкретные игры, упражнения, артикуляционную гимнастику именно для ${p.ageMonths} мес. Учитывай нормы речевого развития по возрасту`) },
        ...history,
        ...(question && !history.length ? [{ role: "user" as const, content: question }] : []),
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

  const { question, messages } = req.body;
  const p = extractProfile(req.body as Record<string, unknown>);

  try {
    const openai = getOpenAI();
    const history = Array.isArray(messages) ? messages : [];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(p, `детский психолог и эксперт по развивающим играм. Предлагаешь игры строго по возрасту (${p.ageMonths} мес.), развивающие моторику, сенсорику, интеллект. Описывай игру: цель, материалы (из того что дома), ход, почему полезно. Учитывай, что мама может играть в одиночку с малышом`) },
        ...history,
        ...(question && !history.length ? [{ role: "user" as const, content: question }] : []),
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

  const { question, messages } = req.body;
  const p = extractProfile(req.body as Record<string, unknown>);
  const doctorNote = p.doctor ? ` Педиатр ${p.childName}: ${p.doctor}.` : "";

  try {
    const openai = getOpenAI();
    const history = Array.isArray(messages) ? messages : [];
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(p, `педиатр-консультант.${doctorNote} Давай чёткие рекомендации по симптомам, учитывая возраст (${p.ageMonths} мес.) и историю здоровья. ОБЯЗАТЕЛЬНО: при любом сомнении — посоветуй обратиться к педиатру${p.doctor ? ` (${p.doctor})` : ""}. При экстренных симптомах (высокая температура, затруднённое дыхание, судороги) — СРОЧНО 103 или 112`),
        },
        ...history,
        ...(question && !history.length ? [{ role: "user" as const, content: question }] : []),
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
