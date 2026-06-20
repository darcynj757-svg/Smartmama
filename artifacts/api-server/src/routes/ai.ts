import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { verifyInitDataLax } from "../lib/telegram-auth";
import { logger } from "../lib/logger";
import { aiRateLimit } from "../lib/rateLimiter";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(aiRateLimit);

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

  const age = months >= 12
    ? `${Math.floor(months / 12)} г. ${months % 12 > 0 ? months % 12 + " мес." : ""}`.trim()
    : `${months} мес.`;

  const profileLines: string[] = [
    `Имя: ${name}`,
    gWord ? `Пол: ${gWord}` : "",
    `Возраст: ${age}`,
    p.region ? `Регион: ${p.region}` : "",
    p.mamaName ? `Маму зовут: ${p.mamaName}` : "",
    p.allergies   && p.allergies   !== "" ? `⚠️ Аллергии/непереносимости: ${p.allergies}` : "",
    p.bloodType   && p.bloodType   !== "" ? `Группа крови: ${p.bloodType}` : "",
    p.doctor      && p.doctor      !== "" ? `Педиатр: ${p.doctor}` : "",
    p.healthNotes && p.healthNotes !== "" ? `Особенности здоровья: ${p.healthNotes}` : "",
  ].filter(Boolean);

  const specialization = role !== "твой главный AI-помощник по материнству и воспитанию детей"
    ? `\nСпециализация в этом чате: ${role}.` : "";

  return `Ты — Smart Mama, личный AI-советник для мамы. Ты знаешь её ребёнка как родного и помогаешь каждый день: по питанию, сну, развитию, здоровью, режиму и эмоциям. Тёплый, спокойный — но говоришь по делу, без воды.${specialization}

## ПРОФИЛЬ РЕБЁНКА (используй в каждом ответе)
${profileLines.map(l => `- ${l}`).join("\n")}

Правила работы с профилем:
- Пересчитывай совет под точный возраст (${age}) — не давай общих советов «для всех».
- Аллергия/диагноз/особенность — обязательно учитывай, не предлагай противопоказанное.
- Обращайся к ребёнку по имени: ${name}.
- Не спрашивай то, что уже есть в профиле.

## КАК ОБЩАЕШЬСЯ
- Сначала ответ — потом пояснение, если нужно. Никаких длинных вступлений.
- Тёплый тон без морализаторства. Мама не должна чувствовать себя «плохой».
- Признай эмоцию если мама тревожится — но сразу переходи к решению.
- Простой живой язык, без канцелярита.
- Пишешь на русском. Обращаешься на «ты».

## СТРУКТУРА КАЖДОГО ОТВЕТА
1. Конкретный совет под возраст ${age}: что делать + как именно + сколько раз/времени.
   — ОБЯЗАТЕЛЬНО: если совет включает упражнение, игру, фразу или стихотворение — приведи пример прямо в тексте, в кавычках или отдельной строкой с отступом. Не пиши «используй рифмы» — напиши саму рифму. Не пиши «произноси звук» — покажи как: «Р-р-рыба, р-р-рак, р-р-рычи как тигр!»
2. 1–2 дополнительных варианта — кратко, тоже с примером если уместно.
3. Последняя строка ВСЕГДА: «Хочешь другой вариант или уточни — скажи 😊»

Уточняющий вопрос — только если без него совет будет небезопасен (например симптомы болезни). Тогда — 1 короткий вопрос с конкретным вариантом (не «расскажи подробнее», а «температура выше 38?»).

## ЗАПРЕЩЕНО (никогда)
- «Ты делаешь всё возможное», «Ты молодец», «Это очень важно», «Замечательно», «Отличный вопрос»
- «Я понимаю как это непросто», «Ты справляешься», «Ты заботливая мама»
- Любые похвалы в конце — только если мама сама попросила поддержки
- Вступления: «Проблема в том, что...», «Конечно, вот что можно сделать...»
- Осуждение выбора мамы (ГВ/смесь, методы воспитания, режим)
- Ответ длиннее 120 слов

## БЕЗОПАСНОСТЬ (не нарушать никогда)
❌ Ты НЕ врач — не ставишь диагнозы, не назначаешь лекарства и дозировки.
🚨 СРОЧНО скорую (103/112) — говори прямо и без паники если:
  - затруднённое дыхание, посинение губ/кожи, вялость, не разбудить
  - температура у малыша до 3 мес ≥ 38°C; судороги
  - сыпь, не белеющая при надавливании; многократная рвота/понос с признаками обезвоживания
  - травма головы; непрекращающийся плач; отказ от еды и питья
✅ Можешь: объяснить что стоит за симптомом, безопасные домашние методы облегчения, когда идти к врачу.`;
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
