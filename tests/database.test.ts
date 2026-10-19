import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
    assert.equal((await migrate(url, "up")).length, 3);
    assert.equal((await migrate(url, "up")).length, 0);

    const pool = getPool();
    const input = "a'; DROP SCHEMA app; --";
    assert.equal((await pool.query("SELECT $1::text AS value", [input])).rows[0].value, input);
    assert.equal((await pool.query("SELECT to_regnamespace('app') IS NOT NULL AS ready")).rows[0].ready, true);

    // Seed the old schema to verify enrichment of real legacy records and jobs.
    assert.equal((await migrate(url, "down")).length, 1);
    const legacyProducts = ["ethiopia-yirgacheffe", "colombia-huila", "brazil-cerrado", "drip-assortment", "subscription", null];
    for (const productId of legacyProducts) {
      await pool.query(`WITH lead AS (
        INSERT INTO app.leads (id, accepted_at, name, phone, interest, product_id)
        VALUES ($1, clock_timestamp(), 'Анна', '+375291234567', $2, $3) RETURNING id
      ) INSERT INTO app.notification_outbox (lead_id, created_at, next_attempt_at)
        SELECT id, clock_timestamp(), clock_timestamp() FROM lead`,
      [randomUUID(), productId === "subscription" ? "subscription" : "one-time", productId]);
    }
    const legacyLeads = (await pool.query("SELECT * FROM app.leads ORDER BY id")).rows;
    const legacyJobs = (await pool.query("SELECT * FROM app.notification_outbox ORDER BY id")).rows;
    assert.equal((await migrate(url, "up")).length, 1);
    const snapshots = (await pool.query(`SELECT product_id, quantity, unit_price_kopecks, total_price_kopecks
      FROM app.leads ORDER BY product_id NULLS LAST`)).rows;
    assert.deepEqual(snapshots, [
      { product_id: "brazil-cerrado", quantity: 1, unit_price_kopecks: 2600, total_price_kopecks: 2600 },
      { product_id: "colombia-huila", quantity: 1, unit_price_kopecks: 2900, total_price_kopecks: 2900 },
      { product_id: "drip-assortment", quantity: 1, unit_price_kopecks: 1800, total_price_kopecks: 1800 },
      { product_id: "ethiopia-yirgacheffe", quantity: 1, unit_price_kopecks: 3200, total_price_kopecks: 3200 },
      { product_id: "subscription", quantity: null, unit_price_kopecks: null, total_price_kopecks: null },
      { product_id: null, quantity: null, unit_price_kopecks: null, total_price_kopecks: null },
    ]);
    assert.equal((await migrate(url, "down")).length, 1);
    assert.deepEqual((await pool.query("SELECT * FROM app.leads ORDER BY id")).rows, legacyLeads);
    assert.deepEqual((await pool.query("SELECT * FROM app.notification_outbox ORDER BY id")).rows, legacyJobs);

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
    assert.equal((await migrate(url, "up")).length, 3);
  } finally {
    await closePool();
  }
});
