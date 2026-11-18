import { describe, expect, it } from "vitest";
import { Intake } from "@/forge/schema";
import { pageRequest, siblingItems, sitemapFor, type Kit } from "../cloudflare/forge/src/designer";
import type { Env } from "../cloudflare/forge/src/env";

describe("service pages from one template", () => {
  it("lists a contractor's and a restaurant's item pages in order", () => {
    const plumb = sitemapFor(Intake.parse({ businessName: "Acme Plumbing", industry: "Plumbing", services: "Drain cleaning, Water heaters, Leak repair" }));
    expect(siblingItems(plumb).map((p) => p.path)).toEqual(plumb.filter((p) => p.path.startsWith("/services/")).map((p) => p.path));
    const grill = sitemapFor(Intake.parse({ businessName: "Joe's Grill", industry: "Restaurant" }), ["Burgers", "Steaks", "Drinks"]);
    expect(siblingItems(grill).every((p) => p.role === "item")).toBe(true);
    expect(siblingItems(grill).length).toBeGreaterThan(1);
  });

  it("asks for the twin page's own copy with the template's layout, at low effort", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Acme Plumbing", industry: "Plumbing", services: "Drain cleaning, Water heaters" }));
    const [first, second] = siblingItems(pages);
    const kit = { style: "standard", css: "", header: "", footer: "", script: "", components: "", fonts: "", theme: "light", accent: "#225588", brief: "", pages } as unknown as Kit;
    const r = pageRequest({} as Env, kit, second!, { sibling: { title: "t", description: "d", css: ".x{}", body: `<main><h1>${first!.name}</h1></main>` } }, false);
    expect(r.task).toContain("this page is its twin");
    expect(r.task).toContain(`<h1>${first!.name}</h1>`);
    expect(r.effort).toBe("low");
  });
});
