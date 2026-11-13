/**
 * The public side: demo websites, their photos and videos, and their forms. Nothing here needs a
 * sign-in. A demo is served only while its account is active; the account's settings (footer
 * credit, chat widget, hero videos) are applied as each page is served.
 */
import { BEFORE_PAGE } from "./review";
import { renderPage, renderSite } from "../../../src/forge/render";
import {
  countLeads,
  countView,
  getReview,
  getDemo,
  getImage,
  getKit,
  getPage,
  imageNames,
  listLibrary,
  recordAttempt,
  saveLead,
  throttled,
} from "./db";
import { pagesOf, type Kit } from "./designer";
import type { Stored } from "./db";
import type { Ctx, Env } from "./env";
import { heroMotion, matchClips, matchVideo, type LibraryEntry } from "./hero";
import { companionFor, flightPath, heroById } from "./heroes";
import { HERO_CLIP, heroClipId } from "./media";
import { assemble, chatWidget, creditFor, finish, templateCredit, widgetFor } from "./site";
import { sha256Hex } from "./crypto";
import { pitchPage } from "./pitch";
import { getTenant } from "./tenants";
import { deliver } from "./webhook";

export const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
/** Sites served from the app's own origin run with an opaque origin: no cookies, no access to the app. */
const SANDBOX_CSP = "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

/** Form posts allowed per address per window, and stored submissions allowed per demo. */
const LEAD_TRIES = 8;
const LEAD_WINDOW_MS = 10 * 60_000;
const LEAD_CAP = 300;

export const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? "unknown";

/**
 * The cached copy of a response, if Cloudflare's cache answers quickly. A slow or stuck cache must
 * never hold a page up: after a moment the page is simply built again.
 */
export async function fromCache(cache: Cache, req: Request, ms = 1500): Promise<Response | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((done) => (timer = setTimeout(() => done(undefined), ms)));
  try {
    return await Promise.race([cache.match(req).catch(() => undefined), late]);
  } finally {
    clearTimeout(timer);
  }
}

/** A demo that can be shown to the public: not archived, and its account is active. */
async function publicDemo(env: Env, slug: string) {
  const demo = await getDemo(env, slug);
  if (!demo) return null;
  const tenant = await getTenant(env, demo.tenantId);
  return tenant && tenant.status === "active" ? { demo, tenant } : null;
}

