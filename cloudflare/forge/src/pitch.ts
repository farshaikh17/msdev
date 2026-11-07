/**
 * The before/after pitch page for a demo: the business's current website beside the Forge preview,
 * each with its score and checks, on one shareable link. Served at /<slug>/_pitch on the sites
 * origin (and /s/<slug>/_pitch on the app). Public, unindexed, and only while the account is active.
 */
import { esc } from "../../../src/forge/render";
import type { Stored } from "./db";
import type { Check, Review } from "./review";

const CSS = `
:root{--bg:#0f1420;--card:#171e2d;--ink:#eef2f8;--muted:#9aa6bb;--line:rgba(255,255,255,.1);--good:#22c55e;--bad:#f87171;--ember:#ff6b3d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 20px 80px}
h1{font:600 clamp(1.8rem,4.5vw,3rem)/1.1 Fraunces,Georgia,serif;letter-spacing:-.02em;margin:0 0 8px}h2{font:600 1.15rem/1.2 Inter,sans-serif;margin:0}
.sub{color:var(--muted);margin:0 0 32px;max-width:60ch}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}@media(max-width:820px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;display:grid;gap:16px;align-content:start}
.col.new{border-color:rgba(255,107,61,.5);box-shadow:0 30px 80px -40px var(--ember)}
.tag{display:inline-block;font:600 .72rem/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--muted)}.col.new .tag{background:var(--ember);color:#fff}
.score{display:flex;align-items:baseline;gap:8px}.score b{font:600 3rem/1 Fraunces,Georgia,serif}.score span{color:var(--muted)}
.shots{display:grid;grid-template-columns:1fr 92px;gap:12px;align-items:start}
.shot{border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#0b0f17;aspect-ratio:16/10}.shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.phone{border-radius:14px;overflow:hidden;border:3px solid #2a3242;background:#0b0f17;aspect-ratio:390/844}.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.none{aspect-ratio:16/10;display:grid;place-items:center;color:var(--muted);text-align:center;padding:20px;border:1px dashed var(--line);border-radius:12px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}li{display:flex;gap:10px;align-items:flex-start;font-size:.94rem}li i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:.72rem;flex:none;margin-top:2px}
li.ok i{background:rgba(34,197,94,.18);color:var(--good)}li.bad i{background:rgba(248,113,113,.18);color:var(--bad)}li small{color:var(--muted)}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--ember);color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:999px}
.foot{margin-top:40px;color:var(--muted);font-size:.86rem;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.foot a{color:var(--ink)}.heart{color:#e11d48}
`;

const list = (checks: Check[]) => `<ul>${checks.map((c) => `<li class="${c.ok ? "ok" : "bad"}"><i>${c.ok ? "✓" : "✕"}</i><span>${esc(c.label)}${c.detail && !c.ok ? ` <small>· ${esc(c.detail)}</small>` : ""}</span></li>`).join("")}</ul>`;

export function pitchPage(demo: Stored, review: Review, urls: { site: string; img: (name: string) => string }, credit: string): string {
  const name = demo.intake.businessName;
  const has = (n: string) => review.shots?.includes(n);
  const old = review.old;
  const passed = review.checks?.filter((c) => c.ok).length ?? 0;
  const total = review.checks?.length ?? 0;
  const oldCol = old
    ? `<section class="col"><span class="tag">Today</span><h2>${esc(name)}'s current website</h2>
<div class="score"><b>${old.score}</b><span>/ 10</span></div>
${has("old-desktop.jpg") ? `<div class="shots"><div class="shot"><img src="${esc(urls.img("old-desktop.jpg"))}" alt="${esc(name)}'s current website on desktop"></div><div class="phone"><img src="${esc(urls.img("old-phone.jpg"))}" alt="On a phone"></div></div>` : `<div class="none">${old.loaded ? "No screenshot" : "The website didn't load when we checked."}</div>`}
${list(old.checks)}<p style="margin:0;color:var(--muted);font-size:.86rem">Checked at <a style="color:var(--muted)" href="${esc(old.url)}" rel="noopener nofollow" target="_blank">${esc(old.url.replace(/^https?:\/\//, ""))}</a></p></section>`
    : `<section class="col"><span class="tag">Today</span><h2>${esc(name)} online</h2><div class="none">We couldn't find a website for ${esc(name)}. Customers searching on their phones find competitors instead.</div></section>`;
  const newCol = `<section class="col new"><span class="tag">The new site</span><h2>${esc(name)}, designed by Forge</h2>
<div class="score"><b>${review.score ?? "–"}</b><span>/ 10 design · ${passed} of ${total} checks passed</span></div>
${has("shot-desktop.jpg") ? `<div class="shots"><div class="shot"><img src="${esc(urls.img("shot-desktop.jpg"))}" alt="The new website on desktop"></div><div class="phone"><img src="${esc(urls.img("shot-phone.jpg"))}" alt="On a phone"></div></div>` : ""}
${review.checks ? list(review.checks) : ""}
<div><a class="btn" href="${esc(urls.site)}">Open the new site →</a></div></section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}: before and after</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;600&display=swap"><style>${CSS}</style></head><body><div class="wrap">
<h1>${esc(name)}: before and after</h1><p class="sub">What customers see today, next to the new website we've designed. Every check was run in a real browser on desktop and on a phone.</p>
<div class="cols">${oldCol}${newCol}</div>
<div class="foot"><span>Scores are our own: 10 is a site that works hard on every phone.</span><span>${credit}</span></div></div></body></html>`;
}
