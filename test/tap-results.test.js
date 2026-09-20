import assert from "node:assert/strict";
import test from "node:test";
import { parseTapResults } from "../src/tap-results.js";
import { parseTapReview } from "../src/tap-review.js";

const capture = {
  capturedAt: "2026-09-20T14:00:55.140Z",
  query: { origin: "FLR", destination: "GRU", departureDate: "2027-01-10", returnDate: "2027-02-19" },
  passengers: { adults: 2, children: 1 },
  page: {
    url: "https://booking.flytap.com/booking/flights",
    text: [
      "35 CONNECTING FLIGHTS",
      "12:20", "FLR", "1", "stop | 15h 35min", "23:55", "GRU", "Flight details", "Operated by TAP Air Portugal +1", "Economy", "1739,", "35 EUR", "Business", "Sold out",
      "06:25", "FLR", "2", "stops | 21h 30min", "23:55", "GRU", "Flight details", "Last seats at this price!", "Economy", "1953,", "60 EUR", "Business", "Sold out",
      "08:00", "FLR", "3", "stops | 25h 00min", "09:00", "+1", "GRU", "Flight details", "Economy", "1200,", "00 EUR"
    ].join("\n")
  }
};

test("interpreta, ordena e limita as opções econômicas TAP", () => {
  const report = parseTapResults(capture, { maxStops: 2 });

  assert.equal(report.options.length, 2);
  assert.equal(report.cheapestOption.economyPrice, 1739.35);
  assert.equal(report.options[1].availability, "last_seats");
  assert.equal(report.priceScope, "outbound-selection");
});

test("interpreta o total final exibido na revisão da TAP", () => {
  const report = parseTapReview({
    ...capture,
    page: {
      url: "https://booking.flytap.com/booking/review-your-trip",
      text: "Total with login\n2.678,32 EUR\n2.658,32 EUR\nPrice Breakdown"
    }
  });

  assert.equal(report.total, 2658.32);
  assert.equal(report.originalTotal, 2678.32);
  assert.equal(report.displayedDiscount, 20);
});