/** A demo website page. `prefix` is the demo's address on this origin ("/<slug>" or "/s/<slug>"); `sub` the page path ("" for home). */
export async function serveSite(req: Request, env: Env, ctx: Ctx, slug: string, sub: string, prefix: string, sandbox: boolean): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await fromCache(cache, req);
  if (hit) {
    trackView(req, env, ctx, slug);
    return hit;
  }
  const found = await publicDemo(env, slug);
  if (!found) return text("This demo isn't available.", 404);
  const { demo, tenant } = found;
  trackView(req, env, ctx, slug);
  const pageUrl = new URL(req.url);
  pageUrl.search = "";
  let html: string;
  let accent: string;
  let current: string | null = null;
  let hero: HeroFill = { motion: "" };
  let ogImage: string | null = null;
  let photos: string[] = [];
  let ogTitle = `${demo.intake.businessName}${demo.content.industry ? ` | ${demo.content.industry}` : ""}${demo.intake.city ? ` in ${demo.intake.city}` : ""}`;
  let ogDesc = `A new website for ${demo.intake.businessName}.`;
  if (demo.liveVersion) {
    // /_before: the home page as it was before the art director's pass (Studio), for comparing.
    const before = sub === BEFORE_PAGE;
    const path = before ? "/" : sub || "/";
    const kit = await getKit(env, slug, demo.liveVersion);
    if (!kit) return text("This page isn't available.", 404);
    if (!pagesOf(kit).some((p) => p.path === path)) return Response.redirect(new URL(prefix, req.url).toString(), 302);
    const page = await getPage(env, slug, demo.liveVersion, before ? BEFORE_PAGE : path);
    if (!page && before) return Response.redirect(new URL(prefix, req.url).toString(), 302);
    if (!page) return text("This page isn't available.", 404);
    html = assemble(kit, page, slug, creditFor(tenant));
    accent = kit.accent || demo.intake.primaryColor;
    current = path;
    const names = await imageNames(env, slug, demo.liveVersion);
    photos = names.filter((n) => /^photo-\d+\.jpg$/.test(n)).map((n) => `${prefix}/_img/${demo.liveVersion}/${n}`);
    ogImage = names.includes("og.jpg") ? "og.jpg" : names.includes("photo-1.jpg") ? "photo-1.jpg" : null;
    if (ogImage) ogImage = new URL(`${prefix}/_img/${demo.liveVersion}/${ogImage}`, req.url).toString();
    ogTitle = page.title;
    ogDesc = page.description;
    if (path === "/") {
      const library = await listLibrary(env, tenant.id);
      hero = heroFor(kit, library, demo.intake, slug, demo.liveVersion, names, `${prefix}/_img/${demo.liveVersion}/`, clipOrigin(env));
    }
  } else {
    // A single-page design (or the template while the first design is built).
    if (sub) return Response.redirect(new URL(prefix, req.url).toString(), 302);
    html = templateCredit(demo.html ?? renderPage(demo), tenant);
    accent = demo.intake.primaryColor || demo.content.theme.primary;
  }
  const widget = chatWidget(widgetFor(tenant, demo.intake.chatWidget), accent);
  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "x-content-type-options": "nosniff", "cache-control": "public, max-age=30" };
  if (sandbox) headers["content-security-policy"] = SANDBOX_CSP;
  const res = finish(new Response(html, { headers }), {
    prefix,
    current,
    widget,
    leadUrl: `${prefix}/_lead`,
    heroMotion: hero.motion,
    heroSubject: hero.subject,
    floatObject: hero.float,
    perchPhotos: hero.perchPhotos,
    photos,
    legacyHero: !!hero.motion && !html.includes('class="hero-motion"'),
    og: { title: ogTitle, description: ogDesc, url: pageUrl.toString(), image: ogImage },
  });
  // The page is finished first and the cache gets its own copy, so a slow cache can never hold the visitor's copy back.
  const body = await res.text();
  ctx.waitUntil(cache.put(req, new Response(body, res)).catch(() => undefined));
  return new Response(body, res);
}

/**
 * What fills a home page's picture layer. Only the site's own photos are used (never the link
 * preview, review screenshots or before/after pairs). A Studio site's signature hero decides the
 * rest: one picture (or its spotlight twin), several scenes, or a second scene to dive into.
 */
