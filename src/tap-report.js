import fs from "node:fs/promises";
import path from "node:path";
import { parseTapResults } from "./tap-results.js";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Informe o arquivo de validação TAP. Exemplo: npm run tap:parse -- output/tap-validation-...json");

const capture = JSON.parse(await fs.readFile(path.resolve(sourcePath), "utf8"));
const report = parseTapResults(capture);
const outputPath = path.resolve("output", `tap-results-${new Date().toISOString().replaceAll(":", "-")}.json`);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

console.log(`Opções elegíveis: ${report.options.length}`);
console.log(`Melhor ida: ${report.cheapestOption.origin} → ${report.cheapestOption.destination} | ${report.cheapestOption.stops} escala(s) | ${report.cheapestOption.durationMinutes} min | ${report.cheapestOption.economyPrice.toFixed(2)} EUR`);
console.log(`Arquivo gerado: ${outputPath}`);
