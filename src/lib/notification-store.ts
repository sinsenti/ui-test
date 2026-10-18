import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool } from "./db.ts";
import type { NotificationLead } from "./notification-message.ts";
import type { DeliveryResult } from "./telegram.ts";

export type Claim = NotificationLead & { job_id: string; lock_token: string; attempts: number };
export const leaseSeconds = 30;

// Short transactions; never hold a connection or row lock while sending.
async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '2s'");
    await client.query("SET LOCAL lock_timeout = '1s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { discard = true; }
    throw error;
  } finally { client.release(discard); }
}

export async function claimNotification(preferredLeadId?: string): Promise<Claim | undefined> {
  return transaction(async (client) => {
    const result = await client.query<Claim>(`
      WITH candidate AS (
        SELECT id FROM app.notification_outbox
        WHERE (status = 'pending' AND next_attempt_at <= clock_timestamp())
           OR (status = 'processing' AND locked_until <= clock_timestamp())
        ORDER BY (lead_id = $1::uuid) DESC NULLS LAST, created_at, id
        FOR UPDATE SKIP LOCKED LIMIT 1
      ), claimed AS (
        UPDATE app.notification_outbox o SET status = 'processing', attempts = attempts + 1,
          locked_until = clock_timestamp() + make_interval(secs => $3), lock_token = $2::uuid
        FROM candidate c WHERE o.id = c.id
        RETURNING o.id AS job_id, o.lead_id, o.lock_token, o.attempts
      ) SELECT l.*, c.job_id, c.lock_token, c.attempts FROM claimed c JOIN app.leads l ON l.id = c.lead_id
    `, [preferredLeadId ?? null, randomUUID(), leaseSeconds]);
    return result.rows[0];
  });
}

export function retryDelaySeconds(attempt: number, retryAfter = 0): number {
  return Math.max(Math.min(3600, 30 * 2 ** Math.min(Math.max(attempt - 1, 0), 7)), retryAfter);
}

export async function completeNotification(claim: Claim, result: DeliveryResult): Promise<boolean> {
  return transaction(async (client) => {
    const status = result.kind === "sent" ? "sent" : result.kind === "terminal" ? "failed" : "pending";
    const delay = result.kind === "retry" ? retryDelaySeconds(claim.attempts, result.retryAfter) : 0;
    const updated = await client.query(`UPDATE app.notification_outbox
      SET status = $3, lock_token = NULL, locked_until = NULL,
          sent_at = CASE WHEN $3 = 'sent' THEN clock_timestamp() ELSE NULL END,
          next_attempt_at = CASE WHEN $3 = 'pending' THEN clock_timestamp() + make_interval(secs => $4) ELSE next_attempt_at END,
          last_error = $5
      WHERE id = $1 AND lock_token = $2 AND status = 'processing' AND locked_until > clock_timestamp()`,
    [claim.job_id, claim.lock_token, status, delay, result.kind === "sent" ? null : result.error]);
    return updated.rowCount === 1;
  });
}

export async function retryFailedNotification(leadId: string): Promise<"queued" | "missing" | "not_retryable"> {
  return transaction(async (client) => {
    const result = await client.query(`WITH retried AS (
      UPDATE app.notification_outbox
      SET status = 'pending', next_attempt_at = GREATEST(next_attempt_at, clock_timestamp()), last_error = NULL
      WHERE lead_id = $1 AND status = 'failed' RETURNING id
    ) SELECT EXISTS(SELECT 1 FROM retried) AS queued,
      EXISTS(SELECT 1 FROM app.notification_outbox WHERE lead_id = $1) AS present`, [leadId]);
    return result.rows[0].queued ? "queued" : result.rows[0].present ? "not_retryable" : "missing";
  });
}
