/** Where each site stands as a sales lead: marked on the demo page or through the API, counted and filtered on the dashboard. */
import { beforeEach, describe, expect, it } from "vitest";
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
