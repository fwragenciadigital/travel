export function buildTapBookingUrl(query, passengers, correlationId) {
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
    x_tap_source: "WEB",
    x_tap_username: "",
    x_tap_correlationid: correlationId
  });
  return `https://booking.flytap.com/booking/flights?${params}`;
}

function formatTapDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}
