/**
 * Studio media: the pieces of a motionsites-style first screen that a still photograph can't give.
 *   - A generated hero video: the site's own hero photo brought to life (camera move, natural motion),
 *     for trades with no clip in the video library.
 *   - The signature object: the trade's one object (a wheel, a croissant, a faucet), drawn on a plain
 *     backdrop and cut out, so it can fly through the page or turn in a showcase.
 *   - Turning frames: a short clip of that object rotating, cut into transparent frames that the
 *     motion engine plays as the visitor scrolls (a 3D turn without a 3D model).
 *   - The hero subject: the hero photo's subject cut out, so the headline can sit behind it.
 *
 * Cut-outs use Cloudflare Images (background removal); frames come from Media Transformations; the
 * clips come from video models billed to the account's AI Gateway credits. Every step is optional:
 * without credits (or if a model fails) the build carries on with what it has.
 */
import type { Env } from "./env";

/** Video models, best first. Each takes the first frame and a prompt; the result names the clip's URL. */
const VIDEO_MODELS: { id: string; cost: number; input(image: string, prompt: string, literal: boolean): Record<string, unknown> }[] = [
  {
    id: "minimax/hailuo-2.3",
    cost: 0.28,
    input: (image, prompt, literal) => ({ first_frame_image: image, prompt: prompt.slice(0, 1900), duration: 6, resolution: "768P", prompt_optimizer: !literal, fast_pretreatment: false }),
  },
  {
    id: "pruna/p-video",
    cost: 0.1,
    input: (image, prompt) => ({ image, prompt: prompt.slice(0, 1900), duration: 5, resolution: "720p" }),
  },
];

/** How many frames a turn is cut into (each is a small transparent picture). */
export const SPIN_FRAMES = 24;

export interface Clip {
  bytes: Uint8Array;
  /** What it cost (US$). */
  cost: number;
}

const b64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

/** The clip's address in whatever shape the model's answer takes. */
export function clipUrl(out: unknown): string | null {
  const o = out as { result?: { video?: string }; video?: string; task?: { content?: { url?: string } }; state?: string };
  const url = o?.result?.video ?? o?.video ?? o?.task?.content?.url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
}

/**
 * Bring a still to life: a few seconds of video starting on `image`. `literal` keeps the model from
 * rewriting the prompt (a turntable must stay a turntable). Null when no model could make it.
 */
export async function makeClip(env: Env, image: Uint8Array, prompt: string, literal = false): Promise<Clip | null> {
  if (!env.AI) return null;
  const dataUri = `data:image/jpeg;base64,${b64(image)}`;
  for (const m of VIDEO_MODELS) {
    try {
      const run = env.AI.run as (model: string, input: unknown, opts?: unknown) => Promise<unknown>;
      const out = await run(m.id, m.input(dataUri, prompt, literal), { gateway: { id: "default" } });
      const url = clipUrl(out);
      if (!url) {
        console.log("video model gave no clip", m.id, JSON.stringify(out).slice(0, 300));
        continue;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`clip download ${res.status}`);
      return { bytes: faststart(new Uint8Array(await res.arrayBuffer())), cost: m.cost };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("video model failed", m.id, msg.slice(0, 200));
      // No credits on the account: no other model will do better.
      if (/credit|balance|2021|2052|402/i.test(msg)) return null;
    }
  }
  return null;
}

/**
 * Put an MP4's index (moov) before its data (mdat), so it can be read from the start (Media
 * Transformations and browsers both want it there). The chunk offsets inside the index move by the
 * index's size. Files already in that order, or that don't parse, come back unchanged.
 */
