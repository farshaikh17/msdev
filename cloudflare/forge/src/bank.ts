/**
 * The photo bank: preview photos made ahead of time for each trade. Cloudflare's free picture allowance
 * resets at midnight UTC and whatever is left of it is lost, so in the last hour of the day the leftover
 * is spent filling the bank for the trades the account builds for. A build whose own photos are refused
 * (the day's allowance is used up) takes them from here instead, so a site never ships without photos.
 * Nothing here costs anything: the photos come out of the free allowance, and the descriptions are
 * written once per trade by the cheapest model.
 */
import type { Env } from "./env";
import { ask, PAGE_MODEL, parseParts } from "./designer";
import { generate, spendImages } from "./images";

/** Photos kept per trade. */
export const BANK_PER_TRADE = 12;
/** At most this many made per night (each about 78 of the 10,000 free neurons). */
const NIGHTLY_MAX = 60;

/** The bank's key for a trade: lower case, letters and spaces only. */
export const tradeKey = (trade: string) =>
  trade
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

/** How many photos the bank holds for a trade. */
export async function bankCount(env: Env, trade: string): Promise<number> {
  const key = tradeKey(trade);
  if (!key) return 0;
  const r = await env.DB.prepare("SELECT count(*) n FROM photo_bank WHERE trade = ?").bind(key).first<{ n: number }>();
  return r?.n ?? 0;
}

/** Take up to `n` photos for a trade, least used first (each is marked as used once more). */
export async function takeFromBank(env: Env, trade: string, n: number): Promise<{ description: string; bytes: Uint8Array }[]> {
  const key = tradeKey(trade);
  if (!key || n < 1) return [];
  const { results } = await env.DB.prepare("SELECT id, description, data FROM photo_bank WHERE trade = ? ORDER BY used, random() LIMIT ?")
    .bind(key, n)
    .all<{ id: number; description: string; data: number[] | ArrayBuffer }>();
  if (results.length) await env.DB.prepare(`UPDATE photo_bank SET used = used + 1 WHERE id IN (${results.map(() => "?").join(",")})`).bind(...results.map((r) => r.id)).run();
  return results.map((r) => ({ description: r.description, bytes: new Uint8Array(r.data) }));
}

/** The trades worth banking: those of the account's sites in the last 60 days, the emptiest first. */
async function tradesToFill(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT coalesce(nullif(json_extract(intake, '$.industry'), ''), json_extract(content, '$.industry')) AS trade, count(*) AS n
       FROM demos WHERE created_at >= datetime('now', '-60 days') GROUP BY 1 ORDER BY n DESC LIMIT 40`,
  ).all<{ trade: string | null }>();
  const keys = [...new Set(results.map((r) => tradeKey(r.trade ?? "")).filter((k) => k && k !== "local business"))];
  const counts = await Promise.all(keys.map(async (k) => [k, await bankCount(env, k)] as const));
  return counts.filter(([, c]) => c < BANK_PER_TRADE).sort((a, b) => a[1] - b[1]).map(([k]) => k);
}

/** Twelve photo descriptions for a trade, written once (by the cheapest model) and kept. */
export async function bankPrompts(env: Env, trade: string): Promise<string[]> {
  const key = `bank-prompts:${trade}`;
  const kept = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  if (kept) return JSON.parse(kept.value) as string[];
  const { text } = await ask(
    env,
    `Write ${BANK_PER_TRADE} descriptions of photographs for the website of a "${trade}" business. Each is one sentence of 15 to 30 words that an image generator can follow.
Rules: real, believable scenes of this kind of business: the work being done, close details of the work and its tools or products, the place itself, a happy customer. Vary the scenes, the framing (wide, medium, close) and the light. Never name a town, country or landmark, and nothing that ties it to one climate or region (no palm trees, snow or famous buildings). No text, signs, logos or brand names. People are shown at work or at ease, never posing for the camera.
@@@ PHOTOS
One description per line.`,
    1500,
    PAGE_MODEL,
    "low",
  );
  const lines = (parseParts(text).PHOTOS ?? text)
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
    .filter((l) => l.length > 20)
    .slice(0, BANK_PER_TRADE);
  if (lines.length >= 4) await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(key, JSON.stringify(lines)).run();
  return lines;
}

/**
 * In the last hour of the UTC day, spend what is left of the free picture allowance on the bank.
 * Stops the moment the allowance refuses a picture. Returns how many photos were banked.
 */
export async function fillPhotoBank(env: Env, now = new Date(), max = NIGHTLY_MAX): Promise<number> {
  if (!env.AI || !env.ANTHROPIC_API_KEY || now.getUTCHours() !== 23) return 0;
  let made = 0;
  for (const trade of await tradesToFill(env)) {
    if (made >= max) break;
    const prompts = await bankPrompts(env, trade).catch(() => [] as string[]);
    const { results } = await env.DB.prepare("SELECT description FROM photo_bank WHERE trade = ?").bind(trade).all<{ description: string }>();
    const have = new Set(results.map((r) => r.description));
    for (const p of prompts.filter((d) => !have.has(d))) {
      if (made >= max) break;
      if (!(await spendImages(env, 1))) return made;
      const bytes = (await generate(env, p)) ?? (await generate(env, p));
      if (!bytes) continue;
      await env.DB.prepare("INSERT INTO photo_bank (trade, description, data, created_at) VALUES (?, ?, ?, ?)").bind(trade, p, bytes, now.toISOString()).run();
      made++;
    }
  }
  if (made) console.log("photo bank", made, "photos banked");
  return made;
}
