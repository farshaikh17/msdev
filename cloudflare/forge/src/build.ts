/**
 * Building a site in the background: starting a build (credits, limits), and the queue jobs that
 * design it. A "kit" job reads the business's website, plans the site, makes the photos and designs
 * the look; then one "page" job per page writes the pages side by side. The site goes live only
 * when every page is written.
 */
import { HERO_DRAFT } from "./serve";
import {
  buildingCount,
  getDemo,
  getKit,
  getPage,
  pairsDue,
  recentIdeas,
  recentLooks,
  listLibrary,
  saveChrome,
  saveQa,
  setTrade,
  PAIRS_NOTE,
  goLive,
  markBuilding,
  markQueueFailed,
  nextQueued,
  pagesDone,
  saveFailed,
  saveImage,
  saveKit,
  savePage,
  setChangeNote,
  touchBuild,
  updateIntake,
} from "./db";
import type { Kit } from "./designer";
import { lintSite, repairNote, type QaIssue, type QaResult } from "./qa";
import { adaptKit, fixChrome, designKit, designSitePage, factsBlock, Fatal, pagesOf, pairsRule, planPairs, profileNote, planSite, sitemapFor, studioHome, TryLater, type Plan } from "./designer";
import type { BuildJob, Env } from "./env";
import { heroPair, beforeAfterImages, objectImage, previewImages } from "./images";
import { studioMedia, type StudioMedia } from "./media";
import { privacyPage, termsPage } from "./legal";
import { CONCEPT_IDS, conceptById, drawFor, pickConcept } from "./concepts";
import { chooseDesign, ideaOf, wants, writeBrief, type Idea } from "./brief";
import { mergeIntake, reverseGeocode } from "./places";
import { HERO_IDS, heroById, OBJECT_HEROES, pickHero } from "./heroes";
import { matchClips } from "./hero";
import { readWebsite } from "./scrape";
import { buildCost, chargeBuild, getTenant, recordBuildCost, type Tenant } from "./tenants";
import { deliver } from "./webhook";
import { reviewHero, reviewSite } from "./review";

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
  const cost = buildCost((await getDemo(env, slug))?.intake ?? {});
  const kit = resume ? await getKit(env, slug, resume) : null;
  if (resume && kit) {
    if (!(await chargeBuild(env, tenant, slug, resume, userId, cost))) return "no-credits";
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
  if (!(await chargeBuild(env, tenant, slug, version, userId, cost))) return "no-credits";
  await markBuilding(env, slug, version, "kit");
  try {
    await env.BUILDS.send({ slug, version, stage: "kit" });
  } catch (e) {
    await failBuild(env, slug, version, `Couldn't queue the build (${errText(e)}).`);
  }
  return "started";
}

/** Every page is written: go live and tell the account's webhook. */
/**
 * Check a live version against Mianro's QA standards (see qa.ts) on every page, repair what it
 * finds (the shared header and footer once, then up to six pages, each on the mid-priced model),
 * check again, and keep the result for the app to show.
 */
export async function qaPass(env: Env, slug: string, version: string): Promise<QaResult | null> {
  const demo = await getDemo(env, slug);
  let kit = await getKit(env, slug, version);
  if (!demo || !kit) return null;
  const specs = pagesOf(kit);
  const load = async () => (await Promise.all(specs.map(async (p) => ({ path: p.path, page: await getPage(env, slug, version, p.path) })))).flatMap((x) => (x.page ? [{ path: x.path, page: x.page }] : []));
  const first = lintSite(kit, specs, await load(), { phone: demo.intake.phone });
  const repaired: string[] = [];
  let costUsd = 0;
  const cost = (u: unknown) => (costUsd += Number((u as { cost_usd?: number }).cost_usd) || 0);
  if (first.length && env.ANTHROPIC_API_KEY) {
    const shared = first.filter((i) => i.path === "site");
    if (shared.length) {
      try {
        const fixed = await fixChrome(env, kit, repairNote(shared));
        await saveChrome(env, slug, version, fixed.header, fixed.footer);
        kit = { ...kit, header: fixed.header, footer: fixed.footer };
        cost(fixed.usage);
        repaired.push("header and footer");
      } catch (e) {
        console.log("qa: header/footer not repaired", slug, errText(e));
      }
    }
    const byPage = new Map<string, QaIssue[]>();
    for (const i of first) if (i.path !== "site") byPage.set(i.path, [...(byPage.get(i.path) ?? []), i]);
    for (const [path, list] of [...byPage].sort((a, b) => b[1].length - a[1].length).slice(0, 6)) {
      const spec = specs.find((p) => p.path === path);
      const current = await getPage(env, slug, version, path);
      if (!spec || !current || spec.kind !== "ai") continue;
      try {
        const { page, usage } = await designSitePage(env, kit, spec, { instruction: repairNote(list), current, cheap: true });
        await savePage(env, slug, version, path, page, usage);
        cost(usage);
        repaired.push(path);
      } catch (e) {
        console.log("qa: page not repaired", slug, path, errText(e));
      }
    }
  }
  const issues = repaired.length ? lintSite(kit, specs, await load(), { phone: demo.intake.phone }) : first;
  const result: QaResult = { at: new Date().toISOString(), issues, found: first.length, repaired, costUsd };
  await saveQa(env, slug, version, result);
  if (costUsd) await recordBuildCost(env, demo.tenantId, slug, `${version}:qa:${Date.now()}`, costUsd, repaired.length, "change");
  return result;
}

