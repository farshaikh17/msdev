/**
 * The gallery: every finished site in one place, to look across and choose a direction. Each card says
 * what the site is (its niche and trade), how it was designed (Studio or Standard, its look and first
 * screen, its idea) and how it did (score, lead status, cost). Filters narrow it; up to three can be
 * compared side by side; "Use this design" starts a new build on that site's design.
 */
import { esc } from "../../../src/forge/render";
import type { Session } from "./auth";
import { CONCEPTS } from "./concepts";
import { LEAD_LABELS, LEAD_STATUSES, type GalleryItem, type LeadStatus } from "./db";
import { HEROES } from "./heroes";
import { NICHES, nicheOf } from "./niche";
import { page } from "./ui";

export const lookName = (id: string) => CONCEPTS.find((c) => c.id === id)?.name ?? "";
export const firstScreenName = (id: string) => (id === "own" ? "Its own idea" : (HEROES.find((h) => h.id === id)?.name ?? ""));

export interface GalleryFilters {
  niche: string;
  look: string;
  first: string;
  style: string;
  lead: string;
  sort: string;
  view: string;
}

const CSS = `<style>
.main{grid-template-columns:minmax(0,1fr)}.g-card,.g-bar{min-width:0}.g-card{grid-template-columns:minmax(0,1fr)}
.g-bar{display:grid;gap:10px}.g-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.g-row>b{font:600 .78rem var(--body);color:var(--muted);min-width:110px}
.chip{font:600 .78rem var(--body);padding:5px 11px;border-radius:999px;border:1px solid var(--line);text-decoration:none;color:var(--ink);background:var(--surface)}
.chip.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.chip small{opacity:.6;font-weight:600}
.g-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))}
.g-card{display:grid;gap:10px;align-content:start;border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface)}
.g-shot{display:block;border-radius:9px;overflow:hidden;background:var(--chrome);border:1px solid var(--line);aspect-ratio:16/10}
.g-shot.phone{aspect-ratio:9/16;max-height:420px;margin:0 auto;width:62%}
.g-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.g-shot span{display:grid;place-items:center;height:100%;font:800 2rem var(--display);color:var(--muted)}
.g-tags{display:flex;flex-wrap:wrap;gap:6px}.g-idea{font-size:.86rem;line-height:1.45;margin:0;color:var(--ink)}
.g-meta{display:flex;justify-content:space-between;gap:8px;font-size:.8rem;color:var(--muted);flex-wrap:wrap}
.g-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.g-pick{display:flex;gap:6px;align-items:center;font-size:.82rem;color:var(--muted)}
.cmp{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))}.cmp iframe{width:100%;height:78vh;border:1px solid var(--line);border-radius:10px;background:#fff}
.cmp.phone iframe{width:390px;max-width:100%;margin:0 auto;display:block}
</style>`;

/** Keep the other filters when one changes. */
function hrefWith(f: GalleryFilters, key: keyof GalleryFilters, value: string): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, [key]: value })) if (v && !(k === "sort" && v === "new") && !(k === "view" && v === "desktop")) p.set(k, v);
  const q = p.toString();
  return `/gallery${q ? `?${q}` : ""}`;
}

export function filterGallery(items: GalleryItem[], f: GalleryFilters): GalleryItem[] {
  const out = items.filter(
    (i) =>
      (!f.niche || nicheOf(i.trade, i.businessName) === f.niche) &&
      (!f.look || i.look === f.look) &&
      (!f.first || i.firstScreen === f.first) &&
      (!f.style || i.style === f.style) &&
      (!f.lead || i.leadStatus === f.lead),
  );
  if (f.sort === "score") out.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  else if (f.sort === "cost") out.sort((a, b) => (a.costUsd || 99) - (b.costUsd || 99));
  return out;
}