export function faststart(buf: Uint8Array): Uint8Array {
  try {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const boxes: { type: string; start: number; size: number }[] = [];
    let p = 0;
    while (p + 8 <= buf.length) {
      let size = view.getUint32(p);
      const type = String.fromCharCode(buf[p + 4]!, buf[p + 5]!, buf[p + 6]!, buf[p + 7]!);
      if (size === 1) size = Number(view.getBigUint64(p + 8));
      else if (size === 0) size = buf.length - p;
      if (size < 8 || p + size > buf.length) return buf;
      boxes.push({ type, start: p, size });
      p += size;
    }
    const moov = boxes.find((b) => b.type === "moov");
    const mdat = boxes.find((b) => b.type === "mdat");
    if (!moov || !mdat || moov.start < mdat.start) return buf;
    const index = buf.slice(moov.start, moov.start + moov.size);
    const iv = new DataView(index.buffer);
    // Walk the index down to every chunk-offset table and shift its entries.
    const walk = (from: number, to: number) => {
      let q = from;
      while (q + 8 <= to) {
        const size = iv.getUint32(q);
        const type = String.fromCharCode(index[q + 4]!, index[q + 5]!, index[q + 6]!, index[q + 7]!);
        if (size < 8 || q + size > to) return;
        if (["moov", "trak", "mdia", "minf", "stbl", "edts"].includes(type)) walk(q + 8, q + size);
        else if (type === "stco") {
          const n = iv.getUint32(q + 12);
          for (let i = 0; i < n; i++) iv.setUint32(q + 16 + i * 4, iv.getUint32(q + 16 + i * 4) + moov.size);
        } else if (type === "co64") {
          const n = iv.getUint32(q + 12);
          for (let i = 0; i < n; i++) iv.setBigUint64(q + 16 + i * 8, iv.getBigUint64(q + 16 + i * 8) + BigInt(moov.size));
        }
        q += size;
      }
    };
    walk(0, index.length);
    // Everything before mdat stays first (ftyp and friends), then the index, then the rest in order.
    const out = new Uint8Array(buf.length);
    let o = 0;
    for (const b of boxes) {
      if (b === moov) continue;
      if (b === mdat) {
        out.set(index, o);
        o += index.length;
      }
      out.set(buf.subarray(b.start, b.start + b.size), o);
      o += b.size;
    }
    return out;
  } catch {
    return buf;
  }
}

interface ImagesBinding {
  input(s: ReadableStream): { transform(t: unknown): { output(o: unknown): Promise<{ image(): ReadableStream }> } };
}
interface MediaBinding {
  input(s: ReadableStream): {
    transform(t: unknown): { output(o: unknown): { response(): Promise<Response> } };
    output(o: unknown): { response(): Promise<Response> };
  };
}
const images = (env: Env) => (env as unknown as { IMAGES?: ImagesBinding }).IMAGES;
const media = (env: Env) => (env as unknown as { MEDIA?: MediaBinding }).MEDIA;

