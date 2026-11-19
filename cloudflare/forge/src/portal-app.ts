/**
 * The client portal's routes on the app (forge-demo), with no sign-in: /p/<token>[/pin|/update|/publish|/discard|/undo].
 * The link is the key; a PIN, when set, is checked once per browser (and limited to a few tries).
 */
import { sameOrigin } from "./auth";
import { clearAttempts, getDemo, getKit, imageNames, listLeads, recordAttempt, throttled, viewStats } from "./db";
import { pagesOf } from "./designer";
import { domainForSlug } from "./domains";
import type { Ctx, Env } from "./env";
import { takeHandover } from "./handover";
import {
  PORTAL_ASKS_PER_MONTH,
  asksThisMonth,
  checkPin,
  discardDraft,
  ensureDraft,
  logPortal,
  pinCookieName,
  pinCookieValue,
  pinOk,
  portalForToken,
  portalLog,
  publishDraft,
  undoPublish,
} from "./portal";
import { getTenant } from "./tenants";
import { portalPage, portalPinPage } from "./ui-portal";

const PIN_TRIES = 5;
const PIN_WINDOW_MS = 15 * 60_000;

const back = (token: string, kind: "ok" | "error", msg: string) => new Response(null, { status: 303, headers: { location: `/p/${token}?${kind}=${encodeURIComponent(msg)}` } });

