// Renders the real popup (same popup.css) into 1280x800 Chrome Web Store
// promo tiles with a captioned banner and numbered annotations.
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "../src/popup.css"), "utf8");
mkdirSync(resolve(here, "out"), { recursive: true });

const dot = (c) => `<span class="dot" style="background:${c}"></span>`;
const item = ({ color, flag, name, geo, active }) => `
  <li class="item${active ? " active" : ""}">${dot(color)}${flag ? `<span class="flag">${flag}</span>` : ""}
    <span class="name">${name}</span>${geo ? `<span class="geo">${geo}</span>` : ""}
    ${flag ? '<button class="edit">edit</button><button class="del">✕</button>' : ""}</li>`;

const PROFILES = [
  { color: "#14b8a6", flag: "🇺🇸", name: "New York", geo: "New York", active: true },
  { color: "#6366f1", flag: "🇩🇪", name: "Frankfurt", geo: "Frankfurt" },
  { color: "#f59e0b", flag: "🇬🇧", name: "London", geo: "London" },
  { color: "#ec4899", flag: "🇯🇵", name: "Tokyo", geo: "Tokyo" },
];

const listPopup = `
  <header class="head"><div class="brand"><span class="logo"></span><span>Proxy Switcher</span></div>
    <div class="head-actions"><button class="ghost">Import</button><button class="ghost">+ Add</button></div></header>
  <section class="status"><div class="status-row">${dot("#14b8a6")}<span>New York</span></div>
    <div class="ip-row"><span>45.77.61.4 · New York, US</span><button class="linklike">↻</button></div></section>
  <ul class="list">
    <li class="item">${dot("#8b93a3")}<span class="name">Direct (no proxy)</span></li>
    <li class="item">${dot("#8b93a3")}<span class="name">Use system settings</span></li>
    <li class="sep">Your proxies (4)</li>
    ${PROFILES.map(item).join("")}
  </ul>
  <footer class="foot"><a>Need proxies? Get residential &amp; mobile →</a></footer>`;

const importPopup = `
  <header class="head"><div class="brand"><span class="logo"></span><span>Proxy Switcher</span></div>
    <div class="head-actions"><button class="ghost">Import</button><button class="ghost">+ Add</button></div></header>
  <section class="import">
    <div class="form-title">Import proxy list</div>
    <p class="import-help">One proxy per line. <code>host:port</code>, <code>host:port:user:pass</code>, <code>user:pass@host:port</code>, <code>socks5://…</code>.</p>
    <textarea rows="7">45.77.61.4:8000:user:pass
user:pass@88.212.10.9:8000
socks5://141.98.7.22:1080
US,New York,45.77.61.4:8000:user:pass
DE,Frankfurt,88.212.10.9:8000</textarea>
    <label class="detect-row"><input type="checkbox" checked>Auto-detect country &amp; city (looks up each IP)</label>
    <div class="form-actions import-actions"><label class="ghost">From file…</label><span class="spacer"></span>
      <button class="ghost">Cancel</button><button class="primary">Import</button></div>
    <div class="import-status muted">Imported 5, skipped 0 duplicate(s).</div>
  </section>`;

const formPopup = `
  <header class="head"><div class="brand"><span class="logo"></span><span>Proxy Switcher</span></div>
    <div class="head-actions"><button class="ghost">Import</button><button class="ghost">+ Add</button></div></header>
  <section class="form" style="display:block">
    <div class="form-title">Add proxy</div>
    <div class="grid">
      <label class="full">Name<input value="Frankfurt"></label>
      <label>Type<select><option>HTTPS</option></select></label>
      <label>Color<input type="color" value="#6366f1"></label>
      <label class="full">Host <span class="hint">— or paste host:port:user:pass</span><input value="88.212.10.9"></label>
      <label>Port<input value="8000"></label>
      <label>User<input value="user"></label>
      <label>Password<input type="password" value="secret"></label>
      <label class="full">Bypass (comma-sep)<input value="localhost, 127.0.0.1, &lt;local&gt;"></label>
    </div>
    <div class="form-actions"><button class="ghost">Cancel</button><button class="primary">Save</button></div>
  </section>`;

