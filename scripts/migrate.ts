import "./env.ts";
import { migrate } from "./migrations.ts";

try {
  const direction = process.argv[2];
  if (direction !== "up" && direction !== "down") throw new Error("Use up or down.");
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL_DIRECT or DATABASE_URL in .env.local.");
  const applied = await migrate(url, direction);
  console.log(`${applied.length} migration(s) ${direction === "up" ? "applied" : "reverted"}.`);
} catch (error) {
  // Avoid printing a connection string or credentials from a driver error.
  console.error("Migration failed. Check database availability and migration SQL.");
  if (error instanceof Error && !process.env.DATABASE_URL) console.error("Configure .env.local from .env.example.");
  process.exitCode = 1;
}
