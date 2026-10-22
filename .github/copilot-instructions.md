# Contoso Home support inbox

A small, dependency-free Node.js app used for a live demo. A shared customer support inbox (`data/requests.json`) is triaged by `src/triage.js`, shown by `server.js` and `public/`, and every reply is approved by a person before it counts as a response.

## What to build

`triage(request, { knowledge, model })` in `src/triage.js`. The tests in `tests/triage.test.js` are the acceptance criteria; run them with `npm test`.

## Rules

- **No dependencies.** Node 20+ standard library only. Do not add packages or a build step.
- **Nothing is sent.** Triage produces a draft. A person approves it in the inbox. Every draft has `requiresApproval: true`.
- **Explainable.** Every result carries plain-language `reasons` a support agent can check, such as which words set the category or urgency.
- **Categories and teams:**

  | Category | Team |
  | --- | --- |
  | `order_status` | Fulfillment |
  | `returns_refunds` | Returns |
  | `billing` | Billing |
  | `product_question` | Product support |
  | `technical` | Digital support |
  | `complaint` | Customer care |
  | `general` | Customer care |

- **A person must handle it, with no draft,** when a refund is above the $200 agent limit, the customer mentions a chargeback or legal action, reports an injury or safety issue, or asks to delete their account or personal data. Set `needsPerson: true` and a `needsPersonReason`.
- **Knowledge:** drafts are grounded in `data/knowledge.json` and list the article ids they used in `draft.sources`. Articles marked `internal: true` may inform routing and the needs-a-person rules but must never be quoted in, or cited by, a draft.
- **Privacy:** never repeat a payment card number in a draft.
- **Model:** `context.model` may be unavailable (`available: false`). Everything must work without it. If it is available, it may improve the wording of a draft, but the rules above still apply to its output.
- Keep functions small and readable; this code is shown on a projector.
