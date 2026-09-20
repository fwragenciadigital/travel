import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.js";
import { buildSearchPlan } from "./plan.js";
import { parseTapResults } from "./tap-results.js";
import { parseTapReview } from "./tap-review.js";
import { buildTapBookingUrl } from "./tap-url.js";

const config = await loadConfig();
const query = buildSearchPlan(config)[0];
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: false, slowMo: 80 });
const context = await browser.newContext({ locale: "it-IT", timezoneId: "Europe/Rome" });
const page = await context.newPage();

try {
  console.log(`Consultando TAP: ${query.origin} → ${query.destination}, ${query.departureDate} → ${query.returnDate}.`);
  console.log("O navegador ficará visível. Se a TAP solicitar CAPTCHA, resolva-o normalmente; o script não tenta contorná-lo.");

  await page.goto(buildTapBookingUrl(query, config.passengers), { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForFlightSelection(page, "outbound");
  const outbound = await selectCheapestEconomy(page, query, config, "ida");

  await waitForFlightSelection(page, "return");
  const inbound = await selectCheapestEconomy(page, { ...query, origin: query.destination, destination: query.origin }, config, "volta");

  await page.waitForURL(/\/review-your-trip/, { timeout: 45000 });
  const capture = await buildCapture(page, query, config.passengers);
  const report = parseTapReview(capture);
  const outputPath = await saveResult({ capture, report, outbound, inbound });

  console.log(`Total TAP exibido: ${report.total.toFixed(2)} ${report.currency}`);
  console.log(`Arquivo gerado: ${outputPath}`);
} finally {
  await browser.close();
}

async function waitForFlightSelection(page, direction) {
  const expected = direction === "outbound" ? /select.*(outbound|departure)/i : /select.*return/i;
  await page.waitForFunction((source) => new RegExp(source, "i").test(document.body.innerText), expected.source, { timeout: 60000 });
}

async function selectCheapestEconomy(page, query, config, label) {
  const capture = await buildCapture(page, query, config.passengers);
  const result = parseTapResults(capture, { maxStops: config.maxStops });
  const option = result.cheapestOption;
  const button = await findEconomyButton(page, option.economyPrice);
  if (!button) throw new Error(`Não foi possível localizar o botão Economy de ${option.economyPrice.toFixed(2)} EUR para a ${label}.`);

  await button.click();
  console.log(`${label[0].toUpperCase()}${label.slice(1)} selecionada: ${option.stops} escala(s), ${option.economyPrice.toFixed(2)} EUR.`);
  return option;
}

async function findEconomyButton(page, price) {
  const buttons = page.locator('button[aria-label^="Economy from"]');
  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index);
    if (!await button.isVisible() || !await button.isEnabled()) continue;
    const label = await button.getAttribute("aria-label");
    const parsed = Number(label?.match(/from\s+(\d+(?:\.\d+)?)\s+EUR/i)?.[1]);
    if (parsed === price) return button;
  }
  return null;
}

async function buildCapture(page, query, passengers) {
  return {
    capturedAt: new Date().toISOString(),
    query,
    passengers,
    page: {
      url: page.url(),
      title: await page.title(),
      text: (await page.locator("body").innerText()).slice(0, 30000)
    }
  };
}

async function saveResult(result) {
  const outputDirectory = path.resolve("output");
  await fs.mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const outputPath = path.join(outputDirectory, `tap-scan-${timestamp}.json`);
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  return outputPath;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("Playwright não está instalado. Execute npm install e npx playwright install chromium.");
    }
    throw error;
  }
}
