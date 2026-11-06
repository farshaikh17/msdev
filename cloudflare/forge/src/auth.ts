/**
 * Sign-in. People have an email and password (PBKDF2). A signed-in browser holds a cookie of
 * "<user id>.<password version>.<expiry>.<signature>", signed with a secret the app makes for
 * itself; changing a password (or removing a person) bumps the version, which ends their sessions.
 * The one-off "team password" of the first version is only used to set up the first admin.
 */
import { hashPassword, hmac, same, verifyPassword } from "./crypto";
import { getSetting } from "./db";
import type { Env } from "./env";
import { getTenant, getUser, getUserByEmail, touchLogin, type Tenant, type User } from "./tenants";

const COOKIE = "forge_session";
const DAYS = 30;
const SECRET_KEY = "appSecret";
const TEAM_HASH_KEY = "teamPasswordHash";
export const MIN_PASSWORD = 10;

export interface Session {
  user: User;
  tenant: Tenant;
}

/** The app's signing secret: made on first use and kept in the database. */
async function appSecret(env: Env): Promise<string> {
  let s = await getSetting(env, SECRET_KEY);
  if (!s) {
    const fresh = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
    // Two first requests at once: INSERT OR IGNORE keeps one of them, and both then read that one.
    await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(SECRET_KEY, fresh).run();
    s = await getSetting(env, SECRET_KEY);
  }
  return s;
}

export async function sessionCookie(env: Env, user: Pick<User, "id" | "pwVersion">): Promise<string> {
  const exp = Date.now() + DAYS * 86400_000;
  const body = `${user.id}.${user.pwVersion}.${exp}`;
  return `${COOKIE}=${body}.${await hmac(await appSecret(env), body)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
}

export const signOutCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Who is signed in on this request: their account, if the cookie is genuine, fresh and still allowed. */
export async function currentSession(req: Request, env: Env): Promise<Session | null> {
  const raw = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const parts = raw?.split(".");
  if (!parts || parts.length !== 4) return null;
  const [id, version, exp, sig] = parts;
  if (!(Number(exp) > Date.now())) return null;
  if (!same(sig, await hmac(await appSecret(env), `${id}.${version}.${exp}`))) return null;
  const user = await getUser(env, Number(id));
  if (!user || user.status !== "active" || user.pwVersion !== Number(version)) return null;
  const tenant = await getTenant(env, user.tenantId);
  if (!tenant || tenant.status !== "active") return null;
  return { user, tenant };
}

/** A made-up hash to compare against when the email is unknown, so timing doesn't reveal which emails exist. */
let decoy: Promise<string> | undefined;

/** Check an email and password. Returns the user, or null. */
export async function checkLogin(env: Env, email: string, password: string): Promise<User | null> {
  const u = await getUserByEmail(env, email);
  if (!u || u.status !== "active") {
    await verifyPassword(password, await (decoy ??= hashPassword("not-a-real-password")));
    return null;
  }
  if (!(await verifyPassword(password, u.pwHash))) return null;
  const tenant = await getTenant(env, u.tenantId);
  if (!tenant || tenant.status !== "active") return null;
  await touchLogin(env, u.id);
  return u;
}

/** Re-check a signed-in person's own password (before they change it). */
export async function checkOwnPassword(env: Env, userId: number, password: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT pw_hash FROM users WHERE id = ?").bind(userId).first<{ pw_hash: string }>();
  return !!row && (await verifyPassword(password, row.pw_hash));
}

/**
 * The first version had one shared team password (the FORGE_PASSWORD secret, later changeable in
 * the app). Setting up the first admin account needs it, so a stranger can't claim a fresh app.
 */
export async function checkTeamPassword(env: Env, given: string): Promise<boolean> {
  const stored = await getSetting(env, TEAM_HASH_KEY);
  if (stored) {
    const [salt, want] = stored.split(".");
    return same(await hmac(salt, given), want ?? "");
  }
  if (!env.FORGE_PASSWORD) return false;
  const [a, b] = await Promise.all([hmac("pw", given), hmac("pw", env.FORGE_PASSWORD)]);
  return same(a, b);
}

/** Plain checks for a new password. Returns the problem, or "" when it's fine. */
export function passwordProblem(password: string, confirm?: string): string {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the password.`;
  if (confirm !== undefined && password !== confirm) return "The two passwords don't match.";
  return "";
}

/** Reject form posts that come from another website (cookies are SameSite=Lax as well). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
