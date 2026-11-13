/** Account screens for owners: Settings (GoHighLevel, chat, notifications, own videos, password), Team, and API. */
import { esc } from "../../../src/forge/render";
import type { Session } from "./auth";
import type { LibraryEntry } from "./hero";
import { creditFor } from "./site";
import type { ApiKey, PendingInvite, User } from "./tenants";
import { flash, page } from "./ui";

/** The hero-video editor, used for an account's own clips (Settings) and for the shared library (Admin). */
export function videoLibrary(videos: LibraryEntry[], o: { base: string; shared: boolean; folder?: string }): string {
  const entry = (v?: LibraryEntry) => `<form method="post" action="${o.base}" class="${v ? "share-row" : ""}" style="display:grid;gap:10px">
${v ? `<input type="hidden" name="id" value="${v.id}">` : ""}
${v?.driveId ? `<b style="font-size:.85rem">${esc(v.fileName ?? "")}${v.name === "Unsorted" ? ` <span class="tag bad">Needs a trade</span>` : ""}</b>` : ""}
<div class="grid"><label>Trade<input name="name" value="${esc(v?.name ?? "")}" placeholder="e.g. HVAC" required></label>
<label>Matches businesses whose trade, name or services mention<input name="keywords" value="${esc(v?.keywords.join(", ") ?? "")}" placeholder="e.g. hvac, air conditioning, heating, ac repair" required></label></div>
${v?.driveId ? "" : `<label>Video links (one per line; a demo gets one of them)<textarea name="urls" rows="3" placeholder="https://…/clip.mp4" required>${esc(v?.urls.join("\n") ?? "")}</textarea></label>`}
<div class="row"><button class="btn${v ? " ghost" : ""}" type="submit">${v ? "Save" : "Add to library"}</button>
${v ? `${v.urls.map((u, n) => `<a href="${esc(u)}" target="_blank" rel="noreferrer">${v.driveId ? "Watch" : `Clip ${n + 1}`} ↗</a>`).join(" ")}${v.driveId ? "" : `<button class="btn danger" type="submit" formaction="${o.base}/${v.id}/delete" formnovalidate>Remove</button>`}` : ""}</div></form>`;
  const drive = videos.filter((v) => v.driveId);
  const manual = videos.filter((v) => !v.driveId);
  return `<section class="card"><h2>${o.shared ? "Shared hero videos" : "Your own hero videos"}</h2>
<p class="note" style="margin:0">${
    o.shared
      ? "Every account's demos can use these. Each demo's home page has a moving hero: with a video for its trade it plays that video (muted, looping), otherwise it slowly animates the site's photos. Drop new clips into the Google Drive folder: they're copied in every hour (or press Check now) and given a trade from their file name. Fix any trade or keywords below; changes show on matching demos within a minute, no rebuild needed. To remove a clip, remove it from the folder."
      : "Add clips of your own by link (8-second .mp4 clips work best). A demo uses a clip from your library or the shared one, whichever matches its trade best. Changes show within a minute, no rebuild needed."
  }</p>
${
  o.folder !== undefined
    ? `<form method="post" action="${o.base}/sync" class="row" style="align-items:end">
<label style="flex:1;min-width:240px">Google Drive folder (shared as "Anyone with the link")<input name="folder" value="https://drive.google.com/drive/folders/${esc(o.folder)}"></label>
<button class="btn" type="submit" data-busy="Checking…">Check now</button>
<a href="https://drive.google.com/drive/folders/${esc(o.folder)}" target="_blank" rel="noreferrer">Open folder ↗</a></form>
${drive.length ? `<h3 style="margin:8px 0 0">From the folder (${drive.length})</h3><div class="share">${drive.map((v) => entry(v)).join("")}</div>` : `<p class="note" style="margin:0">No clips copied yet. Press Check now.</p>`}`
    : ""
}
<details${o.folder === undefined && manual.length ? " open" : ""}><summary>${o.folder !== undefined ? `Videos hosted elsewhere (${manual.length})` : `Your clips (${manual.length})`}</summary><div class="share" style="margin-bottom:14px">${manual.map((v) => entry(v)).join("")}</div>
<h3 style="margin:8px 0">Add by link</h3>${entry()}</details></section>`;
}

export interface SettingsData {
  snippet: string;
  /** The Mianro widget ID (shown as the default only on Mianro's own account). */
  defaultWidget: string;
  ownVideos: LibraryEntry[];
}

