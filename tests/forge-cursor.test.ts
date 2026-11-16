// Every Studio look has its own pointer, not one cursor shared by every site.
import { describe, expect, it } from "vitest";
import { assemble, samplesNotPlaceholders } from "../cloudflare/forge/src/site";
import { MOTION_CSS } from "../cloudflare/forge/src/motion";
import { CONCEPT_IDS } from "../cloudflare/forge/src/concepts";

const kit = (concept?: string) => ({ theme: "dark", accent: "#aa3333", fonts: "", css: "", header: "<header></header>", footer: "<footer></footer>", script: "", components: "", brief: "", pages: [], style: "studio", concept }) as never;
const page = { title: "Home", description: "d", css: "", body: "<main><h1>Hi</h1></main>" };

describe("the pointer", () => {
  it("is named after the site's look, and every look but the default has its own styles", () => {
    expect(assemble(kit("swiss"), page, "s")).toContain('data-m-cursor="swiss"');
    expect(assemble(kit(), page, "s")).not.toContain('data-m-cursor="');
    expect(assemble(kit('x" onload="y'), page, "s")).not.toContain('onload="y');
    for (const id of CONCEPT_IDS.filter((c) => c !== "kinetic")) expect(MOTION_CSS).toContain(`[data-m-cursor=${id}] .m-cursor{`);
  });
  it("keeps the colour-field slider within the screen on phones", () => {
    expect(MOTION_CSS).toMatch(/@media \(max-width:899px\)\{\s*\.m-sl\{height:auto!important/);
    expect(MOTION_CSS).toContain(".m-sl [data-slide]:not(.on){display:none!important}");
  });
  it("calls sample reviews and photos samples, not placeholders, without touching form fields or styles", () => {
    const html = '<p>Placeholders for now.</p><span>SAMPLE REVIEW · Placeholder text, not a real customer</span><small>each one is a placeholder</small><input placeholder="Your name"><style>input::placeholder{color:red}</style><p>PLACEHOLDER</p>';
    expect(samplesNotPlaceholders(html)).toBe('<p>Samples for now.</p><span>SAMPLE REVIEW · Sample text, not a real customer</span><small>each one is a sample</small><input placeholder="Your name"><style>input::placeholder{color:red}</style><p>SAMPLE</p>');
    expect(assemble(kit("swiss"), { ...page, body: "<main><h1>Hi</h1><p>Placeholder voices</p></main>" }, "s")).toContain("<p>Sample voices</p>");
  });
});
