import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subdomainsTable } from "./subdomains";
import { addressesTable } from "./addresses";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  subdomainId: integer("subdomain_id").notNull().references(() => subdomainsTable.id, { onDelete: "cascade" }),
  addressId: integer("address_id").references(() => addressesTable.id, { onDelete: "set null" }),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull().default("(No Subject)"),
  bodyText: text("body_text").notNull().default(""),
  bodyHtml: text("body_html"),
  isRead: boolean("is_read").notNull().default(false),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, receivedAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
