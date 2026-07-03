import {
  DIRECT, SYSTEM, DEFAULT_BYPASS,
  getState, saveProfiles, setActiveId, findProfile, newId, flagEmoji,
} from "./storage.js";

// Works with ANY proxy provider. This single link (footer) is the only
// provider mention — swap it to point the referral elsewhere.
const PROVIDER_URL =
  "https://gproxy.net/?utm_source=chrome&utm_medium=extension&utm_campaign=proxy-switcher";

const PALETTE = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#22c55e", "#38bdf8", "#a855f7", "#ef4444"];

const $ = (id) => document.getElementById(id);
const listEl = $("list");
const formEl = $("form");
const importEl = $("import");

let state = { profiles: [], activeId: DIRECT };

async function load() {
  state = await getState();
  render();
  checkIp();
}

// --- list -------------------------------------------------------------------
function render() {
  const active = state.activeId;
  const rows = [
    row({ id: DIRECT, name: "Direct (no proxy)", color: "#8b93a3" }, active, false),
    row({ id: SYSTEM, name: "Use system settings", color: "#8b93a3" }, active, false),
  ];
  if (state.profiles.length) {
    rows.push(sep(`Your proxies (${state.profiles.length})`));
    for (const p of state.profiles) rows.push(row(p, active, true));
  } else {
    rows.push(emptyHint());
  }
  listEl.replaceChildren(...rows);
  updateStatus();
}

function sep(text) {
  const li = document.createElement("li");
  li.className = "sep";
  li.textContent = text;
  return li;
}

function emptyHint() {
  const li = sep("No proxies yet — Add one or Import a list.");
  li.style.textTransform = "none";
  li.style.letterSpacing = "0";
  return li;
}

function row(profile, activeId, editable) {
  const li = document.createElement("li");
  li.className = "item" + (profile.id === activeId ? " active" : "");

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = profile.color || "#8b93a3";
  li.append(dot);

  if (editable) {
    const flag = flagEmoji(profile.countryCode);
    if (flag) {
      const f = document.createElement("span");
      f.className = "flag";
      f.textContent = flag;
      li.append(f);
    }
  }

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = profile.name;
  li.append(name);

  if (editable) {
    li.title = `${profile.scheme}://${profile.host}:${profile.port}`;
    const geoText = profile.city || profile.countryCode || "";
    if (geoText) {
      const geo = document.createElement("span");
      geo.className = "geo";
      geo.textContent = geoText;
      li.append(geo);
    }
    const edit = mkBtn("edit", "edit", "Edit", (e) => { e.stopPropagation(); openForm(profile); });
    const del = mkBtn("del", "✕", "Delete", (e) => { e.stopPropagation(); removeProfile(profile.id); });
    li.append(edit, del);
  }

  li.addEventListener("click", () => switchTo(profile.id));
  return li;
}

function mkBtn(cls, text, title, onClick) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = text;
  b.title = title;
  b.addEventListener("click", onClick);
  return b;
}

function updateStatus() {
  const active =
    state.activeId === DIRECT ? { name: "Direct", color: "#8b93a3" } :
    state.activeId === SYSTEM ? { name: "System settings", color: "#8b93a3" } :
    findProfile(state.profiles, state.activeId) || { name: "Direct", color: "#8b93a3" };
  $("status-name").textContent = active.name;
  $("status-dot").style.background = active.color || "#8b93a3";
}

async function switchTo(id) {
  await setActiveId(id);
  state.activeId = id;
  const res = await chrome.runtime.sendMessage({ type: "switch", activeId: id });
  render();
  if (res?.ok) checkIp();
}

