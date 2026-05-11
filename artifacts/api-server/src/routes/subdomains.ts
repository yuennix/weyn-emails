import { Router } from "express";
import { db } from "@workspace/db";
import { subdomainsTable, emailsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import {
  CreateSubdomainBody,
  GetSubdomainParams,
  DeleteSubdomainParams,
  ListEmailsBySubdomainParams,
} from "@workspace/api-zod";

const router = Router();

// GET /subdomains
router.get("/subdomains", async (req, res) => {
  const subdomains = await db.select().from(subdomainsTable).orderBy(subdomainsTable.createdAt);

  const results = await Promise.all(
    subdomains.map(async (sub) => {
      const [emailCountRow] = await db
        .select({ value: count() })
        .from(emailsTable)
        .where(eq(emailsTable.subdomainId, sub.id));

      const [unreadCountRow] = await db
        .select({ value: count() })
        .from(emailsTable)
        .where(and(eq(emailsTable.subdomainId, sub.id), eq(emailsTable.isRead, false)));

      return {
        id: sub.id,
        name: sub.name,
        webhookSecret: sub.webhookSecret,
        createdAt: sub.createdAt.toISOString(),
        emailCount: Number(emailCountRow?.value ?? 0),
        unreadCount: Number(unreadCountRow?.value ?? 0),
      };
    }),
  );

  res.json(results);
});

// POST /subdomains
router.post("/subdomains", async (req, res) => {
  const parsed = CreateSubdomainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, webhookSecret } = parsed.data;

  const existing = await db
    .select()
    .from(subdomainsTable)
    .where(eq(subdomainsTable.name, name))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Subdomain already exists" });
    return;
  }

  const [created] = await db
    .insert(subdomainsTable)
    .values({ name, webhookSecret: webhookSecret ?? null })
    .returning();

  res.status(201).json({
    id: created.id,
    name: created.name,
    webhookSecret: created.webhookSecret,
    createdAt: created.createdAt.toISOString(),
    emailCount: 0,
    unreadCount: 0,
  });
});

// GET /subdomains/:id
router.get("/subdomains/:id", async (req, res) => {
  const parsed = GetSubdomainParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [sub] = await db
    .select()
    .from(subdomainsTable)
    .where(eq(subdomainsTable.id, parsed.data.id))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Subdomain not found" });
    return;
  }

  const [emailCountRow] = await db
    .select({ value: count() })
    .from(emailsTable)
    .where(eq(emailsTable.subdomainId, sub.id));

  const [unreadCountRow] = await db
    .select({ value: count() })
    .from(emailsTable)
    .where(and(eq(emailsTable.subdomainId, sub.id), eq(emailsTable.isRead, false)));

  res.json({
    id: sub.id,
    name: sub.name,
    webhookSecret: sub.webhookSecret,
    createdAt: sub.createdAt.toISOString(),
    emailCount: Number(emailCountRow?.value ?? 0),
    unreadCount: Number(unreadCountRow?.value ?? 0),
  });
});

// DELETE /subdomains/:id
router.delete("/subdomains/:id", async (req, res) => {
  const parsed = DeleteSubdomainParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(subdomainsTable)
    .where(eq(subdomainsTable.id, parsed.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Subdomain not found" });
    return;
  }

  await db.delete(subdomainsTable).where(eq(subdomainsTable.id, parsed.data.id));

  res.status(204).send();
});

// GET /subdomains/:id/emails
router.get("/subdomains/:id/emails", async (req, res) => {
  const parsed = ListEmailsBySubdomainParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [sub] = await db
    .select()
    .from(subdomainsTable)
    .where(eq(subdomainsTable.id, parsed.data.id))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Subdomain not found" });
    return;
  }

  const emails = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.subdomainId, parsed.data.id))
    .orderBy(emailsTable.receivedAt);

  res.json(
    emails.map((e) => ({
      id: e.id,
      subdomainId: e.subdomainId,
      subdomainName: sub.name,
      fromAddress: e.fromAddress,
      toAddress: e.toAddress,
      subject: e.subject,
      bodyText: e.bodyText,
      bodyHtml: e.bodyHtml,
      receivedAt: e.receivedAt.toISOString(),
      isRead: e.isRead,
    })),
  );
});

export default router;
