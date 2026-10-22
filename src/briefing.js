// Same-day briefing for team leads: which requests will miss the same-day promise.
// The acceptance criteria are the tests in tests/briefing.test.js. Run them with: npm test

const HOUR = 3_600_000;
const round1 = (n) => Math.round(n * 10) / 10;

// Risk for one request, against the service levels in data/service-levels.json.
function riskFor(item, now, { firstResponseTargetHours: target, atRiskAfterHours: atRisk }) {
  if (item.status === "approved" && item.approvedAt) {
    const hours = (item.approvedAt - item.receivedAt) / HOUR;
    return { risk: "answered", waitingHours: round1(hours), sameDay: hours <= target };
  }
  const hours = (now - item.receivedAt) / HOUR;
  const risk = hours >= target ? "breached" : hours >= atRisk ? "at_risk" : "on_track";
  return { risk, waitingHours: round1(hours) };
}

function totalsFor(items, risks) {
  const totals = { open: 0, onTrack: 0, atRisk: 0, breached: 0, needsPerson: 0, answered: 0, answeredSameDay: 0 };
  for (const item of items) {
    const r = risks[item.id];
    if (r.risk === "answered") {
      totals.answered++;
      if (r.sameDay) totals.answeredSameDay++;
      continue;
    }
    totals.open++;
    if (r.risk === "on_track") totals.onTrack++;
    if (r.risk === "at_risk") totals.atRisk++;
    if (r.risk === "breached") totals.breached++;
    if (item.status === "with_person" || item.triage?.needsPerson) totals.needsPerson++;
  }
  return totals;
}

/**
 * @param {Array<object>} items  inbox items, as the server holds them
 * @param {object} options  { now: epoch ms, serviceLevels: data/service-levels.json }
 */
export function briefing(items, { now, serviceLevels }) {
  const risks = {};
  for (const item of items) risks[item.id] = riskFor(item, now, serviceLevels);

  const requests = {};
  for (const [id, { risk, waitingHours }] of Object.entries(risks)) requests[id] = { risk, waitingHours };

  return {
    totals: totalsFor(items, risks),
    requests,
    teams: [],
    recommendations: []
  };
}
