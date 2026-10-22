# Live Challenge: customer inbox triage

The Live Challenge for **From AI Strategy to Business Value at Hyper Velocity** (Microsoft Innovation Hub, St. Louis, October 22, 2026). In about 20 minutes, with the room steering, GitHub Copilot and HVE Core take one business problem from a one-sentence executive intent to a working prototype, with a person approving every reply.

All data is fictional. Contoso Home is a made-up retailer.

## The challenge

| | |
| --- | --- |
| **Problem** | Customer requests land in a shared inbox and wait for someone to read, sort, and answer them. |
| **Executive intent** | “Every customer request should reach the right team, with a good first reply, the same day.” |
| **Success metric** | Median time to first response, from today’s baseline (set it in `data/baseline.json`) to the same day. |
| **Constraint** | A person approves every reply before it reaches a customer. |

## What is already here, and what the room builds

Already here, as a platform team would provide it:

- `data/requests.json`: 30 requests in the shared inbox
- `data/knowledge.json`: public help articles, plus three internal policies marked `internal: true`
- `server.js` and `public/`: the inbox screen, approvals, and the time-to-first-response measure
- `src/model.js`: optional Azure OpenAI access. The demo runs offline without it.
- `tests/triage.test.js`: the acceptance criteria, failing until the build is done
- `.github/copilot-instructions.md`: the rules Copilot follows

The room builds `triage()` in `src/triage.js`: the category, team, urgency, and reasons for each request, a draft reply grounded in the help articles, and the cases a person must take.

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
| `main` | Start: the inbox loads, nothing is triaged, the tests fail |
| `cp-1-classify` | Category, team, urgency, and reasons for every request |
| `cp-2-drafts` | Draft replies grounded in the public help articles |
| `cp-3-guardrails` | People take refunds over $200, chargebacks, legal and safety reports, and privacy requests; card numbers never appear in drafts; all tests pass |
| `finished` | The full build, plus optional model wording |

If the build runs long or the network fails, jump ahead without leaving a broken screen:

```bash
git checkout -f cp-2-drafts
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
