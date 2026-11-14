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

import { designSitePage, inventedContacts, type Kit } from "../cloudflare/forge/src/designer";

/** Today's Workers AI use, as the page writer reads it from the settings table. */
const used = { text: 0, pics: 0 };
const spent: number[] = [];
const DB = {
  prepare: (sql: string) => ({
    bind: (...args: unknown[]) => ({
      first: async () => ({ text: used.text, pics: used.pics }),
      run: async () => (sql.startsWith("INSERT INTO settings") ? spent.push(Number(args[1])) : 0, { meta: { changes: 1 } }),
    }),
  }),
};
const base = { ANTHROPIC_API_KEY: "test", DB };
const env = base as never;
const kit = { theme: "light", accent: "#a33", fonts: "", css: "", header: "<header></header>", footer: "<footer></footer>", script: "", components: "", brief: "A plumber in Tampa.", pages: [{ path: "/", name: "Home", kind: "ai", brief: "The home page." }] } as unknown as Kit;
const spec = { path: "/", name: "Home", kind: "ai", brief: "The home page." } as never;
const current = { title: "Home", description: "d", css: ".x{}", body: "<main><h1>Old</h1><p>Keep me</p></main>" };

beforeEach(() => {
  replies.length = 0;
  requests.length = 0;
  used.text = 0;
  used.pics = 0;
  spent.length = 0;
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

describe("the rest of a Studio home page on Workers AI", () => {
  const studioKit = { ...kit, style: "studio" } as unknown as Kit;
  const hero = { title: "Home", description: "", css: "", body: "<main><section>First screen</section></main>" };
  it("is written by DeepSeek once Opus has built the first screen, and by Opus if DeepSeek fails", async () => {
    const calls: string[] = [];
    const ok = { run: async (m: string) => (calls.push(m), { choices: [{ message: { content: "@@@ MAIN\n<main><section>First screen</section><section>Rest</section></main>" }, finish_reason: "stop" }], usage: { neurons: 1500 } }) };
    const r = await designSitePage({ ...base, AI: ok } as never, studioKit, spec, { hero });
    expect(calls).toEqual(["@cf/deepseek-ai/deepseek-v4.1-flash-1017"]);
    expect(r.page.body).toContain("Rest");
    expect(requests).toHaveLength(0);
    replies.push("@@@ MAIN\n<main><section>First screen</section><section>From Opus</section></main>");
    await designSitePage({ ...base, AI: { run: async () => { throw new Error("busy"); } } } as never, studioKit, spec, { hero });
    expect(requests[0]!.model).toBe("claude-opus-5-5");
  });
  it("leaves the first screen and the art pass to Opus", async () => {
    const calls: string[] = [];
    const ai = { run: async (m: string) => (calls.push(m), {}) };
    replies.push("@@@ MAIN\n<main><section>Hero</section></main>", "@@@ EDITS\n<<<<<<< FIND MAIN\nFirst screen\n=======\nFirst\n>>>>>>> REPLACE");
    await designSitePage({ ...base, AI: ai } as never, studioKit, spec, { heroOnly: true });
    await designSitePage({ ...base, AI: ai } as never, studioKit, spec, { notes: ["Shorter"], current: hero });
    expect(calls).toHaveLength(0);
    expect(requests.map((q) => q.model)).toEqual(["claude-opus-5-5", "claude-opus-5-5"]);
  });
});

describe("contact details nobody gave", () => {
  it("finds a phone number or email that isn't in what the model was given", () => {
    const given = "Business: O'Hara Plumbing\nPhone: (308) 555-0101\nEmail: hello@ohara.test";
    expect(inventedContacts('<a href="tel:+13085550101">(308) 555-0101</a> hello@ohara.test', given)).toEqual([]);
    expect(inventedContacts('<a href="tel:+13083814482">(308) 381-4482</a>', given)).toEqual(["tel:+13083814482", "(308) 381-4482"]);
    expect(inventedContacts("Write to info@ohara-plumbing.com", given)).toEqual(["info@ohara-plumbing.com"]);
    // Font and package URLs aren't emails; a year or a price isn't a phone.
    expect(inventedContacts('family=Inter:wght@400;700 gsap@3.12 Since 1984, $120', given)).toEqual([]);
  });

  it("throws away a Workers AI page that invents one, and Claude writes it", async () => {
    const studioKit = { ...kit, style: "studio", pages: [...(kit.pages as never[]), { path: "/about", name: "About", kind: "ai", brief: "About." }] } as unknown as Kit;
    const ai = { run: async () => ({ choices: [{ message: { content: '@@@ MAIN\n<main><a href="tel:+13083814482">Call (308) 381-4482</a></main>' }, finish_reason: "stop" }], usage: { neurons: 900 } }) };
    replies.push("@@@ MAIN\n<main><h1>From Sonnet</h1></main>");
    const r = await designSitePage({ ...base, AI: ai } as never, studioKit, { path: "/about", name: "About", kind: "ai", brief: "About." } as never, {});
    expect(r.page.body).toContain("From Sonnet");
  });
});

describe("Cloudflare's free daily allowance", () => {
  const studioKit = { ...kit, style: "studio", pages: [...(kit.pages as never[]), { path: "/about", name: "About", kind: "ai", brief: "About." }] } as unknown as Kit;
  const about = { path: "/about", name: "About", kind: "ai", brief: "About." } as never;
  const ai = () => {
    const calls: string[] = [];
    return { calls, AI: { run: async (m: string) => (calls.push(m), { choices: [{ message: { content: "@@@ MAIN\n<main><h1>DS</h1></main>" }, finish_reason: "stop" }], usage: { neurons: 900 } }) } };
  };
  it("counts what each page used, and writes the page with Claude once the free amount (pictures included) is used", async () => {
    const w = ai();
    await designSitePage({ ...base, AI: w.AI } as never, studioKit, about, {});
    expect(w.calls).toHaveLength(1);
    expect(spent).toEqual([900]);
    // 70 pictures (about 5,460 neurons) and 3,500 neurons of pages: no room for another page.
    used.pics = 70;
    used.text = 3_500;
    replies.push("@@@ MAIN\n<main><h1>From Sonnet</h1></main>");
    const r = await designSitePage({ ...base, AI: w.AI } as never, studioKit, about, {});
    expect(w.calls).toHaveLength(1);
    expect(r.page.body).toContain("From Sonnet");
    // A lower ceiling can be set.
    used.pics = 0;
    used.text = 0;
    replies.push("@@@ MAIN\n<main><h1>From Sonnet</h1></main>");
    await designSitePage({ ...base, AI: w.AI, CF_FREE_NEURONS: "1000" } as never, studioKit, about, {});
    expect(w.calls).toHaveLength(1);
  });
});

describe("the first screen's revision", () => {
  it("goes as edits after its browser check, at low effort", async () => {
    const studioKit = { ...kit, style: "studio" } as unknown as Kit;
    const hero = { title: "Home", description: "", css: "", body: "<main><section><h1>Big words</h1></section></main>" };
    replies.push("@@@ EDITS\n<<<<<<< FIND MAIN\n<h1>Big words</h1>\n=======\n<h1>Bigger words</h1>\n>>>>>>> REPLACE");
    const r = await designSitePage(env, studioKit, spec, { heroOnly: true, notes: ["Headline bigger"], current: hero });
    expect(r.page.body).toContain("Bigger words");
    expect((requests[0]!.output_config as { effort: string }).effort).toBe("low");
    expect(requests[0]!.model).toBe("claude-opus-5-5");
  });
});
