import { Router } from "express";

export interface StreamAlert {
  id: string;
  name: string;
  amount: number;
  message: string;
  isTest?: boolean;
  timestamp: number;
}

let pendingAlerts: StreamAlert[] = [];

const router = Router();

// Trigger stream alert
router.post("/donate-alert", (req, res) => {
  const { name, amount, message, isTest } = req.body;
  if (!name || amount === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin name hoặc amount" });
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

  if (pendingAlerts.length > 100) {
    pendingAlerts.shift();
  }

  res.json({
    success: true,
    alert: newAlert,
    message: "Đã gửi thông tin lên live stream thành công!",
  });
});

// Fetch stream alerts
router.get("/stream-alerts", (req, res) => {
  const alerts = [...pendingAlerts];
  pendingAlerts = [];
  res.json({ success: true, alerts });
});

export default router;