function heroFor(kit: Kit, library: LibraryEntry[], intake: Stored["intake"], slug: string, version: string, names: string[], base: string, clipBase: string): HeroFill {
  const photos = names.filter((n) => /^photo-\d+\.jpg$/.test(n)).map((n) => base + n);
  const services = pagesOf(kit).map((p) => p.name).join(" ");
  if (kit.style !== "studio") return { motion: heroMotion(matchVideo(library, intake, slug, services), photos.slice(0, 3)) };
  const sig = heroById(kit.hero);
  // A clip from the library for the trade, otherwise the hero photo brought to life for this site (if one was made).
  const made = names.includes(HERO_CLIP) ? `${clipBase}/_v/${heroClipId(version)}.mp4` : null;
  const video = matchVideo(library, intake, slug, services) ?? made;
  const frames = names.filter((n) => /^spin-\d{2}\.webp$/.test(n)).map((n) => base + n);
  const object = names.includes("object.webp") ? base + "object.webp" : undefined;
  // The signature object flies down the page in its own layer (perches with photos instead when no object could be made).
  // With an idea, the object flies only when the idea asked for one (or the first screen is built around it).
  const objectWanted = !kit.idea || !/^\s*(none|no|n\/a|-)\b/i.test(kit.idea.object ?? "none");
  const flight: Pick<HeroFill, "float" | "perchPhotos"> = (companionFor(kit.hero) && objectWanted) || sig?.media === "object" ? (object ? { float: { frames, still: object, path: flightPath(slug) } } : { perchPhotos: photos.slice(0, 3) }) : {};
  if (sig?.media === "switch") {
    const items = pagesOf(kit).filter((p) => p.role === "item" || p.path.startsWith("/services/")).map((p) => p.name);
    const clips = [...matchClips(library, intake, services), ...(made ? [made] : [])].slice(0, 4);
    return { motion: heroMotion(null, photos.slice(0, 4), "", { media: "switch", clips, labels: items }), ...flight };
  }
  if (sig?.media === "dive") return { motion: heroMotion(video, photos.slice(0, 2), "", { media: "dive" }), ...flight };
  if (sig?.media === "spin") return { motion: heroMotion(null, photos.slice(0, 1), "", { media: "spin", frames, object }) };
  const subject = names.includes("subject.webp") ? base + "subject.webp" : undefined;
  if (sig?.media === "front" || sig?.media === "breakout") return { motion: heroMotion(null, photos.slice(0, 1), "", { media: sig.media }), subject, ...flight };
  // These first screens have no picture of their own: the object flies (or circles the headline) in its own layer.
  if (sig?.media === "object" || sig?.media === "orbit") return { motion: "", ...flight };
  // A Studio first screen holds one picture (a slow drift); a crossfade between different shots reads as two unrelated images.
  return { motion: heroMotion(video, photos.slice(0, 1), names.includes("reveal-1.jpg") ? base + "reveal-1.jpg" : ""), ...flight };
}

/** What a home page's first screen is filled with. */
interface HeroFill {
  /** The picture layer (.hero-motion). */
  motion: string;
  /** A cut-out of the hero photo's subject, laid over the headline. */
  subject?: string;
  /** The signature object that flies from perch to perch (its turning frames, if any, and a still). */
  float?: { frames: string[]; still: string; path?: string };
  /** No object could be made: the perches show photos instead of standing empty. */
  perchPhotos?: string[];
}

/** Where generated hero clips are served from (forge-sites; the same origin when it serves sites itself). */
const clipOrigin = (env: Env) => (env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : "");

/** The path a version's first-screen draft is kept under (never part of the site's own pages). */
export const HERO_DRAFT = "/_hero";

/**
 * A build's first screen on its own, before the site is live, so the build can look at it in a real
 * browser. Reached only with the build's version id; never cached, counted or indexed.
 */
export async function serveDraft(req: Request, env: Env, slug: string, version: string, prefix: string): Promise<Response> {
  const found = await publicDemo(env, slug);
  const kit = found ? await getKit(env, slug, version) : null;
  const page = kit ? await getPage(env, slug, version, HERO_DRAFT) : null;
  if (!found || !kit || !page) return text("Nothing here.", 404);
  const names = await imageNames(env, slug, version);
  const library = await listLibrary(env, found.tenant.id);
  const hero = heroFor(kit, library, found.demo.intake, slug, version, names, `${prefix}/_img/${version}/`, clipOrigin(env));
  const res = new Response(assemble(kit, page, slug, creditFor(found.tenant)), { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "no-store" } });
  return finish(res, { prefix, current: "/", widget: "", leadUrl: `${prefix}/_lead`, heroMotion: hero.motion, heroSubject: hero.subject, floatObject: hero.float, perchPhotos: hero.perchPhotos });
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|skype|twitterbot|linkedin|pinterest|curl|wget|python|java\/|headless|lighthouse|pagespeed|gtmetrix|uptime|monitor/i;

/**
 * Count a page view (not bots, not link-preview fetchers) without slowing the response. The first
 * view of a day tells the account's webhook: that's when a rep wants to call.
 */
