/**
 * AI-generated preview photos (Cloudflare Workers AI, FLUX.2 [klein]), so a demo has pictures
 * even when the business has none online. They are for previews only: the site uses them for
 * the hero, services and about sections, never as the business's own projects or before/after.
 * About 78 Workers AI neurons each; the free plan includes 10,000 a day (about 20 sites).
 */
import type { Env } from "./env";

export const IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const STYLE = "Professional photograph for a local business website, realistic, natural light, sharp focus, no text, no logos, no watermarks.";

export interface PreviewImage {
  /** File name in the site's image folder, e.g. "photo-1.jpg". */
  name: string;
  /** What the image shows (also its alt text). */
  description: string;
  bytes: Uint8Array;
}

async function generate(env: Env, description: string): Promise<Uint8Array | null> {
  try {
    const form = new FormData();
    form.append("prompt", `${description}. ${STYLE}`);
    form.append("width", "1024");
    form.append("height", "768");
    // The binding takes multipart input; a Response serialises the form and gives its boundary.
    const body = new Response(form);
    const out = (await env.AI!.run(IMAGE_MODEL, { multipart: { body: body.body, contentType: body.headers.get("content-type") } })) as { image?: string };
    if (!out?.image) return null;
    return Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
  } catch (e) {
    // Out of free neurons for today, or the model is busy: the site is designed without this photo.
    console.log("image generation failed", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** One image per description, generated side by side; failures are left out. */
export async function previewImages(env: Env, descriptions: string[]): Promise<PreviewImage[]> {
  if (!env.AI || !descriptions.length) return [];
  const made = await Promise.all(descriptions.slice(0, 6).map((d) => generate(env, d)));
  return made.flatMap((bytes, n) => (bytes ? [{ name: `photo-${n + 1}.jpg`, description: descriptions[n], bytes }] : []));
}
