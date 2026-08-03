import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import apiRouter from "../api/index";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create public/uploads folder if not exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve image and uploads static folders
  app.use(
    "/image",
    express.static(path.join(process.cwd(), "public", "image")),
  );
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads")),
  );

  // Express body parser middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Mount modular API routes from /api directory
  app.use("/api", apiRouter);

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
