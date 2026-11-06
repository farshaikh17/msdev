/**
 * The public Forge website: the page agencies and resellers land on. Warm cream, navy and coral,
 * serif headlines — in the spirit of Miami Goes Local. Plain HTML and CSS, no framework, no tracking.
 */
import { esc } from "../../../src/forge/render";
import { FAQS, GUIDES, INCLUDED, STEPS, TRADES, TRADE_GROUPS, type Guide, type Plan, type Trade, tradeBySlug } from "./web-content";

export interface Showcase {
  slug: string;
  name: string;
  trade: string;
  url: string;
  image: string | null;
}

export interface Shell {
  title: string;
  desc: string;
  path: string;
  origin: string;
  signedIn: boolean;
  jsonld?: unknown[];
  status?: number;
  noindex?: boolean;
}

const CSS = `
:root{--cream:#fbf5ea;--paper:#fff;--navy:#12263f;--ink:#1b2a3a;--muted:#5d6b7b;--coral:#e4572e;--coral-d:#c9441f;--coral-soft:#fde9e0;--sand:#e8dcc8;--sky:#e7eef6;--ok:#217a4b;--bad:#a32b2b;
--serif:"Fraunces",Georgia,serif;--sans:"Inter","Helvetica Neue",Arial,sans-serif;--r:16px}
@media (prefers-color-scheme:dark){:root{--cream:#0f1a2a;--paper:#16253a;--navy:#070f1b;--ink:#eef2f7;--muted:#9fb0c3;--coral:#f06a42;--coral-d:#ff8159;--coral-soft:#3a2219;--sand:#2a3b52;--sky:#1b2d45;--ok:#6fd19c;--bad:#f19a9a;color-scheme:dark}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--serif);font-weight:700;line-height:1.12;letter-spacing:-.015em;margin:0;text-wrap:balance}
h1{font-size:clamp(2.1rem,5.6vw,3.6rem)}h2{font-size:clamp(1.55rem,3.4vw,2.2rem)}h3{font-size:1.2rem}
p{margin:0}a{color:var(--coral-d)}img{max-width:100%}
.wrap{max-width:1160px;margin:0 auto;padding:0 max(18px,env(safe-area-inset-left,0px))}
.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:var(--paper);padding:8px 12px;z-index:99;border-radius:8px}
.bar{background:var(--navy);color:#fff;font-size:.82rem;text-align:center;padding:8px 14px}.bar b{color:#ffb59d}
header.hd{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--cream) 92%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--sand)}
.hd-in{display:flex;align-items:center;gap:22px;padding-block:12px}
.logo{display:flex;align-items:center;gap:10px;color:var(--navy);text-decoration:none;font:700 1.35rem var(--serif)}
@media (prefers-color-scheme:dark){.logo{color:var(--ink)}}
.logo i{width:32px;height:32px;border-radius:10px;background:var(--coral);color:#fff;display:grid;place-items:center;font:700 1.1rem var(--serif);font-style:normal}
.menu{display:flex;align-items:center;gap:6px 22px;margin-left:auto;font-size:.94rem;font-weight:500}
.menu a{color:var(--ink);text-decoration:none;white-space:nowrap}.menu a:hover,.menu a.on{color:var(--coral-d)}
.burger{display:none;margin-left:auto}.burger summary{list-style:none;cursor:pointer;font-weight:600;padding:8px 14px;border:1px solid var(--sand);border-radius:999px}
.burger summary::-webkit-details-marker{display:none}
.burger nav{position:absolute;left:0;right:0;top:100%;background:var(--cream);border-bottom:1px solid var(--sand);padding:12px 18px 18px;display:grid;gap:4px}
.burger nav a{padding:10px 4px;color:var(--ink);text-decoration:none;font-weight:500;border-bottom:1px solid var(--sand)}
@media (max-width:900px){.menu{display:none}.burger{display:block}}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--coral);color:#fff;border:0;border-radius:999px;padding:13px 24px;font:600 .98rem var(--sans);text-decoration:none;cursor:pointer;transition:transform .15s,background .15s}
.btn:hover{background:var(--coral-d);transform:translateY(-1px)}
.btn.alt{background:var(--paper);color:var(--ink);border:1px solid var(--sand)}.btn.alt:hover{background:var(--sky)}
.btn.sm{padding:9px 18px;font-size:.9rem}.btn.lg{padding:16px 30px;font-size:1.05rem}
.btn.line{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}.btn.line:hover{background:rgba(255,255,255,.1)}
.eyebrow{display:inline-block;font:600 .78rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--coral-d);margin-bottom:10px}
section{padding:72px 0}section.tight{padding:48px 0}
.lead{font-size:1.15rem;color:var(--muted);max-width:60ch}
.center{text-align:center}.center .lead{margin-inline:auto}
.head{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:30px}
.head p{color:var(--muted);margin-top:8px}
.hero{padding:72px 0 56px;position:relative;overflow:hidden}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
@media (max-width:900px){.hero-grid{grid-template-columns:1fr}}
.hero h1 em{font-style:italic;color:var(--coral-d)}
.hero .lead{margin:18px 0 26px}
.search{display:flex;gap:8px;background:var(--paper);border:1px solid var(--sand);border-radius:999px;padding:6px;max-width:560px;box-shadow:0 6px 24px rgba(18,38,63,.07)}
.search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;padding:10px 16px;color:var(--ink)}.search input:focus{outline:0}
.search:focus-within{border-color:var(--coral)}
.chips{display:flex;gap:8px 18px;flex-wrap:wrap;margin-top:18px;font-size:.88rem;color:var(--muted)}.chips span::before{content:"✓ ";color:var(--ok);font-weight:700}
.mock{background:var(--paper);border:1px solid var(--sand);border-radius:20px;box-shadow:0 24px 60px rgba(18,38,63,.16);overflow:hidden;transform:rotate(1.2deg)}
.mock-bar{display:flex;gap:6px;align-items:center;padding:11px 14px;background:var(--sky);border-bottom:1px solid var(--sand)}
.mock-bar i{width:10px;height:10px;border-radius:50%;background:var(--sand)}
.mock-bar b{margin-left:10px;flex:1;background:var(--paper);border-radius:999px;font:500 .75rem var(--sans);padding:4px 12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mock-hero{padding:34px 26px;background:linear-gradient(135deg,#12263f,#1f4a73);color:#fff;display:grid;gap:12px}
.mock-hero h4{margin:0;font:700 1.55rem/1.1 var(--serif)}.mock-hero h4 em{color:#ffb59d}
.mock-hero span{font-size:.85rem;opacity:.85}.mock-hero a{justify-self:start;background:var(--coral);color:#fff;border-radius:999px;padding:8px 16px;font:600 .8rem var(--sans);text-decoration:none}
.mock-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px}
.mock-cards div{background:var(--cream);border-radius:12px;padding:12px;font:600 .78rem var(--sans);display:grid;gap:6px}.mock-cards div::before{content:"";height:36px;border-radius:8px;background:var(--sand)}
.mock-cards div:nth-child(2)::before{background:var(--coral-soft)}.mock-cards div:nth-child(3)::before{background:var(--sky)}
.stats{background:var(--navy);color:#fff;padding:30px 0}
.stats-in{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center}
@media (max-width:700px){.stats-in{grid-template-columns:repeat(2,1fr)}}
.stats b{display:block;font:700 2.1rem var(--serif);color:#ffb59d}.stats span{font-size:.88rem;opacity:.85}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.card{background:var(--paper);border:1px solid var(--sand);border-radius:var(--r);padding:26px;display:grid;gap:10px;align-content:start;color:inherit;text-decoration:none}
a.card:hover{border-color:var(--coral);transform:translateY(-2px);box-shadow:0 12px 30px rgba(18,38,63,.1)}a.card{transition:.15s}
.card p{color:var(--muted);font-size:.95rem}.ico{width:44px;height:44px;border-radius:12px;background:var(--coral-soft);display:grid;place-items:center;font-size:1.3rem}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.trade{display:grid;gap:4px;padding:18px 20px;border-radius:var(--r);background:var(--paper);border:1px solid var(--sand);text-decoration:none;color:var(--ink);font-weight:600}
.trade small{font-weight:400;color:var(--muted);font-size:.85rem}.trade:hover{border-color:var(--coral);color:var(--coral-d)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px;counter-reset:s}
.step{padding:26px;border-radius:var(--r);background:var(--paper);border:1px solid var(--sand);position:relative}
.step b{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--coral);color:#fff;font:700 1.1rem var(--serif);margin-bottom:14px}
.step p{color:var(--muted);margin-top:8px;font-size:.95rem}
.band{background:var(--navy);color:#fff}.band .lead,.band p{color:#c7d3e2}.band .eyebrow{color:#ffb59d}
.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}@media (max-width:900px){.split{grid-template-columns:1fr}}
.ticks{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:10px}.ticks li{padding-left:30px;position:relative}.ticks li::before{content:"✓";position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:var(--coral);color:#fff;font-size:.8rem;display:grid;place-items:center}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px;align-items:stretch}
.plan{background:var(--paper);border:1px solid var(--sand);border-radius:20px;padding:30px;display:grid;gap:14px;align-content:start;position:relative}
.plan.hot{border:2px solid var(--coral);box-shadow:0 18px 44px rgba(228,87,46,.15)}
.plan .tagx{position:absolute;top:-13px;left:26px;background:var(--coral);color:#fff;font:600 .72rem var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px}
.price{font:700 2.8rem var(--serif);color:var(--navy)}@media (prefers-color-scheme:dark){.price{color:var(--ink)}}
.price small{font:500 .95rem var(--sans);color:var(--muted)}
.per{font-size:.88rem;color:var(--muted)}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,360px));gap:22px}
.shot{background:var(--paper);border:1px solid var(--sand);border-radius:var(--r);overflow:hidden;text-decoration:none;color:inherit;display:grid}
.shot:hover{border-color:var(--coral)}.shot .img{aspect-ratio:16/10;background:linear-gradient(135deg,var(--sky),var(--coral-soft));background-size:cover;background-position:center;display:grid;place-items:center;font:700 2.6rem var(--serif);color:var(--coral-d)}
.shot div:last-child{padding:16px 18px;display:grid;gap:2px}.shot small{color:var(--muted)}
.faq{display:grid;gap:12px;max-width:820px;margin:0 auto}
.faq details{background:var(--paper);border:1px solid var(--sand);border-radius:14px;padding:4px 22px}
.faq summary{cursor:pointer;font:600 1.05rem var(--sans);padding:16px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";color:var(--coral-d);font-size:1.4rem;line-height:1}.faq details[open] summary::after{content:"–"}
.faq p{padding:0 0 18px;color:var(--muted)}
.cta{background:linear-gradient(135deg,var(--coral),#c9441f);color:#fff;border-radius:28px;padding:56px 28px;text-align:center;display:grid;gap:18px;justify-items:center}
.cta p{color:#ffe3d8;max-width:52ch;font-size:1.1rem}.cta .btn{background:#fff;color:var(--coral-d)}.cta .btn:hover{background:var(--cream)}
footer.ft{background:var(--navy);color:#c7d3e2;padding:56px 0 30px;font-size:.92rem}
.ft-grid{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:32px}@media (max-width:800px){.ft-grid{grid-template-columns:1fr 1fr}}
footer h4{color:#fff;font:600 .85rem var(--sans);letter-spacing:.1em;text-transform:uppercase;margin:0 0 12px}
footer a{color:#c7d3e2;text-decoration:none;display:block;padding:3px 0}footer a:hover{color:#fff}
.ft .logo{color:#fff;margin-bottom:12px}.ft-bot{border-top:1px solid rgba(255,255,255,.12);margin-top:36px;padding-top:20px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.84rem}
.ft-bot .heart{color:#ff4d4d}
.pagehead{padding:56px 0 28px}.crumb{font-size:.85rem;color:var(--muted);margin-bottom:12px}.crumb a{color:var(--muted)}
.prose{max-width:720px}.prose h2{margin:36px 0 12px;font-size:1.6rem}.prose p{margin:0 0 16px;font-size:1.05rem}
.prose ul{padding-left:20px}.prose li{margin-bottom:8px}
form.f{background:var(--paper);border:1px solid var(--sand);border-radius:20px;padding:30px;display:grid;gap:16px}
form.f .two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:600px){form.f .two{grid-template-columns:1fr}}
form.f label{display:grid;gap:6px;font-size:.88rem;font-weight:600}
form.f input,form.f textarea,form.f select{font:inherit;font-weight:400;border:1px solid var(--sand);border-radius:12px;padding:12px 14px;background:var(--cream);color:var(--ink);width:100%}
form.f input:focus,form.f textarea:focus,form.f select:focus{outline:2px solid var(--coral-soft);border-color:var(--coral)}
.hp{position:absolute;left:-5000px;height:0;overflow:hidden}
.err{background:#fbe4e4;color:#8c2222;border-radius:12px;padding:12px 16px;font-weight:600}
.okbox{background:var(--sky);border-radius:20px;padding:36px;display:grid;gap:12px}
.small{font-size:.85rem;color:var(--muted)}
table.cmp{width:100%;border-collapse:collapse;background:var(--paper);border-radius:var(--r);overflow:hidden;border:1px solid var(--sand)}
.cmp th,.cmp td{padding:14px 18px;text-align:left;border-bottom:1px solid var(--sand);font-size:.95rem}.cmp th{background:var(--sky);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.cmp tr:last-child td{border-bottom:0}
.cmp td:last-child{color:var(--ok);font-weight:600}.cmp-wrap{overflow-x:auto}
.pill{display:inline-block;font:600 .72rem var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:3px 10px;border-radius:999px;background:var(--coral-soft);color:var(--coral-d)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;

const NAV: [string, string][] = [
  ["/how-it-works", "How it works"],
  ["/trades", "Trades"],
  ["/examples", "Examples"],
  ["/pricing", "Pricing"],
  ["/resellers", "For resellers"],
  ["/guides", "Guides"],
];

function chrome(sh: Shell, body: string): string {
  const on = (p: string) => (sh.path === p || sh.path.startsWith(p + "/") ? ' class="on"' : "");
  const links = NAV.map(([p, l]) => `<a href="${p}"${on(p)}>${l}</a>`).join("");
  const account = sh.signedIn ? `<a href="/">Dashboard</a>` : `<a href="/login">Sign in</a>`;
  const canonical = `${sh.origin}${sh.path === "/" ? "/" : sh.path}`;
  const ld = (sh.jsonld ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(sh.title)}</title><meta name="description" content="${esc(sh.desc)}">
${sh.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:title" content="${esc(sh.title)}"><meta property="og:description" content="${esc(sh.desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}"><meta property="og:site_name" content="Forge by Mianro Systems">
<meta name="twitter:card" content="summary"><meta name="theme-color" content="#12263f">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#e4572e"/><text x="16" y="23" font-size="20" font-family="Georgia,serif" font-weight="700" text-anchor="middle" fill="#fff">F</text></svg>')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600&display=swap">
<style>${CSS}</style>${ld}</head><body><a class="skip" href="#main">Skip to main content</a>
<div class="bar"><b>Show, don't tell.</b> Send local businesses a finished website of their own, before they pay. <a href="/resellers/apply" style="color:#fff">Become a reseller →</a></div>
<header class="hd"><div class="wrap hd-in"><a class="logo" href="/"><i>F</i>Forge</a>
<nav class="menu" aria-label="Main">${links}${account}<a class="btn sm" href="/resellers/apply">Apply to resell</a></nav>
<details class="burger"><summary>Menu</summary><nav aria-label="Mobile">${links}${account}<a class="btn" style="margin-top:10px" href="/resellers/apply">Apply to resell</a></nav></details></div></header>
<main id="main">${body}</main>
<footer class="ft"><div class="wrap"><div class="ft-grid">
<div><a class="logo" href="/"><i>F</i>Forge</a><p style="max-width:34ch">Premium websites for local businesses, designed in minutes. Made for agencies that sell them.</p></div>
<div><h4>Product</h4><a href="/how-it-works">How it works</a><a href="/examples">Examples</a><a href="/pricing">Pricing</a><a href="/faq">Questions</a></div>
<div><h4>Resellers</h4><a href="/resellers">White-label program</a><a href="/resellers/apply">Apply</a><a href="/guides">Guides</a><a href="/login">Sign in</a></div>
<div><h4>Company</h4><a href="/contact">Contact</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/sitemap.xml">Sitemap</a></div></div>
<div class="ft-bot"><span>© ${new Date().getUTCFullYear()} Mianro Systems. All rights reserved.</span><span>Made with <span class="heart">♥</span> by <a style="display:inline" href="https://mianrosystems.com">Mianro Systems</a></span></div></div></footer>
<script>document.addEventListener("click",function(e){var d=document.querySelector(".burger[open]");if(d&&!d.contains(e.target))d.removeAttribute("open")})</script>
</body></html>`;
}

