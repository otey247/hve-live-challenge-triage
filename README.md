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

Needs Node.js 20 or later. There is nothing to install.

```bash
npm start
```

Open http://localhost:3000. `npm start` restarts the server whenever a file changes, so the inbox fills in as the build lands. To check the acceptance criteria:

```bash
npm test
```

## Set up the demo laptop

1. VS Code with **GitHub Copilot** signed in. Open this folder and accept the recommended extensions, which include **HVE Core** (`ise-hve-essentials.hve-core`) from the VS Code Marketplace.
2. Run `npm start` and open the inbox in a browser on the main screen.
3. Set today’s baseline in `data/baseline.json`.
4. Optional: real model wording. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` before `npm start`. The header shows “Model: Azure OpenAI”. Leave them unset on an unreliable network.

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
git checkout cp-2-drafts
```

To reset for a rehearsal:

```bash
git checkout main
```

## Rehearsal checklist

- Run the full build twice on the Hub’s network, timed, and record one clean run as the fallback.
- Confirm the HVE Core extension loads and `/rpi-research` appears in Copilot Chat.
- Check the inbox is readable from the back of the room; zoom the browser if needed.
- Have the `finished` branch checked out in a second clone, ready to show.
