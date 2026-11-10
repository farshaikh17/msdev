/**
 * The after-build features: the automatic review (screenshots, checks, critique, fix) with a stand-in
 * browser, its monthly budget, who looked at a demo, the outreach kit, change requests, quick text
 * fixes, bulk builds with a queue, and the before/after pitch page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../cloudflare/forge/src/index";
import { designKit, designSitePage, planPairs, planSite } from "../cloudflare/forge/src/designer";
import { beforeAfterImages } from "../cloudflare/forge/src/images";
import { countView, getDemo, getPage, getReview, viewStats } from "../cloudflare/forge/src/db";
import type { BuildJob, Env, VideoJob } from "../cloudflare/forge/src/env";
import { qrSvg } from "../cloudflare/forge/src/outreach";
import { pitchPage } from "../cloudflare/forge/src/pitch";
import { BROWSER_BUDGET_SECONDS, browserUsed, reviewSite, scoreOld, type Browser, type ReviewDeps } from "../cloudflare/forge/src/review";
import { readWebsite } from "../cloudflare/forge/src/scrape";
import { ogHtml } from "../cloudflare/forge/src/site";
import { getTenant } from "../cloudflare/forge/src/tenants";
import { build, call, html, loc, makeAccount, makeHarness, setupAdmin, slugOf, type Harness } from "./forge-harness";

vi.mock("../cloudflare/forge/src/designer", async (orig) => {
  const real = await orig<typeof import("../cloudflare/forge/src/designer")>();
  return { ...real, planSite: vi.fn(), planPairs: vi.fn(), designKit: vi.fn(), designSitePage: vi.fn() };
});
vi.mock("../cloudflare/forge/src/images", () => ({ beforeAfterImages: vi.fn(async () => []), previewImages: vi.fn(async () => [{ name: "photo-1.jpg", description: "a shop", bytes: new Uint8Array([1]) }]) }));
vi.mock("../cloudflare/forge/src/scrape", () => ({ readWebsite: vi.fn() }));
vi.mock("../cloudflare/forge/src/outreach", async (orig) => {
  const real = await orig<typeof import("../cloudflare/forge/src/outreach")>();
  return { ...real, writeOutreach: vi.fn(async () => ({ subject: "A new website for Bravo Barbers", email: "Hi there, EMAIL", sms: "SMS text", call: "CALL script", at: new Date().toISOString(), costUsd: 0.0004 })) };
});

type Job = BuildJob | VideoJob;
async function drain(h: Harness, max = 200): Promise<void> {
  for (let n = 0; n < max && h.queued.length; n++) {
    const { body } = h.queued.shift()!;
    let again = false;
    await worker.queue({ messages: [{ body: body as Job, attempts: 1, ack: () => undefined, retry: () => void (again = true) }] }, h.env);
    if (again) h.queued.push({ body });
  }
}

const goodKit = (_env: Env, brief: string, pages: unknown) => ({
  kit: { theme: "light" as const, accent: "#aa3333", fonts: "", css: "", header: '<header><a href="/">Home</a></header>', footer: "<footer><!--mianro-credit--></footer>", script: "", components: "", brief, pages: pages as never },
  usage: { cost_usd: 0.4, model: "stub" },
});
const goodPage = (spec: { name: string }, extra = "") => ({ page: { title: spec.name, description: "d", css: "", body: `<main><h1>${spec.name}</h1><p>About us. ${extra}</p></main>` }, usage: { cost_usd: 0.01, model: "stub" } });

/** A browser that "renders" whatever facts the test wants and hands back tiny JPEG-ish bytes. */
function fakeBrowser(facts: Record<string, unknown>, opts: { failOld?: boolean } = {}): { browser: Browser; visited: string[] } {
  const visited: string[] = [];
  const page = {
    setViewport: async () => undefined,
    goto: async (url: string) => {
      visited.push(url);
      if (opts.failOld && !url.includes("sites.test")) throw new Error("old site timed out");
    },
    screenshot: async () => new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]),
    evaluate: async () => facts as never,
    on: () => undefined,
    close: async () => undefined,
  };
  return { browser: { newPage: async () => page as never, close: async () => undefined }, visited };
}
const goodFacts = (links: string[]) => ({ overflow: false, h1: 1, noAlt: 0, brokenImgs: 0, links, hasViewport: true, tel: true, forms: 1, textPx: 16, words: 400, https: true });