export function shell(sh: Shell, body: string): Response {
  return new Response(chrome(sh, body), {
    status: sh.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-cache", "x-content-type-options": "nosniff", "x-frame-options": "SAMEORIGIN", "referrer-policy": "strict-origin-when-cross-origin" },
  });
}

const ctaBand = (title = "Ready to show your next prospect their website?", sub = "Apply to the reseller program. We'll set up your account and your first credits.") =>
  `<section class="tight"><div class="wrap"><div class="cta"><h2>${esc(title)}</h2><p>${esc(sub)}</p><a class="btn lg" href="/resellers/apply">Apply to resell</a></div></div></section>`;

const faqList = (items = FAQS) => `<div class="faq">${items.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>`;
const tradeCard = (t: Trade) => `<a class="trade" href="/trades/${t.slug}">${esc(t.name === "Gym or studio" ? "Gyms & studios" : t.who.replace(/^./, (c) => c.toUpperCase()))}<small>${esc(t.services.slice(0, 3).join(" · "))}</small></a>`;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const showcaseCards = (items: Showcase[]) =>
  `<div class="shots">${items
    .map(
      (s) =>
        `<a class="shot" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="img"${s.image ? ` style="background-image:url('${esc(s.image)}')"` : ""}>${s.image ? "" : esc(initials(s.name))}</div><div><b>${esc(s.name)}</b><small>${esc(s.trade)} · View the live site →</small></div></a>`,
    )
    .join("")}</div>`;