/** Make before/after pictures for sites left showing empty before/after boxes (one site, or the next few). */
export async function fillPairs(env: Env, slug?: string): Promise<number> {
  if (!env.AI || !env.ANTHROPIC_API_KEY) return 0;
  const due = await pairsDue(env, slug);
  for (const d of due) {
    await setChangeNote(env, d.slug, { path: "/gallery", instruction: PAIRS_NOTE, status: "working", error: "", at: new Date().toISOString() });
    await env.BUILDS.send({ slug: d.slug, version: d.version, stage: "pairs" });
  }
  return due.length;
}

async function finishBuild(env: Env, slug: string, version: string): Promise<void> {
  await goLive(env, slug, version);
  await fillPairs(env, slug).catch((e) => console.log("pairs not queued", errText(e)));
  await notify(env, slug, "demo.ready");
  // Look at the live site in a real browser and fix the home page if it isn't good enough.
  await env.BUILDS.send({ slug, version, stage: "review" }).catch((e) => console.log("review not queued", errText(e)));
  await startQueued(env, slug);
}

/** A build that can't finish: record it (refunding the credit) and tell the account's webhook. */
async function failBuild(env: Env, slug: string, version: string, error: string): Promise<void> {
  if (await saveFailed(env, slug, version, error)) await notify(env, slug, "demo.failed");
  await startQueued(env, slug);
}

/**
 * A build slot came free for the account that owns `slug` (or, with a tenant id, for that account):
 * start the oldest demo waiting in its queue. Bulk builds queue what the 3-at-a-time limit can't start.
 */
export async function startQueued(env: Env, slugOrTenant: string | number): Promise<void> {
  const tenantId = typeof slugOrTenant === "number" ? slugOrTenant : (await getDemo(env, slugOrTenant))?.tenantId;
  if (!tenantId) return;
  const tenant = await getTenant(env, tenantId);
  if (!tenant || tenant.status !== "active") return;
  for (let n = 0; n < MAX_PARALLEL_BUILDS; n++) {
    const next = await nextQueued(env, tenantId);
    if (!next) return;
    const r = await startBuild(env, tenant, null, next);
    if (r === "busy" || r === "ai-off") return;
    if (r === "no-credits") await markQueueFailed(env, next, "No credits were left when this build's turn came. Add credits and press Try again.");
  }
}

async function notify(env: Env, slug: string, event: "demo.ready" | "demo.failed"): Promise<void> {
  const demo = await getDemo(env, slug);
  const tenant = demo ? await getTenant(env, demo.tenantId) : null;
  if (demo && tenant) await deliver(env, tenant, event, demo).catch(() => undefined);
}

