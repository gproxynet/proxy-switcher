import {
  DIRECT, SYSTEM, DEFAULT_BYPASS,
  getState, saveProfiles, setActiveId, findProfile, newId,
} from "./storage.js";

// --- Branding / provider point (edit these two to rebrand the extension) ----
const PROVIDER_URL =
  "https://gproxy.net/?utm_source=chrome&utm_medium=extension&utm_campaign=proxy-switcher";
const GPROXY_PRESET = {
  name: "GProxy",
  color: "#14b8a6",
  scheme: "http",
  host: "",
  port: "",
  hint: "Paste host:port:user:pass from your GProxy dashboard",
};
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const listEl = $("list");
const formEl = $("form");

let state = { profiles: [], activeId: DIRECT };

async function load() {
  state = await getState();
  render();
  checkIp();
}

function render() {
  const active = state.activeId;
  const rows = [];

  rows.push(row({ id: DIRECT, name: "Direct (no proxy)", color: "#8b93a3" }, active, false));
  rows.push(row({ id: SYSTEM, name: "Use system settings", color: "#8b93a3" }, active, false));

  if (state.profiles.length) rows.push(sep("Your proxies"));
  for (const p of state.profiles) rows.push(row(p, active, true));

  rows.push(sep("Quick add"));
  rows.push(presetRow());

  listEl.replaceChildren(...rows);
  updateStatus();
}

function sep(text) {
  const li = document.createElement("li");
  li.className = "sep";
  li.textContent = text;
  return li;
}

function row(profile, activeId, editable) {
  const li = document.createElement("li");
  li.className = "item" + (profile.id === activeId ? " active" : "");

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = profile.color || "#8b93a3";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = profile.name;

  li.append(dot, name);

  if (editable) {
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${profile.scheme}//${profile.host}:${profile.port}`;
    const edit = document.createElement("button");
    edit.className = "edit";
    edit.textContent = "edit";
    edit.title = "Edit";
    edit.addEventListener("click", (e) => { e.stopPropagation(); openForm(profile); });
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.title = "Delete";
    del.addEventListener("click", (e) => { e.stopPropagation(); removeProfile(profile.id); });
    li.append(meta, edit, del);
  }

  li.addEventListener("click", () => switchTo(profile.id));
  return li;
}

function presetRow() {
  const li = document.createElement("li");
  li.className = "item";
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = GPROXY_PRESET.color;
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = `+ Add ${GPROXY_PRESET.name} proxy`;
  li.append(dot, name);
  li.addEventListener("click", () => openForm(null, GPROXY_PRESET));
  return li;
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

// --- add / edit form --------------------------------------------------------
function openForm(profile, preset) {
  $("form-title").textContent = profile ? "Edit proxy" : `Add ${preset?.name || "proxy"}`;
  $("f-id").value = profile?.id || "";
  $("f-name").value = profile?.name || preset?.name || "";
  $("f-scheme").value = profile?.scheme || preset?.scheme || "http";
  $("f-color").value = profile?.color || preset?.color || "#14b8a6";
  $("f-host").value = profile?.host || preset?.host || "";
  $("f-host").placeholder = preset?.hint || "gate.example.com";
  $("f-port").value = profile?.port || preset?.port || "";
  $("f-user").value = profile?.username || "";
  $("f-pass").value = profile?.password || "";
  $("f-bypass").value = (profile?.bypassList || DEFAULT_BYPASS).join(", ");
  formEl.classList.remove("hidden");
  document.body.classList.add("form-open");
  $("f-name").focus();
}

function closeForm() {
  formEl.classList.add("hidden");
  document.body.classList.remove("form-open");
  formEl.reset();
}

// Let the user paste a full "host:port:user:pass" (or a URL) into Host and
// auto-fill the rest — matches how providers hand out proxy strings.
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

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("f-id").value || newId();
  const profile = {
    id,
    name: $("f-name").value.trim() || "Proxy",
    color: $("f-color").value,
    scheme: $("f-scheme").value,
    host: $("f-host").value.trim(),
    port: Number($("f-port").value),
    username: $("f-user").value.trim(),
    password: $("f-pass").value,
    bypassList: $("f-bypass").value.split(",").map((s) => s.trim()).filter(Boolean),
  };
  const existing = state.profiles.findIndex((p) => p.id === id);
  if (existing >= 0) state.profiles[existing] = profile;
  else state.profiles.push(profile);
  await saveProfiles(state.profiles);
  closeForm();
  await switchTo(id); // activate what you just saved
});

async function removeProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  await saveProfiles(state.profiles);
  if (state.activeId === id) await switchTo(DIRECT);
  else render();
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
      const bits = [d.ip, place, d.connection?.isp].filter(Boolean);
      el.textContent = bits.join(" · ");
    } else {
      el.textContent = "IP lookup unavailable";
    }
  } catch {
    el.textContent = "IP lookup failed (offline?)";
  }
}

// --- wiring -----------------------------------------------------------------
$("add-btn").addEventListener("click", () => openForm(null));
$("f-cancel").addEventListener("click", closeForm);
$("ip-refresh").addEventListener("click", checkIp);
const getProxies = $("get-proxies");
getProxies.href = PROVIDER_URL;
getProxies.textContent = "Need proxies? Get residential & mobile →";

load();