// vh = unscaled popup viewport height to show (content below is clipped).
const SCENES = [
  { file: "1_hero", caption: "Switch proxies in one click", popup: listPopup, vh: 410,
    notes: ["Pick Direct, System, or any saved proxy", "One click applies it browser-wide", "Colored ON badge shows it's active"] },
  { file: "2_import", caption: "Import your whole proxy list", popup: importPopup, vh: 470,
    notes: ["Paste a list or load a .txt file", "host:port, user:pass@host, SOCKS5 — all formats", "Duplicates skipped automatically"] },
  { file: "3_flags", caption: "Every proxy tagged by country", popup: listPopup, vh: 410,
    notes: ["Auto-detects country & city per proxy", "Flags make big lists easy to scan", "Sort your US, EU, Asia exits at a glance"] },
  { file: "4_protocols", caption: "HTTP, HTTPS & SOCKS5 with auth", popup: formPopup, vh: 450,
    notes: ["Full protocol support incl. SOCKS5", "Username / password proxies just work", "Paste a full proxy string to auto-fill"] },
  { file: "5_hotkeys", caption: "Hotkeys — switch without the mouse", popup: listPopup, vh: 410,
    notes: ["Ctrl+Shift+X toggles the proxy on/off", "Ctrl+Shift+Z drops to a direct connection", "Per-profile bypass for localhost & internal hosts"] },
];

const POPUP_W = 340, MAX_W = 500, MAX_H = 560;

function tileHTML(scene) {
  const scale = Math.min(MAX_W / POPUP_W, MAX_H / scene.vh);
  const screenW = Math.round(POPUP_W * scale);
  const screenH = Math.round(scene.vh * scale);
  const notes = scene.notes
    .map((n, i) => `<li><span class="num">${i + 1}</span><span>${n}</span></li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${css}
    html,body{margin:0}
    .tile{width:1280px;height:800px;position:relative;overflow:hidden;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
      background:radial-gradient(1200px 600px at 20% -10%, #1b2130, #0b0d12);}
    .banner{height:150px;display:flex;align-items:center;justify-content:center;text-align:center;
      background:linear-gradient(135deg,#14b8a6,#6366f1);color:#fff;font-size:44px;font-weight:800;
      letter-spacing:-.5px;padding:0 40px;}
    .stage{display:flex;align-items:center;gap:70px;padding:56px 70px;height:calc(800px - 150px);box-sizing:border-box;}
    .frame{flex:none;border-radius:16px;background:#0f1115;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px #2a2f3a;}
    .frame .bar{height:34px;display:flex;align-items:center;gap:7px;padding:0 14px;border-bottom:1px solid #262b36;}
    .frame .bar i{width:11px;height:11px;border-radius:50%;display:inline-block}
    .frame .bar .r{background:#ef4d4d}.frame .bar .y{background:#f6b73c}.frame .bar .g{background:#3ecf5b}
    .screen{overflow:hidden;border-radius:0 0 16px 16px;background:#0f1115;}
    .popup{width:340px;color:#e7e9ee;transform-origin:top left;background:#0f1115;}
    .logo{width:20px;height:20px;border-radius:6px;display:inline-block;
      background:linear-gradient(135deg,#14b8a6,#6366f1);}
    .notes{flex:1;color:#e7e9ee;}
    .notes ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:26px}
    .notes li{display:flex;align-items:center;gap:16px;font-size:23px;line-height:1.35;color:#d4d8e0}
    .notes .num{flex:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:18px;color:#fff;background:linear-gradient(135deg,#14b8a6,#6366f1)}
    /* neutralize interactive-only hiding for the static mock */
    .item .edit,.item .del{visibility:visible !important;color:#8b93a3}
  </style></head><body>
    <div class="tile">
      <div class="banner">${scene.caption}</div>
      <div class="stage">
        <div class="frame"><div class="bar"><i class="r"></i><i class="y"></i><i class="g"></i></div>
          <div class="screen" style="width:${screenW}px;height:${screenH}px">
            <div class="popup" style="transform:scale(${scale});height:${scene.vh}px">${scene.popup}</div>
          </div>
        </div>
        <div class="notes"><ul>${notes}</ul></div>
      </div>
    </div>
  </body></html>`;
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
for (const scene of SCENES) {
  await page.setContent(tileHTML(scene), { waitUntil: "load" });
  await page.screenshot({ path: resolve(here, `out/${scene.file}.png`), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("wrote", scene.file);
}
await browser.close();
