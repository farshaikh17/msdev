/**
 * The client portal: the business owner's own page for their website, reached by a private link the rep
 * creates (/p/<token>), optionally behind a 6-digit PIN. No accounts and no email service.
 *
 * Everything the owner changes goes into a draft: a copy of the live version under a new version id. They
 * preview it, then Publish (the draft becomes live, the version before is kept) or Discard. Undo puts the
 * kept version back. A rebuild of the site replaces all versions, so the draft and the kept one go with it.
 */
import type { Env } from "./env";
import { hashPassword, randomToken, sha256Hex, verifyPassword } from "./crypto";

export interface Portal {
  slug: string;
  token: string;
  pinHash: string | null;
  draft: string | null;
  prev: string | null;
  createdAt: string;
  revoked: boolean;
}

export interface PortalEntry {
  at: string;
  what: string;
  detail: string;
}

/** AI change requests an owner can make each month (the rest go to the rep). */
export const PORTAL_ASKS_PER_MONTH = 5;

type Row = { slug: string; token: string; pin_hash: string | null; draft: string | null; prev: string | null; created_at: string; revoked: number };
const toPortal = (r: Row): Portal => ({ slug: r.slug, token: r.token, pinHash: r.pin_hash, draft: r.draft, prev: r.prev, createdAt: r.created_at, revoked: !!r.revoked });

export async function portalForSlug(env: Env, slug: string): Promise<Portal | null> {
  const r = await env.DB.prepare("SELECT * FROM portal WHERE slug = ?").bind(slug).first<Row>();
  return r ? toPortal(r) : null;
}

/** The portal behind a link (never a revoked one). */
export async function portalForToken(env: Env, token: string): Promise<Portal | null> {
  const r = await env.DB.prepare("SELECT * FROM portal WHERE token = ? AND revoked = 0").bind(token).first<Row>();
  return r ? toPortal(r) : null;
}

/** A new private link for the site (a fresh token: any older link stops working), with a PIN or none. */
export async function openPortal(env: Env, slug: string, pin: string | null): Promise<Portal> {
  const token = randomToken(18);
  const pinHash = pin ? await hashPassword(pin) : null;
  const old = await portalForSlug(env, slug);
  await env.DB.prepare("INSERT OR REPLACE INTO portal (slug, token, pin_hash, draft, prev, created_at, revoked) VALUES (?, ?, ?, ?, ?, ?, 0)")
    .bind(slug, token, pinHash, old?.draft ?? null, old?.prev ?? null, new Date().toISOString())
    .run();
  return (await portalForSlug(env, slug))!;
}

export async function closePortal(env: Env, slug: string): Promise<void> {
  await env.DB.prepare("UPDATE portal SET revoked = 1 WHERE slug = ?").bind(slug).run();
}

/** A random 6-digit PIN. */
export const newPin = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900000));

export async function checkPin(p: Portal, pin: string): Promise<boolean> {
  return !!p.pinHash && /^\d{6}$/.test(pin) && verifyPassword(pin, p.pinHash);
}

/** The cookie that says this browser entered the PIN for this link (tied to the PIN: a new PIN ends it). */
export const pinCookieName = (p: Portal) => `fp_${p.token.slice(0, 10)}`;
export const pinCookieValue = async (p: Portal) => sha256Hex(`${p.token}|${p.pinHash ?? ""}`);

