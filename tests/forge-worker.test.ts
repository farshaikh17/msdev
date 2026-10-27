import { describe, expect, it } from "vitest";
import { Intake } from "@/forge/schema";
import { costOf, CREDIT_MARKER, mapEmbed, parseParts, sitemapFor, tidyCss, type Kit } from "../cloudflare/forge/src/designer";
import { privacyPage, termsPage } from "../cloudflare/forge/src/legal";
import { assemble, chatWidget, DEFAULT_WIDGET_ID, formScript, widgetId } from "../cloudflare/forge/src/site";

describe("Forge worker — multi-page sites", () => {
  it("splits a reply into its parts", () => {
    const p = parseParts("@@@ THEME\ndark\n@@@ CSS\n```css\n.a{color:red}\n```\n@@@ MAIN\n<main><h1>Hi</h1></main>\n");
    expect(p).toEqual({ THEME: "dark", CSS: ".a{color:red}", MAIN: "<main><h1>Hi</h1></main>" });
  });

  it("plans at least 15 pages, with service pages and both legal pages (design SOP)", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Acme Plumbing", industry: "Plumbing", services: "Drain cleaning, Water heaters" }));
    expect(pages.length).toBeGreaterThanOrEqual(15);
    expect(pages[0].path).toBe("/");
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
    const services = pages.filter((p) => p.path.startsWith("/services/"));
    expect(services.length).toBeGreaterThanOrEqual(4);
    expect(services.map((p) => p.path)).toContain("/services/drain-cleaning");
    expect(pages.filter((p) => p.kind === "legal").map((p) => p.path)).toEqual(["/privacy", "/terms"]);
  });

  it("caps service pages at six", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Acme", services: "A1, B2, C3, D4, E5, F6, G7, H8" }));
    expect(pages.filter((p) => p.path.startsWith("/services/")).length).toBe(6);
  });

  it("maps the real service area", () => {
    expect(mapEmbed(Intake.parse({ businessName: "Acme", city: "Kettering, OH" }))).toBe("https://maps.google.com/maps?q=Kettering%2C%20OH&z=10&output=embed");
    expect(mapEmbed(Intake.parse({ businessName: "Acme" }))).toBe("");
  });

  it("writes legal pages marked for the business's review", () => {
    const i = Intake.parse({ businessName: "Acme & Sons", phone: "(937) 604-4830" });
    for (const p of [privacyPage(i), termsPage(i)]) {
      expect(p.body).toContain("Acme &amp; Sons");
      expect(p.body).toContain("Draft for review");
      expect(p.body).toContain('href="tel:+19376044830"');
      expect(p.body.match(/<h1>/g)?.length).toBe(1);
    }
  });

  it("assembles a page with the saved theme applied before paint", () => {
    const kit: Kit = { theme: "dark", accent: "#e3a92b", fonts: "", css: ".x{}", header: "<header></header>", footer: `<footer>${CREDIT_MARKER}</footer>`, script: "1", brief: "" };
    const html = assemble(kit, { title: "A & B", description: "d", css: ".y{}", body: "<main></main>" }, "acme-1a2b");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain("<title>A &amp; B</title>");
    expect(html).toContain('"fg-theme-acme-1a2b"');
    expect(html).toContain(".x{}\n.y{}");
  });

  it("puts the linked Mianro credit with a red heart in the footer", () => {
    const kit: Kit = { theme: "light", accent: "", fonts: "", css: "", header: "", footer: `<footer>${CREDIT_MARKER}</footer>`, script: "", brief: "" };
    const html = assemble(kit, { title: "t", description: "d", css: "", body: "<main></main>" }, "acme-1a2b");
    expect(html).toContain('<a class="mianro-credit" href="https://www.mianrosystems.com/" target="_blank" rel="noopener">Made with <span class="mianro-heart" aria-label="love">♥</span> by Mianro systems</a>');
    expect(html).toContain(".mianro-heart{color:#e11d48!important}");
    expect(html).not.toContain(CREDIT_MARKER);
  });

  it("sends forms to the demo's lead inbox", () => {
    const s = formScript("/acme-1a2b/_lead");
    expect(s).toContain('fetch("/acme-1a2b/_lead"');
    expect(s).toContain("stopImmediatePropagation");
  });
});

describe("Forge worker — page CSS", () => {
  it("drops repeated rules and stops at a whole rule under the cap", () => {
    const rule = "@media (max-width:360px){.a{color:red}}";
    expect(tidyCss(`.x{a:b}\n${rule}\n${rule}\n.y{c:d}`)).toBe(`.x{a:b}\n${rule}\n.y{c:d}`);
    const long = Array.from({ length: 2000 }, (_, n) => `.r${n}{color:red}`).join("\n");
    const out = tidyCss(long, 1000);
    expect(out.length).toBeLessThanOrEqual(1000);
    expect(out.endsWith("}")).toBe(true);
  });
});

describe("Forge worker — build cost", () => {
  it("prices a call by model, including cached input", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(24);
    expect(costOf("claude-haiku-5-5", { input_tokens: 2_000, cache_read_input_tokens: 20_000, output_tokens: 10_000 })).toBeCloseTo(0.0054);
    expect(costOf("some-other-model", { output_tokens: 1000 })).toBe(0);
  });
});

describe("Forge worker — chat widget", () => {
  it("reads a widget ID, embed code, off, or falls back", () => {
    expect(widgetId("", DEFAULT_WIDGET_ID)).toBe(DEFAULT_WIDGET_ID);
    expect(widgetId("off", DEFAULT_WIDGET_ID)).toBe("");
    expect(widgetId('<script src="x" data-widget-id="abc123def456abc1"></script>', "")).toBe("abc123def456abc1");
    expect(widgetId("abc123def456abc1", "")).toBe("abc123def456abc1");
    expect(widgetId("not a widget", "")).toBe("");
  });

  it("recolours the widget to the site's accent", () => {
    const w = chatWidget(DEFAULT_WIDGET_ID, "#11968a");
    expect(w).toContain("--chat-widget-primary-color:#11968a!important");
    expect(w).toContain(`data-widget-id="${DEFAULT_WIDGET_ID}"`);
    expect(chatWidget(DEFAULT_WIDGET_ID, "red")).not.toContain("<style>");
    expect(chatWidget("", "#11968a")).toBe("");
  });
});