let h: Harness;
beforeEach(() => {
  h = makeHarness();
  vi.mocked(planSite).mockResolvedValue({ services: ["Haircuts", "Beard Trims", "Hot Shaves", "Kids Cuts"], imagePrompts: ["a shop"], cost: 0.002 });
  vi.mocked(designKit).mockImplementation(async (env, brief, pages) => goodKit(env, brief, pages));
  vi.mocked(designSitePage).mockImplementation(async (_env, _kit, spec, rev) => goodPage(spec, rev?.instruction ? `CHANGED: ${rev.instruction}` : rev?.notes?.length ? `FIXED: ${rev.notes.length} notes` : ""));
  vi.mocked(readWebsite).mockResolvedValue(null);
  vi.mocked(beforeAfterImages).mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

async function liveDemo(credits = 5, name = "Bravo Barbers") {
  const admin = await setupAdmin(h);
  const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", credits);
  const slug = slugOf(await build(h, b.cookie, name));
  await drain(h);
  const demo = (await getDemo(h.env, slug))!;
  expect(demo.buildStatus).toBe("ready");
  return { admin, b, slug, demo };
}

describe("the automatic review", () => {
  it("is queued after go-live and, without a browser, records why it was skipped", async () => {
    const { slug, demo } = await liveDemo();
    const r = await getReview(h.env, slug, demo.liveVersion!);
    expect(r?.skipped).toBe("no browser");
  });

  it("screenshots, checks, critiques, and writes the home page again when the score is low", async () => {
    const { slug, demo, b } = await liveDemo();
    const version = demo.liveVersion!;
    const links = ["/" + slug, `/${slug}/about`, `/${slug}/nowhere`, "tel:+15555555555"];
    const { browser, visited } = fakeBrowser(goodFacts(links));
    const critique = vi.fn<ReviewDeps["critique"]>(async () => ({ score: 5, verdict: "Flat hero.", strengths: ["Clear phone"], issues: [{ what: "Hero lacks contrast", fix: "Darken the overlay", severity: "high" as const }], costUsd: 0.012 }));
    const deps: ReviewDeps = { launch: async () => browser, critique, sleep: async () => undefined };
    const env = { ...h.env, BROWSER: {} } as Env;
    const r = await reviewSite(env, slug, version, deps);
    expect(r.skipped).toBeUndefined();
    expect(r.score).toBe(5);
    expect(r.shots).toEqual(["shot-desktop.jpg", "shot-phone.jpg", "og.jpg"]);
    expect(visited[0]).toContain(`https://sites.test/${slug}?r=${version}`);
    // The dead link was caught; the fix pass got the failed check and the high issue.
    expect(r.checks?.find((c) => c.id === "links")?.ok).toBe(false);
    expect(r.fixed).toBe(true);
    const notes = vi.mocked(designSitePage).mock.calls.find((c) => c[3]?.notes)![3]!.notes!;
    expect(notes.join("\n")).toContain("Every link goes to a real page: FAILED");
    expect(notes.join("\n")).toContain("Darken the overlay");
    expect((await getPage(h.env, slug, version, "/"))!.body).toContain("FIXED: 2 notes");
    // Saved on the version, the screenshots are servable, the cost is on the account, and browser time was counted.
    expect((await getReview(h.env, slug, version))?.fixed).toBe(true);
    const saved = (h.db.prepare("SELECT name FROM site_images WHERE slug = ? AND version = ? ORDER BY name").all(slug, version) as { name: string }[]).map((x) => x.name);
    expect(saved).toEqual(["og.jpg", "photo-1.jpg", "shot-desktop.jpg", "shot-phone.jpg"]);
    const costs = h.db.prepare("SELECT outcome, usd FROM build_costs WHERE tenant_id = ? ORDER BY rowid").all(b.id) as { outcome: string; usd: number }[];
    expect(costs.map((c) => c.outcome)).toEqual(["ready", "review"]);
    expect(costs[1]!.usd).toBeCloseTo(0.012 + 0.01, 5);
    expect((await browserUsed(h.env)).seconds).toBeGreaterThanOrEqual(0);
  });

  it("leaves a good page alone, and captures the old website for the pitch page", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Bravo Barbers", city: "Orlando, FL", websiteUrl: "https://old.example.com" } }));
    await drain(h);
    const version = (await getDemo(h.env, slug))!.liveVersion!;
    const { browser, visited } = fakeBrowser({ ...goodFacts([`/${slug}/about`]), hasViewport: false, textPx: 12 });
    const deps: ReviewDeps = { launch: async () => browser, sleep: async () => undefined, critique: async () => ({ score: 9, verdict: "Lovely.", strengths: [], issues: [{ what: "minor", fix: "tiny", severity: "low" as const }], costUsd: 0.01 }) };
    const r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, deps);
    expect(r.fixed).toBeUndefined();
    expect(vi.mocked(designSitePage).mock.calls.some((c) => c[3]?.notes)).toBe(false);
    expect(visited.some((u) => u.startsWith("https://old.example.com"))).toBe(true);
    expect(r.old).toMatchObject({ url: "https://old.example.com", loaded: true });
    expect(r.old!.score).toBeLessThan(8); // no viewport, small text (the same facts stand in for the old site)
    expect(r.shots).toContain("old-desktop.jpg");
    // The pitch page shows both sides.
    const res = await worker.fetch(new Request(`https://sites.test/${slug}/_pitch`), { ...h.env, ROLE: "sites" } as Env, { waitUntil: () => undefined } as never);
    expect(res.status).toBe(200);
    const page = await res.text();
    expect(page).toContain("before and after");
    expect(page).toContain("old-desktop.jpg");
    expect(page).toContain("9</b>");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("stops at the monthly browser budget, and survives a browser that fails", async () => {
    const { slug, demo } = await liveDemo();
    const version = demo.liveVersion!;
    const key = (await browserUsed(h.env)).key;
    h.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(BROWSER_BUDGET_SECONDS));
    const launch = vi.fn();
    const r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, { launch, critique: vi.fn() });
    expect(r.skipped).toContain("budget");
    expect(launch).not.toHaveBeenCalled();
    h.db.prepare("DELETE FROM settings WHERE key = ?").run(key);
    const broken = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, { launch: async () => { throw new Error("429 Too many requests"); }, critique: vi.fn() });
    expect(broken.skipped).toContain("429");
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
  });

  it("scores an old website in a way a rep can explain", () => {
    expect(scoreOld(null).score).toBe(1);
    expect(scoreOld(goodFacts([]) as never).score).toBe(10);
    const bad = scoreOld({ ...goodFacts([]), hasViewport: false, overflow: true, https: false, tel: false } as never);
    expect(bad.score).toBe(4);
    expect(bad.checks.filter((c) => !c.ok).map((c) => c.id)).toEqual(["viewport", "overflow-phone", "https", "tel"]);
  });
});

