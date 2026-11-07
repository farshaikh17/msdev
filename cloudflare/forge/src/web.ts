/**
 * The public Forge website (no sign-in): routes, the price packs and examples Mianro staff choose,
 * and the contact / sample / reseller-application forms, which land in the admin console.
 */
import { getDemo, getSetting, imageNames, recordAttempt, throttled } from "./db";
import { sameOrigin } from "./auth";
import type { Env } from "./env";
import { sitesBase } from "./ghl";
import { getTenant } from "./tenants";
import { DEFAULT_PLANS, GUIDES, TRADES, type Plan, guideBySlug, tradeBySlug } from "./web-content";
import {
  type FormKind,
  type Showcase,
  faqPage,
  formPage,
  guidePage,
  guidesIndex,
  homeLd,
  homePage,
  howPage,
  notFoundPage,
  pricingPage,
  privacyPage,
  resellersPage,
  shell,
  termsPage,
  thanksPage,
  tradePage,
  tradesIndex,
  workDetail,
  workIndex,
} from "./web-ui";
import { WORK, workById } from "./web-work";
import { STUDIO_CSS, studioConcept, studioPage } from "./web-studio";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FORM_TRIES = 5;
const FORM_WINDOW_MS = 60 * 60_000;

// ---- What staff can change: price packs and featured examples ----------------------------------

export async function getPlans(env: Env): Promise<Plan[]> {
  try {
    const raw = JSON.parse((await getSetting(env, "web_plans")) || "null");
    const plans = parsePlans(raw);
    if (plans.length) return plans;
  } catch {
    /* fall back to the defaults */
  }
  return DEFAULT_PLANS;
}

export function parsePlans(raw: unknown): Plan[] {
  if (!Array.isArray(raw)) return [];
  const out: Plan[] = [];
  for (const r of raw.slice(0, 4)) {
    const p = r as Partial<Plan>;
    const name = String(p?.name ?? "").trim().slice(0, 30);
    const credits = Math.trunc(Number(p?.credits));
    if (!name || !(credits >= 1 && credits <= 100000)) continue;
    out.push({ name, credits, price: String(p?.price ?? "").trim().slice(0, 14), blurb: String(p?.blurb ?? "").trim().slice(0, 140), featured: !!p?.featured });
  }
  if (out.length && !out.some((p) => p.featured)) out[Math.min(1, out.length - 1)].featured = true;
  return out;
}

export async function getShowcaseSlugs(env: Env): Promise<string[]> {
  return ((await getSetting(env, "web_showcase")) || "").split(/\s+/).filter((s) => /^[a-z0-9-]{3,64}$/.test(s)).slice(0, 9);
}