export function galleryPage(s: Session, items: GalleryItem[], f: GalleryFilters, siteUrl: (slug: string) => string): Response {
  const shown = filterGallery(items, f);
  // Filter rows: only the values these sites actually have, each with how many.
  const row = (label: string, key: keyof GalleryFilters, options: { value: string; label: string; n: number }[]) =>
    options.length ? `<div class="g-row"><b>${label}</b><a class="chip${f[key] ? "" : " on"}" href="${hrefWith(f, key, "")}">All</a>${options.map((o) => `<a class="chip${f[key] === o.value ? " on" : ""}" href="${hrefWith(f, key, o.value)}">${esc(o.label)} <small>${o.n}</small></a>`).join("")}</div>` : "";
  const count = <T,>(values: T[]) => values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<T, number>());
  const niches = count(items.map((i) => nicheOf(i.trade, i.businessName)));
  const looks = count(items.filter((i) => i.look).map((i) => i.look));
  const firsts = count(items.filter((i) => i.firstScreen).map((i) => i.firstScreen));
  const styles = count(items.map((i) => i.style));
  const leads = count(items.map((i) => i.leadStatus));
  const bar = `<div class="card g-bar">
${row("Niche", "niche", NICHES.filter((n) => niches.has(n)).map((n) => ({ value: n, label: n, n: niches.get(n)! })))}
${row("Style", "style", (["studio", "standard"] as const).filter((v) => styles.has(v)).map((v) => ({ value: v, label: v === "studio" ? "Studio" : "Standard", n: styles.get(v)! })))}
${row("Look", "look", [...looks].map(([v, n]) => ({ value: v, label: lookName(v) || v, n })))}
${row("First screen", "first", [...firsts].map(([v, n]) => ({ value: v, label: firstScreenName(v) || v, n })))}
${row("Lead", "lead", LEAD_STATUSES.filter((v) => leads.has(v)).map((v) => ({ value: v, label: LEAD_LABELS[v], n: leads.get(v)! })))}
<div class="g-row"><b>Show</b>${[["new", "Newest"], ["score", "Best scored"], ["cost", "Cheapest"]].map(([v, l]) => `<a class="chip${(f.sort || "new") === v ? " on" : ""}" href="${hrefWith(f, "sort", v!)}">${l}</a>`).join("")}<span style="width:12px"></span>${[["desktop", "Desktop"], ["phone", "Phone"]].map(([v, l]) => `<a class="chip${(f.view || "desktop") === v ? " on" : ""}" href="${hrefWith(f, "view", v!)}">${l}</a>`).join("")}</div>
</div>`;
  const phone = f.view === "phone";
  const card = (i: GalleryItem) => {
    const site = siteUrl(i.slug);
    const shot = i.hasShots ? `<img loading="lazy" src="${esc(site)}/_img/${esc(i.version)}/${phone ? "shot-phone" : "shot-desktop"}.jpg" alt="${esc(i.businessName)}">` : `<span>${esc(i.businessName.slice(0, 1).toUpperCase())}</span>`;
    const niche = nicheOf(i.trade, i.businessName);
    return `<article class="g-card"><a class="g-shot${phone ? " phone" : ""}" href="${esc(site)}" target="_blank" rel="noreferrer" title="Open the site">${shot}</a>
<div><a class="site-name" href="/demos/${esc(i.slug)}">${esc(i.businessName)}</a><div class="note">${esc([i.trade, i.city].filter(Boolean).join(" · "))}</div></div>
<div class="g-tags"><span class="tag">${esc(niche)}</span>${i.style === "studio" ? `<span class="pill">Studio</span>` : `<span class="tag dim">Standard</span>`}${lookName(i.look) ? `<span class="tag dim" title="Look">${esc(lookName(i.look))}</span>` : ""}${firstScreenName(i.firstScreen) ? `<span class="tag dim" title="First screen">${esc(firstScreenName(i.firstScreen))}</span>` : ""}<span class="lstat ${i.leadStatus}">${LEAD_LABELS[i.leadStatus as LeadStatus]}</span></div>
${i.idea ? `<p class="g-idea">“${esc(i.idea.length > 170 ? `${i.idea.slice(0, 167)}…` : i.idea)}”</p>` : ""}
<div class="g-meta"><span>${i.score !== null ? `Quality ${i.score}/10` : "Not checked yet"}</span><span>${i.costUsd ? `Built for $${i.costUsd.toFixed(2)}` : ""}</span><span>${esc(i.createdAt.slice(0, 10))}</span></div>
<div class="g-act"><label class="g-pick"><input type="checkbox" name="s" value="${esc(i.slug)}" form="cmp"> Compare</label><a class="btn ghost" href="/?reuse=${esc(i.slug)}#build" title="Start a new site on this design (skips the design step)">Use this design</a></div></article>`;
  };
  return page(
    "Gallery",
    `${CSS}<main class="main"><div><h1>Gallery</h1><p class="lead">Every finished website, to look across and choose a direction. Filter by niche, look or first screen; tick two or three to compare them side by side; or start a new site on a design you like.</p></div>
${bar}
<form id="cmp" action="/gallery/compare" method="get" class="row" style="gap:10px"><button class="btn" type="submit">Compare the ticked sites</button><span class="note">${shown.length} of ${items.length} website${items.length === 1 ? "" : "s"}</span><input type="hidden" name="view" value="${phone ? "phone" : "desktop"}"></form>
${shown.length ? `<div class="g-grid">${shown.map(card).join("")}</div>` : `<div class="card empty">No websites match these filters. <a href="/gallery">Show all</a></div>`}</main>`,
    { nav: "gallery", session: s },
  );
}

/** Two or three sites side by side, each scrollable, as a visitor sees them. */
export function comparePage(s: Session, items: GalleryItem[], siteUrl: (slug: string) => string, phone: boolean): Response {
  const cols = items
    .map(
      (i) => `<div style="display:grid;gap:8px"><div><b>${esc(i.businessName)}</b> <span class="note">${esc([nicheOf(i.trade, i.businessName), i.style === "studio" ? `Studio · ${lookName(i.look) || "custom"} · ${firstScreenName(i.firstScreen) || "—"}` : "Standard"].join(" · "))}</span></div>
<iframe src="${esc(siteUrl(i.slug))}" title="${esc(i.businessName)}" loading="lazy"></iframe>
<div class="g-act"><a class="btn ghost" href="${esc(siteUrl(i.slug))}" target="_blank" rel="noreferrer">Open ↗</a><a class="btn ghost" href="/?reuse=${esc(i.slug)}#build">Use this design</a></div></div>`,
    )
    .join("");
  const q = items.map((i) => `s=${encodeURIComponent(i.slug)}`).join("&");
  return page(
    "Compare",
    `${CSS}<main class="main"><div><a class="note" href="/gallery">← Gallery</a><h1 style="margin-top:6px">Compare</h1><p class="lead">Scroll each one as a visitor would. <a href="/gallery/compare?${q}&view=${phone ? "desktop" : "phone"}">Show them as on a ${phone ? "desktop" : "phone"}</a></p></div>
${items.length >= 2 ? `<div class="cmp${phone ? " phone" : ""}">${cols}</div>` : `<div class="card empty">Tick two or three websites in the gallery to compare them. <a href="/gallery">Back to the gallery</a></div>`}</main>`,
    { nav: "gallery", session: s },
  );
}
