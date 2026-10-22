// Acceptance criteria for src/briefing.js. They fail until the Live Challenge builds it.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { triage } from "../src/triage.js";
import { briefing } from "../src/briefing.js";

const readJson = async (rel) => JSON.parse(await readFile(new URL(rel, import.meta.url), "utf-8"));
const knowledge = (await readJson("../data/knowledge.json")).articles;
const requests = await readJson("../data/requests.json");
const serviceLevels = await readJson("../data/service-levels.json");
const offline = { available: false, async complete() { return null; } };

const NOW = Date.UTC(2026, 9, 22, 18, 0, 0);
const HOUR = 3_600_000;

// Build the inbox the way the server does.
async function inbox(changes = {}) {
  return Promise.all(requests.map(async (r) => ({
    ...r,
    receivedAt: NOW - r.receivedMinutesAgo * 60_000,
    status: "open",
    approvedAt: null,
    triage: await triage(r, { knowledge, model: offline }),
    ...(changes[r.id] || {})
  })));
}
const run = async (changes) => briefing(await inbox(changes), { now: NOW, serviceLevels });

test("every open request is on track, at risk, or breached", async () => {
  const b = await run();
  assert.ok(b, "briefing() returns a result");
  assert.equal(b.totals.open, requests.length);
  assert.equal(b.totals.onTrack + b.totals.atRisk + b.totals.breached, b.totals.open);
});

test("a request waiting longer than the same-day target is breached", async () => {
  const b = await run();
  assert.equal(b.requests["REQ-1001"].risk, "breached");
  assert.ok(b.requests["REQ-1001"].waitingHours > serviceLevels.firstResponseTargetHours);
});

test("a request waiting past the at-risk point, but within the target, is at risk", async () => {
  const b = await run();
  assert.equal(b.requests["REQ-1005"].risk, "at_risk");
});

test("a recent request is on track", async () => {
  const b = await run();
  assert.equal(b.requests["REQ-1030"].risk, "on_track");
});

test("a reply approved within the target counts as answered the same day", async () => {
  const b = await run({ "REQ-1010": { status: "approved", approvedAt: NOW - 1 * HOUR } });
  assert.equal(b.requests["REQ-1010"].risk, "answered");
  assert.equal(b.totals.answered, 1);
  assert.equal(b.totals.answeredSameDay, 1);
  assert.equal(b.totals.open, requests.length - 1);
});

test("requests a person must handle are counted", async () => {
  const b = await run();
  assert.equal(b.totals.needsPerson, 5);
});

test("teams are listed most urgent first, with their oldest wait", async () => {
  const b = await run();
  assert.equal(b.teams[0].team, "Fulfillment");
  assert.ok(b.teams[0].breached >= 2);
  for (let i = 1; i < b.teams.length; i++) {
    assert.ok(b.teams[i - 1].breached >= b.teams[i].breached, "sorted by breached");
  }
  assert.ok(b.teams[0].oldestWaitingHours > serviceLevels.firstResponseTargetHours);
});

test("every recommendation names a team and needs a person's approval", async () => {
  const b = await run();
  assert.ok(b.recommendations.length > 0);
  for (const r of b.recommendations) {
    assert.ok(b.teams.some((t) => t.team === r.team), `unknown team ${r.team}`);
    assert.equal(r.requiresApproval, true);
    assert.ok(r.text.length > 0);
  }
});

test("the briefing never repeats customer names or message text", async () => {
  const b = await run();
  assert.ok(b, "briefing() returns a result");
  const text = JSON.stringify(b);
  for (const r of requests) {
    assert.ok(!text.includes(r.customer), `mentions ${r.customer}`);
    assert.ok(!text.includes(r.body.slice(0, 30)), `quotes ${r.id}`);
  }
});

test("an empty inbox gives an empty briefing", () => {
  const b = briefing([], { now: NOW, serviceLevels });
  assert.equal(b.totals.open, 0);
  assert.deepEqual(b.teams, []);
  assert.deepEqual(b.recommendations, []);
});
