/**
 * Customer accounts ("tenants"), their people, one-time links, API keys, build credits and the
 * real cost of what they build. Every query here is scoped by tenant id; the callers decide which.
 */
import { randomToken, sha256Hex } from "./crypto";
import type { Env } from "./env";

export type Role = "admin" | "owner" | "member";
export type CreditMode = "mianro" | "custom" | "none";

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: "active" | "suspended";
  /** Builds don't use credits (Mianro itself). */
  unlimited: boolean;
  credits: number;
  creditMode: CreditMode;
  creditName: string;
  creditUrl: string;
  ghlPageUrl: string;
  chatWidget: string;
  webhookUrl: string;
  webhookSecret: string;
  webhookStatus: string;
  createdAt: string;
}

export interface User {
  id: number;
  tenantId: number;
  email: string;
  role: Role;
  status: "active" | "removed";
  pwVersion: number;
  createdAt: string;
  lastLogin: string | null;
}

interface TenantRow {
  id: number;
  name: string;
  slug: string;
  status: string;
  unlimited: number;
  credits: number;
  credit_mode: string;
  credit_name: string;
  credit_url: string;
  ghl_page_url: string;
  chat_widget: string;
  webhook_url: string;
  webhook_secret: string;
  webhook_status: string;
  created_at: string;
}

interface UserRow {
  id: number;
  tenant_id: number;
  email: string;
  pw_hash: string;
  pw_version: number;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
}

const now = () => new Date().toISOString();

export const toTenant = (r: TenantRow): Tenant => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  status: r.status === "suspended" ? "suspended" : "active",
  unlimited: !!r.unlimited,
  credits: r.credits,
  creditMode: r.credit_mode === "custom" || r.credit_mode === "none" ? r.credit_mode : "mianro",
  creditName: r.credit_name,
  creditUrl: r.credit_url,
  ghlPageUrl: r.ghl_page_url,
  chatWidget: r.chat_widget,
  webhookUrl: r.webhook_url,
  webhookSecret: r.webhook_secret,
  webhookStatus: r.webhook_status,
  createdAt: r.created_at,
});

export const toUser = (r: UserRow): User => ({
  id: r.id,
  tenantId: r.tenant_id,
  email: r.email,
  role: r.role === "admin" || r.role === "owner" ? r.role : "member",
  status: r.status === "removed" ? "removed" : "active",
  pwVersion: r.pw_version,
  createdAt: r.created_at,
  lastLogin: r.last_login,
});

// ---- Tenants -----------------------------------------------------------------------------------

export async function getTenant(env: Env, id: number): Promise<Tenant | null> {
  const r = await env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first<TenantRow>();
  return r ? toTenant(r) : null;
}

export interface TenantSummary extends Tenant {
  demos: number;
  users: number;
  builds: number;
  costTotal: number;
  costMonth: number;
}

/** Every account with its counts and what its builds have cost Mianro (for the admin console). */
export async function listTenants(env: Env): Promise<TenantSummary[]> {
  const monthStart = `${now().slice(0, 7)}-01T00:00:00.000Z`;
  const { results } = await env.DB.prepare(
    `SELECT t.*,
       (SELECT count(*) FROM demos d WHERE d.tenant_id = t.id AND d.status = 'active') AS demos,
       (SELECT count(*) FROM users u WHERE u.tenant_id = t.id AND u.status = 'active') AS users,
       (SELECT count(*) FROM build_costs c WHERE c.tenant_id = t.id AND c.outcome = 'ready') AS builds,
       (SELECT coalesce(sum(usd), 0) FROM build_costs c WHERE c.tenant_id = t.id) AS cost_total,
       (SELECT coalesce(sum(usd), 0) FROM build_costs c WHERE c.tenant_id = t.id AND c.created_at >= ?) AS cost_month
     FROM tenants t ORDER BY t.id`,
  )
    .bind(monthStart)
    .all<TenantRow & { demos: number; users: number; builds: number; cost_total: number; cost_month: number }>();
  return results.map((r) => ({ ...toTenant(r), demos: r.demos, users: r.users, builds: r.builds, costTotal: r.cost_total, costMonth: r.cost_month }));
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "") || "account";

