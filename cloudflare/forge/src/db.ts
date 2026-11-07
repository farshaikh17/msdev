/** Demos and settings in D1. Demos are archived, not deleted. */
import { Intake, SiteContent, type Demo } from "../../../src/forge/schema";
import type { Outreach } from "./outreach";
import type { Review } from "./review";
import type { Kit, PageDraft } from "./designer";
import type { Env } from "./env";
import { parseKeywords, parseVideoUrls, type LibraryEntry } from "./hero";
import { recordBuildCost, refundBuild } from "./tenants";

interface Row {
  outreach?: string | null;
  change_note?: string | null;
  html: string | null;
  live_version: string | null;
  build_version: string | null;
  build_stage: string | null;
  build_usage: string | null;
  build_status: string;
  build_error: string | null;
  tenant_id: number | null;
  slug: string;
  business_name: string;
  intake: string;
  content: string;
  written_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * A demo plus its AI-built site: liveVersion names the multi-page site visitors see; without one,
 * html is an older single-page design, and without that the built-in template shows.
 */
export type Stored = Demo & {
  /** The account this demo belongs to. */
  tenantId: number;
  html: string | null;
  liveVersion: string | null;
  buildVersion: string | null;
  buildStage: "kit" | "pages" | null;
  buildStatus: "building" | "ready" | "failed" | "queued";
  /** The outreach kit written for this demo, if any. */
  outreach: Outreach | null;
  /** The latest change request and where it is. */
  changeNote: ChangeNote | null;
  buildError: string;
  /** What the live design cost to build (US$) and how many Claude calls it took; null before the first build. */
  buildCost: { usd: number; calls: number } | null;
};

export interface Listed {
  buildStatus: string;
  /** Who has looked at it (absent before the first view). */
  views?: ViewStat;
  slug: string;
  businessName: string;
  industry: string;
  city: string;
  createdAt: string;
}

/** A build that has made no progress this long was stopped by the platform (a queue job runs at most 15 minutes). */
const STALE_MS = 16 * 60_000;

export interface ChangeNote {
  path: string;
  instruction: string;
  status: "working" | "done" | "failed";
  error: string;
  at: string;
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function costFrom(raw: string | null): Stored["buildCost"] {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as { cost_usd?: unknown; calls?: unknown };
    return typeof u.cost_usd === "number" ? { usd: u.cost_usd, calls: typeof u.calls === "number" ? u.calls : 0 } : null;
  } catch {
    return null;
  }
}

function toDemo(r: Row): Stored {
  const stale = r.build_status === "building" && Date.now() - Date.parse(r.updated_at) > STALE_MS;
  return {
    tenantId: r.tenant_id ?? 1,
    html: r.html ?? null,
    liveVersion: r.live_version ?? null,
    buildVersion: r.build_version ?? null,
    buildStage: r.build_stage === "kit" || r.build_stage === "pages" ? r.build_stage : null,
    buildCost: costFrom(r.build_usage),
    buildStatus: stale ? "failed" : r.build_status === "building" || r.build_status === "failed" || r.build_status === "queued" ? r.build_status : "ready",
    outreach: parseJson<Outreach>(r.outreach),
    changeNote: parseJson<ChangeNote>(r.change_note),
    buildError: stale ? "The build stopped before finishing." : (r.build_error ?? ""),
    slug: r.slug,
    intake: Intake.parse(JSON.parse(r.intake)),
    content: SiteContent.parse(JSON.parse(r.content)),
    writtenBy: r.written_by === "draft" ? "draft" : "ai",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** "Vanguard Pipe & Water" → "vanguard-pipe-water-k3f9". The suffix keeps links unique and unguessable. */
export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  const r = crypto.getRandomValues(new Uint8Array(4)); // 8 hex digits: 4 billion links, not guessable by trying
  return `${base || "demo"}-${[...r].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export const SLUG = /^[a-z0-9-]{3,64}$/;

/**
 * One demo by its link name. Pass `tenantId` for anything a signed-in person or an API key does,
 * so one account can never reach another's demos; leave it out only for public pages.
 */
export async function getDemo(env: Env, slug: string, opts: { tenantId?: number; activeOnly?: boolean } = {}): Promise<Stored | null> {
  if (!SLUG.test(slug)) return null;
  const { tenantId, activeOnly = true } = opts;
  const r = await env.DB.prepare(`SELECT * FROM demos WHERE slug = ?${activeOnly ? " AND status = 'active'" : ""}${tenantId !== undefined ? " AND tenant_id = ?" : ""}`)
    .bind(...(tenantId !== undefined ? [slug, tenantId] : [slug]))
    .first<Row>();
  return r ? toDemo(r) : null;
}

export async function listDemos(env: Env, tenantId: number): Promise<Listed[]> {
  const { results } = await env.DB.prepare(
    "SELECT slug, business_name, intake, content, created_at, updated_at, build_status FROM demos WHERE tenant_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 200",
  )
    .bind(tenantId)
    .all<Row>();
  return results.map((r) => {
    const intake = JSON.parse(r.intake) as { city?: string };
    const content = JSON.parse(r.content) as { industry?: string };
    const stale = r.build_status === "building" && Date.now() - Date.parse(r.updated_at ?? r.created_at) > STALE_MS;
    return { buildStatus: stale ? "failed" : r.build_status, slug: r.slug, businessName: r.business_name, industry: content.industry ?? "", city: intake.city ?? "", createdAt: r.created_at };
  });
}

/** Create a demo for an account, or update one it already has (a slug that belongs to another account is never touched). */
export async function saveDemo(env: Env, d: Demo, tenantId: number): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO demos (slug, business_name, intake, content, written_by, status, created_at, updated_at, tenant_id)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET business_name = excluded.business_name, intake = excluded.intake,
       content = excluded.content, written_by = excluded.written_by, updated_at = excluded.updated_at
       WHERE demos.tenant_id = excluded.tenant_id`,
  )
    .bind(d.slug, d.intake.businessName, JSON.stringify(d.intake), JSON.stringify(d.content), d.writtenBy, d.createdAt, d.updatedAt, tenantId)
    .run();
}

/** Save the intake with details filled in from the business's website or Google link. */
export async function updateIntake(env: Env, slug: string, intake: Demo["intake"]): Promise<void> {
  await env.DB.prepare("UPDATE demos SET intake = ? WHERE slug = ?").bind(JSON.stringify(intake), slug).run();
}

/** Start (or resume) building a version. The live site, if any, stays up until the new one is complete. */
export async function markBuilding(env: Env, slug: string, version: string, stage: "kit" | "pages"): Promise<void> {
  await env.DB.prepare("UPDATE demos SET build_status = 'building', build_error = NULL, build_version = ?, build_stage = ?, updated_at = ? WHERE slug = ?")
    .bind(version, stage, new Date().toISOString(), slug)
    .run();
}

/** Record progress on a build (keeps it from looking stalled). */
export async function touchBuild(env: Env, slug: string, version: string, stage: "kit" | "pages"): Promise<void> {
  await env.DB.prepare("UPDATE demos SET build_stage = ?, updated_at = ? WHERE slug = ? AND build_version = ? AND build_status = 'building'")
    .bind(stage, new Date().toISOString(), slug, version)
    .run();
}

export async function saveKit(env: Env, slug: string, version: string, kit: Kit, usage: unknown): Promise<void> {
  await env.DB.prepare("INSERT OR REPLACE INTO site_versions (slug, version, kit, usage, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(slug, version, JSON.stringify(kit), JSON.stringify(usage), new Date().toISOString())
    .run();
}

export async function getKit(env: Env, slug: string, version: string): Promise<Kit | null> {
  const r = await env.DB.prepare("SELECT kit FROM site_versions WHERE slug = ? AND version = ?").bind(slug, version).first<{ kit: string }>();
  return r ? (JSON.parse(r.kit) as Kit) : null;
}

export async function savePage(env: Env, slug: string, version: string, path: string, p: PageDraft, usage: unknown): Promise<void> {
  await env.DB.prepare("INSERT OR REPLACE INTO site_pages (slug, version, path, title, description, css, body, usage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(slug, version, path, p.title, p.description, p.css, p.body, usage == null ? null : JSON.stringify(usage))
    .run();
}

export async function getPage(env: Env, slug: string, version: string, path: string): Promise<PageDraft | null> {
  return env.DB.prepare("SELECT title, description, css, body FROM site_pages WHERE slug = ? AND version = ? AND path = ?").bind(slug, version, path).first<PageDraft>();
}

/** The paths written so far for a version. */
export async function pagesDone(env: Env, slug: string, version: string): Promise<string[]> {
  const { results } = await env.DB.prepare("SELECT path FROM site_pages WHERE slug = ? AND version = ?").bind(slug, version).all<{ path: string }>();
  return results.map((r) => r.path);
}

/** Every page is written: make this version the live site, total up what it cost, and drop older versions. */
export async function goLive(env: Env, slug: string, version: string): Promise<void> {
  const rows = await env.DB.prepare(
    "SELECT usage FROM site_versions WHERE slug = ?1 AND version = ?2 UNION ALL SELECT usage FROM site_pages WHERE slug = ?1 AND version = ?2 AND usage IS NOT NULL",
  )
    .bind(slug, version)
    .all<{ usage: string | null }>();
  const total: Record<string, number> = { calls: 0 };
  for (const r of rows.results) {
    const u = JSON.parse(r.usage ?? "{}") as Record<string, unknown>;
    total.calls++;
    for (const [k, v] of Object.entries(u)) if (typeof v === "number") total[k] = (total[k] ?? 0) + v;
  }
  await env.DB.prepare(
    "UPDATE demos SET live_version = ?, build_status = 'ready', build_stage = NULL, build_error = NULL, build_usage = ?, charged_version = NULL, updated_at = ? WHERE slug = ? AND build_version = ?",
  )
    .bind(version, JSON.stringify(total), new Date().toISOString(), slug, version)
    .run();
  const owner = await env.DB.prepare("SELECT tenant_id FROM demos WHERE slug = ?").bind(slug).first<{ tenant_id: number }>();
  if (owner) await recordBuildCost(env, owner.tenant_id, slug, version, total.cost_usd ?? 0, total.calls, "ready");
  await env.DB.prepare("DELETE FROM site_pages WHERE slug = ? AND version <> ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_versions WHERE slug = ? AND version <> ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_images WHERE slug = ? AND version <> ?").bind(slug, version).run();
}

/**
 * Stop a build. Only the named version: a newer build that has started since is left alone. What the
 * partial build cost is recorded, and the credit taken for it is given back.
 */
export async function saveFailed(env: Env, slug: string, version: string, error: string): Promise<boolean> {
  const r = await env.DB.prepare("UPDATE demos SET build_status = 'failed', build_error = ?, updated_at = ? WHERE slug = ? AND build_version = ? AND build_status = 'building'")
    .bind(error.slice(0, 500), new Date().toISOString(), slug, version)
    .run();
  if (r.meta.changes !== 1) return false;
  const rows = await env.DB.prepare(
    "SELECT usage FROM site_versions WHERE slug = ?1 AND version = ?2 UNION ALL SELECT usage FROM site_pages WHERE slug = ?1 AND version = ?2 AND usage IS NOT NULL",
  )
    .bind(slug, version)
    .all<{ usage: string | null }>();
  let usd = 0;
  for (const row of rows.results) usd += Number((JSON.parse(row.usage ?? "{}") as { cost_usd?: number }).cost_usd) || 0;
  const owner = await env.DB.prepare("SELECT tenant_id FROM demos WHERE slug = ?").bind(slug).first<{ tenant_id: number }>();
  if (owner && usd > 0) await recordBuildCost(env, owner.tenant_id, slug, version, usd, rows.results.length, "failed");
  await refundBuild(env, slug, version);
  return true;
}

/** How many of an account's demos are being built right now (a build with no progress for 16 minutes doesn't count). */
export async function buildingCount(env: Env, tenantId: number): Promise<number> {
  const since = new Date(Date.now() - STALE_MS).toISOString();
  const r = await env.DB.prepare("SELECT count(*) c FROM demos WHERE tenant_id = ? AND status = 'active' AND build_status = 'building' AND updated_at > ?").bind(tenantId, since).first<{ c: number }>();
  return r?.c ?? 0;
}

export async function archiveDemo(env: Env, slug: string, tenantId: number): Promise<void> {
  await env.DB.prepare("UPDATE demos SET status = 'archived', updated_at = ? WHERE slug = ? AND tenant_id = ?").bind(new Date().toISOString(), slug, tenantId).run();
}

export async function getSetting(env: Env, key: string): Promise<string> {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return r?.value ?? "";
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .bind(key, value)
    .run();
}

export interface Lead {
  page: string;
  fields: Record<string, string>;
  createdAt: string;
}

export async function saveLead(env: Env, slug: string, page: string, fields: Record<string, string>): Promise<void> {
  await env.DB.prepare("INSERT INTO leads (slug, page, fields, created_at) VALUES (?, ?, ?, ?)")
    .bind(slug, page, JSON.stringify(fields), new Date().toISOString())
    .run();
}

export async function listLeads(env: Env, slug: string): Promise<Lead[]> {
  const { results } = await env.DB.prepare("SELECT page, fields, created_at FROM leads WHERE slug = ? ORDER BY id DESC LIMIT 50")
    .bind(slug)
    .all<{ page: string; fields: string; created_at: string }>();
  return results.map((r) => ({ page: r.page, fields: JSON.parse(r.fields) as Record<string, string>, createdAt: r.created_at }));
}

export async function saveImage(env: Env, slug: string, version: string, name: string, description: string, bytes: Uint8Array): Promise<void> {
  await env.DB.prepare("INSERT OR REPLACE INTO site_images (slug, version, name, description, data) VALUES (?, ?, ?, ?, ?)")
    .bind(slug, version, name, description, bytes)
    .run();
}

/** A preview photo's bytes (D1 hands blobs back as an array of numbers). */
export async function getImage(env: Env, slug: string, version: string, name: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const r = await env.DB.prepare("SELECT data FROM site_images WHERE slug = ? AND version = ? AND name = ?").bind(slug, version, name).first<{ data: number[] | ArrayBuffer }>();
  return r ? new Uint8Array(r.data) : null;
}

/** The preview photos made for a site version, in order (photo-1 is the hero shot). */
export async function imageNames(env: Env, slug: string, version: string): Promise<string[]> {
  const { results } = await env.DB.prepare("SELECT name FROM site_images WHERE slug = ? AND version = ?").bind(slug, version).all<{ name: string }>();
  return results.map((r) => r.name).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
}

interface VideoRow {
  id: number;
  name: string;
  keywords: string;
  urls: string;
  drive_id: string | null;
  file_name: string | null;
  tenant_id: number | null;
}

const toEntry = (r: VideoRow): LibraryEntry => ({
  id: r.id,
  name: r.name,
  keywords: parseKeywords(r.keywords),
  urls: parseVideoUrls(r.urls),
  driveId: r.drive_id,
  fileName: r.file_name,
  shared: r.tenant_id === null,
});

const VIDEO_COLS = "id, name, keywords, urls, drive_id, file_name, tenant_id";

/** The clips a demo of this account can use: Mianro's shared library plus the account's own. */
export async function listLibrary(env: Env, tenantId: number): Promise<LibraryEntry[]> {
  const { results } = await env.DB.prepare(`SELECT ${VIDEO_COLS} FROM video_library WHERE tenant_id IS NULL OR tenant_id = ? ORDER BY name, file_name`).bind(tenantId).all<VideoRow>();
  return results.map(toEntry);
}

/** The shared library (managed by Mianro staff). */
export async function listSharedVideos(env: Env): Promise<LibraryEntry[]> {
  const { results } = await env.DB.prepare(`SELECT ${VIDEO_COLS} FROM video_library WHERE tenant_id IS NULL ORDER BY name, file_name`).all<VideoRow>();
  return results.map(toEntry);
}

/** Clips an account added itself. */
export async function listOwnVideos(env: Env, tenantId: number): Promise<LibraryEntry[]> {
  const { results } = await env.DB.prepare(`SELECT ${VIDEO_COLS} FROM video_library WHERE tenant_id = ? ORDER BY name, file_name`).bind(tenantId).all<VideoRow>();
  return results.map(toEntry);
}

/** Add or change an entry. `tenantId` null is the shared library; an entry can only be changed by the library it's in. */
export async function saveVideo(env: Env, e: { id?: number; name: string; keywords: string[]; urls: string[] }, tenantId: number | null): Promise<void> {
  if (e.id && !e.urls.length)
    // A Drive clip: only its trade and keywords are edited; the link stays.
    await env.DB.prepare("UPDATE video_library SET name = ?, keywords = ? WHERE id = ? AND tenant_id IS ?").bind(e.name, e.keywords.join(", "), e.id, tenantId).run();
  else if (e.id)
    await env.DB.prepare("UPDATE video_library SET name = ?, keywords = ?, urls = ? WHERE id = ? AND tenant_id IS ?").bind(e.name, e.keywords.join(", "), e.urls.join("\n"), e.id, tenantId).run();
  else
    await env.DB.prepare("INSERT INTO video_library (name, keywords, urls, tenant_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(e.name, e.keywords.join(", "), e.urls.join("\n"), tenantId, new Date().toISOString())
      .run();
}

export async function deleteVideo(env: Env, id: number, tenantId: number | null): Promise<void> {
  await env.DB.prepare("DELETE FROM video_library WHERE id = ? AND tenant_id IS ?").bind(id, tenantId).run();
}

/** A clip copied from the Drive folder (insert, or refresh if it's already there). */
export async function saveDriveVideo(env: Env, v: { driveId: string; fileName: string; name: string; keywords: string[]; url: string }): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO video_library (name, keywords, urls, drive_id, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (drive_id) WHERE drive_id IS NOT NULL DO UPDATE SET urls = excluded.urls, file_name = excluded.file_name`,
  )
    .bind(v.name, v.keywords.join(", "), v.url, v.driveId, v.fileName, new Date().toISOString())
    .run();
}

export async function driveVideoIds(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare("SELECT drive_id FROM video_library WHERE drive_id IS NOT NULL").all<{ drive_id: string }>();
  return results.map((r) => r.drive_id);
}

export async function deleteDriveVideo(env: Env, driveId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM video_library WHERE drive_id = ?").bind(driveId).run();
}

/** Has this key used up its attempts in the current window? (Read-only: expired counters don't count.) */
export async function throttled(env: Env, key: string, limit: number): Promise<boolean> {
  const r = await env.DB.prepare("SELECT count FROM throttle WHERE key = ? AND reset_at > ?").bind(key, Date.now()).first<{ count: number }>();
  return (r?.count ?? 0) >= limit;
}

/** Count one attempt; the window opens at the first attempt and the count starts over after `windowMs`. */
export async function recordAttempt(env: Env, key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO throttle (key, count, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT (key) DO UPDATE SET count = CASE WHEN reset_at > ?3 THEN count + 1 ELSE 1 END,
                                     reset_at = CASE WHEN reset_at > ?3 THEN reset_at ELSE ?2 END`,
  )
    .bind(key, now + windowMs, now)
    .run();
}

export async function clearAttempts(env: Env, key: string): Promise<void> {
  await env.DB.prepare("DELETE FROM throttle WHERE key = ?").bind(key).run();
}

/** Hourly housekeeping: expired rate-limit counters, and one-time links that expired over a month ago. */
export async function pruneThrottle(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM throttle WHERE reset_at < ?").bind(Date.now()).run();
  await env.DB.prepare("DELETE FROM tokens WHERE expires_at < ?").bind(Date.now() - 30 * 86_400_000).run();
}

export async function countLeads(env: Env, slug: string): Promise<number> {
  const r = await env.DB.prepare("SELECT count(*) c FROM leads WHERE slug = ?").bind(slug).first<{ c: number }>();
  return r?.c ?? 0;
}

// ---- The automatic review ---------------------------------------------------------------------

export async function saveReview(env: Env, slug: string, version: string, review: Review): Promise<void> {
  await env.DB.prepare("UPDATE site_versions SET review = ? WHERE slug = ? AND version = ?").bind(JSON.stringify(review), slug, version).run();
}

export async function getReview(env: Env, slug: string, version: string): Promise<Review | null> {
  const r = await env.DB.prepare("SELECT review FROM site_versions WHERE slug = ? AND version = ?").bind(slug, version).first<{ review: string | null }>();
  return parseJson<Review>(r?.review);
}

// ---- Who looked at a demo ---------------------------------------------------------------------

export interface ViewStat {
  today: number;
  week: number;
  month: number;
  visitorsWeek: number;
  lastAt: string | null;
  days: { day: string; views: number; visitors: number }[];
}

const dayOf = (d = new Date()) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => dayOf(new Date(Date.now() - n * 86_400_000));

/** Count one view. `visitor` is a hash, never an address. Returns whether this is the day's first view. */
export async function countView(env: Env, slug: string, visitor: string): Promise<{ firstToday: boolean; views: number; visitors: number }> {
  const day = dayOf();
  const now = new Date().toISOString();
  const before = await env.DB.prepare("SELECT views FROM demo_views WHERE slug = ? AND day = ?").bind(slug, day).first<{ views: number }>();
  await env.DB.prepare("INSERT INTO demo_views (slug, day, views, last_at) VALUES (?1, ?2, 1, ?3) ON CONFLICT (slug, day) DO UPDATE SET views = views + 1, last_at = ?3").bind(slug, day, now).run();
  await env.DB.prepare("INSERT OR IGNORE INTO demo_visitors (slug, day, visitor) VALUES (?, ?, ?)").bind(slug, day, visitor).run();
  const v = await env.DB.prepare("SELECT count(*) c FROM demo_visitors WHERE slug = ? AND day = ?").bind(slug, day).first<{ c: number }>();
  return { firstToday: !before, views: (before?.views ?? 0) + 1, visitors: v?.c ?? 0 };
}

/** View counts for an account's demos (or the given slugs), with a per-day breakdown for the last `detailDays`. */
export async function viewStats(env: Env, scope: { tenantId: number } | { slugs: string[] }, detailDays = 14): Promise<Map<string, ViewStat>> {
  const since = daysAgo(30);
  const rows =
    "tenantId" in scope
      ? await env.DB.prepare("SELECT v.slug, v.day, v.views, v.last_at, (SELECT count(*) FROM demo_visitors x WHERE x.slug = v.slug AND x.day = v.day) visitors FROM demo_views v JOIN demos d ON d.slug = v.slug WHERE d.tenant_id = ? AND v.day >= ? ORDER BY v.day DESC")
          .bind(scope.tenantId, since)
          .all<{ slug: string; day: string; views: number; last_at: string; visitors: number }>()
      : scope.slugs.length
        ? await env.DB.prepare(`SELECT v.slug, v.day, v.views, v.last_at, (SELECT count(*) FROM demo_visitors x WHERE x.slug = v.slug AND x.day = v.day) visitors FROM demo_views v WHERE v.slug IN (${scope.slugs.map(() => "?").join(",")}) AND v.day >= ? ORDER BY v.day DESC`)
            .bind(...scope.slugs, since)
            .all<{ slug: string; day: string; views: number; last_at: string; visitors: number }>()
        : { results: [] };
  const out = new Map<string, ViewStat>();
  const today = dayOf();
  const week = daysAgo(6);
  const detail = daysAgo(detailDays - 1);
  for (const r of rows.results) {
    const st = out.get(r.slug) ?? { today: 0, week: 0, month: 0, visitorsWeek: 0, lastAt: null, days: [] };
    st.month += r.views;
    if (r.day >= week) {
      st.week += r.views;
      st.visitorsWeek += r.visitors;
    }
    if (r.day === today) st.today += r.views;
    if (!st.lastAt || r.last_at > st.lastAt) st.lastAt = r.last_at;
    if (r.day >= detail) st.days.push({ day: r.day, views: r.views, visitors: r.visitors });
    out.set(r.slug, st);
  }
  return out;
}

/** Visitor hashes older than 60 days aren't needed (the daily totals stay). */
export async function pruneVisitors(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM demo_visitors WHERE day < ?").bind(daysAgo(60)).run();
}

// ---- Outreach, change requests, queued builds -------------------------------------------------

export async function setOutreach(env: Env, slug: string, outreach: Outreach): Promise<void> {
  await env.DB.prepare("UPDATE demos SET outreach = ? WHERE slug = ?").bind(JSON.stringify(outreach), slug).run();
}

export async function setChangeNote(env: Env, slug: string, note: ChangeNote): Promise<void> {
  await env.DB.prepare("UPDATE demos SET change_note = ? WHERE slug = ?").bind(JSON.stringify(note), slug).run();
}

/** Put a demo in the account's build queue (the 3-at-a-time limit was reached). It starts when a slot frees up. */
export async function markQueued(env: Env, slug: string): Promise<void> {
  await env.DB.prepare("UPDATE demos SET build_status = 'queued', build_error = NULL, updated_at = ? WHERE slug = ?").bind(new Date().toISOString(), slug).run();
}

export async function nextQueued(env: Env, tenantId: number): Promise<string | null> {
  const r = await env.DB.prepare("SELECT slug FROM demos WHERE tenant_id = ? AND status = 'active' AND build_status = 'queued' ORDER BY created_at ASC LIMIT 1").bind(tenantId).first<{ slug: string }>();
  return r?.slug ?? null;
}

export async function queuedTenants(env: Env): Promise<number[]> {
  const { results } = await env.DB.prepare("SELECT DISTINCT tenant_id FROM demos WHERE status = 'active' AND build_status = 'queued'").all<{ tenant_id: number }>();
  return results.map((r) => r.tenant_id);
}

export async function markQueueFailed(env: Env, slug: string, error: string): Promise<void> {
  await env.DB.prepare("UPDATE demos SET build_status = 'failed', build_error = ?, updated_at = ? WHERE slug = ? AND build_status = 'queued'").bind(error.slice(0, 500), new Date().toISOString(), slug).run();
}

/** Replace a phrase on every page of the live version (exact text, HTML-escaped to match what the pages hold). Returns how many places changed. */
export async function replaceText(env: Env, slug: string, version: string, find: string, replacement: string): Promise<number> {
  const { results } = await env.DB.prepare("SELECT path, title, description, css, body FROM site_pages WHERE slug = ? AND version = ?").bind(slug, version).all<PageDraft & { path: string }>();
  const escHtml = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  let count = 0;
  for (const p of results) {
    const body = p.body.split(escHtml(find));
    const title = p.title.split(find);
    const description = p.description.split(find);
    const n = body.length - 1 + title.length - 1 + description.length - 1;
    if (!n) continue;
    count += n;
    await env.DB.prepare("UPDATE site_pages SET title = ?, description = ?, body = ? WHERE slug = ? AND version = ? AND path = ?")
      .bind(title.join(replacement), description.join(replacement), body.join(escHtml(replacement)), slug, version, p.path)
      .run();
  }
  return count;
}
