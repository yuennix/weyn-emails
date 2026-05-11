import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subdomainsTable } from "./subdomains";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  localPart: text("local_part").notNull(),
  domain: text("domain").notNull(),
  subdomainId: integer("subdomain_id").notNull().references(() => subdomainsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAddressSchema = createInsertSchema(addressesTable).omit({ id: true, createdAt: true });
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addressesTable.$inferSelect;
