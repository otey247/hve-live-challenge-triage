// Triage for one customer request. This is the file the Live Challenge builds.
//
// The server calls triage() for every request in the inbox and shows the result.
// Each result must say which team gets the request, how urgent it is, why, and
// either a draft reply for a person to approve or a reason a person must take it.
//
// The acceptance criteria are the tests in tests/triage.test.js. They fail until
// this is built. Run them with: npm test

/**
 * @param {object} request  one item from data/requests.json
 * @param {object} context  { knowledge: articles from data/knowledge.json, model: from src/model.js }
 * @returns {Promise<{
 *   category: string|null,      // order_status | returns_refunds | billing | product_question | technical | complaint | general
 *   team: string|null,          // the team that owns the category
 *   urgency: "high"|"normal"|null,
 *   reasons: string[],          // plain-language reasons a person can check
 *   draft: { text: string, sources: string[], requiresApproval: true }|null,
 *   needsPerson: boolean,       // true when a person must handle it instead of approving a draft
 *   needsPersonReason: string|null
 * }>}
 */
export async function triage(request, context) {
  // TODO(live challenge): research, plan, implement, and review this function.
  return {
    category: null,
    team: null,
    urgency: null,
    reasons: [],
    draft: null,
    needsPerson: false,
    needsPersonReason: null
  };
}