export function settingsPage(s: Session, d: SettingsData, ok?: string, err?: string): Response {
  const t = s.tenant;
  const credit = creditFor(t).replace(/<[^>]+>/g, "") || "(no credit line)";
  return page(
    "Settings",
    `<main class="main">${flash(ok, err)}
<div><h1>Settings</h1><p class="lead">${esc(t.name)}: GoHighLevel page, chat widget, notifications, hero videos and your password.</p></div>
<section class="card"><h2>Team &amp; developers</h2><div class="row"><a class="btn ghost" href="/team">Team members</a><a class="btn ghost" href="/api">API &amp; webhooks</a></div></section>
<section class="card"><h2>Show demos on your GoHighLevel page</h2><p class="note" style="margin:0">Set this up once. After that every demo also opens on your own domain at <span class="pill">your-page?d=demo-name</span>.</p>
<ol class="note" style="margin:0;padding-left:1.2rem;display:grid;gap:6px"><li>In your GoHighLevel account, create a blank funnel or website page with no header or footer, e.g. <b>/demo</b>.</li>
<li>Add one full-width <b>Custom JS/HTML</b> element and paste the code below. Save and publish.</li></ol>
<div class="row" style="justify-content:space-between"><b>Code for the Custom JS/HTML element</b><button class="btn ghost" data-copy="${esc(d.snippet)}">Copy</button></div>
<pre>${esc(d.snippet)}</pre>
<form method="post" action="/settings" class="row" style="align-items:end"><label for="ghl" style="flex:1;min-width:240px">Published page address<input id="ghl" name="ghlPageUrl" type="url" value="${esc(t.ghlPageUrl)}" placeholder="https://yourdomain.com/demo"></label><button class="btn" type="submit">Save</button></form></section>
<form method="post" action="/settings/chat" class="card"><h2>Chat widget on your demos</h2>
<p class="note" style="margin:0">Each demo site shows this GoHighLevel chat widget, recoloured to the site's primary colour. ${t.id === 1 ? `Leave empty for the Mianro default (<span class="pill">${esc(d.defaultWidget)}</span>), ` : "Leave empty for no chat widget, "}paste your widget's embed code or ID, or type <b>off</b>. A demo can also name its own widget under "More details".</p>
<label for="cw">Widget ID or embed code<input id="cw" name="chatWidget" value="${esc(t.chatWidget)}" placeholder="${t.id === 1 ? esc(d.defaultWidget) : "e.g. 6a872a7164c286aff3546896"}"></label>
<div><button class="btn" type="submit">Save</button></div></form>
<section class="card"><h2>Footer credit</h2><p class="note" style="margin:0">Your demo sites end with: <b>${esc(credit)}</b>. To change or remove it, ask your Forge administrator.</p></section>
<form method="post" action="/settings/webhook" class="card"><h2>Notifications (webhook)</h2>
<p class="note" style="margin:0">When a demo finishes building (or fails), we send a signed JSON message to this address, so your own automation can post to Google Chat, add a sheet row, update GoHighLevel and so on. The API page explains the message and how to check its signature.</p>
<label for="wh">Webhook address (https)<input id="wh" name="webhookUrl" type="url" value="${esc(t.webhookUrl)}" placeholder="https://hooks.example.com/forge"></label>
${t.webhookSecret ? `<div class="share-row"><div><b>Signing secret</b><span>${esc(t.webhookSecret)}</span></div><button class="btn ghost" type="button" data-copy="${esc(t.webhookSecret)}">Copy</button></div>` : ""}
${t.webhookStatus ? `<p class="note" style="margin:0">Last delivery: ${esc(t.webhookStatus)}</p>` : ""}
<div class="row"><button class="btn" type="submit">Save</button>${t.webhookUrl ? `<button class="btn ghost" type="submit" formaction="/settings/webhook/test">Send a test</button><button class="btn danger" type="submit" formaction="/settings/webhook/rotate" formnovalidate>New secret</button>` : ""}</div></form>
${videoLibrary(d.ownVideos, { base: "/settings/videos", shared: false })}
${passwordCard()}</main>`,
    { nav: "settings", session: s },
  );
}

