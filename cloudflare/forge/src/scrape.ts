/**
 * Read a business's existing website for facts and photos (free; no Google
 * APIs). Returns its title, description, readable text (capped) and image
 * links, all as plain data for Claude to draw on.
 */
export interface SiteFacts {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
}

const TEXT_CAP = 7000;
const IMAGE_CAP = 16;
const SKIP_IMG = /(sprite|icon|favicon|pixel|tracking|spacer|blank|loader|\.svg($|\?)|data:)/i;

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
  const addImg = (src: string | null) => {
    if (!src || facts.images.length >= IMAGE_CAP) return;
    try {
      const abs = new URL(src.trim().split(/\s+/)[0], base).toString();
      if (!/^https?:\/\//.test(abs) || SKIP_IMG.test(abs) || seen.has(abs)) return;
      seen.add(abs);
      facts.images.push(abs);
    } catch {
      /* not a usable link */
    }
  };

  const rewriter = new HTMLRewriter()
    .on("title", { element: () => void (inTitle = true), text: (t) => { if (inTitle) facts.title += t.text; if (t.lastInTextNode) inTitle = false; } })
    .on('meta[name="description"], meta[property="og:description"]', {
      element: (e) => void (facts.description ||= e.getAttribute("content") ?? ""),
    })
    .on('meta[property="og:image"]', { element: (e) => addImg(e.getAttribute("content")) })
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
  facts.title = facts.title.replace(/\s+/g, " ").trim().slice(0, 200);
  facts.description = facts.description.trim().slice(0, 500);
  facts.text = facts.text.replace(/\s+/g, " ").trim().slice(0, TEXT_CAP);
  return facts;
}
