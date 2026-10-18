import "server-only";
import { randomUUID } from "node:crypto";
import { getPool } from "./db.ts";
import type { LeadInput } from "./lead-schema.ts";

export const phoneLockSql = "SELECT pg_advisory_xact_lock(hashtextextended('kvarta:lead:' || $1::text, 0))";

// One statement inserts both records or neither. The caller must hold the phone
// transaction lock. A text timestamp preserves PostgreSQL's sub-millisecond precision.
export const acceptLeadSql = `
  WITH accepted AS (
    INSERT INTO app.leads (id, accepted_at, name, phone, interest, comment, product_id, attribution)
    SELECT $1::uuid, $2::timestamptz, $3, $4, $5, $6, $7, $8::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM app.leads
      WHERE phone = $4 AND accepted_at > $2::timestamptz - interval '10 minutes'
    )
    RETURNING id
  ), notified AS (
    INSERT INTO app.notification_outbox (lead_id, created_at, next_attempt_at)
    SELECT id, $2::timestamptz, $2::timestamptz FROM accepted
  )
  SELECT id FROM accepted
`;

export async function saveLead(input: LeadInput): Promise<{ status: "saved" | "duplicate"; leadId?: string }> {
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
      input.comment ?? null, input.productId ?? null, JSON.stringify(input.attribution),
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
