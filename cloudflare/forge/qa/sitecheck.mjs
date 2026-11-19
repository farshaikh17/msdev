// Scroll-through check of live sites, the way a person looks at them: every page, desktop and phone, scrolled
// top to bottom while the animations run. Read-only (it only loads public pages).
//   npm run forge:sitecheck                     every ready site
//   npm run forge:sitecheck -- --since 2026-11-11   sites created on or after a date
//   npm run forge:sitecheck -- some-slug other-slug
// Writes cloudflare/forge/qa/shots/sitecheck/report.md (+ screenshots of every finding) and exits 1 when
// anything is found. Pages flagged in the fast parallel pass are loaded again one at a time, so a slow image
// or a busy moment never reaches the report.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.FORGE_SITES_URL || "https://forge-sites.dev1-024.workers.dev";
const OUT = "cloudflare/forge/qa/shots/sitecheck";
const WORKERS = Number(process.env.SITECHECK_WORKERS || 4);
mkdirSync(OUT, { recursive: true });

// ---- which sites -------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
let slugs = args.filter((a) => !a.startsWith("--") && !/^\d{4}-\d\d-\d\d$/.test(a));
if (!slugs.length) {
  const since = args.includes("--since") ? args[args.indexOf("--since") + 1] : "";
  const sql = `SELECT slug FROM demos WHERE build_status='ready'${since ? ` AND created_at >= '${since.replace(/[^0-9-]/g, "")}'` : ""} ORDER BY created_at`;
  const raw = execFileSync("npx", ["wrangler", "d1", "execute", "forge-demo", "--remote", "--json", "--command", sql, "-c", "cloudflare/forge/wrangler.jsonc"], { encoding: "utf8" });
  slugs = JSON.parse(raw)[0].results.map((r) => r.slug);
}
console.log(`${slugs.length} sites`);

// ---- every page of each site (followed from its own links) ------------------------------------------------
async function pagesOf(slug) {
  const seen = new Set(), todo = [`/${slug}/`], out = [];
  while (todo.length && seen.size < 80) {
    let u = todo.shift();
    if (!u.endsWith("/")) u += "/";
    if (seen.has(u)) continue;
    seen.add(u);
    const r = await fetch(BASE + u).catch(() => null);
    if (!r || r.status !== 200) continue;
    out.push(u);
    const h = await r.text().catch(() => "");
    for (const m of h.matchAll(/<a\b[^>]*href="([^"]*)"/g)) {
      const l = m[1].split("#")[0].split("?")[0];
      if (l.startsWith(`/${slug}`) && !/_img|_lead|_v\/|\.(zip|xml|txt|pdf)$/.test(l)) todo.push(l);
    }
  }
  return out;
}

