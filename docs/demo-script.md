# Demo script

The Live Challenge runs 1:20 to 2:00. This script covers the build and the demo. Keep the deck’s build clock (slide 25) on the main screen and work on the second screen, or switch between them at each decision point.

## Before you start

- `main` is checked out, `npm start` is running, and the inbox is open on the main screen. Triage works: categories, teams, drafts, and five requests marked for a person. The briefing panel says “not built yet”.
- Run `npm test` once so the room sees triage pass and the new briefing criteria fail.
- Copilot Chat is open, and **RPI Agent** appears in the agent picker (HVE Core loads from the `lib/hve-core` submodule).

## 1:20 Frame (5 min)

Show the working inbox first: “This already sorts every request and drafts a reply a person approves.” Then the gap: “What a team lead can’t see is which of these will miss today’s promise.” Read the intent as the CEO would say it: “Every customer request should reach the right team, with a good first reply, the same day.” Show the metric and the constraint. Tell the room they will steer at four decisions.

## 1:25 Research (4 min). Decision 1: which data may it use?

Ask the room: *should the briefing show who the customers are and what they wrote, or only request ids, teams, and wait times?*

Recommended answer: ids, teams, and wait times only. Team leads need the queue, not the customers’ words, and that keeps personal data off a screen that gets shared.

Prompt, with the room’s answer added:

```text
/rpi-research Research how to implement briefing() in src/briefing.js so the tests in tests/briefing.test.js pass. Read data/service-levels.json, server.js, src/triage.js, and .github/copilot-instructions.md. Data decision from the room: the briefing uses request ids, teams, status, and timestamps only; no customer names or message text.
```

Point out on screen: it reads first and changes nothing.

## 1:29 Plan (4 min). Decisions 2 and 3: who is the user, and what may it do on its own?

Ask: *who is this for, the agents answering requests or the leads running the teams?* Recommended: team leads and the COO.

Ask: *may it move work between teams on its own?* Recommended: no. It may flag risk, rank teams, and suggest a change; a lead decides.

```text
/rpi-plan Plan the briefing from the research. The users are team leads and the COO. The briefing may flag same-day risk, rank teams, and suggest staffing changes; it may not reassign or change any request. Build in three steps: per-request risk and totals, the view by team, then the recommendations.
```

Read the plan’s acceptance criteria aloud. Say: “a person approves this plan before anything is built.”

## 1:33 Implement (8 min)

```text
/rpi-implement Implement the approved plan, one phase at a time, and run npm test after each phase.
```

As each phase lands, switch to the inbox: the risk tiles fill in and requests get “At risk” and “Missed same day” markers, then the view by team appears, then the suggested changes. Filter the list to **At risk or missed**.

## 1:41 Review (4 min). Decision 4: what needs a person’s approval?

Ask: *what must a person approve here?* Recommended: every staffing change the briefing suggests, as well as every reply.

```text
/rpi-review Review the implementation against tests/briefing.test.js and the rules in .github/copilot-instructions.md.
```

Run `npm test` and show it pass. Approve one suggested change on screen and show it marked “Approved by a lead”.

## 1:45 Demo (10 min)

- Start with **Missed same day**: open one of the Fulfillment requests and approve its draft reply. Watch “Answered the same day” and the time-to-first-response measure move.
- Show the view by team and approve the suggestion for the team under the most pressure.
- Show that the briefing names no customers: request ids only.
- Be clear the clock is simulated; requests age in real time while the server runs.

## 1:55 Debrief (5 min)

Ask: What surprised you? Where did you want a person to step in? What would stop this reaching production in your company?

## If something goes wrong

| Problem | Response |
| --- | --- |
| Copilot or the network stalls | `git checkout -f` the next checkpoint (`cp-1-risk`, `cp-2-teams`, `cp-3-recommendations`) and narrate what that step did |
| A test still fails at review | Show the failure as the review doing its job, then `git checkout -f cp-3-recommendations` |
| Running long | Skip from plan straight to `git checkout -f cp-3-recommendations` and go to the demo |
| The server stops | `npm start` again; the inbox resets, which is fine |