describe("who looked at a demo", () => {
  it("counts views and visitors per day and shows them on the dashboard and the demo page", async () => {
    const { slug, b } = await liveDemo();
    const first = await countView(h.env, slug, "visitor-a");
    expect(first).toMatchObject({ firstToday: true, views: 1, visitors: 1 });
    await countView(h.env, slug, "visitor-a");
    const third = await countView(h.env, slug, "visitor-b");
    expect(third).toMatchObject({ firstToday: false, views: 3, visitors: 2 });
    const st = (await viewStats(h.env, { tenantId: b.id })).get(slug)!;
    expect(st).toMatchObject({ today: 3, week: 3, month: 3, visitorsWeek: 2 });
    expect(st.days).toHaveLength(1);
    const page = await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }));
    expect(page).toContain("Who's looked");
    expect(page).toContain(">3<");
  });

  it("gives every served page link-preview tags", () => {
    const tags = ogHtml({ title: "Bravo | Barbers", description: "Cuts.", url: "https://sites.test/bravo", image: "https://sites.test/bravo/_img/v1/og.jpg" });
    expect(tags).toContain('property="og:image" content="https://sites.test/bravo/_img/v1/og.jpg"');
    expect(tags).toContain("summary_large_image");
    expect(ogHtml({ title: "x", description: "y", url: "z", image: null })).not.toContain("og:image");
  });
});

describe("outreach, changes and quick fixes", () => {
  it("writes an outreach kit on request and shows it with a QR code", async () => {
    const { slug, b } = await liveDemo();
    let page = await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }));
    expect(page).toContain("Write the outreach");
    expect(page).toContain("<svg"); // the QR code
    expect(qrSvg("https://sites.test/x")).toContain("<svg");
    await call(h, `/demos/${slug}/outreach`, { cookie: b.cookie, form: {} });
    page = await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }));
    expect(page).toContain("A new website for Bravo Barbers");
    expect(page).toContain("CALL script");
    expect((await getDemo(h.env, slug))!.outreach?.sms).toBe("SMS text");
  });

  it("applies a change request to one page in the background", async () => {
    const { slug, b, demo } = await liveDemo();
    const version = demo.liveVersion!;
    const r = await call(h, `/demos/${slug}/change`, { cookie: b.cookie, form: { path: "/about", instruction: "Add a financing section" } });
    expect(loc(r)).toContain("Applying your change");
    expect((await getDemo(h.env, slug))!.changeNote).toMatchObject({ path: "/about", status: "working" });
    expect(h.queued.map((q) => (q.body as BuildJob).stage)).toEqual(["change"]);
    await drain(h);
    expect((await getPage(h.env, slug, version, "/about"))!.body).toContain("CHANGED: Add a financing section");
    expect((await getPage(h.env, slug, version, "/"))!.body).not.toContain("CHANGED");
    expect((await getDemo(h.env, slug))!.changeNote?.status).toBe("done");
    expect((h.db.prepare("SELECT count(*) c FROM build_costs WHERE outcome = 'change'").get() as { c: number }).c).toBe(1);
    // Nonsense is refused before anything is queued.
    expect(loc(await call(h, `/demos/${slug}/change`, { cookie: b.cookie, form: { path: "/nope", instruction: "Add a financing section" } }))).toContain("Pick one of the site");
    expect(loc(await call(h, `/demos/${slug}/change`, { cookie: b.cookie, form: { path: "/about", instruction: "x" } }))).toContain("Say what should change");
  });

  it("replaces an exact phrase on every page without AI", async () => {
    const { slug, b, demo } = await liveDemo();
    const version = demo.liveVersion!;
    const r = await call(h, `/demos/${slug}/replace`, { cookie: b.cookie, form: { find: "About us.", replace: "Call Tom & Co." } });
    expect(loc(r)).toMatch(/Replaced "About us." in \d+ places/);
    expect((await getPage(h.env, slug, version, "/about"))!.body).toContain("Call Tom &amp; Co.");
    expect(loc(await call(h, `/demos/${slug}/replace`, { cookie: b.cookie, form: { find: "zzz-not-there", replace: "x" } }))).toContain("wasn't found");
  });
});

