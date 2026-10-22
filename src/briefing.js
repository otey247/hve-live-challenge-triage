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

// The queue by team, most urgent first: most missed, then most at risk, then oldest wait.
function teamsFor(items, risks) {
  const teams = new Map();
  for (const item of items) {
    const r = risks[item.id];
    if (r.risk === "answered") continue;
    const name = item.triage?.team || "Unassigned";
    const t = teams.get(name) || { team: name, open: 0, atRisk: 0, breached: 0, oldestWaitingHours: 0 };
    t.open++;
    if (r.risk === "at_risk") t.atRisk++;
    if (r.risk === "breached") t.breached++;
    t.oldestWaitingHours = Math.max(t.oldestWaitingHours, r.waitingHours);
    teams.set(name, t);
  }
  return [...teams.values()].sort(
    (a, b) => b.breached - a.breached || b.atRisk - a.atRisk || b.oldestWaitingHours - a.oldestWaitingHours
  );
}

// A team with no misses still needs help once this many of its requests are at risk.
const AT_RISK_PRESSURE = 3;

// One suggestion per team that needs help. These are suggestions for a lead to approve:
// nothing is reassigned automatically, and they name teams and counts, never customers.
function recommendationsFor(teams) {
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const out = [];
  for (const t of teams) {
    if (t.breached > 0) {
      out.push({
        team: t.team,
        text: `${t.team}: ${plural(t.breached, "request")} past the same-day promise${t.atRisk ? ` and ${t.atRisk} more at risk` : ""}; the oldest has waited ${t.oldestWaitingHours} hours. Move one more agent onto ${t.team} until the queue clears.`,
        requiresApproval: true
      });
    } else if (t.atRisk >= AT_RISK_PRESSURE) {
      out.push({
        team: t.team,
        text: `${t.team}: ${plural(t.atRisk, "request")} at risk of missing the same-day reply. Ask the team to answer the oldest first.`,
        requiresApproval: true
      });
    }
  }
  return out;
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

  const teams = teamsFor(items, risks);
  return {
    totals: totalsFor(items, risks),
    requests,
    teams,
    recommendations: recommendationsFor(teams)
  };
}
