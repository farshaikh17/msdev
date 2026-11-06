/** The Mianro admin console: customer accounts, their credits and costs, and the shared hero-video library. */
import { esc } from "../../../src/forge/render";
import type { Session } from "./auth";
import type { LibraryEntry } from "./hero";
import type { LedgerEntry, PendingInvite, Tenant, TenantSummary, Usage, User } from "./tenants";
import { flash, page } from "./ui";
import type { Inquiry } from "./web";
import type { Plan } from "./web-content";
import { linkBox, videoLibrary } from "./ui-settings";

const usd = (n: number) => `$${n.toFixed(2)}`;
const when = (iso: string | null) => (iso ? esc(iso.slice(0, 16).replace("T", " ")) + " UTC" : "never");

interface Extra {
  prefill?: { name: string; email: string; credits: string };
  link?: { what: string; url: string };
  ok?: string;
  err?: string;
}

export function adminPage(s: Session, tenants: TenantSummary[], extra: Extra = {}, newInquiries = 0): Response {
  const total = tenants.reduce((a, t) => a + t.costTotal, 0);
  const month = tenants.reduce((a, t) => a + t.costMonth, 0);
  return page(
    "Admin",
    `<main class="main">${flash(extra.ok, extra.err)}${extra.link ? linkBox(extra.link.what, extra.link.url) : ""}
<div class="row" style="justify-content:space-between"><div><h1>Accounts</h1><p class="lead">Customer accounts, their build credits and what their builds cost us in Claude fees. This page is for Mianro staff only.</p></div>
<div class="row"><a class="btn ghost" href="/admin/inquiries">Inquiries${newInquiries ? ` (${newInquiries} new)` : ""}</a><a class="btn ghost" href="/admin/site">Website</a><a class="btn ghost" href="/admin/videos">Shared videos</a></div></div>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
<div class="card" style="gap:2px;padding:16px"><span class="note">Accounts</span><b style="font:800 1.6rem var(--display)">${tenants.length}</b></div>
<div class="card" style="gap:2px;padding:16px"><span class="note">Claude cost this month</span><b style="font:800 1.6rem var(--display)">${usd(month)}</b></div>
<div class="card" style="gap:2px;padding:16px"><span class="note">Claude cost, all time</span><b style="font:800 1.6rem var(--display)">${usd(total)}</b></div></div>
<div class="table"><table><thead><tr><th>Account</th><th>Status</th><th>Credits</th><th>Demos</th><th>People</th><th>Builds</th><th>Cost (month)</th><th>Cost (all)</th><th></th></tr></thead><tbody>${tenants
      .map(
        (t) =>
          `<tr><td><a href="/admin/tenants/${t.id}">${esc(t.name)}</a></td><td>${t.status === "suspended" ? `<span class="tag bad">suspended</span>` : `<span class="tag">active</span>`}</td><td>${t.unlimited ? "unlimited" : t.credits}</td><td>${t.demos}</td><td>${t.users}</td><td>${t.builds}</td><td>${usd(t.costMonth)}</td><td>${usd(t.costTotal)}</td><td><a href="/admin/tenants/${t.id}">Manage →</a></td></tr>`,
      )
      .join("")}</tbody></table></div>
<form method="post" action="/admin/tenants" class="card" id="new"><h2>New account</h2>
<p class="note" style="margin:0">Make an account for a customer (an agency or business that will build demos), give it some starting credits, and invite its owner. You get a link to send them.</p>
<div class="grid"><label>Account name<input name="name" required maxlength="80" placeholder="e.g. Bright Ideas Marketing" value="${esc(extra.prefill?.name ?? "")}"></label>
<label>Owner's email<input name="email" type="email" required placeholder="owner@their-company.com" value="${esc(extra.prefill?.email ?? "")}"></label>
<label>Starting credits<input name="credits" type="number" min="0" max="10000" value="${esc(extra.prefill?.credits ?? "3")}"></label></div>
<div><button class="btn" type="submit">Create account and invite link</button></div></form></main>`,
    { nav: "admin", session: s },
  );
}

