import "server-only";
import pg from "pg";

const databaseGlobal = globalThis as typeof globalThis & { kvartaPool?: pg.Pool };

// Lazy: importing this module or building the static page never needs a database.
export function getPool(): pg.Pool {
  if (!databaseGlobal.kvartaPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for database access.");

    const pool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
    });
    // An idle connection can fail independently of a request. Do not log URLs.
    pool.on("error", () => console.error("An idle PostgreSQL connection failed."));
    databaseGlobal.kvartaPool = pool;
  }
  return databaseGlobal.kvartaPool;
}

export async function closePool(): Promise<void> {
  const pool = databaseGlobal.kvartaPool;
  delete databaseGlobal.kvartaPool;
  await pool?.end();
}
