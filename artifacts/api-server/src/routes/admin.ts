import { Router, type IRouter } from "express";
import { requireAdmin as checkAdminPassword } from "../middlewares/requireAdmin";
import { getWebhookLogs } from "../lib/webhookLog";

const router: IRouter = Router();

router.get("/admin/webhook-logs", checkAdminPassword, (_req, res): void => {
  res.json({ logs: getWebhookLogs() });
});

export default router;
