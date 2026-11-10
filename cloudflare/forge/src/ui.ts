/** The Forge Demo screens: sign-in, set-up, invites, the dashboard and a demo. Plain HTML, no framework. */
import { esc } from "../../../src/forge/render";
import type { Intake } from "../../../src/forge/schema";
import type { ChangeNote, Lead, Listed, Stored, ViewStat } from "./db";
import type { Review } from "./review";
import { SWATCHES } from "./designer";
import type { Session } from "./auth";
import { STUDIO_CREDITS, buildCost, type Usage } from "./tenants";
import { CONCEPTS } from "./concepts";
import { ic } from "./web-ui";

const THEME_BOOT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem("forge-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t)})()`;
const THEME_JS = `document.addEventListener("click",function(e){var b=e.target.closest("[data-theme-toggle]");if(!b)return;var d=document.documentElement,t=d.getAttribute("data-theme")==="dark"?"light":"dark";d.setAttribute("data-theme",t);try{localStorage.setItem("forge-theme",t)}catch(x){}});`;
const toggle = (cls = "tbtn") => `<button class="${cls}" type="button" data-theme-toggle aria-label="Switch light or dark mode" title="Light or dark mode">${ic("sun", "sun")}${ic("moon", "moon")}</button>`;

const CSS = `
:root{--bg:#f5f6f8;--surface:#fff;--ink:#172033;--muted:#5a6478;--line:#dde1e8;--ember:#d9601f;--ember-soft:#fbe9dd;--steel:#1d4f8c;--steel-soft:#e3ecf7;--ok:#217a4b;--ok-soft:#e1f2e8;--bad:#a32b2b;--bad-soft:#fbe4e4;--chrome:#e9ecf1;
--display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;--body:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
[data-theme=dark]{--bg:#11151d;--surface:#181e29;--ink:#e8ecf3;--muted:#9aa4b6;--line:#2a3242;--ember:#f08447;--ember-soft:#3a2418;--steel:#7fb0ea;--steel-soft:#1c2a3e;--ok:#6fd19c;--ok-soft:#173326;--bad:#f19a9a;--bad-soft:#3a1c1c;--chrome:#222a38;color-scheme:dark}
@media (prefers-color-scheme:dark){:root:not([data-theme]){--bg:#11151d;--surface:#181e29;--ink:#e8ecf3;--muted:#9aa4b6;--line:#2a3242;--ember:#f08447;--ember-soft:#3a2418;--steel:#7fb0ea;--steel-soft:#1c2a3e;--ok:#6fd19c;--ok-soft:#173326;--bad:#f19a9a;--bad-soft:#3a1c1c;--chrome:#222a38;color-scheme:dark}}
.tbtn{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:inline-grid;place-items:center;cursor:pointer;padding:0}.tbtn svg{width:17px;height:17px}.tbtn .moon{display:none}[data-theme=dark] .tbtn .sun{display:none}[data-theme=dark] .tbtn .moon{display:block}
.tcorner{position:fixed;top:14px;right:14px;z-index:5}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--body)}
a{color:var(--steel)}
h1,h2,h3{font-family:var(--display);line-height:1.15;letter-spacing:-.01em;margin:0;text-wrap:balance}
h1{font-size:clamp(1.7rem,4vw,2.2rem);font-weight:800}h2{font-size:1.25rem;font-weight:700}
.top{background:var(--surface);border-bottom:1px solid var(--line)}
.top-in,.main{max-width:980px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.top-in{display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding-block:12px}
.brand{font-family:var(--display);font-weight:800;font-size:1.15rem;color:var(--ink);text-decoration:none;display:flex;align-items:center;gap:8px}
.brand i{width:26px;height:26px;border-radius:8px;background:var(--ember);display:inline-block}
.nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;font-size:.92rem;min-width:0}.nav a{color:var(--muted);text-decoration:none}.nav a.on{color:var(--steel);font-weight:600}
.nav form{margin:0}.linkbtn{background:none;border:0;color:var(--muted);font:inherit;cursor:pointer;padding:0}
.main{padding-block:32px 64px;display:grid;gap:28px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;display:grid;gap:16px;min-width:0}
.lead{color:var(--muted);max-width:65ch;margin:6px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
label{display:grid;gap:6px;font-size:.85rem;font-weight:600}
input,textarea,select{font:inherit;font-weight:400;border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:var(--bg);color:var(--ink);width:100%}
input:focus,textarea:focus{outline:2px solid var(--steel-soft);border-color:var(--steel)}
.full{grid-column:1/-1}
details summary{cursor:pointer;color:var(--steel);font-size:.92rem;font-weight:600}
details[open] summary{margin-bottom:14px}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--steel);color:#fff;border:0;border-radius:9px;padding:11px 18px;font:600 .95rem var(--body);cursor:pointer;text-decoration:none}
.btn:hover{filter:brightness(1.1)}.btn:disabled{opacity:.6;cursor:wait}
.btn.ember{background:var(--ember)}.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);padding:7px 12px;font-size:.85rem}
.btn.danger{background:transparent;color:var(--bad);border:1px solid var(--line);font-size:.85rem;padding:7px 12px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.flash{border-radius:10px;padding:12px 16px;font-weight:600}.flash.ok{background:var(--ok-soft);color:var(--ok)}.flash.bad{background:var(--bad-soft);color:var(--bad)}
.share{display:grid;gap:10px}
.share-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;flex-wrap:wrap}
.share-row div{min-width:0;display:grid;gap:2px}.share-row b{font-size:.9rem}
.share-row span{font:.8rem var(--mono);color:var(--muted);overflow-wrap:anywhere;white-space:pre-wrap}
.note{font-size:.88rem;color:var(--muted)}
.table{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.92rem}th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}tr:last-child td{border-bottom:0}
.preview{width:100%;height:72vh;border:1px solid var(--line);border-radius:12px;background:#fff}
pre{font:.78rem/1.5 var(--mono);background:var(--steel-soft);border-radius:10px;padding:14px;overflow-x:auto;margin:0}
.pill{font:600 .72rem var(--body);letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--ember-soft);color:var(--ember)}
.login{max-width:380px;margin:12vh auto;padding-inline:16px}
.empty{color:var(--muted);text-align:center;padding:28px}
.look{display:grid;gap:14px}.look-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.choice{position:relative;display:inline-flex}.choice input{position:absolute;opacity:0;pointer-events:none}
.choice span{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-weight:600;font-size:.88rem;cursor:pointer;background:var(--surface)}
.choice input:checked+span{border-color:var(--steel);box-shadow:0 0 0 2px var(--steel-soft);color:var(--steel)}
.choice input:focus-visible+span{outline:2px solid var(--steel)}
.dot{width:16px;height:16px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.15)}
.dot.auto{background:conic-gradient(#e3a92b,#e2622b,#c8323c,#7652d6,#2f5fd0,#11968a,#2f8a4f,#e3a92b)}
.status{display:flex;gap:14px;align-items:center;padding:18px;border-radius:12px;background:var(--steel-soft)}
.status.bad{background:var(--bad-soft);color:var(--bad)}
.spin{width:22px;height:22px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--steel);animation:sp 1s linear infinite;flex:none}
@keyframes sp{to{transform:rotate(360deg)}}
.tag{font:600 .72rem var(--body);padding:3px 9px;border-radius:999px;background:var(--steel-soft);color:var(--steel)}
.tag.bad{background:var(--bad-soft);color:var(--bad)}
.tag.ok{background:var(--ok-soft);color:var(--ok)}.tag.dim{background:var(--chrome);color:var(--muted)}
.credits{font:600 .78rem var(--body);padding:4px 10px;border-radius:999px;background:var(--steel-soft);color:var(--steel);max-width:100%;overflow-wrap:anywhere}
.right{margin-left:auto}
.hero-form{padding:28px;gap:18px;border-color:var(--ember);box-shadow:0 18px 50px -34px var(--ember)}
.big-field{font-size:.95rem}.big-field input{font-size:1.15rem;padding:15px 16px}
.btn.big{font-size:1.05rem;padding:14px 26px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.site-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;display:grid;gap:12px;min-width:0}
.thumb{display:block;aspect-ratio:16/10;border-radius:9px;overflow:hidden;background:var(--chrome);border:1px solid var(--line);text-decoration:none}
.thumb img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.thumb span{display:grid;place-items:center;height:100%;font:800 2.6rem var(--display);color:var(--muted)}
.site-name{font-weight:700;color:var(--ink);text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.step h2{display:flex;align-items:center;gap:10px}
.stepn{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--surface);display:inline-grid;place-items:center;font:700 .95rem var(--body);flex:none}
.next{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:18px;border-radius:12px;background:var(--ember-soft);border:1px solid var(--ember)}
.issue{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px}.issue>div{min-width:0}
.designs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.design{position:relative;display:grid;gap:4px;border:1px solid var(--line);border-radius:12px;padding:8px;cursor:pointer;background:var(--surface);font-weight:400}
.design input{position:absolute;opacity:0;pointer-events:none}.design:has(input:checked){border-color:var(--steel);box-shadow:0 0 0 2px var(--steel-soft)}.design:has(input:focus-visible){outline:2px solid var(--steel)}
.design b{font-size:.9rem}.design small{color:var(--muted);font-size:.78rem}
.design-pic{display:grid;place-items:center;aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:var(--chrome);font:800 1.8rem var(--display);color:var(--muted)}.design-pic img{width:100%;height:100%;object-fit:cover;object-position:top}
.score{font:800 2.2rem var(--display);color:var(--steel);line-height:1}.score small{font-size:1rem;color:var(--muted)}
.mono{font:.8rem var(--mono)}
`;

const COPY_JS = `document.addEventListener("click",async e=>{const b=e.target.closest("[data-copy]");if(!b)return;const t=b.getAttribute("data-copy");try{await navigator.clipboard.writeText(t);b.textContent="Copied";setTimeout(()=>b.textContent="Copy",1500)}catch{prompt("Copy this:",t)}});
document.addEventListener("submit",e=>{const b=e.target.querySelector("button[data-busy]");if(b){b.disabled=true;b.textContent=b.getAttribute("data-busy")}});`;

export type NavItem = "demos" | "team" | "api" | "settings" | "admin";

export interface PageOpts {
  /** Which menu item is current. */
  nav?: NavItem;
  /** Who is signed in (the menu shows only for a signed-in person). */
  session?: Session;
}

/** Owners (and Mianro staff) run the account; members just build demos. */
export const isOwner = (s: Session) => s.user.role === "owner" || s.user.role === "admin";

export const creditsText = (s: Session) => (s.tenant.unlimited ? "Unlimited builds" : `${s.tenant.credits} credit${s.tenant.credits === 1 ? "" : "s"} left`);

export function page(title: string, body: string, opts: PageOpts = {}): Response {
  const s = opts.session;
  const link = (id: NavItem, href: string, label: string) => `<a href="${href}" class="${opts.nav === id ? "on" : ""}">${label}</a>`;
  const nav = s
    ? `<header class="top"><div class="top-in"><a class="brand" href="/"><i></i>Forge <span style="font-weight:600;opacity:.6">Websites</span></a><nav class="nav">
${link("demos", "/", "Websites")}${isOwner(s) ? link("settings", "/settings", "Settings") : ""}${s.user.role === "admin" ? link("admin", "/admin", "Admin") : ""}
<span class="credits" title="${esc(s.user.email)}">${esc(s.tenant.name)} · ${esc(creditsText(s))}</span>
${toggle()}<form method="post" action="/logout"><button class="linkbtn">Sign out</button></form></nav></div></header>`
    : `<div class="tcorner">${toggle()}</div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script>${THEME_BOOT}</script>
<title>${esc(title)} · Forge Demo</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&family=JetBrains+Mono&display=swap">
<style>${CSS}</style></head><body>${nav}${body}<script>${COPY_JS}${THEME_JS}</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "SAMEORIGIN", "x-content-type-options": "nosniff", "referrer-policy": "same-origin" } });
}

export const flash = (ok?: string, err?: string) =>
  `${ok ? `<div class="flash ok" role="status">✓ ${esc(ok)}</div>` : ""}${err ? `<div class="flash bad" role="alert">${esc(err)}</div>` : ""}`;

const brand = `<a class="brand" href="/"><i></i>Forge Demo</a>`;

export function loginPage(error?: string, canSetup = false, email = ""): Response {
  return page(
    "Sign in",
    `<main class="login card">${brand}
${flash(undefined, error)}
<form method="post" action="/login" class="card" style="padding:0;border:0;gap:14px">
<label for="em">Email<input id="em" name="email" type="email" autocomplete="username" required${email ? "" : " autofocus"} value="${esc(email)}"></label>
<label for="pw">Password<input id="pw" name="password" type="password" autocomplete="current-password" required${email ? " autofocus" : ""}></label>
<button class="btn" type="submit">Sign in</button></form>
${canSetup ? `<p class="note" style="margin:0"><a href="/setup">First time here? Set up the administrator account.</a></p>` : ""}</main>`,
  );
}

/** First-run setup: the one-off team password proves it's really the owner, then the first admin is made. */
export function setupPage(error?: string, email = ""): Response {
  return page(
    "Set up",
    `<main class="login card">${brand}
<div><h2>Set up the administrator</h2><p class="note" style="margin:6px 0 0">Forge Demo now has accounts, so each person signs in with their own email and password. Create the first administrator here. Enter the current team password to confirm it's you; after this it's no longer needed.</p></div>
${flash(undefined, error)}
<form method="post" action="/setup" class="card" style="padding:0;border:0;gap:14px">
<label for="tp">Current team password<input id="tp" name="team" type="password" autocomplete="off" required autofocus></label>
<label for="se">Your email<input id="se" name="email" type="email" autocomplete="username" required value="${esc(email)}"></label>
<label for="sp">New password (10+ characters)<input id="sp" name="password" type="password" autocomplete="new-password" minlength="10" required></label>
<label for="sc">New password again<input id="sc" name="confirm" type="password" autocomplete="new-password" minlength="10" required></label>
<button class="btn" type="submit">Create administrator</button></form></main>`,
  );
}

/** Accept an invitation, or choose a new password from a reset link. */
export function invitePage(info: { kind: "invite" | "reset"; email: string; account: string }, token: string, error?: string): Response {
  const invite = info.kind === "invite";
  return page(
    invite ? "Join" : "New password",
    `<main class="login card">${brand}
<div><h2>${invite ? `Join ${esc(info.account)}` : "Choose a new password"}</h2><p class="note" style="margin:6px 0 0">${invite ? "Choose a password to create your account." : `For ${esc(info.email)}.`}</p></div>
${flash(undefined, error)}
<form method="post" action="/invite/${esc(token)}" class="card" style="padding:0;border:0;gap:14px">
${invite ? `<label>Email<input value="${esc(info.email)}" disabled></label>` : ""}
<label for="ip">Password (10+ characters)<input id="ip" name="password" type="password" autocomplete="new-password" minlength="10" required autofocus></label>
<label for="ic">Password again<input id="ic" name="confirm" type="password" autocomplete="new-password" minlength="10" required></label>
<button class="btn" type="submit">${invite ? "Create my account" : "Save password"}</button></form></main>`,
  );
}

export interface ReuseChoice {
  slug: string;
  /** The business the design was made for. */
  name: string;
  /** Its trade, e.g. "Landscaping". */
  trade: string;
  /** A picture of the site, when there is one. */
  thumb?: string;
}

export function fields(v?: Partial<Intake>, reuse: ReuseChoice[] = []): string {
  const t = (name: keyof Intake, label: string, ph: string, required = false, type = "text") =>
    `<label for="f-${name}">${label}<input id="f-${name}" name="${name}" type="${type}" value="${esc((v?.[name] as string) ?? "")}" placeholder="${esc(ph)}"${required ? " required" : ""}></label>`;
  const a = (name: keyof Intake, label: string, ph: string) =>
    `<label class="full" for="f-${name}">${label}<textarea id="f-${name}" name="${name}" rows="3" placeholder="${esc(ph)}">${esc((v?.[name] as string) ?? "")}</textarea></label>`;
  const mode = v?.mode ?? "auto";
  const color = v?.primaryColor ?? "";
  const custom = !!color && !SWATCHES.some((c) => c.hex.toLowerCase() === color.toLowerCase());
  const radio = (name: string, value: string, checked: boolean, label: string) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}><span>${label}</span></label>`;
  const style = v?.style ?? "standard";
  const tier = `<fieldset class="look" style="border:0;padding:0;margin:0"><legend class="note" style="font-weight:600;margin-bottom:8px">Style</legend>
<div class="look-row">${radio("style", "standard", style !== "studio", "Standard · 1 credit")}${radio("style", "studio", style === "studio", `Studio · ${STUDIO_CREDITS} credits`)}</div>
<label for="f-concept" style="max-width:420px">Studio art direction<select id="f-concept" name="concept"><option value="auto"${(v?.concept ?? "auto") === "auto" ? " selected" : ""}>Auto: the best fit for the trade, different each time</option>${CONCEPTS.map((c) => `<option value="${esc(c.id)}"${v?.concept === c.id ? " selected" : ""}>${esc(c.name)}: ${esc(c.blurb)}</option>`).join("")}</select></label>
<p class="note" style="margin:0"><b>Standard</b>: a polished, fast multi-page site. <b>Studio</b>: an award-style, art-directed site with kinetic type, smooth scrolling, WebGL backgrounds, a custom cursor and page transitions, held to one of nine distinct art directions (the choice above only applies to Studio). It takes longer and uses the larger models.</p></fieldset>`;
  const pick = (value: string, checked: boolean, inner: string) => `<label class="design"><input type="radio" name="reuseFrom" value="${esc(value)}"${checked ? " checked" : ""}>${inner}</label>`;
  const reuseSel = reuse.length
    ? `<fieldset class="look" style="border:0;padding:0;margin:0"><legend class="note" style="font-weight:600;margin-bottom:8px">Design</legend>
<div class="designs">${pick("", !reuse.some((r) => r.slug === v?.reuseFrom), `<span class="design-pic new">+</span><b>A brand-new design</b><small>Made from scratch for this business</small>`)}${reuse
        .map((r) =>
          pick(
            r.slug,
            v?.reuseFrom === r.slug,
            `<span class="design-pic">${r.thumb ? `<img loading="lazy" src="${esc(r.thumb)}" alt="">` : esc((r.trade || r.name).slice(0, 1).toUpperCase())}</span><b>${esc(r.trade ? `${r.trade} website` : "Website")}</b><small>The look of ${esc(r.name)} · 1 credit, faster</small>`,
          ),
        )
        .join("")}</div>
<p class="note" style="margin:0">Pick a look you already like and the new site gets the same design with this business's own words, photos and details. Best when the trade is the same or close.</p></fieldset>`
    : "";
  const look = `<fieldset class="look" style="border:0;padding:0;margin:0"><legend class="note" style="font-weight:600;margin-bottom:8px">Look</legend>
<div class="look-row">${radio("mode", "auto", mode === "auto", "✨ Let the AI choose")}${radio("mode", "dark", mode === "dark", "🌙 Dark")}${radio("mode", "light", mode === "light", "☀️ Light")}</div>
<div class="look-row">${radio("primaryColor", "", !color, `<i class="dot auto"></i>Auto colour`)}${SWATCHES.map((c) =>
    radio("primaryColor", c.hex, c.hex.toLowerCase() === color.toLowerCase(), `<i class="dot" style="background:${c.hex}"></i>${c.name}`),
  ).join("")}${radio("primaryColor", "custom", custom, `<i class="dot" style="background:${custom ? esc(color) : "#fff"}"></i>Custom`)}
<input name="customColor" type="color" value="${custom ? esc(color) : "#2f5fd0"}" aria-label="Custom colour" style="width:44px;height:36px;padding:2px"></div>
<p class="note" style="margin:0">Every site gets a light/dark switch; this sets which one it opens in.</p></fieldset>`;
  return `<div class="grid"><label class="full big-field" for="f-businessName">Business name or Google Maps link<input id="f-businessName" name="businessName" value="${esc(v?.businessName ?? "")}" placeholder="e.g. Vanguard Pipe & Water   or   https://maps.app.goo.gl/…" required autocomplete="off"></label>
${t("city", "City (optional, adds a map)", "e.g. Myrtle Beach, SC")}${t("industry", "What they do (optional)", "e.g. Plumbing, Roofing, Hair salon")}</div>
<details><summary>More options</summary><div style="display:grid;gap:16px;margin-top:12px">
<p class="note" style="margin:0">Everything here is optional. Left alone, Forge picks what suits the business.</p>
${reuseSel}${tier}${look}
<div class="grid">${t("phone", "Phone", "e.g. (646) 594-9379")}${t("googleUrl", "Google Maps link", "https://maps.app.goo.gl/…", false, "url")}
${t("websiteUrl", "Their current website (we read it for facts, photos and contact details)", "https://…", false, "url")}
${a("services", "Services", "Comma or line separated, e.g. Drain cleaning, Water heaters")}
${a("serviceAreas", "Service areas", "e.g. Myrtle Beach, Conway, Surfside Beach")}
${t("address", "Street address", "e.g. 100 Main St, Myrtle Beach, SC 29577")}${t("hours", "Opening hours", "e.g. Mon–Fri 8am–5pm")}
${a("reviews", "Real reviews to quote", "One per paragraph, optionally ending — Name, Town. Leave empty for clearly-marked sample reviews.")}
${a("notes", "Other facts about the business", "e.g. Family owned since 2009, owner Matt, free estimates, 24/7")}
${a("photoUrls", "Photo links (one per line)", "Links to photos of their work, team or premises, e.g. from their Google listing or Facebook")}
${t("logoUrl", "Logo image link", "https://…", false, "url")}${t("heroImageUrl", "Main photo link", "https://…", false, "url")}
${t("chatWidget", "Chat widget (GoHighLevel)", "Empty: the account's widget. Or paste a widget ID / embed code, or type off")}
</div></div></details>`;
}

const stat = (label: string, value: string | number) => `<div class="card" style="gap:2px;padding:16px"><span class="note">${esc(label)}</span><b style="font:800 1.6rem var(--display)">${esc(String(value))}</b></div>`;

/** One website on the home screen: a picture of it, its state in plain words, and the two things people do with it. */
function siteCard(d: Listed, url: string): string {
  const state =
    d.buildStatus === "building"
      ? `<span class="tag">Building…</span>`
      : d.buildStatus === "queued"
        ? `<span class="tag dim">Waiting its turn</span>`
        : d.buildStatus === "failed"
          ? `<span class="tag bad">Needs attention</span>`
          : `<span class="tag ok">Ready</span>`;
  const thumb = d.shot ? `<img loading="lazy" src="${esc(url)}/_img/${esc(d.shot)}/shot-desktop.jpg" alt="">` : `<span>${esc(d.businessName.slice(0, 1).toUpperCase())}</span>`;
  return `<article class="site-card"><a class="thumb" href="/demos/${esc(d.slug)}" aria-label="${esc(d.businessName)}">${thumb}</a>
<div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><a class="site-name" href="/demos/${esc(d.slug)}">${esc(d.businessName)}</a><div class="note">${esc([d.city, d.createdAt.slice(0, 10)].filter(Boolean).join(" · "))}</div></div>${state}</div>
<div class="row"><a class="btn ghost" href="/demos/${esc(d.slug)}">Open</a><button class="btn ghost" data-copy="${esc(url)}">Copy link</button></div></article>`;
}

export function homePage(s: Session, demos: Listed[], siteUrl: (slug: string) => string, aiOn: boolean, usage: Usage, err?: string, ok?: string): Response {
  const out = !s.tenant.unlimited && s.tenant.credits < 1;
  const reuse: ReuseChoice[] = demos
    .filter((d) => d.buildStatus === "ready" && d.shot)
    .slice(0, 12)
    .map((d) => ({ slug: d.slug, name: d.businessName, trade: d.industry, thumb: `${siteUrl(d.slug)}/_img/${d.shot}/shot-desktop.jpg` }));
  const list = demos.length
    ? `<div class="cards">${demos.map((d) => siteCard(d, siteUrl(d.slug))).join("")}</div>`
    : `<div class="card empty">Your websites will appear here. Build the first one above: it takes one line.</div>`;
  return page(
    "Websites",
    `<main class="main">${flash(ok, err)}
${out ? `<div class="flash bad" role="alert">You have no builds left. Ask your Forge administrator to add more. The websites you've already built keep working.</div>` : ""}
<form method="post" action="/demos" class="card hero-form"><div><h1>Build a website for any business</h1>
<p class="lead">Type the business name or paste its Google Maps link. That's all we need.${aiOn ? "" : " (Custom designs are switched off for now, so sites use the built-in template.)"}</p></div>
${fields(undefined, reuse)}
<div class="row"><button class="btn ember big" type="submit" data-busy="Starting…"${out ? " disabled" : ""}>Build website</button><span class="note">Ready in about 10–20 minutes. You can close this page; it keeps building.</span></div></form>
<section style="display:grid;gap:14px"><h2>Your websites${demos.length ? ` (${demos.length})` : ""}</h2>${list}</section>
<details class="card"><summary>Have a list? Build several at once</summary><form method="post" action="/demos/bulk" style="display:grid;gap:14px">
<label for="bulk">One business per line: a name, <b>name | city</b>, or a Google Maps link (up to 25)<textarea id="bulk" name="bulk" rows="6" placeholder="Joe's Plumbing | Tampa, FL&#10;https://maps.app.goo.gl/…&#10;Bright Smile Dental | Austin, TX"></textarea></label>
<div class="look-row"><label class="choice"><input type="radio" name="style" value="standard" checked><span>Standard · 1 credit each</span></label><label class="choice"><input type="radio" name="style" value="studio"><span>Studio · ${STUDIO_CREDITS} credits each</span></label></div>
<p class="note" style="margin:0">Three build at a time; the rest wait their turn and start by themselves.</p>
<div><button class="btn" type="submit" data-busy="Starting…"${out ? " disabled" : ""}>Build them all</button></div></form></details></main>`,
    { nav: "demos", session: s },
  );
}

export interface DemoExtra {
  review?: Review | null;
  views?: ViewStat;
  /** The before/after page link, once the review has run. */
  pitch?: string;
  /** Inline SVG QR code for the site link. */
  qr?: string;
}

const checkList = (checks: { label: string; ok: boolean; detail?: string }[]) =>
  `<ul style="list-style:none;margin:0;padding:0;display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${checks
    .map((c) => `<li style="display:flex;gap:8px;align-items:flex-start;font-size:.9rem"><span class="tag ${c.ok ? "ok" : "bad"}" style="flex:none">${c.ok ? "✓" : "✕"}</span><span>${esc(c.label)}${c.detail && !c.ok ? ` <span class="note">· ${esc(c.detail)}</span>` : ""}</span></li>`)
    .join("")}</ul>`;

const when = (iso: string) => `${esc(iso.slice(0, 16).replace("T", " "))} UTC`;
const scoreWord = (n: number) => (n >= 9 ? "Excellent" : n >= 8 ? "Great" : n >= 7 ? "Good" : n >= 5 ? "Needs a polish" : "Needs work");

/** Is a change being applied right now (a stuck one stops counting after ten minutes)? */
const changing = (n: ChangeNote | null) => n?.status === "working" && Date.now() - Date.parse(n.at) < 10 * 60_000;

/** The full results of the quality check, for people who want the detail. */
function checkDetail(d: Stored, r: Review, links: { site: string }): string {
  const img = (n: string) => `${links.site}/_img/${d.liveVersion}/${n}`;
  return `<details><summary>See the full quality check</summary><div style="display:grid;gap:14px">
${r.shots?.includes("shot-desktop.jpg") ? `<div class="row" style="align-items:flex-start"><img src="${esc(img("shot-desktop.jpg"))}" alt="Desktop screenshot" style="width:min(100%,420px);border-radius:10px;border:1px solid var(--line)"><img src="${esc(img("shot-phone.jpg"))}" alt="Phone screenshot" style="width:110px;border-radius:10px;border:1px solid var(--line)"></div>` : ""}
${r.checks ? checkList(r.checks) : ""}
${r.strengths?.length ? `<p class="note" style="margin:0">What works: ${esc(r.strengths.join(" · "))}</p>` : ""}
${r.old ? `<p class="note" style="margin:0">Their current website scored <b>${r.old.score}/10</b> on the same checks${r.old.loaded ? "" : " (it didn't load)"}.</p>` : ""}
${r.fixed ? `<p class="note" style="margin:0">The home page was already rewritten once, automatically, after this check.</p>` : r.fixError ? `<p class="note" style="margin:0">The automatic fix didn't finish: ${esc(r.fixError)}</p>` : ""}</div></details>`;
}

/** Step 1: what the site looks like and how good it is. */
function lookStep(d: Stored, r: Review | null | undefined, links: { site: string }, owner: boolean): string {
  const again = owner && d.liveVersion ? `<form method="post" action="/demos/${esc(d.slug)}/review"><button class="btn ghost" type="submit" data-busy="Queued…">${r ? "Check again" : "Check it now"}</button></form>` : "";
  let quality = "";
  if (d.liveVersion) {
    if (r?.score) quality = `<div class="row" style="justify-content:space-between"><div class="row"><span class="score">${r.score}<small>/10</small></span><div><b>Quality check: ${esc(scoreWord(r.score))}</b>${r.verdict ? `<div class="note" style="max-width:62ch">${esc(r.verdict)}</div>` : ""}</div></div>${again}</div>${checkDetail(d, r, links)}`;
    else if (r?.skipped)
      quality = `<div class="row" style="justify-content:space-between"><div><b>Quality check: ${r.skipped.startsWith("error") ? "didn't finish" : "not run"}</b><div class="note">${r.skipped.startsWith("error") ? "It tries again by itself within the hour, or press the button to try now." : "Press the button to run it."} <span title="${esc(r.skipped)}">(details)</span></div></div>${again}</div>`;
    else quality = `<div class="row" style="justify-content:space-between"><div><b>Quality check: on its way</b><div class="note">A few minutes after a build we open the site on a desktop and a phone, score it, and list anything worth fixing.</div></div>${again}</div>`;
  }
  return `<section class="card step"><h2><span class="stepn">1</span>Look at it</h2>
<iframe class="preview" src="${esc(links.site)}" title="Preview of ${esc(d.intake.businessName)}"></iframe>
<div class="row"><a class="btn" href="${esc(links.site)}" target="_blank" rel="noreferrer">Open the full site ↗</a><span class="note">Check it on your phone too.</span></div>
${quality}</section>`;
}

/** Step 2: fix what the check found (one press each), or ask for anything else. */
function improveStep(d: Stored, r: Review | null | undefined, pages: { name: string; path: string }[], aiOn: boolean): string {
  if (!d.liveVersion || !pages.length) return "";
  const n = d.changeNote;
  const working = changing(n);
  const off = working || !aiOn ? " disabled" : "";
  const status = !n
    ? ""
    : working
      ? `<div class="status" role="status"><span class="spin"></span><div><b>Working on it: "${esc(n.instruction.slice(0, 160))}${n.instruction.length > 160 ? "…" : ""}"</b><br><span class="note">Usually 1–3 minutes. This page refreshes itself.</span></div></div><script>setTimeout(()=>location.reload(),15000)</script>`
      : n.status === "done"
        ? `<div class="flash ok">✓ Done (${when(n.at)}). The site updates within 30 seconds: open it to see.</div>`
        : n.status === "failed"
          ? `<div class="flash bad">That change didn't go through${n.error ? `: ${esc(n.error)}` : ""}. Nothing was changed on the site. Try again, or word it differently.</div>`
          : "";
  const issues = r?.issues ?? [];
  const stale = !!(r && n?.status === "done" && Date.parse(n.at) > Date.parse(r.at));
  const found = issues.length
    ? `<div style="display:grid;gap:10px"><div class="row" style="justify-content:space-between"><b>${stale ? "From the last check (some may be fixed already)" : `The check found ${issues.length} thing${issues.length === 1 ? "" : "s"} to improve`}</b>
<form method="post" action="/demos/${esc(d.slug)}/fix"><input type="hidden" name="n" value="all"><button class="btn ember" type="submit" data-busy="Starting…"${off}>Fix everything</button></form></div>
${issues
        .map(
          (i, k) =>
            `<div class="issue"><div><b>${esc(i.what)}</b> ${i.severity === "high" ? `<span class="tag bad">Important</span>` : ""}<div class="note">How we'd fix it: ${esc(i.fix)}</div></div><form method="post" action="/demos/${esc(d.slug)}/fix"><input type="hidden" name="n" value="${k}"><button class="btn ghost" type="submit" data-busy="Starting…"${off}>Fix this</button></form></div>`,
        )
        .join("")}</div>`
    : r?.score
      ? `<p class="note" style="margin:0">The check found nothing that needs fixing.</p>`
      : "";
  return `<section class="card step"><h2><span class="stepn">2</span>Make it better</h2>${status}${found}
