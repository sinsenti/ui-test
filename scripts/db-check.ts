import "./env.ts";
import { closePool, getPool } from "../src/lib/db.ts";

try {
  const { rows } = await getPool().query<{ ready: boolean }>(
    "SELECT to_regnamespace($1) IS NOT NULL AS ready", ["app"],
  );
  if (!rows[0]?.ready) throw new Error("Missing application schema.");
  console.log("PostgreSQL is reachable and migrations are applied.");
} catch {
  console.error("Database check failed. Run npm run db:up and npm run db:migrate; check .env.local.");
  process.exitCode = 1;
} finally {
  await closePool();
}
