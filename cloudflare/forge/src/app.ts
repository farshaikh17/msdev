/**
 * The app people sign in to (forge-demo): sign-in and set-up, invitations, the dashboard and demos,
 * and, by role, the team, API keys and settings (owners) and the admin console (Mianro staff).
 * Public pages and the API are routed first; everything else needs a session, and everything a
 * session touches is scoped to its own account.
 */
import { handleApi } from "./api";
import { checkLogin, checkOwnPassword, checkTeamPassword, currentSession, passwordProblem, sameOrigin, sessionCookie, signOutCookie, type Session } from "./auth";
import { hashPassword } from "./crypto";
import {
  archiveDemo,
  clearAttempts,
  deleteVideo,
  getDemo,
  getKit,
  getReview,
  getSetting,
  listDemos,
  listLeads,
  listOwnVideos,
  listSharedVideos,
  markQueued,
  pagesDone,
  recordAttempt,
  replaceText,
  saveVideo,
  setChangeNote,
  setOutreach,
  setSetting,
  throttled,
  viewStats,
} from "./db";
import { Invalid, NoCredits, checkWidget, createDemo, noCreditsText, rawFields, redesignDemo, startMessage } from "./demos";
import { pagesOf, sitemapFor } from "./designer";
import { DEFAULT_FOLDER, FOLDER_KEY, folderId, syncFolder } from "./drive";
import type { Ctx, Env } from "./env";
import { ghlLink, ghlSnippet, sitesBase } from "./ghl";
import { parseKeywords, parseVideoUrls } from "./hero";
import { serveImage, servePitch, serveSite, takeLead, templateJson } from "./serve";
import { IMAGE_PATH } from "./index";
import { qrSvg, writeOutreach } from "./outreach";
import { BROWSER_BUDGET_SECONDS, browserUsed } from "./review";
import { DEFAULT_WIDGET_ID, widgetId } from "./site";
import {
  createApiKey,
  createFirstAdmin,
  createTenant,
  createToken,
  consumeToken,
  createUser,
  deleteTenant,
  getTenant,
  getUser,
  getUserByEmail,
  grantCredits,
  listApiKeys,
  listLedger,
  listPending,
  listTenants,
  listUsers,
  peekToken,
  removeUser,
  revokeApiKey,
  setPassword,
  tenantUsage,
  updateTenant,
  adminCount,
} from "./tenants";
import { demoPage, homePage, invitePage, isOwner, loginPage, page, setupPage } from "./ui";
import { adminInquiriesPage, adminPage, adminSitePage, adminTenantPage, adminVideosPage } from "./ui-admin";
import { STUDIO_CREDITS } from "./tenants";
import { apiPage, passwordCard, settingsPage, teamPage } from "./ui-settings";
import { deliver, newWebhookSecret, webhookUrlProblem } from "./webhook";
import { countNewInquiries, getPlans, getShowcaseSlugs, handleWeb, listInquiries, parsePlans, parseSlugs, payUrlOk, setInquiryStatus, webNotFound } from "./web";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
/** Wrong passwords allowed per address (and per email), and how long the count lasts. */
const LOGIN_TRIES = 5;
const LOGIN_TRIES_PER_EMAIL = 20;
const LOGIN_WINDOW_MIN = 15;

const redirect = (to: string, extra: Record<string, string> = {}) => new Response(null, { status: 303, headers: { location: to, ...extra } });
const withMsg = (path: string, kind: "ok" | "error", text: string) => `${path}?${kind}=${encodeURIComponent(text)}`;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)) || "Something went wrong.";
const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? "unknown";
const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Wrap a rendered page so it carries a status code (e.g. 429 for a locked-out sign-in). */
function withStatus(r: Response, status: number, extra: Record<string, string> = {}): Response {
  return new Response(r.body, { status, headers: { ...Object.fromEntries(r.headers), ...extra } });
}

