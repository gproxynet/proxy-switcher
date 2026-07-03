# Promo tiles for the Chrome Web Store listing

`out/*.png` — five 1280×800 tiles, generated from the **real popup** (same
`src/popup.css`) so they always match the shipped UI.

Rebuild after any UI change:

    node promo/build_promo.mjs

Requires Node + puppeteer + a color-emoji font (for the country flags).
Captions and annotations live in the `SCENES` array in `build_promo.mjs`.
