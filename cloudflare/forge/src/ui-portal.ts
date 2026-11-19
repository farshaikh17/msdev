/**
 * The client portal's pages: the PIN screen and the owner's page for their website. Plain words, one
 * thing per card, and nothing they change goes live until they press Publish.
 */
import { esc } from "../../../src/forge/render";
import type { Lead, Stored, ViewStat } from "./db";
import { page } from "./ui";
import { PORTAL_ASKS_PER_MONTH, type GoLive, type Portal, type PortalEntry } from "./portal";

const PORTAL_CSS = `<style>
.pt-hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;flex-wrap:wrap}
.pt-draft{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:18px 20px;border-radius:14px;background:var(--ember-soft);border:1px solid var(--ember)}
.pt-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.pt-photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block}
.pt-photos figure{margin:0;display:grid;gap:4px}.pt-photos figcaption{font-size:.75rem;color:var(--muted)}
.pt-check{list-style:none;margin:0;padding:0;display:grid;gap:8px}.pt-check li{display:flex;gap:10px;align-items:center}.pt-check i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 .75rem var(--body);font-style:normal;border:2px solid var(--line)}.pt-check li.ok i{background:var(--ok);border-color:var(--ok);color:#fff}
.pt-log{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:.88rem}.pt-log span{color:var(--muted)}
</style>`;

const WHAT: Record<string, string> = { details: "Updated details", photos: "Added photos", logo: "Added the logo", reviews: "Added real reviews", edit: "Asked for a change", publish: "Published", undo: "Undid the last publish", discard: "Discarded the draft", pin: "Signed in" };

export function portalPinPage(name: string, token: string, error = ""): Response {
  return page(
    `${name}: your website`,
    `<main class="login"><h1 style="margin-bottom:6px">${esc(name)}</h1><p class="lead" style="margin-top:0">Your website. Enter the 6-digit PIN you were given.</p>${error ? `<div class="flash bad" role="alert">${esc(error)}</div>` : ""}
<form method="post" action="/p/${esc(token)}/pin" class="card"><label for="pin">PIN<input id="pin" name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus style="font-size:1.4rem;letter-spacing:.3em;text-align:center"></label><button class="btn ember" type="submit">Open my website</button></form></main>`,
  );
}

export interface PortalView {
  demo: Stored;
  portal: Portal;
  /** The live site's address, and the draft's preview address (when there is a draft). */
  liveUrl: string;
  previewUrl: string;
  /** The pictures in the version being shown (draft, else live), as image links. */
  photos: { url: string; own: boolean }[];
  logoUrl: string;
  views?: ViewStat;
  leads: Lead[];
  log: PortalEntry[];
  asksUsed: number;
  goLive: GoLive;
  pages: { name: string; path: string }[];
  ok?: string;
  err?: string;
}