export async function createTenant(env: Env, name: string, credits = 0): Promise<Tenant> {
  let slug = slugify(name);
  for (let n = 2; await env.DB.prepare("SELECT 1 x FROM tenants WHERE slug = ?").bind(slug).first(); n++) slug = `${slugify(name)}-${n}`;
  const r = await env.DB.prepare("INSERT INTO tenants (name, slug, credits, created_at) VALUES (?, ?, ?, ?)").bind(name.trim().slice(0, 80), slug, Math.max(0, credits), now()).run();
  const id = r.meta.last_row_id;
  if (credits > 0) await env.DB.prepare("INSERT INTO credit_ledger (tenant_id, delta, reason, created_at) VALUES (?, ?, 'Starting credits', ?)").bind(id, credits, now()).run();
  return (await getTenant(env, id))!;
}

const TENANT_COLUMNS = {
  name: "name",
  status: "status",
  unlimited: "unlimited",
  creditMode: "credit_mode",
  creditName: "credit_name",
  creditUrl: "credit_url",
  ghlPageUrl: "ghl_page_url",
  chatWidget: "chat_widget",
  webhookUrl: "webhook_url",
  webhookSecret: "webhook_secret",
  webhookStatus: "webhook_status",
} as const;

export type TenantPatch = Partial<Record<keyof typeof TENANT_COLUMNS, string | number | boolean>>;

/** Change the named settings (only columns in the allow-list can be touched). */
export async function updateTenant(env: Env, id: number, patch: TenantPatch): Promise<void> {
  const keys = (Object.keys(patch) as (keyof typeof TENANT_COLUMNS)[]).filter((k) => k in TENANT_COLUMNS);
  if (!keys.length) return;
  const sql = `UPDATE tenants SET ${keys.map((k) => `${TENANT_COLUMNS[k]} = ?`).join(", ")} WHERE id = ?`;
  await env.DB.prepare(sql)
    .bind(...keys.map((k) => (typeof patch[k] === "boolean" ? Number(patch[k]) : patch[k])), id)
    .run();
}

/** Remove an account and everything it owns. Mianro's own account (id 1) can't be removed. */
export async function deleteTenant(env: Env, id: number): Promise<void> {
  if (id === 1) throw new Error("The Mianro account can't be deleted.");
  const own = "slug IN (SELECT slug FROM demos WHERE tenant_id = ?1)";
  for (const sql of [
    `DELETE FROM site_pages WHERE ${own}`,
    `DELETE FROM site_versions WHERE ${own}`,
    `DELETE FROM site_images WHERE ${own}`,
    `DELETE FROM leads WHERE ${own}`,
    "DELETE FROM demos WHERE tenant_id = ?1",
    "DELETE FROM video_library WHERE tenant_id = ?1",
    "DELETE FROM build_costs WHERE tenant_id = ?1",
    "DELETE FROM credit_ledger WHERE tenant_id = ?1",
    "DELETE FROM api_keys WHERE tenant_id = ?1",
    "DELETE FROM tokens WHERE tenant_id = ?1",
    "DELETE FROM users WHERE tenant_id = ?1",
    "DELETE FROM tenants WHERE id = ?1",
  ])
    await env.DB.prepare(sql).bind(id).run();
}

// ---- Users -------------------------------------------------------------------------------------

/** How many active administrators (Mianro staff) there are. Zero means first-run set-up is open. */
export async function adminCount(env: Env): Promise<number> {
  return (await env.DB.prepare("SELECT count(*) c FROM users WHERE role = 'admin' AND status = 'active'").first<{ c: number }>())?.c ?? 0;
}

