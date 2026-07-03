# Publishing checklist — Chrome Web Store

## Upload package
`dist/proxy-switcher-v0.1.0.zip` (16 KB — manifest + icons + src only).
Rebuild after any change:
```
rm -f dist/proxy-switcher-v0.1.0.zip && zip -rq dist/proxy-switcher-v0.1.0.zip manifest.json icons src
```

## Store listing fields (paste from STORE_LISTING.md)
- **Name:** Proxy Switcher & Manager: SOCKS5, HTTP, Bulk Import
- **Summary (132):** Switch HTTP, HTTPS & SOCKS5 proxies in one click. Bulk-import lists, auto country flags, hotkeys. Fast proxy switcher & manager.
- **Category:** Developer Tools
- **Language:** English
- **Detailed description:** the body in `STORE_LISTING.md`.

## Graphics
- **Store icon 128×128:** `icons/icon128.png`
- **Screenshots (1280×800):** `promo/out/1_hero.png` … `5_hotkeys.png` (upload all five)
- **Small promo tile 440×280:** `promo/out/small_promo_440x280.png`

## Privacy practices tab (required — the sensitive-permission part)
**Single purpose:**
> Switch and manage HTTP, HTTPS and SOCKS proxies in the browser from a toolbar popup.

**Permission justifications:**
- `proxy` — Core function: sets and switches the browser's proxy configuration when the user selects a proxy profile.
- `storage` — Stores the user's proxy profiles locally on the device.
- `webRequest` + `webRequestAuthProvider` — Supplies the username/password of the user's own proxy when that proxy issues an authentication challenge (`onAuthRequired`). No request content is read or modified.
- Host permission `<all_urls>` — Needed so the selected proxy and its authentication apply to requests on every site, and for the optional IP/location check.

**Remote code:** No, the extension does not use remote code.

**Data usage — certify all three:**
- Not sold/transferred to third parties beyond approved use cases ✔
- Not used for purposes unrelated to the single purpose ✔
- Not used for creditworthiness/lending ✔

**Data collected:** None sent to the developer. (The optional geolocation lookup to `ipwho.is` is disclosed in the privacy policy; it is a functional third-party call, no developer-side collection.)

**Privacy policy URL:** _<< host `promo/privacy.html` and paste the URL here >>_

## After publishing
- Add the Store link to gproxy.net (footer/docs) for the entity-trust backlink.
- Track referral clicks by the UTM already in the footer link
  (`utm_source=chrome&utm_medium=extension&utm_campaign=proxy-switcher`) via nginx logs, not GA4.
