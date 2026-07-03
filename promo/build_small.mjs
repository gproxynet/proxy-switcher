// 440x280 "small promo tile" for the Chrome Web Store search/category grid.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(resolve(here, "out"), { recursive: true });

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0}
  .tile{width:440px;height:280px;box-sizing:border-box;display:flex;flex-direction:column;
    justify-content:center;gap:14px;padding:34px 36px;color:#fff;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    background:radial-gradient(600px 300px at 85% -20%, #6366f1, #0b0d12 70%),
               linear-gradient(135deg,#0f766e,#0b0d12);}
  .logo{width:64px;height:64px;border-radius:16px;position:relative;
    background:linear-gradient(135deg,#14b8a6,#6366f1);box-shadow:0 8px 24px rgba(0,0,0,.4);}
  .logo:before,.logo:after{content:"";position:absolute;left:16px;right:16px;height:6px;border-radius:6px;background:#fff}
  .logo:before{top:24px}.logo:after{top:36px;opacity:.55}
  h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.5px;line-height:1.1}
  .tag{font-size:16px;color:#cdd3df;font-weight:600}
  .chips{display:flex;gap:8px;margin-top:2px}
  .chip{font-size:13px;font-weight:700;padding:5px 11px;border-radius:999px;
    background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}
</style></head><body>
  <div class="tile">
    <div class="logo"></div>
    <h1>Proxy Switcher<br>&amp; Manager</h1>
    <div class="tag">One-click proxy switching</div>
    <div class="chips"><span class="chip">HTTP</span><span class="chip">SOCKS5</span><span class="chip">Bulk import</span></div>
  </div>
</body></html>`;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: resolve(here, "out/small_promo_440x280.png"), clip: { x: 0, y: 0, width: 440, height: 280 } });
console.log("wrote small_promo_440x280");
await browser.close();
