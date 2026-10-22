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

// Cases a person must take, with no draft. Each rule names the internal policy behind it.
// Internal policies shape these decisions but are never quoted to the customer.
const PERSON_RULES = [
  {
    applies: (text) => /\b(chargeback|lawyer|attorney|legal action|sue)\b/i.test(text),
    reason: () => "Mentions a chargeback or legal action, so the customer care lead handles it",
    policy: "KB-901"
  },
  {
    applies: (text) => /\b(injur\w*|hurt|hit my|collapsed|fire)\b/i.test(text),
    reason: () => "Reports an injury or safety issue, so the customer care lead handles it",
    policy: "KB-901"
  },
  {
    applies: (text) => /\b(delete my account|personal data|erase my data)\b/i.test(text),
    reason: () => "Asks to delete their account or personal data, so the privacy team verifies and handles it",
    policy: "KB-902"
  },
  {
    applies: (text, category) => category === "returns_refunds" && largestAmount(text) > 200,
    reason: (text) => `Refund of $${largestAmount(text).toLocaleString("en-US")} is above the $200 agent limit, so a team lead must approve it`,
    policy: "KB-900"
  }
];

function largestAmount(text) {
  const amounts = [...text.matchAll(/\$\s?([\d,]+(?:\.\d{2})?)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  return amounts.length ? Math.max(...amounts) : 0;
}

// Never repeat a payment card number: keep only the last four digits.
const maskCards = (text) => text.replace(/\b(?:\d[ -]?){12,15}(\d{4})\b/g, "the card ending $1");

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
  return { text: maskCards(body), sources: articles.map((a) => a.id), requiresApproval: true };
}

// Optional: when a model is configured, let it make the template warmer, using only the
// facts already in the draft. Its output passes the same rules, or the template is kept.
async function improveWording(draft, request, { model }) {
  if (!model?.available) return null;
  const firstName = request.customer.split(" ")[0];
  const out = await model.complete([
    { role: "system", content: "You rewrite customer support replies to sound warm and natural. Keep every fact exactly as given, add no new facts, promises, or links, keep the greeting and sign-off, and stay under 160 words." },
    { role: "user", content: `Customer message:\n${request.body}\n\nDraft reply to rewrite:\n${draft.text}` }
  ]);
  if (!out) return null;
  const text = maskCards(out.trim());
  if (!text.includes(firstName) || /INTERNAL/i.test(text) || text.length > 1400) return null;
  return text;
}

/**
 * @param {object} request  one item from data/requests.json
 * @param {object} context  { knowledge, model }
 */
export async function triage(request, context) {
  const text = `${request.subject}\n${request.body}`;
  const { category, reason: categoryReason } = classify(text);
  const { urgency, reason: urgencyReason } = urgencyOf(text, category);
  const reasons = [categoryReason, `Routed to ${TEAMS[category]}`, urgencyReason];

  const personRules = PERSON_RULES.filter((rule) => rule.applies(text, category));
  if (personRules.length) {
    const whys = personRules.map((rule) => rule.reason(text));
    return {
      category,
      team: TEAMS[category],
      urgency: "high",
      reasons: [...reasons, ...personRules.map((rule, i) => `Needs a person: ${whys[i]} (policy ${rule.policy})`)],
      draft: null,
      needsPerson: true,
      needsPersonReason: whys.join(". ")
    };
  }

  const draft = draftReply(request, text, category, context.knowledge);
  const worded = await improveWording(draft, request, context);
  if (worded) {
    draft.text = worded;
    reasons.push("Wording improved by the model; facts come only from the cited articles");
  }
  return {
    category,
    team: TEAMS[category],
    urgency,
    reasons: [...reasons, `Reply grounded in ${draft.sources.join(", ")}`],
    draft,
    needsPerson: false,
    needsPersonReason: null
  };
}
