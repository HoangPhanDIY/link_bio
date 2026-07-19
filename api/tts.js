import googleTTS from "google-tts-api";

// Hàm giả định lấy Gemini Client - giữ đúng cấu trúc dự án gốc của bạn
function getGeminiClient() {
  if (global.geminiClient) return global.geminiClient;
  // Khởi tạo client của bạn ở đây nếu cần...
}

export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const text = req.query.text;
    const lang = req.query.lang || "vi";
    const gender = req.query.gender || "default";

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Sử dụng Gemini TTS nếu là giọng nữ và có API KEY
    if (gender === "female" && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const voiceName = "Puck";

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: text }] }], // Gửi NGUYÊN chuỗi text không cắt xén
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
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
      } catch (geminiError) {
        console.error(
          "Gemini TTS failed, falling back to standard Google TTS:",
          geminiError,
        );
      }
    }

    // Mặc định hoặc dự phòng: Dùng Google Translate TTS
    // Sử dụng getAllAudioBase64 để băm nhỏ chuỗi dài tự động, tránh bị lỗi giới hạn URL của Google
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: lang,
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    // Nối tất cả các mảng chunk base64 trả về thành một file buffer audio/mpeg duy nhất
    const buffers = results.map((item) => Buffer.from(item.base64, "base64"));
    const finalBuffer = Buffer.concat(buffers);

    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(finalBuffer);
  } catch (error) {
    console.error("TTS generation error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate TTS" });
  }
}
