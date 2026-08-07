import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/tts", async (req, res) => {
  try {
    const text = ((req.query.text as string) || "").substring(0, 300);
    if (!text) return res.status(400).json({ error: "Text is required" });

    const voice = "vi-VN-HoaiMyNeural"; // Giọng nữ Việt Nam tự nhiên đỉnh nhất
    const requestId = uuidv4().replace(/-/g, "");

    // SSML Format gửi tới Edge API
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${voice}'><lang xml:lang='vi-VN'>${text}</lang></voice></speak>`;

    const response = await fetch(
      "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/single-stream/v1?TrustedClientToken=6A5AA1D4EA664E28A928684D8101E260",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "X-RequestId": requestId,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        },
        body: ssml,
      },
    );

    if (!response.ok) {
      throw new Error(`Edge API responded with status ${response.status}`);
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("Direct Edge TTS Error:", error);
    return res.status(500).json({ error: error?.message || "TTS Failed" });
  }
});

export default router;
