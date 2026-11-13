/**
 * The build pipeline end to end, with Claude, the photo generator and the website reader replaced by
 * stand-ins: the real queue consumer, real jobs, real database. This is what runs when someone
 * presses "Build": a kit job, then a job per page, then go-live, with credits, refunds, retries,
 * resuming and notifications along the way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../cloudflare/forge/src/index";
import { adaptKit, designKit, designSitePage, planSite, systemFor, Fatal, TryLater } from "../cloudflare/forge/src/designer";
import { writeBrief } from "../cloudflare/forge/src/brief";
import { MOTION_LIBS } from "../cloudflare/forge/src/motion";
import { getDemo, getKit, getPage, pagesDone, saveReview } from "../cloudflare/forge/src/db";
import { assemble } from "../cloudflare/forge/src/site";
import type { BuildJob, Env, VideoJob } from "../cloudflare/forge/src/env";
import { readWebsite } from "../cloudflare/forge/src/scrape";
import { getTenant, listLedger, listTenants } from "../cloudflare/forge/src/tenants";
import { build, call, cookieOf, html, loc, makeAccount, makeHarness, setupAdmin, slugOf, type Harness } from "./forge-harness";

vi.mock("../cloudflare/forge/src/designer", async (orig) => {
  const real = await orig<typeof import("../cloudflare/forge/src/designer")>();
  return { ...real, planSite: vi.fn(), designKit: vi.fn(), designSitePage: vi.fn(), adaptKit: vi.fn() };
});
vi.mock("../cloudflare/forge/src/images", () => ({
  beforeAfterImages: vi.fn(async () => []),
  heroPair: vi.fn(async () => null),
  previewImages: vi.fn(async () => [
    { name: "photo-1.jpg", description: "a barber at work", bytes: new Uint8Array([1, 2, 3]) },
    { name: "photo-2.jpg", description: "a shop front", bytes: new Uint8Array([4, 5, 6]) },
  ]),
}));
// The brief calls Claude; in these tests it is faked (a test below gives it a real reply to follow through).
vi.mock("../cloudflare/forge/src/brief", async (orig) => {
  const real = await orig<typeof import("../cloudflare/forge/src/brief")>();
  return { ...real, writeBrief: vi.fn(async () => { throw new Error("no brief in tests"); }) };
});
vi.mock("../cloudflare/forge/src/scrape", () => ({ readWebsite: vi.fn() }));

type Job = BuildJob | VideoJob;

/** Run queued jobs the way Cloudflare Queues would: in order, retrying with the delay asked for. */
async function drain(h: Harness, max = 200): Promise<{ retries: number[] }> {
  const retries: number[] = [];
  const attempts = new Map<string, number>();
  for (let n = 0; n < max && h.queued.length; n++) {
    const { body } = h.queued.shift()!;
    const key = JSON.stringify(body);
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    let again = false;
    await worker.queue(
      {
        messages: [
          {
            body: body as Job,
            attempts: attempt,
            ack: () => undefined,
            retry: (o?: { delaySeconds?: number }) => {
              again = true;
              retries.push(o?.delaySeconds ?? 0);
            },
          },
        ],
      },
      h.env,
    );
    if (again) h.queued.push({ body });
  }
  return { retries };
}

const goodKit = (_env: Env, brief: string, pages: unknown, style?: string) => ({
  kit: { theme: "dark" as const, accent: "#aa3333", fonts: "", css: "", header: '<header><a href="/">Home</a></header>', footer: '<footer><a href="/">Home</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><!--mianro-credit--></footer>', script: "", components: "", brief, pages: pages as never, ...(style === "studio" ? { style: "studio" as const } : {}) },
  usage: { cost_usd: 0.4, model: "stub" },
});
const goodPage = (_env: Env, _kit: unknown, spec: { name: string }) => ({
  page: { title: spec.name, description: "d", css: "", body: `<main><h1>${spec.name}</h1><form></form></main>` },
  usage: { cost_usd: 0.01, model: "stub" },
});

let h: Harness;
beforeEach(() => {
  h = makeHarness();
  vi.mocked(planSite).mockResolvedValue({ services: ["Haircuts", "Beard Trims", "Hot Shaves", "Kids Cuts"], imagePrompts: ["a barber", "a shop"], cost: 0.002 });
  vi.mocked(designKit).mockImplementation(async (env, brief, pages, style) => goodKit(env, brief, pages, style));
  vi.mocked(designSitePage).mockImplementation(async (env, kit, spec) => goodPage(env, kit, spec));
  vi.mocked(adaptKit).mockImplementation(async (_env, src, from, brief, pages) => ({ kit: { ...src, brief, pages, reuse: from }, usage: { cost_usd: 0.05, calls: 1 } }));
  vi.mocked(readWebsite).mockResolvedValue(null);
});
afterEach(() => vi.restoreAllMocks());