<form method="post" action="/demos/${esc(d.slug)}/change" style="display:grid;gap:12px"><b>Request a change</b>
<div class="grid"><label class="full">Tell us in your own words what to change<textarea name="instruction" rows="2" maxlength="600" placeholder="e.g. Make the top photo brighter and add a section about financing" required></textarea></label>
<label>On which page?<select name="path">${pages.map((p) => `<option value="${esc(p.path)}">${esc(p.name)}</option>`).join("")}</select></label></div>
<div class="row"><button class="btn" type="submit" data-busy="Sending…"${off}>Make this change</button><span class="note">Free. Only that page is rewritten.</span></div></form>
<form method="post" action="/demos/${esc(d.slug)}/pairs" class="row"><button class="btn ghost" type="submit" data-busy="Starting…"${off}>Add illustrative before/after photos</button><span class="note">Good for trades where the work shows (landscaping, cleaning, painting, roofing). Labelled as samples until real photos replace them.</span></form></section>`;
}

/** Step 3: get it in front of the business. */
function sendStep(d: Stored, links: { site: string }, extra: DemoExtra, n: number): string {
  const v = extra.views;
  const seen = v ? `Opened <b>${v.week}</b> time${v.week === 1 ? "" : "s"} in the last 7 days${v.today ? ` (<b>${v.today} today</b>)` : ""}${v.lastAt ? `, last on ${when(v.lastAt)}` : ""}.` : "Nobody has opened the link yet. We'll show it here when they do.";
  return `<section class="card step"><h2><span class="stepn">${n}</span>Send it</h2>
