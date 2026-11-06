/** The public Forge website: pages, SEO files, the forms, and the admin screens that manage them. */
import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN, call, cookieOf, html, loc, makeAccount, makeHarness, setupAdmin, type Harness } from "./forge-harness";
import { GUIDES, TRADES } from "../cloudflare/forge/src/web-content";
import { parsePlans, parseSlugs } from "../cloudflare/forge/src/web";

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});

const inquiries = (h: Harness) => h.db.prepare("SELECT * FROM inquiries ORDER BY id").all() as { kind: string; name: string; email: string; status: string; extra: string; company: string }[];

describe("public pages", () => {
  it("shows the marketing home to signed-out visitors, and the dashboard to signed-in people", async () => {
    const out = await html(await call(h, "/"));
    expect(out).toContain("Show every local business their");
    expect(out).toContain('href="/login"');
    const cookie = await setupAdmin(h);
    const inn = await html(await call(h, "/", { cookie }));
    expect(inn).not.toContain("Show every local business their");
    expect(inn).toContain("Sign out");
  });

  it("serves every public page, trade page and guide with a title, description and canonical link", async () => {
    const paths = ["/how-it-works", "/pricing", "/resellers", "/resellers/apply", "/examples", "/trades", "/guides", "/faq", "/contact", "/terms", "/privacy", ...TRADES.map((t) => `/trades/${t.slug}`), ...GUIDES.map((g) => `/guides/${g.slug}`)];
    for (const p of paths) {
      const r = await call(h, p);
      expect(r.status, p).toBe(200);
      const body = await html(r);
      expect(body, p).toMatch(/<title>[^<]{8,}<\/title>/);
      expect(body, p).toContain('rel="canonical"');
      expect(body, p).toContain('name="description"');
      expect(body, p).not.toContain("undefined");
    }
  });

  it("returns a real 404 for unknown pages, trades and guides", async () => {
    for (const p of ["/nope", "/trades/unicorns", "/guides/nothing"]) expect((await call(h, p)).status, p).toBe(404);
  });

  it("sends signed-out visitors from app pages to sign-in", async () => {
    for (const p of ["/demos/abc", "/team", "/settings", "/admin"]) {
      const r = await call(h, p);
      expect(r.status, p).toBe(303);
      expect(loc(r)).toBe("/login");
    }
  });

  it("publishes a sitemap and robots file that keep the app out of search", async () => {
    const map = await html(await call(h, "/sitemap.xml"));
    expect(map).toContain("/trades/plumbers");
    expect(map).toContain("/guides/demo-first-selling");
    expect(map).not.toContain("/admin");
    const robots = await html(await call(h, "/robots.txt"));
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  it("puts the trade search results on /trades?q=", async () => {
    const hit = await html(await call(h, "/trades?q=plumb"));
    expect(hit).toContain("/trades/plumbers");
    expect(hit).not.toContain("/trades/dentists");
    expect(await html(await call(h, "/trades?q=zzzz"))).toContain("No match");
  });

  it("escapes what visitors put in the search", async () => {
    const out = await html(await call(h, "/trades?q=%3Cscript%3Ealert(1)%3C/script%3E"));
    expect(out).not.toContain("<script>alert(1)");
  });

  it("has the red-heart credit with the link only on Mianro Systems", async () => {
    const out = await html(await call(h, "/"));
    expect(out).toContain('Made with <span class="heart">♥</span> by <a style="display:inline" href="https://mianrosystems.com">Mianro Systems</a>');
  });
});

describe("price packs and examples", () => {
  it("shows default packs and lets an admin change them", async () => {
    expect(await html(await call(h, "/pricing"))).toContain("Starter");
    const admin = await setupAdmin(h);
    const r = await call(h, "/admin/site", {
      cookie: admin,
      form: { name0: "Solo", credits0: "5", price0: "$30", blurb0: "Just one", name1: "", name2: "", name3: "", featured: "0", showcase: "" },
    });
    expect(r.status).toBe(303);
    const pricing = await html(await call(h, "/pricing"));
    expect(pricing).toContain("Solo");
    expect(pricing).toContain("$6.00");
    expect(pricing).not.toContain("Starter");
  });

  it("rejects a pack list with nothing in it and demos that don't exist", async () => {
    const admin = await setupAdmin(h);
    const none = await html(await call(h, "/admin/site", { cookie: admin, form: { name0: "", featured: "0", showcase: "" } }));
    expect(none).toContain("Keep at least one pack");
    const bad = await html(await call(h, "/admin/site", { cookie: admin, form: { name0: "Solo", credits0: "5", price0: "$30", featured: "0", showcase: "ghost-demo-1234" } }));
    expect(bad).toContain("don&#39;t exist");
  });

  it("features only demos that staff chose, while their account is active", async () => {
    const admin = await setupAdmin(h);
    const acct = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 3);
    const slug = (await call(h, "/demos", { cookie: acct.cookie, form: { businessName: "Pollux Air", city: "Orlando, FL" } })).headers.get("location")!.match(/demos\/([a-z0-9-]+)/)![1];
    expect(await html(await call(h, "/examples"))).not.toContain("Pollux Air");
    await call(h, "/admin/site", { cookie: admin, form: { name0: "Solo", credits0: "5", price0: "$30", featured: "0", showcase: `https://sites.test/${slug}` } });
    expect(await html(await call(h, "/examples"))).toContain("Pollux Air");
    await call(h, `/admin/tenants/${acct.id}/status`, { cookie: admin, form: { status: "suspended" } });
    expect(await html(await call(h, "/examples"))).not.toContain("Pollux Air");
  });

  it("parses packs and links safely", () => {
    expect(parsePlans([{ name: "A", credits: 3, price: "$9" }, { name: "", credits: 3 }, { name: "B", credits: -1 }])).toHaveLength(1);
    expect(parsePlans("nope")).toEqual([]);
    expect(parsePlans([{ name: "A", credits: 3 }, { name: "B", credits: 4 }]).filter((p) => p.featured)).toHaveLength(1);
    expect(parseSlugs("https://x.test/a-b-c1?x=1\nplain-slug-9999\n!!")).toEqual(["a-b-c1", "plain-slug-9999"]);
  });
});

describe("forms", () => {
  const apply = { name: "Dana", email: "dana@agency.test", company: "Bright Agency", volume: "11–50", plan: "Agency", trades: "plumbers", message: "Hello" };

  it("stores a reseller application and thanks the visitor", async () => {
    const r = await call(h, "/resellers/apply", { form: apply });
    expect(r.status).toBe(303);
    expect(loc(r)).toContain("/thanks?k=reseller");
    const rows = inquiries(h);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "reseller", email: "dana@agency.test", company: "Bright Agency", status: "new" });
    expect(JSON.parse(rows[0].extra)).toMatchObject({ plan: "Agency", volume: "11–50" });
    expect(await html(await call(h, "/thanks?k=reseller"))).toContain("Application received");
  });

  it("stores contact and sample requests", async () => {
    await call(h, "/contact", { form: { kind: "contact", name: "Sam", email: "sam@x.test", message: "Question" } });
    await call(h, "/contact", { form: { kind: "sample", name: "Sam", email: "sam@x.test", message: "Joe's Plumbing", trade: "plumbers" } });
    expect(inquiries(h).map((r) => r.kind)).toEqual(["contact", "sample"]);
  });

  it("checks the fields and keeps what was typed", async () => {
    const noMail = await call(h, "/contact", { form: { name: "Sam", email: "nope", message: "Hi" } });
    expect(noMail.status).toBe(400);
    expect(await html(noMail)).toContain("valid email");
    const noCompany = await call(h, "/resellers/apply", { form: { name: "Dana", email: "d@a.test" } });
    expect(await html(noCompany)).toContain("agency or company");
    const noMsg = await call(h, "/contact", { form: { name: "Sam", email: "sam@x.test" } });
    expect(await html(noMsg)).toContain("short message");
    expect(inquiries(h)).toHaveLength(0);
  });

  it("silently drops submissions that fill the hidden bot field", async () => {
    const r = await call(h, "/contact", { form: { name: "Bot", email: "bot@x.test", message: "buy", company_url: "http://spam" } });
    expect(r.status).toBe(303);
    expect(inquiries(h)).toHaveLength(0);
  });

  it("limits how many a single address can send", async () => {
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await call(h, "/contact", { form: { name: "Sam", email: "sam@x.test", message: `m${i}`, }, ip: "9.9.9.9" })).status;
    expect(last).toBe(429);
    expect(inquiries(h)).toHaveLength(5);
    expect((await call(h, "/contact", { form: { name: "Sam", email: "sam@x.test", message: "other" }, ip: "8.8.8.8" })).status).toBe(303);
  });

  it("escapes what is typed when the form is shown again", async () => {
    const r = await call(h, "/contact", { form: { name: '"><script>x()</script>', email: "bad", message: "x" } });
    expect(await html(r)).not.toContain("<script>x()");
  });

  it("refuses cross-site posts", async () => {
    const r = await (await import("../cloudflare/forge/src/index")).default.fetch(
      new Request("https://forge.test/contact", { method: "POST", headers: { origin: "https://evil.test", "content-type": "application/x-www-form-urlencoded" }, body: "name=a&email=a@b.co&message=x" }),
      h.env,
      { waitUntil: () => undefined } as never,
    );
    expect(r.status).toBe(403);
    expect(inquiries(h)).toHaveLength(0);
  });
});

