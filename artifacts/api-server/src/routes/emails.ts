import { Router } from "express";
import { db } from "@workspace/db";
import { subdomainsTable, emailsTable, addressesTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  GetEmailParams,
  DeleteEmailParams,
  MarkEmailReadParams,
  ListRecentEmailsQueryParams,
} from "@workspace/api-zod";
import { addWebhookLog, getWebhookLogs } from "../lib/webhookLog";

const router = Router();

function formatEmail(e: {
  id: number; subdomainId: number; addressId: number | null;
  fromAddress: string; toAddress: string; subject: string;
  bodyText: string; bodyHtml: string | null; receivedAt: Date; isRead: boolean;
}, subdomainName: string) {
  return {
    id: e.id,
    subdomainId: e.subdomainId,
    subdomainName,
    addressId: e.addressId,
    fromAddress: e.fromAddress,
    toAddress: e.toAddress,
    subject: e.subject,
    bodyText: e.bodyText,
    bodyHtml: e.bodyHtml,
    receivedAt: e.receivedAt.toISOString(),
    isRead: e.isRead,
  };
}

// GET /inbox?address=foo@domain.com — look up inbox by email address string
router.get("/inbox", async (req, res) => {
  const address = String(req.query.address ?? "").toLowerCase().trim();
  if (!address) {
    res.status(400).json({ error: "address query param required" });
    return;
  }

  const atIdx = address.indexOf("@");
  const domain = atIdx >= 0 ? address.slice(atIdx + 1) : address;

  // find matching subdomain
  const allSubs = await db.select().from(subdomainsTable);
  const matchedSub = allSubs.find(
    (s) => domain === s.name.toLowerCase() || domain.endsWith(`.${s.name.toLowerCase()}`),
  );

  if (!matchedSub) {
    res.status(404).json({ error: `No domain registered for: ${address}` });
    return;
  }

  // fetch emails - if full address given, filter by toAddress; otherwise all for domain
  const hasLocal = atIdx > 0;
  const rows = await db
    .select({
      id: emailsTable.id,
      subdomainId: emailsTable.subdomainId,
      subdomainName: subdomainsTable.name,
      addressId: emailsTable.addressId,
      fromAddress: emailsTable.fromAddress,
      toAddress: emailsTable.toAddress,
      subject: emailsTable.subject,
      bodyText: emailsTable.bodyText,
      bodyHtml: emailsTable.bodyHtml,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
    })
    .from(emailsTable)
    .innerJoin(subdomainsTable, eq(emailsTable.subdomainId, subdomainsTable.id))
    .where(
      hasLocal
        ? and(eq(emailsTable.subdomainId, matchedSub.id), eq(sql`lower(${emailsTable.toAddress})`, address))
        : eq(emailsTable.subdomainId, matchedSub.id),
    )
    .orderBy(desc(emailsTable.receivedAt))
    .limit(200);

  res.json({ domain: matchedSub.name, subdomainId: matchedSub.id, emails: rows.map((e) => ({ ...e, receivedAt: e.receivedAt.toISOString() })) });
});

// GET /emails
router.get("/emails", async (req, res) => {
  const parsed = ListRecentEmailsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;

  const emails = await db
    .select({
      id: emailsTable.id,
      subdomainId: emailsTable.subdomainId,
      subdomainName: subdomainsTable.name,
      addressId: emailsTable.addressId,
      fromAddress: emailsTable.fromAddress,
      toAddress: emailsTable.toAddress,
      subject: emailsTable.subject,
      bodyText: emailsTable.bodyText,
      bodyHtml: emailsTable.bodyHtml,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
    })
    .from(emailsTable)
    .innerJoin(subdomainsTable, eq(emailsTable.subdomainId, subdomainsTable.id))
    .orderBy(desc(emailsTable.receivedAt))
    .limit(limit);

  res.json(emails.map((e) => ({ ...e, receivedAt: e.receivedAt.toISOString() })));
});

// GET /emails/:id
router.get("/emails/:id", async (req, res) => {
  const parsed = GetEmailParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: emailsTable.id,
      subdomainId: emailsTable.subdomainId,
      subdomainName: subdomainsTable.name,
      addressId: emailsTable.addressId,
      fromAddress: emailsTable.fromAddress,
      toAddress: emailsTable.toAddress,
      subject: emailsTable.subject,
      bodyText: emailsTable.bodyText,
      bodyHtml: emailsTable.bodyHtml,
      receivedAt: emailsTable.receivedAt,
      isRead: emailsTable.isRead,
    })
    .from(emailsTable)
    .innerJoin(subdomainsTable, eq(emailsTable.subdomainId, subdomainsTable.id))
    .where(eq(emailsTable.id, parsed.data.id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Email not found" }); return; }
  res.json({ ...row, receivedAt: row.receivedAt.toISOString() });
});

