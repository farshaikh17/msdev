/**
 * Maintenance rebuilds: a list of sites to build again ("Start over"), worked through by the hourly job
 * without anyone signed in. The list lives in settings under "maintenance:rebuild" (slugs separated by
 * spaces or new lines). Each tick starts at most two, and only while fewer than two builds are running,
 * so the free allowance and the monthly cap are used gently. A slug is taken off the list before its
 * build starts, so a failure never loops.
 */
import type { Env } from "./env";
import { getDemo } from "./db";
import { redesignDemo } from "./demos";
import { getTenant } from "./tenants";

export const MAINTENANCE_KEY = "maintenance:rebuild";
const AT_ONCE = 2;

export async function maintenanceRebuild(env: Env): Promise<string[]> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(MAINTENANCE_KEY).first<{ value: string }>();
  let list = (row?.value ?? "").split(/\s+/).filter(Boolean);
  if (!list.length) return [];
  const busy = (await env.DB.prepare("SELECT count(*) AS n FROM demos WHERE build_status = 'building'").first<{ n: number }>())?.n ?? 0;
  const started: string[] = [];
  for (let room = AT_ONCE - busy; room > 0 && list.length; room--) {
    const slug = list.shift()!;
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(MAINTENANCE_KEY, list.join("\n")).run();
    const demo = await getDemo(env, slug);
    const tenant = demo ? await getTenant(env, demo.tenantId) : null;
    if (!demo || !tenant || demo.buildStatus === "building") continue;
    const r = await redesignDemo(env, tenant, null, demo, null).catch((e) => `error: ${e instanceof Error ? e.message : String(e)}`);
    console.log("maintenance rebuild", slug, r);
    started.push(slug);
  }
  return started;
}
