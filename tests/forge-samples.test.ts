import { describe, expect, it } from "vitest";
import { carryDetails, ownDetails, personalise, sampleById, swapsFor, wantLink } from "../cloudflare/forge/src/samples";

describe("sample gallery", () => {
  const towing = sampleById("towing")!;
  const source = { businessName: "Figueroa’s Towing", phone: "(407) 555-2233", address: "12 Main St, Conway, FL 32812", city: "Conway, FL" };
  const page = `<h1>Figueroa’s Towing</h1><p>Call Figueroa’s crew at <a href="tel:+14075552233">(407) 555-2233</a>. FIGUEROA’S TOWING · 12 Main St, Conway, FL 32812</p><a href="/examples/towing/services">x</a>`;

  it("swaps the name, short names, phone and street address for the sample's", () => {
    const out = personalise(page, swapsFor(towing, source, null));
    expect(out).not.toMatch(/Figueroa|FIGUEROA|555-2233|5552233|12 Main/);
    expect(out).toContain("Coastline Towing");
    expect(out).toContain('href="tel:+14075550163"');
    expect(out).toContain("(407) 555-0163");
    expect(out).toContain("Conway, FL");
  });

  it("shows the visitor's own business, and keeps it on the links", () => {
    const own = ownDetails(new URL("https://x/examples/towing?name=Joe%27s%20Tow%20%3Cb%3E&phone=(305)%20444-1212"))!;
    expect(own).toEqual({ name: "Joe's Tow b", phone: "3054441212" });
    const out = carryDetails(personalise(page, swapsFor(towing, source, own)), "/examples/towing", own);
    expect(out).toContain("<h1>Joe's Tow b</h1>");
    expect(out).toContain('href="tel:+13054441212"');
    expect(out).toContain('href="/examples/towing/services?name=Joe');
    expect(out).not.toMatch(/Coastline|Figueroa/);
  });
});

describe("gallery leads", () => {
  it("'Want this for real?' opens the free-preview form with the business and the sample filled in", () => {
    const u = new URL(wantLink("https://app.test/", sampleById("towing")!, { name: "Joe's Tow", phone: "3054441212" }));
    expect(u.origin + u.pathname).toBe("https://app.test/preview");
    expect(u.searchParams.get("company")).toBe("Joe's Tow");
    expect(u.searchParams.get("phone")).toBe("3054441212");
    expect(u.searchParams.get("tier")).toBe("studio");
    expect(u.searchParams.get("message")).toContain("towing sample (Studio)");
    expect(new URL(wantLink("https://app.test", null, null)).searchParams.get("message")).toContain("sample gallery");
  });
});