// DELETE /emails/:id
router.delete("/emails/:id", async (req, res) => {
  const parsed = DeleteEmailParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(emailsTable).where(eq(emailsTable.id, parsed.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Email not found" }); return; }

  await db.delete(emailsTable).where(eq(emailsTable.id, parsed.data.id));
  res.status(204).send();
});

// PATCH /emails/:id/read
router.patch("/emails/:id/read", async (req, res) => {
  const parsed = MarkEmailReadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(emailsTable).where(eq(emailsTable.id, parsed.data.id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Email not found" }); return; }

  const [updated] = await db
    .update(emailsTable)
    .set({ isRead: true })
    .where(eq(emailsTable.id, parsed.data.id))
    .returning();

  const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.id, updated.subdomainId)).limit(1);
  res.json(formatEmail(updated, sub?.name ?? ""));
});

// GET /webhook/logs — in-memory log of recent webhook attempts
router.get("/webhook/logs", (_req, res) => {
  res.json(getWebhookLogs());
});

/** Parse a raw MIME email string and extract from/to/subject/body fields */
function parseMimeEmail(raw: string): Record<string, string> {
  // Normalize line endings (email RFCs use CRLF; normalize to LF)
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blankLine = text.indexOf("\n\n");
  const headerBlock = blankLine >= 0 ? text.slice(0, blankLine) : text;
  const bodyBlock   = blankLine >= 0 ? text.slice(blankLine + 2).trim() : "";

  const getHeader = (name: string): string => {
    const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\n[^\\s]|$)`, "im");
    const m = headerBlock.match(re);
    return m ? m[1].replace(/\n\s+/g, " ").trim() : "";
  };

  const from    = getHeader("From");
  const to      = getHeader("To") || getHeader("Delivered-To") || getHeader("X-Original-To") || getHeader("X-Forwarded-To");
  const subject = getHeader("Subject");

  // Handle multipart bodies — prefer text/html, fall back to text/plain
  const contentType = getHeader("Content-Type");
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s\r\n]+)/i);
  let finalBody = bodyBlock;
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`--${escaped}(?:--)?\n?`));
    let htmlPart = "", textPart = "";
    for (const part of parts) {
      const pb = part.indexOf("\n\n");
      if (pb < 0) continue;
      const ph = part.slice(0, pb);
      const body = part.slice(pb + 2).trim();
      const ct = (ph.match(/^Content-Type:\s*([^\s;]+)/im)?.[1] ?? "").toLowerCase();
      if (ct === "text/html" && !htmlPart) htmlPart = body;
      else if (ct === "text/plain" && !textPart) textPart = body;
    }
    finalBody = htmlPart || textPart || bodyBlock;
  }

  return { from, to, subject, body: finalBody };
}

// POST /webhook/email
router.post("/webhook/email", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const receivedKeys = Object.keys(b);

  req.log.info({
    contentType: req.headers["content-type"],
    receivedKeys,
    bodyRaw: JSON.stringify(b).slice(0, 800),
  }, "webhook received");

  // ── Step 1: if body has an "email" field, try to parse it ──────────────
  // Mailwip and many other forwarders send the entire email as body.email
  if (typeof b.email === "string" && b.email.length > 0) {
    // Try JSON first (some services wrap fields as JSON)
    try {
      const parsed = JSON.parse(b.email) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        Object.assign(b, parsed);
      }
    } catch {
      // Not JSON — treat as raw MIME email
      const mimeFields = parseMimeEmail(b.email);
      if (mimeFields.from || mimeFields.to) {
        Object.assign(b, mimeFields);
      }
    }
  }

  // ── Step 2: normalize field names across all common provider formats ───
  const from =
    (b.from ?? b.From ?? b.sender ?? b.Sender ?? b.from_address ?? b.fromAddress ?? "") as string;
  const to =
    (b.to ?? b.To ?? b.recipient ?? b.Recipient ?? b.to_address ?? b.toAddress ?? b.envelope_to ?? (b.envelope as any)?.to ?? "") as string;
  const subject =
    (b.subject ?? b.Subject ?? b.title ?? "") as string;
  const bodyText =
    (b.bodyText ?? b.body_text ?? b.text ?? b["body-plain"] ?? b.plain ?? b.strippedText ?? b.stripped_text ?? b.body ?? "") as string;
  const bodyHtml =
    (b.bodyHtml ?? b.body_html ?? b.html ?? b["body-html"] ?? b.strippedHtml ?? b.stripped_html ?? null) as string | null;

  if (!from || !to) {
    const msg = "Missing required fields: from and to. Received keys: " + receivedKeys.join(", ");
    req.log.warn({ body: b }, "webhook rejected — " + msg);
    addWebhookLog({ status: "rejected", from, to, subject, statusCode: 400, message: msg, receivedKeys });
    res.status(400).json({ error: msg });
    return;
  }

  const toLower = to.toLowerCase();
  const toDomain = toLower.split("@")[1] ?? "";
  const toLocal = toLower.split("@")[0] ?? "";

  // 1. Try to match a specific generated address first (exact match)
  const allAddresses = await db
    .select({ id: addressesTable.id, localPart: addressesTable.localPart, domain: addressesTable.domain, subdomainId: addressesTable.subdomainId })
    .from(addressesTable);

  const matchedAddress = allAddresses.find(
    (a) => a.localPart.toLowerCase() === toLocal && a.domain.toLowerCase() === toDomain,
  );

  // 2. Find the matching subdomain by domain
  const allSubdomains = await db.select().from(subdomainsTable);

  let matchedSub = allSubdomains.find(
    (s) => toDomain === s.name.toLowerCase() || toDomain.endsWith(`.${s.name.toLowerCase()}`),
  );

  if (!matchedSub && matchedAddress) {
    matchedSub = allSubdomains.find((s) => s.id === matchedAddress.subdomainId);
  }

  if (!matchedSub) {
    // Auto-register the domain so emails always get accepted
    const [created] = await db
      .insert(subdomainsTable)
      .values({ name: toDomain })
      .onConflictDoNothing()
      .returning();
    // If onConflictDoNothing returned nothing, fetch the existing row
    matchedSub = created ?? (await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, toDomain)).limit(1))[0];
    req.log.info({ domain: toDomain }, "Auto-registered domain from webhook");
  }

  if (!matchedSub) {
    // Should never happen, but guard anyway
    res.status(500).json({ error: "Failed to register domain" });
    return;
  }

  let resolvedAddressId = matchedAddress?.id ?? null;
  if (!resolvedAddressId && toLocal) {
    const [createdAddr] = await db
      .insert(addressesTable)
      .values({ localPart: toLocal, domain: toDomain, subdomainId: matchedSub.id })
      .onConflictDoNothing()
      .returning();
    resolvedAddressId = createdAddr?.id ?? null;
  }

  const [inserted] = await db
    .insert(emailsTable)
    .values({
      subdomainId: matchedSub.id,
      addressId: resolvedAddressId,
      fromAddress: from,
      toAddress: to,
      subject: subject ?? "(No Subject)",
      bodyText: bodyText ?? "",
      bodyHtml: bodyHtml ?? null,
      isRead: false,
    })
    .returning();

  addWebhookLog({ status: "success", from, to, subject, statusCode: 200, message: "Email saved", receivedKeys });
  res.json(formatEmail(inserted, matchedSub.name));
});

// GET /stats/summary
router.get("/stats/summary", async (req, res) => {
  const [[totalSubdomains], [totalAddresses], [totalEmails], [unreadEmails], [emailsToday]] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(subdomainsTable),
    db.select({ value: sql<number>`count(*)::int` }).from(addressesTable),
    db.select({ value: sql<number>`count(*)::int` }).from(emailsTable),
    db.select({ value: sql<number>`count(*)::int` }).from(emailsTable).where(eq(emailsTable.isRead, false)),
    db.select({ value: sql<number>`count(*)::int` }).from(emailsTable).where(sql`received_at >= current_date`),
  ]);

  res.json({
    totalSubdomains: totalSubdomains?.value ?? 0,
    totalAddresses: totalAddresses?.value ?? 0,
    totalEmails: totalEmails?.value ?? 0,
    unreadEmails: unreadEmails?.value ?? 0,
    emailsToday: emailsToday?.value ?? 0,
  });
});

export default router;
