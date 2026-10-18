import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";

export function migrate(databaseUrl: string, direction: "up" | "down") {
  return runner({
    databaseUrl,
    dir: fileURLToPath(new URL("../migrations", import.meta.url)),
    migrationsTable: "pgmigrations",
    migrationsSchema: "public",
    direction,
    count: direction === "down" ? 1 : Infinity,
    checkOrder: true,
    singleTransaction: true,
  });
}
