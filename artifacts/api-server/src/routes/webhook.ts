import { Router, type IRouter } from "express";
import multer from "multer";
import { db, emailsTable, domainsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
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
  headers?: Record<string, string>[];
}

/** Parse raw MIME email text into EmailData (handles From/To/Subject headers + body) */
function parseMimeEmail(raw: string): EmailData | null {
  // Normalize line endings: CRLF (\r\n) and CR (\r) → LF (\n)
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split headers from body at the first blank line
  const blankLine = normalized.indexOf("\n\n");
  const headerBlock = blankLine !== -1 ? normalized.slice(0, blankLine) : normalized;
  const bodyBlock   = blankLine !== -1 ? normalized.slice(blankLine + 2).trim() : "";

  const getHeader = (name: string): string | undefined => {
    // Headers can be folded (continuation lines start with whitespace)
    const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\n[^\\s]|$)`, "im");
    const m = headerBlock.match(re);
    return m ? m[1].replace(/\n\s+/g, " ").trim() : undefined;
  };

  const from    = getHeader("From");
  const to      = getHeader("To") ?? getHeader("Delivered-To") ?? getHeader("X-Original-To") ?? getHeader("X-Forwarded-To");
  const subject = getHeader("Subject");

  // We need at least one address to be useful
  if (!from && !to) return null;

  // Handle multipart MIME bodies — extract text/html or text/plain parts
  let finalBody = bodyBlock;
  const contentType = getHeader("Content-Type") ?? "";
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = normalized.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`));
    let htmlPart = "";
    let textPart = "";
    for (const part of parts) {
      const partBlank = part.indexOf("\n\n");
      if (partBlank === -1) continue;
      const partHeaders = part.slice(0, partBlank);
      const partBody = part.slice(partBlank + 2).trim();
      const partCT = (partHeaders.match(/^Content-Type:\s*([^\s;]+)/im)?.[1] ?? "").toLowerCase();
      if (partCT === "text/html" && !htmlPart) htmlPart = partBody;
      else if (partCT === "text/plain" && !textPart) textPart = partBody;
    }
    if (htmlPart) finalBody = htmlPart;
    else if (textPart) finalBody = textPart;
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(finalBody);
  return {
    from,
    to,
    subject,
    ...(isHtml ? { html: finalBody } : { text: finalBody }),
    body: finalBody,
  };
}

function extractEmailData(body: Record<string, unknown>, files: Express.Multer.File[]): EmailData | null {
  // Format 1a: body.email is a JSON string (original Hanami.run JSON format)
  if (typeof body.email === "string") {
    try {
      const parsed = JSON.parse(body.email) as EmailData;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Not JSON — fall through to Format 1b
    }

    // Format 1b: body.email is a raw MIME email string
    const mimeData = parseMimeEmail(body.email);
    if (mimeData) return mimeData;

    logger.warn("body.email present but could not parse as JSON or MIME");
  }

  // Format 2: body has email fields directly (JSON body from custom senders)
  if (body.from || body.to || body.recipient || body.sender) {
    return body as EmailData;
  }

  // Format 3: body.payload is a JSON string
  if (typeof body.payload === "string") {
    try {
      return JSON.parse(body.payload) as EmailData;
    } catch {
      logger.warn("Failed to parse body.payload as JSON");
    }
  }

  // Format 4: body itself has nested email data under a "data" key
  if (typeof body.data === "object" && body.data !== null) {
    return body.data as EmailData;
  }

  // Format 5: multipart form-data files (some services attach the raw email as a file)
  const emailFile = files.find(f => f.fieldname === "email" || f.mimetype?.startsWith("message/"));
  if (emailFile) {
    const raw = emailFile.buffer.toString("utf8");
    return parseMimeEmail(raw);
  }

  return null;
}

