// Firefox background (event page, classic script — no ES imports).
// Firefox proxies at the REQUEST level via browser.proxy.onRequest, which is a
// different model from Chrome's global chrome.proxy.settings.set(). Popup and
// storage are shared with the Chrome build unchanged.

const DIRECT = "direct";
const SYSTEM = "system";
const DEFAULT_BYPASS = ["localhost", "127.0.0.1", "<local>"];
const SCHEME_TO_TYPE = { http: "http", https: "https", socks4: "socks4", socks5: "socks" };

// Resolved active profile + its bypass, cached in memory for the hot onRequest path.
let active = { info: { type: "direct" }, bypass: DEFAULT_BYPASS, auth: null, id: DIRECT };

async function getState() {
  const { profiles = [], activeId = DIRECT } = await browser.storage.local.get(["profiles", "activeId"]);
  return { profiles, activeId };
}
function findProfile(profiles, id) {
  return profiles.find((p) => p.id === id) || null;
}

function proxyInfoFor(profile) {
  if (!profile || profile.id === DIRECT || profile.id === SYSTEM) return { type: "direct" };
  const info = {
    type: SCHEME_TO_TYPE[profile.scheme] || "http",
    host: profile.host,
    port: Number(profile.port),
  };
  if (profile.username || profile.password) {
    info.username = profile.username || "";
    info.password = profile.password || "";
  }
  if (profile.scheme === "socks5") info.proxyDNS = true; // resolve DNS through the proxy
  return info;
}

function hostBypassed(host, bypass) {
  if (!host) return false;
  const h = host.toLowerCase();
  for (const rule of bypass) {
    if (rule === "<local>") {
      if (!h.includes(".") || h.endsWith(".local")) return true;
    } else if (h === rule || h.endsWith("." + rule)) {
      return true;
    }
  }
  return false;
}

async function apply(activeId) {
  const { profiles } = await getState();
  let profile;
  if (activeId === DIRECT || activeId === SYSTEM) profile = { id: activeId };
  else profile = findProfile(profiles, activeId) || { id: DIRECT };

  active = {
    id: profile.id,
    info: proxyInfoFor(profile),
    bypass: profile.bypassList?.length ? profile.bypassList : DEFAULT_BYPASS,
    auth: profile.username || profile.password
      ? { username: profile.username || "", password: profile.password || "" }
      : null,
  };
  if (profile.id !== DIRECT && profile.id !== SYSTEM) {
    await browser.storage.local.set({ lastProfileId: profile.id });
  }
  await paintBadge(profile);
}

// The core: decide a proxy per request.
browser.proxy.onRequest.addListener(
  (req) => {
    if (active.info.type === "direct") return { type: "direct" };
    let host = "";
    try { host = new URL(req.url).hostname; } catch (_) {}
    if (hostBypassed(host, active.bypass)) return { type: "direct" };
    return active.info;
  },
  { urls: ["<all_urls>"] }
);

// Supply credentials for authenticated proxies (belt-and-suspenders alongside
// the username/password in proxyInfo, which some proxy types ignore).
browser.webRequest.onAuthRequired.addListener(
  (details) => (details.isProxy && active.auth ? { authCredentials: active.auth } : {}),
  { urls: ["<all_urls>"] },
  ["blocking"]
);

browser.commands.onCommand.addListener(async (command) => {
  const { activeId, profiles } = await getState();
  if (command === "disable-proxy") {
    await browser.storage.local.set({ activeId: DIRECT });
    return apply(DIRECT);
  }
  if (command === "toggle-proxy") {
    const proxyOn = activeId !== DIRECT && activeId !== SYSTEM;
    if (proxyOn) {
      await browser.storage.local.set({ activeId: DIRECT });
      return apply(DIRECT);
    }
    const { lastProfileId } = await browser.storage.local.get("lastProfileId");
    const target = lastProfileId && findProfile(profiles, lastProfileId) ? lastProfileId : profiles[0]?.id;
    if (target) {
      await browser.storage.local.set({ activeId: target });
      return apply(target);
    }
  }
});

async function paintBadge(profile) {
  const on = profile.id !== DIRECT && profile.id !== SYSTEM;
  await browser.action.setBadgeText({ text: on ? "ON" : "" });
  if (on) {
    await browser.action.setBadgeBackgroundColor({ color: profile.color || "#14b8a6" });
    await browser.action.setTitle({ title: `Proxy Switcher — ${profile.name || ""}` });
  } else {
    await browser.action.setTitle({
      title: profile.id === SYSTEM ? "Proxy Switcher — System (Direct on Firefox)" : "Proxy Switcher — Direct",
    });
  }
}

browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "switch") {
    apply(msg.activeId).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  if (msg?.type === "reapply") {
    getState().then(({ activeId }) => apply(activeId)).then(() => sendResponse({ ok: true }));
    return true;
  }
});

browser.runtime.onStartup.addListener(() => getState().then(({ activeId }) => apply(activeId)));
browser.runtime.onInstalled.addListener(() => getState().then(({ activeId }) => apply(activeId)));
getState().then(({ activeId }) => apply(activeId));