const demoRow = (slug: string) => h.db.prepare("SELECT * FROM demos WHERE slug = ?").get(slug) as Record<string, string | number | null>;

describe("a build, start to finish", () => {
  it("designs the kit, writes every page, goes live, and counts the cost once", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    expect(h.queued.map((q) => (q.body as BuildJob).stage)).toEqual(["kit"]);

    await drain(h);
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("ready");
    expect(demo.liveVersion).toBeTruthy();
    const kit = (await getKit(h.env, slug, demo.liveVersion!))!;
    const done = await pagesDone(h.env, slug, demo.liveVersion!);
    // Every page of the sitemap exists, including the two legal pages written without Claude.
    expect(done.sort()).toEqual(kit.pages!.map((p) => p.path).sort());
    expect(done).toEqual(expect.arrayContaining(["/", "/about", "/services", "/quote", "/privacy", "/terms"]));
    expect(kit.pages!.length).toBeGreaterThanOrEqual(15);
    // The planned services became service pages.
    expect(done).toContain("/services/haircuts");
    // Photos were saved under this version.
    expect((h.db.prepare("SELECT count(*) c FROM site_images WHERE slug = ? AND version = ?").get(slug, demo.liveVersion) as { c: number }).c).toBe(2);
    // The marker is cleared, the credit stays spent, and the cost was recorded once.
    expect(demoRow(slug).charged_version).toBeNull();
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    const t = (await listTenants(h.env)).find((x) => x.id === b.id)!;
    const pageCalls = kit.pages!.filter((p) => p.kind === "ai").length;
    expect(t.builds).toBe(1);
    expect(t.costTotal).toBeCloseTo(0.4 + 0.002 + pageCalls * 0.01, 5);
    // The queue is empty and a second go-live (a duplicate job) doesn't double-count.
    expect(h.queued).toHaveLength(0);
  });

  it("fills what was left blank from the business's own website and uses it for the legal pages", async () => {
    vi.mocked(readWebsite).mockResolvedValue({
      url: "https://bravo.example/",
      title: "Bravo Barbers",
      description: "",
      text: "x".repeat(400),
      images: [],
      business: { phone: "+1-407-555-0100", street: "1 Main St", city: "Orlando", region: "FL", postal: "32801", lat: 28.5, lng: -81.3, hours: "Mon–Fri 09:00–17:00" },
    });
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    const r = await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Bravo Barbers", websiteUrl: "https://bravo.example/", phone: "(321) 000-1111" } });
    const slug = slugOf(r);
    await drain(h);
    const intake = JSON.parse(demoRow(slug).intake as string);
    expect(intake).toMatchObject({ phone: "(321) 000-1111", city: "Orlando, FL", address: "1 Main St, Orlando, FL 32801", hours: "Mon–Fri 09:00–17:00", mapQuery: "28.5,-81.3" });
    // What was typed won (the phone); the blanks were filled.
    const brief = vi.mocked(designKit).mock.calls[0][1];
    expect(brief).toContain("Phone: (321) 000-1111");
    expect(brief).toContain("Map embed URL for the service area (use as the iframe src): https://www.google.com/maps?q=28.5%2C-81.3&z=15&output=embed");
    expect(brief).toContain("1 Main St, Orlando, FL 32801");
  });

  it("reads a Google Maps link for the name and the map position", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    const link = "https://www.google.com/maps/place/Zulu+Roofing/@28.5383,-81.3792,15z/data=!3m1!4b1!4m6!3m5!8m2!3d28.5383!4d-81.3792";
    const slug = slugOf(await call(h, "/demos", { cookie: b.cookie, form: { googleUrl: link } }));
    expect(slug).toMatch(/^zulu-roofing-/);
    expect(JSON.parse(demoRow(slug).intake as string)).toMatchObject({ businessName: "Zulu Roofing", mapQuery: "28.5383,-81.3792", googleUrl: link });
    // No name and an unreadable link is a clear message, not a broken demo.
    const bad = await call(h, "/demos", { cookie: b.cookie, form: { googleUrl: "https://example.com/not-maps" } });
    expect(loc(bad)).toContain("Couldn't read that Google Maps link");
  });
});

