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

  const resultsPage = await findResultsPage(context, page);
  if (!resultsPage) {
    throw new Error("Nenhuma página de resultados foi encontrada. Confirme que a busca abriu os voos e os preços antes de pressionar Enter.");
  }

  const outputDirectory = path.resolve("output");
  await fs.mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const baseName = `tap-validation-${timestamp}`;
  const capture = {
    capturedAt: new Date().toISOString(),
    query,
    passengers: config.passengers,
    page: {
      url: resultsPage.url(),
      title: await resultsPage.title(),
      controls: await getVisibleControls(resultsPage),
      text: (await resultsPage.locator("body").innerText()).slice(0, 30000)
    }
  };

  await resultsPage.screenshot({ path: path.join(outputDirectory, `${baseName}.png`), fullPage: true });
  await fs.writeFile(path.join(outputDirectory, `${baseName}.json`), JSON.stringify(capture, null, 2));
  console.log(`Validação salva em output/${baseName}.json e output/${baseName}.png`);
} finally {
  await browser.close();
}

async function acceptCookieBanner(page) {
  const buttons = page.getByRole("button", { name: /accept|aceitar|accetta|consenti/i });
  if (await buttons.count()) await buttons.first().click({ timeout: 5000 }).catch(() => {});
}

async function findResultsPage(context, homePage) {
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    const candidates = await Promise.all(context.pages()
      .filter((candidate) => !candidate.isClosed())
      .map(async (candidate) => ({
        page: candidate,
        score: await scoreResultsPage(candidate, homePage)
      })));
    const best = candidates.sort((a, b) => b.score - a.score)[0];

    if (best?.score >= 100) return best.page;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
}

async function scoreResultsPage(candidate, homePage) {
  const url = candidate.url();
  if (!url || url === "about:blank") return 0;

  let score = candidate === homePage ? 0 : 70;
  if (url !== homePage.url()) score += 40;

  const text = await candidate.locator("body").innerText({ timeout: 3000 }).catch(() => "");
  if (/select (your )?flight|choose.*flight|outbound|return flight|departure flight|flight options/i.test(text)) {
    score += 100;
  }

  return score;
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
