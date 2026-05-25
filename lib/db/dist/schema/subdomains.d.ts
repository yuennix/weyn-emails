import { z } from "zod/v4";
export declare const subdomainsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "subdomains";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "subdomains";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "subdomains";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        webhookSecret: import("drizzle-orm/pg-core").PgColumn<{
            name: "webhook_secret";
            tableName: "subdomains";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "subdomains";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const insertSubdomainSchema: z.ZodObject<{
    name: z.ZodString;
    webhookSecret: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, {
    out: {};
    in: {};
}>;
export type InsertSubdomain = z.infer<typeof insertSubdomainSchema>;
export type Subdomain = typeof subdomainsTable.$inferSelect;
//# sourceMappingURL=subdomains.d.ts.map