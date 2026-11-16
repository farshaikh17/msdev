// Every Studio look has its own pointer, not one cursor shared by every site.
import { describe, expect, it } from "vitest";
import { assemble } from "../cloudflare/forge/src/site";
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
});
