import { airlines } from "./airlines.js";

export async function runOfficialSites(config, plan, options) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: !options.headed });
  const results = [];
  try {
    for (const airlineId of config.airlines) {
      const airline = airlines[airlineId];
      if (!airline) throw new Error(`Companhia desconhecida na configuração: ${airlineId}`);
      const queries = plan.slice(0, options.limit ?? plan.length);
      for (const query of queries) {
        results.push(await runConnectorStub(browser, airline, query, config));
        await pause(config.scan.minimumDelayMs);
      }
    }
  } finally {
    await browser.close();
  }
  return results;
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

async function runConnectorStub(browser, airline, query, config) {
  const page = await browser.newPage({ locale: "it-IT", timezoneId: "Europe/Rome" });
  try {
    await page.goto(airline.bookingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    return {
      status: "needs_connector",
      airline: airline.name,
      bookingUrl: airline.bookingUrl,
      query,
      passengers: config.passengers,
      reason: "O site oficial abriu. Falta gravar e validar o fluxo específico desta companhia antes de extrair tarifas."
    };
  } catch (error) {
    return {
      status: "needs_connector",
      airline: airline.name,
      bookingUrl: airline.bookingUrl,
      query,
      reason: `Não foi possível abrir o site oficial: ${error.message}`
    };
  } finally {
    await page.close();
  }
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