/** Make the first administrator on tenant 1, only if there is none (two requests can't both win). */
export async function createFirstAdmin(env: Env, email: string, pwHash: string): Promise<User | null> {
  const r = await env.DB.prepare("INSERT INTO users (tenant_id, email, pw_hash, role, created_at) SELECT 1, ?, ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' AND status = 'active')")
    .bind(email.trim().toLowerCase(), pwHash, now())
    .run();
  return r.meta.changes === 1 ? await getUser(env, r.meta.last_row_id) : null;
}

export async function getUserByEmail(env: Env, email: string): Promise<(User & { pwHash: string }) | null> {
  const r = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email.trim().toLowerCase()).first<UserRow>();
  return r ? { ...toUser(r), pwHash: r.pw_hash } : null;
}

export async function getUser(env: Env, id: number): Promise<User | null> {
  const r = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return r ? toUser(r) : null;
}

export async function listUsers(env: Env, tenantId: number): Promise<User[]> {
  const { results } = await env.DB.prepare("SELECT * FROM users WHERE tenant_id = ? AND status = 'active' ORDER BY id").bind(tenantId).all<UserRow>();
  return results.map(toUser);
}

export async function createUser(env: Env, u: { tenantId: number; email: string; pwHash: string; role: Role }): Promise<User> {
  const r = await env.DB.prepare("INSERT INTO users (tenant_id, email, pw_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(u.tenantId, u.email.trim().toLowerCase(), u.pwHash, u.role, now())
    .run();
  return (await getUser(env, r.meta.last_row_id))!;
}

/** Set a new password and sign the user out everywhere (their old sessions stop matching). */
export async function setPassword(env: Env, userId: number, pwHash: string): Promise<void> {
  await env.DB.prepare("UPDATE users SET pw_hash = ?, pw_version = pw_version + 1 WHERE id = ?").bind(pwHash, userId).run();
}

export async function touchLogin(env: Env, userId: number): Promise<void> {
  await env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(now(), userId).run();
}

/** Remove a person from their team (their email can be invited again later). */
export async function removeUser(env: Env, tenantId: number, userId: number): Promise<void> {
  await env.DB.prepare("UPDATE users SET status = 'removed', pw_version = pw_version + 1, email = email || '#removed' || id WHERE id = ? AND tenant_id = ?").bind(userId, tenantId).run();
}

// ---- One-time links (invites and password resets) ----------------------------------------------

export interface TokenInfo {
  kind: "invite" | "reset";
  tenantId: number;
  userId: number | null;
  email: string;
  role: Role;
}

const DAY_MS = 86_400_000;

/** Make a one-time link secret (shown once, stored only as a hash). Valid for 7 days. */
export async function createToken(env: Env, t: { kind: "invite" | "reset"; tenantId: number; userId?: number; email?: string; role?: Role; createdBy?: number }): Promise<string> {
  const raw = randomToken(24);
  await env.DB.prepare("INSERT INTO tokens (token_hash, kind, tenant_id, user_id, email, role, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(await sha256Hex(raw), t.kind, t.tenantId, t.userId ?? null, (t.email ?? "").trim().toLowerCase(), t.role ?? "member", Date.now() + 7 * DAY_MS, t.createdBy ?? null, now())
    .run();
  return raw;
}

/** What a link is for, if it's still good (unused, not expired, and its account is active). */
export async function peekToken(env: Env, raw: string): Promise<TokenInfo | null> {
  const r = await env.DB.prepare(
    `SELECT k.kind, k.tenant_id, k.user_id, k.email, k.role FROM tokens k JOIN tenants t ON t.id = k.tenant_id
     WHERE k.token_hash = ? AND k.used_at IS NULL AND k.expires_at > ? AND t.status = 'active'`,
  )
    .bind(await sha256Hex(raw), Date.now())
    .first<{ kind: string; tenant_id: number; user_id: number | null; email: string; role: string }>();
  if (!r) return null;
  return { kind: r.kind === "reset" ? "reset" : "invite", tenantId: r.tenant_id, userId: r.user_id, email: r.email, role: r.role === "owner" || r.role === "admin" ? r.role : "member" };
}

/** Use a link up. True only for the one caller that gets it (two clicks can't both win). */
export async function consumeToken(env: Env, raw: string): Promise<boolean> {
  const r = await env.DB.prepare("UPDATE tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?").bind(Date.now(), await sha256Hex(raw), Date.now()).run();
  return r.meta.changes === 1;
}

export interface PendingInvite {
  email: string;
  role: Role;
  kind: "invite" | "reset";
  expiresAt: number;
}

export async function listPending(env: Env, tenantId: number): Promise<PendingInvite[]> {
  const { results } = await env.DB.prepare("SELECT email, role, kind, expires_at FROM tokens WHERE tenant_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC").bind(tenantId, Date.now()).all<{
    email: string;
    role: string;
    kind: string;
    expires_at: number;
  }>();
  return results.map((r) => ({ email: r.email, role: r.role === "owner" ? "owner" : "member", kind: r.kind === "reset" ? "reset" : "invite", expiresAt: r.expires_at }));
}

// ---- API keys ----------------------------------------------------------------------------------

export interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Make a key. The full key is returned once; only its hash is stored. */
export async function createApiKey(env: Env, tenantId: number, name: string, createdBy: number): Promise<string> {
  const key = `fk_live_${randomToken(24)}`;
  await env.DB.prepare("INSERT INTO api_keys (tenant_id, name, prefix, key_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(tenantId, name.trim().slice(0, 60) || "API key", key.slice(0, 16), await sha256Hex(key), createdBy, now())
    .run();
  return key;
}

export async function listApiKeys(env: Env, tenantId: number): Promise<ApiKey[]> {
  const { results } = await env.DB.prepare("SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE tenant_id = ? ORDER BY id DESC").bind(tenantId).all<{
    id: number;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>();
  return results.map((r) => ({ id: r.id, name: r.name, prefix: r.prefix, createdAt: r.created_at, lastUsedAt: r.last_used_at, revokedAt: r.revoked_at }));
}

export async function revokeApiKey(env: Env, tenantId: number, id: number): Promise<void> {
  await env.DB.prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND tenant_id = ? AND revoked_at IS NULL").bind(now(), id, tenantId).run();
}

/** The account a key belongs to, if the key is valid, not revoked and the account is active. */
export async function findApiKey(env: Env, raw: string): Promise<{ tenant: Tenant; keyId: number } | null> {
  if (!/^fk_live_[A-Za-z0-9_-]{20,}$/.test(raw)) return null;
  const r = await env.DB.prepare("SELECT k.id AS key_id, t.* FROM api_keys k JOIN tenants t ON t.id = k.tenant_id WHERE k.key_hash = ? AND k.revoked_at IS NULL AND t.status = 'active'")
    .bind(await sha256Hex(raw))
    .first<TenantRow & { key_id: number }>();
  if (!r) return null;
  await env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(now(), r.key_id).run();
  return { tenant: toTenant(r), keyId: r.key_id };
}

// ---- Credits -----------------------------------------------------------------------------------

export interface LedgerEntry {
  delta: number;
  reason: string;
  demoSlug: string | null;
  createdAt: string;
}

async function ledger(env: Env, tenantId: number, delta: number, reason: string, slug: string | null, userId: number | null): Promise<void> {
  await env.DB.prepare("INSERT INTO credit_ledger (tenant_id, delta, reason, demo_slug, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(tenantId, delta, reason, slug, userId, now()).run();
}

/**
 * Take one credit for a build that is starting and remember which version it was for (so a build
 * that fails can be refunded exactly once). Accounts that build for free just pass through.
 * False means there was no credit to take.
 */
export async function chargeBuild(env: Env, tenant: Tenant, slug: string, version: string, userId: number | null): Promise<boolean> {
  if (tenant.unlimited) return true;
  // Picking a stalled build up again (same version) was already paid for.
  const paid = await env.DB.prepare("SELECT 1 x FROM demos WHERE slug = ? AND charged_version = ?").bind(slug, version).first();
  if (paid) return true;
  const r = await env.DB.prepare("UPDATE tenants SET credits = credits - 1 WHERE id = ? AND credits >= 1").bind(tenant.id).run();
  if (r.meta.changes !== 1) return false;
  await env.DB.prepare("UPDATE demos SET charged_version = ? WHERE slug = ?").bind(version, slug).run();
  await ledger(env, tenant.id, -1, "Site build", slug, userId);
  return true;
}

/** Give the credit back for a build that didn't finish. Safe to call more than once. */
export async function refundBuild(env: Env, slug: string, version: string): Promise<void> {
  const r = await env.DB.prepare("UPDATE demos SET charged_version = NULL WHERE slug = ? AND charged_version = ?").bind(slug, version).run();
  if (r.meta.changes !== 1) return;
  const d = await env.DB.prepare("SELECT tenant_id FROM demos WHERE slug = ?").bind(slug).first<{ tenant_id: number }>();
  if (!d) return;
  await env.DB.prepare("UPDATE tenants SET credits = credits + 1 WHERE id = ? AND unlimited = 0").bind(d.tenant_id).run();
  await ledger(env, d.tenant_id, 1, "Refund: the build didn't finish", slug, null);
}

/** Add (or take away, with a negative number) credits; the balance never goes below zero. */
export async function grantCredits(env: Env, tenantId: number, delta: number, reason: string, userId: number): Promise<void> {
  const before = (await getTenant(env, tenantId))?.credits ?? 0;
  const applied = Math.max(delta, -before);
  if (!applied) return;
  await env.DB.prepare("UPDATE tenants SET credits = credits + ? WHERE id = ?").bind(applied, tenantId).run();
  await ledger(env, tenantId, applied, reason.trim().slice(0, 120) || (applied > 0 ? "Credits added" : "Credits removed"), null, userId);
}

export async function listLedger(env: Env, tenantId: number, limit = 30): Promise<LedgerEntry[]> {
  const { results } = await env.DB.prepare("SELECT delta, reason, demo_slug, created_at FROM credit_ledger WHERE tenant_id = ? ORDER BY id DESC LIMIT ?").bind(tenantId, limit).all<{
    delta: number;
    reason: string;
    demo_slug: string | null;
    created_at: string;
  }>();
  return results.map((r) => ({ delta: r.delta, reason: r.reason, demoSlug: r.demo_slug, createdAt: r.created_at }));
}

// ---- Cost and usage ----------------------------------------------------------------------------

/** Record what a finished (or failed) build cost, once per version and outcome. */
export async function recordBuildCost(env: Env, tenantId: number, slug: string, version: string, usd: number, calls: number, outcome: "ready" | "failed"): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO build_costs (tenant_id, slug, version, usd, calls, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(tenantId, slug, version, usd, calls, outcome, now()).run();
}

export interface Usage {
  demos: number;
  buildsMonth: number;
  buildsTotal: number;
  leads: number;
}

export async function tenantUsage(env: Env, tenantId: number): Promise<Usage> {
  const monthStart = `${now().slice(0, 7)}-01T00:00:00.000Z`;
  const r = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM demos WHERE tenant_id = ?1 AND status = 'active') AS demos,
            (SELECT count(*) FROM build_costs WHERE tenant_id = ?1 AND outcome = 'ready' AND created_at >= ?2) AS builds_month,
            (SELECT count(*) FROM build_costs WHERE tenant_id = ?1 AND outcome = 'ready') AS builds_total,
            (SELECT count(*) FROM leads WHERE slug IN (SELECT slug FROM demos WHERE tenant_id = ?1)) AS leads`,
  )
    .bind(tenantId, monthStart)
    .first<{ demos: number; builds_month: number; builds_total: number; leads: number }>();
  return { demos: r?.demos ?? 0, buildsMonth: r?.builds_month ?? 0, buildsTotal: r?.builds_total ?? 0, leads: r?.leads ?? 0 };
}
