# Demo script

The Live Challenge runs 1:20 to 2:00. This script covers the build and the demo. Keep the deck’s build clock (slide 24) on the main screen and work on the second screen, or switch between them at each decision point.

## Before you start

- `main` is checked out, `npm start` is running, and the inbox is open on the main screen with every request showing “Not triaged”.
- Run `npm test` once so the room sees the acceptance criteria fail.
- Copilot Chat is open, with HVE Core loaded.

## 1:20 Frame (5 min)

Read the intent aloud as the CEO would say it: “Every customer request should reach the right team, with a good first reply, the same day.” Show the metric and the constraint, then show the empty inbox. Tell the room they will steer at four decisions.

## 1:25 Research (4 min). Decision 1: which data may it use?

Ask the room: *the request text and public help articles only, or also our internal policies, or also order and payment records?*

Recommended answer: the request and the public help articles for replies; the internal policies may shape routing and the needs-a-person rules but are never quoted to a customer; no payment records.

Prompt, with the room’s answer added:

```text
/rpi-research Research how to implement triage() in src/triage.js so the tests in tests/triage.test.js pass. Read data/requests.json, data/knowledge.json, and .github/copilot-instructions.md. Data decision from the room: replies may use only the request and public help articles; internal articles may inform routing and the needs-a-person rules but must never be quoted or cited; no payment records.
```

Point out on screen: it reads first and changes nothing.

## 1:29 Plan (4 min). Decisions 2 and 3: who is the user, and what may the agent do on its own?

Ask: *who uses this, the customer or a support agent?* Recommended: a support agent, who sees every draft before it goes out.

Ask: *what may the agent do on its own?* Recommended: classify, route, set urgency, and draft. Not send, refund, or change an account.

```text
/rpi-plan Plan the triage implementation from the research. The user is a support agent who approves every draft. The agent may classify, route, set urgency, and draft replies on its own; it may not send, refund, or change accounts. Build in three steps: classification with reasons, grounded drafts, then the needs-a-person rules and card masking.
```

Read the plan’s acceptance criteria aloud. Say: “a person approves this plan before anything is built.”

## 1:33 Implement (8 min)

```text
/rpi-implement Implement the approved plan, one phase at a time, and run npm test after each phase.
```

As each phase lands, switch to the inbox: categories and teams appear, then drafts, then the needs-a-person flags. Approve two or three drafts so the time-to-first-response measure moves.

## 1:41 Review (4 min). Decision 4: what needs a person’s approval?

Ask: *what must a person approve, and what should a person take over entirely?* Recommended: every reply is approved; a person takes refunds above $200, chargebacks, legal threats, safety reports, and privacy requests.

```text
/rpi-review Review the implementation against tests/triage.test.js and the rules in .github/copilot-instructions.md.
```

Run `npm test` and show it pass. Open REQ-1022 (the collapsed shelf) and REQ-1004 (the $1,249 refund) to show they went to a person with no draft.

## 1:45 Demo (10 min)

- Filter to **Draft ready** and approve several, editing one draft on screen.
- Show **Need a person** and why each one is there.
- Show the median time to first response next to today’s baseline. Be clear the demo clock is simulated.

## 1:55 Debrief (5 min)

Ask: What surprised you? Where did you want a person to step in? What would stop this reaching production in your company?

## If something goes wrong

| Problem | Response |
| --- | --- |
| Copilot or the network stalls | `git checkout` the next checkpoint (`cp-1-classify`, `cp-2-drafts`, `cp-3-guardrails`) and narrate what that step did |
| A test still fails at review | Show the failure as the review doing its job, then `git checkout cp-3-guardrails` |
| Running long | Skip from plan straight to `git checkout cp-3-guardrails` and go to the demo |
| The server stops | `npm start` again; the inbox resets, which is fine |
