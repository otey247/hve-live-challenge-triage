# Live Challenge: same-day briefing for a customer support inbox

The Live Challenge for **From AI Strategy to Business Value at Hyper Velocity** (Microsoft Innovation Hub, St. Louis, October 22, 2026). The room starts from a working product: a shared support inbox that already triages every request and drafts replies for a person to approve. In about 20 minutes, with the room steering, GitHub Copilot and HVE Core take one new capability from a one-sentence executive intent to working software.

All data is fictional. Contoso Home is a made-up retailer.

## The challenge

| | |
| --- | --- |
| **Problem** | Triage works, but team leads can’t see which requests will miss the same-day promise until it’s too late. |
| **Executive intent** | “Every customer request should reach the right team, with a good first reply, the same day.” |
| **Success metric** | Share of requests answered the same day, and median time to first response against today’s baseline (set it in `data/baseline.json`). |
| **Constraint** | A person approves every reply and every change to who works on what. |

## What already works, and what the room builds

Already working:

- **Triage** (`src/triage.js`): every request gets a category, a team, an urgency, and plain-language reasons. 25 of 30 get a draft reply grounded in the public help articles; 5 go to a person (refunds over $200, a chargeback, a legal and safety report, a privacy request). Card numbers never appear in drafts. Its 12 tests pass.
- **The inbox** (`server.js`, `public/`): approve or hand off each request, and watch the time-to-first-response measure move.
- **Data**: 30 requests (`data/requests.json`), public help articles and three internal policies (`data/knowledge.json`), and the same-day service levels (`data/service-levels.json`: a first reply within 8 hours, at risk after 4).
- **Optional model access** (`src/model.js`): Azure OpenAI can warm up the wording of drafts. The demo runs offline without it.
- **Rules for Copilot** (`.github/copilot-instructions.md`) and **HVE Core** (the `lib/hve-core` submodule).

The room builds `briefing()` in `src/briefing.js`, the same-day briefing for team leads:

- each open request marked on track, at risk, or missed against the same-day target
- a view by team: open requests, at risk, missed, and the oldest wait
- suggested staffing changes that a lead must approve; nothing is reassigned automatically
- no customer names or message text in the briefing

The acceptance criteria are `tests/briefing.test.js`. They fail until the build is done; until then the screen shows “Same-day briefing: not built yet”.

## Run it

Needs Node.js 20 or later and Git. Clone with the HVE Core submodule (a ZIP download from GitHub leaves `lib/hve-core` empty):

```bash
git clone --recurse-submodules https://github.com/otey247/hve-live-challenge-triage.git
```

There is nothing else to install. From the repository folder:

```bash
npm start
```

Open http://localhost:3000. `npm start` restarts the server whenever a file changes, so the inbox fills in as the build lands. To check the acceptance criteria:

```bash
npm test
```

## Set up the demo laptop

1. VS Code with **GitHub Copilot** signed in. Open this folder and accept the recommended extensions. HVE Core loads from the `lib/hve-core` submodule; see [HVE Core in this repository](#hve-core-in-this-repository).
2. Run `npm start` and open the inbox in a browser on the main screen.
3. Set today’s baseline in `data/baseline.json`.
4. Optional: real model wording. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` before `npm start`. The header shows “Model: Azure OpenAI”. Leave them unset on an unreliable network.

## HVE Core in this repository

[HVE Core](https://github.com/microsoft/hve-core) is a Git submodule at `lib/hve-core`, pinned to a tested commit so everyone who clones this repository gets the version used in the demo. `.vscode/settings.json` points Copilot Chat at its agents, instructions, and skills: the research, plan, implement, and review workflow, design thinking, project planning, coding standards, security, and Responsible AI. HVE Core writes its research and plans to `.copilot-tracking/`, which is ignored.

Check it loaded: open Copilot Chat (`Ctrl+Alt+I`), open the agent picker, and look for **RPI Agent**; typing `/` should offer `/rpi-research`. If not, run **Developer: Reload Window**.

If you already have the HVE Core extension installed, disable it for this workspace (Extensions view, HVE Core, **Disable (Workspace)**) so its agents don’t appear twice.

If you cloned without the submodule:

```bash
git submodule update --init --recursive
```

To move to a newer HVE Core, test it, then commit the new pin:

```bash
git submodule update --remote lib/hve-core
```

HVE Core is fast-moving and has no support commitment, so update between events, not on the day.

The minute-by-minute script, with the prompt to use at each step, is in [docs/demo-script.md](docs/demo-script.md).

## Branches and checkpoints

| Ref | State |
| --- | --- |
| `main` | Start: triage and the inbox fully work; the briefing tests fail and the screen says the briefing isn’t built |
| `cp-1-risk` | Each request marked on track, at risk, or missed, with totals |
| `cp-2-teams` | The view by team, most urgent first, with the oldest wait |
| `cp-3-recommendations` | Staffing suggestions a lead approves, with no customer details; all tests pass |
| `finished` | The full build |

If the build runs long or the network fails, jump ahead without leaving a broken screen:

```bash
git checkout -f cp-2-teams
```

`-f` discards the live edits, so the checkout works mid-build.

To reset for a rehearsal:

```bash
git checkout -f main
```

## Rehearsal checklist

- Run the full build twice on the Hub’s network, timed, and record one clean run as the fallback.
- Confirm **RPI Agent** appears in the Copilot Chat agent picker and `/rpi-research` is offered (see [HVE Core in this repository](#hve-core-in-this-repository)).
- Check the inbox is readable from the back of the room; zoom the browser if needed.
- Have the `finished` branch checked out in a second clone, ready to show.
