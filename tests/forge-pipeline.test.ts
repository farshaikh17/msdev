/**
 * A whole Studio build rehearsed end to end, at no cost: the real build pipeline (brief, plan, design
 * system, pages, go-live, QA pass, review) runs as it does in production, and only the outside calls are
 * answered by stand-ins: Claude (the Anthropic SDK), Workers AI (DeepSeek pages and photos) and the network.
 * It checks which model each step goes to, at what effort, that the free Workers AI allowance is counted,
 * that costs are recorded, and that the art pass stays off.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Req = { model: string; output_config?: { effort: string }; system?: string; messages: { content: string | { text: string }[] }[] };
const claude: Req[] = [];
const textOf = (r: Req) => {
  const c = r.messages[0]!.content;
  return typeof c === "string" ? c : c.map((p) => p.text ?? "").join("\n");
};
const PAGE = (name: string) => `@@@ TITLE\n${name}\n@@@ DESCRIPTION\nAbout ${name}.\n@@@ CSS\n.p{}\n@@@ MAIN\n<main><h1>${name}</h1><p>Plumbing in Grand Island.</p><form><input name="name"></form></main>`;
function reply(r: Req): string {
  const t = textOf(r);
  if (t.includes("@@@ PICK")) return "@@@ PICK\nA\n@@@ WHY\nOnly this business.\n@@@ INVENTED\nnone";
  if (t.includes("@@@ TRUTH")) return '@@@ TRUTH\nIt is a plumber in Grand Island.\n@@@ EVIDENCE\n"Grand Island, NE"\n@@@ IDEA\nThe town as a map of water.\n@@@ REFUSES\nNo stock smiles.\n@@@ HEADLINE\nGrand Island runs on water.\n@@@ LOOK\norganic - calm\n@@@ FIRSTSCREEN\nown: The river bend fills the screen, the headline low on the left. - because water is the story\n@@@ OBJECT\nnone\n@@@ MOMENT\nnone';
  if (t.includes("@@@ TRADE")) return "@@@ TRADE\nPlumbing\n@@@ SERVICES\nRepairs\nInstallations\nDrain Cleaning\n@@@ PHOTOS\n" + Array.from({ length: 8 }, (_, k) => `A plumber at work, scene ${k + 1}`).join("\n") + "\n@@@ PAIRS\nNONE\n@@@ OBJECT\na brass tap\n@@@ MOVE\nslow push-in\n@@@ REVEAL\nthe pipes behind the wall";
  if (t.includes("the whole site's stylesheet")) return '@@@ THEME\nlight\n@@@ ACCENT\n#1d6b8f\n@@@ FONTS\n\n@@@ CSS\n.a{}\n@@@ HEADER\n<header><a href="/">O\'Hara Plumbing</a><a href="/about">About</a></header>\n@@@ FOOTER\n<footer><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><!--mianro-credit--></footer>\n@@@ COMPONENTS\ncards';
  if (t.includes("@@@ HEADER")) return '@@@ HEADER\n<header><a href="/">O\'Hara Plumbing</a></header>\n@@@ FOOTER\n<footer><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><!--mianro-credit--></footer>';
  const m = t.match(/## (?:Write|Change|Improve) this page: ([^(\n]+)/);
  if (t.includes("Reply with ONLY the changes")) return "@@@ EDITS\n<<<<<<< FIND MAIN\n<h1>\n=======\n<h1>\n>>>>>>> REPLACE";
  return PAGE(m ? m[1]!.trim() : "Page");
}
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = { messages: { create: async (r: Req) => stream(r) } };
    messages = { create: async (r: Req) => ({ content: [{ type: "text", text: reply((claude.push(r), r)) }], usage: { input_tokens: 3000, output_tokens: 1500 }, model: r.model }) };
  }
  async function stream(r: Req) {
    claude.push(r);
    const text = reply(r);
    return (async function* () {
      yield { type: "message_start", message: { model: r.model, usage: { input_tokens: 5000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text } };
      yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 2000 } };
    })();
  }
  return { default: Anthropic };
});

import worker from "../cloudflare/forge/src/index";
import { getDemo, getKit, getReview } from "../cloudflare/forge/src/db";
import type { BuildJob, Env, VideoJob } from "../cloudflare/forge/src/env";
import { call, makeAccount, makeHarness, setupAdmin, slugOf, type Harness } from "./forge-harness";

let h: Harness;
const workersAi: { model: string; input: Record<string, unknown> }[] = [];
const AI = {
  run: async (model: string, input: Record<string, unknown>) => {
    workersAi.push({ model, input });
    if (input.multipart) return { image: btoa("\xff\xd8\xff\xe0photo") };
    const msg = (input.messages as { content: string }[])[1]!.content;
    const name = msg.match(/## (?:Write|Change|Improve) this page: ([^(\n]+)/)?.[1]?.trim() ?? "Page";
    return { choices: [{ message: { content: PAGE(name) }, finish_reason: "stop" }], usage: { prompt_tokens: 20000, completion_tokens: 5000, neurons: 480 } };
  },
};

async function drain(env: Env, max = 300) {
  for (let n = 0; n < max && h.queued.length; n++) {
    const { body } = h.queued.shift()!;
    let again = false;
    await worker.queue({ messages: [{ body: body as BuildJob | VideoJob, attempts: 1, ack: () => undefined, retry: () => void (again = true) }] }, env);
    if (again) h.queued.push({ body });
  }
}

beforeEach(() => {
  h = makeHarness();
  claude.length = 0;
  workersAi.length = 0;
  // No real network: anything that tries is refused.
  vi.stubGlobal("fetch", async (u: string) => {
    throw new Error(`network call in a rehearsal: ${u}`);
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("a Studio build, rehearsed end to end at no cost", () => {
  it("goes to the right model at the right effort at each step, stays within the free allowance, and records its cost", async () => {
    const env = { ...h.env, AI, FORGE_ART_PASS: "off" } as unknown as Env;
    h.env = env;
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 9);
    const r = await call(h, "/demos", { cookie: b.cookie, form: { businessName: "O'Hara Plumbing", city: "Grand Island, NE", phone: "(308) 555-0142", saw: "A white van with a blue tap on the door", style: "studio", concept: "auto", hero: "auto" } });
    const slug = slugOf(r);
    expect(slug).toBeTruthy();
    await drain(env);
    const demo = (await getDemo(h.env, slug))!;
    expect(demo.buildStatus).toBe("ready");
    const kit = (await getKit(h.env, slug, demo.liveVersion!))!;
    // The brief led the design: its idea, look and first screen.
    expect(kit.idea?.idea).toBe("The town as a map of water.");
    expect(kit.concept).toBe("organic");
    expect(kit.hero).toBe("own");

    const byTask = (needle: string) => claude.filter((q) => textOf(q).includes(needle));
    // Design system: Opus, at low effort.
    const kitCalls = byTask("the whole site's stylesheet");
    expect(kitCalls).toHaveLength(1);
    expect(kitCalls[0]!.model).toBe("claude-opus-5-5");
    expect(kitCalls[0]!.output_config?.effort).toBe("low");
    // The brief: Sonnet concepts, an Opus judge. The plan: one cheap call.
    expect(byTask("@@@ TRUTH").every((q) => q.model === "claude-sonnet-5-5")).toBe(true);
    expect(byTask("@@@ PICK")[0]!.model).toBe("claude-opus-5-5");
    expect(byTask("@@@ TRADE")).toHaveLength(1);
    // Inner pages: Workers AI (DeepSeek, thinking off), not Claude.
    const pageCalls = workersAi.filter((w) => !w.input.multipart);
    // A day's first build writes most of its pages there; what would eat into the photo reserve goes to Claude.
    expect(pageCalls.length).toBeGreaterThanOrEqual(8);
    expect(pageCalls.every((w) => w.model === "@cf/deepseek-ai/deepseek-v4.1-flash-1017" && (w.input.chat_template_kwargs as { thinking: boolean }).thinking === false)).toBe(true);
    const claudePages = claude.filter((q) => /## Write this page: /.test(textOf(q)) && !textOf(q).includes("(/)"));
    expect(pageCalls.length + claudePages.length).toBeGreaterThanOrEqual(10);
    expect(claudePages.length).toBeLessThanOrEqual(5);
    // Photos: all 8 made, and counted with the pages against the free 10,000 neurons.
    expect(workersAi.filter((w) => w.input.multipart)).toHaveLength(8);
    const day = new Date().toISOString().slice(0, 10);
    const used = (k: string) => Number((h.db.prepare("SELECT value FROM settings WHERE key = ?").get(k) as { value: string } | undefined)?.value ?? 0);
    expect(used(`ai-images:${day}`)).toBe(8);
    expect(used(`ai-neurons:${day}`)).toBe(480 * pageCalls.length);
    expect(used(`ai-neurons:${day}`) + 8 * 78).toBeLessThanOrEqual(10_000);
    // Pages never take the 4,000 kept for the next builds' photos.
    expect(used(`ai-neurons:${day}`) + 8 * 78).toBeLessThanOrEqual(10_000 - 4_000);
    // The cost is recorded; no art pass (no browser here, and it is off); nothing hit the network.
    const cost = h.db.prepare("SELECT sum(usd) usd FROM build_costs WHERE slug = ?").get(slug) as { usd: number };
    expect(cost.usd).toBeGreaterThan(0);
    const review = await getReview(h.env, slug, demo.liveVersion!);
    expect(review?.artPass).toBeUndefined();
  });

  it("past the free allowance, the rest of the pages go to Claude, never to a Cloudflare bill", async () => {
    const env = { ...h.env, AI, FORGE_ART_PASS: "off" } as unknown as Env;
    h.env = env;
    const day = new Date().toISOString().slice(0, 10);
    h.db.prepare("INSERT INTO settings (key, value) VALUES (?, '9000')").run(`ai-neurons:${day}`);
    const admin = await setupAdmin(h);
    const b = await makeAccount(h, admin, "Bright Ideas", "owner@b.test", 9);
    const slug = slugOf(await call(h, "/demos", { cookie: b.cookie, form: { businessName: "Beta Plumbing", city: "Grand Island, NE", saw: "A red van", style: "studio" } }));
    await drain(env);
    expect((await getDemo(h.env, slug))!.buildStatus).toBe("ready");
    expect(workersAi.filter((w) => !w.input.multipart)).toHaveLength(0);
    expect(claude.filter((q) => /## Write this page: /.test(textOf(q))).length).toBeGreaterThanOrEqual(10);
    // Photos stop at the same line: 9,000 + 12 × 78 = 9,936.
    expect(workersAi.filter((w) => w.input.multipart).length).toBeLessThanOrEqual(12);
  });
});