export const passwordCard = () => `<form method="post" action="/settings/password" class="card"><h2>Your password</h2>
<p class="note" style="margin:0">Changing it signs you out on other devices.</p>
<div class="grid"><label for="pw-cur">Current password<input id="pw-cur" name="current" type="password" autocomplete="current-password" required></label>
<label for="pw-new">New password<input id="pw-new" name="next" type="password" autocomplete="new-password" minlength="10" required></label>
<label for="pw-conf">New password again<input id="pw-conf" name="confirm" type="password" autocomplete="new-password" minlength="10" required></label></div>
<div><button class="btn" type="submit">Change password</button></div></form>`;

/** A one-time link shown right after it's made (it can't be shown again). */
export const linkBox = (what: string, url: string) =>
  `<div class="flash ok" role="status" style="display:grid;gap:8px"><b>${esc(what)}</b><span class="mono" style="overflow-wrap:anywhere">${esc(url)}</span><span class="note">Send it to them yourself. It works once and expires in 7 days; it can't be shown again.</span><div><button class="btn ghost" data-copy="${esc(url)}">Copy link</button></div></div>`;

const ago = (iso: string | null) => (iso ? esc(iso.slice(0, 16).replace("T", " ")) + " UTC" : "never");

export function teamPage(s: Session, users: User[], pending: PendingInvite[], extra: { link?: { what: string; url: string }; ok?: string; err?: string } = {}): Response {
  return page(
    "Team",
    `<main class="main">${flash(extra.ok, extra.err)}${extra.link ? linkBox(extra.link.what, extra.link.url) : ""}
<div><h1>Team</h1><p class="lead">Everyone on ${esc(s.tenant.name)} signs in with their own email and password. Owners manage the team, settings and API keys; members build and manage demos.</p></div>
<section class="card"><h2>People (${users.length})</h2><div class="share">${users
      .map(
        (u) => `<div class="share-row"><div><b>${esc(u.email)} <span class="tag">${u.role === "admin" ? "administrator" : esc(u.role)}</span>${u.id === s.user.id ? " (you)" : ""}</b><span>Last signed in ${ago(u.lastLogin)}</span></div>
<div class="row">${u.id !== s.user.id ? `<form method="post" action="/team/${u.id}/reset"><button class="btn ghost" type="submit">New password link</button></form><form method="post" action="/team/${u.id}/remove"><button class="btn danger" type="submit">Remove</button></form>` : ""}</div></div>`,
      )
      .join("")}</div></section>
${
  pending.length
    ? `<section class="card"><h2>Waiting (${pending.length})</h2><div class="share">${pending
        .map((p) => `<div class="share-row"><div><b>${esc(p.email || "(password reset)")} <span class="tag">${p.kind === "reset" ? "password link" : esc(p.role)}</span></b><span>Link expires ${esc(new Date(p.expiresAt).toISOString().slice(0, 10))}</span></div></div>`)
        .join("")}</div></section>`
    : ""
}
<form method="post" action="/team/invite" class="card"><h2>Invite someone</h2>
<p class="note" style="margin:0">You'll get a link to send them (we don't send email). They choose their own password.</p>
<div class="grid"><label>Email<input name="email" type="email" required placeholder="name@company.com"></label>
<label>Role<select name="role"><option value="member">Member: builds and manages demos</option><option value="owner">Owner: also team, settings and API keys</option></select></label></div>
<div><button class="btn" type="submit">Create invite link</button></div></form></main>`,
    { nav: "team", session: s },
  );
}

