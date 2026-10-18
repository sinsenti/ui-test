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
    await getPool().query("TRUNCATE app.leads CASCADE");
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
    for (const phone of ["+1 202 555 0123", "+375111111111"]) {
      await page.getByLabel("Телефон", { exact: true }).fill(phone);
      await send(400);
      await expect(page.getByLabel("Телефон", { exact: true })).toBeFocused();
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator("#phone-error")).toHaveText("Укажите действующий белорусский номер.");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveAttribute("aria-describedby", /phone-help.*phone-error/);
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue(phone);
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Анна");
    }
    assert.equal(requests, 2);
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), []);
  });

  test("all four products and both subscription actions reach the shared form with compatible saved context", async () => {
    await page.goto(base);
    const products = [
      ["ethiopia-yirgacheffe", "Эфиопия Иргачеффе"], ["colombia-huila", "Колумбия Уила"],
      ["brazil-cerrado", "Бразилия Серрадо"], ["drip-assortment", "Дрип-пакеты, ассорти"],
    ];
    for (const [index, [id, name]] of products.entries()) {
      await page.getByRole("button", { name: `Выбрать ${name}`, exact: true }).click();
      await expect(form().getByRole("radio", { name: "Разовый заказ", exact: true })).toBeChecked();
      await expect(form().getByRole("status").filter({ hasText: "Вы выбрали:" })).toContainText(name);
      const phone = `+37529123450${index + 1}`;
      await fill(phone);
      await send(201, saved);
      assert.equal((await oneDelivered(phone)).product_id, id);
    }
    await page.getByRole("button", { name: "Подписка — 54 BYN / месяц", exact: true }).click();
    await expect(form().getByRole("radio", { name: "Подписка", exact: true })).toBeChecked();
    await expect(form().getByRole("status").filter({ hasText: "Вы выбрали:" })).toContainText("Подписка");
    await page.getByRole("button", { name: "Хочу подписку", exact: true }).click();
    await fill("+375291234505");
    await send(201, saved);
    const lead = await oneDelivered("+375291234505");
    assert.equal(lead.product_id, "subscription");
    assert.equal(lead.interest, "subscription");
    assert.deepEqual(await counts(), { leads: 5, jobs: 5 });
  });

  test("interest changes preserve question context, replace incompatible context, and allow clearing an offer", async () => {
    await page.goto(base);
    await page.getByRole("button", { name: "Выбрать Эфиопия Иргачеффе", exact: true }).click();
    await form().getByRole("radio", { name: "Вопрос", exact: true }).check();
    await expect(form().getByRole("status").filter({ hasText: "Вы выбрали:" })).toContainText("Эфиопия Иргачеффе");
    await fill();
    await send(201, saved);
    const question = await oneDelivered("+375291234567");
    assert.equal(question.interest, "question");
    assert.equal(question.product_id, "ethiopia-yirgacheffe");
    await form().getByRole("radio", { name: "Подписка", exact: true }).check();
    await expect(form().getByRole("status").filter({ hasText: "Вы выбрали:" })).toContainText("Подписка");
    await form().getByRole("radio", { name: "Разовый заказ", exact: true }).check();
    await expect(form().getByRole("button", { name: "Убрать выбранное предложение" })).toHaveCount(0);
    await page.getByRole("button", { name: "Хочу подписку", exact: true }).click();
    await form().getByRole("radio", { name: "Вопрос", exact: true }).check();
    await expect(form().getByRole("status").filter({ hasText: "Вы выбрали:" })).toContainText("Подписка");
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
  });

  test("entry attribution and referrer survive navigation, a failed network request and a successful retry", async () => {
    const attribution = { utm_source: "instagram", utm_medium: "paid_social", utm_campaign: "Осенний кофе", utm_content: "bag-a", utm_term: "зерно", utm_id: "campaign-1", yclid: "test-yandex", gclid: "test-google", fbclid: "test-meta" };
    const entry = `${base}/?${new URLSearchParams(attribution)}`;
    const referrer = "https://ads.example/coffee";
    await page.goto(entry, { referer: referrer });
    await page.getByRole("button", { name: "Выбрать Колумбия Уила", exact: true }).click();
    await fill();
    await page.getByText("Комментарий (необязательно)", { exact: true }).click();
    await page.getByLabel("Ваш комментарий").fill("Перезвоните после 18:00");
    await page.getByRole("link", { name: "Кварта — в начало", exact: true }).click();
    await page.evaluate(() => history.replaceState(null, "", "/?utm_source=changed#coffee"));
    await page.route("**/api/lead", (route) => route.abort("failed"), { times: 1 });
    await submit().click();
    await expect(feedback()).toHaveText(recoverable);
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 (29) 123-45-67");
    await expect(page.getByLabel("Ваш комментарий")).toHaveValue("Перезвоните после 18:00");
    assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    await send(201, saved);
    const lead = await oneDelivered("+375291234567");
    assert.deepEqual(lead.attribution, { ...attribution, landingUrl: entry, referrer });
    assert.equal(lead.product_id, "colombia-huila");
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
    await fill();
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
      await expect(page.getByRole("button", { name: "Хочу подписку", exact: true })).toBeDisabled();
      await form().evaluate((element) => { (element as HTMLFormElement).requestSubmit(); (element as HTMLFormElement).requestSubmit(); });
      assert.equal(requests, 1);
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { release(); }
    await expect(feedback()).toHaveText(recoverable);
    await expect(form()).toHaveAttribute("aria-busy", "false");
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Браузерная проверка");
    await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 (29) 123-45-67");
    await settled();
    const lead = await oneDelivered("+375291234567");
    assert.equal(lead.product_id, "drip-assortment");
    await send(200, duplicate);
    assert.deepEqual(await counts(), { leads: 1, jobs: 1 });
    assert.equal((await oneDelivered("+375291234567")).id, lead.id);
  });

  test("an actual PostgreSQL transaction failure preserves input, rolls back and permits a retry", async () => {
    await page.goto(base);
    await fill("+375291234567", "Browser database retry");
    await getPool().query("ALTER TABLE app.leads ADD CONSTRAINT landing_test_reject_name CHECK (name <> 'Browser database retry') NOT VALID");
    try {
      await send(503, recoverable);
      await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Browser database retry");
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375291234567");
      assert.deepEqual(await counts(), { leads: 0, jobs: 0 });
    } finally { await getPool().query("ALTER TABLE app.leads DROP CONSTRAINT landing_test_reject_name"); }
    await send(201, saved);
    assert.equal((await oneDelivered("+375291234567")).name, "Browser database retry");
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
      await expect(page.getByLabel("Телефон", { exact: true })).toHaveValue("+375 (29) 123-45-67");
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
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1, `Horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
      const image = page.getByRole("img", { name: /Чашка кофе/ });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0;
      }), { timeout: 8_000, message: `Responsive image failed to load at ${width} px` }).toBe(true);
      const imageUrl = await image.evaluate((element) => (element as HTMLImageElement).currentSrc);
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
    for (const [name, price] of [["Эфиопия Иргачеффе", "32 BYN"], ["Колумбия Уила", "29 BYN"], ["Бразилия Серрадо", "26 BYN"], ["Дрип-пакеты, ассорти", "18 BYN"]]) {
      const article = page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(article).toContainText(price);
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base);
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
