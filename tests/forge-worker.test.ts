import { describe, expect, it } from "vitest";
import { PAGES, parseParts, type Kit } from "../cloudflare/forge/src/designer";
import { assemble, chatWidget, DEFAULT_WIDGET_ID, widgetId } from "../cloudflare/forge/src/site";

describe("Forge worker — multi-page sites", () => {
  it("splits a reply into its parts", () => {
    const p = parseParts("@@@ THEME\ndark\n@@@ CSS\n```css\n.a{color:red}\n```\n@@@ MAIN\n<main><h1>Hi</h1></main>\n");
    expect(p).toEqual({ THEME: "dark", CSS: ".a{color:red}", MAIN: "<main><h1>Hi</h1></main>" });
  });

  it("links every page from the brief", () => {
    expect(PAGES[0].path).toBe("/");
    expect(new Set(PAGES.map((p) => p.path)).size).toBe(PAGES.length);
  });

  it("assembles a page with the saved theme applied before paint", () => {
    const kit: Kit = { theme: "dark", accent: "#e3a92b", fonts: "", css: ".x{}", header: "<header></header>", footer: "<footer></footer>", script: "1", brief: "" };
    const html = assemble(kit, { title: "A & B", description: "d", css: ".y{}", body: "<main></main>" }, "acme-1a2b");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain("<title>A &amp; B</title>");
    expect(html).toContain('"fg-theme-acme-1a2b"');
    expect(html).toContain(".x{}\n.y{}");
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
