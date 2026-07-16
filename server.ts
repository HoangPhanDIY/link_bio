import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create upload folder if not exists
  // Đường dẫn mới trỏ vào trong thư mục public/uploads
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Tự động tạo thư mục public/uploads nếu chưa có
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve image and uploads folder statically
  app.use("/image", express.static(path.join(process.cwd(), "public", "image")));
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Configure multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      // Clean original name a bit and append unique suffix
      const name = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9]/g, "_");
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({ storage });

  // Express middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API upload route
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

  // Stream notification in-memory store
  interface StreamAlert {
    id: string;
    name: string;
    amount: number;
    message: string;
    isTest?: boolean;
    timestamp: number;
  }

  let pendingAlerts: StreamAlert[] = [];

  // API to trigger a stream alert (live notification)
  app.post("/api/donate-alert", (req, res) => {
    const { name, amount, message, isTest } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin name hoặc amount" });
    }

    const newAlert: StreamAlert = {
      id: Math.random().toString(36).substring(2, 15),
      name,
      amount: Number(amount),
      message: message || "",
      isTest: !!isTest,
      timestamp: Date.now(),
    };

    pendingAlerts.push(newAlert);

    // Limit queue size to prevent memory leaks
    if (pendingAlerts.length > 100) {
      pendingAlerts.shift();
    }

    res.json({ success: true, alert: newAlert, message: "Đã gửi thông tin lên live stream thành công!" });
  });

  // API for the overlay to fetch new stream alerts
  app.get("/api/stream-alerts", (req, res) => {
    // Return all pending alerts and clear the queue
    const alerts = [...pendingAlerts];
    pendingAlerts = [];
    res.json({ success: true, alerts });
  });

  // Vite or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
