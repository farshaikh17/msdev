/** Demos and settings in D1. Demos are archived, not deleted. */
import { Intake, SiteContent, type Demo } from "../../../src/forge/schema";
import type { Kit, PageDraft } from "./designer";
import type { Env } from "./env";

interface Row {
  html: string | null;
  live_version: string | null;
  build_version: string | null;
  build_stage: string | null;
  build_usage: string | null;
  build_status: string;
  build_error: string | null;
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
  html: string | null;
  liveVersion: string | null;
  buildVersion: string | null;
  buildStage: "kit" | "pages" | null;
  buildStatus: "building" | "ready" | "failed";
  buildError: string;
  /** What the live design cost to build (US$) and how many Claude calls it took; null before the first build. */
  buildCost: { usd: number; calls: number } | null;
};

export interface Listed {
  buildStatus: string;
  slug: string;
  businessName: string;
  industry: string;
  city: string;
  createdAt: string;
}

/** A build that has made no progress this long was stopped by the platform (a queue job runs at most 15 minutes). */
const STALE_MS = 16 * 60_000;

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
    html: r.html ?? null,
    liveVersion: r.live_version ?? null,
    buildVersion: r.build_version ?? null,
    buildStage: r.build_stage === "kit" || r.build_stage === "pages" ? r.build_stage : null,
    buildCost: costFrom(r.build_usage),
    buildStatus: stale ? "failed" : r.build_status === "building" || r.build_status === "failed" ? r.build_status : "ready",
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
  const r = crypto.getRandomValues(new Uint8Array(2));
  return `${base || "demo"}-${[...r].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export const SLUG = /^[a-z0-9-]{3,64}$/;

export async function getDemo(env: Env, slug: string, activeOnly = true): Promise<Stored | null> {
  if (!SLUG.test(slug)) return null;
  const r = await env.DB.prepare(`SELECT * FROM demos WHERE slug = ?${activeOnly ? " AND status = 'active'" : ""}`)
    .bind(slug)
    .first<Row>();
  return r ? toDemo(r) : null;
}

export async function listDemos(env: Env): Promise<Listed[]> {
  const { results } = await env.DB.prepare(
    "SELECT slug, business_name, intake, content, created_at, updated_at, build_status FROM demos WHERE status = 'active' ORDER BY created_at DESC LIMIT 200",
  ).all<Row>();
  return results.map((r) => {
    const intake = JSON.parse(r.intake) as { city?: string };
    const content = JSON.parse(r.content) as { industry?: string };
    const stale = r.build_status === "building" && Date.now() - Date.parse(r.updated_at ?? r.created_at) > STALE_MS;
    return { buildStatus: stale ? "failed" : r.build_status, slug: r.slug, businessName: r.business_name, industry: content.industry ?? "", city: intake.city ?? "", createdAt: r.created_at };
  });
}

export async function saveDemo(env: Env, d: Demo): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO demos (slug, business_name, intake, content, written_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
     ON CONFLICT (slug) DO UPDATE SET business_name = excluded.business_name, intake = excluded.intake,
       content = excluded.content, written_by = excluded.written_by, updated_at = excluded.updated_at`,
  )
    .bind(d.slug, d.intake.businessName, JSON.stringify(d.intake), JSON.stringify(d.content), d.writtenBy, d.createdAt, d.updatedAt)
    .run();
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
    "UPDATE demos SET live_version = ?, build_status = 'ready', build_stage = NULL, build_error = NULL, build_usage = ?, updated_at = ? WHERE slug = ? AND build_version = ?",
  )
    .bind(version, JSON.stringify(total), new Date().toISOString(), slug, version)
    .run();
  await env.DB.prepare("DELETE FROM site_pages WHERE slug = ? AND version <> ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_versions WHERE slug = ? AND version <> ?").bind(slug, version).run();
  await env.DB.prepare("DELETE FROM site_images WHERE slug = ? AND version <> ?").bind(slug, version).run();
}

/** Stop a build. Only the named version: a newer build that has started since is left alone. */
export async function saveFailed(env: Env, slug: string, version: string, error: string): Promise<void> {
  await env.DB.prepare("UPDATE demos SET build_status = 'failed', build_error = ?, updated_at = ? WHERE slug = ? AND build_version = ? AND build_status = 'building'")
    .bind(error.slice(0, 500), new Date().toISOString(), slug, version)
    .run();
}

export async function archiveDemo(env: Env, slug: string): Promise<void> {
  await env.DB.prepare("UPDATE demos SET status = 'archived', updated_at = ? WHERE slug = ?").bind(new Date().toISOString(), slug).run();
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
