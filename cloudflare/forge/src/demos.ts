/**
 * Creating and changing demos for an account. The dashboard form and the API both come through
 * here, so they check, charge and queue in exactly the same way.
 */
import { draftContent } from "../../../src/forge/copy";
import { Intake, type Demo } from "../../../src/forge/schema";
import { startBuild, type StartResult } from "./build";
import { getDemo, makeSlug, saveDemo, type Stored } from "./db";
import type { Env } from "./env";
import { conceptById } from "./concepts";
import { heroById } from "./heroes";
import { resolveMapsLink, splitStreetCity, type MapsPlace } from "./places";
import { widgetId } from "./site";
import { buildCost, type Tenant } from "./tenants";

/** A problem the person can fix (shown to them as it is). */
export class Invalid extends Error {}
/** The account has no build credits left. */
/** Not enough credits for this build (`need`: what it costs, `have`: the balance). */
export class NoCredits extends Error {
  constructor(
    readonly need = 1,
    readonly have = 0,
  ) {
    super("No build credits left.");
  }
}

/** What to tell someone who can't afford the build they asked for. */
export const noCreditsText = (e: NoCredits) =>
  e.need > 1
    ? `A Studio build needs ${e.need} credits and this account has ${e.have}. Ask your Forge administrator to add more, or choose Standard (1 credit).`
    : "No build credits left. Ask your Forge administrator to add more.";

export const INTAKE_FIELDS = [
  "businessName",
  "style",
  "concept",
  "hero",
  "reuseFrom",
  "googleUrl",
  "industry",
  "city",
  "phone",
  "address",
  "hours",
  "services",
  "serviceAreas",
  "reviews",
  "notes",
  "saw",
  "logoUrl",
  "heroImageUrl",
  "primaryColor",
  "customColor",
  "mode",
  "websiteUrl",
  "photoUrls",
  "chatWidget",
] as const;

/** A form or JSON body, as trimmed strings (only the fields an intake has). */
export function rawFields(src: Record<string, unknown> | FormData): Record<string, string> {
  const get = (k: string): unknown => (src instanceof FormData ? src.get(k) : src[k]);
  const out: Record<string, string> = {};
  for (const k of INTAKE_FIELDS) {
    const v = get(k);
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).trim();
  }
  return out;
}

export function checkWidget(v: string): void {
  if (v && !/^(off|none|no)$/i.test(v) && !widgetId(v, ""))
    throw new Invalid("That chat widget code has no widget ID in it. Paste the GoHighLevel embed code, the widget ID, or type off.");
}

/**
 * Turn what was typed (or sent) into a checked intake. A Google Maps link supplies the business
 * name (when none was typed) and the map position.
 */
