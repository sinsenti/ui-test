import assert from "node:assert/strict";
import { test } from "node:test";
import { closePool, getPool } from "../src/lib/db.ts";
import { migrate } from "../scripts/migrations.ts";

test("SQL migrations apply once, roll back safely, and support the application pool", async () => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "Run through npm run test:db for an isolated database.");
  const target = new URL(url);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/kvarta_test");

  try {
    assert.equal((await migrate(url, "up")).length, 2);
    assert.equal((await migrate(url, "up")).length, 0);

    const pool = getPool();
    const input = "a'; DROP SCHEMA app; --";
    assert.equal((await pool.query("SELECT $1::text AS value", [input])).rows[0].value, input);
    assert.equal((await pool.query("SELECT to_regnamespace('app') IS NOT NULL AS ready")).rows[0].ready, true);

    // Roll back the business migration before checking the original schema guard.
    assert.equal((await migrate(url, "down")).length, 1);
    assert.equal((await pool.query("SELECT to_regclass('app.leads') IS NULL AS absent")).rows[0].absent, true);
    assert.equal((await pool.query("SELECT to_regclass('app.notification_outbox') IS NULL AS absent")).rows[0].absent, true);

    // A down migration must refuse to discard unexpected objects.
    await pool.query("CREATE TABLE app.rollback_guard (id integer)");
    await assert.rejects(migrate(url, "down"));
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM public.pgmigrations")).rows[0].count, 1);
    await pool.query("DROP TABLE app.rollback_guard");

    assert.equal((await migrate(url, "down")).length, 1);
    assert.equal((await pool.query("SELECT to_regnamespace('app') IS NULL AS absent")).rows[0].absent, true);
    assert.equal((await migrate(url, "up")).length, 2);
  } finally {
    await closePool();
  }
});
