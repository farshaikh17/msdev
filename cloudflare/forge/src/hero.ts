/**
 * The home hero's moving background. Designs leave an empty <div class="hero-motion"> behind the
 * hero text; when a page is served it gets one of:
 *   - a looping, muted hero video from the team's video library, if one matches the business's trade;
 *   - otherwise up to three of the site's preview photos, cross-fading with a slow zoom and pan.
 * Filling it at serve time means a clip added to the library shows on matching sites at once.
 */
import { esc } from "../../../src/forge/render";
import type { Intake } from "../../../src/forge/schema";

export interface LibraryEntry {
  id: number;
  name: string;
  /** Set for clips synced from the Google Drive folder. */
  driveId?: string | null;
  fileName?: string | null;
  /** True for the library every account's demos can use (managed by Mianro staff). */
  shared?: boolean;
  /** Lower-case words or phrases matched against the business's trade, name and services. */
  keywords: string[];
  urls: string[];
}

/** Split a comma/line-separated keyword list. */
export const parseKeywords = (raw: string) =>
  [...new Set(raw.split(/[,\n]/).map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2))].slice(0, 30);

/** Video links, one per line: https only, and they must look like video files or GoHighLevel media. */
export function parseVideoUrls(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/\s+/)
        .map((u) => u.trim())
        .filter((u) => /^https:\/\/[^\s"'<>]+$/.test(u) && (/\.(mp4|webm|mov)(\?|$)/i.test(u) || /filesafe\.space|leadconnectorhq|msgsndr/.test(u))),
    ),
  ].slice(0, 12);
}

/**
 * The library entry for this business: the one with the most keyword hits in its trade (weighted
 * highest), name and services. Whole-word matches only, so "ac" doesn't match "Pollux Air Conditioning…" wrongly.
 */
export function matchVideo(library: LibraryEntry[], i: Intake, slug: string, siteServices = ""): string | null {
  // The services the site was built with count like typed-in services (the trade is often left empty).
  const fields = [i.industry, i.businessName, `${i.services} ${siteServices}`].map((f) => ` ${f.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `);
  // Clips from every entry with the best score (Drive clips are one entry each, so a trade has several).
  let clips: string[] = [];
  let bestScore = 0;
  for (const e of library) {
    let score = 0;
    for (const k of e.keywords) {
      const word = ` ${k.replace(/[^a-z0-9]+/g, " ").trim()} `;
      if (word.trim() && fields[0].includes(word)) score += 3;
      else if (word.trim() && (fields[1].includes(word) || fields[2].includes(word))) score += 1;
    }
    if (!score || !e.urls.length || score < bestScore) continue;
    if (score > bestScore) [clips, bestScore] = [[], score];
    clips.push(...e.urls);
  }
  // One stray word in the services (a motel's "breakfast") isn't a match: the trade must hit, or two words.
  if (!clips.length || bestScore < 2) return null;
  // Same clip for a given demo every time; different demos in the trade spread across the clips.
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return clips[h % clips.length];
}

/** What goes inside the hero's motion layer. Empty when there's neither a video nor a photo. */
export function heroMotion(video: string | null, photos: string[], reveal = ""): string {
  const poster = photos[0] ?? "";
  // A Studio first screen with a matched second picture: it shows through a spotlight that trails the pointer.
  if (!video && poster && reveal) return `<img src="${esc(poster)}" alt="" fetchpriority="high"><img data-spotlight-reveal src="${esc(reveal)}" alt="">`;
  if (video)
    return `${poster ? `<img src="${esc(poster)}" alt="" fetchpriority="high">` : ""}<video autoplay muted loop playsinline preload="auto"${poster ? ` poster="${esc(poster)}"` : ""}><source src="${esc(video)}" type="video/mp4"></video>`;
  // Three photos cross-fade; with fewer, the first one drifts on its own (two would leave gaps).
  const shown = photos.length >= 3 ? photos.slice(0, 3) : photos.slice(0, 1);
  if (!shown.length) return "";
  return shown.map((p, n) => `<img src="${esc(p)}" alt=""${n === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>`).join("");
}

/**
 * Positions the layer behind the hero (.hero-motion), or just the media inside a design's own
 * background layer (.hero-motion-fill, see LEGACY_HERO_BG), and animates it. Three photos: each holds for ~6s with a slow
 * zoom and pan, then cross-fades to the next (18s loop). One photo just drifts. Reduced motion:
 * the first photo, still; no video.
 */
export const HERO_CSS = `.hero-motion{position:absolute;inset:0;z-index:0;pointer-events:none}
.hero-motion,.hero-motion-fill{overflow:hidden}
:is(.hero-motion,.hero-motion-fill) :is(img,video){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
:is(.hero-motion,.hero-motion-fill):has(img:nth-child(3)) img{opacity:0;animation:fg-fade 18s infinite,fg-drift 18s infinite}
/* Staggered starts (as specific as the rule above, so its shorthand doesn't reset them). */
:is(.hero-motion,.hero-motion-fill):has(img:nth-child(3)) img:nth-child(1){animation-delay:-1s}
:is(.hero-motion,.hero-motion-fill):has(img:nth-child(3)) img:nth-child(2){animation-delay:5s}
:is(.hero-motion,.hero-motion-fill):has(img:nth-child(3)) img:nth-child(3){animation-delay:11s}
:is(.hero-motion,.hero-motion-fill) img:only-child,:is(.hero-motion,.hero-motion-fill)[data-spotlight] img{animation:fg-zoom-in 1.8s cubic-bezier(.16,1,.3,1) both,fg-drift-solo 20s ease-in-out 1.8s infinite alternate}
:is(.hero-motion,.hero-motion-fill):has(video) img{animation:none;opacity:1}
@keyframes fg-fade{0%{opacity:0}5%{opacity:1}33%{opacity:1}39%{opacity:0}100%{opacity:0}}
@keyframes fg-drift{0%{transform:scale(1.04) translate(0,0)}39%{transform:scale(1.16) translate(-2%,-1.5%)}100%{transform:scale(1.16) translate(-2%,-1.5%)}}
@keyframes fg-zoom-in{from{transform:scale(1.15)}to{transform:scale(1.03)}}
@keyframes fg-drift-solo{from{transform:scale(1.03)}to{transform:scale(1.15) translate(-2%,-1%)}}
@media (prefers-reduced-motion:reduce){:is(.hero-motion,.hero-motion-fill) img{animation:none!important;opacity:0!important}:is(.hero-motion,.hero-motion-fill) img:first-child{opacity:1!important}:is(.hero-motion,.hero-motion-fill) video{display:none}}`;

/**
 * Sites designed before the motion layer existed: the full-bleed photo layer of the home page's
 * first section, if it has one, gets filled instead (keeping the design's own positioning).
 */
export const LEGACY_HERO_BG = 'main section:first-of-type [class*="hero-bg"], main section:first-of-type [class*="hero__bg"], main section:first-of-type [class*="hero-media"]';
