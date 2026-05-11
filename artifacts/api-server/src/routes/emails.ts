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

// POST /webhook/email
router.post("/webhook/email", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const receivedKeys = Object.keys(b);

  // Normalize field names — accept every common variation email providers use
  const from =
    (b.from ?? b.From ?? b.sender ?? b.Sender ?? b.from_address ?? b.fromAddress ?? "") as string;
  const to =
    (b.to ?? b.To ?? b.recipient ?? b.Recipient ?? b.to_address ?? b.toAddress ?? b.envelope_to ?? (b.envelope as any)?.to ?? "") as string;
  const subject =
    (b.subject ?? b.Subject ?? b.title ?? "") as string;
  const bodyText =
    (b.bodyText ?? b.body_text ?? b.text ?? b["body-plain"] ?? b.plain ?? b.strippedText ?? b.stripped_text ?? "") as string;
  const bodyHtml =
    (b.bodyHtml ?? b.body_html ?? b.html ?? b["body-html"] ?? b.strippedHtml ?? b.stripped_html ?? null) as string | null;

  req.log.info({ rawWebhookBody: b, normalized: { from, to, subject } }, "webhook received");

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
    const msg = `No subdomain registered for: ${to}`;
    addWebhookLog({ status: "no_domain", from, to, subject, statusCode: 404, message: msg, receivedKeys });
    res.status(404).json({ error: msg });
    return;
  }

  const [inserted] = await db
    .insert(emailsTable)
    .values({
      subdomainId: matchedSub.id,
      addressId: matchedAddress?.id ?? null,
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