describe("when things go wrong", () => {
  it("retries a busy Claude after a minute, then fails and refunds after the fourth try", async () => {
    vi.mocked(designKit).mockRejectedValue(new TryLater("busy"));
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    const { retries } = await drain(h);
    expect(retries).toEqual([60, 60, 60]);
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("failed");
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    expect((await listLedger(h.env, b.id)).map((e) => e.delta)).toEqual([1, -1, 1]);
  });

  it("rewrites a page that came back bad, without failing the whole build", async () => {
    let tries = 0;
    vi.mocked(designSitePage).mockImplementation(async (env, kit, spec) => {
      if (spec.name === "FAQs" && ++tries < 3) throw new Error("The FAQs page came back incomplete (too long).");
      return goodPage(env, kit, spec);
    });
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    const { retries } = await drain(h);
    expect(retries).toEqual([5, 5]);
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
    expect(tries).toBe(3);
  });

  it("a Claude error that can't be fixed by trying again stops the build and refunds, and a webhook says so", async () => {
    vi.mocked(designKit).mockRejectedValue(new Fatal("The Claude API account is out of credit."));
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "https://hooks.example.com/forge" } });
    const seen: { body: string; headers: Headers }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      seen.push({ body: String(init?.body), headers: new Headers(init?.headers) });
      return new Response("ok");
    });
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    await drain(h);
    const demo = (await getDemo(h.env, slug))!;
    expect(demo).toMatchObject({ buildStatus: "failed", buildError: "The Claude API account is out of credit." });
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0].headers.get("x-forge-event")).toBe("demo.failed");
    expect(JSON.parse(seen[0].body).demo).toMatchObject({ slug, status: "failed", error: "The Claude API account is out of credit." });
    // The page shows the failure and that the credit came back.
    const page = await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }));
    expect(page).toContain("The build stopped before it finished.");
    expect(page).toContain("your credit was refunded (trying again uses 1)");
  });

  it("'Try again' picks up where a failed build stopped, writing only the missing pages", async () => {
    vi.mocked(designSitePage).mockImplementation(async (env, kit, spec) => {
      if (spec.name === "Reviews") throw new Fatal("Claude declined to build this site.");
      return goodPage(env, kit, spec);
    });
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    await drain(h);
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("failed");
    expect((await getTenant(h.env, b.id))!.credits).toBe(2); // refunded
    const version = (await getDemo(h.env, slug))!.buildVersion!;
    const kit = (await getKit(h.env, slug, version))!;
    // Pages already written are kept. The ones still waiting in the queue stood down when the build failed.
    const before = await pagesDone(h.env, slug, version);
    expect(before.length).toBeGreaterThan(5);
    expect(before).not.toContain("/reviews");
    const missing = kit.pages!.map((p) => p.path).filter((p) => !before.includes(p));

    vi.mocked(designSitePage).mockImplementation(async (env, kit, spec) => goodPage(env, kit, spec));
    vi.mocked(designSitePage).mockClear();
    expect(loc(await call(h, `/demos/${slug}/rebuild`, { cookie: b.cookie, form: {} }))).toContain("ok=");
    expect((await getTenant(h.env, b.id))!.credits).toBe(1); // charged again for the retry
    expect(h.queued.map((q) => (q.body as { path?: string }).path).sort()).toEqual([...missing].sort());
    await drain(h);
    // Only the missing pages were written again; nothing already paid for was.
    expect(vi.mocked(designSitePage)).toHaveBeenCalledTimes(missing.length);
    expect(vi.mocked(designSitePage).mock.calls.map((c) => c[2].path).sort()).toEqual([...missing].sort());
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("ready");
    expect(demo.liveVersion).toBe(version);
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
  });

  it("ignores a leftover job from a build that was replaced or already finished", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    const stale = { ...h.queued[0] };
    await drain(h); // finish it normally; then replay the old kit job a second time
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
    h.queued.push(stale);
    vi.mocked(designKit).mockClear();
    await drain(h);
    expect(vi.mocked(designKit)).not.toHaveBeenCalled();
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
  });
});