export async function pinOk(req: Request, p: Portal): Promise<boolean> {
  if (!p.pinHash) return true;
  const want = await pinCookieValue(p);
  const got = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${pinCookieName(p)}=`))?.split("=")[1];
  return got === want;
}

export async function logPortal(env: Env, slug: string, what: string, detail = ""): Promise<void> {
  await env.DB.prepare("INSERT INTO portal_log (slug, at, what, detail) VALUES (?, ?, ?, ?)").bind(slug, new Date().toISOString(), what, detail.slice(0, 600)).run();
}

export async function portalLog(env: Env, slug: string, limit = 30): Promise<PortalEntry[]> {
  const { results } = await env.DB.prepare("SELECT at, what, detail FROM portal_log WHERE slug = ? ORDER BY at DESC LIMIT ?").bind(slug, limit).all<PortalEntry>();
  return results;
}

/** AI change requests made this calendar month (UTC). */
export async function asksThisMonth(env: Env, slug: string): Promise<number> {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM portal_log WHERE slug = ? AND what = 'edit' AND at >= ?").bind(slug, `${new Date().toISOString().slice(0, 7)}-01`).first<{ n: number }>();
  return r?.n ?? 0;
}

const versionId = () => Date.now().toString(36) + randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6).padEnd(6, "0");

/**
 * The draft to edit: the existing one, or a copy of the live version (its design, pages and pictures, with
 * every picture link moved to the copy). Null when the site has no live version.
 */
export async function ensureDraft(env: Env, slug: string): Promise<string | null> {
  const p = await portalForSlug(env, slug);
  const live = (await env.DB.prepare("SELECT live_version FROM demos WHERE slug = ?").bind(slug).first<{ live_version: string | null }>())?.live_version;
  if (!p || !live) return null;
  if (p.draft && (await env.DB.prepare("SELECT 1 AS y FROM site_versions WHERE slug = ? AND version = ?").bind(slug, p.draft).first())) return p.draft;
  const draft = versionId();
  const from = `_img/${live}/`;
  const to = `_img/${draft}/`;
  await env.DB.prepare("INSERT INTO site_versions (slug, version, kit, usage, created_at, review, qa) SELECT slug, ?1, REPLACE(kit, ?3, ?4), usage, ?5, review, qa FROM site_versions WHERE slug = ?2 AND version = ?6").bind(draft, slug, from, to, new Date().toISOString(), live).run();
  await env.DB.prepare("INSERT INTO site_pages (slug, version, path, title, description, css, body, usage) SELECT slug, ?1, path, title, description, REPLACE(css, ?3, ?4), REPLACE(body, ?3, ?4), NULL FROM site_pages WHERE slug = ?2 AND version = ?5").bind(draft, slug, from, to, live).run();
  await env.DB.prepare("INSERT INTO site_images (slug, version, name, description, data) SELECT slug, ?1, name, description, data FROM site_images WHERE slug = ?2 AND version = ?3").bind(draft, slug, live).run();
  await env.DB.prepare("UPDATE portal SET draft = ? WHERE slug = ?").bind(draft, slug).run();
  return draft;
}

/** Make the draft live, keeping the version before it for Undo. */
export async function publishDraft(env: Env, slug: string): Promise<boolean> {
  const p = await portalForSlug(env, slug);
  const live = (await env.DB.prepare("SELECT live_version FROM demos WHERE slug = ?").bind(slug).first<{ live_version: string | null }>())?.live_version;
  if (!p?.draft || !live) return false;
  await env.DB.prepare("UPDATE demos SET live_version = ?, updated_at = ? WHERE slug = ?").bind(p.draft, new Date().toISOString(), slug).run();
  await env.DB.prepare("UPDATE portal SET prev = ?, draft = NULL WHERE slug = ?").bind(live, slug).run();
  // The version before the one now kept for Undo is no longer needed.
  if (p.prev && p.prev !== live) await dropVersion(env, slug, p.prev);
  return true;
}

/** Put the version from before the last Publish back (the published one is kept, so Undo can be undone). */
export async function undoPublish(env: Env, slug: string): Promise<boolean> {
  const p = await portalForSlug(env, slug);
  const live = (await env.DB.prepare("SELECT live_version FROM demos WHERE slug = ?").bind(slug).first<{ live_version: string | null }>())?.live_version;
  if (!p?.prev || !live || !(await env.DB.prepare("SELECT 1 AS y FROM site_versions WHERE slug = ? AND version = ?").bind(slug, p.prev).first())) return false;
  await env.DB.prepare("UPDATE demos SET live_version = ?, updated_at = ? WHERE slug = ?").bind(p.prev, new Date().toISOString(), slug).run();
  await env.DB.prepare("UPDATE portal SET prev = ? WHERE slug = ?").bind(live, slug).run();
  return true;
}

/** Throw the draft away. */
export async function discardDraft(env: Env, slug: string): Promise<void> {
  const p = await portalForSlug(env, slug);
  if (!p?.draft) return;
  await env.DB.prepare("UPDATE portal SET draft = NULL WHERE slug = ?").bind(slug).run();
  await dropVersion(env, slug, p.draft);
}

async function dropVersion(env: Env, slug: string, version: string): Promise<void> {
  const live = (await env.DB.prepare("SELECT live_version FROM demos WHERE slug = ?").bind(slug).first<{ live_version: string | null }>())?.live_version;
  if (version === live) return;
  await env.DB.prepare("DELETE FROM site_pages WHERE slug = ? AND version = ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_images WHERE slug = ? AND version = ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_versions WHERE slug = ? AND version = ?").bind(slug, version).run();
}

/** Is this the draft of a live portal (so it may be previewed)? */
export async function isPortalDraft(env: Env, slug: string, version: string): Promise<boolean> {
  return !!(await env.DB.prepare("SELECT 1 AS y FROM portal WHERE slug = ? AND draft = ? AND revoked = 0").bind(slug, version).first());
}

/** The go-live checklist, worked out from the site as it is. */
export interface GoLive {
  photos: boolean;
  reviews: boolean;
  domain: boolean;
  form: boolean;
  published: boolean;
}
