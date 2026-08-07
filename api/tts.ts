import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
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

router.get("/tts", async (req, res) => {
  try {
    const text = req.query.text as string;
    const lang = (req.query.lang as string) || "vi";
    const gender = (req.query.gender as string) || "default";

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Google Translate giới hạn mỗi request khoảng 200 ký tự
    const cleanText = text.substring(0, 200);

    // 1. Ưu tiên Gemini TTS nếu yêu cầu giọng female và có GEMINI_API_KEY
    if (gender === "female" && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        if (ai) {
          const voiceName = "Puck";
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: cleanText }] }],
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
          if (base64Audio) {
            const buffer = Buffer.from(base64Audio, "base64");
            res.setHeader("Content-Type", "audio/wav");
            return res.status(200).send(buffer);
          }
        }
      } catch (geminiError) {
        console.error(
          "Gemini TTS failed, falling back to direct Google Translate:",
          geminiError,
        );
      }
    }

    // 2. Gọi Trực Tiếp Google Dịch TTS API
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      cleanText,
    )}&tl=${encodeURIComponent(lang)}&total=1&idx=0&textlen=${
      cleanText.length
    }&client=tw-ob`;

    // Giả lập Browser User-Agent để chống bị Google chặn IP trên Vercel
    const response = await fetch(googleTtsUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/mpeg, audio/*;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Google Translate TTS responded with status: ${response.status}`,
      );
    }

    // Lấy arrayBuffer và trả về client
    const audioArrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache audio 1 ngày để tối ưu performance
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("TTS generation error:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Failed to generate TTS" });
  }
});

export default router;
