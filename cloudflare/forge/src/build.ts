/**
 * Building a site in the background: starting a build (credits, limits), and the queue jobs that
 * design it. A "kit" job reads the business's website, plans the site, makes the photos and designs
 * the look; then one "page" job per page writes the pages side by side. The site goes live only
 * when every page is written.
 */
import {
  buildingCount,
  getDemo,
  getKit,
  goLive,
  markBuilding,
  pagesDone,
  saveFailed,
  saveImage,
  saveKit,
  savePage,
  touchBuild,
  updateIntake,
} from "./db";
import { designKit, designSitePage, factsBlock, Fatal, pagesOf, planSite, sitemapFor, TryLater, type Plan } from "./designer";
import type { BuildJob, Env } from "./env";
import { previewImages } from "./images";
import { privacyPage, termsPage } from "./legal";
import { mergeIntake } from "./places";
import { readWebsite } from "./scrape";
import { chargeBuild, getTenant, type Tenant } from "./tenants";
import { deliver } from "./webhook";

/** How often a job retries when Claude is busy (rate limit, overload) before the build fails. */
const BUSY_TRIES = 4;
/** How often a page is written again after a bad reply before the build fails (a page costs about a cent). */
const PAGE_TRIES = 3;
/** Builds one paying account can have running at once (Mianro's own account is not limited). */
export const MAX_PARALLEL_BUILDS = 3;

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)) || "Something went wrong.";
const newVersion = () => `${Date.now().toString(36)}${[...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

export type StartResult = "started" | "ai-off" | "no-credits" | "busy";

/**
 * Queue a background design build, taking one credit from the account. `resume` names a failed
 * build to pick up where it stopped (only the missing pages are written, so nothing is paid for
 * twice, and a build already paid for isn't charged again). Without a Claude key there is nothing to queue.
 */
export async function startBuild(env: Env, tenant: Tenant, userId: number | null, slug: string, resume: string | null = null): Promise<StartResult> {
  if (!env.ANTHROPIC_API_KEY) return "ai-off";
  if (!tenant.unlimited && (await buildingCount(env, tenant.id)) >= MAX_PARALLEL_BUILDS) return "busy";
  const kit = resume ? await getKit(env, slug, resume) : null;
  if (resume && kit) {
    if (!(await chargeBuild(env, tenant, slug, resume, userId))) return "no-credits";
    const done = await pagesDone(env, slug, resume);
    await markBuilding(env, slug, resume, "pages");
    const missing = pagesOf(kit).filter((p) => !done.includes(p.path));
    if (!missing.length) {
      await finishBuild(env, slug, resume);
      return "started";
    }
    try {
      for (const p of missing) await env.BUILDS.send({ slug, version: resume, stage: "page", path: p.path });
    } catch (e) {
      await failBuild(env, slug, resume, `Couldn't queue the build (${errText(e)}).`);
    }
    return "started";
  }
  const version = newVersion();
  if (!(await chargeBuild(env, tenant, slug, version, userId))) return "no-credits";
  await markBuilding(env, slug, version, "kit");
  try {
    await env.BUILDS.send({ slug, version, stage: "kit" });
  } catch (e) {
    await failBuild(env, slug, version, `Couldn't queue the build (${errText(e)}).`);
  }
  return "started";
}

/** Every page is written: go live and tell the account's webhook. */
async function finishBuild(env: Env, slug: string, version: string): Promise<void> {
  await goLive(env, slug, version);
  await notify(env, slug, "demo.ready");
}

/** A build that can't finish: record it (refunding the credit) and tell the account's webhook. */
async function failBuild(env: Env, slug: string, version: string, error: string): Promise<void> {
  if (await saveFailed(env, slug, version, error)) await notify(env, slug, "demo.failed");
}

async function notify(env: Env, slug: string, event: "demo.ready" | "demo.failed"): Promise<void> {
  const demo = await getDemo(env, slug);
  const tenant = demo ? await getTenant(env, demo.tenantId) : null;
  if (demo && tenant) await deliver(env, tenant, event, demo).catch(() => undefined);
}

