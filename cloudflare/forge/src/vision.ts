/**
 * Looking at pictures with a Workers AI vision model (no Claude): whether a generated photo is on-topic
 * for the business, and what a finished page looks like. A look costs about 350 tokens (a few thousandths
 * of a cent) and takes about a second; any failure counts as "couldn't look", never as a verdict.
 */
import type { Env } from "./env";

export const VISION_MODEL = "@cf/google/gemma-4-26b-a4b-it";

function dataUri(bytes: Uint8Array, type = "image/jpeg"): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${type};base64,${btoa(bin)}`;
}

/** Ask the vision model one question about one or more pictures; null when it couldn't answer. */
export async function lookAt(env: Env, pictures: Uint8Array[], question: string, maxTokens = 120): Promise<string | null> {
  if (!env.AI || !pictures.length) return null;
  try {
    const content = [{ type: "text", text: question }, ...pictures.map((p) => ({ type: "image_url", image_url: { url: dataUri(p) } }))];
    const r = (await (env.AI as unknown as { run(m: string, i: unknown): Promise<unknown> }).run(VISION_MODEL, {
      messages: [{ role: "user", content }],
      max_tokens: maxTokens,
      chat_template_kwargs: { enable_thinking: false },
    })) as { choices?: { message?: { content?: string } }[]; response?: string };
    const text = r.choices?.[0]?.message?.content ?? r.response ?? "";
    return text.trim() || null;
  } catch (e) {
    console.log("vision look failed", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Is this photo clearly about the business (its trade, work, tools, results or premises)? null: couldn't tell. */
export async function photoFits(env: Env, photo: Uint8Array, trade: string): Promise<{ fits: boolean; saw: string } | null> {
  if (!trade.trim()) return null;
  const a = await lookAt(env, [photo], `This photo is for the website of a ${trade} business. Would a customer see it as clearly about that business's work (its trade, its work, its tools, its finished results, its premises)? Answer FIT or OFF, then a dash and what the photo shows in under 12 words.`, 40);
  if (!a) return null;
  const m = a.match(/\b(FIT|OFF)\b/i);
  return m ? { fits: m[1]!.toUpperCase() === "FIT", saw: a.replace(/^\W*(FIT|OFF)\W*/i, "").slice(0, 120) } : null;
}
