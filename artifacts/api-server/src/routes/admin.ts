import { Router, type IRouter } from "express";
import { requireAdmin as checkAdminPassword } from "../middlewares/requireAdmin";
import { getWebhookLogs } from "../lib/webhookLog";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

router.get("/admin/webhook-logs", checkAdminPassword, (_req, res): void => {
  res.json({ logs: getWebhookLogs() });
});

router.get("/admin/clerk-users", checkAdminPassword, async (_req, res): Promise<void> => {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({ limit: 100 });
    const users = response.data.map((u) => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      username: u.username ?? "",
      tier: (u.publicMetadata?.tier as string) ?? "free",
      createdAt: new Date(u.createdAt).toISOString(),
    }));
    res.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list users";
    res.status(500).json({ error: message });
  }
});

router.post("/admin/clerk-users/:clerkId/tier", checkAdminPassword, async (req, res): Promise<void> => {
  const { clerkId } = req.params;
  const { tier } = req.body as { tier?: string };
  if (!tier || !["free", "premium"].includes(tier)) {
    res.status(400).json({ error: "tier must be 'free' or 'premium'" });
    return;
  }
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, { publicMetadata: { tier } });
    res.json({ ok: true, clerkId, tier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update tier";
    res.status(500).json({ error: message });
  }
});

export default router;
