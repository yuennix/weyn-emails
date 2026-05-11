import { Router } from "express";
import { db } from "@workspace/db";
import { subdomainsTable, addressesTable, emailsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import {
  GenerateAddressBody,
  GetAddressParams,
  DeleteAddressParams,
  ListEmailsByAddressParams,
} from "@workspace/api-zod";

const router = Router();

function randomLocalPart(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function addressWithCounts(addr: { id: number; localPart: string; domain: string; subdomainId: number; createdAt: Date }, subdomainName: string) {
  const [emailCountRow] = await db
    .select({ value: count() })
    .from(emailsTable)
    .where(eq(emailsTable.addressId, addr.id));
  const [unreadCountRow] = await db
    .select({ value: count() })
    .from(emailsTable)
    .where(and(eq(emailsTable.addressId, addr.id), eq(emailsTable.isRead, false)));
  return {
    id: addr.id,
    localPart: addr.localPart,
    domain: addr.domain,
    fullAddress: `${addr.localPart}@${addr.domain}`,
    subdomainId: addr.subdomainId,
    subdomainName,
    createdAt: addr.createdAt.toISOString(),
    emailCount: Number(emailCountRow?.value ?? 0),
    unreadCount: Number(unreadCountRow?.value ?? 0),
  };
}

// GET /addresses
router.get("/addresses", async (req, res) => {
  const rows = await db
    .select({
      id: addressesTable.id,
      localPart: addressesTable.localPart,
      domain: addressesTable.domain,
      subdomainId: addressesTable.subdomainId,
      subdomainName: subdomainsTable.name,
      createdAt: addressesTable.createdAt,
    })
    .from(addressesTable)
    .innerJoin(subdomainsTable, eq(addressesTable.subdomainId, subdomainsTable.id))
    .orderBy(addressesTable.createdAt);

  const results = await Promise.all(
    rows.map((r) => addressWithCounts(r, r.subdomainName)),
  );
  res.json(results);
});

// POST /addresses
router.post("/addresses", async (req, res) => {
  const parsed = GenerateAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { subdomainId, localPart: customLocal } = parsed.data;

  const [sub] = await db
    .select()
    .from(subdomainsTable)
    .where(eq(subdomainsTable.id, subdomainId))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Subdomain not found" });
    return;
  }

  const localPart = customLocal?.trim() || randomLocalPart();
  const domain = sub.name;

  const [created] = await db
    .insert(addressesTable)
    .values({ localPart, domain, subdomainId })
    .returning();

  res.status(201).json(await addressWithCounts(created, sub.name));
});

// GET /addresses/:id
router.get("/addresses/:id", async (req, res) => {
  const parsed = GetAddressParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select({
      id: addressesTable.id,
      localPart: addressesTable.localPart,
      domain: addressesTable.domain,
      subdomainId: addressesTable.subdomainId,
      subdomainName: subdomainsTable.name,
      createdAt: addressesTable.createdAt,
    })
    .from(addressesTable)
    .innerJoin(subdomainsTable, eq(addressesTable.subdomainId, subdomainsTable.id))
    .where(eq(addressesTable.id, parsed.data.id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  res.json(await addressWithCounts(row, row.subdomainName));
});

// DELETE /addresses/:id
router.delete("/addresses/:id", async (req, res) => {
  const parsed = DeleteAddressParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.id, parsed.data.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  await db.delete(addressesTable).where(eq(addressesTable.id, parsed.data.id));
  res.status(204).send();
});

// GET /addresses/:id/emails
router.get("/addresses/:id/emails", async (req, res) => {
  const parsed = ListEmailsByAddressParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [addr] = await db
    .select({
      id: addressesTable.id,
      localPart: addressesTable.localPart,
      domain: addressesTable.domain,
      subdomainId: addressesTable.subdomainId,
      subdomainName: subdomainsTable.name,
      createdAt: addressesTable.createdAt,
    })
    .from(addressesTable)
    .innerJoin(subdomainsTable, eq(addressesTable.subdomainId, subdomainsTable.id))
    .where(eq(addressesTable.id, parsed.data.id))
    .limit(1);

  if (!addr) {
    res.status(404).json({ error: "Address not found" });
    return;
  }

  const emails = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.addressId, parsed.data.id))
    .orderBy(emailsTable.receivedAt);

  res.json(
    emails.map((e) => ({
      id: e.id,
      subdomainId: e.subdomainId,
      subdomainName: addr.subdomainName,
      addressId: e.addressId,
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