export async function handlePortal(req: Request, env: Env, _ctx: Ctx, token: string, action: string, sitesBase: string): Promise<Response> {
  const notFound = () => new Response("This link doesn't work any more. Ask your website contact for a new one.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const p = await portalForToken(env, token);
  if (!p) return notFound();
  const demo = await getDemo(env, p.slug);
  const tenant = demo ? await getTenant(env, demo.tenantId) : null;
  if (!demo || !tenant || tenant.status !== "active") return notFound();
  const post = req.method === "POST";
  if (post && !sameOrigin(req)) return new Response("Cross-site form posts are not accepted.", { status: 403 });

  // The PIN, once per browser.
  if (action === "/pin" && post) {
    const key = `pin:${token}:${req.headers.get("cf-connecting-ip") ?? "unknown"}`;
    if (await throttled(env, key, PIN_TRIES)) return portalPinPage(demo.intake.businessName, token, "Too many tries. Wait 15 minutes and try again.");
    const pin = String((await req.formData()).get("pin") ?? "").trim();
    if (!(await checkPin(p, pin))) {
      await recordAttempt(env, key, PIN_WINDOW_MS);
      return portalPinPage(demo.intake.businessName, token, "That PIN isn't right.");
    }
    await clearAttempts(env, key);
    return new Response(null, { status: 303, headers: { location: `/p/${token}`, "set-cookie": `${pinCookieName(p)}=${await pinCookieValue(p)}; Path=/p/${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}` } });
  }
  if (!(await pinOk(req, p))) return portalPinPage(demo.intake.businessName, token);

  const aiOn = !!(env.ANTHROPIC_API_KEY || env.AI);
  if (action === "/update" && post) {
    if (!demo.liveVersion) return back(token, "error", "Your website is still being built. Try again in a few minutes.");
    if (demo.handover?.status === "working" && Date.now() - Date.parse(demo.handover.at) < 15 * 60_000) return back(token, "error", "Your last changes are still going in. Give it a few minutes.");
    const f = await req.formData();
    const edits = String(f.get("edits") ?? "").trim();
    // Past this month's allowance a change request goes to the rep, not the AI.
    if (edits && (await asksThisMonth(env, p.slug)) >= PORTAL_ASKS_PER_MONTH) {
      await logPortal(env, p.slug, "request", edits);
      return back(token, "ok", "Sent to your website contact. They'll make this change for you.");
    }
    const draft = await ensureDraft(env, p.slug);
    if (!draft) return back(token, "error", "Your website isn't ready to change yet.");
    const r = await takeHandover(env, demo, draft, f, aiOn, "owner");
    if (r.ok) {
      if (r.photos) await logPortal(env, p.slug, "photos", `${r.photos} photo${r.photos === 1 ? "" : "s"}`);
      if (r.logo) await logPortal(env, p.slug, "logo");
      const details = r.facts.filter((x) => x !== "reviews");
      if (details.length) await logPortal(env, p.slug, "details", details.join(", "));
      if (r.facts.includes("reviews")) await logPortal(env, p.slug, "reviews");
      if (r.edits) await logPortal(env, p.slug, "edit", r.edits);
    }
    return back(token, r.ok ? "ok" : "error", r.ok ? `${r.message} Preview it, then press Publish.` : r.message);
  }
  if (action === "/publish" && post) {
    if (demo.handover?.status === "working" && Date.now() - Date.parse(demo.handover.at) < 15 * 60_000) return back(token, "error", "Your changes are still going in. Publish when they're done.");
    if (!(await publishDraft(env, p.slug))) return back(token, "error", "There's nothing to publish.");
    await logPortal(env, p.slug, "publish");
    return back(token, "ok", "Published. Your website shows the changes within a minute.");
  }
  if (action === "/discard" && post) {
    await discardDraft(env, p.slug);
    await logPortal(env, p.slug, "discard");
    return back(token, "ok", "Draft discarded. Your live website hasn't changed.");
  }
  if (action === "/undo" && post) {
    if (!(await undoPublish(env, p.slug))) return back(token, "error", "There's nothing to undo.");
    await logPortal(env, p.slug, "undo");
    return back(token, "ok", "Done: your website is back to how it was before the last publish.");
  }
  if (action || req.method !== "GET") return notFound();

  // The page: what is live, the draft (if any), the pictures, how the site is doing and what's left before launch.
  const url = new URL(req.url);
  const showing = p.draft ?? demo.liveVersion;
  const siteBase = `${sitesBase}${p.slug}`;
  const names = showing ? await imageNames(env, p.slug, showing) : [];
  const own = names.filter((n) => /^own-\d+\.jpg$/.test(n));
  const photoNames = [...own, ...names.filter((n) => /^photo-\d+\.jpg$/.test(n) && !own.includes(n.replace("photo-", "own-")))];
  const kit = showing ? await getKit(env, p.slug, showing) : null;
  const pages = kit ? pagesOf(kit).filter((pg) => pg.kind === "ai").map((pg) => ({ name: pg.name, path: pg.path })) : [{ name: "Home", path: "/" }];
  const [views, leads, log, asksUsed, domain] = await Promise.all([viewStats(env, { slugs: [p.slug] }), listLeads(env, p.slug), portalLog(env, p.slug), asksThisMonth(env, p.slug), domainForSlug(env, p.slug)]);
  const body = showing ? (await env.DB.prepare("SELECT group_concat(body, ' ') AS b FROM site_pages WHERE slug = ? AND version = ?").bind(p.slug, showing).first<{ b: string | null }>())?.b ?? "" : "";
  return portalPage({
    demo,
    portal: p,
    liveUrl: siteBase,
    previewUrl: p.draft ? `${siteBase}/_preview/${p.draft}?t=${Date.now().toString(36)}` : siteBase,
    photos: photoNames.map((n) => ({ url: `${siteBase}/_img/${showing}/${n}`, own: n.startsWith("own-") })),
    logoUrl: names.includes("logo.webp") ? `${siteBase}/_img/${showing}/logo.webp` : "",
    views: views.get(p.slug),
    leads,
    log,
    asksUsed,
    goLive: { photos: own.length > 0, reviews: !/sample review/i.test(body), form: leads.length > 0, domain: !!domain?.dnsOk, published: !p.draft },
    pages,
    ok: url.searchParams.get("ok") ?? undefined,
    err: url.searchParams.get("error") ?? undefined,
  });
}
