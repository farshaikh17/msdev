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

const env = { ANTHROPIC_API_KEY: "test" } as never;
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
