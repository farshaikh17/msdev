/**
 * The JSON API (/api/v1): an account's own tools can build demos and read their status with an API
 * key (Authorization: Bearer fk_live_…). Every call works only on the key's own account.
 */
import { Invalid, NoCredits, createDemo, rawFields, startMessage } from "./demos";
import { getDemo, getKit, listDemos, listLeads, recordAttempt, throttled, type Stored } from "./db";
import { pagesOf } from "./designer";
import type { Env } from "./env";
import { findApiKey, getTenant } from "./tenants";

const RATE = 60; // requests per minute per key
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "cache-control": "no-store", ...extra } });
const fail = (status: number, error: string, extra: Record<string, string> = {}) => json({ error }, status, extra);

export async function handleApi(req: Request, env: Env, path: string, sitesBase: string): Promise<Response> {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
  const found = bearer ? await findApiKey(env, bearer) : null;
  if (!found) return fail(401, "Missing or invalid API key. Send it as: Authorization: Bearer YOUR_KEY", { "www-authenticate": 'Bearer realm="forge"' });
  const rateKey = `api:${found.keyId}`;
  if (await throttled(env, rateKey, RATE)) return fail(429, "Too many requests. The limit is 60 a minute per key.", { "retry-after": "60" });
  await recordAttempt(env, rateKey, 60_000);
  const tenant = found.tenant;
  const site = (slug: string) => `${sitesBase}${slug}`;

  if (path === "/api/v1/me" && req.method === "GET") return json({ account: tenant.name, credits: tenant.credits, unlimited: tenant.unlimited });

  if (path === "/api/v1/demos" && req.method === "GET") {
    const demos = await listDemos(env, tenant.id);
    return json({ demos: demos.slice(0, 100).map((d) => ({ slug: d.slug, business_name: d.businessName, status: d.buildStatus === "building" ? "building" : d.buildStatus === "failed" ? "failed" : "ready", site_url: site(d.slug), created_at: d.createdAt })) });
  }

  if (path === "/api/v1/demos" && req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    } catch {
      return fail(400, "Send a JSON object, e.g. {\"businessName\":\"Acme Plumbing\"}.");
    }
    try {
      const r = await createDemo(env, tenant, null, rawFields(body));
      const after = (await getTenant(env, tenant.id)) ?? tenant;
      if (r.start === "busy") return json({ slug: r.slug, status: "template", site_url: site(r.slug), warning: startMessage(r.start).err, credits_left: after.credits }, 429);
      return json({ slug: r.slug, status: r.start === "started" ? "building" : "template", site_url: site(r.slug), credits_left: after.credits, unlimited: after.unlimited }, 201);
    } catch (e) {
      if (e instanceof NoCredits) return fail(402, "No build credits left on this account.");
      if (e instanceof Invalid) return fail(422, e.message);
      throw e;
    }
  }

  const one = path.match(/^\/api\/v1\/demos\/([a-z0-9-]{3,64})$/);
  if (one && req.method === "GET") {
    const d = await getDemo(env, one[1], { tenantId: tenant.id });
    if (!d) return fail(404, "No demo with that slug on this account.");
    return json(await demoJson(env, d, site(d.slug)));
  }

  const leads = path.match(/^\/api\/v1\/demos\/([a-z0-9-]{3,64})\/leads$/);
  if (leads && req.method === "GET") {
    const d = await getDemo(env, leads[1], { tenantId: tenant.id });
    if (!d) return fail(404, "No demo with that slug on this account.");
    return json({ leads: (await listLeads(env, d.slug)).map((l) => ({ page: l.page, fields: l.fields, received_at: l.createdAt })) });
  }

  return fail(404, "Unknown API path. See the API page in the app.");
}

async function demoJson(env: Env, d: Stored, siteUrl: string) {
  const kit = d.liveVersion ? await getKit(env, d.slug, d.liveVersion) : null;
  return {
    slug: d.slug,
    business_name: d.intake.businessName,
    status: d.buildStatus === "building" ? "building" : d.buildStatus === "failed" ? "failed" : d.liveVersion ? "ready" : "template",
    site_url: siteUrl,
    pages: kit ? pagesOf(kit).map((p) => ({ name: p.name, url: `${siteUrl}${p.path === "/" ? "" : p.path}` })) : [],
    ...(d.buildStatus === "failed" ? { error: d.buildError } : {}),
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}