/** Queue consumer. Returns how many seconds to wait before running the job again, or "done". */
export async function build(env: Env, job: BuildJob, attempts: number): Promise<"done" | number> {
  const demo = await getDemo(env, job.slug);
  // Ignore jobs from a build that has since been replaced, finished or failed.
  if (!demo || demo.buildStatus !== "building" || demo.buildVersion !== job.version) return "done";
  const { slug, version } = job;
  try {
    if (job.stage === "kit") {
      const site = demo.intake.websiteUrl ? await readWebsite(demo.intake.websiteUrl) : null;
      // Phone, address, hours and map position the business publishes fill whatever was left blank.
      const { intake, filled } = mergeIntake(demo.intake, site?.business);
      if (filled.length) await updateIntake(env, slug, intake);
      // A cheap planning step picks niche-fitting services and describes the preview photos,
      // which Workers AI then generates (free) and the site serves from its own address.
      const plan: Plan | null = await planSite(env, intake, site).catch((e) => (console.log("plan failed", errText(e)), null));
      const images = await previewImages(env, plan?.imagePrompts ?? []);
      await Promise.all(images.map((img) => saveImage(env, slug, version, img.name, img.description, img.bytes)));
      const imgBase = `${env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : ""}/${slug}/_img/${version}/`;
      const previews = images.map((img) => ({ url: imgBase + img.name, description: img.description }));
      const pages = sitemapFor(intake, plan?.services);
      const { kit, usage } = await designKit(env, factsBlock(intake, site, slug, plan, previews), pages);
      // The planning call is counted with the design.
      const u = usage as Record<string, unknown>;
      await saveKit(env, slug, version, kit, { ...u, cost_usd: (Number(u.cost_usd) || 0) + (plan?.cost ?? 0) });
      await savePage(env, slug, version, "/privacy", privacyPage(intake), null);
      await savePage(env, slug, version, "/terms", termsPage(intake), null);
      await touchBuild(env, slug, version, "pages");
      // The pages are written side by side (the queue runs several jobs at once). The home page and
      // the first inner page start at once; the other inner pages wait a little so the prompt they
      // share is already cached when they ask for it.
      await Promise.all(
        pages
          .filter((p) => p.kind === "ai")
          .map((p, n) => env.BUILDS.send({ slug, version, stage: "page", path: p.path }, n <= 1 ? undefined : { delaySeconds: 30 })),
      );
      return "done";
    }
    const kit = await getKit(env, slug, version);
    if (!kit) throw new Error("The site's design went missing. Press Redesign to start again.");
    const spec = pagesOf(kit).find((p) => p.path === job.path);
    if (!spec) return "done";
    if (!(await pagesDone(env, slug, version)).includes(spec.path)) {
      const { page, usage } = await designSitePage(env, kit, spec);
      await savePage(env, slug, version, spec.path, page, usage);
      await touchBuild(env, slug, version, "pages");
    }
    const done = await pagesDone(env, slug, version);
    if (pagesOf(kit).every((p) => done.includes(p.path))) await finishBuild(env, slug, version);
    return "done";
  } catch (e) {
    if (e instanceof TryLater && attempts < BUSY_TRIES) {
      console.log("claude busy, retrying", slug, job.stage);
      await touchBuild(env, slug, version, job.stage === "kit" ? "kit" : "pages");
      return 60;
    }
    // One bad page shouldn't stop the site: write it again (the other pages carry on meanwhile).
    if (job.stage === "page" && !(e instanceof Fatal) && attempts < PAGE_TRIES) {
      console.log("page failed, retrying", slug, job.path, errText(e));
      await touchBuild(env, slug, version, "pages");
      return 5;
    }
    console.error("build failed", slug, job.stage, errText(e));
    await failBuild(env, slug, version, errText(e));
    return "done";
  }
}

