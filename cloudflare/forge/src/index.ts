/**
 * Forge Demo on Cloudflare Workers (Free plan): Claude Opus 5.5 designs a custom multi-page demo
 * website for a business; agencies and teams (accounts) each build their own, share them, and
 * show them on a GoHighLevel page.
 *
 * This code runs as two Workers:
 * forge-demo (the app people sign in to, plus the API)
 *   Accounts:  /, /demos/<slug>, /team, /api, /settings (owners), /admin (Mianro staff)
 *   API:       /api/v1/…  with an API key
 *   Public:    GET /s/<slug>[/<page>]  redirects to forge-sites (served here, sandboxed, when SITES_ORIGIN is unset)
 *              GET /api/s/<slug>       template sites as JSON (older GoHighLevel loader)
 *   Queue:     forge-builds — a "kit" job designs the site, then one "page" job per page (each up to 15 min);
 *              "video" jobs copy hero clips from Google Drive.
 *   Hourly:    sync the shared hero-video folder, clear old rate-limit counters.
 * forge-sites (ROLE=sites, its own origin)
 *   Public:    GET /<slug>[/<page>]    the demo website, with the account's chat widget
 *              POST /<slug>/_lead      the site's form submissions (shown on the demo in the app)
 */
import { handleApp } from "./app";
import { build, fillPairs, startQueued } from "./build";
import { pruneThrottle, pruneVisitors, queuedTenants, reviewsDue } from "./db";
import { importClip, serveVideo, syncFolder } from "./drive";
import type { BuildJob, Ctx, Env, MessageBatch, VideoJob } from "./env";
import { serveDraft, CORS, serveImage, servePitch, serveSite, takeLead, text } from "./serve";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)) || "Something went wrong.";

/** A site image: preview photos, the review's screenshots, the social preview, the old-site captures, and a Studio hero's cut-outs and turning frames. */
export const IMAGE_PATH = /^\/([a-z0-9-]{3,64})\/_img\/([a-z0-9]{6,40})\/((?:photo-\d{1,2}|reveal-1|ba-[12]-(?:before|after)|og|shot-desktop|shot-phone|old-desktop|old-phone)\.jpg|(?:object|subject|spin-\d{2})\.webp)$/;

/** /<slug> plus an optional page path such as /services or /services/drain-cleaning. */
const PAGE_PATH = /^\/([a-z0-9-]{3,64})((?:\/[a-z0-9-]+){1,2})?$/;

/** forge-sites: demo websites only, at /<slug>[/<page>]. */
async function handleSites(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
  const read = req.method === "GET" || req.method === "HEAD";
  let m = path.match(/^\/([a-z0-9-]{3,64})\/_lead$/);
  if (m && req.method === "POST") return takeLead(req, env, ctx, m[1]);
  m = path.match(/^\/_v\/([A-Za-z0-9_-]{10,80})\.mp4$/);
  if (m && read) return serveVideo(req, env, m[1]);
  m = path.match(IMAGE_PATH);
  if (m && read) return serveImage(req, env, ctx, m[1], m[2], m[3]);
  if (path === "/favicon.ico" && read) return new Response(null, { status: 204, headers: { "cache-control": "public, max-age=86400" } });
  m = path.match(/^\/([a-z0-9-]{3,64})\/_pitch$/);
  if (m && read) return servePitch(req, env, m[1], `/${m[1]}`);
  m = path.match(/^\/([a-z0-9-]{3,64})\/_draft\/([a-z0-9]{6,40})$/);
  if (m && read) return serveDraft(req, env, m[1], m[2], `/${m[1]}`);
  m = path.match(PAGE_PATH);
  if (m && read) return serveSite(req, env, ctx, m[1], m[2] ?? "", `/${m[1]}`, false);
  return text("Nothing here. Demo links look like /business-name-1a2b3c4d.", 404);
}

const worker = {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    try {
      return env.ROLE === "sites" ? await handleSites(req, env, ctx) : await handleApp(req, env, ctx);
    } catch (e) {
      console.error(e);
      return new Response("Something went wrong. Please try again.", { status: 500 });
    }
  },
  async queue(batch: MessageBatch<BuildJob | VideoJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const job = msg.body;
      if (job.stage === "video") {
        // A clip from the Drive folder; a failed copy is retried, and the next sync tries again anyway.
        try {
          await importClip(env, job.driveId);
          msg.ack();
        } catch (e) {
          console.error("video import failed", job.driveId, errText(e));
          if (msg.attempts < 3) msg.retry({ delaySeconds: 60 });
          else msg.ack();
        }
        continue;
      }
      const next = await build(env, job, msg.attempts);
      if (next === "done") msg.ack();
      else msg.retry({ delaySeconds: next });
    }
  },
  /** Hourly: pick up clips added to (or removed from) the shared Drive folder. */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await pruneThrottle(env).catch(() => undefined);
    await pruneVisitors(env).catch(() => undefined);
    // A live site whose review never ran or crashed gets another go (2 an hour at most).
    if (env.BROWSER) for (const r of await reviewsDue(env).catch(() => [] as { slug: string; version: string }[])) await env.BUILDS.send({ slug: r.slug, version: r.version, stage: "review" }).catch(() => undefined);
    // Sites still showing empty before/after boxes get their pictures made.
    await fillPairs(env).catch((e) => console.error("pairs catch-up", errText(e)));
    // Queued (bulk) builds whose account has a free slot: a safety net for the start-on-finish path.
    for (const id of await queuedTenants(env).catch(() => [] as number[])) await startQueued(env, id).catch((e) => console.error("queued build", errText(e)));
    await syncFolder(env).catch((e) => console.error("video sync failed", errText(e)));
  },
};

export default worker;

// Re-exported for tests and tooling.
export { ghlSnippet } from "./ghl";