const mock = `<div class="mock" aria-hidden="true"><div class="mock-bar"><i></i><i></i><i></i><b>your-client.com</b></div>
<div class="mock-hero"><span>Family-owned · Licensed &amp; insured</span><h4>Fast, honest plumbing in <em>your neighborhood</em></h4><span>Same-day service, upfront pricing, 5-star reviews.</span><a>Get a free quote</a></div>
<div class="mock-cards"><div>Drain cleaning</div><div>Water heaters</div><div>Emergency calls</div></div></div>`;

export function homePage(plans: Plan[], showcase: Showcase[]): string {
  const featured = TRADES.slice(0, 8);
  return `<section class="hero"><div class="wrap hero-grid"><div>
<span class="eyebrow">Websites for local businesses</span>
<h1>Show every local business their <em>new website</em> before they pay.</h1>
<p class="lead">Type a business name. Forge designs a complete, multi-page website for it in minutes: services, photos, forms, map and all. You send the link. They say yes.</p>
<form class="search" action="/trades" method="get" role="search"><input name="q" placeholder="What kind of business do you sell to?" aria-label="Kind of business" list="tl" autocomplete="off"><datalist id="tl">${TRADES.map((t) => `<option value="${esc(t.who)}">`).join("")}</datalist><button class="btn" type="submit">Explore</button></form>
<div class="chips"><span>15+ pages per site</span><span>Contact forms that work</span><span>Your name on it, or none</span></div></div>${mock}</div></section>
<div class="stats"><div class="wrap stats-in"><div><b>Minutes</b><span>from name to finished site</span></div><div><b>15+</b><span>pages in every build</span></div><div><b>${TRADES.length}</b><span>trades with tailored designs</span></div><div><b>$0</b><span>to see it before you commit</span></div></div></div>
<section><div class="wrap"><div class="head"><div><span class="eyebrow">Why agencies start here</span><h2>The easiest yes you'll ever ask for</h2></div></div>
<div class="cards">
<div class="card"><span class="ico">🎯</span><h3>Specific, not generic</h3><p>Every demo uses the business's real name, trade and city, so the owner sees their site, not a template.</p></div>
<div class="card"><span class="ico">⚡</span><h3>Built in minutes</h3><p>No briefs, no back-and-forth. Type the name or paste the Google Maps link and Forge does the rest.</p></div>
<div class="card"><span class="ico">🏷️</span><h3>Your brand, not ours</h3><p>The footer credit carries your agency's name and link. Your client sees you.</p></div>
<div class="card"><span class="ico">🔌</span><h3>Plugs into your system</h3><p>Share by link, drop it on a GoHighLevel page, or connect through the API and signed webhooks.</p></div>
</div></div></section>
<section style="background:var(--paper)"><div class="wrap"><div class="head"><div><span class="eyebrow">Popular trades</span><h2>Designed for the businesses you sell to</h2><p>Every trade gets its own services, photos and hero video.</p></div><a class="btn alt sm" href="/trades">All ${TRADES.length} trades →</a></div>
<div class="grid4">${featured.map(tradeCard).join("")}</div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:34px"><span class="eyebrow">How it works</span><h2>From name to shareable link in four steps</h2></div>
<div class="steps">${STEPS.map((s) => `<div class="step"><b>${s.n}</b><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join("")}</div></div></section>
${showcase.length ? `<section style="background:var(--paper)"><div class="wrap"><div class="head"><div><span class="eyebrow">Recent builds</span><h2>Real sites, built by Forge</h2></div><a class="btn alt sm" href="/examples">More examples →</a></div>${showcaseCards(showcase.slice(0, 3))}</div></section>` : ""}
<section class="band"><div class="wrap split"><div><span class="eyebrow">For resellers</span><h2>Sell websites under your own name</h2><p class="lead">Forge is built so agencies can resell it. Your clients, your brand, your prices. We run the builds.</p>
<ul class="ticks"><li>White-label footer credit on every site</li><li>Team members and their own sign-ins</li><li>API keys and webhooks for your own tools</li><li>Form submissions captured and sent to your system</li></ul>
<div style="margin-top:26px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn lg" href="/resellers/apply">Apply to resell</a><a class="btn line lg" href="/resellers">See the program</a></div></div>
<div class="card" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);color:#fff"><h3>Included in every plan</h3><ul class="ticks" style="margin:6px 0 0">${INCLUDED.slice(0, 5).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:34px"><span class="eyebrow">Pricing</span><h2>Pay for the sites you build</h2><p class="lead">One credit is one finished site. Packs never expire.</p></div>${plansHtml(plans)}</div></section>
<section style="background:var(--paper)"><div class="wrap"><div class="head"><div><span class="eyebrow">The playbook</span><h2>How to sell websites to local businesses</h2></div><a class="btn alt sm" href="/guides">All guides →</a></div>
<div class="cards">${GUIDES.slice(0, 3).map(guideCard).join("")}</div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:34px"><span class="eyebrow">Questions</span><h2>Good to know</h2></div>${faqList(FAQS.slice(0, 6))}<p class="center" style="margin-top:22px"><a href="/faq">All questions →</a></p></div></section>
${ctaBand()}`;
}

function guideCard(g: Guide): string {
  return `<a class="card" href="/guides/${g.slug}"><span class="pill">${esc(g.read)} read</span><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></a>`;
}

export function plansHtml(plans: Plan[]): string {
  return `<div class="plans">${plans
    .map(
      (p) =>
        `<div class="plan${p.featured ? " hot" : ""}">${p.featured ? '<span class="tagx">Most popular</span>' : ""}<h3>${esc(p.name)}</h3><div class="price">${esc(p.price)}</div><div class="per">${p.credits} credits · about ${esc(per(p))} per site</div><p>${esc(p.blurb)}</p><a class="btn${p.featured ? "" : " alt"}" href="/resellers/apply?plan=${encodeURIComponent(p.name)}">Choose ${esc(p.name)}</a></div>`,
    )
    .join("")}</div>`;
}

function per(p: Plan): string {
  const n = Number(p.price.replace(/[^0-9.]/g, ""));
  return p.credits > 0 && n > 0 ? `$${(n / p.credits).toFixed(2)}` : "—";
}

export function howPage(): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">How it works</span><h1>A finished website for any local business, in minutes</h1><p class="lead" style="margin-top:16px">Forge takes the slow, expensive part of selling a website, the first draft, and makes it instant.</p></div></div>
<section class="tight"><div class="wrap"><div class="steps">${STEPS.map((s) => `<div class="step"><b>${s.n}</b><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join("")}</div></div></section>
<section style="background:var(--paper)"><div class="wrap"><div class="center" style="margin-bottom:34px"><h2>What goes into every site</h2></div><div class="cards">
<div class="card"><span class="ico">🧭</span><h3>The right pages</h3><p>Home, services (and a page for each service), about, reviews, gallery, FAQs, quote and contact, plus the legal pages.</p></div>
<div class="card"><span class="ico">🎨</span><h3>A design that fits the trade</h3><p>Colors, type, photos and a hero video chosen for the business, not copied from a template.</p></div>
<div class="card"><span class="ico">📍</span><h3>Real local details</h3><p>Address, hours and a Google Map. Forge reads them from the business's own site or Maps link when it can.</p></div>
<div class="card"><span class="ico">📨</span><h3>Forms that work</h3><p>Contact and quote forms save every submission, and can notify your own system the moment one arrives.</p></div>
<div class="card"><span class="ico">📱</span><h3>Made for phones</h3><p>Single-line header, tappable phone number, fast pages. The owner will open it on their phone first.</p></div>
<div class="card"><span class="ico">🛡️</span><h3>Safe by design</h3><p>Each account only sees its own work. Demo sites run isolated, and any account can be switched off at once.</p></div></div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:26px"><h2>Doing it by hand vs. with Forge</h2></div><div class="cmp-wrap"><table class="cmp"><thead><tr><th></th><th>By hand</th><th>With Forge</th></tr></thead><tbody>
<tr><td>First draft of a site</td><td>Days of design and copy</td><td>Minutes</td></tr>
<tr><td>Cost of a pitch that fails</td><td>Your time</td><td>One credit</td></tr>
<tr><td>Prospects you can show per week</td><td>A handful</td><td>As many as you have credits for</td></tr>
<tr><td>Your branding</td><td>Yes</td><td>Yes, on every site</td></tr></tbody></table></div></div></section>${ctaBand()}`;
}

export function pricingPage(plans: Plan[]): string {
  return `<div class="pagehead"><div class="wrap center"><span class="eyebrow">Pricing</span><h1>Simple credit packs</h1><p class="lead" style="margin-top:16px">One credit builds one site. Failed builds are refunded. Packs never expire.</p></div></div>
