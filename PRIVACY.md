# Privacy Policy — Proxy Switcher

_Last updated: 2026-07-03_

Proxy Switcher is designed to collect as little as possible.

## What the extension stores

- **Proxy profiles you create** (name, host, port, scheme, optional username/password, bypass list) are stored **locally** on your device via `chrome.storage.local`. They never leave your browser and are not transmitted to us or any third party.

## What the extension sends

- **Proxy credentials** are sent only to the proxy server **you configured**, and only when that proxy requests authentication — exactly as they would be if you typed them into your OS proxy settings.
- **IP check**: when the popup is open, the extension requests your current public IP and approximate location from the third-party service `ipwho.is` so it can show which exit you are on. This request contains no personal data beyond the IP address that any web request already exposes. You can ignore this feature; nothing is stored.
- **Proxy geo detection** (optional): when you add or import a proxy with auto-detect enabled, the extension asks `ipwho.is` for the country and city of that proxy's host, purely to label it with a flag. Only the proxy host/IP you entered is sent, and only the country code and city are kept — stored locally with your profile. Turn off the "Auto-detect" checkbox to skip these lookups entirely.

## What we do NOT do

- No analytics, telemetry, advertising, or user tracking.
- No collection of browsing history, page content, or form data.
- No remote code execution; all code ships inside the extension package.
- No selling or sharing of any data.

## Contact

Questions: support@gproxy.net
