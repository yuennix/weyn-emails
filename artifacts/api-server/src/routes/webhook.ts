import { Router, type IRouter } from "express";
import multer from "multer";
import { db, emailsTable, subdomainsTable, addressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { broadcastNewEmail } from "../lib/sse";
import { addWebhookLog } from "../lib/webhookLog";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface EmailData {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  text?: string;
  html?: string;
  recipient?: string;
  sender?: string;
}

function extractEmailData(body: Record<string, unknown>, files: Express.Multer.File[]): EmailData | null {
  if (typeof body.email === "string") {
    try { return JSON.parse(body.email) as EmailData; } catch { /* ignore */ }
  }
  if (body.from || body.to || body.recipient || body.sender) {
    return body as EmailData;
  }
  if (typeof body.payload === "string") {
    try { return JSON.parse(body.payload) as EmailData; } catch { /* ignore */ }
  }
  if (typeof body.data === "object" && body.data !== null) {
    return body.data as EmailData;
  }
  const emailFile = files.find(f => f.fieldname === "email" || f.mimetype?.startsWith("message/"));
  if (emailFile) {
    try { return JSON.parse(emailFile.buffer.toString("utf8")) as EmailData; } catch { /* ignore */ }
  }
  return null;
}

async function findOrCreateSubdomain(domain: string): Promise<number> {
  const [existing] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, domain));
  if (existing) return existing.id;
  const [created] = await db.insert(subdomainsTable).values({ name: domain }).returning();
  logger.info({ domain }, "Auto-created subdomain from webhook");
  return created.id;
}

async function findOrCreateAddress(localPart: string, domain: string, subdomainId: number): Promise<number> {
  const [existing] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.localPart, localPart));
  if (existing) return existing.id;
  const [created] = await db.insert(addressesTable).values({ localPart, domain, subdomainId }).returning();
  return created.id;
}

router.post(
  "/webhook/email",
  upload.any(),
  async (req, res): Promise<void> => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const receivedKeys = Object.keys(req.body || {});
    const bodyPreview = JSON.stringify(req.body).slice(0, 300);

    try {
      logger.info({
        contentType: req.headers["content-type"],
        bodyKeys: receivedKeys,
        bodyRaw: bodyPreview,
        filesCount: files.length,
      }, "Webhook received");

      const emailData = extractEmailData(req.body as Record<string, unknown>, files);

      if (!emailData) {
        const keyList = receivedKeys.join(", ") || "(none)";
        addWebhookLog({ timestamp: new Date().toISOString(), method: req.method, contentType: req.headers["content-type"] ?? "", receivedKeys, status: 400, error: `Could not parse email data. Keys: ${keyList}`, parsedFrom: null, parsedTo: null, parsedSubject: null, emailId: null, bodyPreview });
        res.status(400).json({ error: `Could not parse email data. Keys: ${keyList}` });
        return;
      }

      const fromAddress = emailData.from ?? emailData.sender ?? "unknown@unknown.com";
      const toAddress = (emailData.to ?? emailData.recipient ?? "").toLowerCase().trim();
      const subject = emailData.subject ?? "(no subject)";
      const rawBody = emailData.body ?? emailData.html ?? emailData.text ?? "";

      if (!toAddress) {
        addWebhookLog({ timestamp: new Date().toISOString(), method: req.method, contentType: req.headers["content-type"] ?? "", receivedKeys, status: 400, error: "Missing to address", parsedFrom: fromAddress, parsedTo: null, parsedSubject: subject, emailId: null, bodyPreview });
        res.status(400).json({ error: "Missing to address" });
        return;
      }

      const [localPart = "", domain = ""] = toAddress.split("@");
      const subdomainId = await findOrCreateSubdomain(domain);
      const addressId = await findOrCreateAddress(localPart, domain, subdomainId);

      const isHtml = /<[a-z][\s\S]*>/i.test(rawBody);

      const [inserted] = await db
        .insert(emailsTable)
        .values({
          subdomainId,
          addressId,
          fromAddress,
          toAddress,
          subject,
          bodyHtml: isHtml ? rawBody : null,
          bodyText: isHtml ? "" : rawBody,
          isRead: false,
          receivedAt: new Date(),
        })
        .returning();

      logger.info({ emailId: inserted.id, to: toAddress, from: fromAddress, subject }, "Email stored");
      broadcastNewEmail(toAddress, inserted.id);

      addWebhookLog({ timestamp: new Date().toISOString(), method: req.method, contentType: req.headers["content-type"] ?? "", receivedKeys, status: 200, error: null, parsedFrom: fromAddress, parsedTo: toAddress, parsedSubject: subject, emailId: inserted.id, bodyPreview });
      res.status(200).json({ status: "ok", emailId: inserted.id });
    } catch (err) {
      logger.error({ err }, "Failed to process incoming webhook");
      addWebhookLog({ timestamp: new Date().toISOString(), method: req.method, contentType: req.headers["content-type"] ?? "", receivedKeys, status: 500, error: String(err), parsedFrom: null, parsedTo: null, parsedSubject: null, emailId: null, bodyPreview });
      res.status(500).json({ error: "Internal error" });
    }
  }
);

export default router;
