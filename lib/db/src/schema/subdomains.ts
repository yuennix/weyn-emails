import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subdomainsTable = pgTable("subdomains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubdomainSchema = createInsertSchema(subdomainsTable).omit({ id: true, createdAt: true });
export type InsertSubdomain = z.infer<typeof insertSubdomainSchema>;
export type Subdomain = typeof subdomainsTable.$inferSelect;
