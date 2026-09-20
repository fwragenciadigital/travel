import fs from "node:fs/promises";
import path from "node:path";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function loadConfig(file = "config/search.json") {
  const absolutePath = path.resolve(file);
  const config = JSON.parse(await fs.readFile(absolutePath, "utf8"));
  validate(config);
  return config;
}

function validate(config) {
  if (!Array.isArray(config.origins) || config.origins.length === 0) throw new Error("Informe ao menos uma origem.");
  if (!config.origins.every((airport) => /^[A-Z]{3}$/.test(airport))) throw new Error("As origens precisam usar códigos IATA.");
  if (!/^[A-Z]{3}$/.test(config.destination)) throw new Error("O destino precisa usar código IATA.");
  if (!ISO_DATE.test(config.departureWindow?.from) || !ISO_DATE.test(config.departureWindow?.to)) throw new Error("Datas devem usar AAAA-MM-DD.");
  if (config.departureWindow.from > config.departureWindow.to) throw new Error("A data inicial não pode ser posterior à final.");
  if (!Number.isInteger(config.stayDays?.min) || !Number.isInteger(config.stayDays?.max) || config.stayDays.min > config.stayDays.max) throw new Error("A duração da viagem é inválida.");
  if (!Number.isInteger(config.passengers?.adults) || config.passengers.adults < 1) throw new Error("Informe ao menos um adulto.");
  if (!Number.isInteger(config.passengers?.children) || config.passengers.children < 0) throw new Error("A quantidade de crianças é inválida.");
  if (!Number.isInteger(config.maxStops) || config.maxStops < 0 || config.maxStops > 2) throw new Error("O máximo de escalas deve ficar entre 0 e 2.");
}
