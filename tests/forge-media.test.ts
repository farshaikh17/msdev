import { describe, expect, it, vi } from "vitest";
import { clipUrl, faststart, heroClipId, HERO_CLIP, makeClip, studioMedia } from "../cloudflare/forge/src/media";
import { heroMotion } from "../cloudflare/forge/src/hero";
import { brandMoment, companionFor, flightPath, HEROES, studioExtras } from "../cloudflare/forge/src/heroes";
import { IMAGE_PATH } from "../cloudflare/forge/src/index";

/** A box: 4-byte size, 4-byte type, then the payload. */
function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(8 + body);
  new DataView(out.buffer).setUint32(0, 8 + body);
  out.set([...type].map((c) => c.charCodeAt(0)), 4);
  let o = 8;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
/** A chunk-offset table (version/flags, count, offsets). */
function stco(offsets: number[]): Uint8Array {
  const b = new Uint8Array(8 + offsets.length * 4);
  const v = new DataView(b.buffer);
  v.setUint32(4, offsets.length);
  offsets.forEach((o, i) => v.setUint32(8 + i * 4, o));
  return box("stco", b);
}
const concat = (...a: Uint8Array[]) => {
  const out = new Uint8Array(a.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of a) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const readStco = (file: Uint8Array) => {
  const i = Buffer.from(file).indexOf("stco");
  const v = new DataView(file.buffer, file.byteOffset);
  const n = v.getUint32(i + 8);
  return Array.from({ length: n }, (_, k) => v.getUint32(i + 12 + k * 4));
};

describe("Studio media", () => {
  it("moves an MP4's index ahead of its data and shifts the chunk offsets with it", () => {
    const ftyp = box("ftyp", new Uint8Array([1, 2, 3, 4]));
    const payload = new Uint8Array(100).map((_, i) => i);
    const mdat = box("mdat", payload);
    // Chunks start inside mdat: after ftyp (12 bytes) and the mdat header (8).
    const first = ftyp.length + 8;
    const moov = box("moov", box("trak", box("mdia", box("minf", box("stbl", stco([first, first + 40]))))));
    const slow = concat(ftyp, mdat, moov);
    const fast = faststart(slow);
    expect(fast.length).toBe(slow.length);
    const at = (f: Uint8Array, t: string) => Buffer.from(f).indexOf(t);
    expect(at(fast, "moov")).toBeLessThan(at(fast, "mdat"));
    // Each offset still points at the same byte of the payload.
    const offs = readStco(fast);
    expect(offs).toEqual([first + moov.length, first + 40 + moov.length]);
    expect(fast[offs[0]!]).toBe(0);
    expect(fast[offs[1]!]).toBe(40);
    // Already in order, or not an MP4: unchanged.
    expect(faststart(fast)).toBe(fast);
    const junk = new Uint8Array([0, 0, 0, 3, 9, 9]);
    expect(faststart(junk)).toBe(junk);
  });

  it("reads the clip address from each video model's answer", () => {
    expect(clipUrl({ state: "Completed", result: { video: "https://x/a.mp4" } })).toBe("https://x/a.mp4");
    expect(clipUrl({ task: { status: "succeeded", content: { url: "https://x/b.mp4" } } })).toBe("https://x/b.mp4");
    expect(clipUrl({ video: "https://x/c.mp4" })).toBe("https://x/c.mp4");
    expect(clipUrl({ result: { video: "http://insecure/a.mp4" } })).toBeNull();
    expect(clipUrl(null)).toBeNull();
  });

  it("makes a clip with the best model, falls back on failure, and stops at once without credits", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(new Uint8Array([1, 2, 3])));
    const calls: string[] = [];
    // Off by default: nothing is asked of any model.
    const off = { AI: { run: vi.fn() } };
    expect(await makeClip(off as never, new Uint8Array([9]), "push in")).toBeNull();
    expect(off.AI.run).not.toHaveBeenCalled();
    const ok = { FORGE_VIDEO_GEN: "on", AI: { run: async (m: string) => (calls.push(m), m.startsWith("minimax") ? { result: { status: "Fail" } } : { state: "Completed", result: { video: "https://x/v.mp4" } }) } };
    const clip = await makeClip(ok as never, new Uint8Array([9]), "push in");
    expect(calls).toEqual(["minimax/hailuo-2.3", "pruna/p-video"]);
    expect(clip?.cost).toBe(0.1);
    expect(Array.from(clip!.bytes)).toEqual([1, 2, 3]);
    const broke = { FORGE_VIDEO_GEN: "on", AI: { run: vi.fn(async () => { throw new Error("2021: Insufficient AI Gateway credits"); }) } };
    expect(await makeClip(broke as never, new Uint8Array([9]), "push in")).toBeNull();
    expect(broke.AI.run).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("makes only what the signature hero needs, and carries on when a step fails", async () => {
    const saved: Record<string, number> = {};
    const kv: Record<string, number> = {};
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(new Uint8Array(50)));
    const env = {
      FORGE_VIDEO_GEN: "on",
      AI: { run: async () => ({ state: "Completed", result: { video: "https://x/v.mp4" } }) },
      VIDEOS: { put: async (k: string, v: Uint8Array) => void (kv[k] = v.length) },
      // Background removal works; frame extraction is not bound here, so the object stays a still.
      IMAGES: { input: () => ({ transform: () => ({ output: async () => ({ image: () => new Blob([new Uint8Array(900)]).stream() }) }) }) },
    };
    const deps = { save: async (n: string, _d: string, b: Uint8Array) => void (saved[n] = b.length), drawObject: async () => new Uint8Array(10) };
    const plan = { object: "a glossy alloy wheel", move: "slow push-in" };
    const photo = new Uint8Array(20);
    // Flying object: the object, cut out (no frames without the frame binding); the clip is still paid for.
    const float = await studioMedia(env as never, deps, "v1", { id: "float", media: "object" }, plan, photo, false);
    expect(Object.keys(saved)).toEqual(["object.webp"]);
    expect(float.cost).toBeGreaterThan(0);
    // Subject in front (and the breakout card): a cut-out of the hero photo besides the object; no video, no turning clip.
    for (const k of Object.keys(saved)) delete saved[k];
    const front = await studioMedia(env as never, deps, "v1", { id: "front", media: "front" }, plan, photo, false);
    expect(Object.keys(saved).sort()).toEqual(["object.webp", "subject.webp"]);
    expect(front.cost).toBe(0);
    // Camera dive with no library clip: the hero photo brought to life, kept in the video store with a marker.
    for (const k of Object.keys(saved)) delete saved[k];
    const dive = await studioMedia(env as never, deps, "v1", { id: "dive", media: "dive" }, plan, photo, false);
    expect(Object.keys(saved).sort()).toEqual([HERO_CLIP, "object.webp"]);
    expect(kv[`v:${heroClipId("v1")}`]).toBe(50);
    expect(dive.made).toContain(HERO_CLIP);
    // A library clip already exists, or the hero shows stills only: only the object (every Studio site flies it).
    for (const k of Object.keys(saved)) delete saved[k];
    await studioMedia(env as never, deps, "v1", { id: "dive", media: "dive" }, plan, photo, true);
    await studioMedia(env as never, deps, "v1", { id: "slides", media: "photo" }, plan, photo, false);
    await studioMedia(env as never, deps, "v1", { id: "spotlight", media: "pair" }, plan, photo, false);
    expect(Object.keys(saved)).toEqual(["object.webp"]);
    expect(kv[`v:${heroClipId("v2")}`]).toBeUndefined();
    fetchSpy.mockRestore();
  });

  it("fills the turning showcase and the magazine cover, and serves their pictures", () => {
    const frames = ["/s/_img/v/spin-01.webp", "/s/_img/v/spin-02.webp"];
    const spin = heroMotion(null, ["/s/_img/v/photo-1.jpg"], "", { media: "spin", frames, object: "/s/_img/v/object.webp" });
    expect(spin).toContain('class="m-spin"');
    expect(spin).toContain('data-spin-frames="/s/_img/v/spin-01.webp|/s/_img/v/spin-02.webp"');
    // Without frames the still object is shown (the engine sways it); without either, the photo.
    expect(heroMotion(null, ["/p.jpg"], "", { media: "spin", object: "/o.webp" })).toBe('<div class="m-spin"><img src="/o.webp" alt="" fetchpriority="high"></div>');
    expect(heroMotion(null, ["/p.jpg"], "", { media: "spin" })).toContain('src="/p.jpg"');
    // The cover holds the photo still (no drift), so the cut-out laid over it lines up.
    expect(heroMotion(null, ["/p.jpg", "/q.jpg"], "", { media: "front" })).toBe('<img src="/p.jpg" alt="" fetchpriority="high">');
    for (const n of ["object.webp", "subject.webp", "spin-07.webp", "photo-1.jpg"]) expect(`/a-site/_img/abc123/${n}`).toMatch(IMAGE_PATH);
    for (const n of ["spin-7.webp", "photo-1.webp", "hero-clip.mp4"]) expect(`/a-site/_img/abc123/${n}`).not.toMatch(IMAGE_PATH);
    // The new heroes ask for perches, the giant word behind the subject, and a pinned stage.
    const by = (id: string) => HEROES.find((h) => h.id === id)!.spec;
    expect(by("float")).toContain("data-perch");
    expect(by("front")).toContain("data-front-text");
    expect(by("spin")).toContain('data-pin="2.5"');
  });

  it("flies the object on every Studio first screen, and deals each site its brand moment and flight path", () => {
    // The flying-object hero plans its own perches and the turning showcase keeps the object in the hero; every other gets two perches.
    expect(companionFor("float")).toBe(false);
    expect(companionFor("spin")).toBe(false);
    for (const id of ["spotlight", "dive", "switcher", "slides", "hangtag", "front", "breakout", "orbit", undefined]) expect(companionFor(id)).toBe(true);
    expect(studioExtras("dive", "a-1")).toContain("data-perch");
    expect(studioExtras("float", "a-1")).not.toContain("FLYING OBJECT");
    // Both brand moments and all three paths turn up across sites, and a site always gets the same one.
    const slugs = Array.from({ length: 30 }, (_, i) => `site-${i}`);
    expect(new Set(slugs.map(brandMoment)).size).toBe(2);
    expect(new Set(slugs.map(flightPath)).size).toBe(3);
    expect(brandMoment("site-3")).toBe(brandMoment("site-3"));
    const mask = slugs.find((s) => brandMoment(s) === "mask")!;
    const parts = slugs.find((s) => brandMoment(s) === "particles")!;
    expect(studioExtras("dive", mask)).toContain("data-mask-zoom");
    expect(studioExtras("dive", parts)).toContain("data-particles");
    // The breakout card holds the hero photo still, like the cover (its cut-out subject must line up).
    expect(heroMotion(null, ["/p.jpg"], "", { media: "breakout" })).toBe('<img src="/p.jpg" alt="" fetchpriority="high">');
  });
});
