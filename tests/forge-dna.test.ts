import { describe, expect, it } from "vitest";
import { dnaBrief, dnaTokens, fontFamilies, pickDna, recolor, recolorHtml, refont, sourceHues, tasteTrades, type Recent } from "../cloudflare/forge/src/dna";
import { holdKitToDna, holdPageToDna, systemFor, type Kit } from "../cloudflare/forge/src/designer";

describe("design DNA", () => {
  it("deals a run of sites different palettes, type, accents and never three dark sites in a row", () => {
    const recent: Recent[] = [];
    const looks = ["cinematic", "cinematic", "organic", "cinematic", "swiss", "cinematic", "cinematic", "editorial", "cinematic", "kinetic"];
    const dealt = looks.map((look, i) => {
      const d = pickDna(look, `site-${i}-a1b2`, recent);
      recent.unshift({ print: d.print, accent: dnaTokens(d).light.accent!, theme: d.mode });
      return d;
    });
    for (let i = 1; i < dealt.length; i++) {
      expect(dealt[i]!.palette, `site ${i}`).not.toBe(dealt[i - 1]!.palette);
      expect(dealt[i]!.font, `site ${i}`).not.toBe(dealt[i - 1]!.font);
    }
    // Accent hues of neighbours are at least 40 degrees apart (the amber-everywhere problem).
    const hue = (d: (typeof dealt)[number]) => d.hues.a[0];
    for (let i = 1; i < dealt.length; i++) {
      const gap = Math.abs(hue(dealt[i]!) - hue(dealt[i - 1]!)) % 360;
      expect(Math.min(gap, 360 - gap), `site ${i}`).toBeGreaterThanOrEqual(40);
    }
    for (let i = 2; i < dealt.length; i++) expect([dealt[i]!.mode, dealt[i - 1]!.mode, dealt[i - 2]!.mode], `sites ${i - 2}-${i}`).not.toEqual(["dark", "dark", "dark"]);
    expect(new Set(dealt.map((d) => d.palette)).size).toBeGreaterThanOrEqual(8);
  });

  it("leads with the business's own colour", () => {
    const d = pickDna("editorial", "bakery-1", [], "#1e7a3c");
    expect(Math.abs(d.hues.a[0] - 145)).toBeLessThan(15);
  });

  it("gives Standard sites a first-screen layout that changes from site to site", () => {
    const recent: Recent[] = [];
    const heroes = [0, 1, 2, 3].map((i) => {
      const d = pickDna("organic", `std-${i}`, recent, "", true);
      recent.unshift({ print: d.print, accent: "", theme: d.mode });
      return d.hero;
    });
    expect(new Set(heroes).size).toBe(4);
    expect(dnaBrief(pickDna("organic", "std-9", [], "", true))).toContain("First screen layout");
  });

  it("moves colours onto the DNA's hues at their own lightness, and leaves text alone", () => {
    const d = pickDna("swiss", "x", []);
    const css = ":root{--bg:#f5efe6;--ink:#0b1114;--accent:#c98a3e;--glow:rgba(201,138,62,.4);--line:#ffffff1a}.b{color:#fff;background:#000}";
    const out = recolor(css, d, sourceHues(css));
    expect(out).not.toContain("#c98a3e");
    expect(out).toContain("rgba(");
    expect(out).toMatch(/--line:#[0-9a-f]{6}1a/);
    // White stays white and black stays black.
    expect(out).toContain("color:#ffffff");
    expect(out).toContain("background:#000000");
    expect(recolorHtml('<p>Suite #200, call #1</p><svg><path fill="#c98a3e"/></svg>', d, [33])).toContain("Suite #200, call #1");
    expect(recolorHtml('<path fill="#c98a3e"/>', d, [33])).not.toContain("#c98a3e");
  });

  it("swaps the writer's fonts for the DNA's pair: body text to the text face, headings to the display face", () => {
    const links = '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400..700&family=Inter:wght@400;600&display=swap" rel="stylesheet">';
    expect(fontFamilies(links)).toEqual(["Oswald", "Inter"]);
    const css = 'body{font-family:"Inter",sans-serif}h1,h2{font-family:Oswald,sans-serif}.x{font-family:"Inter Tight"}';
    const out = refont(css, links, { display: "Fraunces", text: "Figtree" });
    expect(out).toContain('body{font-family:"Figtree",sans-serif}');
    expect(out).toContain('h1,h2{font-family:"Fraunces",sans-serif}');
    expect(out).toContain('"Inter Tight"');
  });

  it("holds a kit and its pages to the DNA", () => {
    const d = pickDna("cinematic", "plumbers", []);
    const kit = { theme: "dark", accent: "#c98a3e", fonts: '<link href="https://fonts.googleapis.com/css2?family=Oswald&family=Inter&display=swap" rel="stylesheet">', css: ':root{--accent:#c98a3e;--bg:#0b1114}h1{font-family:Oswald}body{font-family:Inter}', header: '<header style="background:#0b1114">The Plumbers</header>', footer: "<footer></footer>", script: "", brief: "" } as Kit;
    const held = holdKitToDna(kit, d);
    expect(held.fonts).toBe(d.fonts);
    expect(held.theme).toBe(d.mode);
    expect(held.css).not.toContain("#c98a3e");
    expect(held.css).toContain(`"${d.display}"`);
    expect(held.header).not.toContain("#0b1114");
    const page = holdPageToDna(held, { title: "t", description: "", css: ".cta{background:#c98a3e;font-family:Oswald}", body: '<a style="color:#c98a3e">Suite #200</a>' });
    expect(page.css).not.toContain("#c98a3e");
    expect(page.css).toContain(`"${d.display}"`);
    expect(page.body).toContain("Suite #200");
  });

  it("deals tasteskill's curated palettes made for the trade, exactly, light for Standard, never violet", () => {
    expect(tasteTrades("Bakery Madruga Bakery Breads")).toContain("bakery");
    expect(tasteTrades("Towing Figueroa's Towing")).toContain("workshop");
    expect(tasteTrades("Baseball park Álex Rodríguez Park")).toContain("studio");
    const recent: Recent[] = [];
    for (let i = 0; i < 8; i++) {
      const d = pickDna("editorial", `bakery-${i}`, recent, "", true, ["bakery", "cafe"]);
      recent.unshift({ print: d.print, accent: dnaTokens(d).light.accent!, theme: d.mode });
      expect(d.mode, d.palette).toBe("light");
      const a = dnaTokens(d).light.accent!;
      expect(a).toMatch(/^#[0-9a-f]{6}$/);
      expect(d.fonts).toMatch(/family=[A-Z][\w+]*:wght@\d{3}/);
      if (d.palette.startsWith("t-")) {
        expect(d.exact).toBeTruthy();
        expect(dnaTokens(d).light.bg).toBe(d.exact!.bg);
        expect(dnaBrief(d)).toContain(d.exact!.accent);
      }
    }
    // Most of a bakery's palettes come from the curated library.
    expect(recent.filter((r) => r.print.startsWith("t-")).length).toBeGreaterThanOrEqual(5);
  });
});

describe("Standard edition", () => {
  it("picks a first screen that suits the kind of business", () => {
    const placeIds = ["place-band", "letterbox", "split", "subject-stage", "triptych"];
    const serviceIds = ["split", "subject-stage", "calm-side", "oversized", "triptych"];
    for (let i = 0; i < 12; i++) {
      expect(placeIds).toContain(pickDna("standard", `cafe-${i}`, [], "", true, ["cafe"]).hero);
      expect(serviceIds).toContain(pickDna("standard", `plumb-${i}`, [], "", true, ["workshop"]).hero);
    }
  });

  it("gives Standard builds the taste rules and drops the overlay hero rule", () => {
    const s = systemFor("standard");
    expect(s).toContain("## Standard edition");
    expect(s).toContain("first-screen layout in this site's design DNA");
    expect(s).not.toContain("then a gradient overlay layer");
    expect(systemFor("studio")).not.toContain("## Standard edition");
  });
});