router.post(
  "/webhook/email",
  upload.any(),
  async (req, res): Promise<void> => {
    try {
      // Log full request for debugging
      logger.info({
        contentType: req.headers["content-type"],
        bodyKeys: Object.keys(req.body || {}),
        bodyRaw: JSON.stringify(req.body).slice(0, 500),
        filesCount: (req.files as Express.Multer.File[] | undefined)?.length ?? 0,
      }, "Webhook received");

      const files = (req.files as Express.Multer.File[]) ?? [];
      const receivedKeys = Object.keys(req.body || {});
      const bodyPreview = JSON.stringify(req.body).slice(0, 300);
      const emailData = extractEmailData(req.body as Record<string, unknown>, files);

      if (!emailData) {
        const keyList = receivedKeys.join(", ") || "(none)";
        logger.warn({ body: req.body }, "Could not extract email data from webhook");
        addWebhookLog({
          timestamp: new Date().toISOString(),
          method: req.method,
          contentType: req.headers["content-type"] ?? "",
          receivedKeys,
          status: 400,
          error: `Missing required fields: from and to. Received keys: ${keyList}`,
          parsedFrom: null,
          parsedTo: null,
          parsedSubject: null,
          emailId: null,
          bodyPreview,
        });
        res.status(400).json({
          error: `Missing required fields: from and to. Received keys: ${keyList}`,
        });
        return;
      }

      const fromAddress = emailData.from ?? emailData.sender ?? "unknown@unknown.com";
      const toAddress = (emailData.to ?? emailData.recipient ?? "").toLowerCase().trim();
      const subject = emailData.subject ?? "(no subject)";
      const body = emailData.body ?? emailData.html ?? emailData.text ?? "";

      if (!toAddress) {
        logger.warn("Webhook received with empty to address");
        addWebhookLog({
          timestamp: new Date().toISOString(),
          method: req.method,
          contentType: req.headers["content-type"] ?? "",
          receivedKeys,
          status: 400,
          error: "Missing to address",
          parsedFrom: fromAddress,
          parsedTo: null,
          parsedSubject: subject,
          emailId: null,
          bodyPreview,
        });
        res.status(400).json({ error: "Missing to address" });
        return;
      }

      const toHost = toAddress.split("@")[1];
      if (toHost) {
        const knownDomains = await db
          .select()
          .from(domainsTable)
          .where(eq(domainsTable.name, toHost));

        if (knownDomains.length === 0) {
          await db.insert(domainsTable).values({ name: toHost, active: true });
          logger.info({ domain: toHost }, "Auto-registered domain from webhook");
        }
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(body);
      const htmlBody = isHtml ? body : null;
      const textBody = isHtml ? null : body;

      const preview = body
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      const messageId = `webhook-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const [inserted] = await db
        .insert(emailsTable)
        .values({
          messageId,
          toAddress,
          fromAddress,
          subject,
          htmlBody,
          textBody,
          preview,
          read: false,
          receivedAt: new Date(),
          sizeBytes: Buffer.byteLength(JSON.stringify(emailData), "utf8"),
        })
        .returning();

      logger.info(
        { emailId: inserted.id, to: toAddress, from: fromAddress, subject },
        "Email received and stored"
      );

      broadcastNewEmail(toAddress, inserted.id);

      addWebhookLog({
        timestamp: new Date().toISOString(),
        method: req.method,
        contentType: req.headers["content-type"] ?? "",
        receivedKeys,
        status: 200,
        error: null,
        parsedFrom: fromAddress,
        parsedTo: toAddress,
        parsedSubject: subject,
        emailId: inserted.id,
        bodyPreview,
      });

      res.status(200).json({ status: "ok", emailId: inserted.id });
    } catch (err) {
      logger.error({ err }, "Failed to process incoming webhook");
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// Clerk user.created webhook — configure in Clerk Dashboard → Webhooks
// Endpoint: POST /api/webhook/clerk
// Requires CLERK_WEBHOOK_SECRET to be set (Svix signing secret from Clerk dashboard)
router.post("/webhook/clerk", async (req, res): Promise<void> => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not configured — rejecting webhook");
    res.status(500).json({ error: "Webhook secret is not configured" });
    return;
  }

  // Verify Svix signature
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(webhookSecret);

    // Use the raw request body buffer for signature verification (re-stringifying parsed JSON is fragile)
    const payload = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body);

    const event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type?: string; data?: { id?: string; email_addresses?: { email_address: string }[]; username?: string } };

    if (event.type !== "user.created" && event.type !== "user.updated") {
      res.json({ ok: true, skipped: true });
      return;
    }

    const clerkId = event.data?.id;
    const email = event.data?.email_addresses?.[0]?.email_address ?? "";
    const username = event.data?.username ?? null;

    if (!clerkId) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));

    if (existing) {
      await db.update(usersTable)
        .set({ email: email || existing.email, username: username ?? existing.username })
        .where(eq(usersTable.clerkId, clerkId));
      res.json({ ok: true, action: "updated" });
      return;
    }

    const [{ count: dbCount }] = await db.select({ count: count() }).from(usersTable);
    const isFirst = Number(dbCount) === 0;

    await db.insert(usersTable).values({
      clerkId,
      email,
      username,
      tier: isFirst ? "premium" : "free",
      isAdmin: isFirst,
    });

    logger.info({ clerkId, email }, "User created via Clerk webhook");
    res.json({ ok: true, action: "created" });
  } catch (err) {
    logger.error({ err }, "Clerk webhook error or signature verification failed");
    res.status(400).json({ error: "Webhook verification failed" });
  }
});

export default router;
