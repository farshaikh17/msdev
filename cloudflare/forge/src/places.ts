/**
 * Where a business is, without a Google key: read the details a business publishes on its own
 * website (schema.org data, tel: links) and the name and location inside a Google Maps link.
 */
import type { Intake } from "../../../src/forge/schema";

export interface BusinessInfo {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  region?: string;
  postal?: string;
  hours?: string;
  lat?: number;
  lng?: number;
}

const str = (v: unknown, max = 200): string => (typeof v === "string" || typeof v === "number" ? String(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** "+13059566855", "305-956-6855", "(305) 956 6855" → "(305) 956-6855"; anything else stays as written. */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw.trim().slice(0, 40);
}

/** Every node of a JSON-LD document, flattening arrays and @graph. */
function nodes(v: unknown, out: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 4 || !v || typeof v !== "object") return out;
  if (Array.isArray(v)) v.forEach((x) => nodes(x, out, depth + 1));
  else {
    out.push(v as Record<string, unknown>);
    const g = (v as Record<string, unknown>)["@graph"];
    if (g) nodes(g, out, depth + 1);
  }
  return out;
}

const DAY = (d: unknown) => str(Array.isArray(d) ? d[0] : d).replace(/^.*\//, "").slice(0, 3);

function hoursOf(n: Record<string, unknown>): string {
  const plain = n.openingHours;
  if (plain) return (Array.isArray(plain) ? plain : [plain]).map((h) => str(h, 60)).filter(Boolean).join("; ").slice(0, 300);
  const spec = n.openingHoursSpecification;
  if (!spec) return "";
  return (Array.isArray(spec) ? spec : [spec])
    .map((h) => {
      const o = h as Record<string, unknown>;
      const days = (Array.isArray(o.dayOfWeek) ? o.dayOfWeek : [o.dayOfWeek]).map(DAY).filter(Boolean);
      const open = str(o.opens, 8);
      const close = str(o.closes, 8);
      return days.length && open && close ? `${days.join(", ")} ${open}–${close}` : "";
    })
    .filter(Boolean)
    .join("; ")
    .slice(0, 300);
}

/** The business's own details from its JSON-LD blocks (and tel: links as a fallback for the phone). */
export function pickBusiness(ldTexts: string[], tels: string[]): BusinessInfo | undefined {
  const all: Record<string, unknown>[] = [];
  for (const t of ldTexts) {
    try {
      nodes(JSON.parse(t), all);
    } catch {
      /* a malformed block is skipped */
    }
  }
  // The first node that says where or how to reach the business.
  const n = all.find((x) => x.address || x.telephone);
  const info: BusinessInfo = {};
  if (n) {
    info.name = str(n.name, 120) || undefined;
    info.phone = str(n.telephone, 40) || undefined;
    const a = Array.isArray(n.address) ? n.address[0] : n.address;
    if (typeof a === "string") info.street = str(a, 200) || undefined;
    else if (a && typeof a === "object") {
      const o = a as Record<string, unknown>;
      info.street = str(o.streetAddress) || undefined;
      info.city = str(o.addressLocality, 80) || undefined;
      info.region = str(o.addressRegion, 40) || undefined;
      info.postal = str(o.postalCode, 12) || undefined;
    }
    const geo = n.geo as Record<string, unknown> | undefined;
    info.lat = num(geo?.latitude);
    info.lng = num(geo?.longitude);
    info.hours = hoursOf(n) || undefined;
  }
  if (!info.phone) {
    const t = tels.map((x) => decodeURIComponent(x).replace(/[^\d+]/g, "")).find((x) => x.replace(/\D/g, "").length >= 10);
    if (t) info.phone = t;
  }
  const filled = Object.values(info).some((v) => v !== undefined);
  return filled ? info : undefined;
}

/**
 * Fill what's blank in an intake from what the business publishes. Typed-in values always win.
 * Returns the new intake and the names of the fields that were filled.
 */
export function mergeIntake(i: Intake, b: BusinessInfo | undefined): { intake: Intake; filled: string[] } {
  if (!b) return { intake: i, filled: [] };
  const next = { ...i };
  const filled: string[] = [];
  const set = (k: "phone" | "address" | "city" | "hours" | "mapQuery", v: string | undefined) => {
    if (v && !next[k]) {
      next[k] = v;
      filled.push(k);
    }
  };
  set("phone", b.phone ? formatPhone(b.phone) : undefined);
  set("address", b.street && b.city ? `${b.street}, ${b.city}${b.region ? `, ${b.region}` : ""}${b.postal ? ` ${b.postal}` : ""}` : b.street);
  set("city", b.city ? `${b.city}${b.region ? `, ${b.region}` : ""}` : undefined);
  set("hours", b.hours);
  set("mapQuery", b.lat !== undefined && b.lng !== undefined ? `${b.lat},${b.lng}` : undefined);
  return { intake: next, filled };
}

// ---- Google Maps links -------------------------------------------------------------------------

export interface MapsPlace {
  name: string;
  lat?: number;
  lng?: number;
}

const GOOGLE_HOST = /(^|\.)google\.[a-z.]{2,6}$/i;
const SHORT_HOST = /^(maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;

/** The place named in a long Google Maps link, or null when it isn't one. */
export function parseMapsUrl(raw: string): MapsPlace | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!GOOGLE_HOST.test(u.hostname)) return null;
  const decoded = decodeURIComponent(u.pathname + u.search);
  let name = "";
  const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
  if (place) name = decodeURIComponent(place[1].replace(/\+/g, " ")).trim();
  if (!name) {
    const q = u.searchParams.get("q") ?? u.searchParams.get("query") ?? "";
    if (q && !/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q.trim())) name = q.trim();
  }
  // The pin's own coordinates (!3d…!4d…) beat the map centre (@lat,lng).
  const pin = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const at = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  // ?q=28.5,-81.3 and ?ll=28.5,-81.3 are plain coordinates.
  const plain = (u.searchParams.get("q") ?? u.searchParams.get("query") ?? u.searchParams.get("ll") ?? "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  const c = pin ?? at ?? plain;
  if (!name && !c) return null;
  return { name: name.slice(0, 120), lat: c ? Number(c[1]) : undefined, lng: c ? Number(c[2]) : undefined };
}

