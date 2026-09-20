const DAY = 24 * 60 * 60 * 1000;

function toDate(value) {
  return new Date(`${value}T12:00:00Z`);
}

function toIso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY);
}

export function buildSearchPlan(config) {
  const candidates = [];
  const from = toDate(config.departureWindow.from);
  const to = toDate(config.departureWindow.to);
  const stayLengths = [...new Set(config.scan.stayLengths)]
    .filter((days) => days >= config.stayDays.min && days <= config.stayDays.max)
    .sort((a, b) => a - b);

  for (let departure = from; departure <= to; departure = addDays(departure, config.scan.departureStepDays)) {
    for (const stayDays of stayLengths) {
      for (const origin of config.origins) {
        candidates.push({
          origin,
          destination: config.destination,
          departureDate: toIso(departure),
          returnDate: toIso(addDays(departure, stayDays)),
          stayDays
        });
      }
    }
  }

  return balanceOriginsAndDurations(candidates, config.scan.maxQueriesPerAirline);
}

function balanceOriginsAndDurations(candidates, maximum) {
  const count = Math.min(maximum, candidates.length);
  const selected = [];
  for (let position = 0; position < count; position += 1) {
    const index = Math.floor((position * candidates.length) / count);
    selected.push(candidates[index]);
  }
  return selected;
}
