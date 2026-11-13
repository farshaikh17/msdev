/**
 * Read a business's existing website for facts and photos (free; no Google
 * APIs). Returns its title, description, readable text (capped) and image
 * links, all as plain data for Claude to draw on.
 */
import { pickBusiness, type BusinessInfo } from "./places";

export interface SiteFacts {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
  /** Their logo (an image in the header or named "logo", else the touch icon), when one is found. */
  logo?: string;
  /** The brand colour the site declares (meta theme-color), as #rrggbb. */
  themeColor?: string;
  /** The details the business publishes about itself (schema.org data, tel: links), when it does. */
  business?: BusinessInfo;
}

const TEXT_CAP = 7000;
const IMAGE_CAP = 16;
const SKIP_IMG = /(sprite|icon|favicon|pixel|tracking|spacer|blank|loader|\.svg($|\?)|\.php|data:)/i;
/** <img> links must look like a photo file (skips tracking pixels and scripts that return images). */
const PHOTO_PATH = /\.(jpe?g|png|webp|avif)$/i;
/** Less readable text than this means a parked, blocked or empty page, not the business's site. */
const MIN_TEXT = 300;

export async function readWebsite(url: string): Promise<SiteFacts | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ForgeDemo/1.0; +https://mianrosystems.com)", accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return null;
  }
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;

  const base = res.url || url;
  const facts: SiteFacts = { url: base, title: "", description: "", text: "", images: [] };
  const seen = new Set<string>();
  let skipDepth = 0;
  let inTitle = false;
  const ld: string[] = [];
  let ldBuf = "";
  const tels: string[] = [];
  const addImg = (src: string | null, photoOnly = true) => {
    if (!src || facts.images.length >= IMAGE_CAP) return;
    try {
      const u = new URL(src.trim().split(/\s+/)[0], base);
      const abs = u.toString();
      if (!/^https?:\/\//.test(abs) || SKIP_IMG.test(abs) || seen.has(abs) || (photoOnly && !PHOTO_PATH.test(u.pathname))) return;
      seen.add(abs);
      facts.images.push(abs);
    } catch {
      /* not a usable link */
    }
  };

  let logo = "";
  let touchIcon = "";
  let headerImg = "";
  const takeLogo = (src: string | null) => {
    if (logo || !src || /^data:/.test(src)) return;
    try {
      const abs = new URL(src.trim().split(/\s+/)[0]!, base).toString();
      if (/^https?:\/\//.test(abs) && !/(sprite|pixel|tracking|spacer|blank|loader)/i.test(abs)) logo = abs;
    } catch {
      /* not a usable link */
    }
  };
  const rewriter = new HTMLRewriter()
    .on('img[src*="logo"], img[class*="logo"], img[id*="logo"], img[alt*="logo"], img[alt*="Logo"], .logo img, #logo img', { element: (e) => takeLogo(e.getAttribute("src") ?? e.getAttribute("data-src")) })
    // The first picture in the header is only a fallback (it is often a phone, cart or flag icon).
    .on("header img", { element: (e) => void (headerImg ||= e.getAttribute("src") ?? e.getAttribute("data-src") ?? "") })
    .on('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]', { element: (e) => void (touchIcon ||= e.getAttribute("href") ?? "") })
    .on('meta[name="theme-color"]', { element: (e) => void (facts.themeColor ||= (e.getAttribute("content") ?? "").trim()) })
    .on("title", { element: () => void (inTitle = true), text: (t) => { if (inTitle) facts.title += t.text; if (t.lastInTextNode) inTitle = false; } })
    .on('meta[name="description"], meta[property="og:description"]', {
      element: (e) => void (facts.description ||= e.getAttribute("content") ?? ""),
    })
    .on('script[type="application/ld+json"]', {
      text: (t) => {
        ldBuf += t.text;
        if (t.lastInTextNode) {
          if (ld.length < 12 && ldBuf.length < 200_000) ld.push(ldBuf);
          ldBuf = "";
        }
      },
    })
    .on('a[href^="tel:"]', { element: (e) => void (tels.length < 6 && tels.push(e.getAttribute("href")!.slice(4))) })
    .on('meta[property="og:image"]', { element: (e) => addImg(e.getAttribute("content"), false) })
    .on("img", { element: (e) => addImg(e.getAttribute("src") ?? e.getAttribute("data-src") ?? e.getAttribute("srcset")) })
    .on("script, style, noscript, svg, template", {
      element: (e) => {
        skipDepth++;
        e.onEndTag(() => void skipDepth--);
      },
    })
    .on("body", {
      text: (t) => {
        if (skipDepth > 0 || facts.text.length >= TEXT_CAP) return;
        const s = t.text.replace(/\s+/g, " ");
        if (s.trim()) facts.text += s;
      },
    });
  try {
    await rewriter.transform(res).arrayBuffer();
  } catch {
    return null;
  }
  facts.business = pickBusiness(ld, tels);
  if (!logo && headerImg && !/(icon|phone|cart|flag|search|menu|arrow)/i.test(headerImg)) takeLogo(headerImg);
  if (!logo && touchIcon) takeLogo(touchIcon);
  if (logo) facts.logo = logo;
  facts.themeColor = brandHex(facts.themeColor ?? "");
  facts.title = facts.title.replace(/\s+/g, " ").trim().slice(0, 200);
  facts.description = facts.description.trim().slice(0, 500);
  facts.text = facts.text.replace(/\s+/g, " ").trim().slice(0, TEXT_CAP);
  if (facts.text.length < MIN_TEXT) {
    console.log("website has no readable content (parked or blocked)", base);
    return null;
  }
  return facts;
}

/** A declared brand colour worth using: #rgb or #rrggbb, and not (nearly) white, black or grey. */
export function brandHex(v: string): string | undefined {
  let h = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(h)) h = `#${[...h.slice(1)].map((c) => c + c).join("")}`;
  if (!/^#[0-9a-f]{6}$/.test(h)) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const max = Math.max(r!, g!, b!), min = Math.min(r!, g!, b!);
  if (max - min < 28 || max < 30 || min > 235) return undefined;
  return h;
}
