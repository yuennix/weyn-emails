import { Router, type IRouter } from "express";
  import { db, usersTable, domainsTable, userDomainAssignmentsTable } from "@workspace/db";
  import { eq, count, and } from "drizzle-orm";
  import { requireAdmin as checkAdminPassword } from "../middlewares/requireAdmin";

  const router: IRouter = Router();

  router.post("/admin/auth", (req, res): void => {
    const adminPwd = process.env.ADMIN_PASSWORD;
    if (!adminPwd) {
      res.status(500).json({ error: "Admin password is not configured on the server" });
      return;
    }
    const { password } = req.body as { password?: string };
    if (!password || password !== adminPwd) {
      res.status(401).json({ error: "Wrong password" });
      return;
    }
    res.json({ ok: true });
  });

  router.get("/admin/users", checkAdminPassword, async (_req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

    const mapped = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    }));

    res.json({ users: mapped, stats: { total: mapped.length } });
  });

  router.post("/admin/users/import", checkAdminPassword, async (req, res): Promise<void> => {
    const { emails } = req.body as { emails?: string[] };
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: "emails array required" });
      return;
    }

    const [{ count: dbCount }] = await db.select({ count: count() }).from(usersTable);
    const isEmpty = Number(dbCount) === 0;
    let created = 0;
    let skipped = 0;

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email) continue;

      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existing) { skipped++; continue; }

      const isFirst = isEmpty && created === 0;
      await db.insert(usersTable).values({
        clerkId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        email,
        username: email.split("@")[0],
        tier: "premium",
        isAdmin: isFirst,
      });
      created++;
    }

    res.json({ ok: true, created, skipped });
  });

  router.post("/admin/domains/import-from-temp-mail", checkAdminPassword, async (_req, res): Promise<void> => {
    try {
      const response = await fetch("https://api.internal.temp-mail.io/api/v3/domains", {
        headers: { "Accept": "application/json" },
      });
      if (!response.ok) {
        res.status(502).json({ error: "Failed to fetch domains from temp-mail.io" });
        return;
      }
      const json = await response.json() as { domains?: { name: string }[] };
      const remoteDomains: { name: string }[] = json.domains ?? [];

      let added = 0;
      let skipped = 0;
      const addedNames: string[] = [];

      for (const { name } of remoteDomains) {
        const domain = name.toLowerCase().trim();
        if (!domain) continue;
        const existing = await db.select({ id: domainsTable.id }).from(domainsTable).where(eq(domainsTable.name, domain));
        if (existing.length > 0) { skipped++; continue; }
        await db.insert(domainsTable).values({ name: domain, active: true });
        addedNames.push(domain);
        added++;
      }

      res.json({ ok: true, added, skipped, domains: addedNames });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  router.delete("/admin/users/:id", checkAdminPassword, async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ok: true });
  });

  router.get("/admin/users/:id/domains", checkAdminPassword, async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id, 10);
    const assignments = await db
      .select({ domainId: userDomainAssignmentsTable.domainId })
      .from(userDomainAssignmentsTable)
      .where(eq(userDomainAssignmentsTable.userId, userId));
    res.json({ domainIds: assignments.map((a) => a.domainId) });
  });

  router.post("/admin/users/:id/domains/:domainId", checkAdminPassword, async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id, 10);
    const domainId = parseInt(req.params.domainId, 10);
    if (isNaN(userId) || isNaN(domainId)) {
      res.status(400).json({ error: "Invalid ids" });
      return;
    }
    await db.insert(userDomainAssignmentsTable).values({ userId, domainId }).onConflictDoNothing();
    res.json({ ok: true });
  });

  router.delete("/admin/users/:id/domains/:domainId", checkAdminPassword, async (req, res): Promise<void> => {
    const userId = parseInt(req.params.id, 10);
    const domainId = parseInt(req.params.domainId, 10);
    await db
      .delete(userDomainAssignmentsTable)
      .where(and(eq(userDomainAssignmentsTable.userId, userId), eq(userDomainAssignmentsTable.domainId, domainId)));
    res.json({ ok: true });
  });

  export default router;
  