/** The picture's subject on a transparent background (WebP), or null. */
export async function cutOut(env: Env, bytes: Uint8Array, width?: number): Promise<Uint8Array | null> {
  const img = images(env);
  if (!img) return null;
  try {
    const out = await img.input(new Blob([new Uint8Array(bytes)]).stream()).transform({ segment: "foreground", ...(width ? { width } : {}) }).output({ format: "image/webp" });
    const cut = new Uint8Array(await new Response(out.image()).arrayBuffer());
    return cut.length > 500 ? cut : null;
  } catch (e) {
    console.log("cut-out failed", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** `n` stills spread across the first `seconds` of a clip, `width` pixels wide (JPEG). */
export async function framesOf(env: Env, clip: Uint8Array, n: number, seconds: number, width = 640): Promise<Uint8Array[]> {
  const m = media(env);
  if (!m) return [];
  const stream = () => new Blob([new Uint8Array(clip)]).stream();
  const one = async (t: number) => {
    const res = await m.input(stream()).transform({ width }).output({ mode: "frame", time: `${t.toFixed(2)}s`, format: "jpg" }).response();
    if (!res.ok) throw new Error(`frame ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
  const out: Uint8Array[] = [];
  // A few at a time: each call sends the clip again.
  for (let i = 0; i < n; i += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, n - i) }, (_, k) => one(((i + k) * seconds) / n).catch(() => null)));
    for (const f of batch) if (f) out.push(f);
  }
  return out;
}

/** Turning frames: each still of the turntable clip with its backdrop removed. */
export async function spinFrames(env: Env, clip: Uint8Array, seconds: number): Promise<Uint8Array[]> {
  const stills = await framesOf(env, clip, SPIN_FRAMES, seconds * 0.98);
  if (stills.length < SPIN_FRAMES * 0.75) return [];
  const cut: Uint8Array[] = [];
  for (let i = 0; i < stills.length; i += 6) cut.push(...(await Promise.all(stills.slice(i, i + 6).map((s) => cutOut(env, s)))).filter((c): c is Uint8Array => !!c));
  return cut.length >= SPIN_FRAMES * 0.75 ? cut : [];
}

/** The prompt that draws the signature object on its own, ready to be cut out (and turned). */
export const objectPrompt = (object: string) =>
  `Studio product photograph of ${object}. One single object, the whole of it in frame and centred, with a generous empty margin all round, seen in a three-quarter view, on a plain flat mid-grey seamless background. Soft even studio light, crisp clean edges, rich realistic detail and materials. Nothing else in the picture, no shadow on the background, no text, no logos.`;

/** The prompt that turns the object once, on the spot, for the frames. */
export const turntablePrompt = (object: string) =>
  `${object} slowly rotates one full turn on the spot, as if on a hidden turntable, at a smooth constant speed. The camera is locked off and does not move or zoom. The plain grey background and the even studio light stay exactly the same. Nothing else moves or appears.`;

/** The prompt that brings the hero photo to life. */
export const heroClipPrompt = (move?: string) =>
  `${move || "A slow, smooth cinematic push-in on the scene, with subtle natural motion in it"}. Realistic, photographic, one continuous shot with no cuts, steady camera, natural light. No text, no logos, no new people or objects.`;

/** The id a site version's generated hero clip is kept under (served at /_v/<id>.mp4, like library clips). */
export const heroClipId = (version: string) => `g-${version}-hero`;
/** The marker row that says a version has a generated hero clip (the clip itself lives in the video store). */
export const HERO_CLIP = "hero-clip.mp4";

export interface StudioMedia {
  /** What the clips cost (US$); cut-outs, frames and the object picture are within free allowances. */
  cost: number;
  /** The files made, for the build log. */
  made: string[];
}

/**
 * Everything a Studio site's signature hero needs beyond the photos, made while the design is written.
 * `hero` is the signature hero; `photo1` the hero photo; `libraryClip` whether the video library already
 * has a clip for the trade (then no hero clip is generated).
 */
export async function studioMedia(
  env: Env,
  deps: {
    save(name: string, description: string, bytes: Uint8Array): Promise<void>;
    drawObject(prompt: string): Promise<Uint8Array | null>;
  },
  version: string,
  hero: { id: string; media: string },
  plan: { object?: string; move?: string } | null,
  photo1: Uint8Array | null,
  libraryClip: boolean,
): Promise<StudioMedia> {
  const out: StudioMedia = { cost: 0, made: [] };
  const { media } = hero;
  // The signature object: drawn, cut out, and (when video can be made) turned once for the frames.
  if ((media === "object" || media === "spin") && plan?.object) {
    const drawn = await deps.drawObject(objectPrompt(plan.object));
    const cut = drawn ? await cutOut(env, drawn, 900) : null;
    if (drawn && cut) {
      await deps.save("object.webp", plan.object, cut);
      out.made.push("object.webp");
      const clip = await makeClip(env, drawn, turntablePrompt(plan.object), true);
      if (clip) {
        out.cost += clip.cost;
        const frames = await spinFrames(env, clip.bytes, 6).catch(() => []);
        await Promise.all(frames.map((f, i) => deps.save(`spin-${String(i + 1).padStart(2, "0")}.webp`, `${plan.object} (turning, frame ${i + 1})`, f)));
        if (frames.length) out.made.push(`${frames.length} turning frames`);
      }
    }
  }
  // The hero subject, cut out of the hero photo so the headline can pass behind it.
  if (media === "front" && photo1) {
    const cut = await cutOut(env, photo1);
    if (cut) {
      await deps.save("subject.webp", "The hero photo's subject, cut out", cut);
      out.made.push("subject.webp");
    }
  }
  // A moving hero: the hero photo brought to life, when the library has nothing for the trade.
  if (["dive", "switcher", "hangtag"].includes(hero.id) && photo1 && !libraryClip) {
    const clip = await makeClip(env, photo1, heroClipPrompt(plan?.move));
    if (clip) {
      out.cost += clip.cost;
      await env.VIDEOS.put(`v:${heroClipId(version)}`, clip.bytes);
      await deps.save(HERO_CLIP, plan?.move ?? "Hero video", new Uint8Array(0));
      out.made.push(HERO_CLIP);
    }
  }
  return out;
}