/** Queue consumer. Returns how many seconds to wait before running the job again, or "done". */
export async function build(env: Env, job: BuildJob, attempts: number): Promise<"done" | number> {
  const demo = await getDemo(env, job.slug);
  // Jobs on the live site (not a build in progress).
  if (job.stage === "review") {
    if (demo && demo.liveVersion === job.version) {
      // Our own QA standards first (no browser needed), so the screenshots are of the repaired site.
      await qaPass(env, job.slug, job.version).catch((e) => console.error("qa pass failed", job.slug, errText(e)));
      await reviewSite(env, job.slug, job.version);
    }
    return "done";
  }
  if (job.stage === "pairs") {
    if (demo && demo.liveVersion === job.version) await addPairs(env, job.slug, job.version, attempts);
    return "done";
  }
  if (job.stage === "change") {
    if (demo && demo.liveVersion === job.version) await applyChange(env, job.slug, job.version, job.path, job.instruction, attempts);
    return "done";
  }
  // Ignore jobs from a build that has since been replaced, finished or failed.
  if (!demo || demo.buildStatus !== "building" || demo.buildVersion !== job.version) return "done";
  const { slug, version } = job;
  try {
    if (job.stage === "kit") {
      const site = demo.intake.websiteUrl ? await readWebsite(demo.intake.websiteUrl) : null;
      // Phone, address, hours and map position the business publishes fill whatever was left blank.
      const { intake, filled } = mergeIntake(demo.intake, site?.business);
      // Built from a map link alone: find the town (and, when it is certain, the street address) from the map position.
      if (!intake.city && !intake.address && intake.mapQuery) {
        const area = await reverseGeocode(intake.mapQuery, intake.businessName);
        if (area) {
          intake.city = area.city;
          if (area.address) intake.address = area.address;
          filled.push("city");
        }
      }
      if (filled.length) await updateIntake(env, slug, intake);
      // A cheap planning step picks niche-fitting services and describes the preview photos,
      // which Workers AI then generates (free) and the site serves from its own address.
      const plan: Plan | null = await planSite(env, intake, site).catch((e) => (console.log("plan failed", errText(e)), null));
      // No trade was typed: use the one the planner worked out (so a bar isn't called "Home Services").
      if (!intake.industry && plan?.trade) {
        intake.industry = plan.trade;
        await setTrade(env, slug, plan.trade);
      }
      // A Studio home page takes its look, its deal within the look and its signature hero before any picture is made.
      const studio = intake.style === "studio";
      const looks = studio ? await recentLooks(env, demo.tenantId, slug).catch(() => []) : [];
      const clips = studio ? matchClips(await listLibrary(env, demo.tenantId).catch(() => []), intake, plan?.services.join(" ") ?? "").length : 0;
      // The brief (a fresh Studio design only): who this business is, worked out before anything is designed.
      // Its idea then chooses the look and the first screen, and heads every writer's instructions.
      let idea: Idea | undefined;
      let briefCost = 0;
      let chosen: { look?: string; hero?: string } = {};
      if (studio && !intake.reuseFrom && env.ANTHROPIC_API_KEY) {
        const nearby = await recentIdeas(env, demo.tenantId, slug, intake.city).catch(() => []);
        const input = { slug, businessName: intake.businessName, trade: intake.industry, town: intake.city, services: intake.services || plan?.services.join(", "), saw: intake.notes, website: site?.text, reviews: intake.reviews };
        const brief = await writeBrief(env, input, nearby.map((n) => `${n.name}: ${n.idea}`), nearby.map((n) => n.lens)).catch((e) => {
          if (e instanceof TryLater || e instanceof Fatal) throw e;
          console.log("brief failed, designing without one", slug, errText(e));
          return null;
        });
        if (brief) {
          idea = ideaOf(brief);
          briefCost = brief.cost;
          const avoid = [...new Set([...nearby.slice(0, 2).map((n) => n.look), ...looks.slice(0, 2).map((l) => l.concept)].filter(Boolean))];
          chosen = chooseDesign(brief, { askedLook: intake.concept, askedHero: intake.hero, recentLooks: avoid, recentHeroes: looks.map((l) => l.hero).filter(Boolean), lookIds: CONCEPT_IDS, heroIds: HERO_IDS, clips });
          console.log("brief", slug, JSON.stringify({ lens: idea.lens, idea: idea.idea, look: chosen.look, hero: chosen.hero, cost: brief.cost }));
        }
      }
      const look = studio ? (conceptById(chosen.look) ?? pickConcept(intake, slug, looks.map((l) => l.concept).filter(Boolean))) : undefined;
      const concept = look?.id;
      // The deal within the look: scene order, the biggest moment, mirroring, menu and footer, unlike the account's recent sites.
      const draw = look ? drawFor(look, slug, looks.map((l) => l.draw).filter(Boolean)) : undefined;
      // The signature hero: the idea's choice; otherwise video scenes when the trade has library clips, otherwise one
      // the account hasn't used lately (never one built around an object when the idea has none).
      const noObject = !!idea && !wants(idea.object);
      const heroId = look ? (chosen.hero ?? pickHero(intake, slug, looks.map((l) => l.hero).filter(Boolean), clips, noObject ? OBJECT_HEROES : []).id) : undefined;
      const sig = heroById(heroId);
      // The object is drawn when the idea asks for one (or the first screen is built around it).
      const wantObject = !idea || wants(idea.object) || OBJECT_HEROES.includes(heroId ?? "");
      // The magazine-cover hero needs room above its subject for the giant word to pass behind.
      const prompts = [...(plan?.imagePrompts ?? [])];
      if (sig?.media === "breakout" && prompts[0]) prompts[0] = `${prompts[0].replace(/[.\s]+$/, "")}. The main subject is large and close, its head and shoulders near the top of the frame and clearly separated from a plain background.`;
      else if (sig?.media === "front" && prompts[0]) prompts[0] = `${prompts[0].replace(/[.\s]+$/, "")}. Shot from a little further back: the main subject stands in the lower two-thirds of the frame, slightly off-centre, with plain open background above and around their head and shoulders.`;
      const [images, pairImages] = await Promise.all([previewImages(env, prompts), beforeAfterImages(env, plan?.pairs ?? []).catch(() => [])]);
      // (The framing note is for the image generator, not the photo's description.)
      if (images[0]?.name === "photo-1.jpg" && plan?.imagePrompts[0]) images[0] = { ...images[0], description: plan.imagePrompts[0] };
      // A Studio first screen gets a matched second picture that shows through a spotlight; it replaces the first photo with its aligned twin.
      if (intake.style === "studio" && plan?.reveal && images[0] && sig?.media === "pair") {
        const pair = await heroPair(env, plan.imagePrompts[0] ?? "", plan.reveal).catch(() => null);
        if (pair) {
          images[0] = { ...images[0], bytes: pair.base };
          images.push({ name: "reveal-1.jpg", description: plan.reveal, bytes: pair.reveal });
        }
      }
      await Promise.all([...images, ...pairImages].map((img) => saveImage(env, slug, version, img.name, img.description, img.bytes)));
      const imgBase = `${env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : ""}/${slug}/_img/${version}/`;
      const previews = images.filter((img) => img.name.startsWith("photo-")).map((img) => ({ url: imgBase + img.name, description: img.description }));
      // A pair is only offered when both of its pictures came out.
      const pairs = [1, 2].flatMap((n) => {
        const b = pairImages.find((p) => p.name === `ba-${n}-before.jpg`);
        const a = pairImages.find((p) => p.name === `ba-${n}-after.jpg`);
        return b && a ? [{ beforeUrl: `${imgBase}ba-${n}-before.jpg`, afterUrl: `${imgBase}ba-${n}-after.jpg`, before: b.description.replace(/^Before: /, ""), after: a.description.replace(/^After: /, "") }] : [];
      });
      const pages = sitemapFor(intake, plan?.services);
      // A Studio home page takes its order and layouts from its art direction, not the standard section list.
      if (concept && pages[0]) pages[0] = { ...pages[0], brief: studioHome(pages, concept, draw, heroId, slug, idea) };
      // Built on another of the account's finished sites: reuse its design (far cheaper than a new one).
      let base: { slug: string; version: string; kit: Kit } | null = null;
      if (intake.reuseFrom && intake.reuseFrom !== slug) {
        const src = await getDemo(env, intake.reuseFrom);
        const srcKit = src && src.tenantId === demo.tenantId && src.liveVersion ? await getKit(env, src.slug, src.liveVersion) : null;
        if (src && srcKit && src.liveVersion) base = { slug: src.slug, version: src.liveVersion, kit: srcKit };
      }
      // The hero this site will open with (a reused design keeps the one it was designed around).
      const heroSig = base ? heroById(base.kit.hero) : (sig ?? (heroId === "own" ? { id: "own", media: "photo" as const } : undefined));
      const objectNote = studio && plan?.object && wantObject ? `\n\nOBJECT (the signature object our system supplies, cut out): ${plan.object}.` : "";
      const facts = factsBlock(intake, site, slug, plan, previews, pairs) + profileNote(intake) + (draw ? `\n\nFor this site the menu is ${draw.nav}, and the footer is ${draw.footer}.` : "") + objectNote;
      // A Studio hero's own media (its object and turning frames, a cut-out subject, a moving hero) is made while the design is written.
      const photo1 = images.find((img) => img.name === "photo-1.jpg")?.bytes ?? null;
      const mediaJob: Promise<StudioMedia | null> =
        intake.style === "studio" && heroSig
          ? studioMedia(env, { save: (n, d, b) => saveImage(env, slug, version, n, d, b), drawObject: (p) => objectImage(env, p) }, version, heroSig, wantObject ? plan : plan && { ...plan, object: undefined }, photo1, clips > 0).catch((e) => (console.error("studio media failed", slug, errText(e)), null))
          : Promise.resolve(null);
      const [{ kit, usage }, made] = await Promise.all([
        base ? adaptKit(env, base.kit, { slug: base.slug, version: base.version }, facts, pages) : designKit(env, facts, pages, intake.style, concept, draw, heroId, idea),
        mediaJob,
      ]);
      if (made?.made.length) console.log("studio media", slug, JSON.stringify(made));
      // The planning call and any generated video are counted with the design.
      const u = usage as Record<string, unknown>;
      await saveKit(env, slug, version, kit, { ...u, cost_usd: (Number(u.cost_usd) || 0) + (plan?.cost ?? 0) + briefCost + (made?.cost ?? 0) });
      await savePage(env, slug, version, "/privacy", privacyPage(intake), null);
      await savePage(env, slug, version, "/terms", termsPage(intake), null);
      await touchBuild(env, slug, version, "pages");
      // The pages are written side by side (the queue runs several jobs at once). The home page and
      // the first inner page start at once; the other inner pages wait a little so the prompt they
      // share is already cached when they ask for it.
      // A fresh Studio design builds its first screen alone and looks at it in a browser before the
      // home page is written; the inner pages don't wait for that.
      const heroFirst = intake.style === "studio" && !base && !!env.BROWSER;
      if (heroFirst) await env.BUILDS.send({ slug, version, stage: "hero" });
      await Promise.all(
        pages
          .filter((p) => p.kind === "ai" && !(heroFirst && p.path === "/"))
          .map((p, n) => env.BUILDS.send({ slug, version, stage: "page", path: p.path }, n <= 1 ? undefined : { delaySeconds: 30 })),
      );
      return "done";
    }
    if (job.stage === "hero") {
      const kit = await getKit(env, slug, version);
      const spec = kit ? pagesOf(kit).find((p) => p.path === "/") : null;
      if (kit && spec && !(await getPage(env, slug, version, HERO_DRAFT))) {
        try {
          let { page, usage } = await designSitePage(env, kit, spec, { heroOnly: true });
          await savePage(env, slug, version, HERO_DRAFT, page, usage);
          await touchBuild(env, slug, version, "pages");
          const look = await reviewHero(env, slug, version, kit);
          if (look?.notes.length) {
            // One more go with what the browser and the critique found; the cost of both is kept.
            const cost = (Number((usage as { cost_usd?: number }).cost_usd) || 0) + look.costUsd;
            ({ page, usage } = await designSitePage(env, kit, spec, { heroOnly: true, notes: look.notes, current: page }));
            await savePage(env, slug, version, HERO_DRAFT, page, { ...(usage as object), cost_usd: (Number((usage as { cost_usd?: number }).cost_usd) || 0) + cost });
          } else if (look) {
            await savePage(env, slug, version, HERO_DRAFT, page, { ...(usage as object), cost_usd: (Number((usage as { cost_usd?: number }).cost_usd) || 0) + look.costUsd });
          }
        } catch (e) {
          if (e instanceof TryLater || e instanceof Fatal) throw e;
          // The first screen couldn't be built on its own: the home page is written in one go instead.
          console.log("hero first failed, writing the home page whole", slug, errText(e));
        }
      }
      await env.BUILDS.send({ slug, version, stage: "page", path: "/" });
      return "done";
    }
    const kit = await getKit(env, slug, version);
    if (!kit) throw new Error("The site's design went missing. Press Redesign to start again.");
    const spec = pagesOf(kit).find((p) => p.path === job.path);
    if (!spec) return "done";
    if (!(await pagesDone(env, slug, version)).includes(spec.path)) {
      // The home page of a reused design follows the sister site's home page.
      const adaptFrom = kit.reuse && spec.path === "/" ? await getPage(env, kit.reuse.slug, kit.reuse.version, "/") : null;
      const hero = spec.path === "/" ? await getPage(env, slug, version, HERO_DRAFT) : null;
      const { page, usage } = await designSitePage(env, kit, spec, adaptFrom ? { adaptFrom } : hero ? { hero } : {});
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

/** A change request on one page of the live site: the page is written again with the instruction, on the cheaper model. */
async function applyChange(env: Env, slug: string, version: string, path: string, instruction: string, attempts: number): Promise<void> {
  const note = (status: "working" | "done" | "failed", error = "") => setChangeNote(env, slug, { path, instruction, status, error, at: new Date().toISOString() });
  try {
    const kit = await getKit(env, slug, version);
    const spec = kit ? pagesOf(kit).find((p) => p.path === path) : null;
    const current = await getPage(env, slug, version, path);
    if (!kit || !spec || !current) return void (await note("failed", "That page isn't part of the live site."));
    const { page, usage } = await designSitePage(env, kit, spec, { instruction, current });
    await savePage(env, slug, version, path, page, usage);
    const demo = await getDemo(env, slug);
    const u = usage as { cost_usd?: number };
    if (demo) await recordBuildCost(env, demo.tenantId, slug, `${version}:change:${Date.now()}`, Number(u.cost_usd) || 0, 1, "change");
    await note("done");
  } catch (e) {
    if (e instanceof TryLater && attempts < BUSY_TRIES) throw e;
    await note("failed", errText(e));
  }
}

/** The pages a before/after feature belongs on, when the site has them. */
const PAIR_PAGES = ["/gallery", "/"];

/**
 * Add illustrative before/after photos to a site that is already live: plan the scenes (Haiku),
 * make the pictures, save them under the live version, then have the gallery and home page written
 * again around them. No credit is taken: the cost is a few cents, recorded as a change.
 */
async function addPairs(env: Env, slug: string, version: string, attempts: number): Promise<void> {
  const note = (status: "working" | "done" | "failed", error = "") => setChangeNote(env, slug, { path: "/gallery", instruction: PAIRS_NOTE, status, error, at: new Date().toISOString() });
  try {
    const demo = await getDemo(env, slug);
    const kit = await getKit(env, slug, version);
    if (!demo || !kit) return void (await note("failed", "The site isn't live yet."));
    const { pairs, cost } = await planPairs(env, demo.intake);
    if (!pairs.length) {
      // Nothing visibly changes in this trade: take the empty before/after boxes off instead of leaving them.
      for (const path of PAIR_PAGES) {
        const spec = pagesOf(kit).find((p) => p.path === path);
        const current = await getPage(env, slug, version, path);
        if (!spec || !current || !/photo appears here/i.test(current.body)) continue;
        const { page, usage } = await designSitePage(env, kit, spec, { instruction: 'Remove the before/after area and its "Your before photo appears here" / "Your after photo appears here" placeholder boxes entirely, closing the gap cleanly. Keep everything else as it is.', current });
        await savePage(env, slug, version, path, page, usage);
      }
      return void (await note("done"));
    }
    const made = await beforeAfterImages(env, pairs);
    await Promise.all(made.map((img) => saveImage(env, slug, version, img.name, img.description, img.bytes)));
    const base = `${env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : ""}/${slug}/_img/${version}/`;
    const ready = [1, 2].flatMap((n) => {
      const b = made.find((p) => p.name === `ba-${n}-before.jpg`);
      const a = made.find((p) => p.name === `ba-${n}-after.jpg`);
      return b && a ? [{ beforeUrl: `${base}ba-${n}-before.jpg`, afterUrl: `${base}ba-${n}-after.jpg`, before: b.description.replace(/^Before: /, ""), after: a.description.replace(/^After: /, "") }] : [];
    });
    if (!ready.length) return void (await note("failed", "The picture generator couldn't make the pairs right now (its daily allowance may be used up). Try again later."));
    const instruction = `${pairsRule(ready)}\n\nReplace any "Your before photo appears here" or "photo coming soon" placeholder tiles with this feature, and keep everything else as it is.`;
    let usd = cost;
    for (const path of PAIR_PAGES) {
      const spec = pagesOf(kit).find((p) => p.path === path);
      const current = await getPage(env, slug, version, path);
      if (!spec || !current) continue;
      const { page, usage } = await designSitePage(env, kit, spec, { instruction, current });
      await savePage(env, slug, version, path, page, usage);
      usd += Number((usage as { cost_usd?: number }).cost_usd) || 0;
    }
    await recordBuildCost(env, demo.tenantId, slug, `${version}:pairs:${Date.now()}`, usd, 3, "change");
    await note("done");
  } catch (e) {
    if (e instanceof TryLater && attempts < BUSY_TRIES) throw e;
    await note("failed", errText(e));
  }
}
