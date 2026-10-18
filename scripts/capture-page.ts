import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:3000";
const output = ".impeccable/review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox"],
});
const captures = [];
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const [name, width, height] of [["hero-repro", 853, 1844], ["mobile", 390, 844], ["desktop", 1440, 1000]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: name !== "hero-repro", animations: "disabled" });
    const dimensions = await page.evaluate(() => ({
      width: innerWidth, viewportHeight: innerHeight, documentHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      loadedFonts: [...document.fonts].filter((font) => font.status === "loaded").length,
      imageLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    }));
    if (dimensions.loadedFonts < 2 || !dimensions.imageLoaded || dimensions.scrollWidth > width) throw new Error(`Incomplete or overflowing capture: ${name}`);
    captures.push({ name, ...dimensions });
  }
  await context.close();
  await writeFile(`${output}/capture.json`, JSON.stringify({ url, capturedAt: new Date().toISOString(), browser: browser.version(), captures }, null, 2) + "\n");
  console.log(captures);
} finally { await browser.close(); }
