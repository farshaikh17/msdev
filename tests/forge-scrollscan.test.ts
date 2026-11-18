import { describe, expect, it } from "vitest";
import { END_JS, pageFixable, scanNote, scrollScan, STOP_JS } from "../cloudflare/forge/src/scrollscan";

describe("scroll check in the worker", () => {
  it("scrolls the page in steps and gathers each finding once", async () => {
    const seen: string[] = [];
    const page = {
      evaluate: async (js: string) => {
        seen.push(js);
        if (js === "document.documentElement.scrollHeight") return 2000;
        if (js === STOP_JS) return ["text over text: \"a\" / \"b\""];
        if (js === END_JS) return ["made-up 555 phone number", '2 "Made with" credits'];
        return 1;
      },
    };
    const found = await scrollScan(page as never, async () => undefined);
    expect(found).toEqual(['text over text: "a" / "b"', "made-up 555 phone number", '2 "Made with" credits']);
    expect(seen.filter((s) => s === STOP_JS).length).toBe(10); // each flagged screen is looked at twice
    expect(found.filter(pageFixable)).toHaveLength(2);
    expect(scanNote(found[0]!)).toMatch(/never cover other words/);
  });
});
