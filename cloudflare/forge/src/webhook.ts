/**
 * Tell an account's own system when a site is ready or has failed (their automation can then post
 * to Google Chat, add a sheet row, update GoHighLevel, ...). Deliveries are signed so the receiver
 * can check they came from here: header x-forge-signature = "sha256=" + hex HMAC-SHA256 of
 * "<x-forge-timestamp>.<body>" with the account's webhook secret.
 */
import type { Env } from "./env";
import { updateTenant, type Tenant } from "./tenants";
import { randomToken } from "./crypto";
import { getKit, type Stored } from "./db";
import { pagesOf } from "./designer";

export const newWebhookSecret = () => `whsec_${randomToken(24)}`;

/** Only https links to real hostnames (not IP addresses or local names). */
export function webhookUrlProblem(raw: string): string {
  if (!raw) return "";
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "That isn't a web address.";
  }
  if (u.protocol !== "https:") return "The webhook address must start with https://";
  if (!u.hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) || u.hostname.includes(":") || /(^|\.)(local|localhost|internal|lan)$/i.test(u.hostname)) return "Use a public web address (not an IP address or a local name).";
  if (raw.length > 400) return "That address is too long.";
  return "";
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type WebhookEvent = "demo.ready" | "demo.failed" | "demo.viewed" | "demo.lead_status" | "lead.created" | "ping";

/** Sent with demo.viewed: the first time a demo is opened each day. */
export interface ViewInfo {
  views_today: number;
  visitors_today: number;
}

/** A form submission sent with a lead.created message. */
export interface LeadInfo {
  page: string;
  fields: Record<string, string>;
}

/** The JSON the receiver gets. */
export async function webhookBody(env: Env, event: WebhookEvent, demo: Stored | null, lead?: LeadInfo, views?: ViewInfo): Promise<string> {
  const base = env.SITES_ORIGIN ? env.SITES_ORIGIN.replace(/\/+$/, "") : "";
  let pages: { name: string; url: string }[] = [];
  if (demo?.liveVersion) {
    const kit = await getKit(env, demo.slug, demo.liveVersion);
    pages = pagesOf(kit).map((p) => ({ name: p.name, url: `${base}/${demo.slug}${p.path === "/" ? "" : p.path}` }));
  }
  return JSON.stringify({
    event,
    created_at: new Date().toISOString(),
    demo: demo
      ? {
          slug: demo.slug,
          business_name: demo.intake.businessName,
          status: demo.buildStatus === "failed" ? "failed" : demo.liveVersion ? "ready" : "building",
          site_url: `${base}/${demo.slug}`,
          pages,
          lead_status: demo.leadStatus ?? "new",
          ...(demo.buildStatus === "failed" ? { error: demo.buildError } : {}),
        }
      : null,
    ...(lead ? { lead: { page: lead.page, fields: lead.fields } } : {}),
    ...(views ? { views } : {}),
  });
}

/** Send one delivery. Never throws: the result is stored on the account for its owner to see. */
export async function deliver(env: Env, tenant: Tenant, event: WebhookEvent, demo: Stored | null, lead?: LeadInfo, views?: ViewInfo): Promise<string> {
  if (!tenant.webhookUrl || !tenant.webhookSecret) return "";
  let status: string;
  try {
    const body = await webhookBody(env, event, demo, lead, views);
    const ts = String(Math.floor(Date.now() / 1000));
    const res = await fetch(tenant.webhookUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        "user-agent": "ForgeDemo-Webhook/1.0",
        "x-forge-event": event,
        "x-forge-timestamp": ts,
        "x-forge-signature": `sha256=${await sign(tenant.webhookSecret, `${ts}.${body}`)}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    status = `${res.status >= 200 && res.status < 300 ? "Delivered" : "Receiver answered"} ${res.status} · ${event} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  } catch (e) {
    status = `Failed (${e instanceof Error ? e.message : "network"}) · ${event} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  }
  await updateTenant(env, tenant.id, { webhookStatus: status.slice(0, 200) }).catch(() => undefined);
  return status;
}
