/**
 * Site copy from Claude Opus 5.5. The template's schema is too large for
 * strict structured outputs ("compiled grammar is too large"), so Claude gets
 * the JSON Schema in its instructions and the reply is checked here against the
 * same Zod schema; a reply that doesn't fit gets one corrective retry.
 * Without ANTHROPIC_API_KEY the site is drafted from the trade template.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ICONS, SiteContent, type Intake } from "../../../src/forge/schema";
import { draftContent, promptFor, responseSchema } from "../../../src/forge/copy";
import type { Env } from "./env";

export const MODEL = "claude-opus-5-5";

/** Built once per Worker instance (converting the schema costs CPU). */
const SYSTEM = `You write website copy for local home-services businesses.
Reply with only a JSON object (no prose, no code fences) that matches this JSON Schema exactly, with every property present:
${JSON.stringify(responseSchema())}`;

const ICON_SET = new Set<string>(ICONS);

/** Pull the JSON object out of a reply and fix the one thing models commonly get wrong (unknown icon names). */
function toContent(text: string): { ok: true; content: SiteContent } | { ok: false; why: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, why: "no JSON object found" };
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { ok: false, why: `invalid JSON (${e instanceof Error ? e.message : "parse error"})` };
  }
  for (const key of ["services", "whyUs"] as const) {
    const items = (json as Record<string, { items?: { icon?: string }[] }>)?.[key]?.items;
    if (Array.isArray(items)) for (const it of items) if (it && !ICON_SET.has(String(it.icon))) it.icon = "check";
  }
  const parsed = SiteContent.safeParse(json);
  if (parsed.success) return { ok: true, content: parsed.data };
  return { ok: false, why: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

function friendly(e: unknown): Error {
  console.error("claude error", e instanceof Error ? e.message : String(e));
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
    return new Error("Claude rejected the API key. Check ANTHROPIC_API_KEY in Cloudflare.");
  if (e instanceof Anthropic.RateLimitError) return new Error("Claude's rate limit was hit. Wait a minute and try again.");
  if (e instanceof Anthropic.BadRequestError && /credit|billing/i.test(e.message))
    return new Error("The Claude API account is out of credit. Top it up at console.anthropic.com.");
  if (e instanceof Anthropic.APIError) return new Error(`Claude returned an error (${e.status ?? "network"}). Try again in a moment.`);
  return e instanceof Error ? e : new Error(String(e));
}

export async function writeCopy(env: Env, i: Intake): Promise<{ content: SiteContent; writtenBy: "ai" | "draft" }> {
  if (!env.ANTHROPIC_API_KEY) return { content: draftContent(i), writtenBy: "draft" };
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: promptFor(i) }];

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res;
    try {
      res = await client.beta.messages.create({
        model: env.CLAUDE_MODEL || MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        // Low effort is plenty for marketing copy and keeps each site cheap.
        output_config: { effort: "low" },
        // If the model declines (safety), the API re-runs the request on a suitable fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        messages,
      });
    } catch (e) {
      throw friendly(e);
    }
    console.log("claude usage", JSON.stringify({ attempt, model: res.model, usage: res.usage, stop: res.stop_reason }));
    if (res.stop_reason === "refusal") throw new Error("Claude declined to write this site. Try rewording the details.");
    if (res.stop_reason === "max_tokens") throw new Error("The site copy came back incomplete. Try again.");
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const out = toContent(text);
    if (out.ok) return { content: out.content, writtenBy: "ai" };
    console.error("claude reply didn't fit", out.why);
    // One corrective retry: keep the conversation append-only and say what to fix.
    messages.push({ role: "assistant", content: res.content }, { role: "user", content: `That reply didn't match the schema (${out.why}). Reply again with only the corrected, complete JSON object.` });
  }
  throw new Error("Claude's reply didn't fit the template twice. Try again.");
}