<section class="tight"><div class="wrap">${plansHtml(plans)}<p class="small center" style="margin-top:18px">Packs are invoiced by Mianro Systems; there is no online checkout yet. We add the credits as soon as the invoice is paid.</p></div></section>
<section style="background:var(--paper)"><div class="wrap split"><div><h2>Included in every plan</h2><ul class="ticks">${INCLUDED.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
<div class="card"><h3>Need a larger volume?</h3><p>If you build hundreds of previews a month, tell us how many and we'll make a custom pack. Teams can also run several accounts.</p><a class="btn" href="/contact">Talk to us</a></div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:30px"><h2>Pricing questions</h2></div>${faqList(FAQS.filter((f) => /credit|pay|brand/i.test(f.q)))}</div></section>${ctaBand()}`;
}

export function resellersPage(): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">For resellers</span><h1>Your agency's name on a website engine</h1><p class="lead" style="margin-top:16px">Win more local clients by showing them their site first. Forge does the building; you keep the relationship, the brand and the price.</p><div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn lg" href="/resellers/apply">Apply to resell</a><a class="btn alt lg" href="/pricing">See pricing</a></div></div></div>
<section class="tight"><div class="wrap"><div class="cards">
<div class="card"><span class="ico">🏷️</span><h3>White-label</h3><p>The credit line at the bottom of each demo can carry your agency's name and link, or be removed.</p></div>
<div class="card"><span class="ico">👥</span><h3>Your team</h3><p>Invite as many team members as you like. Owners manage the account; members build demos.</p></div>
<div class="card"><span class="ico">🔑</span><h3>API &amp; webhooks</h3><p>Create demos from your own system and get a signed message when one is ready or a form is submitted.</p></div>
<div class="card"><span class="ico">📊</span><h3>Clear credits</h3><p>See your balance and the history of every build. Failed builds are refunded automatically.</p></div>
<div class="card"><span class="ico">🔒</span><h3>Your data stays yours</h3><p>Accounts are isolated from each other. Nobody else can see your demos or your clients' form submissions.</p></div>
<div class="card"><span class="ico">🎬</span><h3>Your own videos</h3><p>Add your own hero videos for the trades you sell to, on top of the shared library.</p></div></div></div></section>
<section class="band"><div class="wrap"><div class="center" style="margin-bottom:30px"><span class="eyebrow">Getting started</span><h2>Live in a day</h2></div><div class="steps">
<div class="step" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15)"><b>1</b><h3>Apply</h3><p>Tell us about your agency and the trades you target.</p></div>
<div class="step" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15)"><b>2</b><h3>Get your account</h3><p>We create it, add your first credits and send your sign-in link.</p></div>
<div class="step" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15)"><b>3</b><h3>Build and send</h3><p>Make your first previews and send them to prospects.</p></div></div></div></section>
<section><div class="wrap"><div class="center" style="margin-bottom:30px"><h2>Reseller questions</h2></div>${faqList(FAQS.slice(3, 9))}</div></section>${ctaBand()}`;
}

export function examplesPage(items: Showcase[], samples: Showcase[] = []): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">Examples</span><h1>Sites built by Forge</h1><p class="lead" style="margin-top:16px">Open them on your phone. Every one starts from just a business name.</p></div></div>
${items.length ? `<section class="tight"><div class="wrap"><div class="head"><h2>Recent builds</h2></div>${showcaseCards(items)}</div></section>` : ""}
${samples.length ? `<section class="tight"><div class="wrap"><div class="head"><div><h2>Sample designs</h2><p>Fictional businesses, so you can see the structure, forms and layout. Forge's full multi-page designs go further.</p></div></div>${showcaseCards(samples)}</div></section>` : ""}
<section class="tight"><div class="wrap"><div class="card" style="grid-template-columns:1fr auto;align-items:center"><div><h3>Want a sample for a business you know?</h3><p>Tell us the business and we'll build one for you to look at.</p></div><a class="btn" href="/contact?kind=sample">Request a sample</a></div></div></section>${ctaBand()}`;
}

