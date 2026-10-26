/**
 * Forge Demo on Cloudflare Workers (Free plan): Claude Opus 5.5 designs a
 * custom demo website for a business, the team shares it, and it shows on a
 * GoHighLevel page.
 *
 * Public:   GET /s/<slug>          the demo website (sandboxed: it can't touch the app)
 *           GET /api/s/<slug>      template sites as JSON (older GoHighLevel loader)
 * Team:     /, /demos/<slug>, /settings (signed in with the team password)
 * Queue:    forge-builds — each message builds one page in the background (up to 15 min).
 */
import { renderPage, renderSite } from "../../../src/forge/render";
import { draftContent } from "../../../src/forge/copy";
import { Intake, type Demo } from "../../../src/forge/schema";
import { checkPassword, sessionCookie, signedIn, signOutCookie } from "./auth";
import { archiveDemo, getDemo, getSetting, listDemos, makeSlug, markBuilding, saveBuilt, saveDemo, saveFailed, setSetting } from "./db";
import { designPage } from "./designer";
import type { BuildJob, Ctx, Env, MessageBatch } from "./env";
import { readWebsite } from "./scrape";
import { demoPage, homePage, loginPage, settingsPage } from "./ui";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const GHL_KEY = "ghlPageUrl";
/** AI pages run with an opaque origin: no cookies, no access to the app, even if a page's script misbehaves. */
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
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(". "));
  return parsed.data;
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

/** The code pasted into GoHighLevel: shows /s/<slug> full-screen for whatever ?d= names. */
export function ghlSnippet(origin: string): string {
  return `<style>html,body{margin:0;height:100%;overflow:hidden}#forge-site{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#fff}</style>
<iframe id="forge-site" title="Website" allow="clipboard-write"></iframe>
<script>
(function () {
  var d = new URLSearchParams(location.search).get("d");
  var f = document.getElementById("forge-site");
  if (!d || !/^[a-z0-9-]{3,64}$/.test(d)) { f.srcdoc = '<p style="font:16px system-ui;text-align:center;padding:80px 20px;color:#475569">Open this page from a Forge demo link (it ends in ?d=…).</p>'; return; }
  f.src = ${JSON.stringify(`${origin}/s/`)} + d;
})();
</script>`;
}

async function publicSite(req: Request, env: Env, ctx: Ctx, slug: string, json: boolean): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(req);
  if (hit) return hit;
  const demo = await getDemo(env, slug);
  if (!demo)
    return json
      ? Response.json({ error: "This demo isn't available." }, { status: 404, headers: CORS })
      : new Response("This demo isn't available.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  let res: Response;
  if (json) res = Response.json(renderSite(demo), { headers: { ...CORS, "cache-control": "public, max-age=30" } });
  else if (demo.html)
    res = new Response(demo.html, {
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "public, max-age=30", "content-security-policy": SANDBOX_CSP },
    });
  else res = new Response(renderPage(demo), { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "public, max-age=30" } });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}

/** Queue a background design build. Without a key, the template version is all there is. */
async function startBuild(env: Env, slug: string): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) return;
  await markBuilding(env, slug);
  await env.BUILDS.send({ slug });
}

/** Queue consumer: read the business's website (if given), have Claude design the page, save it. */
async function build(env: Env, job: BuildJob): Promise<void> {
  const demo = await getDemo(env, job.slug);
  if (!demo || demo.buildStatus !== "building") return;
  try {
    const site = demo.intake.websiteUrl ? await readWebsite(demo.intake.websiteUrl) : null;
    const { html, usage } = await designPage(env, demo.intake, site);
    await saveBuilt(env, job.slug, html, usage);
  } catch (e) {
    console.error("build failed", job.slug, errText(e));
    await saveFailed(env, job.slug, errText(e));
  }
}

async function handle(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  const origin = url.origin;
  const site = (slug: string) => `${origin}/s/${slug}`;

  // Public demo websites.
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  let m = path.match(/^\/s\/([a-z0-9-]+)$/);
  if (m && req.method === "GET") return publicSite(req, env, ctx, m[1], false);
  m = path.match(/^\/api\/s\/([a-z0-9-]+)$/);
  if (m && req.method === "GET") return publicSite(req, env, ctx, m[1], true);

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
      return demoPage(demo, { site: site(slug), ghl }, aiOn, q("ok"), q("error"));
    }
    if ((action === "/rewrite" || action === "/rebuild") && req.method === "POST") {
      if (demo.buildStatus === "building") return redirect(withMsg(`/demos/${slug}`, "error", "A design is already being built. Wait for it to finish."));
      try {
        if (action === "/rewrite") {
          const intake = intakeFrom(await req.formData());
          await saveDemo(env, { ...demo, intake, content: draftContent(intake), writtenBy: "draft", updatedAt: new Date().toISOString() });
        }
        await startBuild(env, slug);
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

  if (path === "/settings" && req.method === "GET") return settingsPage(await getSetting(env, GHL_KEY), ghlSnippet(origin), q("ok"), q("error"));
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
      return await handle(req, env, ctx);
    } catch (e) {
      console.error(e);
      return new Response("Something went wrong. Please try again.", { status: 500 });
    }
  },
  async queue(batch: MessageBatch<BuildJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      await build(env, msg.body);
      msg.ack();
    }
  },
};

export default worker;
