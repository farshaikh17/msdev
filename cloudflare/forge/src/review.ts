/**
 * The automatic review that runs after a site goes live: open it in a real browser (Cloudflare
 * Browser Run), screenshot it on desktop and phone, run deterministic checks (sideways scrolling,
 * one h1, alt text, broken links and images, console errors), have Claude critique the screenshots,
 * and, when the score is low or a check fails, write the home page again with the notes. The same
 * session captures the business's current website for the before/after pitch page, and a social
 * preview image for the site's links.
 *
 * Budget: Browser Run time is counted per calendar month in the settings table and capped at
 * BROWSER_BUDGET_SECONDS (half of what the Workers Paid plan includes), so this can never cost
 * extra. Past the cap, sites still go live; they just aren't reviewed.
 */
import { conceptById } from "./concepts";
import Anthropic from "@anthropic-ai/sdk";
import { getDemo, getKit, getPage, getReview, getSetting, saveImage, savePage, saveReview, setSetting } from "./db";
import { costOf, designSitePage, pagesOf, type Kit } from "./designer";
import type { Env } from "./env";
import { recordBuildCost } from "./tenants";

/** Half of the 10 browser hours a month the Workers Paid plan includes. */
export const BROWSER_BUDGET_SECONDS = 5 * 3600;
/** The critique reads two screenshots; Sonnet sees them well and costs a few cents at most. */
export const CRITIQUE_MODEL = "claude-sonnet-5-5";
/** Below this, or with any failed check, the home page is written again with the notes. */
const FIX_BELOW = 7;
/** A Studio site has to be exceptional, so it is rewritten below this. */
const FIX_BELOW_STUDIO = 8;
/** A first screen scoring this or better (with nothing measured wrong) is built on as it is. */
export const HERO_GOOD = 8;

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface Issue {
  what: string;
  fix: string;
  severity: "high" | "medium" | "low";
}

export interface OldSite {
  url: string;
  loaded: boolean;
  score: number;
  checks: Check[];
}

export interface Review {
  at: string;
  /** Why the review didn't run (no browser, budget spent, an error). */
  skipped?: string;
  score?: number;
  verdict?: string;
  strengths?: string[];
  issues?: Issue[];
  checks?: Check[];
  /** The score before the home page was written again (the score shown is of the page as it is now). */
  before?: number;
  /** The home page was written again with the notes. */
  fixed?: boolean;
  fixError?: string;
  consoleErrors?: string[];
  /** Inner pages that were wider than a phone screen, and whether each was repaired. */
  wide?: { path: string; px: number; fixed?: boolean }[];
  old?: OldSite | null;
  seconds?: number;
  costUsd?: number;
  /** How many times a failed run was attempted (the hourly catch-up stops after 3). */
  tries?: number;
  /** Which screenshots were saved (image names under the version). */
  shots?: string[];
}

/** What the page tells us about itself, from inside the browser. */
interface PageFacts {
  overflow: boolean;
  h1: number;
  noAlt: number;
  brokenImgs: number;
  /** Tall sections with nothing in them (no words, pictures, video or drawing). */
  emptyBlocks?: number;
  /** The tells of a machine-made page: small spaced-capital labels above headings, a main heading with one word in another colour or in italics, its length in words, and strings of facts joined by dots. */
  eyebrows?: number;
  accentWord?: boolean;
  h1Words?: number;
  dotStrings?: number;
  links: string[];
  hasViewport: boolean;
  tel: boolean;
  forms: number;
  textPx: number;
  words: number;
  https: boolean;
}

