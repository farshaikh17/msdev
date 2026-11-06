/**
 * Forge Demo as a whole: the app's real routes run against a database built from the real
 * migrations (in-memory SQLite standing in for D1). No network and no Claude: builds are queued
 * to a recording stub. These tests are about the reseller layer, above all that one account can
 * never see or touch another's data.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDemo, goLive, saveFailed, saveKit, savePage } from "../cloudflare/forge/src/db";
import { creditFor, widgetFor } from "../cloudflare/forge/src/site";
import { getTenant, getUserByEmail, listLedger, listTenants } from "../cloudflare/forge/src/tenants";
import { ADMIN, TEAM_PASSWORD, build, call, cookieOf, html, loc, makeAccount, makeHarness, setupAdmin, slugOf, type Harness } from "./forge-harness";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";

let h: Harness;
beforeEach(() => {
  h = makeHarness();
});
afterEach(() => vi.restoreAllMocks());

describe("first-time set-up and sign-in", () => {
  it("shows the sign-in page, and set-up only works with the old team password", async () => {
    const home = await call(h, "/");
    expect(await html(home)).toContain("First time here? Set up the administrator account.");
    const wrong = await call(h, "/setup", { form: { team: "nope", email: ADMIN.email, password: ADMIN.password, confirm: ADMIN.password } });
    expect(await html(wrong)).toContain("isn&#39;t the current team password");
    expect(await userRows(h)).toBe(0);
    const cookie = await setupAdmin(h);
    expect(await userRows(h)).toBe(1);
    expect((await call(h, "/", { cookie })).status).toBe(200);
    // Once an administrator exists, set-up is closed.
    expect(loc(await call(h, "/setup"))).toBe("/login");
    expect(loc(await call(h, "/setup", { form: { team: TEAM_PASSWORD, email: "x@y.test", password: "another-password", confirm: "another-password" } }))).toBe("/login");
    expect(await userRows(h)).toBe(1);
  });

  it("set-up reopens when there is no administrator (lost admin), even with customer accounts present", async () => {
    const admin = await setupAdmin(h);
    await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    h.db.exec("DELETE FROM users WHERE role = 'admin'");
    expect(await html(await call(h, "/"))).toContain("Set up the administrator account");
    const again = await call(h, "/setup", { form: { team: TEAM_PASSWORD, email: "new-boss@mianro.test", password: "new-admin-password", confirm: "new-admin-password" } });
    expect(again.status).toBe(303);
    expect((await getUserByEmail(h.env, "new-boss@mianro.test"))!.role).toBe("admin");
    // The customer's owner is untouched.
    expect((await getUserByEmail(h.env, "owner@b.test"))!.role).toBe("owner");
  });

  it("signs in with email and password, and rejects a wrong password", async () => {
    await setupAdmin(h);
    const bad = await call(h, "/login", { form: { email: ADMIN.email, password: "wrong-password" } });
    expect(await html(bad)).toContain("don&#39;t match");
    const ok = await call(h, "/login", { form: { email: ADMIN.email.toUpperCase(), password: ADMIN.password } });
    expect(ok.status).toBe(303);
    expect(cookieOf(ok)).toMatch(/^forge_session=/);
  });

  it("locks an address out after 5 wrong passwords, and a forged cookie gets nowhere", async () => {
    await setupAdmin(h);
    for (let n = 0; n < 5; n++) expect((await call(h, "/login", { form: { email: ADMIN.email, password: `wrong-${n}` }, ip: "198.51.100.9" })).status).toBe(200);
    const locked = await call(h, "/login", { form: { email: ADMIN.email, password: ADMIN.password }, ip: "198.51.100.9" });
    expect(locked.status).toBe(429);
    expect(locked.headers.get("retry-after")).toBe("900");
    // Another address is unaffected.
    expect((await call(h, "/login", { form: { email: ADMIN.email, password: ADMIN.password }, ip: "198.51.100.10" })).status).toBe(303);
    // A made-up session cookie is just the sign-in page.
    expect(await html(await call(h, "/", { cookie: "forge_session=1.1.9999999999999.forged" }))).toContain("Sign in");
  });
});

async function userRows(x: Harness) {
  return (x.db.prepare("SELECT count(*) c FROM users").get() as { c: number }).c;
}

describe("accounts are isolated from each other", () => {
  it("one account can't see, open, change or archive another's demo", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const c = await makeAccount(h, admin, "Cedar Marketing", "owner@c.test");
    const slugB = slugOf(await build(h, b.cookie, "Bravo Plumbing"));
    const slugC = slugOf(await build(h, c.cookie, "Charlie Roofing"));
    expect(slugB).toBeTruthy();
    expect(slugC).toBeTruthy();

    // Each only lists its own.
    const listB = await html(await call(h, "/", { cookie: b.cookie }));
    expect(listB).toContain("Bravo Plumbing");
    expect(listB).not.toContain("Charlie Roofing");
    // Opening the other's demo is "not found" (a redirect home with a message), never the page.
    for (const path of [`/demos/${slugC}`]) {
      const r = await call(h, path, { cookie: b.cookie });
      expect(r.status).toBe(303);
      expect(loc(r)).toContain("doesn't exist");
    }
    // Changing, redesigning or archiving it does nothing.
    const before = h.queued.length;
    expect(loc(await call(h, `/demos/${slugC}/rewrite`, { cookie: b.cookie, form: { businessName: "Hijacked" } }))).toContain("doesn't exist");
    expect(loc(await call(h, `/demos/${slugC}/rebuild`, { cookie: b.cookie, form: {} }))).toContain("doesn't exist");
    await call(h, `/demos/${slugC}/archive`, { cookie: b.cookie, form: {} });
    expect(h.queued.length).toBe(before);
    const row = h.db.prepare("SELECT business_name, status FROM demos WHERE slug = ?").get(slugC) as { business_name: string; status: string };
    expect(row).toMatchObject({ business_name: "Charlie Roofing", status: "active" });
    // Even the platform administrator's own account is a separate account.
    expect(loc(await call(h, `/demos/${slugB}`, { cookie: admin }))).toContain("doesn't exist");
  });

  it("a slug that belongs to someone else can't be overwritten through save", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const slugB = slugOf(await build(h, b.cookie, "Bravo Plumbing"));
    const { saveDemo } = await import("../cloudflare/forge/src/db");
    const { Intake } = await import("../src/forge/schema");
    const { draftContent } = await import("../src/forge/copy");
    const intake = Intake.parse({ businessName: "Evil Copy" });
    await saveDemo(h.env, { slug: slugB, intake, content: draftContent(intake), writtenBy: "draft", createdAt: "x", updatedAt: "x" }, 1);
    const row = h.db.prepare("SELECT business_name, tenant_id FROM demos WHERE slug = ?").get(slugB) as { business_name: string; tenant_id: number };
    expect(row.business_name).toBe("Bravo Plumbing");
    expect(row.tenant_id).not.toBe(1);
  });

  it("members can build but can't reach team, API keys, settings or the admin console", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const invite = await call(h, "/team/invite", { cookie: b.cookie, form: { email: "member@b.test", role: "member" } });
    const token = (await html(invite)).match(/\/invite\/([A-Za-z0-9_-]{20,80})/)![1];
    const joined = await call(h, `/invite/${token}`, { form: { password: "member-password-1", confirm: "member-password-1" } });
    const member = cookieOf(joined);
    expect((await call(h, "/", { cookie: member })).status).toBe(200);
    expect(slugOf(await build(h, member, "Member Made"))).toBeTruthy();
    for (const path of ["/team", "/api", "/admin", "/admin/videos"]) expect(loc(await call(h, path, { cookie: member })), path).toContain("/?error=");
    expect(loc(await call(h, "/settings/chat", { cookie: member, form: { chatWidget: "off" } }))).toContain("/?error=");
    // The owner can't reach the admin console either.
    expect(loc(await call(h, "/admin", { cookie: b.cookie }))).toContain("/?error=");
  });

  it("an owner can't remove or reset a person from another account, or Mianro staff", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    await makeAccount(h, admin, "Cedar Marketing", "owner@c.test");
    const cUser = await getUserByEmail(h.env, "owner@c.test");
    const adminUser = await getUserByEmail(h.env, ADMIN.email);
    for (const id of [cUser!.id, adminUser!.id]) {
      for (const act of ["remove", "reset"]) {
        const page = await html(await call(h, `/team/${id}/${act}`, { cookie: b.cookie, form: {} }));
        expect(page).toContain("can&#39;t be changed here");
      }
    }
    expect((await getUserByEmail(h.env, "owner@c.test"))!.status).toBe("active");
    expect(await userRows(h)).toBe(3);
  });
});

describe("credits", () => {
  it("takes a credit per build, refuses at zero without creating anything, and refunds a failed build once", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    const one = slugOf(await build(h, b.cookie, "First Co"));
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    expect(h.queued.at(-1)!.body).toMatchObject({ slug: one, stage: "kit" });
    const two = slugOf(await build(h, b.cookie, "Second Co"));
    expect((await getTenant(h.env, b.id))!.credits).toBe(0);
    const demosBefore = (h.db.prepare("SELECT count(*) c FROM demos").get() as { c: number }).c;
    const queuedBefore = h.queued.length;
    const third = await build(h, b.cookie, "Third Co");
    expect(loc(third)).toContain("No build credits");
    expect((h.db.prepare("SELECT count(*) c FROM demos").get() as { c: number }).c).toBe(demosBefore);
    expect(h.queued.length).toBe(queuedBefore);

    // A failed build gives its credit back, exactly once.
    const version = (await getDemo(h.env, one))!.buildVersion!;
    expect(await saveFailed(h.env, one, version, "Claude was unavailable")).toBe(true);
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    expect(await saveFailed(h.env, one, version, "again")).toBe(false);
    expect((await getTenant(h.env, b.id))!.credits).toBe(1);
    const ledger = await listLedger(h.env, b.id);
    expect(ledger.map((e) => e.delta)).toEqual([1, -1, -1, 2]);

    // Trying again (resume) takes it again; a build that goes live costs nothing more and clears the marker.
    await saveKit(h.env, one, version, { theme: "light", accent: "#112233", fonts: "", css: "", header: "", footer: "", script: "", brief: "", pages: [{ path: "/", name: "Home", brief: "", kind: "ai" }] }, { cost_usd: 0.4 });
    await savePage(h.env, one, version, "/", { title: "t", description: "d", css: "", body: "<main></main>" }, { cost_usd: 0.3 });
    expect(loc(await call(h, `/demos/${one}/rebuild`, { cookie: b.cookie, form: {} }))).toContain("ok=");
    expect((await getTenant(h.env, b.id))!.credits).toBe(0);
    await goLive(h.env, one, version);
    expect((await getTenant(h.env, b.id))!.credits).toBe(0);
    const cost = (await listTenants(h.env)).find((t) => t.id === b.id)!;
    expect(cost.builds).toBe(1);
    // The failed attempt had spent nothing yet; the finished build cost 0.4 (design) + 0.3 (page).
    expect(cost.costTotal).toBeCloseTo(0.7, 5);
    expect(two).toBeTruthy();
  });

  it("limits how many builds an account runs at once", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 10);
    for (const n of ["A1", "B2", "C3"]) expect(loc(await build(h, b.cookie, `${n} Co`))).toContain("ok=");
    const fourth = await build(h, b.cookie, "D4 Co");
    expect(loc(fourth)).toContain("Three builds");
    expect((await getTenant(h.env, b.id))!.credits).toBe(7);
  });

  it("only Mianro staff can add credits, and the balance never goes below zero", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 2);
    await call(h, `/admin/tenants/${b.id}/credits`, { cookie: b.cookie, form: { delta: "100", reason: "free money" } });
    expect((await getTenant(h.env, b.id))!.credits).toBe(2);
    await call(h, `/admin/tenants/${b.id}/credits`, { cookie: admin, form: { delta: "10", reason: "Invoice 1042" } });
    expect((await getTenant(h.env, b.id))!.credits).toBe(12);
    await call(h, `/admin/tenants/${b.id}/credits`, { cookie: admin, form: { delta: "-500", reason: "oops" } });
    expect((await getTenant(h.env, b.id))!.credits).toBe(0);
  });
});

describe("suspension and deletion", () => {
  it("a suspended account is signed out, its API key stops, and it comes back when activated", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const keyPage = await html(await call(h, "/api/keys", { cookie: b.cookie, form: { name: "Zap" } }));
    const key = keyPage.match(/fk_live_[A-Za-z0-9_-]{20,}/)![0];
    expect((await call(h, "/api/v1/me", { bearer: key })).status).toBe(200);
    await call(h, `/admin/tenants/${b.id}/status`, { cookie: admin, form: { status: "suspended" } });
    expect(await html(await call(h, "/", { cookie: b.cookie }))).toContain("Sign in");
    expect((await call(h, "/api/v1/me", { bearer: key })).status).toBe(401);
    const login = await call(h, "/login", { form: { email: "owner@b.test", password: "owner-password-1" } });
    expect(login.status).toBe(200);
    await call(h, `/admin/tenants/${b.id}/status`, { cookie: admin, form: { status: "active" } });
    expect((await call(h, "/api/v1/me", { bearer: key })).status).toBe(200);
    // The Mianro account can't be suspended or deleted.
    await call(h, "/admin/tenants/1/status", { cookie: admin, form: { status: "suspended" } });
    expect((await getTenant(h.env, 1))!.status).toBe("active");
  });

  it("deleting an account removes everything it owned and nothing else", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const c = await makeAccount(h, admin, "Cedar Marketing", "owner@c.test");
    const slugB = slugOf(await build(h, b.cookie, "Bravo Plumbing"));
    const slugC = slugOf(await build(h, c.cookie, "Charlie Roofing"));
    h.db.prepare("INSERT INTO leads (slug, page, fields, created_at) VALUES (?, '/', '{}', 'x')").run(slugB);
    const wrong = await html(await call(h, `/admin/tenants/${b.id}/delete`, { cookie: admin, form: { confirm: "Bright" } }));
    expect(wrong).toContain("Type the account name exactly");
    expect((await getTenant(h.env, b.id)) !== null).toBe(true);
    await call(h, `/admin/tenants/${b.id}/delete`, { cookie: admin, form: { confirm: "Bright Ideas" } });
    expect(await getTenant(h.env, b.id)).toBeNull();
    const left = (sql: string) => (h.db.prepare(sql).get() as { c: number }).c;
    expect(left(`SELECT count(*) c FROM demos WHERE slug = '${slugB}'`)).toBe(0);
    expect(left(`SELECT count(*) c FROM leads WHERE slug = '${slugB}'`)).toBe(0);
    expect(left(`SELECT count(*) c FROM users WHERE email = 'owner@b.test'`)).toBe(0);
    expect(left(`SELECT count(*) c FROM demos WHERE slug = '${slugC}'`)).toBe(1);
    expect(left(`SELECT count(*) c FROM users WHERE email = 'owner@c.test'`)).toBe(1);
  });
});

describe("invites, password resets and changes", () => {
  it("an invite link works once, and a reset link sets a new password and ends old sessions", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const inv = await html(await call(h, "/team/invite", { cookie: b.cookie, form: { email: "second@b.test", role: "owner" } }));
    const token = inv.match(/\/invite\/([A-Za-z0-9_-]{20,80})/)![1];
    expect((await call(h, `/invite/${token}`)).status).toBe(200);
    const ok = await call(h, `/invite/${token}`, { form: { password: "second-password-1", confirm: "second-password-1" } });
    expect(ok.status).toBe(303);
    // Second use of the same link: gone.
    expect((await call(h, `/invite/${token}`)).status).toBe(410);
    expect((await call(h, `/invite/${token}`, { form: { password: "hijack-password-1", confirm: "hijack-password-1" } })).status).toBe(410);
    // Mismatched passwords don't use the link up.
    const inv2 = await html(await call(h, "/team/invite", { cookie: b.cookie, form: { email: "third@b.test", role: "member" } }));
    const t2 = inv2.match(/\/invite\/([A-Za-z0-9_-]{20,80})/)![1];
    expect(await html(await call(h, `/invite/${t2}`, { form: { password: "third-password-1", confirm: "different-password" } }))).toContain("don&#39;t match");
    expect((await call(h, `/invite/${t2}`)).status).toBe(200);

    // Reset: the old session stops working, the new password works.
    const second = await getUserByEmail(h.env, "second@b.test");
    const secondCookie = cookieOf(ok);
    expect((await call(h, "/", { cookie: secondCookie })).status).toBe(200);
    const reset = await html(await call(h, `/team/${second!.id}/reset`, { cookie: b.cookie, form: {} }));
    const rt = reset.match(/\/invite\/([A-Za-z0-9_-]{20,80})/)![1];
    expect((await call(h, `/invite/${rt}`, { form: { password: "reset-password-1", confirm: "reset-password-1" } })).status).toBe(303);
    expect(await html(await call(h, "/", { cookie: secondCookie }))).toContain("Sign in");
    expect((await call(h, "/login", { form: { email: "second@b.test", password: "reset-password-1" } })).status).toBe(303);
    expect((await call(h, "/login", { form: { email: "second@b.test", password: "second-password-1" } })).status).toBe(200);
  });

  it("changing your password signs out your other devices but not this one", async () => {
    const admin = await setupAdmin(h);
    const other = (await call(h, "/login", { form: { email: ADMIN.email, password: ADMIN.password } }));
    const otherCookie = cookieOf(other);
    const wrong = await call(h, "/settings/password", { cookie: admin, form: { current: "not-it-at-all", next: "brand-new-password", confirm: "brand-new-password" } });
    expect(loc(wrong)).toContain("isn't right");
    const ok = await call(h, "/settings/password", { cookie: admin, form: { current: ADMIN.password, next: "brand-new-password", confirm: "brand-new-password" } });
    expect(loc(ok)).toContain("ok=");
    expect((await call(h, "/", { cookie: cookieOf(ok) })).status).toBe(200);
    expect(await html(await call(h, "/", { cookie: admin }))).toContain("Sign in");
    expect(await html(await call(h, "/", { cookie: otherCookie }))).toContain("Sign in");
  });

  it("removing a person ends their session at once", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const inv = await html(await call(h, "/team/invite", { cookie: b.cookie, form: { email: "temp@b.test", role: "member" } }));
    const joined = await call(h, `/invite/${inv.match(/\/invite\/([A-Za-z0-9_-]{20,80})/)![1]}`, { form: { password: "temp-password-1", confirm: "temp-password-1" } });
    const tempCookie = cookieOf(joined);
    const temp = await getUserByEmail(h.env, "temp@b.test");
    await call(h, `/team/${temp!.id}/remove`, { cookie: b.cookie, form: {} });
    expect(await html(await call(h, "/", { cookie: tempCookie }))).toContain("Sign in");
    expect(await getUserByEmail(h.env, "temp@b.test")).toBeNull();
  });
});

describe("the API", () => {
  async function apiFor(admin: string, name: string, email: string, credits = 3) {
    const acct = await makeAccount(h, admin, name, email, credits);
    const page = await html(await call(h, "/api/keys", { cookie: acct.cookie, form: { name: "Test" } }));
    return { ...acct, key: page.match(/fk_live_[A-Za-z0-9_-]{20,}/)![0] };
  }

  it("rejects missing, wrong and revoked keys", async () => {
    const admin = await setupAdmin(h);
    const b = await apiFor(admin, "Bright Ideas", "owner@b.test");
    expect((await call(h, "/api/v1/me")).status).toBe(401);
    expect((await call(h, "/api/v1/me", { bearer: "fk_live_notarealkeynotarealkey" })).status).toBe(401);
    expect((await call(h, "/api/v1/me", { bearer: b.key })).status).toBe(200);
    const id = (h.db.prepare("SELECT id FROM api_keys").get() as { id: number }).id;
    await call(h, `/api/keys/${id}/revoke`, { cookie: b.cookie, form: {} });
    expect((await call(h, "/api/v1/me", { bearer: b.key })).status).toBe(401);
    // Only a hash of the key is stored.
    expect(JSON.stringify(h.db.prepare("SELECT * FROM api_keys").all())).not.toContain(b.key);
  });

  it("creates a demo with a credit, shows only its own demos, and reports errors clearly", async () => {
    const admin = await setupAdmin(h);
    const b = await apiFor(admin, "Bright Ideas", "owner@b.test", 1);
    const c = await apiFor(admin, "Cedar Marketing", "owner@c.test", 5);
    const created = await call(h, "/api/v1/demos", { bearer: b.key, json: { businessName: "API Plumbing", city: "Tampa, FL", phone: "(813) 555-0100" } });
    expect(created.status).toBe(201);
    const made = (await created.json()) as { slug: string; status: string; site_url: string; credits_left: number };
    expect(made).toMatchObject({ status: "building", credits_left: 0 });
    expect(made.site_url).toBe(`https://sites.test/${made.slug}`);
    expect(h.queued.at(-1)!.body).toMatchObject({ slug: made.slug, stage: "kit" });

    expect(((await (await call(h, `/api/v1/demos/${made.slug}`, { bearer: b.key })).json()) as { status: string }).status).toBe("building");
    expect((await call(h, `/api/v1/demos/${made.slug}`, { bearer: c.key })).status).toBe(404);
    expect(((await (await call(h, "/api/v1/demos", { bearer: c.key })).json()) as { demos: unknown[] }).demos).toEqual([]);
    expect(((await (await call(h, "/api/v1/demos", { bearer: b.key })).json()) as { demos: unknown[] }).demos).toHaveLength(1);

    const broke = await call(h, "/api/v1/demos", { bearer: b.key, json: { businessName: "Second Co" } });
    expect(broke.status).toBe(402);
    expect(((await broke.json()) as { error: string }).error).toContain("credits");
    expect((await call(h, "/api/v1/demos", { bearer: c.key, json: { city: "Nowhere" } })).status).toBe(422);
    expect((await call(h, "/api/v1/demos", { bearer: c.key, json: { businessName: "Bad Colour Co", primaryColor: "red" } })).status).toBe(422);
    expect((await call(h, "/api/v1/demos", { bearer: c.key, method: "POST" })).status).toBe(400);
    expect((await call(h, "/api/v1/nope", { bearer: c.key })).status).toBe(404);
  });

  it("limits each key to 60 requests a minute", async () => {
    const admin = await setupAdmin(h);
    const b = await apiFor(admin, "Bright Ideas", "owner@b.test");
    let last = 200;
    for (let n = 0; n < 62; n++) last = (await call(h, "/api/v1/me", { bearer: b.key })).status;
    expect(last).toBe(429);
  });
});

describe("webhooks", () => {
  it("signs what it sends so the receiver can check it came from here", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    expect(loc(await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "http://insecure.example/hook" } }))).toContain("https");
    expect(loc(await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "https://10.0.0.1/hook" } }))).toContain("public");
    expect(loc(await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "https://hooks.example.com/forge" } }))).toContain("ok=");
    const t = (await getTenant(h.env, b.id))!;
    expect(t.webhookSecret).toMatch(/^whsec_/);

    const seen: { url: string; headers: Headers; body: string }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      seen.push({ url: String(input), headers: new Headers(init?.headers), body: String(init?.body) });
      return new Response("ok", { status: 200 });
    });
    const res = await call(h, "/settings/webhook/test", { cookie: b.cookie, form: {} });
    expect(loc(res)).toContain("ok=Delivered");
    expect(seen).toHaveLength(1);
    const { url, headers, body } = seen[0];
    expect(url).toBe("https://hooks.example.com/forge");
    expect(headers.get("x-forge-event")).toBe("ping");
    // Recompute the signature the way a receiver would.
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(t.webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${headers.get("x-forge-timestamp")}.${body}`)))].map((x) => x.toString(16).padStart(2, "0")).join("");
    expect(headers.get("x-forge-signature")).toBe(`sha256=${mac}`);
    expect(JSON.parse(body)).toMatchObject({ event: "ping", demo: null });
    expect((await getTenant(h.env, b.id))!.webhookStatus).toContain("Delivered 200");
  });
});

describe("what visitors see: footer credit and chat widget", () => {
  const base = { creditMode: "mianro" as const, creditName: "", creditUrl: "" };
  it("defaults to the Mianro credit; Mianro can swap it for the customer's own, or remove it", () => {
    expect(creditFor(base)).toContain('href="https://www.mianrosystems.com/"');
    expect(creditFor({ ...base, creditMode: "none" })).toBe("");
    const custom = creditFor({ creditMode: "custom", creditName: "Bright <Ideas>", creditUrl: "https://bright.example" });
    expect(custom).toContain('href="https://bright.example"');
    expect(custom).toContain("Bright &lt;Ideas&gt;");
    expect(custom).toContain("Made with");
    expect(custom).not.toContain("mianrosystems.com");
    // No name or an unsafe link never produces a broken or unsafe credit.
    expect(creditFor({ creditMode: "custom", creditName: "", creditUrl: "https://x.example" })).toContain("mianrosystems.com");
    expect(creditFor({ creditMode: "custom", creditName: "Acme", creditUrl: "javascript:alert(1)" })).not.toContain("href");
  });

  it("only Mianro's own account falls back to the Mianro chat widget", () => {
    expect(widgetFor({ id: 1, chatWidget: "" }, "")).toBe("6a872a7164c286aff3546896");
    expect(widgetFor({ id: 7, chatWidget: "" }, "")).toBe("");
    expect(widgetFor({ id: 7, chatWidget: "abcdef123456abcdef" }, "")).toBe("abcdef123456abcdef");
    expect(widgetFor({ id: 7, chatWidget: "abcdef123456abcdef" }, "off")).toBe("");
    expect(widgetFor({ id: 1, chatWidget: "off" }, "")).toBe("");
  });

  it("the admin console sets an account's credit line, and rejects unsafe links", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const bad = await html(await call(h, `/admin/tenants/${b.id}/branding`, { cookie: admin, form: { name: "Bright Ideas", creditMode: "custom", creditName: "Bright", creditUrl: "javascript:alert(1)" } }));
    expect(bad).toContain("must start with https://");
    await call(h, `/admin/tenants/${b.id}/branding`, { cookie: admin, form: { name: "Bright Ideas", creditMode: "custom", creditName: "Bright Ideas", creditUrl: "https://bright.example" } });
    const t = (await getTenant(h.env, b.id))!;
    expect(t).toMatchObject({ creditMode: "custom", creditName: "Bright Ideas", creditUrl: "https://bright.example" });
    // The customer can't change it.
    await call(h, `/admin/tenants/${b.id}/branding`, { cookie: b.cookie, form: { name: "Bright Ideas", creditMode: "none" } });
    expect((await getTenant(h.env, b.id))!.creditMode).toBe("custom");
  });
});

describe("the existing Mianro demos survive the move to accounts", () => {
  it("migration puts what was there under the Mianro account, with its GoHighLevel page and widget settings", () => {
    const old = new DatabaseSync(":memory:");
    const files = readdirSync("cloudflare/forge/migrations").sort();
    for (const f of files.filter((x) => x < "0009")) old.exec(readFileSync(`cloudflare/forge/migrations/${f}`, "utf8"));
    old.exec("INSERT INTO settings (key, value) VALUES ('ghlPageUrl', 'https://mianrosystems.com/demo'), ('chatWidget', 'off')");
    old.exec("INSERT INTO demos (slug, business_name, intake, content, written_by, status, created_at, updated_at) VALUES ('pollux-1', 'Pollux', '{}', '{}', 'ai', 'active', 'x', 'x')");
    old.exec("INSERT INTO video_library (name, keywords, urls, created_at) VALUES ('HVAC', 'hvac', 'https://x/a.mp4', 'x')");
    old.exec(readFileSync(`cloudflare/forge/migrations/${files.find((x) => x.startsWith("0009"))!}`, "utf8"));
    expect(old.prepare("SELECT tenant_id FROM demos").get()).toMatchObject({ tenant_id: 1 });
    expect(old.prepare("SELECT tenant_id FROM video_library").get()).toMatchObject({ tenant_id: null });
    expect(old.prepare("SELECT name, unlimited, ghl_page_url, chat_widget FROM tenants WHERE id = 1").get()).toMatchObject({ name: "Mianro Systems", unlimited: 1, ghl_page_url: "https://mianrosystems.com/demo", chat_widget: "off" });
  });
});

describe("leads reach the account's own system", () => {
  const post = (hh: Harness, slug: string, fields: Record<string, string>, ip = "192.0.2.77") => call(hh, `/s/${slug}/_lead`, { json: { page: "/quote", fields }, ip });

  it("stores a form submission, sends lead.created to the webhook, and the API can read it back", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const c = await makeAccount(h, admin, "Cedar Marketing", "owner@c.test");
    await call(h, "/settings/webhook", { cookie: b.cookie, form: { webhookUrl: "https://hooks.example.com/forge" } });
    const key = (await html(await call(h, "/api/keys", { cookie: b.cookie, form: { name: "k" } }))).match(/fk_live_[A-Za-z0-9_-]{20,}/)![0];
    const otherKey = (await html(await call(h, "/api/keys", { cookie: c.cookie, form: { name: "k" } }))).match(/fk_live_[A-Za-z0-9_-]{20,}/)![0];
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));

    const seen: { body: string; headers: Headers }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      seen.push({ body: String(init?.body), headers: new Headers(init?.headers) });
      return new Response("ok");
    });
    const sent: Promise<unknown>[] = [];
    // The app hands the notification to waitUntil; capture it so the test can wait for it.
    const { default: worker } = await import("../cloudflare/forge/src/index");
    const res = await worker.fetch(
      new Request(`https://app.test/s/${slug}/_lead`, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.80" }, body: JSON.stringify({ page: "/quote", fields: { name: "Dana", phone: "555-0101", message: "Need a fade" } }) }),
      h.env,
      { waitUntil: (p: Promise<unknown>) => void sent.push(p) },
    );
    expect(res.status).toBe(200);
    await Promise.all(sent);
    expect(seen).toHaveLength(1);
    expect(seen[0].headers.get("x-forge-event")).toBe("lead.created");
    expect(JSON.parse(seen[0].body)).toMatchObject({ event: "lead.created", demo: { slug, business_name: "Bravo Barbers" }, lead: { page: "/quote", fields: { name: "Dana", phone: "555-0101", message: "Need a fade" } } });

    const mine = (await (await call(h, `/api/v1/demos/${slug}/leads`, { bearer: key })).json()) as { leads: { fields: Record<string, string>; page: string }[] };
    expect(mine.leads).toHaveLength(1);
    expect(mine.leads[0]).toMatchObject({ page: "/quote", fields: { name: "Dana" } });
    // Another account can't read them.
    expect((await call(h, `/api/v1/demos/${slug}/leads`, { bearer: otherKey })).status).toBe(404);
    // The owner sees it on the demo page too.
    expect(await html(await call(h, `/demos/${slug}`, { cookie: b.cookie }))).toContain("Need a fade");
  });

  it("a suspended account's forms stop, and an empty or junk submission isn't stored", async () => {
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test");
    const slug = slugOf(await build(h, b.cookie, "Bravo Barbers"));
    expect((await post(h, slug, {}, "192.0.2.81")).status).toBe(400);
    expect((await call(h, `/s/${slug}/_lead`, { method: "POST", ip: "192.0.2.82" })).status).toBe(400);
    expect((await post(h, slug, { name: "Ok" }, "192.0.2.83")).status).toBe(200);
    await call(h, `/admin/tenants/${b.id}/status`, { cookie: admin, form: { status: "suspended" } });
    expect((await post(h, slug, { name: "After" }, "192.0.2.84")).status).toBe(404);
    expect((h.db.prepare("SELECT count(*) c FROM leads WHERE slug = ?").get(slug) as { c: number }).c).toBe(1);
  });
});
