const FLIGHT_START = /^\d{2}:\d{2}$/;
const AIRPORT = /^[A-Z]{3}$/;
const DURATION = /^stops?\s+\|\s+(\d+)h\s+(\d+)min$/;

export function parseTapResults(capture, { maxStops = 2 } = {}) {
  validateCapture(capture);

  const lines = capture.page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const options = parseFlightOptions(lines)
    .filter((option) => option.stops <= maxStops)
    .sort((a, b) => a.economyPrice - b.economyPrice || a.durationMinutes - b.durationMinutes);

  if (!options.length) throw new Error("Nenhuma opção econômica TAP compatível foi encontrada na captura.");

  return {
    airline: "TAP Air Portugal",
    source: "official-site-capture",
    capturedAt: capture.capturedAt,
    bookingUrl: capture.page.url,
    query: capture.query,
    passengers: capture.passengers,
    cabin: "economy",
    priceScope: "outbound-selection",
    note: "A TAP apresenta a ida antes da seleção do retorno. Os preços abaixo são da escolha da ida e não representam o total final de ida e volta.",
    options,
    cheapestOption: options[0]
  };
}

function validateCapture(capture) {
  if (!capture?.page?.url?.includes("booking.flytap.com") || !capture?.page?.text) {
    throw new Error("A captura não é uma página de resultados da TAP.");
  }
  if (!capture?.query?.origin || !capture?.query?.destination) {
    throw new Error("A captura TAP não contém a consulta original.");
  }
}

function parseFlightOptions(lines) {
  const options = [];

  for (let index = 0; index < lines.length - 6; index += 1) {
    const header = readFlightHeader(lines, index);
    if (!header) continue;

    const nextIndex = findNextFlightStart(lines, index + 1);
    const card = lines.slice(index, nextIndex === -1 ? lines.length : nextIndex);
    const economyPrice = readEconomyPrice(card);
    if (economyPrice === null) continue;

    options.push({
      origin: header.origin,
      destination: header.destination,
      departureTime: header.departureTime,
      arrivalTime: header.arrivalTime,
      arrivalNextDay: header.arrivalNextDay,
      stops: header.stops,
      durationMinutes: header.durationMinutes,
      economyPrice,
      currency: "EUR",
      operatedBy: card.find((line) => line.startsWith("Operated by "))?.replace("Operated by ", "") ?? null,
      availability: card.includes("Last seats at this price!") ? "last_seats" : "available"
    });
  }

  return removeDuplicates(options);
}

function readFlightHeader(lines, index) {
  if (!FLIGHT_START.test(lines[index]) || !AIRPORT.test(lines[index + 1])) return null;
  const stops = Number(lines[index + 2]);
  const duration = lines[index + 3]?.match(DURATION);
  if (!Number.isInteger(stops) || !duration || !FLIGHT_START.test(lines[index + 4])) return null;

  const arrivalNextDay = lines[index + 5] === "+1";
  const destination = lines[index + (arrivalNextDay ? 6 : 5)];
  if (!AIRPORT.test(destination)) return null;

  return {
    departureTime: lines[index],
    origin: lines[index + 1],
    stops,
    durationMinutes: Number(duration[1]) * 60 + Number(duration[2]),
    arrivalTime: lines[index + 4],
    arrivalNextDay,
    destination
  };
}

function findNextFlightStart(lines, from) {
  for (let index = from; index < lines.length - 3; index += 1) {
    if (readFlightHeader(lines, index)) return index;
  }
  return -1;
}

function readEconomyPrice(card) {
  const economyIndex = card.findIndex((line) => line === "Economy");
  if (economyIndex === -1) return null;

  const priceText = card.slice(economyIndex + 1, economyIndex + 4).join(" ");
  const match = priceText.match(/(\d{1,5}),\s*(\d{2})\s*EUR/);
  return match ? Number(`${match[1]}.${match[2]}`) : null;
}

function removeDuplicates(options) {
  const seen = new Set();
  return options.filter((option) => {
    const key = [option.origin, option.destination, option.departureTime, option.arrivalTime, option.stops, option.economyPrice].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