describe("bulk builds", () => {
  it("starts three, queues the rest, and starts queued ones as slots free up", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 10);
    const r = await call(h, "/demos/bulk", { cookie: b.cookie, form: { bulk: "Alpha Plumbing | Tampa, FL\nBeta Dental | Austin, TX\nGamma Roofing\nDelta Cleaning\nEpsilon Pest", style: "standard" } });
    expect(loc(r)).toContain("Started 3 builds, 2 queued");
    const statuses = () => (h.db.prepare("SELECT business_name n, build_status s FROM demos ORDER BY created_at").all() as { n: string; s: string }[]).map((x) => `${x.n}:${x.s}`);
    expect(statuses().filter((x) => x.endsWith(":queued"))).toEqual(["Delta Cleaning:queued", "Epsilon Pest:queued"]);
    expect((await getTenant(h.env, b.id))!.credits).toBe(7); // queued ones aren't charged yet
    const home = await html(await call(h, "/", { cookie: b.cookie }));
    expect(home).toContain("Waiting its turn");
    await drain(h);
    expect(statuses().every((x) => x.endsWith(":ready"))).toBe(true);
    expect((await getTenant(h.env, b.id))!.credits).toBe(5);
  });

  it("checks the credits for the whole batch first", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const r = await call(h, "/demos/bulk", { cookie: b.cookie, form: { bulk: "A\nB\nC", style: "studio" } });
    expect(loc(r)).toContain("3 Studio builds need 9 credits and this account has 2");
    expect((h.db.prepare("SELECT count(*) c FROM demos").get() as { c: number }).c).toBe(0);
  });
});

describe("the pitch page on its own", () => {
  it("renders without an old site", () => {
    const demo = { intake: { businessName: "Bravo Barbers", websiteUrl: "" }, slug: "bravo" } as never;
    const page = pitchPage(demo, { at: "", score: 8, checks: [{ id: "h1", label: "One heading", ok: true }], shots: ["shot-desktop.jpg", "shot-phone.jpg"], old: null }, { site: "https://sites.test/bravo", img: (n) => `/bravo/_img/v/${n}` }, "credit");
    expect(page).toContain("couldn't find a website");
    expect(page).toContain("/bravo/_img/v/shot-desktop.jpg");
  });
});

