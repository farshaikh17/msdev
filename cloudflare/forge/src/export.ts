/**
 * A finished site as plain files, to host anywhere: every page exactly as visitors get it, its photos
 * alongside, in one zip. Links and pictures are rewritten to work from the root of any web host. The
 * contact forms keep sending to Forge (so leads still arrive on the demo page and the account's webhook),
 * and fonts, the motion engine and any video clips still load from their public addresses.
 */
import type { Ctx, Env } from "./env";
import { getDemo, getImage, getKit } from "./db";
import { pagesOf } from "./designer";
import { serveSite } from "./serve";

/** Where a page goes in the zip: "/" is index.html, "/about" is about/index.html. */
export const fileFor = (path: string) => (path === "/" ? "index.html" : `${path.replace(/^\/+|\/+$/g, "")}/index.html`);

/** One page's HTML made portable: our addresses become root paths, pictures point at images/. */
export function portable(html: string, slug: string, version: string, origin: string): { html: string; images: string[] } {
  const images = new Set<string>();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const img = new RegExp(`(?:${esc(origin)})?/${esc(slug)}/_img/${esc(version)}/([A-Za-z0-9._-]+)`, "g");
  let out = html.replace(img, (_m, name: string) => (images.add(name), `/images/${name}`));
  // The form keeps posting to Forge (set aside first, so the rewrites below leave it alone).
  const LEAD = "\u0000forge-lead\u0000";
  out = out.split(`"/${slug}/_lead"`).join(`"${LEAD}"`).split(`"${origin}/${slug}/_lead"`).join(`"${LEAD}"`);
  out = out.split(`${origin}/${slug}/`).join("/").split(`${origin}/${slug}"`).join('/"');
  // The home page ("/slug", "/slug?x", "/slug#x") is "/"; every other page drops the "/slug" in front.
  out = out.replace(new RegExp(`(["'(])/${esc(slug)}(?=["'?#)])`, "g"), "$1/").replace(new RegExp(`(["'(])/${esc(slug)}/`, "g"), "$1/");
  out = out.split(LEAD).join(`${origin}/${slug}/_lead`);
  return { html: out, images: [...images] };
}

const README = (name: string, origin: string) => `${name}: website files
=========================================

Upload everything in this folder to the root of any web host (Netlify, Cloudflare Pages, GitHub Pages,
cPanel, an S3 bucket...). index.html is the home page; each other page is a folder with its own index.html.

- Contact forms still send to Forge (${origin}), so messages keep arriving where they do today.
- Fonts, the animation engine and any background video load from their public addresses on the web.
- The photos are in images/.
`;

/** Build the zip. Null when the site has no finished multi-page version. */
export type Render = (req: Request, env: Env, ctx: Ctx, slug: string, sub: string, prefix: string, sandbox: boolean) => Promise<Response>;

export async function exportSite(env: Env, ctx: Ctx, slug: string, render: Render = serveSite): Promise<{ name: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  const demo = await getDemo(env, slug);
  if (!demo?.liveVersion) return null;
  const kit = await getKit(env, slug, demo.liveVersion);
  if (!kit) return null;
  const origin = (env.SITES_ORIGIN || "https://forge-sites.invalid").replace(/\/+$/, "");
  const paths = [...new Set([...pagesOf(kit).map((p) => p.path), "/privacy", "/terms"])];
  const files: { name: string; data: Uint8Array }[] = [];
  const images = new Set<string>();
  const enc = new TextEncoder();
  for (const path of paths) {
    // Rendered exactly as the sites Worker does (no user agent: not counted as a visit).
    const sub = path === "/" ? "" : path;
    const res = await render(new Request(`${origin}/${slug}${sub}`), env, ctx, slug, sub, `/${slug}`, false);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
    const p = portable(await res.text(), slug, demo.liveVersion, origin);
    p.images.forEach((n) => images.add(n));
    files.push({ name: fileFor(path), data: enc.encode(p.html) });
  }
  for (const n of images) {
    const bytes = await getImage(env, slug, demo.liveVersion, n);
    if (bytes) files.push({ name: `images/${n}`, data: bytes });
  }
  files.push({ name: "README.txt", data: enc.encode(README(demo.intake.businessName, origin)) });
  return { name: `${slug}.zip`, bytes: zip(files) };
}

// ---- A minimal zip writer (stored, no compression: JPEGs don't shrink, and pages are small) ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(d: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { name: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true);
    c.setUint32(24, f.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
