const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const CATEGORY = {
  order_status: "Order status", returns_refunds: "Returns and refunds", billing: "Billing",
  product_question: "Product question", technical: "Technical issue", complaint: "Complaint", general: "General"
};

let data = null;
let selected = null;
const edits = new Map(); // unsaved draft edits, by request id

function stateOf(item) {
  const t = item.triage || {};
  if (t.error) return ["error", "Triage error"];
  if (item.status === "approved") return ["approved", "Approved"];
  if (item.status === "with_person") return ["person", "With a person"];
  if (!t.category) return ["untriaged", "Not triaged"];
  if (t.needsPerson) return ["person", "Needs a person"];
  if (t.draft) return ["draft", "Draft ready"];
  return ["untriaged", "Triaged, no draft"];
}

function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

function hours(min) { return min == null ? "—" : `${(min / 60).toFixed(1)} h`; }

function renderMetrics(m) {
  const tiles = [
    ["Requests", m.total],
    ["Triaged", `${m.triaged} of ${m.total}`],
    ["Drafts ready to approve", m.draftsReady],
    ["Need a person", m.needsPerson],
    ["Approved replies", m.approved],
    ["Median time to first response", hours(m.medianFirstResponseMinutes), m.baselineHours != null ? `Today: ${m.baselineHours} h` : "Today: set in data/baseline.json"]
  ];
  $("metrics").innerHTML = tiles.map(([label, value, sub], i) =>
    `<div class="metric${i === 5 ? " hero" : ""}"><b>${esc(value)}</b><span>${esc(label)}${sub ? ` · ${esc(sub)}` : ""}</span></div>`).join("");
}

function renderList() {
  const filter = $("filter").value;
  const rows = data.items.filter((item) => {
    const [k] = stateOf(item);
    return filter === "all" || (filter === "untriaged" && k === "untriaged") || (filter === "draft" && k === "draft") ||
      (filter === "person" && k === "person") || (filter === "approved" && k === "approved");
  });
  $("items").innerHTML = rows.map((item) => {
    const [k, label] = stateOf(item);
    const t = item.triage || {};
    const cat = t.category ? CATEGORY[t.category] || t.category : "";
    return `<li><button type="button" data-id="${item.id}" aria-current="${item.id === selected}">
      <span class="subj">${esc(item.subject)}</span><span class="state ${k}">${esc(label)}</span>
      <span class="meta">${esc(item.customer)} · ${esc(item.channel)} · ${ago(item.receivedAt)}${cat ? ` · ${esc(cat)}` : ""}${t.urgency === "high" ? ' · <span class="high">High urgency</span>' : ""}</span>
    </button></li>`;
  }).join("") || `<li><p class="empty" style="padding:14px 18px">Nothing here.</p></li>`;
}

function renderDetail() {
  const item = data.items.find((i) => i.id === selected);
  if (!item) { $("detail").innerHTML = `<p class="empty">Select a request to see its triage and draft reply.</p>`; return; }
  const t = item.triage || {};
  const [k, label] = stateOf(item);
  let html = `<div><p class="meta">${esc(item.id)} · ${esc(item.customer)} · ${esc(item.channel)} · ${ago(item.receivedAt)} · <span class="state ${k}">${esc(label)}</span></p>
    <h2>${esc(item.subject)}</h2></div><p class="body">${esc(item.body)}</p>`;
  if (t.error) {
    html += `<div class="callout error">Triage failed for this request: ${esc(t.error)}</div>`;
  } else if (!t.category) {
    html += `<p class="empty">Not triaged yet. Build <code>triage()</code> in src/triage.js.</p>`;
  } else {
    html += `<dl class="facts">
      <div><dt>Category</dt><dd>${esc(CATEGORY[t.category] || t.category)}</dd></div>
      <div><dt>Team</dt><dd>${esc(t.team || "—")}</dd></div>
      <div><dt>Urgency</dt><dd class="${t.urgency === "high" ? "high" : ""}">${t.urgency === "high" ? "High" : "Normal"}</dd></div>
    </dl>`;
    if (t.reasons?.length) html += `<ul class="reasons">${t.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;
  }
  if (item.status === "approved") {
    html += `<div><p class="meta">Approved reply</p><p class="body">${esc(item.reply)}</p></div>
      <div class="actions"><button class="btn secondary" data-act="reopen">Reopen</button></div>`;
  } else if (item.status === "with_person") {
    html += `<div class="callout">Handed to a person.</div><div class="actions"><button class="btn secondary" data-act="reopen">Reopen</button></div>`;
  } else if (t.needsPerson) {
    html += `<div class="callout">A person must handle this: ${esc(t.needsPersonReason || "flagged for review")}</div>
      <div class="actions"><button class="btn" data-act="handoff">Hand to a person</button></div>`;
  } else if (t.draft) {
    const text = edits.has(item.id) ? edits.get(item.id) : t.draft.text;
    html += `<div><label class="meta" for="draft">Draft reply, for a person to approve</label>
      <textarea id="draft">${esc(text)}</textarea>
      <p class="sources">Sources: ${esc((t.draft.sources || []).join(", ") || "none")}</p></div>
      <div class="actions"><button class="btn" data-act="approve">Approve reply</button><button class="btn secondary" data-act="handoff">Hand to a person</button></div>`;
  }
  $("detail").innerHTML = html;
  const ta = $("draft");
  if (ta) ta.addEventListener("input", () => edits.set(item.id, ta.value));
}

async function load() {
  const res = await fetch("/api/inbox", { cache: "no-store" });
  data = await res.json();
  $("model").textContent = data.model.available ? "Model: Azure OpenAI" : "Model: offline";
  renderMetrics(data.metrics);
  renderList();
  const editing = document.activeElement && document.activeElement.id === "draft";
  if (!editing) renderDetail();
}

async function act(kind) {
  const body = kind === "approve" ? JSON.stringify({ reply: edits.get(selected) }) : "{}";
  await fetch(`/api/requests/${selected}/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body });
  edits.delete(selected);
  await load();
  renderDetail();
}

$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  selected = b.dataset.id;
  renderList();
  renderDetail();
});
$("detail").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-act]");
  if (b) act(b.dataset.act);
});
$("filter").addEventListener("change", renderList);
$("reset").addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
  edits.clear();
  await load();
  renderDetail();
});

await load();
setInterval(() => load().catch(() => {}), 3000);