export function adminTenantPage(
  s: Session,
  t: Tenant,
  d: { users: User[]; pending: PendingInvite[]; ledger: LedgerEntry[]; usage: Usage; costTotal: number; costMonth: number },
  extra: Extra = {},
): Response {
  const mode = (m: string, label: string) => `<option value="${m}"${t.creditMode === m ? " selected" : ""}>${label}</option>`;
  return page(
    t.name,
    `<main class="main">${flash(extra.ok, extra.err)}${extra.link ? linkBox(extra.link.what, extra.link.url) : ""}
<div class="row" style="justify-content:space-between"><div><p class="note" style="margin:0"><a href="/admin">← All accounts</a></p><h1>${esc(t.name)} ${t.status === "suspended" ? `<span class="tag bad">suspended</span>` : ""}</h1>
<p class="lead">${esc(t.slug)} · created ${esc(t.createdAt.slice(0, 10))} · ${d.usage.demos} demos · ${d.usage.buildsTotal} builds (${d.usage.buildsMonth} this month) · ${d.usage.leads} form submissions · Claude cost ${usd(d.costMonth)} this month, ${usd(d.costTotal)} in all</p></div></div>
<section class="card"><h2>Credits: ${t.unlimited ? "unlimited" : t.credits}</h2>
${
  t.unlimited
    ? `<p class="note" style="margin:0">This account builds without using credits.</p>`
    : `<form method="post" action="/admin/tenants/${t.id}/credits" class="row" style="align-items:end"><label>Add (or take away with a minus)<input name="delta" type="number" min="-10000" max="10000" value="10" required></label><label style="flex:1;min-width:200px">Note (kept in the history)<input name="reason" placeholder="e.g. Paid invoice 1042"></label><button class="btn" type="submit">Apply</button></form>`
}
<div class="share">${
      d.ledger.length
        ? d.ledger.map((e) => `<div class="share-row"><div><b>${e.delta > 0 ? "+" : ""}${e.delta} · ${esc(e.reason)}</b><span>${when(e.createdAt)}${e.demoSlug ? ` · ${esc(e.demoSlug)}` : ""}</span></div></div>`).join("")
        : `<p class="note" style="margin:0">No credit history yet.</p>`
    }</div></section>
<form method="post" action="/admin/tenants/${t.id}/branding" class="card"><h2>Name and footer credit</h2>
<p class="note" style="margin:0">The line at the bottom of every page of this account's demo sites. Mianro's own line is the default; you can put the customer's name and link there instead, or remove it. It changes on sites already built within a minute.</p>
<div class="grid"><label>Account name<input name="name" value="${esc(t.name)}" required maxlength="80"></label>
<label>Footer credit<select name="creditMode">${mode("mianro", "Mianro Systems (default)")}${mode("custom", "Their own name and link")}${mode("none", "None")}</select></label>
<label>Their name<input name="creditName" value="${esc(t.creditName)}" maxlength="80" placeholder="e.g. Bright Ideas Marketing"></label>
<label>Their link (https)<input name="creditUrl" type="url" value="${esc(t.creditUrl)}" placeholder="https://their-site.com"></label></div>
<div><button class="btn" type="submit">Save</button></div></form>
<section class="card"><h2>People (${d.users.length})</h2><div class="share">${d.users
      .map(
        (u) =>
          `<div class="share-row"><div><b>${esc(u.email)} <span class="tag">${esc(u.role)}</span></b><span>Last signed in ${when(u.lastLogin)}</span></div><form method="post" action="/admin/tenants/${t.id}/users/${u.id}/reset"><button class="btn ghost" type="submit">New password link</button></form></div>`,
      )
      .join("")}</div>
${d.pending.length ? `<p class="note" style="margin:0">Waiting: ${d.pending.map((p) => esc(p.email || "password link")).join(", ")}</p>` : ""}
<form method="post" action="/admin/tenants/${t.id}/invite" class="row" style="align-items:end"><label style="flex:1;min-width:220px">Invite an owner<input name="email" type="email" required placeholder="owner@their-company.com"></label><button class="btn" type="submit">Create invite link</button></form></section>
<section class="card"><h2>Status</h2>
${
  t.id === 1
    ? `<p class="note" style="margin:0">This is the Mianro account; it can't be suspended or deleted.</p>`
    : `<p class="note" style="margin:0">${t.status === "suspended" ? "Suspended: its people can't sign in, and its demo sites and forms are switched off (within a minute). Nothing is deleted." : "Suspending switches off its sign-in and every demo site and form (within a minute). Nothing is deleted, and activating brings it all back."}</p>
<div class="row"><form method="post" action="/admin/tenants/${t.id}/status"><input type="hidden" name="status" value="${t.status === "suspended" ? "active" : "suspended"}"><button class="btn ${t.status === "suspended" ? "" : "danger"}" type="submit">${t.status === "suspended" ? "Activate account" : "Suspend account"}</button></form></div>
<form method="post" action="/admin/tenants/${t.id}/delete" class="row" style="align-items:end"><label style="flex:1;min-width:240px">Delete forever: type the account name to confirm<input name="confirm" autocomplete="off" placeholder="${esc(t.name)}"></label><button class="btn danger" type="submit">Delete account and its data</button></form>`
}</section></main>`,
    { nav: "admin", session: s },
  );
}

export function adminVideosPage(s: Session, videos: LibraryEntry[], folder: string, extra: Extra = {}): Response {
  return page(
    "Shared videos",
    `<main class="main">${flash(extra.ok, extra.err)}
<div><p class="note" style="margin:0"><a href="/admin">← All accounts</a></p><h1>Shared hero videos</h1></div>
${videoLibrary(videos, { base: "/admin/videos", shared: true, folder })}</main>`,
    { nav: "admin", session: s },
  );
}

const KIND: Record<string, string> = { reseller: "Reseller application", sample: "Sample request", contact: "Message" };
const STATUSES = ["new", "talking", "won", "closed"] as const;

export function adminInquiriesPage(s: Session, rows: Inquiry[], filter: string, extra: Extra = {}): Response {
  const tab = (v: string, label: string) => `<a class="btn ${filter === v ? "" : "ghost"}" href="/admin/inquiries${v ? `?status=${v}` : ""}">${label}</a>`;
  const card = (r: Inquiry) => {
    const bits = [r.company && `<b>${esc(r.company)}</b>`, r.website && esc(r.website), r.phone && esc(r.phone), ...Object.entries(r.extra).map(([k, v]) => `${esc(k)}: ${esc(v)}`)].filter(Boolean);
    const create =
      r.kind === "reseller"
        ? `<a class="btn" href="/admin?${new URLSearchParams({ name: r.company || r.name, email: r.email, credits: "10" }).toString()}#new">Create account</a>`
        : "";
    return `<div class="card"><div class="row" style="justify-content:space-between"><div><b>${esc(r.name)}</b> · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><span class="note">${esc(KIND[r.kind] ?? r.kind)} · ${when(r.createdAt)}${bits.length ? ` · ${bits.join(" · ")}` : ""}</span></div><span class="tag${r.status === "new" ? "" : " bad"}">${esc(r.status)}</span></div>
${r.message ? `<p style="margin:0;white-space:pre-wrap">${esc(r.message)}</p>` : ""}
<div class="row">${create}${STATUSES.filter((x) => x !== r.status)
      .map((x) => `<form method="post" action="/admin/inquiries/${r.id}/status"><input type="hidden" name="status" value="${x}"><input type="hidden" name="back" value="${esc(filter)}"><button class="btn ghost" type="submit">Mark ${x}</button></form>`)
      .join("")}</div></div>`;
  };
  return page(
    "Inquiries",
    `<main class="main">${flash(extra.ok, extra.err)}<div><p class="note" style="margin:0"><a href="/admin">← All accounts</a></p><h1>Website inquiries</h1><p class="lead">Messages, sample requests and reseller applications from the public site.</p></div>
<div class="row">${tab("", "All")}${tab("new", "New")}${tab("talking", "Talking")}${tab("won", "Won")}${tab("closed", "Closed")}</div>
${rows.length ? rows.map(card).join("") : `<div class="card empty">Nothing here yet.</div>`}</main>`,
    { nav: "admin", session: s },
  );
}

export function adminSitePage(s: Session, plans: Plan[], showcase: string, extra: Extra = {}): Response {
  const rows = [...plans, ...Array.from({ length: Math.max(0, 4 - plans.length) }, () => ({ name: "", credits: 0, price: "", blurb: "" }) as Plan)];
  return page(
    "Website",
    `<main class="main">${flash(extra.ok, extra.err)}<div><p class="note" style="margin:0"><a href="/admin">← All accounts</a></p><h1>Public website</h1><p class="lead">What the public Forge site shows: the credit packs on the pricing page and the example sites. Leave a pack's name empty to remove it.</p></div>
<form method="post" action="/admin/site" class="card"><h2>Credit packs</h2>
${rows
  .map(
    (p, i) => `<div class="grid"><label>Name<input name="name${i}" maxlength="30" value="${esc(p.name)}"></label><label>Credits<input name="credits${i}" type="number" min="0" max="100000" value="${p.credits || ""}"></label><label>Price<input name="price${i}" maxlength="14" value="${esc(p.price)}" placeholder="$249"></label><label class="full">One line<input name="blurb${i}" maxlength="140" value="${esc(p.blurb)}"></label><label class="choice"><input type="radio" name="featured" value="${i}"${p.featured ? " checked" : ""}><span>Most popular</span></label></div>`,
  )
  .join("")}
<h2>Example sites</h2><label>Demo links or names, one per line (up to 9)<textarea name="showcase" rows="5" placeholder="https://forge-sites.example/acme-plumbing-1a2b3c4d">${esc(showcase)}</textarea></label>
<p class="note" style="margin:0">Only demos you list here appear on the public Examples page, and only while their account is active.</p>
<div><button class="btn" type="submit">Save</button></div></form></main>`,
    { nav: "admin", session: s },
  );
}