describe("admin: inquiries", () => {
  it("lists them for admins only, filters, changes status, and pre-fills a new account", async () => {
    await call(h, "/resellers/apply", { form: { name: "Dana", email: "dana@agency.test", company: "Bright Agency", plan: "Agency" } });
    const admin = await setupAdmin(h);
    const acct = await makeAccount(h, admin, "Other Co", "owner@o.test", 1);
    expect((await call(h, "/admin/inquiries", { cookie: acct.cookie })).status).toBeGreaterThanOrEqual(300);
    const page = await html(await call(h, "/admin/inquiries", { cookie: admin }));
    expect(page).toContain("dana@agency.test");
    expect(page).toContain("Reseller application");
    expect(page).toContain("name=Bright+Agency");
    expect(await html(await call(h, "/admin", { cookie: admin }))).toContain("1 new");

    const id = (h.db.prepare("SELECT id FROM inquiries").get() as { id: number }).id;
    await call(h, `/admin/inquiries/${id}/status`, { cookie: admin, form: { status: "won" } });
    expect(inquiries(h)[0].status).toBe("won");
    expect(await html(await call(h, "/admin/inquiries?status=new", { cookie: admin }))).not.toContain("dana@agency.test");
    expect(await html(await call(h, "/admin/inquiries?status=won", { cookie: admin }))).toContain("dana@agency.test");

    const pre = await html(await call(h, "/admin?name=Bright%20Agency&email=dana%40agency.test&credits=10", { cookie: admin }));
    expect(pre).toContain('value="Bright Agency"');
    expect(pre).toContain('value="dana@agency.test"');
    void cookieOf;
    void ADMIN;
  });
});