// --- single add / edit ------------------------------------------------------
function openForm(profile) {
  closeImport();
  $("form-title").textContent = profile ? "Edit proxy" : "Add proxy";
  $("f-id").value = profile?.id || "";
  $("f-name").value = profile?.name || "";
  $("f-scheme").value = profile?.scheme || "http";
  $("f-color").value = profile?.color || PALETTE[state.profiles.length % PALETTE.length];
  $("f-host").value = profile?.host || "";
  $("f-port").value = profile?.port || "";
  $("f-user").value = profile?.username || "";
  $("f-pass").value = profile?.password || "";
  $("f-bypass").value = (profile?.bypassList || DEFAULT_BYPASS).join(", ");
  formEl.dataset.cc = profile?.countryCode || "";
  formEl.dataset.city = profile?.city || "";
  formEl.classList.remove("hidden");
  document.body.classList.add("form-open");
  $("f-name").focus();
}

function closeForm() {
  formEl.classList.add("hidden");
  document.body.classList.remove("form-open");
  formEl.reset();
}

$("f-host").addEventListener("paste", (e) => {
  const text = (e.clipboardData || window.clipboardData).getData("text").trim();
  const parsed = parseProxyString(text);
  if (parsed) {
    e.preventDefault();
    $("f-host").value = parsed.host;
    if (parsed.port) $("f-port").value = parsed.port;
    if (parsed.scheme) $("f-scheme").value = parsed.scheme;
    if (parsed.username != null) $("f-user").value = parsed.username;
    if (parsed.password != null) $("f-pass").value = parsed.password;
  }
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("f-id").value || newId();
  const host = $("f-host").value.trim();
  const profile = {
    id,
    name: $("f-name").value.trim() || host || "Proxy",
    color: $("f-color").value,
    scheme: $("f-scheme").value,
    host,
    port: Number($("f-port").value),
    username: $("f-user").value.trim(),
    password: $("f-pass").value,
    bypassList: $("f-bypass").value.split(",").map((s) => s.trim()).filter(Boolean),
    countryCode: formEl.dataset.cc || "",
    city: formEl.dataset.city || "",
  };
  // Best-effort geo detection when we don't already have it.
  if (!profile.countryCode) {
    const g = await resolveGeo(profile.host);
    if (g) { profile.countryCode = g.countryCode; if (!profile.city) profile.city = g.city; }
  }
  const idx = state.profiles.findIndex((p) => p.id === id);
  if (idx >= 0) state.profiles[idx] = profile;
  else state.profiles.push(profile);
  await saveProfiles(state.profiles);
  closeForm();
  await switchTo(id);
});

async function removeProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  await saveProfiles(state.profiles);
  if (state.activeId === id) await switchTo(DIRECT);
  else render();
}

// --- bulk import ------------------------------------------------------------
function openImport() {
  closeForm();
  $("import-text").value = "";
  $("import-status").textContent = "";
  importEl.classList.remove("hidden");
  document.body.classList.add("import-open");
  $("import-text").focus();
}

function closeImport() {
  importEl.classList.add("hidden");
  document.body.classList.remove("import-open");
}

$("import-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const cur = $("import-text").value.trim();
  $("import-text").value = cur ? cur + "\n" + text : text;
  e.target.value = "";
});

$("import-go").addEventListener("click", async () => {
  const status = (t) => ($("import-status").textContent = t);
  const detect = $("import-detect").checked;
  const parsed = $("import-text").value.split(/\r?\n/).map(parseLine).filter(Boolean);
  if (!parsed.length) { status("No valid proxies found."); return; }

  const seen = new Set(state.profiles.map((p) => `${p.host}:${p.port}`));
  const fresh = [];
  let dupes = 0;
  parsed.forEach((p, i) => {
    const key = `${p.host}:${p.port}`;
    if (seen.has(key)) { dupes++; return; }
    seen.add(key);
    fresh.push(buildProfile(p, state.profiles.length + fresh.length));
  });
  if (!fresh.length) { status(`Nothing new (${dupes} already in your list).`); return; }

  if (detect) {
    const need = fresh.filter((p) => !p.countryCode);
    let done = 0;
    await mapPool(need, 5, async (p) => {
      const g = await resolveGeo(p.host);
      if (g) { p.countryCode = g.countryCode; if (!p.city) p.city = g.city; }
      status(`Detecting location ${++done}/${need.length}…`);
    });
  }

  state.profiles.push(...fresh);
  await saveProfiles(state.profiles);
  status(`Imported ${fresh.length}${dupes ? `, skipped ${dupes} duplicate(s)` : ""}.`);
  render();
  setTimeout(closeImport, 700);
});

