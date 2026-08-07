import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as googleTTS from "google-tts-api";
import { GoogleGenAI } from "@google/genai";

// ============================================================
// LƯU Ý QUAN TRỌNG VỀ KIẾN TRÚC:
// File này KHÔNG được gọi app.listen(). Nó chỉ tạo và export ra
// đối tượng `app` để Vercel tự bọc thành Serverless Function.
// Việc chạy server (app.listen) chỉ diễn ra khi dev local, xem
// file dev-server.ts / package.json script "dev".
// ============================================================

const app = express();

// Initialize Gemini Client lazily (khởi tạo 1 lần, dùng lại giữa các request cùng instance)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Thư mục upload — LƯU Ý: trên Vercel, filesystem là "read-only" ngoại trừ /tmp,
// và /tmp KHÔNG bền vững giữa các lần gọi (mỗi request có thể là 1 instance khác).
// Nếu bạn cần lưu file người dùng upload lâu dài khi deploy Vercel, hãy dùng
// Supabase Storage (bạn đã có sẵn supabase client) thay vì lưu vào đĩa cục bộ.
const isServerless = !!process.env.VERCEL;
const uploadsDir = isServerless
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static thư mục ảnh/uploads khi chạy local (khi deploy Vercel, các file tĩnh
// trong public/ đã được Vercel CDN phục vụ trực tiếp, không cần qua Express nữa)
if (!isServerless) {
  app.use(
    "/image",
    express.static(path.join(process.cwd(), "public", "image")),
  );
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads")),
  );
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// API upload route (chỉ khuyến nghị dùng khi chạy local / server truyền thống;
// khi deploy Vercel nên đổi sang upload thẳng lên Supabase Storage từ client,
// giống cách bạn đang làm trong StreamTab.tsx với uploadToDonateFolder)
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ------------------------------------------------------------
// API to generate TTS using Gemini TTS (both genders) with
// Google Translate TTS only as a last-resort fallback.
// ------------------------------------------------------------

// Giọng Gemini TTS chính thức hỗ trợ tiếng Việt (vi-VN) — xem tài liệu Gemini TTS.
// "Kore" = nữ, giọng chắc/rõ. "Puck" = nam, giọng vui vẻ.
const GEMINI_VOICE_MAP: Record<string, string> = {
  female: "Kore",
  male: "Puck",
  default: "Kore",
};

async function generateGeminiTTS(
  text: string,
  gender: string,
): Promise<Buffer | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const voiceName = GEMINI_VOICE_MAP[gender] || GEMINI_VOICE_MAP.default;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    return Buffer.from(base64Audio, "base64");
  } catch (err) {
    console.error(`Gemini TTS (${voiceName}) failed:`, err);
    return null;
  }
}

app.get("/api/tts", async (req, res) => {
  try {
    const text = req.query.text as string;
    const lang = (req.query.lang as string) || "vi";
    const gender = (req.query.gender as string) || "default";

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text.substring(0, 200);

    // 1. Ưu tiên Gemini TTS cho CẢ NAM LẪN NỮ — ổn định trên mọi môi trường
    //    (local, Vercel, mobile) vì gọi qua API chính thức có API key,
    //    không phụ thuộc việc Google có chặn IP datacenter hay không.
    const geminiBuffer = await generateGeminiTTS(cleanText, gender);
    if (geminiBuffer) {
      res.set("Content-Type", "audio/wav");
      return res.send(geminiBuffer);
    }

    // 2. Fallback cuối cùng: Google Translate TTS (không chính thức).
    //    Lưu ý: endpoint này có thể bị Google chặn khi chạy trên IP
    //    datacenter (Vercel/AWS Lambda) — chỉ nên coi đây là backup,
    //    không phải nguồn chính.
    console.warn(
      "Gemini TTS unavailable, falling back to Google Translate TTS",
    );
    const base64 = await googleTTS.getAudioBase64(cleanText, {
      lang,
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    const buffer = Buffer.from(base64, "base64");
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate TTS" });
  }
});

export default app;