describe("illustrative before/after pairs", () => {
  it("are generated in two steps (the after uses the before as its reference), kept only when both come out, and counted against the day", async () => {
    const { beforeAfterImages, DAILY_IMAGES } = await vi.importActual<typeof import("../cloudflare/forge/src/images")>("../cloudflare/forge/src/images");
    const calls: { prompt: string; hasRef: boolean; w: string }[] = [];
    let n = 0;
    const AI = {
      run: async (_m: string, input: { multipart: { body: ReadableStream; contentType: string } }) => {
        const form = await new Response(input.multipart.body, { headers: { "content-type": input.multipart.contentType } }).formData();
        calls.push({ prompt: String(form.get("prompt")), hasRef: form.has("input_image_0"), w: String(form.get("width")) });
        return { image: btoa(`img${++n}`) };
      },
    };
    const env = { ...h.env, AI } as unknown as Env;
    const out = await beforeAfterImages(env, [{ before: "an overgrown yard", after: "a landscaped yard" }, { before: "a stained patio", after: "a clean patio" }]);
    expect(out.map((x) => x.name)).toEqual(["ba-1-before.jpg", "ba-1-after.jpg", "ba-2-before.jpg", "ba-2-after.jpg"]);
    expect(calls.filter((c) => c.hasRef)).toHaveLength(2);
    expect(calls.every((c) => c.w === "512")).toBe(true);
    expect(calls.find((c) => c.hasRef)!.prompt).toContain("image 0 as the exact reference");
    // A failed "after" drops the whole pair; nothing is half-shown.
    let k = 0;
    const flaky = { run: async (_m: string, input: { multipart: { body: ReadableStream; contentType: string } }) => {
      const form = await new Response(input.multipart.body, { headers: { "content-type": input.multipart.contentType } }).formData();
      if (form.has("input_image_0") && ++k === 1) throw new Error("model busy");
      return { image: btoa("x") };
    } };
    expect((await beforeAfterImages({ ...h.env, AI: flaky } as unknown as Env, [{ before: "a", after: "b" }, { before: "c", after: "d" }])).map((x) => x.name)).toEqual(["ba-2-before.jpg", "ba-2-after.jpg"]);
    // Past the day's allowance nothing is generated.
    h.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`ai-images:${new Date().toISOString().slice(0, 10)}`, String(DAILY_IMAGES));
    expect(await beforeAfterImages(env, [{ before: "a", after: "b" }])).toEqual([]);
  });

  it("the planner's PAIRS lines are read, and NONE means no pairs", async () => {
    const { planSite: realPlan } = await vi.importActual<typeof import("../cloudflare/forge/src/designer")>("../cloudflare/forge/src/designer");
    expect(typeof realPlan).toBe("function");
    const re = /^BEFORE:\s*(.+?)\s*\|\|\s*AFTER:\s*(.+)$/i;
    expect("BEFORE: weedy dead lawn || AFTER: lush striped lawn".match(re)?.slice(1)).toEqual(["weedy dead lawn", "lush striped lawn"]);
    expect("NONE".match(re)).toBeNull();
  });

  it("the site's brief carries the pairs with the 'Illustrative sample' rule", async () => {
    const { factsBlock } = await vi.importActual<typeof import("../cloudflare/forge/src/designer")>("../cloudflare/forge/src/designer");
    const { Intake } = await import("../src/forge/schema");
    const brief = factsBlock(Intake.parse({ businessName: "Olvin's Landscaping" }), null, "olvins-1", null, [], [{ beforeUrl: "https://s/ba-1-before.jpg", afterUrl: "https://s/ba-1-after.jpg", before: "dead lawn", after: "lush lawn" }]);
    expect(brief).toContain("ba-1-before.jpg");
    expect(brief).toContain("Illustrative sample. Your real before and after photos replace these at launch.");
    expect(brief).toContain('Do NOT show the "Your before photo appears here" placeholder tiles');
    expect(factsBlock(Intake.parse({ businessName: "Xavier Roofing" }), null, "x-1a2b", null, [], [])).not.toContain("before/after pairs");
  });
});

describe("the review's browser snippet", () => {
  it("is an expression that calls the function, and a missing or empty result can't crash the checks", async () => {
    const { FACTS, factsOf } = await import("../cloudflare/forge/src/review");
    expect(FACTS.startsWith("(() =>")).toBe(true);
    expect(FACTS.trimEnd().endsWith(")()")).toBe(true);
    expect(() => new Function(`return ${FACTS}`)).not.toThrow();
    for (const bad of [undefined, null, {}, "x", { links: "nope" }]) {
      const f = factsOf(bad);
      expect(Array.isArray(f.links)).toBe(true);
      expect(f.h1).toBe(0);
    }
  });

  it("a crashed review is retried by the hourly catch-up at most three times, an hour apart", async () => {
    const { reviewsDue } = await import("../cloudflare/forge/src/db");
    const { slug, demo } = await liveDemo();
    const version = demo.liveVersion!;
    const set = (r: object | null) => h.db.prepare("UPDATE site_versions SET review = ? WHERE slug = ? AND version = ?").run(r ? JSON.stringify(r) : null, slug, version);
    set(null);
    expect((await reviewsDue(h.env)).map((x) => x.slug)).toEqual([slug]);
    set({ at: new Date().toISOString(), skipped: "error: boom", tries: 1 });
    expect(await reviewsDue(h.env)).toEqual([]); // too soon
    set({ at: new Date(Date.now() - 2 * 3_600_000).toISOString(), skipped: "error: boom", tries: 1 });
    expect(await reviewsDue(h.env)).toHaveLength(1);
    set({ at: new Date(Date.now() - 2 * 3_600_000).toISOString(), skipped: "error: boom", tries: 3 });
    expect(await reviewsDue(h.env)).toEqual([]); // given up
    set({ at: new Date(Date.now() - 2 * 3_600_000).toISOString(), skipped: "browser budget for this month is used up" });
    expect(await reviewsDue(h.env)).toEqual([]); // not an error: left alone
    set({ at: new Date().toISOString(), score: 8, shots: [] });
    expect(await reviewsDue(h.env)).toEqual([]); // fine
  });
});

