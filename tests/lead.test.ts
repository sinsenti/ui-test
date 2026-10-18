import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { migrate } from "../scripts/migrations.ts";
import { closePool, getPool } from "../src/lib/db.ts";
import { leadSchema } from "../src/lib/lead-schema.ts";
import { acceptLeadSql, phoneLockSql } from "../src/lib/lead-store.ts";

const sample = { name: "Анна", phone: "+375291234567", interest: "one-time" };
let base: string;

async function post(input: unknown = sample) {
  const response = await fetch(`${base}/api/lead`, {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(input), signal: AbortSignal.timeout(20_000),
  });
  if (response.ok) {
    // Observe after() finishing before assertions or the next test's TRUNCATE.
    for (let attempt = 0; attempt < 300; attempt++) {
      const { rows: [state] } = await getPool().query("SELECT count(*)::int AS active FROM app.notification_outbox WHERE status IN ('pending', 'processing')");
      if (state.active === 0) return response;
      await delay(10);
    }
    assert.fail("Mock delivery did not settle.");
  }
  return response;
}

async function counts() {
  const { rows } = await getPool().query(`SELECT
    (SELECT count(*)::int FROM app.leads) AS leads,
    (SELECT count(*)::int FROM app.notification_outbox) AS jobs`);
  return rows[0];
}