export function tradesIndex(q: string): string {
  const needle = q.trim().toLowerCase();
  const list = needle ? TRADES.filter((t) => `${t.who} ${t.name} ${t.search} ${t.services.join(" ")}`.toLowerCase().includes(needle)) : TRADES;
  const body = needle
    ? list.length
      ? `<div class="grid4">${list.map(tradeCard).join("")}</div>`
      : `<div class="card"><h3>No match for "${esc(q.slice(0, 60))}"</h3><p>Forge can design for almost any local business, even ones we haven't listed. Tell us what you sell to.</p><a class="btn" href="/contact">Ask us</a></div>`
    : TRADE_GROUPS.map((g) => `<h3 style="margin:26px 0 14px">${esc(g)}</h3><div class="grid4">${TRADES.filter((t) => t.group === g).map(tradeCard).join("")}</div>`).join("");
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">Trades</span><h1>${needle ? `Results for "${esc(q.slice(0, 60))}"` : "Websites for every kind of local business"}</h1><p class="lead" style="margin-top:16px">Pick a trade to see what Forge builds for it.</p></div></div>
<section class="tight"><div class="wrap">${body}</div></section>${ctaBand()}`;
}

export function tradePage(t: Trade): string {
  const others = TRADES.filter((x) => x.slug !== t.slug && x.group === t.group).slice(0, 4);
  return `<div class="pagehead"><div class="wrap"><div class="crumb"><a href="/trades">Trades</a> / ${esc(t.who)}</div><span class="eyebrow">For agencies selling to ${esc(t.who)}</span><h1>Show ${esc(t.who)} their new website before they pay</h1><p class="lead" style="margin-top:16px">${esc(t.pain)} Forge builds a complete site for any ${esc(t.name.toLowerCase())} in minutes, so your pitch starts with the finished thing.</p><div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn lg" href="/resellers/apply">Apply to resell</a><a class="btn alt lg" href="/contact?kind=sample&trade=${t.slug}">Get a sample</a></div></div></div>
<section class="tight"><div class="wrap split"><div><h2>What a ${esc(t.name.toLowerCase())} site includes</h2><p class="lead" style="margin:12px 0">A home page that speaks to people searching "${esc(t.search)}", with a page for each service:</p><ul class="ticks">${t.services.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
<div class="card"><h3>And on every site</h3><ul class="ticks" style="margin:6px 0 0">${INCLUDED.slice(0, 5).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div></div></section>
<section style="background:var(--paper)"><div class="wrap"><div class="head"><div><h2>How to pitch ${esc(t.who)}</h2></div></div><div class="cards">
<div class="card"><h3>Lead with the preview</h3><p>Send the finished site with a two-line message. ${esc(t.who.replace(/^./, (c) => c.toUpperCase()))} are busy; a link they can tap beats a call they have to schedule.</p></div>
<div class="card"><h3>Point at what customers need</h3><p>${esc(t.pain)} Show how the preview answers it on the first screen.</p></div>
<div class="card"><h3>Offer the next step</h3><p>Ask what they'd change first. It starts a conversation about their business, not your price.</p></div></div></div></section>
<section><div class="wrap"><div class="head"><h2>More trades</h2></div><div class="grid4">${others.map(tradeCard).join("")}</div></div></section>${ctaBand()}`;
}

export function guidesIndex(): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">The playbook</span><h1>Guides for selling websites to local businesses</h1><p class="lead" style="margin-top:16px">Plain advice on finding clients, pricing and pitching.</p></div></div>
<section class="tight"><div class="wrap"><div class="cards">${GUIDES.map(guideCard).join("")}</div></div></section>${ctaBand()}`;
}

export function guidePage(g: Guide): string {
  return `<div class="pagehead"><div class="wrap"><div class="crumb"><a href="/guides">Guides</a> / ${esc(g.title)}</div><span class="pill">${esc(g.read)} read</span><h1 style="margin-top:12px;max-width:20ch">${esc(g.title)}</h1><p class="lead" style="margin-top:16px">${esc(g.blurb)}</p></div></div>
<section class="tight"><div class="wrap"><article class="prose">${g.body.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("")}</article></div></section>
<section class="tight"><div class="wrap"><div class="head"><h2>Keep reading</h2></div><div class="cards">${GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3).map(guideCard).join("")}</div></div></section>${ctaBand()}`;
}

export function faqPage(): string {
  return `<div class="pagehead"><div class="wrap center"><span class="eyebrow">Questions</span><h1>Everything you might ask</h1></div></div><section class="tight"><div class="wrap">${faqList()}<p class="center" style="margin-top:26px">Something else? <a href="/contact">Ask us</a>.</p></div></section>${ctaBand()}`;
}

export type FormKind = "contact" | "sample" | "reseller";
export interface FormState {
  kind: FormKind;
  values: Record<string, string>;
  error?: string;
}

const val = (s: FormState, k: string) => esc(s.values[k] ?? "");

export function formPage(s: FormState): string {
  const reseller = s.kind === "reseller";
  const sample = s.kind === "sample";
  const title = reseller ? "Apply to the reseller program" : sample ? "Get a free sample" : "Talk to us";
  const sub = reseller
    ? "Tell us about your agency. We reply within one business day to set up your account."
    : sample
      ? "Tell us a business you'd like to see a website for. We'll build one and send you the link."
      : "Questions, bigger volumes or something custom? Send us a note.";
  const trade = s.values.trade ?? "";
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">${reseller ? "Resellers" : "Contact"}</span><h1>${esc(title)}</h1><p class="lead" style="margin-top:16px">${esc(sub)}</p></div></div>
<section class="tight"><div class="wrap" style="max-width:760px"><form class="f" method="post" action="${reseller ? "/resellers/apply" : "/contact"}">${s.error ? `<div class="err" role="alert">${esc(s.error)}</div>` : ""}
<input type="hidden" name="kind" value="${s.kind}"><div class="hp" aria-hidden="true"><label>Leave this empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
<div class="two"><label>Your name<input name="name" required maxlength="80" value="${val(s, "name")}" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="120" value="${val(s, "email")}" autocomplete="email"></label></div>
<div class="two"><label>${reseller ? "Agency or company" : "Company (optional)"}<input name="company" maxlength="100" value="${val(s, "company")}" ${reseller ? "required" : ""} autocomplete="organization"></label><label>Phone (optional)<input name="phone" type="tel" maxlength="40" value="${val(s, "phone")}" autocomplete="tel"></label></div>
<label>${sample ? "The business's name and website" : "Your website (optional)"}<input name="website" maxlength="200" value="${val(s, "website")}" placeholder="${sample ? "e.g. Joe's Plumbing, joesplumbing.com" : "https://"}"></label>
${
  reseller
    ? `<div class="two"><label>Sites you'd like to build each month<select name="volume">${["1–10", "11–50", "51–200", "200+"].map((v) => `<option${s.values.volume === v ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Pack you're interested in<input name="plan" maxlength="40" value="${val(s, "plan")}" placeholder="Starter, Agency, Studio"></label></div>
<label>Which trades do you sell to?<input name="trades" maxlength="160" value="${val(s, "trades")}" placeholder="e.g. plumbers, dentists in Orlando"></label>`
    : sample && trade
      ? `<input type="hidden" name="trade" value="${esc(trade)}"><p class="small">Trade: <b>${esc(tradeBySlug(trade)?.who ?? trade)}</b></p>`
      : ""
}
<label>${reseller ? "Anything else we should know?" : "How can we help?"}<textarea name="message" rows="5" maxlength="2000" ${reseller ? "" : "required"}>${val(s, "message")}</textarea></label>
<button class="btn lg" type="submit">${reseller ? "Send my application" : "Send"}</button><p class="small">We use your details only to reply to you. See our <a href="/privacy">privacy policy</a>.</p></form></div></section>`;
}

export function thanksPage(kind: FormKind): string {
  const reseller = kind === "reseller";
  return `<section><div class="wrap" style="max-width:760px"><div class="okbox"><span class="ico">✓</span><h1 style="font-size:2.2rem">${reseller ? "Application received" : "Thanks, we've got it"}</h1><p class="lead">${reseller ? "We'll review it and reply within one business day with the next steps and your first invoice." : "We'll reply by email, usually within one business day."}</p><div><a class="btn" href="/">Back to the home page</a></div></div></div></section>`;
}

const LEGAL_UPDATED = "November 2026";

export function termsPage(): string {
  return `<div class="pagehead"><div class="wrap"><h1>Terms of service</h1><p class="small" style="margin-top:12px">Last updated ${LEGAL_UPDATED}</p></div></div><section class="tight"><div class="wrap"><article class="prose">
<h2>The service</h2><p>Forge is provided by Mianro Systems ("we"). It lets approved accounts create preview websites for businesses, and share them by link. A preview is a draft meant to help win a client; it is not a hosted production website unless we agree otherwise in writing.</p>
<h2>Accounts and credits</h2><p>Access is by invitation. You are responsible for what happens under your account and for keeping sign-ins private. One credit builds one site; credits are refunded when a build fails and are otherwise not refundable. Packs are invoiced and credits are added when payment is received.</p>
<h2>What you may build</h2><p>Only build previews for real businesses you have a genuine reason to contact, and only with information you are entitled to use. Do not use Forge for anything unlawful, misleading or harmful, to impersonate a business, or to send unsolicited messages in breach of the law that applies to you. You are responsible for following those laws.</p>
<h2>Content and AI</h2><p>Previews are written by AI from the details you provide and public information. Check them before you rely on them, including any claims, prices, licences or reviews. Photos in previews are illustrative.</p>
<h2>Availability</h2><p>We work to keep Forge running but do not promise it will always be available. We may suspend an account that breaks these terms or puts others at risk, and we may change or end features with notice where we can.</p>
<h2>Liability</h2><p>To the extent the law allows, our liability for any claim is limited to the amount you paid us in the three months before the claim, and we are not liable for indirect or lost-profit losses.</p>
<h2>Contact</h2><p>Questions about these terms: use the <a href="/contact">contact form</a>.</p></article></div></section>`;
}

export function privacyPage(): string {
  return `<div class="pagehead"><div class="wrap"><h1>Privacy policy</h1><p class="small" style="margin-top:12px">Last updated ${LEGAL_UPDATED}</p></div></div><section class="tight"><div class="wrap"><article class="prose">
<h2>What we collect</h2><p>On this website: the details you type into our forms (name, email, phone, company, message). We do not use advertising trackers. When you use an account: your email, a hashed password, the businesses you build previews for, and the form submissions that arrive on those previews.</p>
<h2>How we use it</h2><p>To reply to you, run your account, keep the service secure and invoice you. We do not sell personal information.</p>
<h2>Who sees it</h2><p>Only our staff, and the service providers that run Forge for us (our hosting, our AI providers and our fonts provider). Each account can see only its own data.</p>
<h2>Visitors to preview sites</h2><p>When someone fills in a form on a preview site, the details go to the account that built it. That account decides what to do with them and is responsible for doing so lawfully.</p>
<h2>Keeping and deleting</h2><p>We keep inquiries for as long as needed to follow up. You can ask us to delete your details at any time through the <a href="/contact">contact form</a>.</p>
<h2>Security</h2><p>Passwords are stored hashed, sign-in attempts are limited, preview sites are isolated from the app, and accounts cannot see one another's data.</p></article></div></section>`;
}

export function notFoundPage(): string {
  return `<section><div class="wrap center" style="max-width:640px"><span class="eyebrow">404</span><h1>That page isn't here</h1><p class="lead" style="margin-top:16px">It may have moved. Try one of these instead.</p><div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn" href="/">Home</a><a class="btn alt" href="/trades">Trades</a><a class="btn alt" href="/pricing">Pricing</a></div></div></section>`;
}

export function homeLd(origin: string, plans: Plan[]): unknown[] {
  return [
    { "@context": "https://schema.org", "@type": "Organization", name: "Forge by Mianro Systems", url: origin, logo: `${origin}/favicon.svg`, description: "AI-designed websites for local businesses, with a white-label reseller program." },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Forge", url: origin, potentialAction: { "@type": "SearchAction", target: `${origin}/trades?q={query}`, "query-input": "required name=query" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ...plans.map((p) => ({ "@context": "https://schema.org", "@type": "Offer", name: `${p.name} pack: ${p.credits} site credits`, price: p.price.replace(/[^0-9.]/g, "") || undefined, priceCurrency: "USD", url: `${origin}/pricing` })),
  ];
}
