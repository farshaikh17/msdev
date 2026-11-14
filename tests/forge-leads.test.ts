/** Where each site stands as a sales lead: marked on the demo page or through the API, counted and filtered on the dashboard. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../cloudflare/forge/src/index";
import type { Env } from "../cloudflare/forge/src/env";
import { getDemo } from "../cloudflare/forge/src/db";
import { build, call, html, loc, makeAccount, makeHarness, setupAdmin, slugOf, type Harness } from "./forge-harness";

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});

describe("lead status", () => {
  it("is marked on the demo page, kept with who and why, and shown on the dashboard with counts and a filter", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const one = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    const two = slugOf(await build(h, b.cookie, "Beta Plumbing"));
    h.db.prepare("UPDATE demos SET build_status = 'ready'").run();
    expect((await getDemo(h.env, one))!.leadStatus).toBe("new");
    const page = await html(await call(h, `/demos/${one}`, { cookie: b.cookie }));
    expect(page).toContain("Where this lead stands");
    expect(page).toContain("Not sent yet");

    expect(loc(await call(h, `/demos/${one}/lead`, { cookie: b.cookie, form: { status: "sent" } }))).toContain("Marked as sent");
    await call(h, `/demos/${two}/lead`, { cookie: b.cookie, form: { status: "lost", reason: "This isn't us", note: "We don't do emergency calls" } });
    const d = (await getDemo(h.env, two))!;
    expect(d.leadStatus).toBe("lost");
    expect(d.leadAt).toBeTruthy();
    const after = await html(await call(h, `/demos/${two}`, { cookie: b.cookie }));
    expect(after).toContain("This isn&#39;t us");
    expect(after).toContain("We don&#39;t do emergency calls");
    expect(after).toContain("owner@b.test");

    const home = await html(await call(h, "/", { cookie: b.cookie }));
    expect(home).toContain("Sent · 1");
    expect(home).toContain("Lost · 1");
    const sentOnly = await html(await call(h, "/?lead=sent", { cookie: b.cookie }));
    expect(sentOnly).toContain("Alpha Plumbing");
    expect(sentOnly).not.toContain(`href="/demos/${two}"`);
    // A nonsense status is treated as "not sent yet"; a reason is kept only for a lost lead.
    await call(h, `/demos/${one}/lead`, { cookie: b.cookie, form: { status: "bogus", reason: "Too expensive" } });
    expect((await getDemo(h.env, one))!.leadStatus).toBe("new");
    const row = h.db.prepare("SELECT reason FROM lead_log WHERE slug = ? ORDER BY id DESC").get(one) as { reason: string };
    expect(row.reason).toBe("");
  });

  it("can't be changed on another account's site", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const c = await makeAccount(h, admin, "Other Co", "owner@c.test", 5);
    const mine = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    await call(h, `/demos/${mine}/lead`, { cookie: c.cookie, form: { status: "won" } });
    expect((await getDemo(h.env, mine))!.leadStatus).toBe("new");
    expect((h.db.prepare("SELECT count(*) n FROM lead_log").get() as { n: number }).n).toBe(0);
  });

  it("is read and set through the API, with the same rules", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const key = (await html(await call(h, "/api/keys", { cookie: b.cookie, form: { name: "CRM" } }))).match(/fk_live_[A-Za-z0-9_-]{20,}/)![0];
    const slug = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    const set = await call(h, `/api/v1/demos/${slug}/lead`, { bearer: key, json: { status: "replied", note: "Wants a call Tuesday" } });
    expect(set.status).toBe(200);
    expect(await set.json()).toEqual({ lead_status: "replied" });
    const got = (await (await call(h, `/api/v1/demos/${slug}/lead`, { bearer: key })).json()) as { lead_status: string; history: { status: string; note: string; by: string }[] };
    expect(got.lead_status).toBe("replied");
    expect(got.history[0]).toMatchObject({ status: "replied", note: "Wants a call Tuesday", by: "API" });
    expect(((await (await call(h, `/api/v1/demos/${slug}`, { bearer: key })).json()) as { lead_status: string }).lead_status).toBe("replied");
    expect(((await (await call(h, "/api/v1/demos", { bearer: key })).json()) as { demos: { lead_status: string }[] }).demos[0]!.lead_status).toBe("replied");
    expect((await call(h, `/api/v1/demos/${slug}/lead`, { bearer: key, json: { status: "maybe" } })).status).toBe(422);
    expect((await call(h, `/api/v1/demos/${slug}/lead`, { bearer: key, json: { status: "lost", reason: "Moon" } })).status).toBe(422);
    expect((await call(h, `/api/v1/demos/nope-1234/lead`, { bearer: key, json: { status: "sent" } })).status).toBe(404);
  });
});

describe("demo expiry", () => {
  afterEach(() => vi.unstubAllGlobals());
  const visit = (slug: string) => {
    vi.stubGlobal("caches", { default: { match: async () => undefined, put: async () => undefined } });
    return worker.fetch(new Request(`https://sites.test/${slug}`), { ...h.env, ROLE: "sites" } as Env, { waitUntil: () => undefined } as never);
  };
  const expire = (slug: string) => h.db.prepare("UPDATE demos SET expires_at = ? WHERE slug = ?").run(new Date(Date.now() - 86_400_000).toISOString(), slug);

  it("gives a new demo 30 days; after that its link says the preview has ended, unless it is won or featured", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    const d = (await getDemo(h.env, slug))!;
    const daysLeft = (Date.parse(d.expiresAt!) - Date.now()) / 86_400_000;
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(daysLeft).toBeLessThan(30.1);
    expire(slug);
    const r = await visit(slug);
    expect(r.status).toBe(410);
    expect(await r.text()).toContain("This preview has ended");
    // The dashboard says so, and the demo page offers to bring it back.
    h.db.prepare("UPDATE demos SET build_status = 'ready'").run();
    expect(await html(await call(h, "/", { cookie: b.cookie }))).toContain(">Expired<");
    expect(await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }))).toContain("Bring it back for 30 days");
    // Featured on the public Examples page: it stays up.
    h.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('web_showcase', ?)").run(slug);
    expect((await visit(slug)).status).not.toBe(410);
    h.db.prepare("DELETE FROM settings WHERE key = 'web_showcase'").run();
    // Won: it never expires.
    await call(h, `/demos/${slug}/lead`, { cookie: b.cookie, form: { status: "won" } });
    expect((await visit(slug)).status).not.toBe(410);
    expect(await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }))).toContain("never expires");
  });

  it("extends by 30 days in one press, and a new design starts the 30 days again; the API shows the date", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    expire(slug);
    expect(loc(await call(h, `/demos/${slug}/extend`, { cookie: b.cookie, form: {} }))).toContain("The link now works until");
    const left = (Date.parse((await getDemo(h.env, slug))!.expiresAt!) - Date.now()) / 86_400_000;
    expect(left).toBeGreaterThan(29.9);
    // Another account can't extend it.
    const c = await makeAccount(h, admin, "Other Co", "owner@c.test", 5);
    expire(slug);
    await call(h, `/demos/${slug}/extend`, { cookie: c.cookie, form: {} });
    expect(Date.parse((await getDemo(h.env, slug))!.expiresAt!)).toBeLessThan(Date.now());
    const key = (await html(await call(h, "/api/keys", { cookie: b.cookie, form: { name: "k" } }))).match(/fk_live_[A-Za-z0-9_-]{20,}/)![0];
    expect(((await (await call(h, `/api/v1/demos/${slug}`, { bearer: key })).json()) as { expires_at: string }).expires_at).toBeTruthy();
  });
});

import { hostOf } from "../cloudflare/forge/src/domains";
import { saveKit, savePage } from "../cloudflare/forge/src/db";
describe("their own web address", () => {
  afterEach(() => vi.unstubAllGlobals());
  const sites = (url: string, init?: RequestInit) => {
    vi.stubGlobal("caches", { default: { match: async () => undefined, put: async () => undefined } });
    return worker.fetch(new Request(url, init), { ...h.env, ROLE: "sites" } as Env, { waitUntil: () => undefined } as never);
  };
  const wonSite = async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const slug = slugOf(await build(h, b.cookie, "Alpha Plumbing"));
    const version = "mwtest01";
    await saveKit(h.env, slug, version, { theme: "light", accent: "#aa3333", fonts: "", css: "", header: "<header></header>", footer: "<footer></footer>", script: "", components: "", brief: "b", pages: [{ path: "/", name: "Home", kind: "ai", brief: "" }] } as never, {});
    await savePage(h.env, slug, version, "/", { title: "Home", description: "", css: "", body: "<main><h1>Hi</h1></main>" }, null);
    h.db.prepare("UPDATE demos SET build_status = 'ready', live_version = ? WHERE slug = ?").run(version, slug);
    h.db.prepare("INSERT INTO site_images (slug, version, name, description, data) VALUES (?, ?, 'own-1.jpg', '', x'ffd8ff')").run(slug, version);
    return { b, admin, slug, version };
  };

  it("reads an address the way people type it, and refuses ones that can't be theirs", () => {
    expect(hostOf("https://WWW.OHaraPlumbing.com/about?x=1")).toBe("www.oharaplumbing.com");
    expect(hostOf("oharaplumbing.co.uk")).toBe("oharaplumbing.co.uk");
    for (const bad of ["", "not a domain", "forge-sites.dev1-024.workers.dev", "localhost", "x.mianro.com"]) expect(hostOf(bad)).toBeNull();
  });

  it("is only for a won site, one site per address, and can be cleared", async () => {
    const { b, admin, slug } = await wonSite();
    expect(loc(await call(h, `/demos/${slug}/domain`, { cookie: b.cookie, form: { domain: "www.alpha.test" } }))).toContain("Mark the site as won first");
    await call(h, `/demos/${slug}/lead`, { cookie: b.cookie, form: { status: "won" } });
    expect(loc(await call(h, `/demos/${slug}/domain`, { cookie: b.cookie, form: { domain: "not a domain" } }))).toContain("isn't a web address");
    await call(h, `/demos/${slug}/domain`, { cookie: b.cookie, form: { domain: "https://www.alpha.test/" } });
    expect(h.db.prepare("SELECT host FROM domains WHERE slug = ?").get(slug)).toEqual({ host: "www.alpha.test" });
    // Custom addresses aren't set up on this Forge (no FORGE_DOMAIN_TARGET): the card stays out of the way.
    expect(await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }))).not.toContain("Their own web address");
    // Another site (another account, even) can't take the same address, in either form.
    const c = await makeAccount(h, admin, "Other Co", "owner@c.test", 5);
    const other = slugOf(await build(h, c.cookie, "Beta Plumbing"));
    h.db.prepare("UPDATE demos SET lead_status = 'won' WHERE slug = ?").run(other);
    expect(loc(await call(h, `/demos/${other}/domain`, { cookie: c.cookie, form: { domain: "alpha.test" } }))).toContain("already used by another site");
    await call(h, `/demos/${slug}/domain`, { cookie: b.cookie, form: { domain: "" } });
    expect(h.db.prepare("SELECT count(*) n FROM domains").get()).toEqual({ n: 0 });
  });

  it("serves the site at the root of its address: pictures, the form, and a missing page goes home", async () => {
    const { b, slug, version } = await wonSite();
    await call(h, `/demos/${slug}/lead`, { cookie: b.cookie, form: { status: "won" } });
    await call(h, `/demos/${slug}/domain`, { cookie: b.cookie, form: { domain: "www.alpha.test" } });
    expect((await sites("https://nobody.test/")).status).toBe(404);
    const img = await sites(`https://alpha.test/_img/${version}/own-1.jpg`);
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/jpeg");
    const missing = await sites("https://www.alpha.test/no-such-page");
    expect(missing.status).toBe(302);
    expect(missing.headers.get("location")).toBe("https://www.alpha.test/");
    const lead = await sites("https://www.alpha.test/_lead", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.9" }, body: JSON.stringify({ page: "/", fields: { name: "Dana", phone: "555-0100" } }) });
    expect(lead.status).toBe(200);
    expect(h.db.prepare("SELECT count(*) n FROM leads WHERE slug = ?").get(slug)).toEqual({ n: 1 });
  });

  it("checks the DNS record, and registers the address with Cloudflare itself when it has the key", async () => {
    const { b, slug } = await wonSite();
    await call(h, `/demos/${slug}/lead`, { cookie: b.cookie, form: { status: "won" } });
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      asked.push(`${init?.method ?? "GET"} ${u}`);
      if (String(u).includes("dns-query")) return Response.json({ Answer: [{ type: 5, data: "sites.mianro.test." }] });
      if (String(u).includes("custom_hostnames") && init?.method === "POST") return Response.json({ success: true, result: { id: "ch_1", ssl: { status: "pending_validation" } } });
      return Response.json({ result: { ssl: { status: "active" } } });
    });
    const env = { ...h.env, FORGE_DOMAIN_TARGET: "sites.mianro.test", CF_SAAS_ZONE: "zone1", CF_SAAS_TOKEN: "t" };
    const post = (path: string, form: Record<string, string>) =>
      worker.fetch(new Request(`https://app.test${path}`, { method: "POST", headers: { cookie: b.cookie, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "203.0.113.5" }, body: new URLSearchParams(form).toString() }), env as Env, { waitUntil: () => undefined } as never);
    expect(decodeURIComponent((await post(`/demos/${slug}/domain`, { domain: "www.alpha.test" })).headers.get("location") ?? "")).toContain("Saved www.alpha.test");
    expect(asked.some((a) => a.startsWith("POST https://api.cloudflare.com/client/v4/zones/zone1/custom_hostnames"))).toBe(true);
    expect(decodeURIComponent((await post(`/demos/${slug}/domain-check`, {})).headers.get("location") ?? "")).toContain("is pointing at the site");
    expect(h.db.prepare("SELECT dns_ok, ssl, cf_id FROM domains WHERE slug = ?").get(slug)).toEqual({ dns_ok: 1, ssl: "active", cf_id: "ch_1" });
  });
});

import { nicheOf } from "../cloudflare/forge/src/niche";
describe("the gallery", () => {
  it("puts trades into plain niches", () => {
    expect(nicheOf("Medical Spa")).toBe("Beauty & health");
    expect(nicheOf("Plumbing")).toBe("Home services");
    expect(nicheOf("", "Waffle House")).toBe("Food & drink");
    expect(nicheOf("Escape Room")).toBe("Places & leisure");
    expect(nicheOf("Auto Repair")).toBe("Auto");
    expect(nicheOf("Thrift Store")).toBe("Shops");
    expect(nicheOf("Mystery Trade")).toBe("Other");
  });

  it("shows every finished site with its niche, look and first screen; filters, compares, and starts a site on a design", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 5);
    const add = async (name: string, trade: string, kit: Record<string, unknown>, score: number) => {
      const slug = slugOf(await build(h, b.cookie, name));
      const version = `mw${slug.slice(-6)}`;
      await saveKit(h.env, slug, version, { theme: "light", accent: "#aa3333", fonts: "", css: "", header: "", footer: "", script: "", components: "", brief: "b", pages: [{ path: "/", name: "Home", kind: "ai", brief: "" }], ...kit } as never, {});
      h.db.prepare("UPDATE site_versions SET review = ? WHERE slug = ?").run(JSON.stringify({ at: "x", score, shots: ["shot-desktop.jpg", "shot-phone.jpg"] }), slug);
      h.db.prepare("UPDATE demos SET build_status = 'ready', live_version = ?, content = json_set(content, '$.industry', ?) WHERE slug = ?").run(version, trade, slug);
      h.db.prepare("INSERT INTO build_costs (tenant_id, slug, version, usd, calls, outcome, created_at) VALUES (?, ?, ?, 2.5, 10, 'ready', 'x')").run(b.id, slug, version);
      return slug;
    };
    const spa = await add("Eco Beauty Medspa", "Medical Spa", { style: "studio", concept: "organic", hero: "own", idea: { idea: "The quiet moment at the mirror." } }, 6);
    const plumber = await add("O'Hara Plumbing", "Plumbing", {}, 7);
    const g = await html(await call(h, "/gallery", { cookie: b.cookie }));
    expect(g).toContain("Beauty &amp; health");
    expect(g).toContain("Home services");
    expect(g).toContain("Organic");
    expect(g).toContain("Its own idea");
    expect(g).toContain("The quiet moment at the mirror.");
    expect(g).toContain("Built for $2.50");
    expect(g).toContain("2 of 2 websites");
    const studioOnly = await html(await call(h, "/gallery?style=studio", { cookie: b.cookie }));
    expect(studioOnly).toContain("1 of 2 websites");
    expect(studioOnly).not.toContain(`/demos/${plumber}"`);
    expect(await html(await call(h, "/gallery?niche=Home%20services", { cookie: b.cookie }))).toContain(`/demos/${plumber}"`);
    const best = await html(await call(h, "/gallery?sort=score", { cookie: b.cookie }));
    expect(best.indexOf(`/demos/${plumber}"`)).toBeLessThan(best.indexOf(`/demos/${spa}"`));
    expect(await html(await call(h, "/gallery?view=phone", { cookie: b.cookie }))).toContain("shot-phone.jpg");
    const cmp = await html(await call(h, `/gallery/compare?s=${spa}&s=${plumber}`, { cookie: b.cookie }));
    expect(cmp.match(/<iframe/g)).toHaveLength(2);
    // Use this design: the home form opens with that site's design picked.
    const home = await html(await call(h, `/?reuse=${spa}`, { cookie: b.cookie }));
    expect(home).toContain("Building on the design of <b>Eco Beauty Medspa</b>");
    expect(home).toMatch(new RegExp(`name="reuseFrom" value="${spa}" checked`));
    // Another account sees none of these.
    const c = await makeAccount(h, admin, "Other Co", "owner@c.test", 5);
    expect(await html(await call(h, "/gallery", { cookie: c.cookie }))).toContain("0 of 0 websites");
  });
});
