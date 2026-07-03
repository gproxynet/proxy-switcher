# Proxy Switcher

A lightweight **Manifest V3** Chrome extension to switch between proxy profiles in one click — built for scrapers, QA, affiliate and multi-account work.

- **One-click switching** between Direct / System / your proxy profiles from the toolbar popup.
- **HTTP, HTTPS, SOCKS4, SOCKS5** with username/password auth (handled via `onAuthRequired`, no plaintext in URLs).
- **Per-profile bypass rules** — keep `localhost` and internal hosts off the proxy.
- **Live IP + geo check** so you can see at a glance which exit you're on.
- **Paste-to-fill** — drop a `host:port:user:pass` or `scheme://user:pass@host:port` string into the Host field and the form fills itself.
- **Badge indicator** — a colored `ON` badge shows a proxy is active, tinted with the profile's color.
- No analytics, no tracking, no remote code. Profiles live in `chrome.storage.local` on your machine.

## Install (unpacked, for development)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Pin the toolbar icon, open the popup, **+ Add** a proxy (or use the GProxy quick-add), click it to activate.

## How it works

The service worker sets `chrome.proxy.settings` to `fixed_servers` for the active profile (or `direct`/`system`). When a proxy asks for credentials, the worker answers `onAuthRequired` with the active profile's user/password — so authenticated proxies just work without leaking credentials into request URLs. Switching profiles reapplies the settings and re-checks your IP.

## Permissions, and why

| Permission | Why |
|---|---|
| `proxy` | set/switch the browser proxy configuration |
| `storage` | save your proxy profiles locally |
| `webRequest` + `webRequestAuthProvider` | supply username/password to authenticated proxies |
| `host_permissions: <all_urls>` | required for proxy auth to apply on any site, and for the IP check |

## Proxies

Provider-agnostic — use **any** proxy, from any source. Paste a `host:port:user:pass` (or `scheme://user:pass@host:port`) string into the Host field and the form fills itself; residential, mobile, datacenter, SOCKS — all work the same way. The single link in the footer is an optional pointer to a proxy provider; ignore it if you already have proxies.

## Rebranding

The only provider-specific value is the `PROVIDER_URL` constant at the top of `src/popup.js` (the footer link). Swap it (and the icons) to point elsewhere.

## License

MIT
