/**
 * The after-build features: the automatic review (screenshots, checks, critique, fix) with a stand-in
 * browser, its monthly budget, who looked at a demo, the outreach kit, change requests, quick text
 * fixes, bulk builds with a queue, and the before/after pitch page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../cloudflare/forge/src/index";
import { designKit, designSitePage, planSite } from "../cloudflare/forge/src/designer";
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
  return { ...real, planSite: vi.fn(), designKit: vi.fn(), designSitePage: vi.fn() };
});
vi.mock("../cloudflare/forge/src/images", () => ({ previewImages: vi.fn(async () => [{ name: "photo-1.jpg", description: "a shop", bytes: new Uint8Array([1]) }]) }));
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
    const critique = vi.fn(async () => ({ score: 5, verdict: "Flat hero.", strengths: ["Clear phone"], issues: [{ what: "Hero lacks contrast", fix: "Darken the overlay", severity: "high" as const }], costUsd: 0.012 }));
    const deps: ReviewDeps = { launch: async () => browser, critique };
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
    const deps: ReviewDeps = { launch: async () => browser, critique: async () => ({ score: 9, verdict: "Lovely.", strengths: [], issues: [{ what: "minor", fix: "tiny", severity: "low" as const }], costUsd: 0.01 }) };
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
    const home = await html(await call(h, "/", { cookie: b.cookie }));
    expect(home).toContain("3 today");
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
    expect(home).toContain("Queued");
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