function trackView(req: Request, env: Env, ctx: Ctx, slug: string): void {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;
  // A build's own review opens the site with ?r=<version>: not a visitor.
  if (new URL(req.url).searchParams.has("r")) return;
  ctx.waitUntil(
    (async () => {
      const visitor = await sha256Hex(`${clientIp(req)}|${ua}|${new Date().toISOString().slice(0, 10)}`);
      const r = await countView(env, slug, visitor);
      if (!r.firstToday) return;
      const found = await publicDemo(env, slug);
      if (found?.tenant.webhookUrl) await deliver(env, found.tenant, "demo.viewed", found.demo, undefined, { views_today: r.views, visitors_today: r.visitors });
    })().catch((e) => console.log("view not counted", e instanceof Error ? e.message : String(e))),
  );
}

/** The before/after page: the business's current website beside the new one, with scores. */
export async function servePitch(req: Request, env: Env, slug: string, prefix: string): Promise<Response> {
  const found = await publicDemo(env, slug);
  if (!found?.demo.liveVersion) return text("This demo isn't available.", 404);
  const version = found.demo.liveVersion;
  const review = await getReview(env, slug, version);
  if (!review || !review.shots?.length) return text("The review of this site hasn't run yet. Try again in a few minutes.", 404);
  const html = pitchPage(found.demo, review, { site: new URL(prefix, req.url).toString(), img: (n) => `${prefix}/_img/${version}/${n}` }, creditFor(found.tenant));
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "x-content-type-options": "nosniff", "cache-control": "public, max-age=60" } });
}

/** A preview photo. Its address names the site version, so it never changes and caches for a year. */
export async function serveImage(req: Request, env: Env, ctx: Ctx, slug: string, version: string, name: string): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await fromCache(cache, req);
  if (hit) return hit;
  if (!(await publicDemo(env, slug))) return text("Not found", 404);
  const bytes = await getImage(env, slug, version, name);
  if (!bytes) return text("Not found", 404);
  const headers = { "content-type": name.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": "public, max-age=31536000, immutable" };
  ctx.waitUntil(cache.put(req, new Response(bytes.slice(), { headers })).catch(() => undefined));
  return new Response(bytes, { headers });
}

/** A demo website's form submission. */
export async function takeLead(req: Request, env: Env, ctx: Ctx, slug: string): Promise<Response> {
  const headers = { ...CORS, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
  // Spam guard: a few posts per address, then a pause. (Checked before anything is stored.)
  const key = `lead:${clientIp(req)}`;
  if (await throttled(env, key, LEAD_TRIES)) return Response.json({ error: "Too many submissions. Please try again later." }, { status: 429, headers: { ...headers, "retry-after": "600" } });
  const raw = await req.text();
  if (raw.length > 20_000) return Response.json({ error: "Too long." }, { status: 413, headers });
  let body: { page?: unknown; fields?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400, headers });
  }
  const fields: Record<string, string> = {};
  if (body.fields && typeof body.fields === "object")
    for (const [k, v] of Object.entries(body.fields).slice(0, 30)) if (typeof v === "string" && v.trim()) fields[k.slice(0, 60)] = v.trim().slice(0, 2000);
  if (!Object.keys(fields).length) return Response.json({ error: "Empty form." }, { status: 400, headers });
  const found = await publicDemo(env, slug);
  if (!found) return Response.json({ error: "This demo isn't available." }, { status: 404, headers });
  await recordAttempt(env, key, LEAD_WINDOW_MS);
  if ((await countLeads(env, slug)) >= LEAD_CAP) return Response.json({ error: "This form is full." }, { status: 429, headers });
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";
  await saveLead(env, slug, page, fields);
  // Tell the account's own system (its CRM automation) right away, without making the visitor wait.
  if (found.tenant.webhookUrl) ctx.waitUntil(deliver(env, found.tenant, "lead.created", found.demo, { page, fields }));
  return Response.json({ ok: true }, { headers });
}

/** The older template site as JSON (for the first GoHighLevel loader). */
export async function templateJson(env: Env, slug: string): Promise<Response> {
  const found = await publicDemo(env, slug);
  if (!found) return Response.json({ error: "This demo isn't available." }, { status: 404, headers: CORS });
  return Response.json(renderSite(found.demo), { headers: { ...CORS, "cache-control": "public, max-age=30" } });
}
