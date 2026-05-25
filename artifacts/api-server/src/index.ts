import app from "./app";
import { logger } from "./lib/logger";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  if (process.env.DATABASE_URL) {
    try {
      const ssl = process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
      const migrationDb = drizzle(pool);
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationsFolder = path.resolve(__dirname, "../../../lib/db/drizzle");
      await migrate(migrationDb, { migrationsFolder });
      logger.info("Database migrations applied successfully");
      await pool.end();
    } catch (err) {
      logger.error({ err }, "Failed to run database migrations");
      process.exit(1);
    }
  } else {
    logger.warn("DATABASE_URL not set — skipping migrations");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