<div class="share"><div class="share-row"><div><b>Website link</b><span>${esc(links.site)}</span></div><button class="btn" data-copy="${esc(links.site)}">Copy</button></div>
${extra.pitch ? `<div class="share-row"><div><b>Before &amp; after page</b><span>Their current website next to the new one, with scores. A strong thing to send first.</span></div><div class="row"><a class="btn ghost" href="${esc(extra.pitch)}" target="_blank" rel="noreferrer">Open ↗</a><button class="btn ghost" data-copy="${esc(extra.pitch)}">Copy</button></div></div>` : ""}</div>
<p class="note" style="margin:0">${seen}</p></section>`;
}

function viewsCard(v: ViewStat | undefined): string {
  if (!v) return `<section class="card"><h2>Who's looked</h2><p class="note" style="margin:0">No views yet. Views are counted when a real person opens the site (not link previews or bots).</p></section>`;
  return `<section class="card"><h2>Who's looked</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${stat("Today", v.today)}${stat("Last 7 days", v.week)}${stat("Visitors (7 days)", v.visitorsWeek)}${stat("Last 30 days", v.month)}</div>
<p class="note" style="margin:0">Last opened ${v.lastAt ? when(v.lastAt) : "never"}.</p>
${v.days.length ? `<div class="table"><table><thead><tr><th>Day</th><th>Views</th><th>Visitors</th></tr></thead><tbody>${v.days.map((x) => `<tr><td>${esc(x.day)}</td><td>${x.views}</td><td>${x.visitors}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>`;
}

function outreachCard(d: Stored, links: { site: string }, qr: string, aiOn: boolean): string {
  const o = d.outreach;
  const copy = (title: string, body: string) => `<div class="share-row"><div><b>${esc(title)}</b><span>${esc(body)}</span></div><button class="btn ghost" data-copy="${esc(body)}">Copy</button></div>`;
  return `<section class="card"><h2>Outreach kit</h2><div class="row" style="align-items:flex-start;gap:22px"><div style="flex:none;display:grid;gap:6px;justify-items:center"><div style="width:132px;height:132px;background:#fff;border-radius:10px;padding:6px;border:1px solid var(--line)">${qr}</div><a class="note" download="qr-${esc(d.slug)}.svg" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}">Download QR</a></div>
<div style="flex:1;min-width:240px;display:grid;gap:10px">${
    o
      ? `<div class="share">${copy(`Email · ${o.subject}`, o.email)}${copy("Text message", o.sms)}${copy("Call script (30 seconds)", o.call)}</div><form method="post" action="/demos/${esc(d.slug)}/outreach"><button class="btn ghost" type="submit" data-busy="Writing…">Write it again</button></form>`
      : `<p class="note" style="margin:0">A short email, a text and a 30-second call script written for ${esc(d.intake.businessName)}, with the link in each.</p><form method="post" action="/demos/${esc(d.slug)}/outreach"><button class="btn" type="submit" data-busy="Writing…"${aiOn ? "" : " disabled"}>Write the outreach</button></form>`
  }<p class="note" style="margin:0">QR code opens ${esc(links.site)}</p></div></div></section>`;
}

export function demoPage(
  s: Session,
  d: Stored,
  links: { site: string; ghl: string; pages: { name: string; path?: string; url: string }[] },
  progress: { done: number; total: number },
  leads: Lead[],
  ok?: string,
  err?: string,
  extra: DemoExtra = {},
): Response {
  const i = d.intake;
  const link = links.ghl || links.site;
  const chat = `✅ Demo site ready: *${i.businessName}*${i.city ? ` (${i.city})` : ""}\n${link}`;
  const sheet = [new Date().toISOString().slice(0, 10), i.businessName, d.content.industry, i.city, i.phone, link].join("\t");
  const row = (title: string, shown: string, copy: string) =>
    `<div class="share-row"><div><b>${title}</b><span>${esc(shown)}</span></div>${copy ? `<button class="btn ghost" data-copy="${esc(copy)}">Copy</button>` : ""}</div>`;
  const out = !s.tenant.unlimited && s.tenant.credits < 1;
  const busy = d.buildStatus === "building";
  const owner = isOwner(s);
  const r = extra.review;
  const pages = links.pages.filter((p): p is { name: string; path: string; url: string } => !!p.path);
  const hasSite = !!(d.liveVersion || d.html);
  const improve = improveStep(d, r, pages, true);
  const cost = buildCost(d.intake);
  // One sentence at the top: where this website is and the single next thing to do.
  const next = busy
    ? `<div class="status" role="status"><span class="spin"></span><div><b>${d.buildStage === "pages" ? `Writing the pages: ${progress.done} of ${progress.total} done` : "Designing the look…"}</b><br><span class="note">Nothing for you to do. It usually takes 10–20 minutes and this page refreshes itself; you can also close it and come back.${hasSite ? " The current version stays live until the new one is finished." : ""}</span></div></div><script>setTimeout(()=>location.reload(),15000)</script>`
    : d.buildStatus === "queued"
      ? `<div class="status" role="status"><span class="spin"></span><div><b>Waiting its turn.</b><br><span class="note">Three websites build at a time. This one starts by itself when one finishes; nothing for you to do.</span></div></div><script>setTimeout(()=>location.reload(),20000)</script>`
      : d.buildStatus === "failed"
        ? `<div class="status bad" role="alert"><div><b>The build stopped before it finished.</b> ${esc(d.buildError)}<br><b>What to do:</b> press Try again. It carries on from the pages already written${s.tenant.unlimited ? "" : `, and your credit${cost === 1 ? " was" : "s were"} refunded (trying again uses ${cost})`}. ${hasSite ? "Meanwhile the link still shows the previous version." : "Meanwhile the link shows a simple placeholder version."} If it fails twice, tell your Forge administrator the message above.</div><form method="post" action="/demos/${esc(d.slug)}/rebuild"><button class="btn" type="submit"${out ? " disabled" : ""}>Try again</button></form></div>`
        : changing(d.changeNote)
          ? ""
          : r?.issues?.length && (r.score ?? 10) < 8 && !(d.changeNote?.status === "done" && Date.parse(d.changeNote.at) > Date.parse(r.at))
            ? `<div class="next"><div><b>Next: fix the ${r.issues.length} thing${r.issues.length === 1 ? "" : "s"} the quality check found.</b><div class="note">One press. It takes a couple of minutes and costs no credit.</div></div><form method="post" action="/demos/${esc(d.slug)}/fix"><input type="hidden" name="n" value="all"><button class="btn ember" type="submit" data-busy="Starting…">Fix everything</button></form></div>`
            : d.liveVersion
              ? `<div class="next"><div><b>This website is ready to send.</b><div class="note">Copy the link and send it to ${esc(i.businessName)}.</div></div><button class="btn ember" data-copy="${esc(links.site)}">Copy link</button></div>`
              : "";
  return page(
    i.businessName,
    `<main class="main">${flash(ok, err)}
<div><a class="note" href="/">← All websites</a><h1 style="margin-top:6px">${esc(i.businessName)}${i.style === "studio" ? ` <span class="pill">Studio</span>` : ""}</h1>
<p class="lead">${esc([d.content.industry, i.city].filter(Boolean).join(" · "))}${d.liveVersion ? ` · ${links.pages.length} pages` : ""}${
      s.user.role === "admin" && d.buildCost ? ` · built for <b>$${d.buildCost.usd.toFixed(2)}</b> (${d.buildCost.calls} Claude calls)` : ""
    }</p></div>
${next}
${lookStep(d, r, links, owner)}
${improve}
${sendStep(d, links, extra, improve ? 3 : 2)}
<details class="card"><summary>More tools</summary><div style="display:grid;gap:16px;margin-top:12px">
${outreachCard(d, links, extra.qr ?? "", true)}
${viewsCard(extra.views)}
<section class="card"><h2>Messages from the site's forms (${leads.length}${leads.length === 50 ? "+" : ""})</h2>${
      leads.length
        ? `<div class="share">${leads
            .map(
              (l) =>
                `<div class="share-row"><div><b>${when(l.createdAt)} · ${esc(l.page || "/")}</b><span>${esc(
                  Object.entries(l.fields)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n"),
                )}</span></div></div>`,
            )
            .join("")}</div>`
        : `<p class="note" style="margin:0">Anything sent through the site's forms shows up here.</p>`
    }</section>
${
      d.liveVersion && pages.length
        ? `<form method="post" action="/demos/${esc(d.slug)}/replace" class="card"><h2>Quick text fix</h2><p class="note" style="margin:0">Swap an exact word or phrase everywhere on the site, instantly (a wrong phone number, a misspelt name).</p><div class="grid"><label>Find<input name="find" maxlength="200" required placeholder="e.g. (555) 123-4567"></label><label>Replace with<input name="replace" maxlength="200" placeholder="e.g. (305) 555-0100"></label></div><div><button class="btn ghost" type="submit">Replace everywhere</button></div></form>`
        : ""
    }
<section class="card"><h2>Other ways to share</h2><div class="share">
${links.pages.length ? `<div class="row note">Pages: ${links.pages.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noreferrer">${esc(p.name)}</a>`).join(" · ")}</div>` : ""}
${links.ghl ? row("On your GoHighLevel page", links.ghl, links.ghl) : row("On your GoHighLevel page", owner ? "Set up your GoHighLevel page first (Settings, top menu)." : "Ask your account owner to set up the GoHighLevel page.", "")}
${row("Chat message", chat, chat)}
${row("Sheet row (date · business · trade · city · phone · link)", sheet.replace(/\t/g, " · "), sheet)}
</div></section>
<form method="post" action="/demos/${esc(d.slug)}/rewrite" class="card"><h2>Start over with a new design</h2><p class="note" style="margin:0">Correct the details below, or just press the button for a completely new look. The link stays the same.${s.tenant.unlimited ? "" : ` This uses ${cost} credit${cost === 1 ? "" : "s"}.`}</p>${fields(i)}
<div><button class="btn" type="submit" data-busy="Starting…"${busy || out ? " disabled" : ""}>Redesign the whole site</button>${out ? ` <span class="note">No credits left.</span>` : ""}</div></form>
<form method="post" action="/demos/${esc(d.slug)}/archive"><button class="btn danger" type="submit">Delete this website (its link stops working)</button></form>
</div></details>
</main>`,
    { nav: "demos", session: s },
  );
}