describe("Studio art directions", () => {
  it("has nine distinct directions, each with a full brief", async () => {
    const { CONCEPTS } = await import("../cloudflare/forge/src/concepts");
    expect(CONCEPTS.map((c) => c.id)).toEqual(["editorial", "kinetic", "cinematic", "brutalist", "swiss", "organic", "americana", "playful", "luxe"]);
    for (const c of CONCEPTS) {
      expect(c.brief.length).toBeGreaterThan(400);
      expect(c.brief).toContain("Do NOT");
    }
  });

  it("picks one that suits the trade, stays the same for a site, and varies between sites", async () => {
    const { pickConcept, conceptById } = await import("../cloudflare/forge/src/concepts");
    const plumber = { industry: "Plumbing", businessName: "Acme Plumbing" };
    const picks = new Set(Array.from({ length: 40 }, (_, i) => pickConcept(plumber, `acme-plumbing-${i.toString(16).padStart(8, "0")}`).id));
    // Only the plumbing shortlist is used, and more than one of it appears.
    expect([...picks].every((id) => ["kinetic", "americana", "brutalist", "swiss"].includes(id))).toBe(true);
    expect(picks.size).toBeGreaterThanOrEqual(3);
    expect(pickConcept(plumber, "acme-plumbing-1a2b3c4d").id).toBe(pickConcept(plumber, "acme-plumbing-1a2b3c4d").id);
    // A salon never gets the plumber's loud look; an unknown trade can get any.
    expect(pickConcept({ industry: "Hair salon" }, "x-12345678").id).toMatch(/luxe|editorial|organic|playful/);
    expect(conceptById(pickConcept({ industry: "Underwater basket weaving" }, "y-87654321").id)).toBeTruthy();
    // An explicit choice always wins.
    expect(pickConcept({ ...plumber, concept: "luxe" }, "anything-1").id).toBe("luxe");
    expect(pickConcept({ ...plumber, concept: "not-a-concept" }, "anything-1").id).not.toBe("not-a-concept");
  });

  it("is chosen on the form, fixed on the site's kit, and told to Claude as the art direction", async () => {
    const { systemFor } = await vi.importActual<typeof import("../cloudflare/forge/src/designer")>("../cloudflare/forge/src/designer");
    const sys = systemFor("studio", "brutalist");
    expect(sys).toContain("Art direction for this site (fixed");
    expect(sys).toContain("NEO-BRUTALIST");
    expect(sys).not.toContain("LUXE.");
    expect(systemFor("studio", "luxe")).toContain("LUXE.");
    expect(systemFor("studio")).toContain("Choose ONE strong concept"); // old sites without a concept
    expect(systemFor("standard", "luxe")).not.toContain("LUXE.");
    const admin = await setupAdmin(h);
    const page = await html(await call(h, "/", { cookie: admin }));
    expect(page).toContain('name="concept"');
    expect(page).toContain("Neo-brutalist");
    // A Studio build with a chosen direction passes it on to the designer, and an Auto build passes one that suits the trade.
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 9);
    await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Alpha Plumbing", industry: "Plumbing", city: "Tampa, FL", style: "studio", concept: "swiss" } });
    await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Beta Plumbing", industry: "Plumbing", city: "Tampa, FL", style: "studio" } });
    await drain(h);
    const concepts = vi.mocked(designKit).mock.calls.map((c) => c[4]);
    expect(concepts[0]).toBe("swiss");
    expect(["kinetic", "americana", "brutalist", "swiss"]).toContain(concepts[1]);
    // Standard builds get none.
    vi.mocked(designKit).mockClear();
    await build(h, b.cookie, "Gamma Plumbing");
    await drain(h);
    expect(vi.mocked(designKit).mock.calls[0]![4]).toBeUndefined();
  });

  it("a Studio site is held to a higher bar by the review", async () => {
    const { slug, demo } = await liveDemo();
    const version = demo.liveVersion!;
    // Make the live kit a Studio kit.
    const row = h.db.prepare("SELECT kit FROM site_versions WHERE slug = ? AND version = ?").get(slug, version) as { kit: string };
    h.db.prepare("UPDATE site_versions SET kit = ? WHERE slug = ? AND version = ?").run(JSON.stringify({ ...JSON.parse(row.kit), style: "studio" }), slug, version);
    const { browser } = fakeBrowser(goodFacts([`/${slug}/about`]));
    const critique = vi.fn<ReviewDeps["critique"]>(async () => ({ score: 7, verdict: "Competent.", strengths: [], issues: [{ what: "Generic hero", fix: "Make the headline huge", severity: "medium" as const }], costUsd: 0.01 }));
    const r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, { launch: async () => browser, critique, sleep: async () => undefined });
    expect(critique.mock.calls[0]![3]).toBe(true);
    expect(r.fixed).toBe(true); // 7 is good enough for Standard, not for Studio
  });
});

