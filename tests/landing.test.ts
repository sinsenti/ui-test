import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, type Browser, type BrowserContext, type Page, type Route } from "@playwright/test";
import { closePool, getPool } from "../src/lib/db.ts";

let browser: Browser;
let context: BrowserContext;
let page: Page;
let base: string;
const saved = "Спасибо! Заявка у нас. Перезвоним и поможем с выбором.";
const duplicate = "Мы уже получили заявку с этим номером. Перезвоним вам.";
const recoverable = "Не удалось подтвердить отправку. Ваши данные остались в форме — попробуйте ещё раз.";
const form = () => page.getByRole("form", { name: "Заявка на обратный звонок" });
const submit = () => form().getByRole("button", { name: "Оставить заявку", exact: true });
const feedback = () => page.locator("#form-feedback");
const card = (name: string) => page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
const summary = () => form().getByRole("group", { name: "Ваш выбор", exact: true });
const selectedItems = () => summary().getByRole("list", { name: "Выбранный кофе", exact: true }).getByRole("listitem");
const catalogSummary = () => page.getByRole("region", { name: "Выбранный кофе", exact: true });
const products = [
  ["ethiopia-yirgacheffe", "Эфиопия Иргачеффе"], ["colombia-huila", "Колумбия Уила"],
  ["brazil-cerrado", "Бразилия Серрадо"], ["drip-assortment", "Дрип-пакеты, ассорти"],
] as const;

async function savedItems(leadId: string) {
  return (await getPool().query(`SELECT product_id, quantity, unit_price_kopecks, total_price_kopecks
    FROM app.lead_items WHERE lead_id = $1 ORDER BY product_id`, [leadId])).rows;
}

async function counts() {
  return (await getPool().query(`SELECT
    (SELECT count(*)::int FROM app.leads) AS leads,
    (SELECT count(*)::int FROM app.notification_outbox) AS jobs`)).rows[0];
}
async function settled() {
  for (let attempt = 0; attempt < 300; attempt++) {
    const active = (await getPool().query("SELECT count(*)::int AS n FROM app.notification_outbox WHERE status IN ('pending', 'processing')")).rows[0].n;
    if (active === 0) return;
    await delay(10);
  }
  assert.fail("The offline notification delivery did not settle.");
}
async function fill(phone = "+375 (29) 123-45-67", name = "Браузерная проверка") {
  await page.getByLabel("Имя", { exact: true }).fill(name);
  await page.getByLabel("Телефон", { exact: true }).fill(phone);
}
async function send(status: number, message?: string) {
  const response = page.waitForResponse((candidate) => candidate.url() === `${base}/api/lead` && candidate.request().method() === "POST");
  await submit().click();
  assert.equal((await response).status(), status);
  if (message) await expect(feedback()).toHaveText(message);
  await settled();
}
async function oneDelivered(phone: string) {
  const lead = (await getPool().query("SELECT * FROM app.leads WHERE phone = $1", [phone])).rows[0];
  assert.ok(lead, `Expected a persisted synthetic lead for ${phone}`);
  const jobs = (await getPool().query("SELECT * FROM app.notification_outbox WHERE lead_id = $1", [lead.id])).rows;
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, "sent");
  assert.equal(jobs[0].attempts, 1);
  return lead;
}