export function portalPage(v: PortalView): Response {
  const { demo: d, portal: p } = v;
  const i = d.intake;
  const t = `/p/${esc(p.token)}`;
  const h = d.handover;
  const working = h?.status === "working" && Date.now() - Date.parse(h.at) < 15 * 60_000;
  const left = Math.max(0, PORTAL_ASKS_PER_MONTH - v.asksUsed);
  const draftBar = p.draft
    ? `<div class="pt-draft" role="status"><div><b>${working ? "Your changes are going in…" : "You have changes that aren't live yet"}</b><div class="note">${working ? "Usually 2–5 minutes. This page refreshes itself." : "Look at the preview, then publish them to your live website."}</div></div>
<div class="row"><a class="btn ghost" href="${esc(v.previewUrl)}" target="_blank" rel="noopener">Preview ↗</a>${working ? "" : `<form method="post" action="${t}/publish"><button class="btn ember" type="submit" data-busy="Publishing…">Publish</button></form><form method="post" action="${t}/discard"><button class="btn ghost" type="submit">Discard</button></form>`}</div></div>${working ? `<script>setTimeout(()=>location.reload(),15000)</script>` : ""}`
    : "";
  const undo = p.prev && !p.draft ? `<form method="post" action="${t}/undo" class="row" style="gap:10px"><span class="note">Changed your mind about the last publish?</span><button class="btn ghost" type="submit">Undo last publish</button></form>` : "";
  const check = (ok: boolean, label: string, hint: string) => `<li class="${ok ? "ok" : ""}"><i>${ok ? "✓" : ""}</i><div><b>${esc(label)}</b>${ok ? "" : `<div class="note">${esc(hint)}</div>`}</div></li>`;
  const g = v.goLive;
  const views = v.views;
  return page(
    `${i.businessName}: your website`,
    `${PORTAL_CSS}<main class="main">
${v.ok ? `<div class="flash ok" role="status">✓ ${esc(v.ok)}</div>` : ""}${v.err ? `<div class="flash bad" role="alert">${esc(v.err)}</div>` : ""}
<div class="pt-hero"><div><p class="note" style="margin:0">Your website</p><h1>${esc(i.businessName)}</h1></div><a class="btn" href="${esc(v.liveUrl)}" target="_blank" rel="noopener">Open my live website ↗</a></div>
${draftBar}${undo}

<form method="post" action="${t}/update" enctype="multipart/form-data" class="card"><h2>Your details</h2><p class="note" style="margin:0">Change anything that isn't right. It updates every page.</p>
<div class="grid"><label>Phone<input name="phone" type="tel" value="${esc(i.phone)}" maxlength="40"></label><label>Opening hours<input name="hours" value="${esc(i.hours)}" placeholder="e.g. Mon–Fri 7am–5pm" maxlength="300"></label>
<label class="full">Address<input name="address" value="${esc(i.address)}" maxlength="300"></label>
<label class="full">Your real reviews (they replace the samples; one per paragraph, ending with the name if you like)<textarea name="reviews" rows="3" maxlength="4000">${esc(i.reviews)}</textarea></label></div>
<div><button class="btn" type="submit" data-busy="Saving…">Save to my draft</button></div></form>

<form method="post" action="${t}/update" enctype="multipart/form-data" class="card"><h2>Your photos and logo</h2><p class="note" style="margin:0">Your own photos look best: the work, the team, the van, the shop. The first one becomes the main picture. Up to 8.</p>
${v.photos.length ? `<div class="pt-photos">${v.photos.slice(0, 8).map((ph, n) => `<figure><img src="${esc(ph.url)}" alt="" loading="lazy"><figcaption>${n + 1}. ${ph.own ? "Your photo" : "Sample photo"}</figcaption></figure>`).join("")}</div>` : ""}
<div class="grid"><label>Your photos<input type="file" name="photos" accept="image/*" multiple></label><label>Your logo<input type="file" name="logo" accept="image/*"></label></div>
${v.logoUrl ? `<p class="note" style="margin:0">Current logo: <img src="${esc(v.logoUrl)}" alt="" style="height:28px;vertical-align:middle"></p>` : ""}
<div><button class="btn" type="submit" data-busy="Uploading…">Add to my draft</button></div></form>

<form method="post" action="${t}/update" enctype="multipart/form-data" class="card"><h2>Ask for a change</h2><p class="note" style="margin:0">Say it in your own words, e.g. “add a section about financing” or “make the top photo our van”. ${left ? `<b>${left} of ${PORTAL_ASKS_PER_MONTH}</b> left this month.` : "You've used this month's changes: your website contact will take it from here."}</p>
<div class="grid"><label class="full">What would you like changed?<textarea name="edits" rows="3" maxlength="1500" required></textarea></label>
<label>On which page<select name="editPath">${v.pages.map((pg) => `<option value="${esc(pg.path)}">${esc(pg.name)}</option>`).join("")}</select></label></div>
<div><button class="btn" type="submit" data-busy="Sending…"${working ? " disabled" : ""}>${left ? "Make this change" : "Send to my website contact"}</button></div></form>

<section class="card"><h2>Ready to go live?</h2><ul class="pt-check">
${check(g.photos, "Your own photos are in", "Add a few of your own photos above.")}
${check(g.reviews, "Real reviews in place of the samples", "Paste a few real reviews above.")}
${check(g.form, "The contact form has been tested", "Send yourself a message from the website's form.")}
${check(g.domain, "Your own web address is connected", "Ask your website contact to connect your domain.")}
${check(g.published, "Your latest changes are published", "Press Publish when the preview looks right.")}
</ul></section>

<section class="card"><h2>How it's doing</h2>${views ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))"><div><b style="font:800 1.6rem var(--display)">${views.today}</b><div class="note">visits today</div></div><div><b style="font:800 1.6rem var(--display)">${views.week}</b><div class="note">this week</div></div><div><b style="font:800 1.6rem var(--display)">${views.month}</b><div class="note">this month</div></div><div><b style="font:800 1.6rem var(--display)">${v.leads.length}</b><div class="note">form messages</div></div></div>` : `<p class="note" style="margin:0">No visits counted yet.</p>`}
${v.leads.length ? `<div class="share">${v.leads.slice(0, 10).map((l) => `<div class="share-row"><div><b>${esc(l.createdAt.slice(0, 16).replace("T", " "))} UTC</b><span>${esc(Object.entries(l.fields).map(([k, val]) => `${k}: ${val}`).join("\n"))}</span></div></div>`).join("")}</div>` : ""}</section>

${v.log.length ? `<section class="card"><h2>History</h2><ul class="pt-log">${v.log.map((e) => `<li><b>${esc(WHAT[e.what] ?? e.what)}</b>${e.detail ? ` · ${esc(e.detail.slice(0, 120))}` : ""} <span>· ${esc(e.at.slice(0, 16).replace("T", " "))} UTC</span></li>`).join("")}</ul></section>` : ""}
</main>`,
  );
}