describe("adding before/after photos to a site that is already live", () => {
  const img = (name: string) => ({ name, description: `${name.includes("before") ? "Before" : "After"}: scene`, bytes: new Uint8Array([1, 2, 3]) });

  it("plans the scenes, makes the pictures, saves them, and rewrites the gallery and home page around them", async () => {
    const { slug, b, demo } = await liveDemo();
    const version = demo.liveVersion!;
    vi.mocked(planPairs).mockResolvedValue({ pairs: [{ before: "a dead lawn", after: "a lush lawn" }], cost: 0.001 });
    vi.mocked(beforeAfterImages).mockResolvedValue([img("ba-1-before.jpg"), img("ba-1-after.jpg")]);
    const r = await call(h, `/demos/${slug}/pairs`, { cookie: b.cookie, form: {} });
    expect(loc(r)).toContain("Making the before and after pictures");
    expect(h.queued.map((q) => (q.body as BuildJob).stage)).toEqual(["pairs"]);
    await drain(h);
    const saved = (h.db.prepare("SELECT name FROM site_images WHERE slug = ? AND version = ? AND name LIKE 'ba-%' ORDER BY name").all(slug, version) as { name: string }[]).map((x) => x.name);
    expect(saved).toEqual(["ba-1-after.jpg", "ba-1-before.jpg"]);
    const instr = vi.mocked(designSitePage).mock.calls.filter((c) => c[3]?.instruction).map((c) => ({ path: c[2].path, text: c[3]!.instruction! }));
    expect(instr.map((i) => i.path).sort()).toEqual(["/", "/gallery"]);
    expect(instr.every((i) => i.text.includes("ba-1-before.jpg"))).toBe(true);
    expect(instr[0]!.text).toContain("Illustrative sample. Your real before and after photos replace these at launch.");
    expect((await getDemo(h.env, slug))!.changeNote).toMatchObject({ status: "done", instruction: "Add illustrative before/after photos" });
    expect((h.db.prepare("SELECT count(*) c FROM build_costs WHERE outcome = 'change'").get() as { c: number }).c).toBe(1);
  });

  it("says so plainly when the trade has no natural before and after, or the pictures can't be made", async () => {
    const { slug, b } = await liveDemo();
    vi.mocked(planPairs).mockResolvedValue({ pairs: [], cost: 0.001 });
    await call(h, `/demos/${slug}/pairs`, { cookie: b.cookie, form: {} });
    await drain(h);
    // No natural before and after: nothing is added, and it isn't an error.
    expect((await getDemo(h.env, slug))!.changeNote).toMatchObject({ status: "done" });
    vi.mocked(planPairs).mockResolvedValue({ pairs: [{ before: "a", after: "b" }], cost: 0.001 });
    vi.mocked(beforeAfterImages).mockResolvedValue([]);
    await call(h, `/demos/${slug}/pairs`, { cookie: b.cookie, form: {} });
    await drain(h);
    expect((await getDemo(h.env, slug))!.changeNote!.error).toContain("daily allowance");
  });
});

describe("empty before/after boxes fill themselves", () => {
  const img = (name: string) => ({ name, description: `${name.includes("before") ? "Before" : "After"}: scene`, bytes: new Uint8Array([1, 2, 3]) });

  it("opening a site that shows the empty boxes starts the pictures, once, with no button", async () => {
    const { slug, b, demo } = await liveDemo();
    const version = demo.liveVersion!;
    (h.env as { AI?: unknown }).AI = { run: async () => ({}) };
    // Nothing to do while the pages have no empty boxes.
    expect((await call(h, `/demos/${slug}`, { cookie: b.cookie })).status).toBe(200);
    expect(h.queued).toHaveLength(0);
    h.db.prepare("UPDATE site_pages SET body = body || '<div>Your “before” photo appears here</div>' WHERE slug = ? AND version = ? AND path = '/'").run(slug, version);
    vi.mocked(planPairs).mockResolvedValue({ pairs: [{ before: "a dead lawn", after: "a lush lawn" }], cost: 0.001 });
    vi.mocked(beforeAfterImages).mockResolvedValue([img("ba-1-before.jpg"), img("ba-1-after.jpg")]);
    const r = await call(h, `/demos/${slug}`, { cookie: b.cookie });
    expect(loc(r)).toContain("making the pictures now");
    expect(h.queued.map((q) => (q.body as BuildJob).stage)).toEqual(["pairs"]);
    // Opening it again while that runs doesn't start a second one.
    expect((await call(h, `/demos/${slug}`, { cookie: b.cookie })).status).toBe(200);
    expect(h.queued).toHaveLength(1);
    await drain(h);
    expect((h.db.prepare("SELECT count(*) c FROM site_images WHERE slug = ? AND name LIKE 'ba-%'").get(slug) as { c: number }).c).toBe(2);
    expect((await call(h, `/demos/${slug}`, { cookie: b.cookie })).status).toBe(200);
    expect(h.queued).toHaveLength(0);
  });

  it("a trade with no before and after has the empty boxes taken off instead", async () => {
    const { slug, b, demo } = await liveDemo();
    (h.env as { AI?: unknown }).AI = { run: async () => ({}) };
    h.db.prepare("UPDATE site_pages SET body = body || '<div>Your before photo appears here</div>' WHERE slug = ? AND version = ? AND path = '/'").run(slug, demo.liveVersion!);
    vi.mocked(planPairs).mockResolvedValue({ pairs: [], cost: 0.001 });
    await call(h, `/demos/${slug}`, { cookie: b.cookie });
    await drain(h);
    const instr = vi.mocked(designSitePage).mock.calls.filter((c) => c[3]?.instruction).map((c) => c[3]!.instruction!);
    expect(instr.some((t) => t.includes("Remove the before/after area"))).toBe(true);
    expect((await getDemo(h.env, slug))!.changeNote).toMatchObject({ status: "done" });
  });
});