/** Evaluated in the browser: an expression that CALLS the function (a bare function string would just return the function). */
export const FACTS = `(() => ({
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  h1: document.querySelectorAll("h1").length,
  noAlt: Array.from(document.images).filter((i) => !i.hasAttribute("alt")).length,
  brokenImgs: Array.from(document.images).filter((i) => i.src && i.complete && !i.naturalWidth).length,
  emptyBlocks: Array.from(document.querySelectorAll("main section, main > div")).filter((e) => e.offsetHeight >= 480 && !(e.innerText || "").trim() && !e.querySelector("img,picture,video,canvas,svg,iframe")).length,
  eyebrows: Array.from(document.querySelectorAll("main h1, main h2, main h3")).filter((h) => { const p = h.previousElementSibling; if (!p || !(p.innerText || "").trim() || (p.innerText || "").length > 70 || /^H[1-6]$/.test(p.tagName)) return false; const c = getComputedStyle(p); return c.textTransform === "uppercase" && parseFloat(c.letterSpacing) >= 1 && parseFloat(c.fontSize) <= 16; }).length,
  accentWord: (() => { const h = document.querySelector("main h1"); if (!h) return false; const b = getComputedStyle(h); return Array.from(h.querySelectorAll("em, i, span, strong, mark, u")).some((e) => { if (!(e.innerText || "").trim() || e.closest(".m-line-mask, .m-line, .m-char, .m-word") === e || /^m-/.test(e.className || "")) return false; const c = getComputedStyle(e); return c.color !== b.color || c.fontStyle !== b.fontStyle; }); })(),
  h1Words: ((document.querySelector("main h1") || {}).innerText || "").split(/\\s+/).filter(Boolean).length,
  dotStrings: Array.from(document.querySelectorAll("main p, main span, main div, main li")).filter((e) => e.children.length === 0 && (e.innerText || "").length < 90 && /\\S\\s+[·•|]\\s+\\S.*\\s[·•|]\\s/.test(e.innerText || "")).length,
  links: Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href") || "").slice(0, 400),
  hasViewport: !!document.querySelector('meta[name="viewport"]'),
  tel: !!document.querySelector('a[href^="tel:"]'),
  forms: document.querySelectorAll("form").length,
  textPx: parseFloat(getComputedStyle(document.body).fontSize) || 0,
  words: (document.body.innerText || "").split(/\\s+/).filter(Boolean).length,
  https: location.protocol === "https:",
}))()`;

/** Open the home page again on desktop and phone and have it critiqued afresh (after a rewrite). */
async function rescore(env: Env, deps: ReviewDeps, url: string, settle: number, sleep: (ms: number) => Promise<void>, facts: string, studio: boolean) {
  if ((await browserUsed(env)).seconds >= BROWSER_BUDGET_SECONDS) return null;
  const started = Date.now();
  const browser = await deps.launch(env);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await visit(page, url, settle, sleep);
    const desktop = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await visit(page, url, settle, sleep);
    const phone = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    await page.close();
    const crit = await deps.critique(env, { desktop, phone }, `${facts}\n\nThis page has just been revised after an earlier review; score it as it is now.`, studio);
    return { crit, desktop, phone };
  } finally {
    await browser.close().catch(() => undefined);
    await addBrowserSeconds(env, (Date.now() - started) / 1000).catch(() => undefined);
  }
}

/** What a look at a Studio build's first screen found (null when it couldn't be looked at). */
export interface HeroLook {
  score: number;
  /** What to change, most important first (empty: build on it as it is). */
  notes: string[];
  costUsd: number;
}

/**
 * Open a build's first-screen draft on desktop and phone, measure it, and have it critiqued against
 * its art direction, before the rest of the home page is written. Returns null (carry on without)
 * when there is no browser, no budget left, or anything goes wrong.
 */
