/**
 * Team sign-in: one shared password. It starts as the FORGE_PASSWORD secret; once someone
 * changes it in the app, a salted hash of the new one (in the settings table) is used instead.
 * A signed-in browser holds a cookie of "<expiry>.<HMAC(expiry)>", keyed by the password,
 * so changing the password signs everyone out.
 */
import { getSetting, setSetting } from "./db";
import type { Env } from "./env";

const HASH_KEY = "teamPasswordHash";
export const MIN_PASSWORD = 10;

const COOKIE = "forge_session";
const DAYS = 30;
const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time string compare. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** The password set in the app ("<salt>.<hash>"), if any. */
const stored = (env: Env) => getSetting(env, HASH_KEY);

/** What session cookies are keyed by: the stored hash, else the FORGE_PASSWORD secret. */
async function cookieKey(env: Env): Promise<string> {
  return (await stored(env)) || env.FORGE_PASSWORD || "";
}

/** True when a password exists (in the app or as the Cloudflare secret). */
export async function passwordSet(env: Env): Promise<boolean> {
  return !!(await cookieKey(env));
}

export async function signedIn(req: Request, env: Env): Promise<boolean> {
  const key = await cookieKey(env);
  if (!key) return false;
  const raw = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(sig, await hmac(key, exp));
}

export async function checkPassword(env: Env, given: string): Promise<boolean> {
  const hash = await stored(env);
  if (hash) {
    const [salt, want] = hash.split(".");
    return same(await hmac(salt, given), want ?? "");
  }
  if (!env.FORGE_PASSWORD) return false;
  const [a, b] = await Promise.all([hmac("pw", given), hmac("pw", env.FORGE_PASSWORD)]);
  return same(a, b);
}

/** Replace the team password (everyone else is signed out). */
export async function changePassword(env: Env, next: string): Promise<void> {
  const salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replace(/[^a-zA-Z0-9]/g, "");
  await setSetting(env, HASH_KEY, `${salt}.${await hmac(salt, next)}`);
}

export async function sessionCookie(env: Env): Promise<string> {
  const exp = String(Date.now() + DAYS * 86400_000);
  const value = `${exp}.${await hmac(await cookieKey(env), exp)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
}

export const signOutCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
