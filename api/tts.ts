import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";

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
    const gender = (req.query.gender as string) || "default";

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text.substring(0, 300);

    // 1. Ưu tiên Gemini TTS nếu yêu cầu giọng female và có GEMINI_API_KEY
    if (gender === "female" && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        if (ai) {
          // Dùng giọng Aoede hoặc Kore cho mượt
          const voiceName = "Aoede";
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
          "Gemini TTS failed, falling back to Microsoft Edge TTS:",
          geminiError,
        );
      }
    }

    // 2. Microsoft Edge TTS API (Không bao giờ bị chặn IP trên Vercel)
    // Chọn giọng nữ Hoài Mỹ đọc cực mượt và chuẩn tiếng Việt
    const voice = "vi-VN-HoaiMyNeural";
    const requestId = uuidv4().replace(/-/g, "");

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${voice}'><lang xml:lang='vi-VN'>${cleanText}</lang></voice></speak>`;

    const edgeResponse = await fetch(
      "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/single-stream/v1?TrustedClientToken=6A5AA1D4EA664E28A928684D8101E260",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "X-RequestId": requestId,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        },
        body: ssml,
      },
    );

    if (!edgeResponse.ok) {
      throw new Error(`Edge TTS API status: ${edgeResponse.status}`);
    }

    const audioArrayBuffer = await edgeResponse.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 1 ngày
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("TTS generation error:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Failed to generate TTS" });
  }
});

export default router;