describe("notifications and Mianro's own builds", () => {
  it("tells the account's webhook when a site is ready, with signed, readable details", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "https://hooks.example.com/forge" } });
    const seen: { body: string; headers: Headers }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      seen.push({ body: String(init?.body), headers: new Headers(init?.headers) });
      return new Response("ok");
    });
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    await drain(h);
    expect(seen).toHaveLength(1);
    expect(seen[0].headers.get("x-forge-event")).toBe("demo.ready");
    expect(seen[0].headers.get("x-forge-signature")).toMatch(/^sha256=[0-9a-f]{64}$/);
    const msg = JSON.parse(seen[0].body);
    expect(msg.demo).toMatchObject({ slug, business_name: "Bravo Barbers", status: "ready", site_url: `https://sites.test/${slug}` });
    expect(msg.demo.pages.map((p: { name: string }) => p.name)).toContain("Home");
    expect(msg.demo.pages[0].url).toBe(`https://sites.test/${slug}`);
    expect(JSON.stringify(msg)).not.toContain("cost");
    expect((await getTenant(h.env, b.id))!.webhookStatus).toContain("Delivered 200");
  });

  it("Mianro's own account builds without credits or ledger entries, and the admin sees the real cost", async () => {
    const admin = await setupAdmin(h);
    const slug = slugOf(await build(h, admin, "Mianro Own Demo"));
    await drain(h);
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
    expect((await getTenant(h.env, 1))!.credits).toBe(0);
    expect(await listLedger(h.env, 1)).toEqual([]);
    const page = await html(await call(h, `/demos/${slug}`, { cookie: admin }));
    expect(page).toMatch(/built for <b>\$\d+\.\d\d<\/b>/);
    // A customer's owner doesn't see what it cost Mianro.
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 1);
    const mine = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    await drain(h);
    expect(await html(await call(h, `/demos/${mine}`, { cookie: b.cookie }))).not.toMatch(/built for <b>/);
    expect(cookieOf(new Response())).toBe("");
  });
});

