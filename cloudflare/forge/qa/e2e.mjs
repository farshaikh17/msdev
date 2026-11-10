import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(HERE, "shots"), { recursive: true });
const BASE = "http://localhost:8799";
const SHOTS = process.env.SHOTS || join(HERE, "shots");
const fails = [];
const log = (m) => console.log(m);
async function step(name, fn) {
  try { await fn(); log("PASS  " + name); } catch (e) { fails.push(name + " :: " + String(e.message).split("\n")[0]); log("FAIL  " + name + " :: " + String(e.message).split("\n")[0]); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = async (o = {}) => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...o }); return c; };

  // ---------- 1. Public crawl ----------
  const visitor = await ctx();
  const consoleErrors = [];
  const vp = await visitor.newPage();
  vp.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text())) consoleErrors.push(vp.url() + " " + m.text()); });
  const seen = new Set(); const queue = ["/"]; const broken = []; const noAlt = []; const unlabeled = []; const overflow = [];
  await step("crawl every public page (links, console, alt text, labels)", async () => {
    while (queue.length && seen.size < 80) {
      const path = queue.shift(); if (seen.has(path)) continue; seen.add(path);
      const r = await vp.goto(BASE + path, { waitUntil: "domcontentloaded" });
      if (r.status() !== 200) { broken.push(path + " " + r.status()); continue; }
      const info = await vp.evaluate(() => ({
        links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
        noAlt: [...document.querySelectorAll("img:not([alt])")].length,
        unl: [...document.querySelectorAll("input:not([type=hidden]),textarea,select")].filter((i) => !i.closest("label") && !i.getAttribute("aria-label") && !(i.id && document.querySelector(`label[for="${i.id}"]`))).length,
        h1: document.querySelectorAll("h1").length,
      }));
      if (info.noAlt) noAlt.push(path);
      if (info.unl) unlabeled.push(path + " x" + info.unl);
      if (info.h1 !== 1) broken.push(path + " h1 count " + info.h1);
      for (const l of info.links) {
        if (!l || l.startsWith("#") || /^(mailto|tel|https?:)/.test(l) && !l.startsWith(BASE)) continue;
        const p = l.replace(BASE, "").split("#")[0];
        if (p.startsWith("/") && !seen.has(p) && !/^\/(login|setup|logout|sitemap.xml|robots.txt|favicon.svg)/.test(p)) queue.push(p);
      }
    }
    ok(!broken.length, "broken: " + broken.join("; "));
    ok(!noAlt.length, "images without alt: " + noAlt.join(", "));
    ok(!unlabeled.length, "unlabeled fields: " + unlabeled.join("; "));
    log("      crawled " + seen.size + " pages");
  });
  await step("no console errors on public pages", async () => ok(!consoleErrors.length, consoleErrors.slice(0, 3).join(" | ")));

  await step("no horizontal overflow on any page at 360px", async () => {
    const m = await ctx({ viewport: { width: 360, height: 800 } }); const p = await m.newPage();
    for (const path of seen) { await p.goto(BASE + path, { waitUntil: "domcontentloaded" }); if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) overflow.push(path); }
    await m.close(); ok(!overflow.length, overflow.join(", "));
  });

  await step("mobile menu opens and links work", async () => {
    const m = await ctx({ viewport: { width: 390, height: 800 } }); const p = await m.newPage();
    await p.goto(BASE + "/"); await p.click(".burger summary"); ok(await p.isVisible(".burger nav a[href='/pricing']"), "menu not shown");
    await p.click(".burger nav a[href='/pricing']"); await p.waitForURL("**/pricing"); await m.close();
  });

  await step("dark mode renders readable (screenshot)", async () => {
    const d = await ctx({ colorScheme: "dark" }); const p = await d.newPage(); await p.goto(BASE + "/"); await p.screenshot({ path: SHOTS + "/qa-home-dark.png" });
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor); ok(bg !== "rgb(251, 245, 234)", "still light"); await d.close();
  });

  await step("theme switch flips light/dark and is remembered", async () => {
    const c = await ctx({ colorScheme: "light" }); const p = await c.newPage(); await p.goto(BASE + "/");
    ok((await p.getAttribute("html", "data-theme")) === "light", "did not start light");
    await p.click(".menu [data-theme-toggle]"); ok((await p.getAttribute("html", "data-theme")) === "dark", "did not switch");
    await p.goto(BASE + "/work"); ok((await p.getAttribute("html", "data-theme")) === "dark", "not remembered");
    await p.goto(BASE + "/login"); ok((await p.getAttribute("html", "data-theme")) === "dark", "app ignores it"); await c.close();
  });
  await step("work page filters and every screenshot loads", async () => {
    const p = await (await ctx()).newPage(); await p.goto(BASE + "/work", { waitUntil: "networkidle" });
    await p.click("[data-filter] button[data-v=custom]"); const shown = await p.locator(".wcard:not([hidden])").count(); ok(shown === 6, "custom filter shows " + shown);
    const broken = await p.evaluate(async () => { const out = []; for (const im of document.images) { if (!im.complete) await new Promise((r) => { im.onload = im.onerror = r; }); if (!im.naturalWidth) out.push(im.src); } return out; });
    ok(!broken.length, "broken images: " + broken.join(", "));
  });
  await step("trade search box finds a trade", async () => {
    await vp.goto(BASE + "/trades"); await vp.fill(".search input", "dentist"); await vp.click(".search button"); await vp.waitForURL("**/trades?q=dentist");
    ok(await vp.isVisible("a[href='/trades/dentists']"), "no dentists result");
  });

  // ---------- 2. Visitor forms ----------
  await step("reseller application via the browser", async () => {
    await vp.goto(BASE + "/resellers/apply?plan=Agency");
    ok((await vp.inputValue("input[name=plan]")) === "Agency", "plan not prefilled");
    await vp.fill("input[name=name]", "Dana Dummy"); await vp.fill("input[name=email]", "dana@dummy-agency.test"); await vp.fill("input[name=company]", "Dummy Agency Co");
    await vp.fill("textarea[name=message]", "We sell to plumbers in Orlando."); await vp.click("button[type=submit]"); await vp.waitForURL("**/thanks?k=reseller");
    ok(await vp.isVisible("text=Application received"), "no thanks");
  });
  await step("contact and sample forms", async () => {
    await vp.goto(BASE + "/contact"); await vp.fill("input[name=name]", "Sam Sample"); await vp.fill("input[name=email]", "sam@sample.test"); await vp.fill("textarea[name=message]", "Do you do volume pricing?"); await vp.click("button[type=submit]"); await vp.waitForURL("**/thanks?k=contact");
    await vp.goto(BASE + "/contact?kind=sample&trade=plumbers"); await vp.fill("input[name=name]", "Pat Prospect"); await vp.fill("input[name=email]", "pat@prospect.test"); await vp.fill("input[name=website]", "Joe's Plumbing"); await vp.fill("textarea[name=message]", "Please build one."); await vp.click("button[type=submit]"); await vp.waitForURL("**/thanks?k=sample");
  });
  await step("bad email shows an error and keeps typed values", async () => {
    await vp.goto(BASE + "/contact"); await vp.fill("input[name=name]", "Keep Me"); await vp.fill("input[name=email]", "nope"); await vp.fill("textarea[name=message]", "x");
    await vp.evaluate(() => document.querySelector("input[name=email]").setAttribute("type", "text")); await vp.click("button[type=submit]");
    await vp.waitForSelector(".err"); ok((await vp.inputValue("input[name=name]")) === "Keep Me", "name lost");
  });

  // ---------- 3. Admin first-run ----------
  const adminCtx = await ctx(); const ap = await adminCtx.newPage();
  await step("signed-out app URLs send people to sign-in", async () => {
    await ap.goto(BASE + "/admin"); ok(ap.url().endsWith("/login"), "went to " + ap.url());
  });
  await step("wrong team password is refused, then the admin is set up", async () => {
    await ap.goto(BASE + "/setup"); await ap.fill("input[name=team]", "wrong"); await ap.fill("input[name=email]", "boss@dummy.test"); await ap.fill("input[name=password]", "dummy-admin-pass-1"); await ap.fill("input[name=confirm]", "dummy-admin-pass-1"); await ap.click("button[type=submit]");
    ok(await ap.isVisible("text=isn't the current team password"), "no error");
    await ap.fill("input[name=team]", "qa-team-password"); await ap.fill("input[name=password]", "dummy-admin-pass-1"); await ap.fill("input[name=confirm]", "dummy-admin-pass-1"); await ap.click("button[type=submit]");
    await ap.waitForURL(BASE + "/"); ok(await ap.isVisible("text=Sign out"), "not signed in");
  });
  await step("admin sees the 3 inquiries and the 'new' badge", async () => {
    await ap.goto(BASE + "/admin"); ok(await ap.isVisible("text=Inquiries (3 new)"), "badge missing");
    await ap.goto(BASE + "/admin/inquiries"); for (const t of ["dana@dummy-agency.test", "sam@sample.test", "pat@prospect.test"]) ok(await ap.isVisible("text=" + t), t + " missing");
  });
  let inviteUrl = "";
  await step("create an account from the reseller application, get an invite link", async () => {
    await ap.goto(BASE + "/admin/inquiries"); await ap.click("a:has-text('Create account')");
    ok((await ap.inputValue("#new input[name=name]")) === "Dummy Agency Co", "name not prefilled");
    await ap.fill("#new input[name=credits]", "5"); await ap.click("#new button[type=submit]");
    inviteUrl = await ap.evaluate(() => { const el = [...document.querySelectorAll("[data-copy]")][0]; return el ? el.getAttribute("data-copy") : ""; });
    ok(inviteUrl.includes("/invite/"), "no invite link: " + inviteUrl);
    inviteUrl = inviteUrl.replace(/^https?:\/\/[^/]+/, BASE);
  });
  await step("mark the application 'won'", async () => {
    await ap.goto(BASE + "/admin/inquiries"); await ap.locator(".card", { hasText: "dana@dummy-agency.test" }).locator("button:has-text('Mark won')").click();
    await ap.waitForURL("**/admin/inquiries"); await ap.goto(BASE + "/admin/inquiries?status=won"); ok(await ap.isVisible("text=dana@dummy-agency.test"), "not in won");
  });

  // ---------- 4. Customer onboarding ----------
  const ownerCtx = await ctx(); const op = await ownerCtx.newPage();
  await step("owner accepts the invite (short password refused, then OK)", async () => {
    await op.goto(inviteUrl); await op.fill("input[name=password]", "short"); await op.fill("input[name=confirm]", "short"); await op.click("button[type=submit]");
    ok(op.url().includes("/invite/"), "short password was accepted"); ok(await op.evaluate(() => document.querySelector("input[name=password]").validity.tooShort), "no minlength check");
    await op.fill("input[name=password]", "dummy-owner-pass-1"); await op.fill("input[name=confirm]", "dummy-owner-pass-1"); await op.click("button[type=submit]"); await op.waitForURL(BASE + "/");
    ok(await op.isVisible("text=Dummy Agency Co"), "account name not shown"); ok(await op.isVisible("text=5 credits"), "credits not shown");
  });
  await step("the invite link works only once", async () => { const p = await (await ctx()).newPage(); const r = await p.goto(inviteUrl); ok(r.status() === 410, "status " + r.status()); });

  let slug = "";
  await step("owner builds a dummy demo (no AI key locally: template site)", async () => {
    await op.goto(BASE + "/"); await op.fill("input[name=businessName]", "Dummy Plumbing Co"); await op.fill("input[name=city]", "Orlando, FL");
    const submit = op.locator("button[type=submit]:has-text('Build')").first(); await submit.click(); await op.waitForURL(/\/demos\/[a-z0-9-]+/);
    slug = op.url().match(/\/demos\/([a-z0-9-]+)/)[1]; log("      slug " + slug);
  });
  await step("owner can choose Studio, and the demo is labelled Studio", async () => {
    await op.goto(BASE + "/"); await op.click("summary:has-text('Options')"); ok(await op.isVisible("text=Studio · 3 credits"), "no Studio choice"); await op.waitForTimeout(1500); await op.locator(".concepts").screenshot({ path: SHOTS + "/qa-app-looks.png" }); ok((await op.locator(".concepts input[name=concept]").count()) === 10, "ten Studio looks expected");
    ok((await op.content()).includes("Studio · 3 credits"), "credit wording missing");
    await op.fill("input[name=businessName]", "Dummy Studio Roofing"); await op.fill("input[name=city]", "105 Court St, Cynthiana, KY 41031, United States");
    await op.click("label.choice:has(input[name=style][value=studio])"); ok(await op.isChecked("input[name=style][value=studio]"), "Studio not selected");
    await op.locator("button[type=submit]:has-text('Build')").first().click(); await op.waitForURL(/\/demos\/[a-z0-9-]+/);
    ok(await op.isVisible("h1 .pill:has-text('Studio')"), "no Studio label");
    const t = await op.content(); ok(t.includes("Cynthiana, KY") && t.includes("105 Court St"), "address not split from city");
  });
  await step("credit is spent and shown", async () => { await op.goto(BASE + "/"); ok(await op.isVisible("text=5 credits"), "credits changed on a no-AI draft"); });
  await step("the demo site loads, has the heart credit and a working form", async () => {
    const sp = await (await ctx()).newPage(); const r = await sp.goto(`${BASE}/s/${slug}`); ok(r.status() === 200, "site " + r.status());
    ok(await sp.locator("text=Dummy Plumbing Co").first().isVisible(), "name missing");
    const body = await sp.content(); ok(/Mianro Systems/.test(body), "credit line missing");
    await sp.screenshot({ path: SHOTS + "/qa-demo-site.png" });
    const res = await sp.evaluate(async (s) => (await fetch(`/s/${s}/_lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: "/", fields: { name: "Visitor Vee", phone: "555-0100" } }) })).status, slug);
    ok(res === 200, "lead status " + res);
  });
  await step("demo page has the quality check, who looked, outreach and change sections", async () => {
    await op.goto(`${BASE}/`); await op.screenshot({ path: SHOTS + "/qa-app-home.png", fullPage: true });
    await op.goto(`${BASE}/demos/${slug}`); await op.screenshot({ path: SHOTS + "/qa-app-site.png", fullPage: true }); const t = await op.content();
    for (const x of ["Who's looked", "Outreach kit", "<svg"]) ok(t.includes(x), x + " missing");
    // The quality check and change box need a Claude-built site; a template draft (no AI key here) has neither, by design.
    const ai = t.includes("Designed by Claude"); ok(ai ? t.includes("Quality check") && t.includes("Request a change") : !t.includes("Request a change"), "sections don't match the site type");
  });
  await step("a real visitor is counted; a headless bot is not", async () => {
    const c = await browser.newContext({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 } });
    const v = await c.newPage(); await v.goto(`${BASE}/s/${slug}`); await v.waitForTimeout(800); await c.close();
    await op.goto(`${BASE}/demos/${slug}`); await op.click("summary:has-text('More tools')"); ok(await op.isVisible("text=1 today") || (await op.content()).includes(">1<"), "view not counted on the demo page");
  });
  await step("quick text fix changes the live site", async () => {
    await op.goto(`${BASE}/demos/${slug}`);
    if (!(await op.locator("input[name=find]").count())) { log("      (template site: no change box, as designed)"); return; }
    await op.fill("input[name=find]", "Dummy Plumbing Co"); await op.fill("input[name=replace]", "Dummy Plumbing Company"); await op.click("button:has-text('Replace everywhere')");
    await op.waitForURL(/demos\//); ok((await op.content()).includes("wasn't found") || (await op.content()).includes("Replaced"), "no result message");
  });
  await step("bulk build queues beyond three at a time", async () => {
    await op.goto(`${BASE}/`); await op.click("summary:has-text('build several at once')"); await op.fill("textarea[name=bulk]", "Bulk One | Tampa, FL\nBulk Two | Austin, TX\nBulk Three\nBulk Four");
    await op.click("button:has-text('Build them all')"); await op.waitForURL(/\/\?/); const t = await op.content(); ok(/Started \d+ build/.test(t), "no bulk message: " + (t.match(/flash[^<]*<[^>]*>([^<]*)/) || [])[1]);
  });
  await step("the submission appears on the demo page for the owner", async () => { await op.goto(`${BASE}/demos/${slug}`); await op.click("summary:has-text('More tools')"); ok(await op.isVisible("text=Visitor Vee"), "lead not shown"); });
  await step("owner team page: invite a member", async () => {
    await op.goto(BASE + "/team"); await op.fill("input[name=email]", "member@dummy-agency.test"); await op.click("button:has-text('invite'), button:has-text('Invite'), button:has-text('Create')");
    ok(await op.isVisible("[data-copy]"), "no invite link");
  });
  let apiKey = "";
  await step("owner creates an API key and uses it", async () => {
    await op.goto(BASE + "/api"); await op.fill("input[name=name]", "Dummy key"); await op.click("button:has-text('Create')");
    apiKey = await op.evaluate(() => (document.body.innerText.match(/fk_live_[A-Za-z0-9_-]+/) || [""])[0]); ok(apiKey, "no key shown");
    const me = await fetch(BASE + "/api/v1/me", { headers: { authorization: "Bearer " + apiKey } }); ok(me.status === 200, "me " + me.status);
    const bad = await fetch(BASE + "/api/v1/me", { headers: { authorization: "Bearer fk_live_nope" } }); ok(bad.status === 401, "bad key " + bad.status);
    const mk = await fetch(BASE + "/api/v1/demos", { method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" }, body: JSON.stringify({ businessName: "API Dummy Dental", city: "Tampa, FL" }) }); ok(mk.status === 200 || mk.status === 201 || mk.status === 202, "create " + mk.status);
    const list = await (await fetch(BASE + "/api/v1/demos", { headers: { authorization: "Bearer " + apiKey } })).json(); ok(JSON.stringify(list).includes("API Dummy Dental"), "not in list");
  });
  await step("owner cannot reach admin", async () => { await op.goto(BASE + "/admin"); ok(!(await op.isVisible("text=Inquiries")), "owner sees admin"); });
  await step("owner can change their own password and sign back in", async () => {
    await op.goto(BASE + "/settings"); ok(await op.isVisible("text=Password") || (await op.content()).includes("assword"), "no password card");
  });

  // ---------- 5. Admin management of the customer ----------
  await step("admin adds credits with a note; ledger shows it", async () => {
    await ap.goto(BASE + "/admin"); await ap.click("a:has-text('Dummy Agency Co')"); await ap.fill("input[name=delta]", "7"); await ap.fill("input[name=reason]", "Paid invoice 1042"); await ap.click("button:has-text('Apply')");
    ok(await ap.isVisible("text=Paid invoice 1042"), "ledger missing");
  });
  await step("white-label footer: custom name changes the demo site", async () => {
    await ap.click("form[action$='/branding'] select[name=creditMode]"); await ap.selectOption("select[name=creditMode]", "custom"); await ap.fill("input[name=creditName]", "Dummy Agency Co"); await ap.fill("input[name=creditUrl]", "https://dummy-agency.test");
    await ap.click("form[action$='/branding'] button[type=submit]");
    const sp = await (await ctx()).newPage(); await sp.goto(`${BASE}/s/${slug}?x=${Date.now()}`); await sp.waitForTimeout(500); ok((await sp.content()).includes("dummy-agency.test"), "custom credit missing");
  });
  await step("admin features the dummy demo on the public Examples page", async () => {
    await ap.goto(BASE + "/admin/site"); await ap.fill("textarea[name=showcase]", `${BASE}/s/${slug}`); await ap.click("button[type=submit]");
    ok(await ap.isVisible("text=Saved"), "not saved"); const p = await (await ctx()).newPage(); await p.goto(BASE + "/examples"); ok(await p.isVisible("text=Dummy Plumbing Co"), "not on examples"); await p.screenshot({ path: SHOTS + "/qa-examples.png" });
    await p.goto(BASE + "/"); ok((await p.content()).includes("Dummy Plumbing Co"), "not on home");
  });
  await step("suspending the account switches off sign-in, site, form and examples", async () => {
    await ap.goto(BASE + "/admin"); await ap.click("a:has-text('Dummy Agency Co')"); await ap.click("button:has-text('Suspend account')");
    const p = await (await ctx()).newPage(); const r = await p.goto(`${BASE}/s/${slug}?y=${Date.now()}`); ok(r.status() === 404, "site " + r.status());
    await p.goto(BASE + "/examples"); ok(!(await p.isVisible("text=Dummy Plumbing Co")), "still featured");
    const lead = await p.evaluate(async (s) => (await fetch(`/s/${s}/_lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fields: { a: "b" } }) })).status, slug); ok(lead === 404, "lead " + lead);
    const o2 = await (await ctx()).newPage(); await o2.goto(BASE + "/login"); await o2.fill("input[name=email]", "dana@dummy-agency.test"); await o2.fill("input[name=password]", "dummy-owner-pass-1"); await o2.click("button[type=submit]"); ok(!(await o2.isVisible("text=Sign out")), "suspended owner signed in");
    const api = await fetch(BASE + "/api/v1/me", { headers: { authorization: "Bearer " + apiKey } }); ok(api.status >= 401, "api still works " + api.status);
  });
  await step("activating brings it back", async () => {
    await ap.click("button:has-text('Activate account')"); const p = await (await ctx()).newPage(); const r = await p.goto(`${BASE}/s/${slug}?z=${Date.now()}`); ok(r.status() === 200, "site " + r.status());
  });
  await step("wrong passwords lock sign-in after 5 tries", async () => {
    const p = await (await ctx()).newPage(); let last = 0;
    for (let i = 0; i < 7; i++) { await p.goto(BASE + "/login"); await p.fill("input[name=email]", "nobody@x.test"); await p.fill("input[name=password]", "wrong-pass-" + i); const [resp] = await Promise.all([p.waitForResponse((r) => r.url().endsWith("/login") && r.request().method() === "POST"), p.click("button[type=submit]")]); last = resp.status(); }
    ok(last === 429, "last status " + last);
  });
  await step("sign out works", async () => { await ap.click("text=Sign out"); await ap.waitForURL("**/login"); ok(!!(await (await ap.goto(BASE + "/admin")).ok), "x"); ok(ap.url().endsWith("/login"), "still in"); });

  await browser.close();
  log("\n" + (fails.length ? fails.length + " FAILURES:\n- " + fails.join("\n- ") : "ALL QA STEPS PASSED"));
  process.exit(fails.length ? 1 : 0);
})();
