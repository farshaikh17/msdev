/** The page writer's revisions: edits first, the whole page only when an edit doesn't apply; shared context cached. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const replies: string[] = [];
const requests: Record<string, unknown>[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = {
      messages: {
        create: async (req: Record<string, unknown>) => {
          requests.push(req);
          const text = replies.shift() ?? "";
          return (async function* () {
            yield { type: "message_start", message: { model: String(req.model), usage: { input_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } };
            yield { type: "content_block_delta", delta: { type: "text_delta", text } };
            yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 500 } };
          })();
        },
      },
    };
  }
  return { default: Anthropic };
});

import { designSitePage, type Kit } from "../cloudflare/forge/src/designer";

const base = { ANTHROPIC_API_KEY: "test" };
const env = base as never;
const kit = { theme: "light", accent: "#a33", fonts: "", css: "", header: "<header></header>", footer: "<footer></footer>", script: "", components: "", brief: "A plumber in Tampa.", pages: [{ path: "/", name: "Home", kind: "ai", brief: "The home page." }] } as unknown as Kit;
const spec = { path: "/", name: "Home", kind: "ai", brief: "The home page." } as never;
const current = { title: "Home", description: "d", css: ".x{}", body: "<main><h1>Old</h1><p>Keep me</p></main>" };

beforeEach(() => {
  replies.length = 0;
  requests.length = 0;
});

describe("page revisions", () => {
  it("sends only the edits and applies them to the page as it is", async () => {
    replies.push("@@@ EDITS\n<<<<<<< FIND MAIN\n<h1>Old</h1>\n=======\n<h1>New</h1>\n>>>>>>> REPLACE");
    const r = await designSitePage(env, kit, spec, { instruction: "Change the headline to New", current });
    expect(requests).toHaveLength(1);
    expect(r.page.body).toBe("<main><h1>New</h1><p>Keep me</p></main>");
    expect((r.usage as { edited?: boolean }).edited).toBe(true);
    const content = (requests[0]!.messages as { content: { text: string; cache_control?: unknown }[] }[])[0]!.content;
    expect(content[1]!.text).toContain("Reply with ONLY the changes");
    // An edit thinks little first (thinking is billed as output).
    expect((requests[0]!.output_config as { effort: string }).effort).toBe("low");
    // The shared part (business, design system) is cached, the home page's calls included.
    expect(content[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("writes the page whole when an edit doesn't apply, and counts both calls", async () => {
    replies.push("@@@ EDITS\n<<<<<<< FIND MAIN\n<h1>Not on the page</h1>\n=======\n<h1>New</h1>\n>>>>>>> REPLACE");
    replies.push("@@@ TITLE\nHome\n@@@ MAIN\n<main><h1>New</h1><p>Keep me</p></main>");
    const r = await designSitePage(env, kit, spec, { notes: ["Make the headline New"], current });
    expect(requests).toHaveLength(2);
    expect((requests[1]!.messages as { content: { text: string }[] }[])[0]!.content[1]!.text).not.toContain("Reply with ONLY the changes");
    expect(r.page.body).toContain("<h1>New</h1>");
    const u = r.usage as { cost_usd: number; calls: number };
    expect(u.calls).toBe(2);
    expect(u.cost_usd).toBeGreaterThan(0);
  });

  it("writes a new page whole (nothing to edit)", async () => {
    replies.push("@@@ TITLE\nHome\n@@@ MAIN\n<main><h1>Hi</h1></main>");
    const r = await designSitePage(env, kit, spec, {});
    expect(r.page.body).toBe("<main><h1>Hi</h1></main>");
    expect(((requests[0]!.messages as { content: { text: string }[] }[])[0]!.content[1]!.text)).not.toContain("Reply with ONLY the changes");
  });
});

describe("Studio inner pages on Workers AI", () => {
  const studioKit = { ...kit, style: "studio", pages: [...(kit.pages as never[]), { path: "/about", name: "About", kind: "ai", brief: "About." }] } as unknown as Kit;
  const about = { path: "/about", name: "About", kind: "ai", brief: "About." } as never;
  const ai = (reply: unknown) => {
    const calls: { model: string; input: Record<string, unknown> }[] = [];
    return { calls, AI: { run: async (model: string, input: Record<string, unknown>) => (calls.push({ model, input }), typeof reply === "function" ? (reply as () => unknown)() : reply) } };
  };

  it("writes them with DeepSeek, thinking off, and counts what it cost", async () => {
    const w = ai({ choices: [{ message: { content: "@@@ TITLE\nAbout\n@@@ MAIN\n<main><h1>About us</h1></main>" }, finish_reason: "stop" }], usage: { prompt_tokens: 20000, completion_tokens: 5000, neurons: 1200 } });
    const r = await designSitePage({ ...base, AI: w.AI } as never, studioKit, about, {});
    expect(r.page.body).toBe("<main><h1>About us</h1></main>");
    expect(requests).toHaveLength(0); // Claude wasn't called
    expect(w.calls[0]!.model).toBe("@cf/deepseek-ai/deepseek-v4.1-flash-1017");
    expect(w.calls[0]!.input.chat_template_kwargs).toEqual({ thinking: false });
    expect((r.usage as { cost_usd: number }).cost_usd).toBeCloseTo(0.0132, 4);
  });

  it("falls back to Sonnet when Workers AI fails, runs out of room, or replies in the wrong shape", async () => {
    for (const bad of [() => { throw new Error("3040: capacity"); }, { choices: [{ message: { content: "@@@ MAIN\n<main><h1>Half" }, finish_reason: "length" }] }, { choices: [{ message: { content: "Sure! Here is a page." }, finish_reason: "stop" }] }]) {
      requests.length = 0;
      replies.push("@@@ TITLE\nAbout\n@@@ MAIN\n<main><h1>From Sonnet</h1></main>");
      const r = await designSitePage({ ...base, AI: ai(bad).AI } as never, studioKit, about, {});
      expect(r.page.body).toContain("From Sonnet");
      expect(requests[0]!.model).toBe("claude-sonnet-5-5");
    }
  });

  it("can be switched back to Sonnet, and never touches the home page or Standard sites", async () => {
    replies.push("@@@ MAIN\n<main><h1>S</h1></main>", "@@@ MAIN\n<main><h1>H</h1></main>", "@@@ MAIN\n<main><h1>Std</h1></main>");
    const w = ai({});
    await designSitePage({ ...base, AI: w.AI, FORGE_INNER_MODEL: "claude" } as never, studioKit, about, {});
    await designSitePage({ ...base, AI: w.AI } as never, studioKit, spec, {});
    await designSitePage({ ...base, AI: w.AI } as never, kit, about, {});
    expect(w.calls).toHaveLength(0);
    expect(requests.map((q) => q.model)).toEqual(["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"]);
  });
});
