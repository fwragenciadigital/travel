import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.js";
import { formatPlan, formatRunSummary } from "./format.js";
import { buildSearchPlan } from "./plan.js";
import { runOfficialSites } from "./run.js";

const args = new Set(process.argv.slice(2));
const config = await loadConfig();
const plan = buildSearchPlan(config);

console.log(`${config.tripName} | ${config.passengers.adults} adultos + ${config.passengers.children} criança | econômica | bagagem de mão | até ${config.maxStops} escalas`);
console.log(formatPlan(plan));

if (args.has("--plan")) process.exit(0);
if (!args.has("--run")) {
  console.log("\nUse npm run plan para revisar as consultas ou npm run run:headed para abrir os sites oficiais.");
  process.exit(0);
}

const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : undefined;
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit deve ser um número inteiro positivo.");

const results = await runOfficialSites(config, plan, { headed: args.has("--headed"), limit });
const outputPath = path.resolve("output", `run-${new Date().toISOString().replaceAll(":", "-")}.json`);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
console.log(`\n${formatRunSummary(results)}`);
console.log(`Arquivo gerado: ${outputPath}`);