describe("Studio builds", () => {
  const studio = (cookie: string, name: string) => call(h, "/demos", { cookie, form: { businessName: name, city: "Orlando, FL", style: "studio" } });
  /** The page as visitors get it (the same assembly the sites Worker does, minus Cloudflare's HTML rewriter). */
  const site = async (slug: string, path = "") => {
    const demo = (await getDemo(h.env, slug))!;
    const kit = (await getKit(h.env, slug, demo.liveVersion!))!;
    const page = (await getPage(h.env, slug, demo.liveVersion!, path || "/"))!;
    return assemble(kit, page, slug);
  };

  it("takes three credits, designs with the Studio brief and puts the motion engine on every page", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await studio(b.cookie, "Studio Barbers"));
    expect((await getTenant(h.env, b.id))!.credits).toBe(2);
    expect((await listLedger(h.env, b.id))[0]).toMatchObject({ delta: -3, reason: "Studio site build" });
    await drain(h);
    expect(vi.mocked(designKit).mock.calls[0][3]).toBe("studio");
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("ready");
    for (const path of ["", "/about"]) {
      const page = await site(slug, path);
      for (const lib of MOTION_LIBS) expect(page).toContain(lib);
      expect(page).toContain("--m-accent:#aa3333");
      expect(page).toContain("m-curtain");
    }
  });

  it("writes the brief first: its idea picks the look and the first screen, leads the design and is kept with the site", async () => {
    const concept = { lens: "name", truth: "A barber shop named for its street.", evidence: '"Studio Barbers"', idea: "The chair as the town's front porch.", refuses: "No stock fades.", headline: "Pull up a chair.", look: "americana - sign-painter craft", firstScreen: "breakout - the barber leans out of the frame", object: "none", moment: "none" };
    vi.mocked(writeBrief).mockResolvedValueOnce({ tier: "none", concepts: [concept], chosen: 0, why: "Only this shop", invented: [], cost: 0.05 });
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await studio(b.cookie, "Studio Barbers"));
    await drain(h);
    const call0 = vi.mocked(designKit).mock.calls[0]!;
    expect(call0[4]).toBe("americana");
    expect(call0[6]).toBe("breakout");
    expect(call0[7]).toMatchObject({ idea: "The chair as the town's front porch.", why: "Only this shop" });
    expect(call0[2][0]!.brief).toContain("in the order its idea gives");
    expect(call0[2][0]!.brief).not.toContain("data-perch");
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
  });

  it("a site built on another site's design costs one credit and skips the fresh design", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const first = slugOf(await studio(b.cookie, "Studio Barbers"));
    await drain(h);
    expect(vi.mocked(designKit)).toHaveBeenCalledTimes(1);
    const src = (await getDemo(h.env, first))!;
    const second = slugOf(await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Second Barbers", city: "Tampa, FL", reuseFrom: first } }));
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    await drain(h);
    expect(vi.mocked(designKit)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(adaptKit).mock.calls[0][2]).toEqual({ slug: first, version: src.liveVersion });
    const demo = (await getDemo(h.env, second))!;
    expect(demo.buildStatus).toBe("ready");
    const kit = (await getKit(h.env, second, demo.liveVersion!))!;
    expect(kit.style).toBe("studio");
    expect(kit.reuse?.slug).toBe(first);
    // Only the home page follows the sister site's home page.
    const withRef = vi.mocked(designSitePage).mock.calls.filter((c) => c[3]?.adaptFrom);
    expect(withRef).toHaveLength(1);
    expect(withRef[0][2].path).toBe("/");
    expect(await site(second)).toContain(MOTION_LIBS[0]);
  });

  it("offers finished designs as pictures named by trade, once they have a screenshot", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Green Thumb", industry: "Landscaping", city: "Orlando, FL" } }));
    await drain(h);
    expect(await html(await call(h, "/", { cookie: b.cookie }))).not.toContain('name="reuseFrom"');
    const demo = (await getDemo(h.env, slug))!;
    await saveReview(h.env, slug, demo.liveVersion!, { at: new Date().toISOString(), score: 8, shots: ["shot-desktop.jpg"] });
    const home = await html(await call(h, "/", { cookie: b.cookie }));
    expect(home).toContain("A brand-new design");
    expect(home).toContain("Landscaping website");
    expect(home).toContain(`/_img/${demo.liveVersion}/shot-desktop.jpg`);
    expect(home).toContain(`value="${slug}"`);
  });

  it("won't reuse another account's design", async () => {
    const admin = await setupAdmin(h);
    const a = await makeAccount(h, admin, "Account A", "a@a.test", 5);
    const b = await makeAccount(h, admin, "Account B", "b@b.test", 5);
    const mine = slugOf(await studio(a.cookie, "A Barbers"));
    await drain(h);
    await call(h, "/demos", { cookie: b.cookie, form: { businessName: "B Barbers", city: "Tampa, FL", reuseFrom: mine } });
    await drain(h);
    expect(vi.mocked(adaptKit)).not.toHaveBeenCalled();
  });

  it("with a browser to look through, builds the first screen alone, then the rest of the home page around it", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    // A browser binding that can't actually open: the look is skipped and the build carries on.
    (h.env as { BROWSER?: unknown }).BROWSER = {};
    const slug = slugOf(await studio(b.cookie, "Studio Barbers"));
    const stages: string[] = [];
    const seen = h.env.BUILDS.send.bind(h.env.BUILDS);
    h.env.BUILDS.send = (async (body: BuildJob, o?: unknown) => (stages.push(body.stage), seen(body as never, o as never))) as never;
    await drain(h);
    expect(stages).toContain("hero");
    const home = vi.mocked(designSitePage).mock.calls.filter((c) => c[2].path === "/");
    // First the first screen on its own, then the whole page told to keep it.
    expect(home[0]![3]).toMatchObject({ heroOnly: true });
    expect(home.at(-1)![3]?.hero?.body).toContain("<h1>Home</h1>");
    expect(home.at(-1)![3]?.heroOnly).toBeUndefined();
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("ready");
    // The draft is kept out of the site's pages.
    expect(await pagesDone(h.env, slug, demo.liveVersion!)).not.toContain("/_hero");
    expect(await getPage(h.env, slug, demo.liveVersion!, "/_hero")).toBeTruthy();
  });

  it("standard sites stay light: no motion engine", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await build(h, b.cookie, "Plain Barbers"));
    await drain(h);
    expect((await getTenant(h.env, b.id))!.credits).toBe(4);
    expect(await site(slug)).not.toContain(MOTION_LIBS[0]);
  });

  it("gives all three credits back when a Studio build fails", async () => {
    vi.mocked(designKit).mockRejectedValue(new Fatal("The Claude API account is out of credit."));
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 3);
    await studio(b.cookie, "Studio Barbers");
    expect((await getTenant(h.env, b.id))!.credits).toBe(0);
    await drain(h);
    expect((await getTenant(h.env, b.id))!.credits).toBe(3);
    expect((await listLedger(h.env, b.id))[0]).toMatchObject({ delta: 3 });
  });

  it("won't start a Studio build without enough credits, but a standard one still works", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const r = await studio(b.cookie, "Studio Barbers");
    expect(loc(r)).toContain("A Studio build needs 3 credits and this account has 2");
    expect((await getTenant(h.env, b.id))!.credits).toBe(2);
    expect(loc(await build(h, b.cookie, "Plain Barbers"))).toMatch(/\/demos\//);
  });

  it("the Studio brief swaps restraint for the motion engine; the standard one doesn't", () => {
    const s = systemFor("studio");
    expect(s).toContain("Studio edition");
    expect(s).toContain("data-split");
    expect(s).not.toContain("no custom cursors, WebGL or heavy effects");
    expect(systemFor("standard")).toContain("no custom cursors, WebGL or heavy effects");
    expect(systemFor("standard")).not.toContain("Studio edition");
  });
});