// ---- what is looked for while scrolling (runs in the page) ------------------------------------------------
const AT_EACH_STOP = () => {
  const iss = [], vh = innerHeight, vw = innerWidth;
  const op = (e) => { let o = 1; for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); o *= +cs.opacity; if (cs.visibility === "hidden" || cs.display === "none") return 0; } return o; };
  const pinned = (e) => { for (let x = e; x; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === "fixed" || p === "sticky") return true; } return false; };
  const moving = (e) => e.closest('[aria-hidden=true],.sr-only,.visually-hidden,marquee,[class*=marquee i],[class*=ticker i],[class*=track i],[class*=scroller i],[class*=carousel i],[class*=slider i],[class*=lane i]');
  // A tilted card (rotate) has rows whose boxes overlap though the words don't.
  const tilted = (e) => { for (let x = e, k = 0; x && k < 8; x = x.parentElement, k++) { const m = getComputedStyle(x).transform.match(/^matrix\(([^)]+)\)/); if (m && Math.abs(parseFloat(m[1].split(",")[1])) > 0.005) return true; } return false; };
  // Words on top of words (a floating or pinned bar passing over text is fine).
  const T = [...document.querySelectorAll("main h1,main h2,main h3,main p,main li,main blockquote,footer p,footer a,footer h2,footer h3")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 8 && r.top > 70 && r.bottom < vh - 10 && (e.innerText || "").trim().length > 2 && !moving(e) && op(e) > 0.6 && !pinned(e) && !tilted(e); });
  const leaf = T.filter((e) => !T.some((o) => o !== e && e.contains(o)));
  for (let a = 0; a < leaf.length; a++) for (let b = a + 1; b < leaf.length; b++) {
    const A = leaf[a].getBoundingClientRect(), B = leaf[b].getBoundingClientRect();
    const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (ox > 8 && oy > 8 && ox * oy > 0.25 * Math.min(A.width * A.height, B.width * B.height)) {
      // Only when the lower words actually show through or get cut (a card sliding fully over another is fine).
      // Both words are painted there, with nothing opaque between them (a card hidden under the next section is fine).
      const stack = document.elementsFromPoint(Math.max(A.left, B.left) + ox / 2, Math.max(A.top, B.top) + oy / 2);
      const ia = stack.findIndex((x) => leaf[a].contains(x)), ib = stack.findIndex((x) => leaf[b].contains(x));
      const solid = (x) => { const c = getComputedStyle(x); const al = c.backgroundColor.match(/[\d.]+/g); return c.backgroundImage !== "none" || (al && (al.length < 4 || +al[3] > 0.85) && c.backgroundColor !== "rgba(0, 0, 0, 0)"); };
      const between = ia >= 0 && ib >= 0 && stack.slice(Math.min(ia, ib) + 1, Math.max(ia, ib)).some((x) => !leaf[a].contains(x) && !leaf[b].contains(x) && solid(x));
      if (ia >= 0 && ib >= 0 && !between) iss.push(`text over text: "${leaf[a].innerText.trim().slice(0, 30)}" / "${leaf[b].innerText.trim().slice(0, 30)}"`);
    }
  }
  // A picture covering words (a photo placed over the start of a heading or paragraph).
  for (const e of leaf) {
    const r = e.getBoundingClientRect(); let hit = 0;
    for (const x of [r.left + 4, r.left + r.width * 0.08, r.left + r.width * 0.5]) {
      const top = document.elementFromPoint(x, r.top + r.height / 2);
      if (top && !e.contains(top) && !top.contains(e) && top.closest("img,picture,video,figure") && !(top.closest("a,button") && top.closest("a,button").contains(e))) hit++;
    }
    if (hit) { iss.push(`picture over text: "${(e.innerText || "").trim().slice(0, 40)}"`); break; }
  }
  // A big part of the screen darkened by a filter (the stacked-card black flash).
  for (const e of document.querySelectorAll("main *")) {
    const f = getComputedStyle(e).filter; const m = f.match(/brightness\(([\d.]+)/);
    if (!m || +m[1] >= 0.4) continue;
    const r = e.getBoundingClientRect();
    if (r.width * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) > vw * vh * 0.25) { iss.push(`darkened block (brightness ${(+m[1]).toFixed(2)}): ${(e.className + "").slice(0, 40)}`); break; }
  }
  // Phones: words past the screen's edge (swipe rows excluded).
  if (vw < 500) for (const e of document.querySelectorAll("main h1,main h2,main h3,main p,main a,main button")) {
    const r = e.getBoundingClientRect();
    if (r.height > 0 && r.top > 0 && r.top < vh && op(e) > 0.6 && (r.right > vw + 4 || r.left < -4) && !moving(e) && !pinned(e)) { iss.push(`off the phone screen: ${(e.innerText || "").trim().slice(0, 30)}`); break; }
  }
  if (document.documentElement.scrollWidth > vw + 2) iss.push("page scrolls sideways");
  // How much of the screen shows something (words, a picture, a painted background): sampled on a grid.
  let n = 0, t = 0;
  // Pictures that pointer sampling can't reach (a background video under a layer with pointer-events: none).
  const media = [...document.querySelectorAll("img,video,canvas,picture,iframe")].filter((m) => op(m) > 0.3).map((m) => m.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < vh);
  for (let x = 20; x < vw; x += 60) for (let y = 90; y < vh; y += 60) {
    if (media.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) { t++; n++; continue; }
    t++;
    // Looking through see-through layers (a tint over a photo is still a photo on screen).
    const stack = document.elementsFromPoint(x, y).slice(0, 8);
    const e = stack[0];
    if (!e) continue;
    // The footer is content (sparse link columns on plain paper are not an empty screen).
    if (e.closest("footer") || [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) || stack.some((s) => /^(IMG|VIDEO|CANVAS|svg|path|PICTURE|IFRAME)$/i.test(s.tagName) || getComputedStyle(s).backgroundImage !== "none")) n++;
  }
  window.__fill = (window.__fill || []).concat(Math.round((100 * n) / t));
  return iss;
};