export function apiPage(s: Session, keys: ApiKey[], o: { origin: string; sitesBase: string; newKey?: string; ok?: string; err?: string }): Response {
  const base = `${o.origin}/api/v1`;
  const sample = `curl -X POST ${base}/demos \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"businessName":"Acme Plumbing","industry":"Plumbing","city":"Orlando, FL","phone":"(407) 555-0123","websiteUrl":"https://acmeplumbing.example"}'`;
  const code = (t: string) => `<pre>${esc(t)}</pre>`;
  return page(
    "API",
    `<main class="main">${flash(o.ok, o.err)}
${o.newKey ? `<div class="flash ok" role="status" style="display:grid;gap:8px"><b>Your new API key</b><span class="mono" style="overflow-wrap:anywhere">${esc(o.newKey)}</span><span class="note">Copy it now: it can't be shown again. Anyone with this key can build demos on your account.</span><div><button class="btn ghost" data-copy="${esc(o.newKey)}">Copy key</button></div></div>` : ""}
<div><h1>API</h1><p class="lead">Build demos from your own tools (a booking form, a GoHighLevel workflow, Zapier, a script). Each call works on ${esc(s.tenant.name)}'s account and uses one build credit, like the dashboard.</p></div>
<section class="card"><h2>API keys</h2>${
      keys.length
        ? `<div class="share">${keys
            .map(
              (k) =>
                `<div class="share-row"><div><b>${esc(k.name)} ${k.revokedAt ? `<span class="tag bad">revoked</span>` : ""}</b><span>${esc(k.prefix)}… · made ${esc(k.createdAt.slice(0, 10))} · last used ${ago(k.lastUsedAt)}</span></div>${k.revokedAt ? "" : `<form method="post" action="/api/keys/${k.id}/revoke"><button class="btn danger" type="submit">Revoke</button></form>`}</div>`,
            )
            .join("")}</div>`
        : `<p class="note" style="margin:0">No keys yet.</p>`
    }
<form method="post" action="/api/keys" class="row" style="align-items:end"><label style="flex:1;min-width:220px">Name<input name="name" placeholder="e.g. Booking form" required></label><button class="btn" type="submit">Create key</button></form></section>
<section class="card"><h2>Build a demo</h2>
<p class="note" style="margin:0">Send the same details as the dashboard form. Only <b>businessName</b> (or a <b>googleUrl</b> to read it from) is required. The demo is created at once with a quick template site, and Claude's full design replaces it in about 7–20 minutes.</p>
${code(sample)}
<p class="note" style="margin:0">Fields: businessName, googleUrl, industry, city, phone, address, hours, websiteUrl, services, serviceAreas, reviews, notes, saw (one line of what you saw at the business), photoUrls, logoUrl, heroImageUrl, primaryColor (#rrggbb), mode (auto, light or dark), style (standard, or studio for the award-style tier at 3 credits; a studio site needs websiteUrl, saw, services, reviews or notes, or the request is refused with 422), chatWidget.</p>
${code(`201 Created
{ "slug": "acme-plumbing-1a2b3c4d", "status": "building", "site_url": "${o.sitesBase}acme-plumbing-1a2b3c4d", "credits_left": 11 }`)}
<p class="note" style="margin:0">Errors: 401 bad key · 402 no credits left · 422 a field is wrong · 429 too many requests or builds running at once.</p></section>
<section class="card"><h2>Check a demo and list demos</h2>
${code(`GET ${base}/demos/{slug}      → { slug, business_name, status, site_url, pages: [...], error }
GET ${base}/demos/{slug}/leads → { leads: [ { page, fields, received_at } ] }   (latest 50 form submissions)
GET ${base}/demos/{slug}/lead → { lead_status, history: [ { status, reason, note, by, at } ] }
POST ${base}/demos/{slug}/lead  { "status": "sent" | "replied" | "won" | "lost" | "new", "reason": "…", "note": "…" }
     (reason only for lost: No answer, Not interested, Already has a website, Too expensive, This isn't us, Other)
GET ${base}/demos            → { demos: [...] }   (latest 100)
GET ${base}/me               → { account, credits, unlimited }`)}
<p class="note" style="margin:0">status is <b>building</b>, <b>ready</b> or <b>failed</b> (or <b>template</b> while only the quick starter site exists). Send the key as <span class="mono">Authorization: Bearer …</span>. Limit: 60 requests a minute per key.</p></section>
<section class="card"><h2>Webhook messages</h2>
<p class="note" style="margin:0">Set the address under Settings. We send <b>demo.ready</b> and <b>demo.failed</b> when a build ends, <b>lead.created</b> the moment a visitor submits a form on one of your demo sites, <b>demo.lead_status</b> when a site is marked sent, replied, won or lost (the demo carries its <code>lead_status</code>), and <b>ping</b> for a test, as a POST with a JSON body and these headers:</p>
${code(`x-forge-event: demo.ready
x-forge-timestamp: 1767225600
x-forge-signature: sha256=<hex>      ← HMAC-SHA256 of "<timestamp>.<raw body>" with your signing secret

{ "event": "demo.ready", "created_at": "…", "demo": { "slug": "…", "business_name": "…", "status": "ready",
  "site_url": "…", "pages": [ { "name": "Home", "url": "…" }, … ] } }`)}
<p class="note" style="margin:0"><b>lead.created</b> carries the submission as well: <span class="mono">"lead": { "page": "/quote", "fields": { "name": "…", "phone": "…", "message": "…" } }</span>, so you can create the contact in your CRM straight away. Check the signature and reject messages older than a few minutes. Answer with any 2xx status.</p></section></main>`,
    { nav: "api", session: s },
  );
}
