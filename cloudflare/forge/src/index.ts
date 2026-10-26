/**
 * Forge Demo on Cloudflare Workers (Free plan): Claude Opus 5.5 designs a
 * custom multi-page demo website for a business, the team shares it, and it
 * shows on a GoHighLevel page.
 *
 * This code runs as two Workers:
 * forge-demo (the team app)
 *   Team:   /, /demos/<slug>, /settings (signed in with the team password)
 *   Public: GET /s/<slug>[/<page>]  redirects to forge-sites (served here, sandboxed, when SITES_ORIGIN is unset)
 *           GET /api/s/<slug>       template sites as JSON (older GoHighLevel loader)
 *   Queue:  forge-builds — a "kit" job designs the site and writes the home page,
 *           then one "page" job per inner page (each up to 15 min).
 * forge-sites (ROLE=sites, its own origin)
 *   Public: GET /<slug>[/<page>]    the demo website, with the GoHighLevel chat widget
 */
import { renderPage, renderSite } from "../../../src/forge/render";
import { draftContent } from "../../../src/forge/copy";
import { Intake, type Demo } from "../../../src/forge/schema";
import { checkPassword, sessionCookie, signedIn, signOutCookie } from "./auth";
import {
  archiveDemo,
  getDemo,
  getKit,
  getPage,
  getSetting,
  goLive,
  listDemos,
  makeSlug,
  markBuilding,
  pagesDone,
  saveDemo,
  saveFailed,
  saveKit,
  savePage,
  setSetting,
  touchBuild,
} from "./db";
import { designInnerPage, designKit, factsBlock, PAGES, TryLater } from "./designer";
import type { BuildJob, Ctx, Env, MessageBatch } from "./env";
import { readWebsite } from "./scrape";
import { assemble, chatWidget, DEFAULT_WIDGET_ID, finish, widgetId } from "./site";
import { demoPage, homePage, loginPage, settingsPage } from "./ui";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const GHL_KEY = "ghlPageUrl";
const WIDGET_KEY = "chatWidget";
/** How often a job retries when Claude is busy (rate limit, overload) before the build fails. */
const BUSY_TRIES = 4;
/** Sites served from the app's own origin run with an opaque origin: no cookies, no access to the app. */
const SANDBOX_CSP = "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

const redirect = (to: string, extra: Record<string, string> = {}) => new Response(null, { status: 303, headers: { location: to, ...extra } });
const withMsg = (path: string, kind: "ok" | "error", text: string) => `${path}?${kind}=${encodeURIComponent(text)}`;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)) || "Something went wrong.";

