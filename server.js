// Contoso Home support inbox: a small server with no dependencies.
//
// It loads the shared inbox, runs src/triage.js on every request and src/briefing.js
// across the whole inbox, and serves the inbox screen. Replies are never sent anywhere: "Approve" records a person's
// approval, which is what the success metric measures.
//
// Start it with `npm start` (restarts on every file change) and open http://localhost:3000

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { triage } from "./src/triage.js";
import { createModel } from "./src/model.js";
import { briefing } from "./src/briefing.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const STATIC = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"]
};

const readJson = async (rel) => JSON.parse(await readFile(path.join(ROOT, rel), "utf-8"));

const startedAt = Date.now();
const knowledge = (await readJson("data/knowledge.json")).articles;
const baseline = await readJson("data/baseline.json");
const serviceLevels = await readJson("data/service-levels.json");
const approvedRecommendations = new Set(); // teams whose recommendation a lead approved
const model = createModel();
const cache = new Map();

let inbox = [];
async function resetInbox() {
  const requests = await readJson("data/requests.json");
  inbox = requests.map((r) => ({
    ...r,
    receivedAt: startedAt - r.receivedMinutesAgo * 60_000,
    status: "open",
    approvedAt: null,
    reply: null
  }));
  cache.clear();
  approvedRecommendations.clear();
}
await resetInbox();

async function triageOne(item) {
  if (model.available && cache.has(item.id)) return cache.get(item.id);
  let result;
  try {
    const { id, channel, customer, subject, body } = item;
    result = await triage({ id, channel, customer, subject, body }, { knowledge, model });
  } catch (err) {
    result = { error: String(err?.message || err) };
  }
  if (model.available && !result.error) cache.set(item.id, result);
  return result;
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function inboxView() {
  const items = await Promise.all(inbox.map(async (item) => ({ ...item, triage: await triageOne(item) })));
  const open = items.filter((i) => i.status === "open");
  const responseMinutes = items
    .filter((i) => i.status === "approved")
    .map((i) => (i.approvedAt - i.receivedAt) / 60_000);
  let brief = null;
  try {
    const b = briefing(items, { now: Date.now(), serviceLevels });
    brief = b && {
      ...b,
      recommendations: (b.recommendations || []).map((r) => ({ ...r, approved: approvedRecommendations.has(r.team) }))
    };
  } catch (err) {
    brief = { error: String(err?.message || err) };
  }
  return {
    items,
    briefing: brief,
    serviceLevels,
    model: { available: model.available },
    metrics: {
      total: items.length,
      triaged: items.filter((i) => i.triage && i.triage.category).length,
      draftsReady: open.filter((i) => i.triage?.draft && !i.triage?.needsPerson).length,
      needsPerson: open.filter((i) => i.triage?.needsPerson).length + items.filter((i) => i.status === "with_person").length,
      approved: items.filter((i) => i.status === "approved").length,
      medianFirstResponseMinutes: median(responseMinutes),
      baselineHours: baseline.medianFirstResponseHours
    }
  };
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf-8")); } catch { return {}; }
}

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      return send(res, 200, await readFile(path.join(ROOT, file)), type);
    }
    if (req.method === "GET" && url.pathname === "/api/inbox") {
      return send(res, 200, await inboxView());
    }
    const action = url.pathname.match(/^\/api\/requests\/(REQ-\d+)\/(approve|handoff|reopen)$/);
    if (req.method === "POST" && action) {
      const item = inbox.find((i) => i.id === action[1]);
      if (!item) return send(res, 404, { error: "No request with that id" });
      const input = await body(req);
      if (action[2] === "approve") {
        const t = await triageOne(item);
        if (!t?.draft || t.needsPerson) return send(res, 409, { error: "There is no approvable draft for this request" });
        item.status = "approved";
        item.approvedAt = Date.now();
        item.reply = typeof input.reply === "string" && input.reply.trim() ? input.reply : t.draft.text;
      } else if (action[2] === "handoff") {
        item.status = "with_person";
      } else {
        item.status = "open";
        item.approvedAt = null;
        item.reply = null;
      }
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/recommendations/approve") {
      const { team } = await body(req);
      if (typeof team !== "string" || !team) return send(res, 400, { error: "Say which team's recommendation to approve" });
      approvedRecommendations.add(team);
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/reset") {
      await resetInbox();
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: "Not found" });
  } catch (err) {
    send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`Contoso Home support inbox: http://localhost:${PORT}`);
  console.log(model.available ? "Model: Azure OpenAI deployment configured" : "Model: none configured (offline mode)");
});
