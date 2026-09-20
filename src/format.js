export function formatPlan(plan) {
  const lines = ["CONSULTAS PLANEJADAS"];
  for (const [index, query] of plan.entries()) {
    lines.push(`${String(index + 1).padStart(2, "0")}. ${query.origin} → ${query.destination} | ${formatDate(query.departureDate)} → ${formatDate(query.returnDate)} | ${query.stayDays} dias`);
  }
  return lines.join("\n");
}

export function formatRunSummary(results) {
  const completed = results.filter((item) => item.status === "completed").length;
  const blocked = results.filter((item) => item.status === "needs_connector").length;
  return `Concluídas: ${completed} | aguardando conector: ${blocked}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}
