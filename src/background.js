// Service worker: applies the active proxy profile, supplies auth
// credentials, and reflects state on the toolbar badge.
import { DIRECT, SYSTEM, DEFAULT_BYPASS, getState, findProfile } from "./storage.js";

// Credentials of the currently active profile, cached for onAuthRequired
// (the listener must answer fast and can't await storage on every callback).
let activeAuth = null; // { username, password } | null

function proxyConfigFor(profile) {
  if (!profile || profile.id === DIRECT) return { mode: "direct" };
  if (profile.id === SYSTEM) return { mode: "system" };
  const bypassList = profile.bypassList?.length ? profile.bypassList : DEFAULT_BYPASS;
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: profile.scheme,
        host: profile.host,
        port: Number(profile.port),
      },
      bypassList,
    },
  };
}

async function apply(activeId) {
  const { profiles } = await getState();
  let profile;
  if (activeId === DIRECT) profile = { id: DIRECT };
  else if (activeId === SYSTEM) profile = { id: SYSTEM };
  else profile = findProfile(profiles, activeId);

  if (!profile) {
    // Stored profile vanished (deleted) — fall back to direct.
    profile = { id: DIRECT };
    activeId = DIRECT;
  }

  await chrome.proxy.settings.set({ value: proxyConfigFor(profile), scope: "regular" });
  activeAuth =
    profile.username || profile.password
      ? { username: profile.username || "", password: profile.password || "" }
      : null;
  await paintBadge(profile);
}

async function paintBadge(profile) {
  const on = profile.id !== DIRECT && profile.id !== SYSTEM;
  await chrome.action.setBadgeText({ text: on ? "ON" : "" });
  if (on) {
    await chrome.action.setBadgeBackgroundColor({ color: profile.color || "#14b8a6" });
    await chrome.action.setTitle({ title: `Proxy Switcher — ${profile.name}` });
  } else {
    await chrome.action.setTitle({
      title: profile.id === SYSTEM ? "Proxy Switcher — System" : "Proxy Switcher — Direct",
    });
  }
}

// Provide credentials for authenticated proxies. asyncBlocking lets us
// answer only for our own proxy and stay out of the way otherwise.
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (details.isProxy && activeAuth) {
      callback({ authCredentials: activeAuth });
    } else {
      callback(); // not our proxy (or site auth) — let the browser handle it
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

// Popup asks us to switch, or to report what's live.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "switch") {
    apply(msg.activeId).then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async response
  }
  if (msg?.type === "reapply") {
    getState().then(({ activeId }) => apply(activeId)).then(() => sendResponse({ ok: true }));
    return true;
  }
});

// Re-assert our proxy settings whenever the worker spins up (browser start,
// worker recycle). Chrome persists proxy settings, but the auth cache and
// badge live only in memory, so we rebuild them here.
chrome.runtime.onStartup.addListener(() => getState().then(({ activeId }) => apply(activeId)));
chrome.runtime.onInstalled.addListener(() => getState().then(({ activeId }) => apply(activeId)));
getState().then(({ activeId }) => apply(activeId));