export async function reviewHero(env: Env, slug: string, version: string, kit: Kit, deps: ReviewDeps = realDeps): Promise<HeroLook | null> {
  const base = env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : "";
  if (!env.BROWSER || !env.ANTHROPIC_API_KEY || !base) return null;
  if ((await browserUsed(env)).seconds >= BROWSER_BUDGET_SECONDS) return null;
  const started = Date.now();
  const sleep = deps.sleep ?? realSleep;
  let browser: Browser | null = null;
  try {
    browser = await deps.launch(env);
    const page = await browser.newPage();
    const url = `${base}/${slug}/_draft/${version}`;
    await page.setViewport({ width: 1440, height: 900 });
    await visit(page, url, 5500, sleep);
    const desktop = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    const d = factsOf(await page.evaluate<PageFacts>(FACTS));
    const tall = Number(await page.evaluate<number>("document.documentElement.scrollHeight")) || 0;
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await visit(page, url, 5500, sleep);
    const phone = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    const p = factsOf(await page.evaluate<PageFacts>(FACTS));
    await page.close();
    await browser.close();
    browser = null;
    await addBrowserSeconds(env, (Date.now() - started) / 1000);
    const measured = [
      d.overflow && "The first screen scrolls sideways on desktop.",
      p.overflow && "The first screen scrolls sideways on a phone.",
      d.h1 !== 1 && `It has ${d.h1} main headings (h1); it needs exactly one.`,
      (d.eyebrows ?? 0) > 0 && "There is a small spaced-capitals label above the headline. Remove it.",
      d.accentWord && "One word or phrase of the headline is in another colour or in italics. Set the whole headline in one colour and one style.",
      (d.h1Words ?? 0) > 10 && `The headline is ${d.h1Words} words. Cut it to eight or fewer.`,
      (d.dotStrings ?? 0) > 0 && "Facts are strung together with dots or bullets. Write them as plain short lines, or drop them.",
      tall > 900 * 1.35 && "The first screen is much taller than one screen at 1440×900: the headline, its sentence and the button must all be visible without scrolling.",
      !d.tel && kit.brief.includes("Phone:") && "The phone number isn't a tap-to-call link.",
    ].filter((x): x is string => typeof x === "string");
    const look = conceptById(kit.concept);
    const direction = look ? `\n\nThis is ONLY the first screen of the home page; the rest isn't written yet, so don't mark it down for missing sections, reviews or a form. Its art direction is "${look.name}". The first screen should be: ${look.hero}\nRuled out for it: ${look.never}\nIf it doesn't match that description (for example it is a big headline over a darkened full-bleed photo when the direction says otherwise), say so as a high-severity issue with the fix, and score no higher than 6.` : "\n\nThis is ONLY the first screen of the home page; the rest isn't written yet.";
    const crit = await deps.critique(env, { desktop, phone }, `${measured.length ? measured.map((m) => `- FAILED: ${m}`).join("\n") : "- The measured checks passed."}${direction}`, true);
    const notes = [...measured, ...crit.issues.filter((i) => i.severity !== "low").map((i) => `${i.what} → ${i.fix}`)];
    return { score: crit.score, notes: crit.score >= HERO_GOOD && !measured.length ? [] : notes, costUsd: crit.costUsd };
  } catch (e) {
    if (browser) await browser.close().catch(() => undefined);
    await addBrowserSeconds(env, (Date.now() - started) / 1000).catch(() => undefined);
    console.log("hero look failed", slug, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** The slice of Puppeteer this module uses (so tests can hand in a stand-in). */
export interface BrowserPage {
  setViewport(v: { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean }): Promise<void>;
  goto(url: string, opts?: { waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2"; timeout?: number }): Promise<unknown>;
  screenshot(opts: { type: "jpeg"; quality: number; fullPage?: boolean }): Promise<Uint8Array | Buffer | string>;
  evaluate<T>(fn: string | (() => T)): Promise<T>;
  on(event: "console" | "pageerror", handler: (arg: { type(): string; text(): string } & Error) => void): void;
  close(): Promise<void>;
}
export interface Browser {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
}
export interface ReviewDeps {
  launch(env: Env): Promise<Browser>;
  /** Wait (a stand-in in tests, so they don't sit through the intro animations). */
  sleep?(ms: number): Promise<void>;
  critique(env: Env, shots: { desktop: Uint8Array; phone: Uint8Array }, facts: string, studio?: boolean): Promise<{ score: number; verdict: string; strengths: string[]; issues: Issue[]; costUsd: number }>;
}

async function launchReal(env: Env): Promise<Browser> {
  const { default: puppeteer } = await import("@cloudflare/puppeteer");
  return (await puppeteer.launch(env.BROWSER as never)) as unknown as Browser;
}

const bytesOf = (b: Uint8Array | Buffer | string): Uint8Array => (typeof b === "string" ? Uint8Array.from(atob(b), (c) => c.charCodeAt(0)) : new Uint8Array(b));
const b64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

const CRITIQUE_SYSTEM = `You are the creative director at Mianro Systems reviewing a website home page your studio just built for a local business. You see the page as a visitor would: a desktop screenshot and a phone screenshot. Be exacting but fair; this is a first version and your notes go straight back to the designer.

Score the page from 1 to 10 overall, weighing: first impression and distinctiveness (does it look custom and expensive, or like an AI template?), hierarchy and typography, colour and contrast, layout and spacing on desktop AND on the phone, use of imagery, clarity of the offer and the call to action, trust signals, and copy. Mark these down hard: text cut off or overlapping, elements running off the screen, unreadable contrast, an empty or broken-looking area, a hero that doesn't explain what the business does, the same card grid repeated section after section, a label above every single heading, gradient text used as decoration, nested cards, cards rounded like pills.

Judge the design, not missing information. The designer is forbidden to invent facts, so never ask for a star rating, a review count, a year, an award, a licence, a phone number, a customer name or any other fact that isn't already on the page or in the measured facts, and never mark the page down for lacking one. The chat button in the bottom corner is added by our system and is not the designer's: ignore it.

Reply with JSON only, no markdown: {"score": 1-10, "verdict": "one sentence", "strengths": ["..."], "issues": [{"what": "...", "fix": "a concrete instruction the designer can act on", "severity": "high|medium|low"}]}. Never use double quote characters inside any text value (write quoted words with single quotes). At most 8 issues, most important first. If the page is genuinely excellent, say so and keep the issues list short.`;

async function critiqueReal(env: Env, shots: { desktop: Uint8Array; phone: Uint8Array }, facts: string, studio = false) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 120_000 });
  const content = [
    { type: "text" as const, text: "Desktop (1280×800):" },
    { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b64(shots.desktop) } },
    { type: "text" as const, text: "Phone (390×844):" },
    { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b64(shots.phone) } },
    { type: "text" as const, text: `Facts measured in the browser (treat as true):\n${facts}` },
  ];
  const messages: { role: "user" | "assistant"; content: string | typeof content }[] = [{ role: "user", content }];
  let cost = 0;
  let p: { score?: unknown; verdict?: unknown; strengths?: unknown; issues?: unknown } | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 2 && !p; attempt++) {
  const res = await client.messages.create({
    model: CRITIQUE_MODEL,
    max_tokens: 3000,
    system: studio ? `${CRITIQUE_SYSTEM}\n\nThis is a STUDIO-tier site: it is meant to look like an award-winning creative studio built it. Judge it against that bar. A competent, tidy local-business template is a 5 or 6 at most. Look for a bold, specific concept, striking typography at a scale that stops the scroll, a memorable hero, art-directed imagery, confident use of space and motion cues, and details nobody else would think of. Say plainly what would make it unforgettable, as concrete design changes.` : CRITIQUE_SYSTEM,
    messages,
  });
  cost += costOf(CRITIQUE_MODEL, res.usage as unknown as Record<string, unknown>);
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    p = JSON.parse(json);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    // Keep what can be read so the page still shows a score; retry once for the full notes.
    const score = /"score"\s*:\s*(\d+(?:\.\d+)?)/.exec(text)?.[1];
    const verdict = /"verdict"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text)?.[1];
    if (attempt === 1 && score) p = { score: Number(score), verdict: verdict ?? "", strengths: [], issues: [] };
    messages.push({ role: "assistant", content: text.slice(0, 6000) }, { role: "user", content: `That was not valid JSON (${lastErr}). Reply again with the same review as valid JSON only. Do not use double quote characters inside any text value; use single quotes.` });
  }
  }
  if (!p) throw new Error(`critique was not valid JSON: ${lastErr}`);
  const issues = Array.isArray(p.issues)
    ? (p.issues as Partial<Issue>[]).slice(0, 8).map((i) => ({ what: String(i.what ?? "").slice(0, 300), fix: String(i.fix ?? "").slice(0, 400), severity: i.severity === "high" || i.severity === "low" ? i.severity : ("medium" as const) }))
    : [];
  return {
    score: Math.max(1, Math.min(10, Math.round(Number(p.score) || 5))),
    verdict: String(p.verdict ?? "").slice(0, 300),
    strengths: Array.isArray(p.strengths) ? (p.strengths as unknown[]).slice(0, 6).map((s) => String(s).slice(0, 200)) : [],
    issues,
    costUsd: cost,
  };
}

