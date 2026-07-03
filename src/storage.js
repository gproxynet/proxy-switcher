// Shared storage helpers for popup and service worker.
// Data model in chrome.storage.local:
//   profiles: Profile[]   custom proxy profiles
//   activeId: string      "direct" | "system" | <profile.id>

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} color        badge/dot color (hex)
 * @property {string} scheme       http | https | socks4 | socks5
 * @property {string} host
 * @property {number} port
 * @property {string} [username]
 * @property {string} [password]
 * @property {string[]} bypassList hosts that skip the proxy
 * @property {string} [countryCode] ISO alpha-2, for the flag (auto-detected)
 * @property {string} [city] auto-detected city
 */

export const DIRECT = "direct";
export const SYSTEM = "system";

export const DEFAULT_BYPASS = ["localhost", "127.0.0.1", "<local>"];

export async function getState() {
  const { profiles = [], activeId = DIRECT } = await chrome.storage.local.get(["profiles", "activeId"]);
  return { profiles, activeId };
}

export async function saveProfiles(profiles) {
  await chrome.storage.local.set({ profiles });
}

export async function setActiveId(activeId) {
  await chrome.storage.local.set({ activeId });
}

export async function getLastProfileId() {
  const { lastProfileId } = await chrome.storage.local.get("lastProfileId");
  return lastProfileId || null;
}

export async function setLastProfileId(lastProfileId) {
  await chrome.storage.local.set({ lastProfileId });
}

// ISO alpha-2 country code -> flag emoji (regional indicator letters).
export function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return "";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65)
  );
}

export function findProfile(profiles, id) {
  return profiles.find((p) => p.id === id) || null;
}

export function newId() {
  return "p_" + crypto.randomUUID().slice(0, 8);
}
