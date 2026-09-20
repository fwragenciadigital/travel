export function buildTapBookingUrl(query, passengers) {
  const params = new URLSearchParams({
    origin: query.origin,
    destination: query.destination,
    flexibleDates: "false",
    flightType: "return",
    adt: String(passengers.adults),
    chd: String(passengers.children),
    inf: "0",
    yth: "0",
    depDate: formatTapDate(query.departureDate),
    headerfooterhidden: "false",
    retDate: formatTapDate(query.returnDate),
    x_tap_source: "WEB"
  });
  return `https://booking.flytap.com/booking/flights?${params}`;
}

function formatTapDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}
