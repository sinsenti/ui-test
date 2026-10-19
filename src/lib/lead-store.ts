import "server-only";
import { randomUUID } from "node:crypto";
import { getPool } from "./db.ts";
import type { LeadInput } from "./lead-schema.ts";
import { getProduct } from "./catalog.ts";

export const phoneLockSql = "SELECT pg_advisory_xact_lock(hashtextextended('kvarta:lead:' || $1::text, 0))";

// One statement inserts the lead, its items and outbox job or none. The caller must hold the phone
// transaction lock. A text timestamp preserves PostgreSQL's sub-millisecond precision.
export const acceptLeadSql = `
  WITH accepted AS (
    INSERT INTO app.leads (id, accepted_at, name, phone, interest, comment, product_id, attribution,
      quantity, unit_price_kopecks)
    SELECT $1::uuid, $2::timestamptz, $3, $4, $5, $6, $7, $8::jsonb, $9::smallint, $10::integer
    WHERE NOT EXISTS (
      SELECT 1 FROM app.leads
      WHERE phone = $4 AND accepted_at > $2::timestamptz - interval '10 minutes'
    )
    RETURNING id
  ), saved_items AS (
    INSERT INTO app.lead_items (lead_id, product_id, quantity, unit_price_kopecks)
    SELECT a.id, i.product_id, i.quantity, i.unit_price_kopecks FROM accepted a
    CROSS JOIN jsonb_to_recordset($11::jsonb) AS i(product_id text, quantity smallint, unit_price_kopecks integer)
  ), notified AS (
    INSERT INTO app.notification_outbox (lead_id, created_at, next_attempt_at)
    SELECT id, $2::timestamptz, $2::timestamptz FROM accepted
  )
  SELECT id FROM accepted
`;

export async function saveLead(input: LeadInput): Promise<{ status: "saved" | "duplicate"; leadId?: string }> {
  const items = (input.items ?? []).map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    unit_price_kopecks: Math.round(getProduct(item.productId)!.price * 100),
  }));
  // Retain the legacy columns as a singleton projection; they are not multi-item totals.
  const singleton = items.length === 1 ? items[0] : undefined;
  const productId = singleton?.product_id ?? (input.productId === "subscription" ? "subscription" : null);
  const client = await getPool().connect();
  let discardConnection = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '10s'");
    await client.query(phoneLockSql, [input.phone]);
    // Separate statement AFTER waiting for the lock, not transaction-start now().
    const { rows } = await client.query<{ time: string }>("SELECT clock_timestamp()::text AS time");
    const result = await client.query(acceptLeadSql, [
      randomUUID(), rows[0].time, input.name, input.phone, input.interest,
      input.comment ?? null, productId, JSON.stringify(input.attribution),
      singleton?.quantity ?? null, singleton?.unit_price_kopecks ?? null, JSON.stringify(items),
    ]);
    await client.query("COMMIT");
    return result.rowCount === 1 ? { status: "saved", leadId: result.rows[0].id } : { status: "duplicate" };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { discardConnection = true; }
    throw error;
  } finally {
    client.release(discardConnection);
  }
}