const AT_END = () => {
  const iss = [], t = document.body.innerText;
  const credits = (t.match(/Made with .{0,20}(Mianro|Mainro)/gi) || []).length;
  if (credits !== 1) iss.push(`${credits} "Made with" credits`);
  const P = /(photos?|pictures?|images?)\b[^.!?\n]{0,60}\b(appears?|go|goes|added)\b[^.!?\n]{0,20}\bhere|photos? coming soon|\b(your|real) (own )?(photos?|pictures?) (here|go here)|\badd your (own )?(photos?|pictures?)|lorem ipsum|\[(your|business|insert)[^\]]*\]|\{\{|\bTODO\b|\bundefined\b|\(XXX\)|example\.com/;
  const m = t.match(new RegExp(P.source, "i"));
  if (m) iss.push(`placeholder wording: "${m[0].slice(0, 50)}"`);
  if (/\bNaN\b/.test(t)) iss.push('"NaN" on the page');
  if (/\b555-01\d\d\b/.test(t)) iss.push("made-up 555 phone number");
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 40);
  if (broken.length) iss.push(`${broken.length} broken image(s): ${(broken[0].getAttribute("src") || "").slice(-50)}`);
  if ([...document.images].some((i) => /\.php(\?|$)|bping/.test(i.src))) iss.push("ad-tracker image");
  if ([...document.querySelectorAll('a[href^="tel:"]')].some((a) => a.getAttribute("href").replace(/\D/g, "").length < 10)) iss.push("call link with no number");
  const hd = window.__hd || []; let fast = 0;
  for (let i = 1; i < hd.length; i++) if (hd[i] - hd[i - 1] < 400) fast++;
  if (fast > 2) iss.push(`header blinks (${fast} quick changes)`);
  // Screens of nothing while scrolling (a pinned story with gaps, an empty band).
  const f = (window.__fill || []).slice(0, -1);
  let run = 0, worst = 0;
  for (const v of f) { run = v < 8 ? run + 1 : 0; worst = Math.max(worst, run); }
  if (f.some((v) => v < 5)) iss.push(`an empty screen while scrolling (${Math.min(...f)}% filled)`);
  else if (worst >= 4) iss.push(`${worst} screens in a row that are mostly empty`);
  return iss;
};

const VIEWS = { desktop: { viewport: { width: 1440, height: 900 } }, phone: { ...devices["iPhone 13"], deviceScaleFactor: 1 } };

async function check(browser, u, view, slow) {
  const c = await browser.newContext(VIEWS[view]);
  const p = await c.newPage();
  const errs = [], issues = new Map();
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 90)));
  try {
    try { await p.goto(BASE + u, { waitUntil: "load", timeout: slow ? 60000 : 45000 }); }
    catch { return [{ msg: "page did not load" }]; }
    await p.waitForTimeout(slow ? 2500 : 1800);
    await p.evaluate(() => { window.__hd = []; const hd = document.querySelector("header"); if (hd) new MutationObserver(() => window.__hd.push(performance.now())).observe(hd, { attributes: true, attributeFilter: ["class"] }); });
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, k = 0; y < H + 900 && k < 45; y += 700, k++) {
      for (let s = 0; s < 7; s++) { await p.mouse.wheel(0, 100); await p.waitForTimeout(25); }
      await p.waitForTimeout(slow ? 700 : 450);
      for (const msg of await p.evaluate(AT_EACH_STOP)) if (!issues.has(msg)) {
        const shot = slow ? `${OUT}/${u.replace(/\//g, "_")}${view}-${issues.size}.png` : "";
        if (shot) await p.screenshot({ path: shot });
        issues.set(msg, shot);
      }
    }
    await p.waitForTimeout(slow ? 2500 : 600);
    for (const msg of await p.evaluate(AT_END)) issues.set(msg, "");
    if (errs.length) issues.set(`script error: ${errs[0]}`, "");
    return [...issues].map(([msg, shot]) => ({ msg, shot }));
  } finally { await c.close(); }
}

// ---- run: fast parallel pass, then a careful one-at-a-time pass over anything flagged ----------------------
const all = [];
for (let i = 0; i < slugs.length; i += 6) all.push(...(await Promise.all(slugs.slice(i, i + 6).map(pagesOf))).flat());
console.log(`${all.length} pages, ${all.length * 2} views`);
const browser = await chromium.launch();
const flagged = [];
const queue = all.flatMap((u) => [[u, "desktop"], [u, "phone"]]);
let done = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const [u, view] = queue.shift();
    if ((await check(browser, u, view, false)).length) flagged.push([u, view]);
    if (++done % 100 === 0) console.log(`  ${done} views checked, ${flagged.length} flagged`);
  }
}));
const report = [];
for (const [u, view] of flagged) {
  const found = await check(browser, u, view, true);
  if (found.length) report.push({ u, view, found });
}
await browser.close();

const lines = [`# Site check — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, "", `${slugs.length} sites, ${all.length} pages, desktop and phone. ${report.length ? `${report.length} page views need a look.` : "Nothing found."}`, ""];
for (const r of report) {
  lines.push(`## ${r.u} (${r.view})`);
  for (const f of r.found) lines.push(`- ${f.msg}${f.shot ? ` — ${f.shot.split("/").pop()}` : ""}`);
  lines.push("");
}
writeFileSync(`${OUT}/report.md`, lines.join("\n"));
console.log(lines.slice(2, 3).join(""));
for (const r of report) console.log(`${r.u} (${r.view}): ${r.found.map((f) => f.msg).join("; ")}`);
console.log(`Report: ${OUT}/report.md`);
process.exit(report.length ? 1 : 0);