/** Pull slugs out of pasted demo links or plain slugs, one per line. */
export function parseSlugs(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/[\s,]+/)) {
    const m = line.replace(/[?#].*$/, "").replace(/\/+$/, "").match(/([a-z0-9-]{3,64})$/);
    if (m && !out.includes(m[1])) out.push(m[1]);
  }
  return out.slice(0, 9);
}

async function showcase(env: Env, origin: string): Promise<Showcase[]> {
  const base = sitesBase(env.SITES_ORIGIN, origin);
  const out: Showcase[] = [];
  for (const slug of await getShowcaseSlugs(env)) {
    const demo = await getDemo(env, slug);
    if (!demo) continue;
    const tenant = await getTenant(env, demo.tenantId);
    if (!tenant || tenant.status !== "active") continue;
    let image: string | null = null;
    if (demo.liveVersion) {
      const first = (await imageNames(env, slug, demo.liveVersion))[0];
      if (first) image = `${base}${slug}/_img/${demo.liveVersion}/${first}`;
    }
    out.push({ slug, name: demo.intake.businessName, trade: demo.content.industry || "Local business", url: `${base}${slug}`, image });
  }
  return out;
}

// ---- Inquiries -------------------------------------------------------------------------------

export interface Inquiry {
  id: number;
  kind: FormKind;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  message: string;
  extra: Record<string, string>;
  status: "new" | "talking" | "won" | "closed";
  createdAt: string;
}

interface InquiryRow {
  id: number;
  kind: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  message: string;
  extra: string;
  status: string;
  created_at: string;
}

const toInquiry = (r: InquiryRow): Inquiry => ({
  id: r.id,
  kind: r.kind as FormKind,
  name: r.name,
  email: r.email,
  phone: r.phone,
  company: r.company,
  website: r.website,
  message: r.message,
  extra: JSON.parse(r.extra || "{}") as Record<string, string>,
  status: r.status as Inquiry["status"],
  createdAt: r.created_at,
});

export async function listInquiries(env: Env, status?: string): Promise<Inquiry[]> {
  const { results } = status
    ? await env.DB.prepare("SELECT * FROM inquiries WHERE status = ? ORDER BY id DESC LIMIT 300").bind(status).all<InquiryRow>()
    : await env.DB.prepare("SELECT * FROM inquiries ORDER BY id DESC LIMIT 300").all<InquiryRow>();
  return results.map(toInquiry);
}

export async function countNewInquiries(env: Env): Promise<number> {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'").first<{ n: number }>();
  return r?.n ?? 0;
}

export async function setInquiryStatus(env: Env, id: number, status: string): Promise<void> {
  if (!["new", "talking", "won", "closed"].includes(status)) return;
  await env.DB.prepare("UPDATE inquiries SET status = ? WHERE id = ?").bind(status, id).run();
}

async function saveInquiry(env: Env, kind: FormKind, v: Record<string, string>): Promise<void> {
  const extra: Record<string, string> = {};
  for (const k of ["volume", "plan", "trades", "trade", "tier"]) if (v[k]) extra[k] = v[k];
  await env.DB.prepare("INSERT INTO inquiries (kind, name, email, phone, company, website, message, extra, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(kind, v.name, v.email, v.phone ?? "", v.company ?? "", v.website ?? "", v.message ?? "", JSON.stringify(extra), new Date().toISOString())
    .run();
}

const clean = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

async function takeForm(req: Request, env: Env, forcedKind?: FormKind): Promise<Response> {
  if (!sameOrigin(req)) return new Response("Cross-site form posts are not accepted.", { status: 403 });
  const origin = new URL(req.url).origin;
  const f = await req.formData();
  const kind: FormKind = forcedKind ?? (f.get("kind") === "sample" ? "sample" : "contact");
  const v: Record<string, string> = {
    name: clean(f, "name", 80),
    email: clean(f, "email", 120).toLowerCase(),
    phone: clean(f, "phone", 40),
    company: clean(f, "company", 100),
    website: clean(f, "website", 200),
    message: clean(f, "message", 2000),
    volume: clean(f, "volume", 12),
    plan: clean(f, "plan", 40),
    trades: clean(f, "trades", 160),
    trade: clean(f, "trade", 40),
    tier: clean(f, "tier", 10) === "studio" ? "studio" : "",
  };
  const again = (error: string, status = 400) => shell({ title: "Forge", desc: "", path: kind === "reseller" ? "/resellers/apply" : "/contact", origin, signedIn: false, noindex: true, status }, formPage({ kind, values: v, error }));
  // A hidden field only bots fill in: pretend it worked, store nothing.
  if (clean(f, "company_url", 100)) return Response.redirect(`${origin}/thanks?k=${kind}`, 303);
  const key = `inq:${req.headers.get("cf-connecting-ip") ?? "unknown"}`;
  if (await throttled(env, key, FORM_TRIES)) return again("Too many messages from this connection. Please try again later.", 429);
  if (!v.name) return again("Please enter your name.");
  if (!EMAIL.test(v.email)) return again("Please enter a valid email address.");
  if (kind === "reseller" && !v.company) return again("Please tell us your agency or company name.");
  if (kind !== "reseller" && !v.message) return again("Please write a short message.");
  await recordAttempt(env, key, FORM_WINDOW_MS);
  await saveInquiry(env, kind, v);
  return Response.redirect(`${origin}/thanks?k=${kind}`, 303);
}

// ---- Routes ----------------------------------------------------------------------------------

const SITEMAP_PATHS = ["/", "/work", "/studio", "/studio/concept", "/preview", "/how-it-works", "/pricing", "/resellers", "/resellers/apply", "/trades", "/guides", "/faq", "/contact", "/terms", "/privacy"];

/** The public website. Returns null when the path is not part of it (so the app handles it). */
export async function handleWeb(req: Request, env: Env, path: string, signedIn: boolean): Promise<Response | null> {
  const url = new URL(req.url);
  const origin = url.origin;
  const get = req.method === "GET" || req.method === "HEAD";
  const post = req.method === "POST";
  const page = (title: string, desc: string, body: string, extra: { jsonld?: unknown[]; status?: number; noindex?: boolean; image?: string; motion?: { css: string } } = {}) =>
    shell({ title, desc, path, origin, signedIn, ...extra }, body);

  if (post && path === "/contact") return takeForm(req, env);
  if (post && path === "/resellers/apply") return takeForm(req, env, "reseller");
  if (!get) return null;

  if (path === "/robots.txt")
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /demos\nDisallow: /settings\nDisallow: /team\nDisallow: /api\nDisallow: /s/\n\nSitemap: ${origin}/sitemap.xml\n`, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  if (path === "/sitemap.xml") {
    const urls = [...SITEMAP_PATHS, ...WORK.map((w) => `/work/${w.id}`), ...TRADES.map((t) => `/trades/${t.slug}`), ...GUIDES.map((g) => `/guides/${g.slug}`)];
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${origin}${u === "/" ? "/" : u}</loc></url>`).join("")}</urlset>`,
      { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } },
    );
  }
  if (path === "/favicon.svg")
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2a33a"/><stop offset=".55" stop-color="#e4572e"/><stop offset="1" stop-color="#b8321a"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#g)"/><path d="M17.3 6 9.5 17.5h6.2L14.7 26l7.8-11.5h-6.2L17.3 6Z" fill="#fff"/></svg>', { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

  let m: RegExpMatchArray | null;
  if (path === "/") {
    if (signedIn) return null; // signed-in people see their dashboard here
    const plans = await getPlans(env);
    return page("Forge: premium websites for local businesses, designed in minutes", "Forge designs a complete, multi-page website for any local business from just its name. See yours free before you pay, or resell Forge under your own brand.", homePage(plans, await showcase(env, origin)), { jsonld: homeLd(origin, plans) });
  }
  if (path === "/how-it-works") return page("How Forge works", "Type a business name and Forge designs a complete multi-page website in minutes: services, photos, forms and a map.", howPage());
  if (path === "/pricing") {
    const plans = await getPlans(env);
    return page("Forge pricing: simple credit packs", "One credit builds one finished website. Failed builds are refunded and packs never expire.", pricingPage(plans), { jsonld: homeLd(origin, plans).slice(2) });
  }
  if (path === "/resellers") return page("Forge for agencies: resell websites under your own brand", "A white-label partner program: your name on every site, team sign-ins, API keys, webhooks and simple credit packs.", resellersPage());
  if (path === "/resellers/apply") {
    const plan = url.searchParams.get("plan") ?? "";
    return page("Become a Forge partner", "Tell us about your agency and we'll set up your account.", formPage({ kind: "reseller", values: { plan: plan.slice(0, 40) } }));
  }
  if (path === "/examples") return Response.redirect(`${origin}/work`, 301);
  if (path === "/work") return page("Our work: websites built with Forge", "Real, live websites built with Forge for HVAC, plumbing, electrical, pest control, landscaping and more.", workIndex(await showcase(env, origin)), { image: "/work/proair.webp" });
  m = path.match(/^\/work\/([a-z0-9-]+)$/);
  if (m) {
    const w = workById(m[1]);
    if (!w) return page("Page not found · Forge", "", notFoundPage(), { status: 404, noindex: true });
    return page(`${w.name}: ${w.trade} website · Forge`, w.blurb, workDetail(w), { image: `/work/${w.id}.webp` });
  }
  if (path === "/preview") {
    const trade = url.searchParams.get("trade") ?? "";
    const tier = url.searchParams.get("tier") === "studio" ? "studio" : "";
    return page(tier ? "Get your free Studio preview · Forge" : "Get your free website preview · Forge", "Tell us your business and we'll build a complete preview of its new website, free.", formPage({ kind: "sample", values: { trade: tradeBySlug(trade) ? trade : "", tier } }));
  }
  if (path === "/studio") return page("Forge Studio | award-style websites", "Forge Studio: art-directed, award-style websites with kinetic type, WebGL colour, smooth scrolling and page transitions, designed in an afternoon.", studioPage(), { motion: { css: STUDIO_CSS }, image: "/studio/concept.webp" });
  if (path === "/studio/concept") {
    return new Response(studioConcept(), { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "x-content-type-options": "nosniff", "cache-control": "public, max-age=300" } });
  }
  if (path === "/trades") return page("Websites for every local trade", "Forge designs tailored websites for plumbers, electricians, dentists, restaurants and more.", tradesIndex(url.searchParams.get("q") ?? ""));
  m = path.match(/^\/trades\/([a-z0-9-]+)$/);
  if (m) {
    const t = tradeBySlug(m[1]);
    if (!t) return page("Page not found · Forge", "", notFoundPage(), { status: 404, noindex: true });
    return page(`Websites for ${t.who}: show them a finished site first · Forge`, `Forge builds a complete website for any ${t.name.toLowerCase()} in minutes, so you can send the finished preview before they pay.`, tradePage(t));
  }
  if (path === "/guides") return page("Guides for selling websites to local businesses · Forge", "Plain advice on finding clients, pricing, pitching and reselling websites.", guidesIndex());
  m = path.match(/^\/guides\/([a-z0-9-]+)$/);
  if (m) {
    const g = guideBySlug(m[1]);
    if (!g) return page("Page not found · Forge", "", notFoundPage(), { status: 404, noindex: true });
    return page(`${g.title} · Forge`, g.blurb, guidePage(g), { jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.blurb, author: { "@type": "Organization", name: "Mianro Systems" } }] });
  }
  if (path === "/faq") return page("Forge questions", "Answers about credits, builds, branding, ownership and security.", faqPage());
  if (path === "/contact") {
    const kind: FormKind = url.searchParams.get("kind") === "sample" ? "sample" : "contact";
    return page(kind === "sample" ? "Get a free sample website · Forge" : "Contact Forge", "Send us a message or ask for a free sample website.", formPage({ kind, values: { trade: url.searchParams.get("trade") ?? "" } }));
  }
  if (path === "/thanks") {
    const k = url.searchParams.get("k");
    return page("Thank you · Forge", "", thanksPage(k === "reseller" ? "reseller" : k === "sample" ? "sample" : "contact"), { noindex: true });
  }
  if (path === "/terms") return page("Terms of service · Forge", "The terms for using Forge.", termsPage());
  if (path === "/privacy") return page("Privacy policy · Forge", "What Forge collects and how it is used.", privacyPage());
  return null;
}

/** Shown for unknown addresses when nobody is signed in. */
export function webNotFound(req: Request, signedIn: boolean): Response {
  return shell({ title: "Page not found · Forge", desc: "", path: new URL(req.url).pathname, origin: new URL(req.url).origin, signedIn, status: 404, noindex: true }, notFoundPage());
}

