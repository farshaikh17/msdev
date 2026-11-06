/** Hashing, signing and random tokens (Web Crypto, so it runs the same in Workers and in tests). */
const enc = new TextEncoder();

export const b64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function fromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) => c.charCodeAt(0));
}

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A random URL-safe string (24 bytes = 192 bits by default). */
export const randomToken = (bytes = 24): string => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

/** HMAC-SHA256 of `data` keyed by `secret`, base64url. */
export async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

/** Constant-time string compare. */
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Cloudflare Workers allow at most 100,000 PBKDF2 rounds. */
export const PBKDF2_ROUNDS = 100_000;

async function pbkdf2(password: string, salt: Uint8Array, rounds: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: rounds, hash: "SHA-256" }, key, 256));
}

/** "pbkdf2$<rounds>$<salt>$<hash>": the rounds travel with the hash so they can be raised later. */
export async function hashPassword(password: string, rounds = PBKDF2_ROUNDS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${rounds}$${b64url(salt)}$${b64url(await pbkdf2(password, salt, rounds))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, rounds, salt, hash] = stored.split("$");
  if (kind !== "pbkdf2" || !rounds || !salt || !hash) return false;
  return same(b64url(await pbkdf2(password, fromB64url(salt), Number(rounds))), hash);
}