export async function handleApp(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  const origin = url.origin;
  const base = sitesBase(env.SITES_ORIGIN, origin);
  const site = (slug: string) => `${base}${slug}`;
  const post = req.method === "POST";

  // ---- Public: demo sites on this origin, the template JSON, and the API ----------------------
  if (req.method === "OPTIONS")
    // A form post from a sandboxed demo page is cross-origin, so the browser asks first.
    return new Response(null, { status: 204, headers: /\/_lead$/.test(path) ? { ...CORS, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } : CORS });
  let m = path.match(/^\/s\/([a-z0-9-]+)\/_lead$/);
  if (m && post) return takeLead(req, env, ctx, m[1]);
  m = path.match(/^\/s\/([a-z0-9-]{3,64})\/_pitch$/);
  if (m && req.method === "GET") return env.SITES_ORIGIN ? Response.redirect(`${site(m[1])}/_pitch`, 302) : servePitch(req, env, m[1], `/s/${m[1]}`);
  const im = path.replace(/^\/s/, "").match(IMAGE_PATH);
  if (im && path.startsWith("/s/") && req.method === "GET") return serveImage(req, env, ctx, im[1], im[2], im[3]);
  m = path.match(/^\/s\/([a-z0-9-]+)((?:\/[a-z0-9-]+){1,2})?$/);
  if (m && req.method === "GET") {
    if (env.SITES_ORIGIN) return Response.redirect(`${site(m[1])}${m[2] ?? ""}`, 302);
    return serveSite(req, env, ctx, m[1], m[2] ?? "", `/s/${m[1]}`, true);
  }
  m = path.match(/^\/api\/s\/([a-z0-9-]+)$/);
  if (m && req.method === "GET") return templateJson(env, m[1]);
  if (path.startsWith("/api/v1/") || path === "/api/v1") return handleApi(req, env, path, base);

  // ---- First-time set-up, sign-in, invitations ------------------------------------------------
  if (path === "/setup") {
    if ((await adminCount(env)) > 0) return redirect("/login");
    if (!post) return setupPage();
    const key = `setup:${clientIp(req)}`;
    if (await throttled(env, key, LOGIN_TRIES)) return withStatus(setupPage(`Too many tries. Wait ${LOGIN_WINDOW_MIN} minutes.`), 429);
    const f = await req.formData();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    const password = String(f.get("password") ?? "");
    if (!(await checkTeamPassword(env, String(f.get("team") ?? "")))) {
      await recordAttempt(env, key, LOGIN_WINDOW_MIN * 60_000);
      return setupPage("That isn't the current team password.", email);
    }
    if (!EMAIL.test(email)) return setupPage("Enter a valid email address.", email);
    const bad = passwordProblem(password, String(f.get("confirm") ?? ""));
    if (bad) return setupPage(bad, email);
    const admin = await createFirstAdmin(env, email, await hashPassword(password));
    if (!admin) return redirect("/login");
    return redirect("/", { "set-cookie": await sessionCookie(env, admin) });
  }

  if (path === "/login" && post) {
    const f = await req.formData();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    // Wrong guesses are counted per address and per email; past the limit the answer is "wait".
    const ipKey = `login:${clientIp(req)}`;
    const mailKey = `loginuser:${email.slice(0, 120)}`;
    if ((await throttled(env, ipKey, LOGIN_TRIES)) || (await throttled(env, mailKey, LOGIN_TRIES_PER_EMAIL)))
      return withStatus(loginPage(`Too many wrong passwords. Try again in ${LOGIN_WINDOW_MIN} minutes.`), 429, { "retry-after": String(LOGIN_WINDOW_MIN * 60) });
    const user = await checkLogin(env, email, String(f.get("password") ?? ""));
    if (user) {
      await clearAttempts(env, ipKey);
      return redirect("/", { "set-cookie": await sessionCookie(env, user) });
    }
    await recordAttempt(env, ipKey, LOGIN_WINDOW_MIN * 60_000);
    await recordAttempt(env, mailKey, LOGIN_WINDOW_MIN * 60_000);
    return loginPage("That email and password don't match.", (await adminCount(env)) === 0, email);
  }
  if (path === "/logout" && post) return redirect("/login", { "set-cookie": signOutCookie });

  m = path.match(/^\/invite\/([A-Za-z0-9_-]{20,80})$/);
  if (m) {
    const token = m[1];
    const info = await peekToken(env, token);
    if (!info) return withStatus(loginPage("That link has expired or was already used. Ask for a new one."), 410);
    const tenant = await getTenant(env, info.tenantId);
    if (!tenant) return withStatus(loginPage("That link isn't valid."), 410);
    const again = (err?: string) => invitePage({ kind: info.kind, email: info.email, account: tenant.name }, token, err);
    if (!post) return again();
    const f = await req.formData();
    const password = String(f.get("password") ?? "");
    const bad = passwordProblem(password, String(f.get("confirm") ?? ""));
    if (bad) return again(bad);
    if (info.kind === "invite" && (await getUserByEmail(env, info.email))) return again("That email already has an account. Sign in instead.");
    if (!(await consumeToken(env, token))) return withStatus(loginPage("That link was just used. Ask for a new one."), 410);
    const hash = await hashPassword(password);
    let userId: number;
    if (info.kind === "reset" && info.userId) {
      const u = await getUser(env, info.userId);
      if (!u || u.tenantId !== info.tenantId || u.status !== "active") return withStatus(loginPage("That link isn't valid."), 410);
      await setPassword(env, u.id, hash);
      userId = u.id;
    } else {
      userId = (await createUser(env, { tenantId: info.tenantId, email: info.email, pwHash: hash, role: info.role === "owner" ? "owner" : "member" })).id;
    }
    const fresh = (await getUser(env, userId))!;
    return redirect("/", { "set-cookie": await sessionCookie(env, fresh) });
  }

  // ---- Everything below needs a signed-in person ---------------------------------------------
  const s = await currentSession(req, env);
  // The public website (home, pricing, trades, guides, forms…). Signed-in people see their dashboard at "/".
  const web = await handleWeb(req, env, path, !!s);
  if (web) return web;
  if (!s) {
    if (path === "/login") return loginPage(undefined, (await adminCount(env)) === 0);
    if (/^\/(demos|team|api|settings|admin)(\/|$)/.test(path) || post) return redirect("/login");
    return webNotFound(req, false);
  }
  if (post && !sameOrigin(req)) return text("Cross-site form posts are not accepted.", 403);
  if (path === "/login") return redirect("/");

  const aiOn = !!env.ANTHROPIC_API_KEY;
  const owner = isOwner(s);
  const needOwner = () => redirect(withMsg("/", "error", "Only an account owner can do that."));

  // ---- Dashboard and demos -------------------------------------------------------------------
  if (path === "/" && req.method === "GET") {
    const [demos, views, usage] = await Promise.all([listDemos(env, s.tenant.id), viewStats(env, { tenantId: s.tenant.id }), tenantUsage(env, s.tenant.id)]);
    return homePage(s, demos.map((d) => ({ ...d, views: views.get(d.slug) })), site, aiOn, usage, q("error"), q("ok"));
  }

  // Several at once: one business per line (a name, "name | city", or a Google Maps link).
  if (path === "/demos/bulk" && post) {
    const f = await req.formData();
    const style = f.get("style") === "studio" ? "studio" : "standard";
    const lines = String(f.get("bulk") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 25);
    if (!lines.length) return redirect(withMsg("/", "error", "Paste at least one business, one per line."));
    const each = style === "studio" ? STUDIO_CREDITS : 1;
    if (!s.tenant.unlimited && s.tenant.credits < lines.length * each && aiOn)
      return redirect(withMsg("/", "error", `${lines.length} ${style === "studio" ? "Studio " : ""}builds need ${lines.length * each} credits and this account has ${s.tenant.credits}.`));
    let started = 0, queued = 0;
    const problems: string[] = [];
    for (const line of lines) {
      const [first, second] = line.split("|").map((x) => x.trim());
      const raw: Record<string, string> = /^https?:\/\//i.test(first) ? { googleUrl: first, city: second ?? "" } : { businessName: first, city: second ?? "" };
      raw.style = style;
      try {
        const r = await createDemo(env, (await getTenant(env, s.tenant.id)) ?? s.tenant, s.user.id, raw);
        if (r.start === "busy") {
          await markQueued(env, r.slug);
          queued++;
        } else if (r.start === "started" || r.start === "ai-off") started++;
        else problems.push(`${first}: no credits left`);
      } catch (e) {
        problems.push(`${first.slice(0, 40)}: ${e instanceof NoCredits ? "no credits left" : e instanceof Invalid ? e.message : "couldn't start"}`);
      }
    }
    const msg = `Started ${started} build${started === 1 ? "" : "s"}${queued ? `, ${queued} queued (they start as slots free up)` : ""}.${problems.length ? ` Skipped: ${problems.join("; ")}` : ""}`;
    return redirect(withMsg("/", problems.length && !started && !queued ? "error" : "ok", msg));
  }

  if (path === "/demos" && post) {
    try {
      const r = await createDemo(env, s.tenant, s.user.id, rawFields(await req.formData()));
      const msg = startMessage(r.start);
      return redirect(withMsg(`/demos/${r.slug}`, msg.err ? "error" : "ok", msg.err ?? msg.ok ?? "Started."));
    } catch (e) {
      if (e instanceof NoCredits) return redirect(withMsg("/", "error", noCreditsText(e)));
      if (e instanceof Invalid) return redirect(withMsg("/", "error", e.message));
      throw e;
    }
  }

  m = path.match(/^\/demos\/([a-z0-9-]+)(\/rewrite|\/rebuild|\/archive|\/outreach|\/change|\/replace|\/review|\/pairs)?$/);
  if (m) {
    const [, slug, action] = m;
    // Always scoped to this account: another account's demo is simply "not found".
    const demo = await getDemo(env, slug, { tenantId: s.tenant.id });
    if (!demo) return redirect(withMsg("/", "error", "That demo doesn't exist or was archived."));
    if (!action && req.method === "GET") {
      const building = demo.buildStatus === "building" && demo.buildVersion ? demo.buildVersion : null;
      const [done, buildKit, liveKit, leads] = await Promise.all([
        building ? pagesDone(env, slug, building).then((d) => d.length) : 0,
        building ? getKit(env, slug, building) : null,
        demo.liveVersion ? getKit(env, slug, demo.liveVersion) : null,
        listLeads(env, slug),
      ]);
      const pages = liveKit ? pagesOf(liveKit).map((p) => ({ name: p.name, path: p.path, url: `${site(slug)}${p.path === "/" ? "" : p.path}` })) : [];
      const total = (buildKit ? pagesOf(buildKit) : sitemapFor(demo.intake)).length;
      const [review, views] = await Promise.all([demo.liveVersion ? getReview(env, slug, demo.liveVersion) : null, viewStats(env, { slugs: [slug] })]);
      return demoPage(s, demo, { site: site(slug), ghl: ghlLink(s.tenant.ghlPageUrl, slug), pages }, { done, total }, leads, q("ok"), q("error"), {
        review,
        views: views.get(slug),
        pitch: review?.shots?.length ? `${site(slug)}/_pitch` : "",
        qr: qrSvg(site(slug)),
      });
    }
    if ((action === "/rewrite" || action === "/rebuild") && post) {
      try {
        const raw = action === "/rewrite" ? rawFields(await req.formData()) : null;
        const result = await redesignDemo(env, s.tenant, s.user.id, demo, raw);
        const msg = startMessage(result);
        return redirect(withMsg(`/demos/${slug}`, msg.err ? "error" : "ok", msg.err ?? msg.ok ?? "Started."));
      } catch (e) {
        if (e instanceof NoCredits) return redirect(withMsg(`/demos/${slug}`, "error", noCreditsText(e)));
        if (e instanceof Invalid) return redirect(withMsg(`/demos/${slug}`, "error", e.message));
        throw e;
      }
    }
    if (action === "/pairs" && post) {
      if (!demo.liveVersion) return redirect(withMsg(`/demos/${slug}`, "error", "Wait for the design to finish first."));
      if (!aiOn) return redirect(withMsg(`/demos/${slug}`, "error", "This needs Claude, which is switched off."));
      if (demo.changeNote?.status === "working" && Date.now() - Date.parse(demo.changeNote.at) < 10 * 60_000) return redirect(withMsg(`/demos/${slug}`, "error", "A change is still being applied. Give it a minute."));
      await setChangeNote(env, slug, { path: "/gallery", instruction: "Add illustrative before/after photos", status: "working", error: "", at: new Date().toISOString() });
      await env.BUILDS.send({ slug, version: demo.liveVersion, stage: "pairs" });
      return redirect(withMsg(`/demos/${slug}`, "ok", "Making the before and after pictures and rewriting the gallery and home page around them. Usually 3–6 minutes."));
    }
    if (action === "/review" && post) {
      if (!owner) return needOwner();
      if (!demo.liveVersion) return redirect(withMsg(`/demos/${slug}`, "error", "Wait for the design to finish first."));
      await env.BUILDS.send({ slug, version: demo.liveVersion, stage: "review" });
      return redirect(withMsg(`/demos/${slug}`, "ok", "Quality check queued. It takes a few minutes; this page shows the result."));
    }
    if (action === "/outreach" && post) {
      if (!aiOn) return redirect(withMsg(`/demos/${slug}`, "error", "Outreach needs Claude, which is switched off."));
      const out = await writeOutreach(env, demo, site(slug), { name: s.user.email.split("@")[0]!.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), agency: s.tenant.name });
      await setOutreach(env, slug, out);
      return redirect(withMsg(`/demos/${slug}`, "ok", "Outreach written. Edit it to taste before sending."));
    }
    if (action === "/change" && post) {
      const f = await req.formData();
      const pagePath = String(f.get("path") ?? "/");
      const instruction = String(f.get("instruction") ?? "").trim().slice(0, 600);
      if (!demo.liveVersion) return redirect(withMsg(`/demos/${slug}`, "error", "Wait for the design to finish before requesting changes."));
      if (!aiOn) return redirect(withMsg(`/demos/${slug}`, "error", "Changes need Claude, which is switched off."));
      const kit = await getKit(env, slug, demo.liveVersion);
      if (!kit || !pagesOf(kit).some((p) => p.path === pagePath)) return redirect(withMsg(`/demos/${slug}`, "error", "Pick one of the site's pages."));
      if (instruction.length < 5) return redirect(withMsg(`/demos/${slug}`, "error", "Say what should change, in a sentence or two."));
      const busyNote = demo.changeNote?.status === "working" && Date.now() - Date.parse(demo.changeNote.at) < 10 * 60_000;
      if (busyNote) return redirect(withMsg(`/demos/${slug}`, "error", "A change is still being applied. Give it a minute."));
      await setChangeNote(env, slug, { path: pagePath, instruction, status: "working", error: "", at: new Date().toISOString() });
      await env.BUILDS.send({ slug, version: demo.liveVersion, stage: "change", path: pagePath, instruction });
      return redirect(withMsg(`/demos/${slug}`, "ok", "Applying your change. The page updates itself in a minute or two."));
    }
    if (action === "/replace" && post) {
      const f = await req.formData();
      const find = String(f.get("find") ?? "").trim().slice(0, 200);
      const replacement = String(f.get("replace") ?? "").trim().slice(0, 200);
      if (!demo.liveVersion) return redirect(withMsg(`/demos/${slug}`, "error", "Wait for the design to finish first."));
      if (find.length < 2) return redirect(withMsg(`/demos/${slug}`, "error", "Type the exact text to replace."));
      const n = await replaceText(env, slug, demo.liveVersion, find, replacement);
      return redirect(withMsg(`/demos/${slug}`, n ? "ok" : "error", n ? `Replaced "${find}" in ${n} place${n === 1 ? "" : "s"}. Pages update within 30 seconds.` : `"${find}" wasn't found on any page (it has to match exactly, including capitals).`));
    }
    if (action === "/archive" && post) {
      await archiveDemo(env, slug, s.tenant.id);
      return redirect(withMsg("/", "ok", `Archived ${demo.intake.businessName}. Its links stop working within 30 seconds.`));
    }
  }

  // ---- Settings (owners; everyone can change their own password) -------------------------------
  if (path === "/settings/password" && post) {
    const f = await req.formData();
    if (!(await checkOwnPassword(env, s.user.id, String(f.get("current") ?? "")))) return redirect(withMsg("/settings", "error", "The current password isn't right."));
    const bad = passwordProblem(String(f.get("next") ?? ""), String(f.get("confirm") ?? ""));
    if (bad) return redirect(withMsg("/settings", "error", bad));
    await setPassword(env, s.user.id, await hashPassword(String(f.get("next"))));
    // Keep this browser signed in; every other device is signed out.
    const fresh = (await getUser(env, s.user.id))!;
    return redirect(withMsg("/settings", "ok", "Password changed. Other devices were signed out."), { "set-cookie": await sessionCookie(env, fresh) });
  }
  if (path === "/settings" && req.method === "GET" && !owner) {
    return page("Settings", `<main class="main">${passwordCard()}</main>`, { nav: "settings", session: s });
  }

  if (path === "/settings" || path.startsWith("/settings/")) {
    if (!owner) return needOwner();
    if (path === "/settings" && req.method === "GET")
      return settingsPage(s, { snippet: ghlSnippet(base), defaultWidget: DEFAULT_WIDGET_ID, ownVideos: await listOwnVideos(env, s.tenant.id) }, q("ok"), q("error"));
    if (path === "/settings" && post) {
      const raw = String((await req.formData()).get("ghlPageUrl") ?? "").trim();
      if (raw && !/^https?:\/\/[^\s]+$/.test(raw)) return redirect(withMsg("/settings", "error", "Paste the full page address, starting with https://"));
      await updateTenant(env, s.tenant.id, { ghlPageUrl: raw });
      return redirect(withMsg("/settings", "ok", raw ? "GoHighLevel page saved" : "GoHighLevel page removed"));
    }
    if (path === "/settings/chat" && post) {
      const raw = String((await req.formData()).get("chatWidget") ?? "").trim();
      try {
        checkWidget(raw);
      } catch (e) {
        return redirect(withMsg("/settings", "error", errText(e)));
      }
      const id = /^(off|none|no)$/i.test(raw) ? "off" : widgetId(raw, "");
      await updateTenant(env, s.tenant.id, { chatWidget: id });
      return redirect(withMsg("/settings", "ok", id === "off" ? "Chat widget turned off" : id ? "Chat widget saved" : "Chat widget removed"));
    }
    if (path === "/settings/webhook" && post) {
      const url = String((await req.formData()).get("webhookUrl") ?? "").trim();
      const bad = webhookUrlProblem(url);
      if (bad) return redirect(withMsg("/settings", "error", bad));
      await updateTenant(env, s.tenant.id, { webhookUrl: url, ...(url && !s.tenant.webhookSecret ? { webhookSecret: newWebhookSecret() } : {}) });
      return redirect(withMsg("/settings", "ok", url ? "Webhook saved" : "Webhook removed"));
    }
    if (path === "/settings/webhook/rotate" && post) {
      await updateTenant(env, s.tenant.id, { webhookSecret: newWebhookSecret() });
      return redirect(withMsg("/settings", "ok", "New signing secret made. Update your receiver with it."));
    }
    if (path === "/settings/webhook/test" && post) {
      const t = (await getTenant(env, s.tenant.id)) ?? s.tenant;
      const status = await deliver(env, t, "ping", null);
      return redirect(withMsg("/settings", status.startsWith("Delivered") ? "ok" : "error", status || "Save a webhook address first."));
    }
    if (path === "/settings/videos" && post) {
      const f = await req.formData();
      const err = await saveVideoForm(env, f, s.tenant.id);
      return redirect(withMsg("/settings", err ? "error" : "ok", err || "Saved"));
    }
    m = path.match(/^\/settings\/videos\/(\d+)\/delete$/);
    if (m && post) {
      await deleteVideo(env, Number(m[1]), s.tenant.id);
      return redirect(withMsg("/settings", "ok", "Removed"));
    }
  }

  // ---- Team (owners) ---------------------------------------------------------------------------
  if (path === "/team" || path.startsWith("/team/")) {
    if (!owner) return needOwner();
    const render = async (extra: { link?: { what: string; url: string }; ok?: string; err?: string } = {}) =>
      teamPage(s, await listUsers(env, s.tenant.id), await listPending(env, s.tenant.id), { ok: q("ok"), err: q("error"), ...extra });
    if (path === "/team" && req.method === "GET") return render();
    if (path === "/team/invite" && post) {
      const f = await req.formData();
      const email = String(f.get("email") ?? "").trim().toLowerCase();
      if (!EMAIL.test(email)) return render({ err: "Enter a valid email address." });
      if (await getUserByEmail(env, email)) return render({ err: "That email already has an account." });
      const role = f.get("role") === "owner" ? "owner" : "member";
      const token = await createToken(env, { kind: "invite", tenantId: s.tenant.id, email, role, createdBy: s.user.id });
      return render({ link: { what: `Invite link for ${email}`, url: `${origin}/invite/${token}` } });
    }
    m = path.match(/^\/team\/(\d+)\/(reset|remove)$/);
    if (m && post) {
      const target = await getUser(env, Number(m[1]));
      // Only people on this account, and Mianro staff can't be touched by customer owners.
      if (!target || target.tenantId !== s.tenant.id || target.status !== "active" || target.id === s.user.id || (target.role === "admin" && s.user.role !== "admin"))
        return render({ err: "That person can't be changed here." });
      if (m[2] === "reset") {
        const token = await createToken(env, { kind: "reset", tenantId: s.tenant.id, userId: target.id, email: target.email, createdBy: s.user.id });
        return render({ link: { what: `New password link for ${target.email}`, url: `${origin}/invite/${token}` } });
      }
      await removeUser(env, s.tenant.id, target.id);
      return render({ ok: `Removed ${target.email}.` });
    }
  }

  // ---- API keys (owners) -----------------------------------------------------------------------
  if (path === "/api" || path.startsWith("/api/keys")) {
    if (!owner) return needOwner();
    const render = async (extra: { newKey?: string; ok?: string; err?: string } = {}) =>
      apiPage(s, await listApiKeys(env, s.tenant.id), { origin, sitesBase: base, ok: q("ok"), err: q("error"), ...extra });
    if (path === "/api" && req.method === "GET") return render();
    if (path === "/api/keys" && post) {
      const name = String((await req.formData()).get("name") ?? "").trim();
      return render({ newKey: await createApiKey(env, s.tenant.id, name, s.user.id) });
    }
    m = path.match(/^\/api\/keys\/(\d+)\/revoke$/);
    if (m && post) {
      await revokeApiKey(env, s.tenant.id, Number(m[1]));
      return redirect(withMsg("/api", "ok", "Key revoked. It stops working immediately."));
    }
  }

  // ---- Admin console (Mianro staff) ------------------------------------------------------------
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (s.user.role !== "admin") return redirect(withMsg("/", "error", "That page is for Mianro staff."));
    return handleAdmin(req, env, s, path, origin, q);
  }

  return text("Not found", 404);
}