describe("the review's page visits", () => {
  it("an inner page that is too wide for a phone is reported and repaired", async () => {
    const { slug, demo } = await liveDemo();
    const version = demo.liveVersion!;
    let url = "";
    const page = {
      setViewport: async () => undefined,
      goto: async (u: string) => void (url = u),
      screenshot: async () => new Uint8Array([0xff, 0xd8, 0xff]),
      // The contact page is 450px wide on a 390px phone; everything else fits.
      evaluate: async (fn: unknown) => (typeof fn === "string" && fn.includes("scrollWidth") && !fn.includes("overflow") ? (url.endsWith("/contact") ? 450 : 390) : goodFacts([`/${slug}/about`])) as never,
      on: () => undefined,
      close: async () => undefined,
    };
    const r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, {
      launch: async () => ({ newPage: async () => page as never, close: async () => undefined }),
      sleep: async () => undefined,
      critique: async () => ({ score: 9, verdict: "ok", strengths: [], issues: [], costUsd: 0 }),
    });
    expect(r.wide).toEqual([{ path: "/contact", px: 60, fixed: true }]);
    expect(r.checks!.find((c) => c.id === "overflow-inner")).toMatchObject({ ok: false, detail: "/contact is 60px too wide" });
    // Only that page is rewritten, and the home page is left alone (it scored 9).
    const fixes = vi.mocked(designSitePage).mock.calls.filter((c) => c[3]?.instruction?.includes("wider than the screen"));
    expect(fixes.map((c) => c[2].path)).toEqual(["/contact"]);
    expect(r.fixed).toBeUndefined();
  });

  it("wait out a Studio intro before the screenshot, and carry on when a busy page never goes quiet", async () => {
    const { slug, demo } = await liveDemo();
    const version = demo.liveVersion!;
    const row = h.db.prepare("SELECT kit FROM site_versions WHERE slug = ? AND version = ?").get(slug, version) as { kit: string };
    const order: string[] = [];
    const page = {
      setViewport: async () => undefined,
      goto: async (url: string) => {
        order.push("goto");
        if (url.includes("?r=")) throw new Error("Navigation timeout of 22000 ms exceeded"); // a page that never goes quiet
      },
      screenshot: async () => (order.push("shot"), new Uint8Array([0xff, 0xd8, 0xff])),
      evaluate: async () => goodFacts([`/${slug}/about`]) as never,
      on: () => undefined,
      close: async () => undefined,
    };
    const waits: number[] = [];
    const deps: ReviewDeps = {
      launch: async () => ({ newPage: async () => page as never, close: async () => undefined }),
      sleep: async (ms) => void (order.push("wait"), waits.push(ms)),
      critique: async () => ({ score: 9, verdict: "ok", strengths: [], issues: [], costUsd: 0 }),
    };
    // A standard site settles briefly...
    let r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, deps);
    expect(r.skipped).toBeUndefined();
    expect(waits.filter((w) => w !== 500)).toEqual([1200, 1200, 1200]);
    // The other pages are opened at phone width too, with a short wait each.
    expect(waits.filter((w) => w === 500).length).toBeGreaterThanOrEqual(4);
    // ...a Studio site waits out its intro, and each screenshot comes after a wait.
    h.db.prepare("UPDATE site_versions SET kit = ? WHERE slug = ? AND version = ?").run(JSON.stringify({ ...JSON.parse(row.kit), style: "studio" }), slug, version);
    waits.length = 0;
    order.length = 0;
    r = await reviewSite({ ...h.env, BROWSER: {} } as Env, slug, version, deps);
    expect(r.skipped).toBeUndefined();
    expect(waits.filter((w) => w !== 500)).toEqual([5500, 5500, 5500]);
    expect(order.slice(0, 3)).toEqual(["goto", "wait", "shot"]);
  });
});