describe("demo site details found in QA", () => {
  it("answers the browser's pre-flight for a form post from a sandboxed demo page", async () => {
    const r = await call(h, "/s/some-demo-1234/_lead", { method: "OPTIONS" });
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-methods")).toContain("POST");
    expect(r.headers.get("access-control-allow-headers")).toContain("content-type");
  });

  it("puts the account's own footer credit on the older template page too", async () => {
    const { templateCredit } = await import("../cloudflare/forge/src/site");
    const page = '<footer><span class="fg-credit">Made with <span class="fg-heart" role="img" aria-label="love">♥</span> by <a href="https://www.mianrosystems.com/" target="_blank" rel="noopener">Mianro Systems</a></span></footer>';
    expect(templateCredit(page, { creditMode: "mianro", creditName: "", creditUrl: "" })).toBe(page);
    expect(templateCredit(page, { creditMode: "none", creditName: "", creditUrl: "" })).toBe("<footer></footer>");
    const custom = templateCredit(page, { creditMode: "custom", creditName: "Dummy <Agency>", creditUrl: "https://dummy.test" });
    expect(custom).toContain('<a href="https://dummy.test" target="_blank" rel="noopener">Dummy &lt;Agency&gt;</a>');
    expect(custom).not.toContain("Mianro");
  });
});

describe("hostile input", () => {
  it("keeps markup typed into a public form inert in the admin screen", async () => {
    await call(h, "/contact", { form: { name: "<img src=x onerror=alert(1)>", email: "x@y.test", message: "<script>alert(2)</script>", website: '"><svg onload=alert(3)>' } });
    const admin = await setupAdmin(h);
    const page = await html(await call(h, "/admin/inquiries", { cookie: admin }));
    expect(page).not.toContain("<img src=x");
    expect(page).not.toContain("<script>alert(2)");
    expect(page).not.toContain("<svg onload");
    expect(page).toContain("&lt;script&gt;alert(2)");
  });
});

describe("sample sites", () => {
  it("lists three fictional samples on Examples and serves each one isolated and unindexed", async () => {
    const list = await html(await call(h, "/examples"));
    for (const n of ["Harbor Plumbing Co", "Bright Smile Dental", "Casa Verde Kitchen"]) expect(list).toContain(n);
    for (const s of ["harbor-plumbing", "bright-smile-dental", "casa-verde-kitchen"]) {
      const r = await call(h, `/examples/sample/${s}`);
      expect(r.status, s).toBe(200);
      expect(r.headers.get("content-security-policy")).toContain("sandbox");
      expect(r.headers.get("x-robots-tag")).toBe("noindex");
      expect(await html(r)).toContain("555-01");
    }
    expect((await call(h, "/examples/sample/nope")).status).toBe(404);
  });
});