/** Like parseMapsUrl, but also follows Google's short links (maps.app.goo.gl/…) and consent redirects. */
export async function resolveMapsLink(raw: string): Promise<MapsPlace | null> {
  let url = raw.trim();
  for (let hop = 0; hop < 5; hop++) {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (u.hostname === "consent.google.com" && u.searchParams.get("continue")) {
      url = u.searchParams.get("continue")!;
      continue;
    }
    if (!SHORT_HOST.test(u.hostname)) break;
    const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; ForgeDemo/1.0)" }, signal: AbortSignal.timeout(8000) });
    const loc = r.headers.get("location");
    if (!loc) return null;
    url = new URL(loc, url).toString();
  }
  return parseMapsUrl(url);
}

/**
 * A street address typed into the City field ("105 Court St, Cynthiana, KY 41031, United States"):
 * split it into the address and a short city ("Cynthiana, KY"). Anything else comes back unchanged.
 */
export function splitStreetCity(city: string, address: string): { city: string; address: string } {
  const c = city.trim();
  if (address.trim() || !/^\d+[a-z]?\s+\S/i.test(c) || !c.includes(",")) return { city: c, address };
  const parts = c.split(",").map((p) => p.trim()).filter(Boolean);
  if (/^(united states( of america)?|usa|us)$/i.test(parts[parts.length - 1] ?? "")) parts.pop();
  if (parts.length < 2) return { city: c, address };
  const state = (parts[parts.length - 1] ?? "").replace(/\s*\d{5}(-\d{4})?$/, "").trim();
  const town = parts.length >= 3 ? parts[parts.length - 2]! : "";
  return { city: town && state ? `${town}, ${state}` : town || state, address: parts.join(", ") };
}