describe("lead intake through a real Next.js HTTP server and PostgreSQL", { concurrency: false }, () => {
  before(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    assert.ok(databaseUrl && process.env.TEST_APP_URL, "Use npm run test:db for isolated services.");
    const target = new URL(databaseUrl);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/kvarta_test");
    base = process.env.TEST_APP_URL;
    assert.equal(new URL(base).hostname, "127.0.0.1");
    await migrate(databaseUrl, "up");
  });
  beforeEach(async () => { await getPool().query("TRUNCATE app.leads CASCADE"); });
  after(closePool);

  test("persists normalized contacts, context, attribution and one delivered job", async () => {
    const attribution = {
      utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "Осенний кофе",
      utm_content: "bag-a", utm_term: "зерно", utm_id: "campaign-1",
      yclid: "test-yandex", gclid: "test-google", fbclid: "test-meta",
      landingUrl: "https://kvarta.example/?utm_source=instagram", referrer: "https://example.com/ad",
    };
    const response = await post({ ...sample, name: "  Анна  ", phone: "+375 (29) 123-45-67",
      comment: "  Подскажите помол\nдля фильтра.  ", productId: "brazil-cerrado", attribution });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { ok: true, status: "saved",
      message: "Спасибо! Заявка сохранена. Мы вам перезвоним." });
    const { rows: [lead] } = await getPool().query("SELECT * FROM app.leads");
    assert.equal(lead.name, "Анна");
    assert.equal(lead.phone, sample.phone);
    assert.equal(lead.comment, "Подскажите помол\nдля фильтра.");
    assert.equal(lead.product_id, "brazil-cerrado");
    assert.deepEqual(lead.attribution, attribution);
    assert.match(lead.id, /^[0-9a-f-]{36}$/);
    const { rows: [job] } = await getPool().query("SELECT * FROM app.notification_outbox");
    assert.equal(job.lead_id, lead.id);
    assert.equal(job.status, "sent");
    assert.equal(job.attempts, 1);
    for (const key of ["lock_token", "locked_until", "last_error"]) assert.equal(job[key], null);
    assert.ok(job.sent_at >= job.created_at);
    assert.equal(job.created_at.getTime(), lead.accepted_at.getTime());
    assert.equal(job.next_attempt_at.getTime(), lead.accepted_at.getTime());
    await closePool();
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("acknowledges formatting variants without changing accepted time or content", async () => {
    assert.equal((await post()).status, 201);
    const before = (await getPool().query("SELECT accepted_at::text, name FROM app.leads")).rows[0];
    for (const phone of ["+375 (29) 123-45-67", "8 (029) 123-45-67", "0291234567"]) {
      const response = await post({ ...sample, name: "Другое имя", phone });
      assert.equal(response.status, 200, phone);
      assert.deepEqual(await response.json(), { ok: true, status: "duplicate",
        message: "Заявка с этим номером уже получена. Мы вам перезвоним." });
    }
    assert.deepEqual((await getPool().query("SELECT accepted_at::text, name FROM app.leads")).rows[0], before);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("concurrent formatting variants create one lead/job; different phones remain independent", async () => {
    const formats = [sample.phone, "+375 (29) 123-45-67", "8 (029) 123-45-67"];
    const responses = await Promise.all(Array.from({ length: 18 }, (_, i) => post({ ...sample, phone: formats[i % 3] })));
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.status === 200).length, 17);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
    const others = await Promise.all(["+375291234568", "+375291234569"].map((phone) => post({ ...sample, phone })));
    assert.deepEqual(others.map((response) => response.status), [201, 201]);
    assert.deepEqual(await counts(), { leads: 3, jobs: 3 });
  });

  test("validates types, bounds, phone country/extensions, product compatibility and attribution", async () => {
    const invalid: unknown[] = [
      null, [], {}, { ...sample, extra: "PRIVATE_UNKNOWN_KEY" },
      { ...sample, name: " " }, { ...sample, name: 123 }, { ...sample, name: "а".repeat(101) },
      { ...sample, name: "Анна\u0000" }, { ...sample, name: "Анна\n" },
      { ...sample, phone: "+12025550123" }, { ...sample, phone: "+375111111111" },
      { ...sample, phone: "call +375291234567 please" }, { ...sample, phone: "+375291234567 ext 2" },
      { ...sample, phone: 375291234567 }, { ...sample, phone: "1".repeat(65) },
      { ...sample, interest: "payment" }, { ...sample, comment: "а".repeat(2001) },
      { ...sample, comment: "text\u0000" }, { ...sample, productId: "invented" },
      { ...sample, productId: "subscription" }, { ...sample, interest: "subscription", productId: "brazil-cerrado" },
      { ...sample, attribution: null }, { ...sample, attribution: [] },
      { ...sample, attribution: { extra: "PRIVATE_UNKNOWN_KEY" } },
      { ...sample, attribution: { utm_source: "а".repeat(257) } },
      { ...sample, attribution: { yclid: "a".repeat(513) } },
      { ...sample, attribution: { landingUrl: "javascript:alert(1)" } },
      { ...sample, attribution: { landingUrl: "/relative" } },
      { ...sample, attribution: { referrer: "https://user:password@example.com" } },
      { ...sample, attribution: { utm_source: "source\n" } },
    ];
    for (const input of invalid) {
      const response = await post(input);
      assert.equal(response.status, 400, JSON.stringify(input));
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json();
      assert.equal(body.status, "invalid");
      assert.ok(Object.keys(body.fieldErrors).length);
      assert.ok(!JSON.stringify(body).includes("PRIVATE_UNKNOWN_KEY"));
    }
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
  });

  test("allows maximum field lengths, blank optional values, subscription and product questions", async () => {
    const response = await post({ ...sample, name: "Я".repeat(100), comment: "к".repeat(2000),
      interest: "subscription", productId: "subscription", attribution: { utm_source: "a".repeat(256), yclid: "b".repeat(512) } });
    assert.equal(response.status, 201);
    assert.equal((await post({ ...sample, phone: "+375291234568", interest: "question",
      productId: "subscription", comment: "  ", attribution: { referrer: "", utm_source: " " } })).status, 201);
    const blank = (await getPool().query("SELECT comment, attribution FROM app.leads WHERE phone = $1", ["+375291234568"])).rows[0];
    assert.deepEqual(blank, { comment: null, attribution: {} });
    assert.equal((await post({ ...sample, phone: "+375291234569", interest: "question", productId: "drip-assortment" })).status, 201);
  });

  test("rejects malformed JSON/media/oversized chunked and UTF-8 bodies before writing", async () => {
    for (const body of ["{", "", "undefined"]) {
      const response = await fetch(`${base}/api/lead`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, "invalid_json");
    }
    const wrongType = await fetch(`${base}/api/lead`, { method: "POST", body: JSON.stringify(sample) });
    assert.equal(wrongType.status, 415);
    const bytes = new TextEncoder().encode(JSON.stringify({ ...sample, comment: "я".repeat(9000) }));
    const stream = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(bytes.slice(0, 100)); controller.enqueue(bytes.slice(100)); controller.close();
    } });
    const init: RequestInit & { duplex: "half" } = {
      method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half",
    };
    const oversized = await fetch(`${base}/api/lead`, init);
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, "body_too_large");
    const invalidUtf8 = await fetch(`${base}/api/lead`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: new Uint8Array([0xff]),
    });
    assert.equal(invalidUtf8.status, 400);
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    assert.equal((await fetch(`${base}/api/lead`)).status, 405);
  });

  test("the actual acceptance SQL rejects one microsecond inside the window and accepts exactly ten minutes", async () => {
    assert.equal((await post()).status, 201);
    const client = await getPool().connect();
    const time = "2026-10-18 12:00:00.123456+00";
    const values = [randomUUID(), time, sample.name, sample.phone, sample.interest, null, null, "{}"];
    try {
      await client.query("BEGIN");
      await client.query(phoneLockSql, [sample.phone]);
      await client.query("UPDATE app.leads SET accepted_at = $1::timestamptz - interval '10 minutes' + interval '1 microsecond'", [time]);
      assert.equal((await client.query(acceptLeadSql, values)).rowCount, 0);
      await client.query("UPDATE app.leads SET accepted_at = $1::timestamptz - interval '10 minutes'", [time]);
      assert.equal((await client.query(acceptLeadSql, values)).rowCount, 1);
      await client.query("COMMIT");
    } finally { await client.query("ROLLBACK"); client.release(); }
    assert.deepEqual(await counts(), { leads: 2, jobs: 2 });
  });

  test("an aged lead is accepted again over HTTP", async () => {
    assert.equal((await post()).status, 201);
    await getPool().query("UPDATE app.leads SET accepted_at = clock_timestamp() - interval '10 minutes'");
    assert.equal((await post()).status, 201);
    assert.deepEqual(await counts(), { leads: 2, jobs: 2 });
  });

  test("samples database time after waiting on the phone lock", async () => {
    assert.equal((await post()).status, 201);
    const locker = await getPool().connect();
    let pending: Promise<Response> | undefined;
    try {
      await locker.query("BEGIN");
      await locker.query(phoneLockSql, [sample.phone]);
      await locker.query("UPDATE app.leads SET accepted_at = clock_timestamp() - interval '9 minutes 59 seconds'");
      pending = post();
      let waiting = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        waiting = (await getPool().query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event = 'advisory' AND pid <> pg_backend_pid()) AS waiting")).rows[0].waiting;
        if (waiting) break;
        await delay(10);
      }
      assert.ok(waiting, "HTTP request must wait for the test's advisory lock.");
      await delay(1100);
      await locker.query("COMMIT");
      assert.equal((await pending).status, 201);
      assert.deepEqual(await counts(), { leads: 2, jobs: 2 });
    } finally {
      await locker.query("ROLLBACK"); locker.release();
      await pending?.catch(() => undefined);
    }
  });

  test("outbox insertion failure rolls back the lead and permits a successful retry", async () => {
    await getPool().query("ALTER TABLE app.notification_outbox ADD CONSTRAINT test_reject CHECK (false) NOT VALID");
    try {
      const response = await post();
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { ok: false, status: "error", code: "temporarily_unavailable",
        message: "Не удалось сохранить заявку. Попробуйте ещё раз." });
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { await getPool().query("ALTER TABLE app.notification_outbox DROP CONSTRAINT test_reject"); }
    assert.equal((await post()).status, 201);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("a database query failure returns a recoverable response without internal details", async () => {
    await getPool().query("ALTER TABLE app.leads RENAME TO temporarily_missing_leads");
    try {
      const response = await post();
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.text();
      assert.ok(body.includes("temporarily_unavailable"));
      assert.ok(!body.includes("app.leads") && !body.includes(sample.phone));
    } finally { await getPool().query("ALTER TABLE app.temporarily_missing_leads RENAME TO leads"); }
  });

  test("database constraints independently reject invalid shapes and duplicate outbox jobs", async () => {
    const parsed = leadSchema.parse(sample);
    assert.equal(parsed.phone, sample.phone);
    assert.equal((await post()).status, 201);
    const { rows: [lead] } = await getPool().query("SELECT id FROM app.leads");
    await assert.rejects(getPool().query("INSERT INTO app.notification_outbox (lead_id, created_at, next_attempt_at) VALUES ($1, clock_timestamp(), clock_timestamp())", [lead.id]));
    await assert.rejects(getPool().query("UPDATE app.leads SET phone = '+12025550123'"));
    await assert.rejects(getPool().query("UPDATE app.leads SET product_id = 'subscription'"));
    await assert.rejects(getPool().query("UPDATE app.leads SET attribution = '[]'::jsonb"));
    await assert.rejects(getPool().query("UPDATE app.notification_outbox SET status = 'processing'"));
    await assert.rejects(getPool().query("UPDATE app.notification_outbox SET status = 'sent', sent_at = NULL"));
  });
});