function intakeFrom(f: FormData): Intake {
  const g = (k: string) => String(f.get(k) ?? "").trim();
  const color = g("primaryColor") === "custom" ? g("customColor") : g("primaryColor");
  const parsed = Intake.safeParse({
    businessName: g("businessName"),
    industry: g("industry"),
    city: g("city"),
    phone: g("phone"),
    services: g("services"),
    serviceAreas: g("serviceAreas"),
    reviews: g("reviews"),
    notes: g("notes"),
    logoUrl: g("logoUrl"),
    heroImageUrl: g("heroImageUrl"),
    primaryColor: color,
    mode: g("mode") || "auto",
    websiteUrl: g("websiteUrl"),
    photoUrls: g("photoUrls"),
    chatWidget: g("chatWidget"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(". "));
  checkWidget(parsed.data.chatWidget);
  return parsed.data;
}

function checkWidget(v: string): void {
  if (v && !/^(off|none|no)$/i.test(v) && !widgetId(v, ""))
    throw new Error("That chat widget code has no widget ID in it. Paste the GoHighLevel embed code, the widget ID, or type off.");
}

function ghlLink(pageUrl: string, slug: string): string {
  if (!pageUrl) return "";
  try {
    const u = new URL(pageUrl);
    u.searchParams.set("d", slug);
    return u.toString();
  } catch {
    return "";
  }
}

/** The code pasted into GoHighLevel: shows the demo site full-screen for whatever ?d= names. */
export function ghlSnippet(sitesBase: string): string {
  return `<style>html,body{margin:0;height:100%;overflow:hidden}#forge-site{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#fff}</style>
<iframe id="forge-site" title="Website" allow="clipboard-write"></iframe>
<script>
(function () {
  var d = new URLSearchParams(location.search).get("d");
  var f = document.getElementById("forge-site");
  if (!d || !/^[a-z0-9-]{3,64}$/.test(d)) { f.srcdoc = '<p style="font:16px system-ui;text-align:center;padding:80px 20px;color:#475569">Open this page from a Forge demo link (it ends in ?d=…).</p>'; return; }
  f.src = ${JSON.stringify(sitesBase)} + d;
})();
</script>`;
}

/** Where demo sites live: the forge-sites Worker, or this one at /s/ when SITES_ORIGIN is unset. */
const sitesBase = (env: Env, origin: string) => (env.SITES_ORIGIN ? `${env.SITES_ORIGIN.replace(/\/+$/, "")}/` : `${origin}/s/`);

const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/** A demo website page. `prefix` is the demo's address on this origin ("/<slug>" or "/s/<slug>"); `sub` the page path ("" for home). */
async function serveSite(req: Request, env: Env, ctx: Ctx, slug: string, sub: string, prefix: string, sandbox: boolean): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(req);
  if (hit) return hit;
  const demo = await getDemo(env, slug);
  if (!demo) return text("This demo isn't available.", 404);
  let html: string;
  let accent: string;
  let current: string | null = null;
  if (demo.liveVersion) {
    const path = sub || "/";
    if (!PAGES.some((p) => p.path === path)) return Response.redirect(new URL(prefix, req.url).toString(), 302);
    const [kit, page] = await Promise.all([getKit(env, slug, demo.liveVersion), getPage(env, slug, demo.liveVersion, path)]);
    if (!kit || !page) return text("This page isn't available.", 404);
    html = assemble(kit, page, slug);
    accent = kit.accent || demo.intake.primaryColor;
    current = path;
  } else {
    // A single-page design (or the template while the first design is built).
    if (sub) return Response.redirect(new URL(prefix, req.url).toString(), 302);
    html = demo.html ?? renderPage(demo);
    accent = demo.intake.primaryColor || demo.content.theme.primary;
  }
  const widget = chatWidget(widgetId(demo.intake.chatWidget, widgetId(await getSetting(env, WIDGET_KEY), DEFAULT_WIDGET_ID)), accent);
  const headers: Record<string, string> = { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "public, max-age=30" };
  if (sandbox) headers["content-security-policy"] = SANDBOX_CSP;
  const res = finish(new Response(html, { headers }), { prefix, current, widget });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}

async function templateJson(env: Env, slug: string): Promise<Response> {
  const demo = await getDemo(env, slug);
  if (!demo) return Response.json({ error: "This demo isn't available." }, { status: 404, headers: CORS });
  return Response.json(renderSite(demo), { headers: { ...CORS, "cache-control": "public, max-age=30" } });
}

const newVersion = () => `${Date.now().toString(36)}${[...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

/**
 * Queue a background design build. `resume` names a failed build to pick up where it stopped (only
 * the missing pages are written, so nothing is paid for twice). Without a key the template is all there is.
 */
async function startBuild(env: Env, slug: string, resume: string | null = null): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) return;
  const v = resume;
  if (v && (await getKit(env, slug, v))) {
    const done = await pagesDone(env, slug, v);
    await markBuilding(env, slug, v, "pages");
    const missing = PAGES.filter((p) => !done.includes(p.path));
    if (!missing.length) return goLive(env, slug, v);
    for (const p of missing) await env.BUILDS.send({ slug, version: v, stage: "page", path: p.path });
    return;
  }
  const version = newVersion();
  await markBuilding(env, slug, version, "kit");
  await env.BUILDS.send({ slug, version, stage: "kit" });
}

/** Queue consumer. Returns "retry" when Claude was busy and the job should run again in a minute. */
async function build(env: Env, job: BuildJob, attempts: number): Promise<"done" | "retry"> {
  const demo = await getDemo(env, job.slug);
  // Ignore jobs from a build that has since been replaced, finished or failed.
  if (!demo || demo.buildStatus !== "building" || demo.buildVersion !== job.version) return "done";
  const { slug, version } = job;
  try {
    if (job.stage === "kit") {
      const site = demo.intake.websiteUrl ? await readWebsite(demo.intake.websiteUrl) : null;
      const { kit, home, usage } = await designKit(env, factsBlock(demo.intake, site, slug));
      await saveKit(env, slug, version, kit, usage);
      await savePage(env, slug, version, "/", home, null);
      await touchBuild(env, slug, version, "pages");
      // The inner pages are written side by side (the queue runs a few jobs at once).
      for (const p of PAGES.slice(1)) await env.BUILDS.send({ slug, version, stage: "page", path: p.path });
      return "done";
    }
    const spec = PAGES.find((p) => p.path === job.path);
    if (!spec) return "done";
    if (!(await pagesDone(env, slug, version)).includes(spec.path)) {
      const [kit, home] = await Promise.all([getKit(env, slug, version), getPage(env, slug, version, "/")]);
      if (!kit || !home) throw new Error("The site's design went missing. Press Redesign to start again.");
      const { page, usage } = await designInnerPage(env, kit, home, spec);
      await savePage(env, slug, version, spec.path, page, usage);
      await touchBuild(env, slug, version, "pages");
    }
    const done = await pagesDone(env, slug, version);
    if (PAGES.every((p) => done.includes(p.path))) await goLive(env, slug, version);
    return "done";
  } catch (e) {
    if (e instanceof TryLater && attempts < BUSY_TRIES) {
      console.log("claude busy, retrying", slug, job.stage);
      await touchBuild(env, slug, version, job.stage === "kit" ? "kit" : "pages");
      return "retry";
    }
    console.error("build failed", slug, job.stage, errText(e));
    await saveFailed(env, slug, version, errText(e));
    return "done";
  }
}

/** forge-sites: demo websites only, at /<slug>[/<page>]. */
async function handleSites(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
  const m = path.match(/^\/([a-z0-9-]{3,64})(\/[a-z-]+)?$/);
  if (m && (req.method === "GET" || req.method === "HEAD")) return serveSite(req, env, ctx, m[1], m[2] ?? "", `/${m[1]}`, false);
  return text("Nothing here. Demo links look like /business-name-1a2b.", 404);
}

async function handle(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  const origin = url.origin;
  const base = sitesBase(env, origin);
  const site = (slug: string) => `${base}${slug}`;

  // Public demo websites.
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  let m = path.match(/^\/s\/([a-z0-9-]+)(\/[a-z-]+)?$/);
  if (m && req.method === "GET") {
    if (env.SITES_ORIGIN) return Response.redirect(`${site(m[1])}${m[2] ?? ""}`, 302);
    return serveSite(req, env, ctx, m[1], m[2] ?? "", `/s/${m[1]}`, true);
  }
  m = path.match(/^\/api\/s\/([a-z0-9-]+)$/);
  if (m && req.method === "GET") return templateJson(env, m[1]);

  // Sign-in.
  if (path === "/login" && req.method === "POST") {
    const f = await req.formData();
    if (await checkPassword(env, String(f.get("password") ?? ""))) return redirect("/", { "set-cookie": await sessionCookie(env) });
    return loginPage("That password isn't right.", !env.FORGE_PASSWORD);
  }
  if (path === "/logout" && req.method === "POST") return redirect("/login", { "set-cookie": signOutCookie });
  if (!(await signedIn(req, env))) return path === "/login" || req.method === "GET" ? loginPage(undefined, !env.FORGE_PASSWORD) : redirect("/login");
  if (path === "/login") return redirect("/");

  const aiOn = !!env.ANTHROPIC_API_KEY;

  if (path === "/" && req.method === "GET") return homePage(await listDemos(env), site, aiOn, q("error"), q("ok"));

  if (path === "/demos" && req.method === "POST") {
    try {
      const intake = intakeFrom(await req.formData());
      const now = new Date().toISOString();
      // The template version goes live at once; Claude's design replaces it when ready.
      const demo: Demo = { slug: makeSlug(intake.businessName), intake, content: draftContent(intake), writtenBy: "draft", createdAt: now, updatedAt: now };
      await saveDemo(env, demo);
      await startBuild(env, demo.slug);
      return redirect(withMsg(`/demos/${demo.slug}`, "ok", aiOn ? "Started. Claude is designing the site." : "Demo website ready"));
    } catch (e) {
      return redirect(withMsg("/", "error", errText(e)));
    }
  }

  m = path.match(/^\/demos\/([a-z0-9-]+)(\/rewrite|\/rebuild|\/archive)?$/);
  if (m) {
    const [, slug, action] = m;
    const demo = await getDemo(env, slug);
    if (!demo) return redirect(withMsg("/", "error", "That demo doesn't exist or was archived."));
    if (!action && req.method === "GET") {
      const ghl = ghlLink(await getSetting(env, GHL_KEY), slug);
      const done = demo.buildStatus === "building" && demo.buildVersion ? (await pagesDone(env, slug, demo.buildVersion)).length : 0;
      const pages = demo.liveVersion ? PAGES.map((p) => ({ name: p.name, url: `${site(slug)}${p.path === "/" ? "" : p.path}` })) : [];
      return demoPage(demo, { site: site(slug), ghl, pages }, { done, total: PAGES.length }, q("ok"), q("error"));
    }
    if ((action === "/rewrite" || action === "/rebuild") && req.method === "POST") {
      if (demo.buildStatus === "building") return redirect(withMsg(`/demos/${slug}`, "error", "A design is already being built. Wait for it to finish."));
      try {
        if (action === "/rewrite") {
          const intake = intakeFrom(await req.formData());
          await saveDemo(env, { ...demo, intake, content: draftContent(intake), writtenBy: "draft", updatedAt: new Date().toISOString() });
        }
        // "Try again" after a failure resumes; "Redesign" starts a fresh design.
        await startBuild(env, slug, action === "/rebuild" && demo.buildStatus === "failed" ? demo.buildVersion : null);
        return redirect(withMsg(`/demos/${slug}`, "ok", aiOn ? "Claude is redesigning the site. Same links." : "Updated (same links)."));
      } catch (e) {
        return redirect(withMsg(`/demos/${slug}`, "error", errText(e)));
      }
    }
    if (action === "/archive" && req.method === "POST") {
      await archiveDemo(env, slug);
      return redirect(withMsg("/", "ok", `Archived ${demo.intake.businessName}. Its links stop working within 30 seconds.`));
    }
  }

  if (path === "/settings" && req.method === "GET")
    return settingsPage(await getSetting(env, GHL_KEY), ghlSnippet(base), await getSetting(env, WIDGET_KEY), DEFAULT_WIDGET_ID, q("ok"), q("error"));
  if (path === "/settings/chat" && req.method === "POST") {
    const raw = String((await req.formData()).get("chatWidget") ?? "").trim();
    try {
      checkWidget(raw);
    } catch (e) {
      return redirect(withMsg("/settings", "error", errText(e)));
    }
    const id = /^(off|none|no)$/i.test(raw) ? "off" : widgetId(raw, "");
    await setSetting(env, WIDGET_KEY, id);
    return redirect(withMsg("/settings", "ok", id === "off" ? "Chat widget turned off for all demos" : id ? "Chat widget saved" : "Chat widget reset to the Mianro default"));
  }
  if (path === "/settings" && req.method === "POST") {
    const raw = String((await req.formData()).get("ghlPageUrl") ?? "").trim();
    if (raw && !/^https?:\/\/[^\s]+$/.test(raw)) return redirect(withMsg("/settings", "error", "Paste the full page address, starting with https://"));
    await setSetting(env, GHL_KEY, raw);
    return redirect(withMsg("/settings", "ok", raw ? "GoHighLevel page saved" : "GoHighLevel page removed"));
  }

  return new Response("Not found", { status: 404 });
}

const worker = {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    try {
      return env.ROLE === "sites" ? await handleSites(req, env, ctx) : await handle(req, env, ctx);
    } catch (e) {
      console.error(e);
      return new Response("Something went wrong. Please try again.", { status: 500 });
    }
  },
  async queue(batch: MessageBatch<BuildJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      if ((await build(env, msg.body, msg.attempts)) === "retry") msg.retry({ delaySeconds: 60 });
      else msg.ack();
    }
  },
};

export default worker;
