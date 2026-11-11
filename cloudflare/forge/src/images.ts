/**
 * AI-generated preview photos (Cloudflare Workers AI, FLUX.2 [klein]), so a demo has pictures
 * even when the business has none online. They are for previews only: the site uses them for
 * the hero, services and about sections, never as the business's own projects or before/after.
 * About 78 Workers AI neurons each; the free plan includes 10,000 a day (about 20 sites).
 */
import { getSetting, setSetting } from "./db";
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

/** Pictures a day this account may make (about 7,000 of the 10,000 free neurons, leaving room for other projects). */
export const DAILY_IMAGES = 90;
/** A before/after pair is made at 512x384 (the reference-image limit is under 512x512) and costs about a quarter of a full photo each. */
const PAIR_SIZE = { w: 512, h: 384 };

/** Count pictures made today; false when today's allowance is already used up. */
async function spendImages(env: Env, n: number, weight = 1): Promise<boolean> {
  const key = `ai-images:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await getSetting(env, key)) || 0;
  if (used + n * weight > DAILY_IMAGES) return false;
  await setSetting(env, key, String(Math.ceil(used + n * weight)));
  return true;
}

async function generate(env: Env, description: string, opts: { reference?: Uint8Array; small?: boolean } = {}): Promise<Uint8Array | null> {
  try {
    const form = new FormData();
    form.append("prompt", opts.reference ? description : `${description}. ${STYLE}`);
    form.append("width", String(opts.small ? PAIR_SIZE.w : 1024));
    form.append("height", String(opts.small ? PAIR_SIZE.h : 768));
    if (opts.reference) form.append("input_image_0", new Blob([new Uint8Array(opts.reference)], { type: "image/jpeg" }), "reference.jpg");
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
  const wanted = descriptions.slice(0, 8);
  // Past today's allowance the site is designed with fewer (or no) photos rather than risk a bill.
  const made = await Promise.all(wanted.map(async (d) => ((await spendImages(env, 1)) ? generate(env, d) : null)));
  return made.flatMap((bytes, n) => (bytes ? [{ name: `photo-${n + 1}.jpg`, description: descriptions[n], bytes }] : []));
}

export interface BeforeAfter {
  /** What the "before" shows, and the change that makes the "after". */
  before: string;
  after: string;
}

export interface PairImage {
  name: string;
  description: string;
  bytes: Uint8Array;
}

/**
 * Illustrative before/after pairs: the "before" is generated, then the model is asked for the same
 * scene transformed, using the "before" as its reference, so the camera angle, buildings and
 * surroundings match. A pair is kept only when both pictures come out. Each picture is counted at a
 * quarter of a full photo against the daily allowance.
 */
export async function beforeAfterImages(env: Env, pairs: BeforeAfter[]): Promise<PairImage[]> {
  if (!env.AI || !pairs.length) return [];
  const out = await Promise.all(
    pairs.slice(0, 2).map(async (p, n): Promise<PairImage[]> => {
      if (!(await spendImages(env, 2, 0.3))) return [];
      const before = await generate(env, `${p.before}. ${STYLE} Overcast, unflattering light.`, { small: true });
      if (!before) return [];
      const after = await generate(env, `Using image 0 as the exact reference for the scene, camera angle, buildings and surroundings: ${p.after}. Realistic photograph, golden hour light, no people, no text, no logos.`, { reference: before, small: true });
      if (!after) return [];
      return [
        { name: `ba-${n + 1}-before.jpg`, description: `Before: ${p.before}`, bytes: before },
        { name: `ba-${n + 1}-after.jpg`, description: `After: ${p.after}`, bytes: after },
      ];
    }),
  );
  return out.flat();
}
