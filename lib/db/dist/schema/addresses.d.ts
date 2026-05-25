import { z } from "zod/v4";
export declare const addressesTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "addresses";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "addresses";
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
        localPart: import("drizzle-orm/pg-core").PgColumn<{
            name: "local_part";
            tableName: "addresses";
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
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "addresses";
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
        subdomainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subdomain_id";
            tableName: "addresses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "addresses";
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
export declare const insertAddressSchema: z.ZodObject<{
    localPart: z.ZodString;
    domain: z.ZodString;
    subdomainId: z.ZodInt;
}, {
    out: {};
    in: {};
}>;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addressesTable.$inferSelect;
//# sourceMappingURL=addresses.d.ts.map