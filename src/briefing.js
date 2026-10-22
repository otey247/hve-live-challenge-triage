// Same-day briefing for team leads. This is the file the Live Challenge builds.
//
// Triage already works: every request has a category, a team, an urgency, and either a
// draft for a person to approve or a reason a person must take it. What leads can't see
// is which requests will miss the same-day promise until it's too late.
//
// The server calls briefing() on every refresh and shows the result above the inbox.
// The acceptance criteria are the tests in tests/briefing.test.js. Run them with: npm test

/**
 * @param {Array<object>} items  inbox items, as the server holds them:
 *   { id, customer, subject, body, receivedAt, status: "open"|"approved"|"with_person",
 *     approvedAt, triage: { team, urgency, needsPerson, draft } }
 * @param {object} options  { now: epoch ms, serviceLevels: data/service-levels.json }
 * @returns {null | {
 *   totals: { open, onTrack, atRisk, breached, needsPerson, answered, answeredSameDay },
 *   requests: { [id]: { risk: "on_track"|"at_risk"|"breached"|"answered", waitingHours } },
 *   teams: Array<{ team, open, atRisk, breached, oldestWaitingHours }>,   // most urgent team first
 *   recommendations: Array<{ team, text, requiresApproval: true }>
 * }}
 */
export function briefing(items, options) {
  // TODO(live challenge): research, plan, implement, and review this function.
  return null;
}