$("import-cancel").addEventListener("click", closeImport);

function buildProfile(p, index) {
  return {
    id: newId(),
    name: p.city || p.host,
    color: PALETTE[index % PALETTE.length],
    scheme: p.scheme || "http",
    host: p.host,
    port: Number(p.port),
    username: p.username || "",
    password: p.password || "",
    bypassList: DEFAULT_BYPASS.slice(),
    countryCode: p.countryCode || "",
    city: p.city || "",
  };
}

// One import line -> parsed proxy, honoring an optional "country,city," label.
function parseLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#")) return null;
  let countryCode = "", city = "", rest = line;
  if (line.includes(",")) {
    const parts = line.split(",").map((s) => s.trim());
    rest = parts.pop();
    const codeTok = parts.find((t) => /^[A-Za-z]{2}$/.test(t));
    if (codeTok) countryCode = codeTok.toUpperCase();
    const cityTok = parts.filter((t) => t !== codeTok).pop();
    if (cityTok) city = cityTok;
  }
  const p = parseProxyString(rest);
  if (!p || !p.host || !p.port) return null;
  return { ...p, countryCode, city };
}

// --- shared proxy-string parsing --------------------------------------------
function parseProxyString(text) {
  if (!text) return null;
  try {
    if (text.includes("://")) {
      const u = new URL(text);
      return {
        scheme: u.protocol.replace(":", ""),
        host: u.hostname,
        port: u.port,
        username: u.username ? decodeURIComponent(u.username) : null,
        password: u.password ? decodeURIComponent(u.password) : null,
      };
    }
  } catch { /* fall through to colon parsing */ }
  let creds = null, hostport = text;
  if (text.includes("@")) {
    const at = text.lastIndexOf("@");
    creds = text.slice(0, at);
    hostport = text.slice(at + 1);
  }
  const parts = hostport.split(":");
  if (creds) {
    const [username, password] = creds.split(":");
    if (parts.length >= 2) return { host: parts[0], port: parts[1], username, password: password ?? null };
  }
  if (parts.length === 4) return { host: parts[0], port: parts[1], username: parts[2], password: parts[3] };
  if (parts.length === 2) return { host: parts[0], port: parts[1] };
  return null;
}

// --- geo lookup -------------------------------------------------------------
async function resolveGeo(host) {
  if (!host) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(host)}`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    const d = await r.json();
    if (d && d.success !== false) return { countryCode: d.country_code || "", city: d.city || "" };
  } catch { /* offline / rate-limited / bad host — skip silently */ }
  return null;
}

async function mapPool(items, limit, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// --- live IP check ----------------------------------------------------------
async function checkIp() {
  const el = $("ip-text");
  el.textContent = "Checking IP…";
  el.classList.add("muted");
  try {
    const r = await fetch("https://ipwho.is/", { cache: "no-store" });
    const d = await r.json();
    if (d && d.success !== false && d.ip) {
      const place = [d.city, d.country].filter(Boolean).join(", ");
      el.textContent = [d.ip, place, d.connection?.isp].filter(Boolean).join(" · ");
    } else {
      el.textContent = "IP lookup unavailable";
    }
  } catch {
    el.textContent = "IP lookup failed (offline?)";
  }
}

// --- wiring -----------------------------------------------------------------
$("add-btn").addEventListener("click", () => openForm(null));
$("import-btn").addEventListener("click", openImport);
$("f-cancel").addEventListener("click", closeForm);
$("ip-refresh").addEventListener("click", checkIp);
const getProxies = $("get-proxies");
getProxies.href = PROVIDER_URL;

load();
