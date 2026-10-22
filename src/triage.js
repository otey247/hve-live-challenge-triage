// Triage for one customer request: category, team, urgency, and the reasons behind them.
// The acceptance criteria are the tests in tests/triage.test.js. Run them with: npm test

const TEAMS = {
  order_status: "Fulfillment",
  returns_refunds: "Returns",
  billing: "Billing",
  product_question: "Product support",
  technical: "Digital support",
  complaint: "Customer care",
  general: "Customer care"
};

const LABELS = {
  order_status: "order status",
  returns_refunds: "returns and refunds",
  billing: "billing",
  product_question: "product question",
  technical: "technical issue",
  complaint: "complaint",
  general: "general"
};

// First match wins, so the most specific categories come first.
const CATEGORY_RULES = [
  ["complaint", ["third time", "not happy", "unhappy", "rude", "chargeback", "lawyer", "collapsed"]],
  ["billing", ["charged twice", "charged", "paypal", "card", "promo code", "invoice", "tax", "payment", "payments"]],
  ["returns_refunds", ["refund", "return", "exchange", "broken", "cracked", "shattered", "damaged", "wrong item"]],
  ["technical", ["log in", "login", "password", "app", "error", "checkout", "delete my account"]],
  ["product_question", ["dimensions", "solid", "veneer", "warranty", "assembly", "instructions", "missing", "screws", "leg"]],
  ["order_status", ["where is", "tracking", "delivered", "delayed", "due today", "cancel", "ship", "delivery address"]],
  ["general", ["thank you", "thanks"]]
];

const URGENT_WORDS = ["urgent", "urgently", "asap", "charged twice", "cancel", "chargeback", "lawyer", "third time", "collapsed"];

const phrase = (p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
const firstMatch = (text, words) => words.find((w) => phrase(w).test(text));

function classify(text) {
  for (const [category, words] of CATEGORY_RULES) {
    const hit = firstMatch(text, words);
    if (hit) return { category, reason: `Category ${LABELS[category]}: mentions “${hit}”` };
  }
  return { category: "general", reason: "Category general: no specific topic found" };
}

function urgencyOf(text, category) {
  const hit = firstMatch(text, URGENT_WORDS);
  if (hit) return { urgency: "high", reason: `High urgency: mentions “${hit}”` };
  if (category === "complaint") return { urgency: "high", reason: "High urgency: complaints are reviewed first" };
  return { urgency: "normal", reason: "Normal urgency: no urgent signals" };
}

/**
 * @param {object} request  one item from data/requests.json
 * @param {object} context  { knowledge, model }
 */
export async function triage(request, context) {
  const text = `${request.subject}\n${request.body}`;
  const { category, reason: categoryReason } = classify(text);
  const { urgency, reason: urgencyReason } = urgencyOf(text, category);

  return {
    category,
    team: TEAMS[category],
    urgency,
    reasons: [categoryReason, `Routed to ${TEAMS[category]}`, urgencyReason],
    draft: null,
    needsPerson: false,
    needsPersonReason: null
  };
}
