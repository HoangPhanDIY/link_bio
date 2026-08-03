import { Router } from "express";
import * as googleTTS from "google-tts-api";
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

    const cleanText = text.substring(0, 200);

    // Use Gemini TTS if female gender requested and GEMINI_API_KEY available
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
          "Gemini TTS failed, falling back to google-tts-api:",
          geminiError,
        );
      }
    }

    // Default fallback: Google Translate TTS
    const base64 = await googleTTS.getAudioBase64(cleanText, {
      lang,
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    const buffer = Buffer.from(base64, "base64");
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("TTS generation error:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Failed to generate TTS" });
  }
});

export default router;
