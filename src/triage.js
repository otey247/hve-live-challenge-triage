// Triage for one customer request: category, team, urgency, the reasons behind them,
// and a draft reply grounded in the public help articles, for a person to approve.
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

// Which public help articles answer each kind of request. First match wins; [] is the default.
const ARTICLE_RULES = {
  order_status: [[["cancel", "delivery address"], ["KB-103"]], [["ship", "canada"], ["KB-101"]], [["delivered"], ["KB-102"]], [["delayed", "due today"], ["KB-102", "KB-101"]], [[], ["KB-102"]]],
  returns_refunds: [[["broken", "cracked", "shattered", "damaged", "wrong item"], ["KB-201"]], [["exchange"], ["KB-201"]], [["refund"], ["KB-202"]], [[], ["KB-201", "KB-202"]]],
  billing: [[["charged twice", "charged"], ["KB-301"]], [["card"], ["KB-304"]], [["paypal", "promo code", "payment"], ["KB-302"]], [["invoice", "tax"], ["KB-303"]], [[], ["KB-302"]]],
  product_question: [[["warranty", "leg"], ["KB-402"]], [["assembly", "instructions", "missing", "screws"], ["KB-403"]], [[], ["KB-401"]]],
  technical: [[["error", "checkout"], ["KB-502"]], [["password", "log in", "login", "app"], ["KB-501"]], [[], ["KB-502"]]],
  complaint: [[[], ["KB-601"]]],
  general: [[[], ["KB-001"]]]
};

const OPENERS = {
  order_status: (o) => (o ? `Thanks for getting in touch about your order${o}.` : "Thanks for getting in touch."),
  returns_refunds: (o) => `I’m sorry about the trouble with your order${o}.`,
  billing: (o) => `Thanks for letting us know${o ? ` about order${o}` : ""}.`,
  product_question: (o) => `Thanks for your question${o ? ` about order${o}` : ""}.`,
  technical: () => "Sorry you’re having trouble.",
  complaint: () => "I’m sorry about your experience, and thank you for telling us.",
  general: () => "Thank you for your message."
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (p) => new RegExp(`\\b${escapeRe(p)}\\b`, "i");
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

function articlesFor(text, category, knowledge) {
  const rule = ARTICLE_RULES[category].find(([words]) => !words.length || firstMatch(text, words));
  return rule[1].map((id) => knowledge.find((a) => a.id === id)).filter((a) => a && !a.internal);
}

function draftReply(request, text, category, knowledge) {
  const articles = articlesFor(text, category, knowledge);
  const order = text.match(/\bORD-\d+\b/)?.[0];
  const firstName = request.customer.split(" ")[0];
  const body = [
    `Hi ${firstName},`,
    OPENERS[category](order ? ` ${order}` : ""),
    articles.map((a) => a.text).join(" "),
    "If anything else comes up, just reply to this message.",
    "Best regards,\nContoso Home support"
  ].join("\n\n");
  return { text: body, sources: articles.map((a) => a.id), requiresApproval: true };
}

/**
 * @param {object} request  one item from data/requests.json
 * @param {object} context  { knowledge, model }
 */
export async function triage(request, context) {
  const text = `${request.subject}\n${request.body}`;
  const { category, reason: categoryReason } = classify(text);
  const { urgency, reason: urgencyReason } = urgencyOf(text, category);
  const draft = draftReply(request, text, category, context.knowledge);

  return {
    category,
    team: TEAMS[category],
    urgency,
    reasons: [categoryReason, `Routed to ${TEAMS[category]}`, urgencyReason, `Reply grounded in ${draft.sources.join(", ")}`],
    draft,
    needsPerson: false,
    needsPersonReason: null
  };
}
