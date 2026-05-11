import app from "./app";
import { logger } from "./lib/logger";
import path from "node:path";

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
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const pg = await import("pg");
      const pool = new pg.default.Pool({
        connectionString: process.env.DATABASE_URL,
      });
      const migrationDb = drizzle(pool);
      const migrationsFolder = path.resolve(process.cwd(), "lib/db/drizzle");
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
