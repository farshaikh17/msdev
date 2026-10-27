/**
 * Free stock photos from Pexels (licensed for commercial use, no attribution required),
 * so a demo has pictures even when the business has none of its own online.
 * Needs PEXELS_API_KEY (free at pexels.com/api); without it, sites use only the business's photos.
 */
import type { Env } from "./env";

export interface StockPhoto {
  url: string;
  alt: string;
  credit: string;
}

interface PexelsPhoto {
  alt?: string;
  photographer?: string;
  src?: { large2x?: string; large?: string };
}

/** Up to `perQuery` landscape photos for each search, without repeats; a failed search is skipped. */
export async function stockPhotos(env: Env, queries: string[], perQuery = 3): Promise<StockPhoto[]> {
  if (!env.PEXELS_API_KEY || !queries.length) return [];
  const results = await Promise.all(
    queries.slice(0, 6).map(async (q) => {
      try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perQuery}&orientation=landscape`, {
          headers: { authorization: env.PEXELS_API_KEY! },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          console.log("pexels search failed", q, res.status);
          return [];
        }
        const { photos } = (await res.json()) as { photos?: PexelsPhoto[] };
        return (photos ?? []).flatMap((p) => {
          const url = p.src?.large2x ?? p.src?.large;
          return url ? [{ url, alt: p.alt || q, credit: p.photographer ? `Photo by ${p.photographer} on Pexels` : "Pexels" }] : [];
        });
      } catch {
        return [];
      }
    }),
  );
  const seen = new Set<string>();
  return results.flat().filter((p) => !seen.has(p.url) && seen.add(p.url));
}