/** Add or change a hero-video entry from the library form. Returns an error message, or "" when saved. */
async function saveVideoForm(env: Env, f: FormData, tenantId: number | null): Promise<string> {
  const name = String(f.get("name") ?? "").trim().slice(0, 60);
  const keywords = parseKeywords(String(f.get("keywords") ?? ""));
  const urls = parseVideoUrls(String(f.get("urls") ?? ""));
  if (!name || !keywords.length) return "Give the trade a name and at least one keyword.";
  const id = Number(f.get("id")) || undefined;
  // Clips from the Drive folder have no links field (their link is fixed); only trade and keywords change.
  const library = tenantId === null ? await listSharedVideos(env) : await listOwnVideos(env, tenantId);
  const fromDrive = !!id && library.some((v) => v.id === id && v.driveId);
  if (!urls.length && !fromDrive) return "Paste at least one video link (https, ending in .mp4, or a GoHighLevel media link).";
  await saveVideo(env, { id, name, keywords, urls: fromDrive ? [] : urls }, tenantId);
  return "";
}

async function handleAdmin(req: Request, env: Env, s: Session, path: string, origin: string, q: (k: string) => string | undefined): Promise<Response> {
  const post = req.method === "POST";
  const flashQ = { ok: q("ok"), err: q("error") };

  const adminHome = async (extra: Parameters<typeof adminPage>[2] = {}) => adminPage(s, await listTenants(env), extra, await countNewInquiries(env), { seconds: (await browserUsed(env)).seconds, budget: BROWSER_BUDGET_SECONDS });
  if (path === "/admin" && req.method === "GET") {
    const name = q("name");
    const prefill = name || q("email") ? { name: (name ?? "").slice(0, 80), email: (q("email") ?? "").slice(0, 120), credits: String(Math.max(0, Math.min(10000, Math.floor(Number(q("credits")) || 3)))) } : undefined;
    return adminHome({ ...flashQ, prefill });
  }

  if (path === "/admin/inquiries" && req.method === "GET") {
    const status = q("status");
    const filter = status && ["new", "talking", "won", "closed"].includes(status) ? status : "";
    return adminInquiriesPage(s, await listInquiries(env, filter || undefined), filter, flashQ);
  }
  const iq = path.match(/^\/admin\/inquiries\/(\d+)\/status$/);
  if (iq && post) {
    const f = await req.formData();
    await setInquiryStatus(env, Number(iq[1]), String(f.get("status") ?? ""));
    const back = String(f.get("back") ?? "");
    return redirect(`/admin/inquiries${["new", "talking", "won", "closed"].includes(back) ? `?status=${back}` : ""}`);
  }

  if (path === "/admin/site") {
    if (!post) return adminSitePage(s, await getPlans(env), (await getShowcaseSlugs(env)).join("\n"), flashQ);
    const f = await req.formData();
    const featured = Number(f.get("featured"));
    const raw = [0, 1, 2, 3].map((i) => ({ name: String(f.get(`name${i}`) ?? ""), credits: Number(f.get(`credits${i}`)), price: String(f.get(`price${i}`) ?? ""), blurb: String(f.get(`blurb${i}`) ?? ""), payUrl: String(f.get(`pay${i}`) ?? "").trim(), featured: featured === i }));
    const badPay = raw.filter((r) => r.name.trim() && r.payUrl && !payUrlOk(r.payUrl)).map((r) => r.name.trim());
    const plans = parsePlans(raw.filter((r) => r.name.trim()));
    const slugs = parseSlugs(String(f.get("showcase") ?? ""));
    const unknown: string[] = [];
    for (const slug of slugs) if (!(await getDemo(env, slug))) unknown.push(slug);
    if (!plans.length) return adminSitePage(s, await getPlans(env), slugs.join("\n"), { err: "Keep at least one pack, with a name and a number of credits." });
    if (badPay.length) return adminSitePage(s, plans, slugs.join("\n"), { err: `The payment link for ${badPay.join(", ")} isn't a valid https link.` });
    if (unknown.length) return adminSitePage(s, plans, slugs.join("\n"), { err: `These demos don't exist: ${unknown.join(", ")}` });
    await setSetting(env, "web_plans", JSON.stringify(plans));
    await setSetting(env, "web_showcase", slugs.join(" "));
    return redirect(withMsg("/admin/site", "ok", "Saved. The public site shows it now."));
  }

  if (path === "/admin/tenants" && post) {
    const f = await req.formData();
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    const credits = Math.max(0, Math.min(10000, Math.floor(Number(f.get("credits")) || 0)));
    if (!name || !EMAIL.test(email)) return adminHome({ err: "Enter the account name and a valid owner email." });
    if (await getUserByEmail(env, email)) return adminHome({ err: "That email already has an account." });
    const t = await createTenant(env, name, credits);
    const token = await createToken(env, { kind: "invite", tenantId: t.id, email, role: "owner", createdBy: s.user.id });
    return adminHome({ ok: `Created ${t.name} with ${credits} credits.`, link: { what: `Owner invite link for ${email}`, url: `${origin}/invite/${token}` } });
  }

  let m = path.match(/^\/admin\/tenants\/(\d+)(?:\/(credits|branding|status|delete|invite|users\/(\d+)\/reset))?$/);
  if (m) {
    const id = Number(m[1]);
    const t = await getTenant(env, id);
    if (!t) return redirect(withMsg("/admin", "error", "That account doesn't exist."));
    const render = async (extra: { link?: { what: string; url: string }; ok?: string; err?: string } = {}) => {
      const fresh = (await getTenant(env, id)) ?? t;
      const sum = (await listTenants(env)).find((x) => x.id === id);
      return adminTenantPage(
        s,
        fresh,
        { users: await listUsers(env, id), pending: await listPending(env, id), ledger: await listLedger(env, id), usage: await tenantUsage(env, id), costTotal: sum?.costTotal ?? 0, costMonth: sum?.costMonth ?? 0 },
        { ...flashQ, ...extra },
      );
    };
    const action = m[2];
    if (!action && req.method === "GET") return render();
    if (!post) return text("Not found", 404);
    const f = await req.formData();

    if (action === "credits") {
      const delta = Math.trunc(Number(f.get("delta")));
      if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 10000) return render({ err: "Enter a number of credits (not zero)." });
      await grantCredits(env, id, delta, String(f.get("reason") ?? ""), s.user.id);
      return render({ ok: `${delta > 0 ? "Added" : "Removed"} ${Math.abs(delta)} credit${Math.abs(delta) === 1 ? "" : "s"}.` });
    }
    if (action === "branding") {
      const name = String(f.get("name") ?? "").trim().slice(0, 80);
      const mode = String(f.get("creditMode") ?? "mianro");
      const creditName = String(f.get("creditName") ?? "").trim().slice(0, 80);
      const creditUrl = String(f.get("creditUrl") ?? "").trim();
      if (!name) return render({ err: "The account needs a name." });
      if (!["mianro", "custom", "none"].includes(mode)) return render({ err: "Choose a footer credit." });
      if (mode === "custom" && !creditName) return render({ err: "Enter their name for the footer credit." });
      if (creditUrl && !/^https:\/\/[^\s"'<>]+$/.test(creditUrl)) return render({ err: "Their link must start with https://" });
      await updateTenant(env, id, { name, creditMode: mode, creditName, creditUrl });
      return render({ ok: "Saved. Sites update within a minute." });
    }
    if (action === "status") {
      if (id === 1) return render({ err: "The Mianro account can't be suspended." });
      const status = f.get("status") === "active" ? "active" : "suspended";
      await updateTenant(env, id, { status });
      return render({ ok: status === "active" ? "Account activated." : "Account suspended. Its sites and sign-ins switch off within a minute." });
    }
    if (action === "delete") {
      if (id === 1) return render({ err: "The Mianro account can't be deleted." });
      if (String(f.get("confirm") ?? "").trim() !== t.name) return render({ err: "Type the account name exactly to confirm." });
      await deleteTenant(env, id);
      return redirect(withMsg("/admin", "ok", `Deleted ${t.name} and everything it owned.`));
    }
    if (action === "invite") {
      const email = String(f.get("email") ?? "").trim().toLowerCase();
      if (!EMAIL.test(email)) return render({ err: "Enter a valid email address." });
      if (await getUserByEmail(env, email)) return render({ err: "That email already has an account." });
      const token = await createToken(env, { kind: "invite", tenantId: id, email, role: "owner", createdBy: s.user.id });
      return render({ link: { what: `Owner invite link for ${email}`, url: `${origin}/invite/${token}` } });
    }
    if (action?.startsWith("users/")) {
      const target = await getUser(env, Number(m[3]));
      if (!target || target.tenantId !== id || target.status !== "active") return render({ err: "That person isn't on this account." });
      const token = await createToken(env, { kind: "reset", tenantId: id, userId: target.id, email: target.email, createdBy: s.user.id });
      return render({ link: { what: `New password link for ${target.email}`, url: `${origin}/invite/${token}` } });
    }
  }

  // The shared hero-video library (and the Google Drive folder it syncs from).
  const folder = async () => folderId(await getSetting(env, FOLDER_KEY)) || DEFAULT_FOLDER;
  if (path === "/admin/videos" && req.method === "GET") return adminVideosPage(s, await listSharedVideos(env), await folder(), flashQ);
  if (path === "/admin/videos" && post) {
    const err = await saveVideoForm(env, await req.formData(), null);
    return redirect(withMsg("/admin/videos", err ? "error" : "ok", err || "Saved"));
  }
  if (path === "/admin/videos/sync" && post) {
    const raw = String((await req.formData()).get("folder") ?? "").trim();
    if (raw) {
      const id = folderId(raw);
      if (!id) return redirect(withMsg("/admin/videos", "error", "Paste the Google Drive folder's link (it contains /folders/…)."));
      await setSetting(env, FOLDER_KEY, id);
    }
    try {
      const r = await syncFolder(env);
      return redirect(withMsg("/admin/videos", "ok", `Folder checked: ${r.total} clips. ${r.added ? `${r.added} new, being copied now (refresh in a minute)` : "Nothing new"}${r.removed ? `; ${r.removed} removed` : ""}.`));
    } catch (e) {
      return redirect(withMsg("/admin/videos", "error", errText(e)));
    }
  }
  m = path.match(/^\/admin\/videos\/(\d+)\/delete$/);
  if (m && post) {
    await deleteVideo(env, Number(m[1]), null);
    return redirect(withMsg("/admin/videos", "ok", "Removed"));
  }

  return text("Not found", 404);
}