describe("responsive landing and real browser callback flow with isolated PostgreSQL", { concurrency: false }, () => {
  before(async () => {
    assert.ok(process.env.DATABASE_URL && process.env.TEST_APP_URL, "Use npm run test:db for isolated services.");
    const target = new URL(process.env.DATABASE_URL);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/kvarta_test");
    assert.equal(process.env.TELEGRAM_TRANSPORT, "mock");
    base = process.env.TEST_APP_URL;
    assert.equal(new URL(base).hostname, "127.0.0.1");
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  });
  beforeEach(async () => {
    await getPool().query("TRUNCATE app.notification_outbox, app.lead_items, app.leads");
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    // No font, image, page or script may depend on an external host.
    await context.route("**/*", (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort("blockedbyclient"));
    page = await context.newPage();
    page.setDefaultTimeout(8_000);
    page.setDefaultNavigationTimeout(45_000);
  });
  afterEach(async () => { await context?.close(); await settled(); });
  after(async () => { await browser?.close(); await closePool(); });

  test("keyboard submission persists normalized data and a formatted retry receives duplicate acknowledgement", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Бразилия Серрадо", exact: true }).focus();
    await page.keyboard.press("Enter");
    const selected = page.getByRole("button", { name: "Выбрано Бразилия Серрадо", exact: true });
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toBeFocused();
    await card("Бразилия Серрадо").getByRole("button", { name: "Увеличить количество: Бразилия Серрадо", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(summary()).toContainText("2 × 250 г");
    await card("Бразилия Серрадо").getByRole("button", { name: "Перейти к заявке", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Имя", { exact: true })).toBeFocused();
    await page.keyboard.type("Анна");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Телефон", { exact: true })).toBeFocused();
    await page.keyboard.type("8 (029) 123-45-67");
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Подскажите помол\nдля фильтра.");
    const response = page.waitForResponse(`${base}/api/lead`);
    await submit().focus();
    await page.keyboard.press("Enter");
    assert.equal((await response).status(), 201);
    await expect(feedback()).toHaveText(saved);
    await expect(feedback()).toHaveAttribute("role", "status");
    await expect(feedback()).toHaveAttribute("aria-live", "polite");
    await settled();
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.name, "Анна");
    assert.equal(lead.interest, "one-time");
    assert.equal(lead.product_id, "brazil-cerrado");
    assert.equal(lead.quantity, 2);
    assert.equal(lead.unit_price_kopecks, 2600);
    assert.equal(lead.total_price_kopecks, 5200);
    assert.equal(lead.comment, "Подскажите помол\nдля фильтра.");
    assert.deepEqual(lead.attribution, { landingUrl: `${base}/` });
    await page.getByLabel("Телефон", { exact: true }).fill("+375 29 123 45 67");
    await send(200, duplicate);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
    assert.equal((await oneDelivered("+375291234567")).id, lead.id);
  });

  test("empty, foreign and invalid Belarusian phones announce errors, retain values and focus the invalid field", async () => {
    await page.goto(base);
    let requests = 0;
    page.on("request", (request) => { if (request.url() === `${base}/api/lead` && request.method() === "POST") requests++; });
    await submit().click();
    await expect(page.getByLabel("Имя", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Имя", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#name-error")).toHaveText("Подскажите, как к вам обращаться.");
    assert.equal(requests, 0);
    await fill("+1 202 555 0123", "Анна");
    for (const [phone, display] of [["+1 202 555 0123", "+1 202 555 0123"], ["+375111111111", "+375 11 111-11-11"]]) {
      await page.getByLabel("Телефон", { exact: true }).fill(phone);
      await send(400);
      await expect(page.getByLabel("Телефон", { exact: true })).toBeFocused();
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#phone-error")).toHaveText("Укажите действующий белорусский номер.");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveAttribute("aria-describedby", /phone-help.*phone-error/);
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue(display);
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Анна");
    }
    assert.equal(requests, 2);
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), []);
  });

  test("phone typing and native paste show readable grouping while keeping telephone and autocomplete semantics", async () => {
    await page.goto(base);
    const phone = page.getByLabel("Телефон", { exact: true });
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("inputmode", "tel");
    await expect(phone).toHaveAttribute("autocomplete", "tel");
    await expect(phone).toHaveAttribute("maxlength", "64");
    await expect(phone).toHaveAttribute("aria-describedby", "phone-help");
    await expect(phone).toHaveAttribute("placeholder", "+375 29 123-45-67");
    await phone.pressSequentially("+37529");
    await expect(phone).toHaveValue("+375 29");
    await phone.pressSequentially("123");
    await expect(phone).toHaveValue("+375 29 123");
    await phone.pressSequentially("4567");
    await expect(phone).toHaveValue("+375 29 123-45-67");
    await phone.press("ControlOrMeta+a");
    await phone.press("Backspace");
    await expect(phone).toHaveValue("");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(() => navigator.clipboard.writeText("+375291234567"));
    await phone.press("ControlOrMeta+v");
    await expect(phone).toHaveValue("+375 29 123-45-67");
    await expect.poll(() => phone.evaluate((element) => (element as HTMLInputElement).selectionStart)).toBe(17);
    await page.getByLabel("Имя", { exact: true }).fill("Проверка вставки");
    await send(201, saved);
    await oneDelivered("+375291234567");
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("whole-value phone fills preserve supported prefixes and normalize to one saved phone and duplicate key", async () => {
    await page.goto(base);
    await page.getByLabel("Имя", { exact: true }).fill("Проверка автозаполнения");
    const phone = page.getByLabel("Телефон", { exact: true });
    const variants = [
      ["+375291234567", "+375 29 123-45-67"],
      ["375291234567", "375 29 123-45-67"],
      ["8 (029) 123-45-67", "8 029 123-45-67"],
      ["80291234567", "8 029 123-45-67"],
      ["0291234567", "029 123-45-67"],
      ["291234567", "29 123-45-67"],
      ["810375291234567", "810375 29 123-45-67"],
    ];
    let leadId: string | undefined;
    for (const [index, [input, display]] of variants.entries()) {
      // A complete value arriving in one input event also covers the shape of
      // browser/keyboard autocomplete without relying on a saved OS contact.
      await phone.fill(input);
      await expect(phone).toHaveValue(display);
      assert.equal((await phone.inputValue()).replace(/[^0-9]/g, ""), input.replace(/[^0-9]/g, ""));
      await send(index === 0 ? 201 : 200, index === 0 ? saved : duplicate);
      const lead = await oneDelivered("+375291234567");
      leadId ??= lead.id;
      assert.equal(lead.id, leadId);
      assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
    }
  });

  test("phone edits keep insertion, replacement, cut and collapsed separator deletion beside the intended digits", async () => {
    await page.goto(base);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const phone = page.getByLabel("Телефон", { exact: true });
    async function select(start: number, end = start) {
      await phone.focus();
      await phone.evaluate((element, range) => (element as HTMLInputElement).setSelectionRange(range.start, range.end), { start, end });
    }
    await phone.fill("+37529124567");
    await expect(phone).toHaveValue("+375 29 124-56-7");
    await select(10);
    await phone.pressSequentially("3");
    await expect(phone).toHaveValue("+375 29 123-45-67");
    assert.equal(await phone.evaluate((element) => (element as HTMLInputElement).selectionStart), 11);
    await select(5, 7);
    await phone.pressSequentially("33");
    await expect(phone).toHaveValue("+375 33 123-45-67");
    assert.equal(await phone.evaluate((element) => (element as HTMLInputElement).selectionStart), 7);
    await select(5, 7);
    await phone.pressSequentially("29");
    await select(8, 12);
    await phone.press("ControlOrMeta+x");
    await expect(phone).toHaveValue("+375 29 456-7");
    await phone.press("ControlOrMeta+v");
    await expect(phone).toHaveValue("+375 29 123-45-67");
    for (const [position, key, display, caret, restore] of [
      [12, "Backspace", "+375 29 124-56-7", 10, "3"],
      [11, "Delete", "+375 29 123-56-7", 11, "4"],
      [8, "Backspace", "+375 21 234-56-7", 6, "9"],
      [7, "Delete", "+375 29 234-56-7", 7, "1"],
    ] as const) {
      await phone.fill("+375291234567");
      await select(position);
      await phone.press(key);
      await expect(phone).toHaveValue(display);
      assert.equal(await phone.evaluate((element) => (element as HTMLInputElement).selectionStart), caret, `${key} at ${position}`);
      await phone.pressSequentially(restore);
      await expect(phone).toHaveValue("+375 29 123-45-67");
    }
    await phone.press("ControlOrMeta+a");
    await phone.press("Delete");
    await expect(phone).toHaveValue("");
    await phone.pressSequentially("+375291234567");
    await expect(phone).toHaveValue("+375 29 123-45-67");
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
  });

  test("deleting a selected phone separator keeps every digit", async () => {
    await page.goto(base);
    const phone = page.getByLabel("Телефон", { exact: true });
    for (const [start, end] of [[4, 5], [7, 8], [11, 12], [14, 15]]) {
      for (const key of ["Backspace", "Delete"]) {
        await phone.fill("+375291234567");
        await phone.evaluate((element, range) => (element as HTMLInputElement).setSelectionRange(range.start, range.end), { start, end });
        await phone.press(key);
        await expect(phone).toHaveValue("+375 29 123-45-67");
      }
    }
  });

  test("foreign, overlong, prose and extension phone values stay unchanged and cannot save a lead", async () => {
    await page.goto(base);
    await page.getByLabel("Имя", { exact: true }).fill("Проверка границ");
    const phone = page.getByLabel("Телефон", { exact: true });
    for (const input of [
      "+1 202 555 0123", "+7 (495) 123-45-67", "+810375291234567",
      "+3752912345678", "3752912345678", "802912345678", "02912345678", "2912345678", "8103752912345678",
      "call +375291234567 please", "+375291234567 ext 2", "+375291234567#2",
    ]) {
      await phone.fill(input);
      await expect(phone).toHaveValue(input);
      await send(400, "Проверьте поля формы.");
      await expect(phone).toHaveValue(input);
      await expect(phone).toBeFocused();
      await expect(phone).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#phone-error")).toHaveText("Укажите действующий белорусский номер.");
    }
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
  });

  test("all four products and both subscription actions reach the shared form with compatible saved context", async () => {
    await page.goto(base);
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Нужен помол для фильтра");
    for (const [index, [id, name]] of products.entries()) {
      const phone = `+37529123450${index + 1}`;
      await fill(phone, "Анна");
      await expect(card(name).getByText("Количество", { exact: true })).toBeVisible();
      await expect(card(name).getByText("Упаковок", { exact: true })).toHaveCount(0);
      await expect(card(name).getByRole("group", { name: `Количество: ${name}`, exact: true })).toHaveText("1");
      await page.getByRole("button", { name: `Выбрать ${name}`, exact: true }).click();
      await expect(page.getByRole("button", { name: `Выбрано ${name}`, exact: true })).toHaveAttribute("aria-pressed", "true");
      await card(name).getByRole("button", { name: "Перейти к заявке", exact: true }).click();
      await expect(form().getByRole("radio", { name: "Разовый заказ", exact: true })).toBeChecked();
      await expect(summary()).toContainText(name);
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Анна");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue(`+375 29 123-45-0${index + 1}`);
      await expect(form().getByRole("group", { name: `Количество: ${name}`, exact: true })).toHaveText("1");
      await expect(page.getByLabel("Ваш комментарий")).toHaveValue("Нужен помол для фильтра");
      await expect(page.getByLabel("Телефон", { exact: true })).toBeFocused();
      await send(201, saved);
      const lead = await oneDelivered(phone);
      assert.equal(lead.product_id, id);
      assert.equal(lead.interest, "one-time");
      assert.equal(lead.quantity, 1);
      assert.equal(lead.comment, "Нужен помол для фильтра");
      await form().getByRole("button", { name: "Убрать выбранное предложение", exact: true }).click();
    }
    await page.getByRole("button", { name: "Подписка — 54 BYN / месяц", exact: true }).click();
    await expect(form().getByRole("radio", { name: "Подписка", exact: true })).toBeChecked();
    await expect(summary()).toContainText("Подписка");
    await page.getByRole("button", { name: "Хочу подписку", exact: true }).click();
    await fill("+375291234505");
    await send(201, saved);
    const lead = await oneDelivered("+375291234505");
    assert.equal(lead.product_id, "subscription");
    assert.equal(lead.interest, "subscription");
    assert.equal(lead.quantity, null);
    assert.equal(lead.unit_price_kopecks, null);
    assert.equal(lead.total_price_kopecks, null);
    assert.deepEqual(await counts(), { leads: 5, jobs: 5 });
  });

  test("independent selections keep draft counts, contacts and totals while one variety changes or is removed", async () => {
    await page.goto(base);
    await fill();
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Для фильтра, после 18:00");
    const ethiopia = card("Эфиопия Иргачеффе");
    const colombia = card("Колумбия Уила");
    const ethiopiaQuantity = ethiopia.getByRole("group", { name: /^Количество: / });
    const colombiaQuantity = colombia.getByRole("group", { name: /^Количество: / });
    await expect(ethiopiaQuantity).toHaveText("1");
    await expect(ethiopiaQuantity.getByRole("button", { name: /Уменьшить/ })).toBeDisabled();
    await colombiaQuantity.getByRole("button", { name: /Увеличить/ }).click();
    await expect(colombiaQuantity).toHaveText("2");
    await expect(summary()).toHaveCount(0);
    await ethiopia.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await expect(ethiopia.getByRole("button", { name: "Выбрано Эфиопия Иргачеффе", exact: true })).toBeFocused();
    assert.ok(await ethiopia.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth) >= 2), "Selected card needs a visible outline.");
    await expect(summary()).toContainText("За кофе: 32 BYN");
    await expect(catalogSummary()).toContainText("Стоимость доставки уточним при звонке.");
    await ethiopiaQuantity.getByRole("button", { name: /Увеличить/ }).click();
    await expect(summary()).toContainText("За кофе: 64 BYN");
    await expect(summary()).toContainText("Доставка по Минску — бесплатно.");
    await colombiaQuantity.getByRole("button", { name: /Увеличить/ }).click();
    await expect(summary()).toContainText("За кофе: 64 BYN");
    await colombia.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    await expect(page.getByRole("button", { pressed: true })).toHaveCount(2);
    await expect(selectedItems()).toHaveCount(2);
    await expect(selectedItems().filter({ hasText: "Эфиопия Иргачеффе" })).toContainText("2 × 250 г");
    await expect(selectedItems().filter({ hasText: "Колумбия Уила" })).toContainText("3 × 250 г");
    await expect(summary()).toContainText("За кофе: 151 BYN");
    await expect(ethiopia.getByRole("status")).toHaveText("Всего за кофе: 151 BYN");
    await expect(colombia.getByRole("status")).toHaveText("Всего за кофе: 151 BYN");
    await form().getByRole("button", { name: "Увеличить количество: Эфиопия Иргачеффе", exact: true }).click();
    await expect(ethiopiaQuantity).toHaveText("3");
    await expect(colombiaQuantity).toHaveText("3");
    await expect(summary()).toContainText("За кофе: 183 BYN");
    await form().getByRole("button", { name: "Убрать Колумбия Уила", exact: true }).click();
    await expect(page.getByRole("button", { pressed: true })).toHaveCount(1);
    await expect(selectedItems()).toHaveCount(1);
    await expect(summary()).toContainText("За кофе: 96 BYN");
    await expect(colombia.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(colombiaQuantity).toHaveText("3");
    await colombia.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    await ethiopia.getByRole("button", { name: "Выбрано Эфиопия Иргачеффе", exact: true }).click();
    await expect(summary()).toContainText("За кофе: 87 BYN");
    await expect(selectedItems()).toHaveCount(1);
    await expect(colombia.getByRole("button", { pressed: true })).toHaveCount(1);
    await ethiopia.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await ethiopia.getByRole("button", { name: "Перейти к заявке", exact: true }).click();
    await expect(page.getByLabel("Телефон", { exact: true })).toBeFocused();
    await expect(summary()).toContainText("За кофе: 183 BYN");
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
    await expect(page.getByLabel("Ваш комментарий")).toHaveValue("Для фильтра, после 18:00");
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.product_id, null);
    assert.equal(lead.quantity, null);
    assert.deepEqual(await savedItems(lead.id), [
      { product_id: "colombia-huila", quantity: 3, unit_price_kopecks: 2900, total_price_kopecks: 8700 },
      { product_id: "ethiopia-yirgacheffe", quantity: 3, unit_price_kopecks: 3200, total_price_kopecks: 9600 },
    ]);
  });

  test("free delivery uses the combined coffee subtotal and falls back after one line is removed", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Бразилия Серрадо", exact: true }).click();
    await expect(summary()).toContainText("За кофе: 26 BYN");
    await expect(catalogSummary()).toContainText("Стоимость доставки уточним при звонке.");
    await page.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    await expect(summary()).toContainText("За кофе: 55 BYN");
    await expect(catalogSummary()).toContainText("Итого: 55 BYN");
    await expect(catalogSummary()).toContainText("Доставка по Минску — бесплатно.");
    await expect(selectedItems().filter({ hasText: "Бразилия Серрадо" })).toContainText("26 BYN");
    await expect(selectedItems().filter({ hasText: "Колумбия Уила" })).toContainText("29 BYN");
    await form().getByRole("button", { name: "Убрать Бразилия Серрадо", exact: true }).click();
    await expect(summary()).toContainText("За кофе: 29 BYN");
    await expect(catalogSummary()).toContainText("Стоимость доставки уточним при звонке.");
    await expect(selectedItems()).toHaveCount(1);
    await expect(card("Колумбия Уила").getByRole("button", { pressed: true })).toHaveCount(1);
    await form().getByRole("button", { name: "Убрать выбранное предложение", exact: true }).click();
    await expect(summary()).toHaveCount(0);
    await expect(catalogSummary()).toHaveCount(0);
    await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
  });

  test("form and card share the 1–99 pack limits, keyboard controls and drip-box pricing", async () => {
    await page.goto(base);
    const drip = card("Дрип-пакеты, ассорти");
    const cardQuantity = drip.getByRole("group", { name: "Количество: Дрип-пакеты, ассорти", exact: true });
    await drip.getByRole("button", { name: "Выбрать Дрип-пакеты, ассорти", exact: true }).click();
    const formQuantity = form().getByRole("group", { name: "Количество: Дрип-пакеты, ассорти", exact: true });
    await expect(formQuantity).toHaveText("1");
    await expect(formQuantity.getByRole("button", { name: /Уменьшить/ })).toBeDisabled();
    await formQuantity.getByRole("button", { name: /Увеличить/ }).focus();
    await page.keyboard.press("Enter");
    await expect(cardQuantity).toHaveText("2");
    await expect(drip.getByText("2 × 10 дрип-пакетов", { exact: true })).toBeVisible();
    await expect(summary()).toContainText("2 × 10 дрип-пакетов");
    await expect(summary()).toContainText("За кофе: 36 BYN");
    await expect(summary()).toContainText("Стоимость доставки уточним при звонке.");
    await page.keyboard.press("Space");
    await expect(cardQuantity).toHaveText("3");
    await expect(summary()).toContainText("За кофе: 54 BYN");
    await expect(summary()).toContainText("Доставка по Минску — бесплатно.");
    for (let count = 3; count < 99; count++) await page.keyboard.press("Enter");
    await expect(formQuantity).toHaveText("99");
    await expect(cardQuantity).toHaveText("99");
    await expect(formQuantity.getByRole("button", { name: /Увеличить/ })).toBeDisabled();
    await expect(cardQuantity.getByRole("button", { name: /Увеличить/ })).toBeDisabled();
    await expect(summary()).toContainText("За кофе: 1782 BYN");
    await expect(drip.getByText("1782 BYN", { exact: true })).toBeVisible();
    await cardQuantity.getByRole("button", { name: /Уменьшить/ }).click();
    await expect(formQuantity).toHaveText("98");
    await expect(formQuantity.getByRole("button", { name: /Увеличить/ })).toBeEnabled();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), []);
    await fill();
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.product_id, "drip-assortment");
    assert.equal(lead.quantity, 98);
    assert.equal(lead.unit_price_kopecks, 1800);
    assert.equal(lead.total_price_kopecks, 176400);
  });

  test("interest changes preserve question context, replace incompatible context, and allow clearing an offer", async () => {
    await page.goto(base);
    const requests: Record<string, unknown>[] = [];
    page.on("request", (request) => { if (request.url() === `${base}/api/lead` && request.method() === "POST") requests.push(request.postDataJSON()); });
    await page.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await form().getByRole("button", { name: "Увеличить количество: Эфиопия Иргачеффе", exact: true }).click();
    await page.getByRole("button", { name: "Выбрать Дрип-пакеты, ассорти", exact: true }).click();
    await page.getByRole("button", { name: "Поможем выбрать кофе", exact: true }).click();
    await expect(selectedItems()).toHaveCount(2);
    await page.getByRole("button", { name: "Давайте созвонимся", exact: true }).click();
    await expect(selectedItems()).toHaveCount(2);
    await form().getByRole("radio", { name: "Вопрос", exact: true }).check();
    await expect(summary()).toContainText("Эфиопия Иргачеффе");
    await fill();
    await send(201, saved);
    const question = await oneDelivered("+375291234567");
    assert.equal(question.interest, "question");
    assert.equal(question.product_id, null);
    assert.equal(question.quantity, null);
    assert.deepEqual(requests[0].items, [{ productId: "ethiopia-yirgacheffe", quantity: 2 }, { productId: "drip-assortment", quantity: 1 }]);
    assert.equal(Object.hasOwn(requests[0], "productId"), false);
    assert.equal(Object.hasOwn(requests[0], "quantity"), false);
    assert.deepEqual(await savedItems(question.id), [
      { product_id: "drip-assortment", quantity: 1, unit_price_kopecks: 1800, total_price_kopecks: 1800 },
      { product_id: "ethiopia-yirgacheffe", quantity: 2, unit_price_kopecks: 3200, total_price_kopecks: 6400 },
    ]);
    await form().getByRole("radio", { name: "Подписка", exact: true }).check();
    await expect(summary()).toContainText("Подписка");
    await expect(summary()).toContainText("2 × 250 г");
    await expect(form().getByRole("group", { name: /^Количество: / })).toHaveCount(0);
    await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
    await fill("+375291234569");
    await send(201, saved);
    const subscription = await oneDelivered("+375291234569");
    assert.equal(subscription.product_id, "subscription");
    assert.equal(subscription.quantity, null);
    assert.equal(Object.hasOwn(requests[1], "quantity"), false);
    assert.equal(Object.hasOwn(requests[1], "items"), false);
    assert.equal(requests[1].productId, "subscription");
    assert.deepEqual(await savedItems(subscription.id), []);
    await form().getByRole("radio", { name: "Разовый заказ", exact: true }).check();
    await expect(form().getByRole("button", { name: "Убрать выбранное предложение" })).toHaveCount(0);
    await page.getByRole("button", { name: "Хочу подписку", exact: true }).click();
    await form().getByRole("radio", { name: "Вопрос", exact: true }).check();
    await expect(summary()).toContainText("Подписка");
    await form().getByRole("button", { name: "Убрать выбранное предложение" }).click();
    await expect(form().getByRole("button", { name: "Убрать выбранное предложение" })).toHaveCount(0);
    await expect(form().getByRole("radio", { name: "Вопрос", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Поможем выбрать кофе", exact: true }).click();
    await expect(form().getByRole("radio", { name: "Вопрос", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Давайте созвонимся", exact: true }).click();
    await fill("+375291234568");
    await send(201, saved);
    const generic = await oneDelivered("+375291234568");
    assert.equal(generic.interest, "question");
    assert.equal(generic.product_id, null);
    assert.equal(generic.quantity, null);
    assert.equal(generic.unit_price_kopecks, null);
    assert.equal(generic.total_price_kopecks, null);
    assert.equal(Object.hasOwn(requests[2], "quantity"), false);
    assert.equal(Object.hasOwn(requests[2], "items"), false);
    assert.equal(Object.hasOwn(requests[2], "productId"), false);
    await page.getByRole("button", { name: "Хочу подписку", exact: true }).click();
    await page.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await expect(summary()).not.toContainText("Подписка");
    await expect(summary()).toContainText("2 × 250 г");
    await expect(form().getByRole("radio", { name: "Разовый заказ", exact: true })).toBeChecked();
    await form().getByRole("button", { name: "Убрать выбранное предложение", exact: true }).click();
    await expect(summary()).toHaveCount(0);
    await fill("+375291234566");
    await send(201, saved);
    assert.equal(Object.hasOwn(requests[3], "items"), false);
    assert.equal(Object.hasOwn(requests[3], "productId"), false);
  });

  test("entry attribution and referrer survive navigation, a failed network request and a successful retry", async () => {
    const attribution = { utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "Осенний кофе", utm_content: "bag-a", utm_term: "зерно", utm_id: "campaign-1", yclid: "test-yandex", gclid: "test-google", fbclid: "test-meta" };
    const entry = `${base}/?${new URLSearchParams(attribution)}`;
    const referrer = "https://ads.example/coffee";
    await page.goto(entry, { referer: referrer });
    await page.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    await card("Колумбия Уила").getByRole("button", { name: /Увеличить количество/ }).click();
    await page.getByRole("button", { name: "Выбрать Дрип-пакеты, ассорти", exact: true }).click();
    await fill();
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Перезвоните после 18:00");
    await page.getByRole("link", { name: "Кварта — в начало", exact: true }).click();
    await page.evaluate(() => history.replaceState(null, "", "/?utm_source=changed#coffee"));
    await page.route("**/api/lead", (route) => route.abort("failed"), { times: 1 });
    await submit().click();
    await expect(feedback()).toHaveText(recoverable);
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
    await expect(page.getByLabel("Ваш комментарий")).toHaveValue("Перезвоните после 18:00");
    await expect(summary()).toContainText("2 × 250 г");
    await expect(summary()).toContainText("За кофе: 76 BYN");
    await expect(selectedItems()).toHaveCount(2);
    await expect(card("Колумбия Уила").getByRole("button", { pressed: true })).toHaveCount(1);
    await expect(card("Дрип-пакеты, ассорти").getByRole("button", { pressed: true })).toHaveCount(1);
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.deepEqual(lead.attribution, { ...attribution, landingUrl: entry, referrer });
    assert.equal(lead.product_id, null);
    assert.deepEqual(await savedItems(lead.id), [
      { product_id: "colombia-huila", quantity: 2, unit_price_kopecks: 2900, total_price_kopecks: 5800 },
      { product_id: "drip-assortment", quantity: 1, unit_price_kopecks: 1800, total_price_kopecks: 1800 },
    ]);
    assert.equal(lead.comment, "Перезвоните после 18:00");
  });

  test("hostile or oversized optional attribution is omitted without blocking a valid callback", async () => {
    await page.addInitScript(() => Object.defineProperty(document, "referrer", { value: "javascript:alert(1)" }));
    const params = new URLSearchParams({ utm_source: "a".repeat(257), utm_medium: "bad\nvalue", yclid: "b".repeat(513), utm_campaign: "valid-campaign", gclid: "valid-click", padding: "x".repeat(2100) });
    await page.goto(`${base}/?${params}`);
    await fill();
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.deepEqual(lead.attribution, { utm_campaign: "valid-campaign", gclid: "valid-click" });
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("pending disables repeat actions; a response lost after commit retries as a duplicate without losing input", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Дрип-пакеты, ассорти", exact: true }).click();
    await card("Дрип-пакеты, ассорти").getByRole("button", { name: /Увеличить количество/ }).click();
    await fill();
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Сохраните две коробки");
    await page.getByRole("button", { name: "Выбрать Бразилия Серрадо", exact: true }).click();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    await page.route("**/api/lead", async (route) => {
      requests++;
      await gate;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await route.abort("failed");
    }, { times: 1 });
    try {
      await submit().click();
      await expect(form()).toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("button", { name: "Сохраняем заявку…", exact: true })).toBeDisabled();
      await expect(page.getByLabel("Имя", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Телефон", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Ваш комментарий")).toBeDisabled();
      await expect(page.getByRole("button", { name: "Хочу подписку", exact: true })).toBeDisabled();
      for (const control of await page.getByRole("article").getByRole("button").all()) await expect(control).toBeDisabled();
      for (const control of await form().getByRole("group", { name: /^Количество: / }).getByRole("button").all()) await expect(control).toBeDisabled();
      for (const control of await form().getByRole("radio").all()) await expect(control).toBeDisabled();
      await expect(form().getByRole("button", { name: "Убрать выбранное предложение" })).toBeDisabled();
      for (const control of await selectedItems().getByRole("button", { name: /^Убрать / }).all()) await expect(control).toBeDisabled();
      await expect(catalogSummary().getByRole("button", { name: "Перейти к заявке", exact: true })).toBeDisabled();
      await form().evaluate((element) => { (element as HTMLFormElement).requestSubmit(); (element as HTMLFormElement).requestSubmit(); });
      assert.equal(requests, 1);
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { release(); }
    await expect(feedback()).toHaveText(recoverable);
    await expect(form()).toHaveAttribute("aria-busy", "false");
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
    await expect(page.getByLabel("Ваш комментарий")).toHaveValue("Сохраните две коробки");
    await expect(summary()).toContainText("2 × 10 дрип-пакетов");
    await expect(summary()).toContainText("За кофе: 62 BYN");
    await expect(selectedItems()).toHaveCount(2);
    await expect(card("Дрип-пакеты, ассорти").getByRole("button", { pressed: true })).toHaveCount(1);
    await settled();
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.product_id, null);
    const lines = await savedItems(lead.id);
    assert.deepEqual(lines, [
      { product_id: "brazil-cerrado", quantity: 1, unit_price_kopecks: 2600, total_price_kopecks: 2600 },
      { product_id: "drip-assortment", quantity: 2, unit_price_kopecks: 1800, total_price_kopecks: 3600 },
    ]);
    await send(200, duplicate);
    assert.deepEqual(await savedItems(lead.id), lines);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
    assert.equal((await oneDelivered("+375291234567")).id, lead.id);
  });

  test("a nested quantity error focuses its selected line and correction keeps every coffee and entered value", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await page.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    const quantity = form().getByRole("group", { name: "Количество: Колумбия Уила", exact: true });
    await quantity.getByRole("button", { name: /Увеличить/ }).click();
    await fill();
    const quantityError = "Укажите целое количество от 1 до 99.";
    await page.route("**/api/lead", (route) => route.fulfill({ status: 400, contentType: "application/json",
      body: JSON.stringify({ ok: false, status: "invalid", message: "Проверьте поля формы.", fieldErrors: { "items.1.quantity": quantityError } }) }), { times: 1 });
    await send(400, "Проверьте поля формы.");
    await expect(page.locator("#quantity-error")).toHaveText(quantityError);
    await expect(quantity).toHaveAttribute("aria-describedby", "quantity-error");
    await expect(quantity.getByRole("button", { name: /Уменьшить/ })).toBeFocused();
    await expect(quantity).toHaveText("2");
    await expect(summary()).toContainText("За кофе: 90 BYN");
    await expect(selectedItems()).toHaveCount(2);
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    await quantity.getByRole("button", { name: /Увеличить/ }).click();
    await expect(page.locator("#quantity-error")).toHaveCount(0);
    await expect(card("Колумбия Уила").getByRole("group", { name: /^Количество: / })).toHaveText("3");
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.product_id, null);
    assert.deepEqual(await savedItems(lead.id), [
      { product_id: "colombia-huila", quantity: 3, unit_price_kopecks: 2900, total_price_kopecks: 8700 },
      { product_id: "ethiopia-yirgacheffe", quantity: 1, unit_price_kopecks: 3200, total_price_kopecks: 3200 },
    ]);
  });

  test("an actual PostgreSQL transaction failure preserves input, rolls back and permits a retry", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Бразилия Серрадо", exact: true }).click();
    await form().getByRole("button", { name: /Увеличить количество/ }).click();
    await fill("+375291234567", "Browser database retry");
    await getPool().query("ALTER TABLE app.leads ADD CONSTRAINT landing_test_reject_name CHECK (name <> 'Browser database retry') NOT VALID");
    try {
      await send(503, recoverable);
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Browser database retry");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
      await expect(summary()).toContainText("2 × 250 г");
      await expect(summary()).toContainText("За кофе: 52 BYN");
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { await getPool().query("ALTER TABLE app.leads DROP CONSTRAINT landing_test_reject_name"); }
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.name, "Browser database retry");
    assert.equal(lead.quantity, 2);
    assert.equal(lead.total_price_kopecks, 5200);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("a timed-out request restores the form and retries without discarding the entered values", async () => {
    await page.goto(base);
    await fill();
    await page.clock.install();
    let blocked: Route | undefined;
    await page.route("**/api/lead", (route) => { blocked = route; }, { times: 1 });
    try {
      await submit().click();
      await expect.poll(() => !!blocked).toBe(true);
      await expect(form()).toHaveAttribute("aria-busy", "true");
      await page.clock.fastForward(12_001);
      await expect(feedback()).toHaveText(recoverable);
      await expect(form()).toHaveAttribute("aria-busy", "false");
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 29 123-45-67");
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { await blocked?.abort("timedout").catch(() => undefined); }
    await send(201, saved);
    await oneDelivered("+375291234567");
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
  });

  test("320–1440 layouts load local Cyrillic fonts and imagery, expose truthful content and keep keyboard navigation usable", async () => {
    const external: string[] = [];
    page.on("request", (request) => { if (new URL(request.url()).origin !== base) external.push(request.url()); });
    await page.goto(base);
    for (const [, name] of products) {
      await page.getByRole("button", { name: `Выбрать ${name}`, exact: true }).click();
      await form().getByRole("button", { name: `Увеличить количество: ${name}`, exact: true }).focus();
      for (let count = 1; count < 99; count++) await page.keyboard.press("Enter");
      await expect(card(name).getByRole("group", { name: /^Количество: / })).toHaveText("99");
    }
    await expect(selectedItems()).toHaveCount(4);
    await expect(selectedItems().filter({ hasText: "Дрип-пакеты, ассорти" })).toContainText("99 × 10 дрип-пакетов");
    await expect(summary()).toContainText("За кофе: 10395 BYN");
    await expect(catalogSummary()).toContainText("Итого: 10395 BYN");
    await fill();
    for (const width of [320, 390, 600, 601, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await catalogSummary().getByRole("button", { name: "Перейти к заявке", exact: true }).click();
      const phone = page.getByLabel("Телефон", { exact: true });
      await expect(phone).toBeFocused();
      const focusedBounds = await phone.boundingBox();
      assert.ok(focusedBounds && focusedBounds.y >= 0 && focusedBounds.y + focusedBounds.height <= 900,
        `Focused contact field is outside the viewport at ${width}: ${JSON.stringify(focusedBounds)}`);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1, `Horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
      const image = page.getByRole("img", { name: /Чашка кофе/ });
      await expect(image).toBeVisible();
      let imageUrl = "";
      await expect.poll(async () => {
        const loaded = await image.evaluate((element) => {
          const image = element as HTMLImageElement;
          return { complete: image.complete, naturalWidth: image.naturalWidth, currentSrc: image.currentSrc };
        });
        imageUrl = loaded.currentSrc;
        return loaded.complete && loaded.naturalWidth > 0 && imageUrl.length > 0;
      }, { timeout: 8_000, message: `Responsive image failed to load at ${width} px` }).toBe(true);
      assert.equal(new URL(imageUrl).origin, base);
      const optimizedImage = await context.request.get(imageUrl, { timeout: 8_000 });
      assert.equal(optimizedImage.status(), 200, `Image optimizer failed at ${width} px`);
      assert.match(optimizedImage.headers()["content-type"], /^image\//);
      const bounds = await image.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      await expect(page.getByLabel("Имя", { exact: true })).toBeVisible();
      await expect(submit()).toBeVisible();
      for (const control of [submit(), page.getByLabel("Имя", { exact: true }), page.getByLabel("Телефон", { exact: true }), page.getByRole("button", { name: "Хочу подписку", exact: true })]) {
        assert.ok((await control.boundingBox())!.height >= 44, `Main touch target shorter than 44 px at ${width}`);
      }
      for (const control of await form().getByRole("group", { name: /^Количество: / }).getByRole("button").all()) {
        const bounds = await control.boundingBox();
        assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
          `Form pack control is too small or leaves the viewport at ${width}`);
      }
      const cards = page.getByRole("region", { name: "Кофе на выбор", exact: true }).getByRole("article");
      assert.equal(await cards.count(), 4);
      const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }));
      if (width <= 600) {
        assert.ok(Math.abs(boxes[0].x - boxes[1].x) <= 1 && boxes[0].bottom < boxes[1].y, `Cards must stack at ${width}`);
      } else {
        assert.ok(Math.abs(boxes[0].y - boxes[1].y) <= 1 && boxes[0].right < boxes[1].x, `Cards must form two columns at ${width}`);
      }
      for (const [index, card] of (await cards.all()).entries()) {
        const bounds = boxes[index];
        assert.ok(bounds.x >= 0 && bounds.right <= width + 1, `Card leaves viewport at ${width}`);
        for (const control of await card.getByRole("button").all()) {
          const button = await control.boundingBox();
          assert.ok(button && button.width >= 44 && button.height >= 44, `Coffee action target is too small at ${width}`);
        }
        const clipped = await card.locator("h3, p, button").evaluateAll((elements) => elements.filter((element) => {
          const box = element.getBoundingClientRect();
          const card = element.closest("article")!.getBoundingClientRect();
          return box.left < card.left - 1 || box.right > card.right + 1 || box.top < card.top - 1 || box.bottom > card.bottom + 1 || element.scrollWidth > element.clientWidth + 1;
        }).map((element) => element.textContent));
        assert.deepEqual(clipped, [], `Clipped coffee card content at ${width}`);
      }
      await page.screenshot({ path: `/tmp/kvarta-landing-${width}.png`, fullPage: true });
    }
    const fonts = await page.evaluate(() => ({
      loaded: [...document.fonts].filter((font) => font.status === "loaded").length,
      entries: performance.getEntriesByType("resource").filter((resource) => /\.woff2(?:\?|$)/.test(resource.name)).map((resource) => resource.name),
      text: getComputedStyle(document.body).fontFamily,
      wordmark: getComputedStyle(document.querySelector("header a")!).fontFamily,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
      transition: getComputedStyle(document.querySelector("button[type=submit]")!).transitionDuration,
    }));
    assert.ok(fonts.loaded >= 2 && fonts.entries.length >= 2, JSON.stringify(fonts));
    assert.ok(fonts.entries.every((url) => new URL(url).origin === base));
    assert.notEqual(fonts.text, fonts.wordmark);
    assert.equal(fonts.scroll, "auto");
    assert.ok(fonts.transition.split(",").every((value) => parseFloat(value) === 0));
    assert.deepEqual(external, []);
    for (const [name, price, size, notes] of [
      ["Эфиопия Иргачеффе", "32 BYN", "250 г", "Цветы и бергамот"],
      ["Колумбия Уила", "29 BYN", "250 г", "Карамель и красное яблоко"],
      ["Бразилия Серрадо", "26 BYN", "250 г", "Орехи и шоколад"],
      ["Дрип-пакеты, ассорти", "18 BYN", "10 штук", "Любимый кофе — где угодно"],
    ]) {
      const article = page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(article).toContainText(price);
      await expect(article).toContainText(size);
      await expect(article).toContainText(notes);
    }
    await expect(page.getByText("Минск, ул. Короля, 9", { exact: true })).toBeVisible();
    await expect(page.getByText("Пн–пт · 08:00–20:00Сб–вс · 10:00–18:00", { exact: true })).toBeVisible();
    await expect(page.getByText("Доставляем по пятницам.От 50 BYN — бесплатно.", { exact: true })).toBeVisible();
    await expect(page.getByText(/Для заказа меньше 50 BYN стоимость доставки уточнит менеджер/)).toBeVisible();
    await expect(page.getByText("Состав подписки обсудим, когда перезвоним.", { exact: true })).toBeVisible();
    assert.equal(await page.locator("a[href^='tel:'], a[href^='mailto:']").count(), 0);
    await expect(page).toHaveTitle("Кварта — обжарка кофе в Минске");
    assert.equal(await page.locator("meta[property='og:locale']").getAttribute("content"), "ru_BY");
    assert.equal(await page.locator("meta[name='twitter:card']").getAttribute("content"), "summary_large_image");
    const social = await page.locator("meta[property='og:image']").getAttribute("content");
    assert.ok(social);
    const socialUrl = new URL(social);
    assert.ok(["http:", "https:"].includes(socialUrl.protocol));
    // SITE_URL is configured at release; exercise the generated route only on
    // this disposable application, never metadata's default developer origin.
    const socialResponse = await context.request.get(new URL(socialUrl.pathname + socialUrl.search, base).href, { timeout: 8_000 });
    assert.equal(socialResponse.status(), 200);
    assert.match(socialResponse.headers()["content-type"], /^image\//);
    const requests: Record<string, unknown>[] = [];
    page.on("request", (request) => { if (request.url() === `${base}/api/lead` && request.method() === "POST") requests.push(request.postDataJSON()); });
    await send(201, saved);
    const maximum = await oneDelivered("+375291234567");
    const maximumItems = await savedItems(maximum.id);
    assert.equal(maximumItems.length, 4);
    assert.ok(maximumItems.every((item) => item.quantity === 99));
    assert.equal(maximumItems.reduce((sum, item) => sum + item.total_price_kopecks, 0), 1039500);
    assert.deepEqual(requests[0].items, products.map(([productId]) => ({ productId, quantity: 99 })));
    assert.equal(Object.hasOwn(requests[0], "productId"), false);
    assert.equal(Object.hasOwn(requests[0], "quantity"), false);
    const accessibilityWithAllItems = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(accessibilityWithAllItems.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), []);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
    await expect(summary()).toHaveCount(0);
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "К содержимому", exact: true })).toBeFocused();
    const menu = page.getByLabel("Меню", { exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Кофе на выбор", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(page.getByRole("navigation", { name: "Основная навигация" })).not.toBeVisible();
    await page.screenshot({ path: "/tmp/kvarta-landing-390.png", fullPage: true });
    await menu.click();
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), []);
  });
});
