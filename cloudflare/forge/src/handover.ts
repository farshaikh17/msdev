/**
 * Putting what the business sends into a site version: their photos (in at once), their logo, corrected
 * details, real reviews and one round of edits (applied in the background by the "handover" job). Used by
 * the rep's "They replied" card on the live version and by the client portal on its draft.
 */
import { addToBrief, setHandover, updateIntake, useOwnPhotos, saveImage, type Stored } from "./db";
import { asLink } from "./demos";
import type { Env } from "./env";
import { fitImage } from "./media";

export interface HandoverResult {
  ok: boolean;
  message: string;
  photos: number;
  logo: boolean;
  facts: string[];
  edits: string;
  /** Background work was queued (logo, details, reviews or edits). */
  queued: boolean;
}

/** `who` words the message for the reader: the rep ("their photo") or the owner ("your photo"). */
export async function takeHandover(env: Env, demo: Stored, version: string, f: FormData, aiOn: boolean, who: "rep" | "owner" = "rep"): Promise<HandoverResult> {
  const slug = demo.slug;
  const their = who === "rep" ? "their" : "your";
  const text = (k: string, max = 600) => String(f.get(k) ?? "").trim().slice(0, max);
  const problems: string[] = [];
  // Their pictures: files first, then links (each at most 10 MB, and only real images).
  const fetchImage = async (url: string): Promise<Uint8Array | null> => {
    const link = asLink(url);
    if (!/^https:\/\//i.test(link)) return null;
    try {
      const r = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
      if (!r.ok || !/^image\//i.test(r.headers.get("content-type") ?? "") || Number(r.headers.get("content-length") ?? 0) > 10_000_000) return null;
      const b = new Uint8Array(await r.arrayBuffer());
      return b.length <= 10_000_000 ? b : null;
    } catch {
      return null;
    }
  };
  const fileBytes = async (v: FormDataEntryValue): Promise<Uint8Array | null> =>
    typeof v !== "string" && v.size > 0 && v.size <= 10_000_000 && /^image\//i.test(v.type) ? new Uint8Array(await v.arrayBuffer()) : null;
  const photoSources: (Uint8Array | null)[] = [];
  for (const v of f.getAll("photos")) if (typeof v !== "string" && v.size > 0 && photoSources.length < 8) photoSources.push(await fileBytes(v));
  for (const l of text("photoLinks", 4000).split(/\s+/).filter(Boolean)) if (photoSources.length < 8) photoSources.push(await fetchImage(l));
  const photos: Uint8Array[] = [];
  for (const b of photoSources) {
    const fit = b ? await fitImage(env, b, 1600) : null;
    if (fit) photos.push(fit);
    else problems.push("a photo couldn't be read");
  }
  const logoFile = f.get("logo");
  const logoRaw = (logoFile ? await fileBytes(logoFile) : null) ?? (text("logoLink") ? await fetchImage(text("logoLink")) : null);
  const logo = logoRaw ? await fitImage(env, logoRaw, 600, "webp") : null;
  if ((logoFile && typeof logoFile !== "string" && logoFile.size) || text("logoLink")) if (!logo) problems.push("the logo couldn't be read");
  // Save what came, then swap their photos in at once (no AI needed for that).
  for (let k = 0; k < photos.length; k++) await saveImage(env, slug, version, `own-${k + 1}.jpg`, "The business's own photo", photos[k]!);
  if (photos.length) await useOwnPhotos(env, slug, version, photos.length);
  if (logo) await saveImage(env, slug, version, "logo.webp", "The business's logo", logo);
  // Their corrected details.
  const intake = { ...demo.intake };
  const facts: ("phone" | "address" | "hours" | "reviews")[] = [];
  for (const k of ["phone", "address", "hours", "reviews"] as const) {
    if (!f.has(k)) continue;
    const v = text(k, k === "reviews" ? 4000 : 300);
    if (v && v !== intake[k]) {
      intake[k] = v;
      facts.push(k);
    }
  }
  if (facts.length) await updateIntake(env, slug, intake);
  if (facts.length) await addToBrief(env, slug, version, facts.map((k) => `${{ phone: "Phone", address: "Address", hours: "Opening hours", reviews: "Real reviews" }[k]}: ${intake[k]}`).join("\n"));
  const edits = text("edits", 1500);
  const editPath = text("editPath", 200) || "/";
  const needsAi = !!(logo || facts.length || edits);
  const base = { photos: photos.length, logo: !!logo, facts, edits, queued: false };
  if (needsAi && !aiOn) return { ...base, ok: false, message: `${who === "rep" ? "Their" : "Your"} photos are in, but the logo, details and edits need the AI, which is switched off.` };
  if (!photos.length && !needsAi) return { ...base, ok: false, message: problems.length ? `Nothing went in: ${problems.join("; ")}.` : who === "rep" ? "Add their photos, logo, details or what they want changed." : "Add a photo, your logo, a detail to change or what you'd like changed." };
  await setHandover(env, slug, { at: new Date().toISOString(), status: needsAi ? "working" : "done", error: "", photos: photos.length, logo: !!logo, facts, edits, editPath });
  if (needsAi) await env.BUILDS.send({ slug, version, stage: "handover" });
  const where = who === "rep" ? "on the site now" : "in your draft";
  const said = [
    photos.length ? `${photos.length === 1 ? `${their} photo is` : `${photos.length} of ${their} photos are`} ${where}` : "",
    needsAi ? `${their} ${[logo && "logo", facts.length && "details", edits && "changes"].filter(Boolean).join(", ") || "changes"} ${needsAi ? "are going in (usually 2–5 minutes)" : ""}` : "",
    problems.length ? `not used: ${[...new Set(problems)].join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  return { ...base, queued: needsAi, ok: true, message: `${said.charAt(0).toUpperCase()}${said.slice(1)}.` };
}
