import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig } from "./config.js";
import { buildSearchPlan } from "./plan.js";

const config = await loadConfig();
const query = buildSearchPlan(config)[0];
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium);
const context = await browser.newContext({ locale: "it-IT", timezoneId: "Europe/Rome" });
const page = await context.newPage();

try {
  await page.goto("https://www.flytap.com/en-it", { waitUntil: "domcontentloaded", timeout: 60000 });
  await acceptCookieBanner(page);

  console.log("\nValidação TAP aberta no navegador.");
  console.log(`Faça uma busca de ida e volta: ${query.origin} → ${query.destination}, ${query.departureDate} → ${query.returnDate}.`);
  console.log(`${config.passengers.adults} adultos + ${config.passengers.children} criança; econômica; somente bagagem de mão; até ${config.maxStops} escalas.`);
  console.log("Pare na tela com as opções de voo. Não informe dados de pagamento.");

  const prompt = readline.createInterface({ input, output });
  await prompt.question("Quando os resultados estiverem visíveis, pressione Enter aqui para salvar a validação: ");
  prompt.close();

  const outputDirectory = path.resolve("output");
  await fs.mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const baseName = `tap-validation-${timestamp}`;
  const capture = {
    capturedAt: new Date().toISOString(),
    query,
    passengers: config.passengers,
    page: {
      url: page.url(),
      title: await page.title(),
      controls: await getVisibleControls(page),
      text: (await page.locator("body").innerText()).slice(0, 30000)
    }
  };

  await page.screenshot({ path: path.join(outputDirectory, `${baseName}.png`), fullPage: true });
  await fs.writeFile(path.join(outputDirectory, `${baseName}.json`), JSON.stringify(capture, null, 2));
  console.log(`Validação salva em output/${baseName}.json e output/${baseName}.png`);
} finally {
  await browser.close();
}

async function acceptCookieBanner(page) {
  const buttons = page.getByRole("button", { name: /accept|aceitar|accetta|consenti/i });
  if (await buttons.count()) await buttons.first().click({ timeout: 5000 }).catch(() => {});
}

async function getVisibleControls(page) {
  return page.locator("input, button, [role=button], [role=combobox]").evaluateAll((elements) => elements
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none";
    })
    .slice(0, 150)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type"),
      role: element.getAttribute("role"),
      name: element.getAttribute("name"),
      id: element.id || null,
      label: element.getAttribute("aria-label"),
      placeholder: element.getAttribute("placeholder"),
      text: (element.textContent || "").trim().slice(0, 160)
    })));
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

async function launchBrowser(chromium) {
  try {
    return await chromium.launch({ headless: false, slowMo: 80 });
  } catch (error) {
    if (/executable doesn't exist/i.test(error.message)) {
      throw new Error("O navegador do Playwright ainda não foi instalado. Execute npx playwright install chromium e tente novamente.");
    }
    throw error;
  }
}
