# Contoso Home support inbox

A small, dependency-free Node.js app used for a live demo. A shared customer support inbox (`data/requests.json`) is triaged by `src/triage.js`, shown by `server.js` and `public/`, and every reply is approved by a person before it counts as a response. Triage is finished and tested; the live build adds the same-day briefing.

## What to build

`briefing(items, { now, serviceLevels })` in `src/briefing.js`: the same-day briefing for team leads. The tests in `tests/briefing.test.js` are the acceptance criteria; run them with `npm test`. Do not change `src/triage.js` or its tests; they already pass.

## Rules for the briefing

- **Service levels** come from `data/service-levels.json`: `firstResponseTargetHours` (the same-day promise) and `atRiskAfterHours`. Never hard-code them.
- **Risk** for an open or handed-off request is measured from `receivedAt` to `now`: `breached` at or past the target, `at_risk` at or past the at-risk point, otherwise `on_track`. An approved request is `answered`, measured from `receivedAt` to `approvedAt`, and counts as answered the same day when that is within the target.
- **Teams** come from each request’s `triage.team`. List them most urgent first: most breached, then most at risk, then oldest wait.
- **Recommendations** are suggestions for a team lead, one per team that needs help, each with `requiresApproval: true`. Never reassign work or change a request; a lead approves in the inbox.
- **Privacy:** the briefing refers to requests by id only. Never include customer names or message text.
- Return plain data; the server and screen already render it.

## Rules for the whole app

- **No dependencies.** Node 20+ standard library only. Do not add packages or a build step.

## Rules for triage (already built)

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