export const realDeps: ReviewDeps = { launch: launchReal, critique: critiqueReal };

/** Browser seconds used this month, and the key they live under. */
export async function browserUsed(env: Env): Promise<{ key: string; seconds: number }> {
  const key = `browser:${new Date().toISOString().slice(0, 7)}`;
  return { key, seconds: Number(await getSetting(env, key)) || 0 };
}

async function addBrowserSeconds(env: Env, seconds: number): Promise<void> {
  const { key, seconds: before } = await browserUsed(env);
  await setSetting(env, key, String(Math.ceil(before + seconds)));
}

const EMPTY_FACTS: PageFacts = { overflow: false, h1: 0, noAlt: 0, brokenImgs: 0, links: [], hasViewport: false, tel: false, forms: 0, textPx: 0, words: 0, https: false };
/** Whatever the browser sent back, filled out so one missing field can never crash the checks. */
export const factsOf = (raw: unknown): PageFacts => ({ ...EMPTY_FACTS, ...(raw && typeof raw === "object" ? (raw as Partial<PageFacts>) : {}), links: Array.isArray((raw as PageFacts | null)?.links) ? (raw as PageFacts).links : [] });

/** Checks on a built page. `paths` are the site's real page paths; `prefix` is where it is served. */
function checksFor(desktop: PageFacts, phone: PageFacts, paths: string[], prefix: string, consoleErrors: string[], hasPhone = true): Check[] {
  const internal = desktop.links.filter((h) => h.startsWith(prefix + "/") || h === prefix);
  const broken = internal.filter((h) => {
    const p = h.slice(prefix.length).split(/[?#]/)[0] || "/";
    return !paths.includes(p) && !p.startsWith("/_");
  });
  return [
    { id: "overflow-desktop", label: "No sideways scrolling on desktop", ok: !desktop.overflow },
    { id: "overflow-phone", label: "No sideways scrolling on a phone", ok: !phone.overflow },
    { id: "h1", label: "Exactly one main heading", ok: desktop.h1 === 1, detail: `${desktop.h1} found` },
    { id: "alt", label: "Every image has alt text", ok: desktop.noAlt === 0, detail: desktop.noAlt ? `${desktop.noAlt} without` : undefined },
    { id: "images", label: "No broken images", ok: desktop.brokenImgs === 0, detail: desktop.brokenImgs ? `${desktop.brokenImgs} broken` : undefined },
    { id: "empty", label: "No empty sections", ok: !desktop.emptyBlocks, detail: desktop.emptyBlocks ? `${desktop.emptyBlocks} blank block${desktop.emptyBlocks === 1 ? "" : "s"}` : undefined },
    { id: "eyebrow", label: "No small labels above the headings", ok: (desktop.eyebrows ?? 0) <= 1, detail: desktop.eyebrows ? `${desktop.eyebrows} found; remove them` : undefined },
    { id: "accent-word", label: "The main heading is one colour and one style", ok: !desktop.accentWord, detail: desktop.accentWord ? "one word or phrase is coloured or italic; set the whole heading the same" : undefined },
    { id: "h1-short", label: "The main heading is short", ok: (desktop.h1Words ?? 0) <= 10, detail: `${desktop.h1Words ?? 0} words; eight or fewer` },
    { id: "dots", label: "No facts strung together with dots", ok: (desktop.dotStrings ?? 0) === 0, detail: desktop.dotStrings ? `${desktop.dotStrings} found; write them as plain lines` : undefined },
    { id: "links", label: "Every link goes to a real page", ok: broken.length === 0, detail: broken.length ? `${broken.length} dead: ${[...new Set(broken)].slice(0, 4).join(", ")}` : undefined },
    { id: "console", label: "No script errors", ok: consoleErrors.length === 0, detail: consoleErrors.length ? consoleErrors[0]!.slice(0, 120) : undefined },
    // No phone number was given for this business: nothing to link, so nothing to fail.
    ...(hasPhone ? [{ id: "tel", label: "Tap-to-call phone link", ok: desktop.tel }] : []),
    { id: "form", label: "A form on the page", ok: desktop.forms > 0 },
    { id: "text", label: "Readable text size on a phone", ok: phone.textPx >= 15, detail: `${phone.textPx}px` },
  ];
}

/** A simple, explainable score for the business's current website (10 is good). */
export function scoreOld(f: PageFacts | null): { score: number; checks: Check[] } {
  if (!f) return { score: 1, checks: [{ id: "loaded", label: "Website loads", ok: false }] };
  const checks: Check[] = [
    { id: "loaded", label: "Website loads", ok: true },
    { id: "viewport", label: "Built for phones (viewport set)", ok: f.hasViewport },
    { id: "overflow-phone", label: "No sideways scrolling on a phone", ok: !f.overflow },
    { id: "h1", label: "One clear main heading", ok: f.h1 === 1, detail: `${f.h1} found` },
    { id: "https", label: "Secure (https)", ok: f.https },
    { id: "tel", label: "Tap-to-call phone link", ok: f.tel },
    { id: "form", label: "A way to send a message", ok: f.forms > 0 },
    { id: "text", label: "Readable text size", ok: f.textPx >= 14, detail: `${f.textPx}px` },
    { id: "alt", label: "Images described for search engines", ok: f.noAlt <= 2 },
  ];
  const weights: Record<string, number> = { viewport: 3, "overflow-phone": 2, h1: 1, https: 1, tel: 1, form: 1, text: 1, alt: 1 };
  const score = checks.reduce((s, c) => s - (c.ok ? 0 : (weights[c.id] ?? 0)), 11);
  return { score: Math.max(1, Math.min(10, score)), checks };
}

/**
 * Open a page and let it settle. A busy page (chat widget, animation engine, video) may never go
 * fully quiet, so running out of time waiting for quiet is fine: the page has loaded by then.
 */
async function visit(page: BrowserPage, url: string, settleMs: number, sleep: (ms: number) => Promise<void>): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 22_000 });
  } catch (e) {
    if (!/timeout|exceeded/i.test(e instanceof Error ? e.message : String(e))) throw e;
  }
  await sleep(settleMs);
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Run the review for a version that is live. Never throws: whatever happens is recorded on the version. */
export async function reviewSite(env: Env, slug: string, version: string, deps: ReviewDeps = realDeps): Promise<Review> {
  const at = new Date().toISOString();
  const prev = await getReview(env, slug, version);
  const done = async (r: Review) => {
    const out = { ...r, tries: r.skipped?.startsWith("error") ? (prev?.tries ?? 0) + 1 : 0 };
    await saveReview(env, slug, version, out);
    return out;
  };
  const demo = await getDemo(env, slug);
  if (!demo || demo.liveVersion !== version) return { at, skipped: "not live" };
  if (!env.BROWSER) return done({ at, skipped: "no browser" });
  if (!env.ANTHROPIC_API_KEY) return done({ at, skipped: "no Claude key" });
  const used = await browserUsed(env);
  if (used.seconds >= BROWSER_BUDGET_SECONDS) return done({ at, skipped: "browser budget for this month is used up" });
  const kit = await getKit(env, slug, version);
  if (!kit) return done({ at, skipped: "no kit" });
  const base = env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : "";
  if (!base) return done({ at, skipped: "no public site address (SITES_ORIGIN)" });
  const prefix = `/${slug}`;
  const siteUrl = `${base}${prefix}?r=${version}`;

  const started = Date.now();
  const sleep = deps.sleep ?? realSleep;
  // A Studio site opens with an intro (preloader, then the headline assembling): wait it out so the picture shows the site.
  const settle = kit.style === "studio" ? 5500 : 1200;
  let browser: Browser | null = null;
  const shots: string[] = [];
  let review: Review = { at };
  try {
    browser = await deps.launch(env);
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e.message || e)));

    // The new site: desktop, then phone, then a social-preview frame.
    await page.setViewport({ width: 1280, height: 800 });
    await visit(page, siteUrl, settle, sleep);
    const desktop = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    const dFacts = factsOf(await page.evaluate<PageFacts>(FACTS));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await visit(page, siteUrl, settle, sleep);
    const phone = bytesOf(await page.screenshot({ type: "jpeg", quality: 72 }));
    const pFacts = factsOf(await page.evaluate<PageFacts>(FACTS));
    // The other main pages, at phone width: a layout that doesn't collapse pushes content off the screen.
    const wide: { path: string; px: number; fixed?: boolean }[] = [];
    const inner = pagesOf(kit).filter((p) => p.kind === "ai" && p.path !== "/");
    const first = (pred: (p: (typeof inner)[number]) => boolean) => inner.find(pred);
    const sample = [...new Set([first((p) => p.path === "/contact"), first((p) => p.role === "cta" || p.path === "/quote"), first((p) => p.role === "index" || p.path === "/services"), first((p) => p.path === "/about"), first((p) => p.path === "/gallery"), first((p) => p.role === "visit" || p.path === "/areas"), first((p) => p.role === "item" || p.path.startsWith("/services/")), first((p) => p.path === "/faq")])].filter((p) => !!p);
    for (const p of sample) {
      try {
        await visit(page, `${siteUrl}${p.path}`, 500, sleep);
        const w = Number(await page.evaluate<number>("document.documentElement.scrollWidth"));
        if (w > 394) wide.push({ path: p.path, px: Math.round(w - 390) });
      } catch {
        // A page that won't load is caught by the link check.
      }
    }
    await page.setViewport({ width: 1200, height: 630 });
    await visit(page, siteUrl, settle, sleep);
    const og = bytesOf(await page.screenshot({ type: "jpeg", quality: 78 }));
    await saveImage(env, slug, version, "shot-desktop.jpg", "The home page on desktop", desktop);
    await saveImage(env, slug, version, "shot-phone.jpg", "The home page on a phone", phone);
    await saveImage(env, slug, version, "og.jpg", "Link preview", og);
    shots.push("shot-desktop.jpg", "shot-phone.jpg", "og.jpg");

    const checks = checksFor(dFacts, pFacts, pagesOf(kit).map((p) => p.path), prefix, // A missing file shows up as a broken image or link in its own check; the console line for it names no file, so it isn't a script error.
      consoleErrors.filter((e) => !/favicon|ERR_BLOCKED|net::|Failed to load resource/i.test(e)),
      !!demo.intake.phone,
    );
    checks.splice(2, 0, { id: "overflow-inner", label: "Other pages fit a phone screen", ok: !wide.length, detail: wide.length ? wide.map((x) => `${x.path} is ${x.px}px too wide`).join(", ") : undefined });

    // The business's current website, for the before/after.
    let old: OldSite | null = null;
    if (demo.intake.websiteUrl) {
      try {
        await page.setViewport({ width: 1280, height: 800 });
        await visit(page, demo.intake.websiteUrl, 1500, sleep);
        const oDesk = bytesOf(await page.screenshot({ type: "jpeg", quality: 65 }));
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
        await visit(page, demo.intake.websiteUrl, 1500, sleep);
        const oPhone = bytesOf(await page.screenshot({ type: "jpeg", quality: 65 }));
        const oFacts = factsOf(await page.evaluate<PageFacts>(FACTS));
        await saveImage(env, slug, version, "old-desktop.jpg", "Their current website on desktop", oDesk);
        await saveImage(env, slug, version, "old-phone.jpg", "Their current website on a phone", oPhone);
        shots.push("old-desktop.jpg", "old-phone.jpg");
        old = { url: demo.intake.websiteUrl, loaded: true, ...scoreOld(oFacts) };
      } catch (e) {
        console.log("old site capture failed", slug, e instanceof Error ? e.message : String(e));
        old = { url: demo.intake.websiteUrl, loaded: false, ...scoreOld(null) };
      }
    }
    await page.close();
    await browser.close();
    browser = null;
    const seconds = (Date.now() - started) / 1000;
    await addBrowserSeconds(env, seconds);

    // Claude's critique of the screenshots.
    const facts = `${checks.map((c) => `- ${c.label}: ${c.ok ? "ok" : "FAILED"}${c.detail ? ` (${c.detail})` : ""}`).join("\n")}${demo.intake.phone ? "" : "\n- No phone number was given for this business, so the page has none: that is correct."}`;
    const studio = kit.style === "studio";
    // A Studio site is judged against its own art direction, so one that drifts to the generic layout is marked down.
    const look = studio ? conceptById(kit.concept) : undefined;
    const direction = look ? `\n\nThis site's art direction is "${look.name}". Its first screen should be: ${look.hero}\nRuled out for it: ${look.never}\nIf the first screen doesn't match that description (for example it is a big headline over a darkened full-bleed photo when the direction says otherwise), say so as a high-severity issue with the fix, and score no higher than 6.` : "";
    const crit = await deps.critique(env, { desktop, phone }, facts + direction, studio);
    review = { at, ...(wide.length ? { wide } : {}), score: crit.score, verdict: crit.verdict, strengths: crit.strengths, issues: crit.issues, checks, consoleErrors: consoleErrors.slice(0, 5), old, seconds: Math.round(seconds), costUsd: crit.costUsd, shots };

    // Fix: write the home page again with the notes, when it isn't good enough.
    const failed = checks.filter((c) => !c.ok && !["tel", "form", "text", "alt", "overflow-inner"].includes(c.id));
    const notes = [
      ...failed.map((c) => `${c.label}: FAILED${c.detail ? ` (${c.detail})` : ""}. Fix this.`),
      ...crit.issues.filter((i) => i.severity !== "low").map((i) => `${i.what} → ${i.fix}`),
    ];
    // A Studio page whose first screen was already built alone, looked at and revised during the build
    // isn't rewritten again on score alone (in production that cost $0.50 to $0.80 a site and moved no
    // score): only a measured failure does it. The notes stay, with the fix buttons, for whoever wants them.
    const heroFirst = studio && !!(await getPage(env, slug, version, "/_hero"));
    if (((crit.score < (studio ? FIX_BELOW_STUDIO : FIX_BELOW) && !heroFirst) || failed.length) && notes.length) {
      const spec = pagesOf(kit).find((p) => p.path === "/");
      const current = await getPage(env, slug, version, "/");
      if (spec && current) {
        try {
          const { page: fixedPage, usage } = await designSitePage(env, kit, spec, { notes, current });
          await savePage(env, slug, version, "/", fixedPage, usage);
          const u = usage as { cost_usd?: number };
          review.fixed = true;
          review.costUsd = (review.costUsd ?? 0) + (Number(u.cost_usd) || 0);
          // Look again, so the score shown is of the page as it now is, not the one that was replaced.
          const again = await rescore(env, deps, `${base}${prefix}?r=${version}-fixed`, settle, sleep, facts + direction, studio).catch((e) => (console.log("rescore failed", slug, e instanceof Error ? e.message : String(e)), null));
          if (again && again.crit.score < crit.score) {
            // The rewrite came out worse: put the original page back and keep its score.
            await savePage(env, slug, version, "/", current, null);
            review.fixed = false;
            review.fixError = `A rewrite scored ${again.crit.score}/10, lower than the original's ${crit.score}/10, so the original was kept.`;
            review.costUsd += again.crit.costUsd;
          } else if (again) {
            review.before = crit.score;
            review.score = again.crit.score;
            review.verdict = again.crit.verdict;
            review.strengths = again.crit.strengths;
            review.issues = again.crit.issues;
            review.costUsd += again.crit.costUsd;
            await saveImage(env, slug, version, "shot-desktop.jpg", "The home page on desktop", again.desktop);
            await saveImage(env, slug, version, "shot-phone.jpg", "The home page on a phone", again.phone);
          }
        } catch (e) {
          review.fixError = e instanceof Error ? e.message : String(e);
        }
      }
    }
    // Repair inner pages that were too wide for a phone (each is rewritten on its own, cheaper, model).
    for (const x of wide.slice(0, 4)) {
      const spec = pagesOf(kit).find((p) => p.path === x.path);
      const current = await getPage(env, slug, version, x.path);
      if (!spec || !current) continue;
      try {
        const { page: fixedPage, usage } = await designSitePage(env, kit, spec, {
          instruction: `On a 390px-wide phone this page is ${x.px}px wider than the screen, so content runs off the right edge. Find what causes it and fix it: every multi-column grid or flex row must collapse to one column below 720px, nothing may have a fixed width or min-width wider than the screen (use max-width:100% and min-width:0 on grid children), long words and links must wrap, and forms must be 100% wide. Change only what is needed for that.`,
          current,
        });
        await savePage(env, slug, version, x.path, fixedPage, usage);
        x.fixed = true;
        review.costUsd = (review.costUsd ?? 0) + (Number((usage as { cost_usd?: number }).cost_usd) || 0);
      } catch (e) {
        console.log("wide page not fixed", slug, x.path, e instanceof Error ? e.message : String(e));
      }
    }
    await recordBuildCost(env, demo.tenantId, slug, `${version}:review`, review.costUsd ?? 0, review.fixed ? 2 : 1, "review");
    return done(review);
  } catch (e) {
    if (browser) await browser.close().catch(() => undefined);
    await addBrowserSeconds(env, (Date.now() - started) / 1000);
    console.error("review failed", slug, e instanceof Error ? e.message : String(e));
    return done({ ...review, at, skipped: `error: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`, shots });
  }
}

