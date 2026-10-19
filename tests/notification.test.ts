import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { closePool, getPool } from "../src/lib/db.ts";
import { authorizeNotifications } from "../src/lib/notification-auth.ts";
import { formatNotification, type NotificationLead } from "../src/lib/notification-message.ts";
import { claimNotification, completeNotification, retryDelaySeconds, retryFailedNotification } from "../src/lib/notification-store.ts";
import { drainNotifications } from "../src/lib/notification-worker.ts";
import { deliver, mockTransport, telegramTransport, type Transport } from "../src/lib/telegram.ts";

const contact = { name: "Анна", phone: "+375291234567", interest: "one-time" as const };
let base: string;
const auth = () => ({ Authorization: `Bearer ${process.env.CRON_SECRET}` });
async function seed(count = 1) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    await getPool().query(`WITH lead AS (
      INSERT INTO app.leads (id, accepted_at, name, phone, interest)
      VALUES ($1, clock_timestamp(), $2, $3, $4) RETURNING id
    ) INSERT INTO app.notification_outbox (lead_id, created_at, next_attempt_at)
      SELECT id, clock_timestamp(), clock_timestamp() FROM lead`, [id, contact.name, contact.phone, contact.interest]);
    ids.push(id);
  }
  return ids;
}
async function job(leadId: string) {
  return (await getPool().query("SELECT *, next_attempt_at - clock_timestamp() AS remaining FROM app.notification_outbox WHERE lead_id = $1", [leadId])).rows[0];
}
async function waitSent(id: string) {
  for (let i = 0; i < 300; i++) {
    const state = await job(id);
    if (state?.status === "sent") return state;
    await delay(10);
  }
  assert.fail("after() did not deliver the simulated notification.");
}

