import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

const router = Router();

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

export default router;
