export function parseTapReview(capture) {
  if (!capture?.page?.url?.includes("/review-your-trip") || !capture?.page?.text) {
    throw new Error("A captura não é a página de revisão da viagem da TAP.");
  }

  const totalSection = capture.page.text.match(/Total with login([\s\S]*?)(?:Price Breakdown|$)/i)?.[1];
  if (!totalSection) throw new Error("A TAP não exibiu a seção de total nesta captura.");

  const displayedAmounts = [...totalSection.matchAll(/(\d{1,3}(?:\.\d{3})*),\s*(\d{2})\s*EUR/g)]
    .map((match) => Number(`${match[1].replaceAll(".", "")}.${match[2]}`));
  if (!displayedAmounts.length) throw new Error("A TAP não exibiu um total em EUR nesta captura.");

  const total = displayedAmounts.at(-1);
  const originalTotal = displayedAmounts.length > 1 ? displayedAmounts[0] : null;

  return {
    airline: "TAP Air Portugal",
    source: "official-site-capture",
    capturedAt: capture.capturedAt,
    bookingUrl: capture.page.url,
    query: capture.query,
    passengers: capture.passengers,
    status: "final_total_displayed",
    total,
    currency: "EUR",
    originalTotal,
    displayedDiscount: originalTotal === null ? null : Number((originalTotal - total).toFixed(2)),
    note: "Total exibido pela TAP antes de dados de passageiros e pagamento. Não representa uma reserva emitida."
  };
}
