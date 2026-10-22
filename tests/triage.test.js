// Acceptance criteria for src/triage.js. They fail until the Live Challenge builds it.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { triage } from "../src/triage.js";

const readJson = async (rel) => JSON.parse(await readFile(new URL(rel, import.meta.url), "utf-8"));
const knowledge = (await readJson("../data/knowledge.json")).articles;
const requests = await readJson("../data/requests.json");
const offline = { available: false, async complete() { return null; } };
const run = (id) => triage(requests.find((r) => r.id === id), { knowledge, model: offline });

const TEAMS = {
  order_status: "Fulfillment",
  returns_refunds: "Returns",
  billing: "Billing",
  product_question: "Product support",
  technical: "Digital support",
  complaint: "Customer care",
  general: "Customer care"
};
const CARD = /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/;
const publicIds = new Set(knowledge.filter((a) => !a.internal).map((a) => a.id));

test("every request gets a category, the matching team, an urgency, and a reason", async () => {
  for (const r of requests) {
    const t = await triage(r, { knowledge, model: offline });
    assert.ok(Object.keys(TEAMS).includes(t.category), `${r.id}: category ${t.category}`);
    assert.equal(t.team, TEAMS[t.category], `${r.id}: team`);
    assert.ok(["high", "normal"].includes(t.urgency), `${r.id}: urgency`);
    assert.ok(t.reasons.length > 0, `${r.id}: reasons`);
  }
});

test("order questions go to fulfillment", async () => {
  const t = await run("REQ-1001");
  assert.equal(t.category, "order_status");
  assert.equal(t.team, "Fulfillment");
});

test("a duplicate charge is billing and high urgency", async () => {
  const t = await run("REQ-1005");
  assert.equal(t.category, "billing");
  assert.equal(t.urgency, "high");
});

test("an urgent cancellation is high urgency", async () => {
  const t = await run("REQ-1014");
  assert.equal(t.category, "order_status");
  assert.equal(t.urgency, "high");
});

test("refunds above the $200 agent limit go to a person, with no draft", async () => {
  for (const id of ["REQ-1004", "REQ-1029"]) {
    const t = await run(id);
    assert.equal(t.category, "returns_refunds", id);
    assert.equal(t.needsPerson, true, id);
    assert.equal(t.draft, null, id);
    assert.match(t.needsPersonReason, /200|team lead/i, id);
  }
});

test("a refund within the limit gets a draft", async () => {
  const t = await run("REQ-1021");
  assert.equal(t.needsPerson, false);
  assert.ok(t.draft);
});

test("chargebacks, legal threats, and safety reports go to a person, with no draft", async () => {
  for (const id of ["REQ-1012", "REQ-1022"]) {
    const t = await run(id);
    assert.equal(t.needsPerson, true, id);
    assert.equal(t.draft, null, id);
  }
});

test("privacy requests go to a person, with no draft", async () => {
  const t = await run("REQ-1017");
  assert.equal(t.needsPerson, true);
  assert.equal(t.draft, null);
});

test("drafts never repeat a payment card number", async () => {
  const t = await run("REQ-1007");
  assert.ok(t.draft, "the card update request still gets a draft");
  assert.doesNotMatch(t.draft.text, CARD);
});

test("every draft requires approval and cites public knowledge only", async () => {
  for (const r of requests) {
    const t = await triage(r, { knowledge, model: offline });
    if (!t.draft) continue;
    assert.equal(t.draft.requiresApproval, true, `${r.id}: requiresApproval`);
    assert.ok(t.draft.sources.length > 0, `${r.id}: sources`);
    for (const s of t.draft.sources) assert.ok(publicIds.has(s), `${r.id}: ${s} is not a public article`);
    assert.doesNotMatch(t.draft.text, /INTERNAL/, `${r.id}: quotes an internal article`);
  }
});

test("drafts greet the customer by name and mention the order number", async () => {
  const t = await run("REQ-1001");
  assert.match(t.draft.text, /Maya/);
  assert.match(t.draft.text, /ORD-48213/);
});

test("most of the inbox gets a draft ready to approve", async () => {
  let drafts = 0;
  for (const r of requests) {
    const t = await triage(r, { knowledge, model: offline });
    if (t.draft && !t.needsPerson) drafts++;
  }
  assert.ok(drafts >= 20, `only ${drafts} drafts`);
});
