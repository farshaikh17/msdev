/** Leftovers never reach a live page: find-and-replace edit markers, instruction-like sample review quotes and notes to the owner. */
import { describe, expect, it } from "vitest";
import { applyEdits } from "../cloudflare/forge/src/designer";
import { qaFixHtml, sampleQuotes } from "../cloudflare/forge/src/qa";

const page = { path: "/", title: "Home", description: "", css: ".a{color:red}", body: "<main><p>Hello there</p></main>" } as Parameters<typeof applyEdits>[0];

describe("edit markers", () => {
  it("refuses an edit that leaves a marker line in the page", () => {
    expect(() => applyEdits(page, [{ in: "MAIN", find: "<p>Hello there</p>", replace: "<p>Hi</p>\n=======\n<p>Hi again</p>" }])).toThrow(/markers/);
  });
  it("applies a clean edit", () => {
    expect(applyEdits(page, [{ in: "MAIN", find: "<p>Hello there</p>", replace: "<p>Hi</p>" }]).body).toContain("<p>Hi</p>");
  });
  it("removes marker lines from a served page but keeps ordinary text", () => {
    const html = "<main>\n<p>One</p>\n=======\n<p>Two == three</p>\n>>>>>>> REPLACE\n</main>";
    const out = qaFixHtml(html, { hasPrivacy: true, hasTerms: true });
    expect(out).not.toMatch(/^=======$/m);
    expect(out).not.toContain(">>>>>>> REPLACE");
    expect(out).toContain("<p>Two == three</p>");
  });
});

describe("sample review quotes", () => {
  it("replaces instruction-like sample quotes and keeps the label", () => {
    const html = `<blockquote><p>Sample review text appears here once your real reviews are connected.</p></blockquote><figcaption>Sample review</figcaption><blockquote>“Sample review text: the kind of line a regular leaves.”</blockquote>`;
    const out = sampleQuotes(html);
    expect(out).not.toMatch(/Sample review text/);
    expect(out).toContain("Sample review</figcaption>");
    expect(out).toMatch(/“[A-Z][^”]+”/);
  });
  it("drops notes to the owner", () => {
    const out = sampleQuotes("<p>We keep it simple. The specific ways we keep that promise belong here, in the owner's own words. We would rather leave the space open than fill it with guesses.</p>");
    expect(out).not.toMatch(/owner's own words/);
  });
  it("replaces placeholder lines a visitor would see", () => {
    const out = sampleQuotes("<p>Hours coming soon</p><p>Service area map — add your city to show it here</p><blockquote>Sample text: great food.</blockquote>");
    expect(out).toContain("Call for today's hours");
    expect(out).not.toMatch(/add your city|Sample text/);
    expect(out).toContain("great food.");
  });
});
