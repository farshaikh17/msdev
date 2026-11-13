/**
 * A won site on the business's own web address. The customer adds one DNS record (a CNAME from their
 * address to FORGE_DOMAIN_TARGET); Cloudflare for SaaS gives the address a certificate and sends its
 * visits to the sites Worker, which serves the site at the root. With CF_SAAS_ZONE and CF_SAAS_TOKEN set,
 * Forge registers each address with Cloudflare itself; without them, Mianro adds it in the dashboard.
 */
import type { Env } from "./env";

export interface Domain {
  host: string;
  slug: string;
  dnsOk: boolean;
  ssl: string;
  cfId: string;
  checkedAt: string | null;
}

/** "https://www.OHara-Plumbing.com/about" → "www.ohara-plumbing.com"; null when it isn't a usable address. */
export function hostOf(input: string): string | null {
  const t = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(t)) return null;
  if (/(^|\.)(workers\.dev|pages\.dev|mianro\.com|localhost)$/.test(t)) return null;
  return t;
}

/** Both forms of an address, so a site on www.x.com also answers on x.com (and the other way round). */
export const hostForms = (host: string) => (host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`]);

/** Is this request for a business's own address (not Forge's own sites address)? */
export function isOwnAddress(env: Env, host: string): boolean {
  const ours = env.SITES_ORIGIN ? new URL(env.SITES_ORIGIN).hostname : "";
  return !!host && host !== ours && !host.endsWith(".workers.dev") && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host);
}

/** Does the address's CNAME point at Forge? (Cloudflare's public DNS-over-HTTPS resolver; no key.) */
export async function cnameOk(host: string, target: string): Promise<boolean> {
  if (!target) return false;
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=CNAME`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
    return (j.Answer ?? []).some((a) => a.type === 5 && a.data.replace(/\.$/, "").toLowerCase() === target.toLowerCase());
  } catch {
    return false;
  }
}

const cfReady = (env: Env) => !!(env.CF_SAAS_ZONE && env.CF_SAAS_TOKEN);

/** Register an address with Cloudflare for SaaS (when Forge has the key). Returns its id, or "" when not set up. */
export async function registerHost(env: Env, host: string): Promise<{ id: string; ssl: string; error?: string }> {
  if (!cfReady(env)) return { id: "", ssl: "" };
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_SAAS_ZONE}/custom_hostnames`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CF_SAAS_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ hostname: host, ssl: { method: "http", type: "dv" } }),
      signal: AbortSignal.timeout(10000),
    });
    const j = (await r.json()) as { success?: boolean; result?: { id: string; ssl?: { status?: string } }; errors?: { message: string }[] };
    if (!j.success || !j.result) return { id: "", ssl: "", error: j.errors?.[0]?.message ?? `Cloudflare said ${r.status}` };
    return { id: j.result.id, ssl: j.result.ssl?.status ?? "pending" };
  } catch (e) {
    return { id: "", ssl: "", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cloudflare's certificate status for a registered address ("active" when it is ready). */
export async function hostStatus(env: Env, id: string): Promise<string> {
  if (!cfReady(env) || !id) return "";
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_SAAS_ZONE}/custom_hostnames/${id}`, { headers: { authorization: `Bearer ${env.CF_SAAS_TOKEN}` }, signal: AbortSignal.timeout(10000) });
    const j = (await r.json()) as { result?: { ssl?: { status?: string } } };
    return j.result?.ssl?.status ?? "";
  } catch {
    return "";
  }
}

/** Remove an address from Cloudflare (when Forge registered it). */
export async function unregisterHost(env: Env, id: string): Promise<void> {
  if (!cfReady(env) || !id) return;
  await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_SAAS_ZONE}/custom_hostnames/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${env.CF_SAAS_TOKEN}` } }).catch(() => undefined);
}

export async function domainForSlug(env: Env, slug: string): Promise<Domain | null> {
  const r = await env.DB.prepare("SELECT host, slug, dns_ok, ssl, cf_id, checked_at FROM domains WHERE slug = ?").bind(slug).first<{ host: string; slug: string; dns_ok: number; ssl: string; cf_id: string; checked_at: string | null }>();
  return r ? { host: r.host, slug: r.slug, dnsOk: !!r.dns_ok, ssl: r.ssl, cfId: r.cf_id, checkedAt: r.checked_at } : null;
}

/** The site an address belongs to (either form of the address). */
export async function slugForHost(env: Env, host: string): Promise<string | null> {
  const [a, b] = hostForms(host);
  const r = await env.DB.prepare("SELECT slug FROM domains WHERE host = ? OR host = ? LIMIT 1").bind(a, b).first<{ slug: string }>();
  return r?.slug ?? null;
}

/** Put a site on an address (replacing any address it had). Returns an error message, or "" when saved. */
export async function setDomain(env: Env, tenantId: number, slug: string, host: string): Promise<string> {
  const [a, b] = hostForms(host);
  const taken = await env.DB.prepare("SELECT slug FROM domains WHERE (host = ? OR host = ?) AND slug != ?").bind(a, b, slug).first<{ slug: string }>();
  if (taken) return "That address is already used by another site.";
  const old = await domainForSlug(env, slug);
  if (old && old.host !== host) await unregisterHost(env, old.cfId);
  const reg = old && old.host === host && old.cfId ? { id: old.cfId, ssl: old.ssl } : await registerHost(env, host);
  await env.DB.prepare("DELETE FROM domains WHERE slug = ?").bind(slug).run();
  await env.DB.prepare("INSERT INTO domains (host, slug, tenant_id, created_at, ssl, cf_id) VALUES (?, ?, ?, ?, ?, ?)").bind(host, slug, tenantId, new Date().toISOString(), reg.ssl, reg.id).run();
  return "error" in reg && reg.error ? `Saved, but Cloudflare didn't take it yet: ${reg.error}` : "";
}

export async function removeDomain(env: Env, slug: string): Promise<void> {
  const old = await domainForSlug(env, slug);
  if (old) await unregisterHost(env, old.cfId);
  await env.DB.prepare("DELETE FROM domains WHERE slug = ?").bind(slug).run();
}

/** Look again: is the DNS record in place, and is the certificate ready? */
export async function checkDomain(env: Env, slug: string): Promise<Domain | null> {
  const d = await domainForSlug(env, slug);
  if (!d) return null;
  const target = env.FORGE_DOMAIN_TARGET ?? "";
  const dnsOk = await cnameOk(d.host, target);
  const ssl = (await hostStatus(env, d.cfId)) || d.ssl;
  const at = new Date().toISOString();
  await env.DB.prepare("UPDATE domains SET dns_ok = ?, ssl = ?, checked_at = ? WHERE slug = ?").bind(dnsOk ? 1 : 0, ssl, at, slug).run();
  return { ...d, dnsOk, ssl, checkedAt: at };
}