/** A link as people type it ("joes.com", "www.joes.com/about") made into a full one; anything else is left as typed. */
export function asLink(v: string | undefined): string {
  const t = (v ?? "").trim();
  if (!t || /^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  return /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(t) && !/\s/.test(t) ? `https://${t}` : t;
}
const MAPS = /^((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/|g\.co\/)/i;
/** Pages that aren't the business's own site: their logo, colour and words would be the platform's. */
export const SOCIAL = /^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.me|instagram\.com|tiktok\.com|x\.com|twitter\.com|linkedin\.com|yelp\.com|nextdoor\.com|google\.[a-z.]+|goo\.gl|g\.co)(\/|$)/i;
const LINK_LABELS: Record<string, string> = { websiteUrl: "Their website", googleUrl: "Google Maps link", logoUrl: "Their logo", heroImageUrl: "Storefront, van or team photo" };

export async function prepareIntake(raw: Record<string, string>): Promise<Intake> {
  raw = { ...raw };
  for (const k of ["websiteUrl", "googleUrl", "logoUrl", "heroImageUrl"]) if (raw[k] !== undefined) raw[k] = asLink(raw[k]);
  // One box takes either: a link typed where the name goes is the Google Maps link, or their website.
  const typed = asLink(raw.businessName);
  // A social or Google page in the website box: kept as a note (with the link), never read as their own site.
  if (raw.websiteUrl && SOCIAL.test(raw.websiteUrl)) {
    if (MAPS.test(raw.websiteUrl.replace(/^https?:\/\//i, "")) && !raw.googleUrl) raw.googleUrl = raw.websiteUrl;
    else raw.notes = [raw.notes, `Their social page: ${raw.websiteUrl}`].filter(Boolean).join("\n");
    raw.websiteUrl = "";
  }
  if (/^https?:\/\//i.test(typed)) {
    if (MAPS.test(typed.replace(/^https?:\/\//i, ""))) raw = { ...raw, googleUrl: raw.googleUrl || typed, businessName: "" };
    else
      throw new Invalid("That looks like their website, not their name. Type the business name in the first box and put the website in \"Their website\".");
  }
  const g = (k: string) => raw[k] ?? "";
  let place: MapsPlace | null = null;
  if (g("googleUrl")) {
    place = await resolveMapsLink(g("googleUrl")).catch(() => null);
    if (!place && !g("businessName")) throw new Invalid("Couldn't read that Google Maps link. Type the business name instead.");
  }
  const color = g("primaryColor") === "custom" ? g("customColor") : g("primaryColor");
  const where = splitStreetCity(g("city"), g("address"));
  const parsed = Intake.safeParse({
    businessName: g("businessName") || place?.name || "",
    googleUrl: g("googleUrl"),
    mapQuery: place && place.lat !== undefined && place.lng !== undefined ? `${place.lat},${place.lng}` : "",
    industry: g("industry"),
    city: where.city,
    phone: g("phone"),
    address: where.address,
    hours: g("hours"),
    services: g("services"),
    serviceAreas: g("serviceAreas"),
    reviews: g("reviews"),
    notes: g("notes"),
    saw: g("saw"),
    logoUrl: g("logoUrl"),
    heroImageUrl: g("heroImageUrl"),
    primaryColor: color,
    mode: g("mode") || "auto",
    // Naming a Studio look or first screen without a style means a Studio site (they do nothing on a Standard one).
    style: g("style") === "studio" || (!g("style") && (conceptById(g("concept")) || heroById(g("hero")))) ? "studio" : "standard",
    concept: conceptById(g("concept")) ? g("concept") : "auto",
    hero: heroById(g("hero")) ? g("hero") : "auto",
    reuseFrom: g("reuseFrom"),
    websiteUrl: g("websiteUrl"),
    photoUrls: g("photoUrls"),
    chatWidget: g("chatWidget"),
  });
  if (!parsed.success) {
    const missingName = parsed.error.issues.some((i) => i.path[0] === "businessName");
    throw new Invalid(
      missingName
        ? "Enter the business name, or paste its Google Maps link."
        : parsed.error.issues.map((i) => (LINK_LABELS[String(i.path[0])] ? `${LINK_LABELS[String(i.path[0])]}: that isn't a link we can open. Paste the whole address, e.g. https://joesplumbing.com` : `${String(i.path[0])}: ${i.message}`)).join(". "),
    );
  }
  checkWidget(parsed.data.chatWidget);
  return parsed.data;
}

const canBuild = (t: Tenant, cost = 1) => t.unlimited || t.credits >= cost;

/**
 * Create a demo: a quick template site that works at once, then Claude's full design queued
 * in the background (using one credit).
 */
/** What a Studio site's idea can stand on: their website, what the rep saw, or facts typed in. */
export const hasFact = (i: Intake) => !!(i.websiteUrl || i.saw || i.notes || i.reviews || i.services);

/** A Studio build needs one real thing about the business, or its idea has nothing true to stand on. */
export const STUDIO_NEEDS_FACT = "Studio needs one real thing about the business to build its idea on: their website, or one line of what you saw (the sign, the van, the storefront). Add it, or choose Standard.";

export async function createDemo(env: Env, tenant: Tenant, userId: number | null, raw: Record<string, string>): Promise<{ slug: string; start: StartResult }> {
  const intake = await prepareIntake(raw);
  if (intake.style === "studio" && !intake.reuseFrom && !hasFact(intake)) throw new Invalid(STUDIO_NEEDS_FACT);
  if (!canBuild(tenant, buildCost(intake)) && env.ANTHROPIC_API_KEY) throw new NoCredits(buildCost(intake), tenant.credits);
  const now = new Date().toISOString();
  const demo: Demo = { slug: makeSlug(intake.businessName), intake, content: draftContent(intake), writtenBy: "draft", createdAt: now, updatedAt: now };
  await saveDemo(env, demo, tenant.id);
  return { slug: demo.slug, start: await startBuild(env, tenant, userId, demo.slug) };
}

/** Change a demo's details and design it again (or, for a failed build, pick it up where it stopped). */
export async function redesignDemo(env: Env, tenant: Tenant, userId: number | null, demo: Stored, raw: Record<string, string> | null): Promise<StartResult> {
  if (demo.buildStatus === "building") throw new Invalid("A design is already being built. Wait for it to finish.");
  if (raw) {
    const intake = await prepareIntake(raw);
    if (intake.style === "studio" && !intake.reuseFrom && !hasFact(intake)) throw new Invalid(STUDIO_NEEDS_FACT);
    await saveDemo(env, { ...demo, intake, content: draftContent(intake), writtenBy: "draft", updatedAt: new Date().toISOString() }, tenant.id);
  }
  const fresh = await getDemo(env, demo.slug, { tenantId: tenant.id });
  const cost = buildCost((fresh ?? demo).intake);
  if (!canBuild(tenant, cost) && env.ANTHROPIC_API_KEY) throw new NoCredits(cost, tenant.credits);
  return startBuild(env, tenant, userId, demo.slug, !raw && fresh?.buildStatus === "failed" ? fresh.buildVersion : null);
}

/** What to tell the person after a build was (not) started. */
export function startMessage(r: StartResult): { ok?: string; err?: string } {
  switch (r) {
    case "started":
      return { ok: "Started. Claude is designing the site; the link works now with a quick version and updates itself when the full design is ready." };
    case "ai-off":
      return { ok: "Saved. The AI designer isn't switched on, so the site uses the built-in template." };
    case "no-credits":
      return { err: "No build credits left. Ask your Forge administrator to add more." };
    case "busy":
      return { err: "Three builds are already running on this account. Wait for one to finish, then try again." };
  }
}