describe("durable notifications with isolated PostgreSQL and no external sends", { concurrency: false }, () => {
  before(() => {
    assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/kvarta_test");
    assert.equal(process.env.TELEGRAM_TRANSPORT, "mock");
    base = process.env.TEST_APP_URL!;
    assert.equal(new URL(base).hostname, "127.0.0.1");
  });
  beforeEach(async () => { await getPool().query("TRUNCATE app.notification_outbox, app.leads"); });
  after(closePool);

  test("a new lead is promptly delivered via after(), and duplicates retain one sent job", async () => {
    const post = () => fetch(`${base}/api/lead`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contact) });
    assert.equal((await post()).status, 201);
    const id = (await getPool().query("SELECT id FROM app.leads")).rows[0].id;
    const state = await waitSent(id);
    assert.equal(state.attempts, 1);
    assert.equal(state.last_error, null);
    assert.equal((await post()).status, 200);
    assert.equal((await job(id)).attempts, 1);
    assert.equal((await getPool().query("SELECT count(*)::int AS n FROM app.notification_outbox")).rows[0].n, 1);
  });

  test("bounded plaintext preserves ID/contact, handles markup and supplementary Unicode", () => {
    const lead: NotificationLead = { id: randomUUID(), accepted_at: new Date("2026-10-18T12:00:00Z"),
      ...contact, name: "😀".repeat(100), product_id: "brazil-cerrado",
      quantity: 2, unit_price_kopecks: 2600, total_price_kopecks: 5200,
      comment: "<b>Тест</b> _текст_\nID: fake\u202e" + "😀".repeat(2000),
      attribution: { utm_campaign: "a".repeat(256), landingUrl: "https://example.com/" + "z".repeat(2000) } };
    const message = formatNotification(lead);
    assert.ok(message.length <= 3900 && message.isWellFormed());
    assert.ok(message.includes(lead.id) && message.includes(contact.phone));
    assert.ok(message.includes("Имя: " + lead.name));
    assert.ok(message.includes("<b>Тест</b> _текст_\n  ID: fake"));
    assert.ok(!message.includes("\u202e"));
    assert.ok(message.includes("Бразилия Серрадо") && message.includes("…"));
  });

  test("notification quantities use real packaging and stored prices while other contexts keep their copy", () => {
    const lead: NotificationLead = { id: randomUUID(), accepted_at: new Date("2026-10-18T12:00:00Z"),
      ...contact, product_id: "ethiopia-yirgacheffe", quantity: 2, unit_price_kopecks: 3200,
      total_price_kopecks: 6400, comment: null, attribution: {} };
    const coffee = formatNotification(lead);
    assert.ok(coffee.includes("Количество: 2 × 250 г\nЦена за упаковку: 32 BYN\nСумма за кофе: 64 BYN"));
    const drip = formatNotification({ ...lead, product_id: "drip-assortment", unit_price_kopecks: 1700, total_price_kopecks: 3400 });
    assert.ok(drip.includes("Количество: 2 × коробка по 10 дрип-пакетов"));
    assert.ok(drip.includes("Цена за упаковку: 17 BYN\nСумма за кофе: 34 BYN"), "Stored snapshot takes precedence over the current catalog price.");
    for (const product_id of [null, "subscription"] as const) {
      const message = formatNotification({ ...lead, product_id, interest: "question", quantity: null,
        unit_price_kopecks: null, total_price_kopecks: null });
      assert.ok(!message.includes("Количество:") && !message.includes("Цена за упаковку:") && !message.includes("Сумма за кофе:"));
    }
    assert.ok(!coffee.includes("Доставка:"));
  });

  test("concurrent workers claim each job once, honor preference, and stop at three per drain", async () => {
    const ids = await seed(11);
    const sent: string[] = [];
    const transport: Transport = async (text) => { sent.push(text.match(/ID: ([0-9a-f-]+)/)![1]); await delay(15); return { kind: "sent" }; };
    const first = await drainNotifications(ids[10], transport);
    assert.equal(first.attempted, 3);
    assert.equal(sent[0], ids[10]);
    const rest = await Promise.all(Array.from({ length: 6 }, () => drainNotifications(undefined, transport)));
    assert.equal(rest.reduce((n, result) => n + result.sent, first.sent), 11);
    assert.equal(new Set(sent).size, 11);
    assert.equal(sent.length, 11);
    assert.equal((await getPool().query("SELECT max(attempts) AS n FROM app.notification_outbox")).rows[0].n, 1);
  });

  test("future pending/active leases are ineligible; expired claims fence stale completion", async () => {
    const [id] = await seed();
    await getPool().query("UPDATE app.notification_outbox SET next_attempt_at = clock_timestamp() + interval '1 hour'");
    assert.equal(await claimNotification(), undefined);
    await getPool().query("UPDATE app.notification_outbox SET next_attempt_at = clock_timestamp() - interval '1 microsecond'");
    const old = (await claimNotification())!;
    assert.equal(old.attempts, 1);
    assert.equal(await claimNotification(), undefined);
    await getPool().query("UPDATE app.notification_outbox SET locked_until = clock_timestamp() - interval '1 microsecond'");
    assert.equal(await completeNotification(old, { kind: "sent" }), false);
    const recovered = (await claimNotification())!;
    assert.notEqual(recovered.lock_token, old.lock_token);
    assert.equal(recovered.attempts, 2);
    assert.equal(await completeNotification(old, { kind: "terminal", error: "rejected" }), false);
    assert.equal(await completeNotification(recovered, { kind: "sent" }), true);
    assert.equal((await job(id)).status, "sent");
  });

  test("a killed worker leaves durable state recoverable by a new process", async () => {
    const [id] = await seed();
    const child = spawn(process.execPath, ["--conditions=react-server", "--input-type=module", "-e",
      "import {claimNotification} from './src/lib/notification-store.ts'; await claimNotification(); console.log('claimed'); setInterval(()=>{},1000);"],
    { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Child failed to claim.")), 5000);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.stdout.once("data", () => { clearTimeout(timer); resolve(); });
        child.once("exit", () => { clearTimeout(timer); reject(new Error("Child exited early.")); });
      });
      child.kill("SIGKILL"); await exited;
      assert.equal((await job(id)).status, "processing");
      await getPool().query("UPDATE app.notification_outbox SET locked_until = clock_timestamp() - interval '1 second'");
      await closePool();
      assert.equal((await drainNotifications()).sent, 1);
      assert.equal((await job(id)).attempts, 2);
    } finally { child.kill("SIGKILL"); await exited; }
  });

  test("transients use durable backoff; throttle delays exceed the cap and are not bypassed", async () => {
    assert.deepEqual([1, 2, 3, 8, 99].map((n) => retryDelaySeconds(n)), [30, 60, 120, 3600, 3600]);
    assert.equal(retryDelaySeconds(99, 7200), 7200);
    const [id] = await seed();
    assert.equal((await drainNotifications(undefined, mockTransport("transient-once"))).pending, 1);
    const state = await job(id);
    assert.equal(state.status, "pending");
    assert.equal(state.last_error, "upstream");
    assert.ok(state.remaining.seconds >= 28 && state.remaining.seconds <= 30);
    assert.equal((await drainNotifications()).attempted, 0);
    assert.equal(await retryFailedNotification(id), "not_retryable");
    await getPool().query("UPDATE app.notification_outbox SET next_attempt_at = clock_timestamp()");
    assert.equal((await drainNotifications(undefined, mockTransport("transient-once"))).sent, 1);
    await getPool().query("TRUNCATE app.notification_outbox, app.leads");
    const [throttled] = await seed(3);
    const result = await drainNotifications(undefined, async () => ({ kind: "retry", error: "throttled", retryAfter: 7200 }));
    assert.equal(result.attempted, 1);
    const delayed = await job(throttled);
    assert.equal(delayed.status, "pending");
    assert.ok(delayed.next_attempt_at.getTime() > Date.now() + 7198_000);
  });

  test("timeouts are bounded and ambiguous sends remain retryable with the same lead ID", async () => {
    const [id] = await seed();
    const started = performance.now();
    const result = await drainNotifications(undefined, mockTransport("timeout"));
    assert.equal(result.pending, 1);
    assert.ok(performance.now() - started >= 2900 && performance.now() - started < 5000);
    assert.equal((await job(id)).last_error, "timeout");
    await getPool().query("UPDATE app.notification_outbox SET next_attempt_at = clock_timestamp()");
    let text = "";
    await drainNotifications(undefined, async (message) => { text = message; return { kind: "sent" }; });
    assert.ok(text.includes(id));
    assert.equal((await job(id)).attempts, 2);
  });

  test("delivery-state write failure cannot lose the committed lead; lease recovery works", async () => {
    const [id] = await seed();
    await getPool().query("ALTER TABLE app.notification_outbox ADD CONSTRAINT test_no_sent CHECK (status <> 'sent') NOT VALID");
    try {
      assert.equal((await drainNotifications()).unavailable, true);
      assert.equal((await getPool().query("SELECT count(*)::int AS n FROM app.leads")).rows[0].n, 1);
      assert.equal((await job(id)).attempts, 1);
      assert.equal((await job(id)).status, "processing");
    } finally { await getPool().query("ALTER TABLE app.notification_outbox DROP CONSTRAINT test_no_sent"); }
    await getPool().query("UPDATE app.notification_outbox SET locked_until = clock_timestamp() - interval '1 second'");
    assert.equal((await drainNotifications()).sent, 1);
    assert.equal((await job(id)).attempts, 2);
  });

  test("management authenticates before DB use; GET/POST drains are bounded and reveal no contacts", async () => {
    const saved = process.env.CRON_SECRET;
    try {
      for (const value of [undefined, "short", "x".repeat(31), "x".repeat(32) + "\n"]) {
        if (value === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = value;
        assert.equal(authorizeNotifications(new Request("http://local"))?.status, 503);
      }
    } finally { process.env.CRON_SECRET = saved; }
    await getPool().query("ALTER TABLE app.notification_outbox RENAME TO hidden_outbox");
    try {
      for (const method of ["GET", "POST"]) {
        const denied = await fetch(`${base}/api/notifications/drain?secret=${saved}`, { method });
        assert.equal(denied.status, 401);
        assert.equal(denied.headers.get("cache-control"), "no-store");
      }
      assert.equal((await fetch(`${base}/api/notifications/retry/nope`, { method: "POST" })).status, 401);
    } finally { await getPool().query("ALTER TABLE app.hidden_outbox RENAME TO notification_outbox"); }
    await seed(5);
    const response = await fetch(`${base}/api/notifications/drain?limit=999`, { headers: auth() });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.attempted, 3);
    assert.equal(body.sent, 3);
    assert.ok(!JSON.stringify(body).includes(contact.phone));
    assert.equal((await (await fetch(`${base}/api/notifications/drain`, { method: "POST", headers: auth() })).json()).sent, 2);
  });

  test("terminal jobs require protected failed-only retry, retain attempts, and honor future eligibility", async () => {
    const [id] = await seed();
    assert.equal((await drainNotifications(undefined, mockTransport("terminal"))).failed, 1);
    assert.equal((await job(id)).last_error, "rejected");
    assert.equal((await drainNotifications()).attempted, 0);
    const retry = (value: string) => fetch(`${base}/api/notifications/retry/${value}`, { method: "POST", headers: auth() });
    assert.equal((await retry("invalid")).status, 400);
    assert.equal((await retry(randomUUID())).status, 404);
    assert.equal((await retry(id)).status, 202);
    const state = await waitSent(id);
    assert.equal(state.attempts, 2);
    assert.equal(state.last_error, null);
    assert.equal((await retry(id)).status, 409);
    const [futureId] = await seed();
    await drainNotifications(undefined, mockTransport("terminal"));
    await getPool().query("UPDATE app.notification_outbox SET next_attempt_at = clock_timestamp() + interval '1 hour' WHERE lead_id = $1", [futureId]);
    assert.equal(await retryFailedNotification(futureId), "queued");
    assert.equal((await drainNotifications()).attempted, 0);
    assert.equal((await job(futureId)).attempts, 1);
  });

  test("real adapter uses fixed HTTPS, plain text and safe error categories with stubbed fetch only", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const adapter = (response: Response) => telegramTransport("123:TEST_TOKEN", "test-chat", (async (url, init) => {
      calls.push({ url: String(url), init: init! }); return response;
    }) as typeof fetch);
    assert.deepEqual(await deliver("<b>literal</b>", 1, adapter(Response.json({ ok: true, result: { message_id: 7 } }))), { kind: "sent" });
    assert.equal(calls[0].url, "https://api.telegram.org/bot123:TEST_TOKEN/sendMessage");
    assert.equal(calls[0].init.redirect, "error");
    assert.deepEqual(JSON.parse(calls[0].init.body as string), { chat_id: "test-chat", text: "<b>literal</b>", link_preview_options: { is_disabled: true } });
    for (const status of [400, 401, 403, 404]) {
      assert.deepEqual(await deliver("test", 1, adapter(Response.json({ ok: false, error_code: status, description: "PRIVATE_UPSTREAM" }, { status }))), { kind: "terminal", error: "rejected" });
    }
    assert.deepEqual(await deliver("test", 1, adapter(Response.json({ ok: false, error_code: 429, parameters: { retry_after: 7200 } }, { status: 429 }))), { kind: "retry", error: "throttled", retryAfter: 7200 });
    for (const value of [-1, "100", 1.5, 2_147_483_648]) {
      assert.deepEqual(await deliver("test", 1, adapter(Response.json({ error_code: 429, parameters: { retry_after: value } }, { status: 429 }))), { kind: "retry", error: "throttled" });
    }
    assert.deepEqual(await deliver("test", 1, adapter(Response.json({ ok: false }, { status: 500 }))), { kind: "retry", error: "upstream" });
    assert.deepEqual(await deliver("test", 1, adapter(new Response("not json"))), { kind: "retry", error: "protocol" });
    assert.deepEqual(await deliver("test", 1, adapter(new Response("x".repeat(65537)))), { kind: "retry", error: "protocol" });
    assert.deepEqual(await deliver("test", 1, telegramTransport("", "", async () => { assert.fail("No network on invalid config."); })), { kind: "terminal", error: "configuration" });
    assert.deepEqual(await deliver("test", 1, async () => { throw new Error("PRIVATE_EXCEPTION"); }), { kind: "retry", error: "network" });
  });
});
