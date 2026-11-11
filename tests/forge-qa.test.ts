/**
 * Mianro's QA standards (cloudflare/forge/src/qa.ts): each rule the QA team blocks a site for is
 * found by the lint, and the repairs that need no judgement are applied to every page.
 */
import { describe, expect, it } from "vitest";
import { lintSite, qaFixHtml, QA_JS, QA_RULES, repairNote, type QaRule } from "../cloudflare/forge/src/qa";
import { assemble } from "../cloudflare/forge/src/site";
import type { Kit, PageSpec } from "../cloudflare/forge/src/designer";

const specs: PageSpec[] = [
  { path: "/", name: "Home", brief: "", kind: "ai" },
  { path: "/services", name: "Services", brief: "", kind: "ai" },
  { path: "/contact", name: "Contact", brief: "", kind: "ai" },
  { path: "/privacy", name: "Privacy Policy", brief: "", kind: "legal" },
  { path: "/terms", name: "Terms and Conditions", brief: "", kind: "legal" },
];
const kit = (over: Partial<Kit> = {}): Kit => ({
  theme: "light",
  accent: "#aa3333",
  fonts: "",
  css: "",
  header: '<header><a class="logo" href="/">Acme</a><nav><a href="/services">Services</a><a href="/contact">Contact</a></nav><a href="tel:+13055550100">Call</a></header>',
  footer: '<footer><a href="/">Acme</a><a href="/services">Services</a><a href="/privacy">Privacy Policy</a><a href="/terms">Terms</a><!--mianro-credit--></footer>',
  script: "",
  brief: "",
  pages: specs,
  ...over,
});
const page = (title: string, body: string) => ({ title, description: "d", css: "", body });
const good = [
  { path: "/", page: page("Acme | Plumbing in Miami", '<main><h1>Acme Plumbing</h1><h2 id="work">Our work</h2><a class="btn" href="#work">See our work</a><a href="/services">Services</a><form></form></main>') },
  { path: "/services", page: page("Services | Acme", "<main><h1>Services</h1><h2>Drains</h2></main>") },
  { path: "/contact", page: page("Contact | Acme", "<main><h1>Contact</h1><form></form></main>") },
  { path: "/privacy", page: page("Privacy Policy | Acme", "<main><h1>Privacy Policy</h1></main>") },
  { path: "/terms", page: page("Terms | Acme", "<main><h1>Terms and Conditions</h1></main>") },
];
const rules = (k: Kit, pages = good) => lintSite(k, specs, pages, { phone: "(305) 555-0100" }).map((i) => `${i.path}:${i.rule}`);
const withHome = (body: string) => [{ path: "/", page: page("Acme | Plumbing in Miami", body) }, ...good.slice(1)];

describe("the QA lint", () => {
  it("passes a site that meets every standard", () => {
    expect(lintSite(kit(), specs, good, { phone: "(305) 555-0100" })).toEqual([]);
  });

  it("the logo must link home, in the header and in the footer", () => {
    expect(rules(kit({ header: '<header><span class="logo">Acme</span><a href="/services">Services</a></header>' }))).toContain("site:logo");
    expect(rules(kit({ footer: '<footer><img src="logo.png" alt="Acme"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer>' }))).toContain("site:logo");
  });

  it("the footer must link to Privacy Policy and Terms", () => {
    const found = lintSite(kit({ footer: '<footer><a href="/">Acme</a><a href="/privacy">Privacy</a></footer>' }), specs, good);
    expect(found.map((i) => i.rule)).toEqual(["legal"]);
    expect(found[0]!.what).toContain("/terms");
  });

  it("footer links must go to real pages", () => {
    const k = kit({ footer: '<footer><a href="/">Acme</a><a href="/areas/miami">Miami</a><a href="#">Careers</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer>' });
    expect(rules(k).filter((r) => r === "site:footer-links")).toHaveLength(2);
  });

  it("social icons need a real profile address: not the home page, not '#', not the bare platform", () => {
    const social = (href: string) => rules(kit({ footer: `<footer><a href="/">Acme</a><a href="${href}" aria-label="Facebook"><svg></svg></a><a href="/privacy">P</a><a href="/terms">T</a></footer>` }));
    expect(social("/")).toContain("site:social");
    expect(social("#")).toContain("site:social");
    expect(social("https://facebook.com/")).toContain("site:social");
    expect(social("https://www.facebook.com/acmeplumbing")).not.toContain("site:social");
  });

  it("no link to a page that isn't there, and no button to a section that isn't there", () => {
    expect(rules(kit(), withHome('<main><h1>Acme</h1><a href="/pricing">Pricing</a><form></form></main>'))).toContain("/:dead-link");
    expect(rules(kit(), withHome('<main><h1>Acme</h1><a class="btn" href="#collections">Explore the collections</a><form></form></main>'))).toContain("/:dead-anchor");
    // An anchor whose section exists, an outside link and a phone link are all fine.
    expect(rules(kit(), withHome('<main><h1>Acme</h1><section id="collections"></section><a href="#collections">Explore</a><a href="https://maps.google.com/x">Map</a><a href="tel:+13055550100">Call</a><form></form></main>'))).toEqual([]);
  });

  it("buttons must do something", () => {
    expect(rules(kit(), withHome('<main><h1>Acme</h1><a class="btn btn-primary">Call Us Directly</a><form></form></main>'))).toContain("/:button");
    expect(rules(kit(), withHome('<main><h1>Acme</h1><a class="btn" href="#">Book online</a><form></form></main>'))).toContain("/:button");
  });

  it("no heading twice, no empty heading, exactly one main heading", () => {
    expect(rules(kit(), withHome("<main><h1>Acme</h1><h2>Care, chosen around your companion.</h2><h2>Care, chosen around <em>your</em> companion.</h2><form></form></main>"))).toContain("/:heading-twice");
    expect(rules(kit(), withHome("<main><h1>Acme</h1><h2> </h2><form></form></main>"))).toContain("/:heading-empty");
    expect(rules(kit(), withHome("<main><h1>Acme</h1><h1>Plumbing</h1><form></form></main>"))).toContain("/:h1");
    expect(rules(kit(), withHome("<main><h2>Acme</h2><form></form></main>"))).toContain("/:h1");
  });

  it("every page has its own title, the home and contact pages have a form, and the phone is tap-to-call", () => {
    const pages = [good[0]!, { path: "/services", page: page("Acme | Plumbing in Miami", "<main><h1>Services</h1></main>") }, { path: "/contact", page: page("Contact | Acme", "<main><h1>Contact</h1></main>") }, ...good.slice(3)];
    expect(rules(kit(), pages)).toEqual(["/contact:form", "/services:title"]);
    expect(rules(kit({ header: '<header><a href="/">Acme</a></header>' }))).toEqual(["/:phone"]);
  });

  it("every rule has a plain-language name, and the repair note lists each fault", () => {
    const found = lintSite(kit({ header: "<header><span>Acme</span></header>" }), specs, withHome('<main><h1>Acme</h1><a href="/nope">x</a><form></form></main>'), { phone: "1" });
    for (const i of found) expect(QA_RULES[i.rule as QaRule]).toBeTruthy();
    const note = repairNote(found);
    for (const i of found) expect(note).toContain(i.what);
  });
});

describe("repairs that need no judgement", () => {
  it("phone links get the +1 country code", () => {
    const fix = (h: string) => qaFixHtml(`<a href="${h}">Call</a><footer></footer>`, { hasPrivacy: true, hasTerms: true });
    expect(fix("tel:3054503073")).toContain('href="tel:+13054503073"');
    expect(fix("tel:(305) 450-3073")).toContain('href="tel:+13054503073"');
    expect(fix("tel:13054503073")).toContain('href="tel:+13054503073"');
    expect(fix("tel:+13054503073")).toContain('href="tel:+13054503073"');
    expect(fix("tel:+442071234567")).toContain('href="tel:+442071234567"');
  });

  it("a footer without legal links gets them, and one that has them is left alone", () => {
    const bare = assemble(kit({ footer: '<footer><a href="/">Acme</a></footer>' }), good[0]!.page, "acme-1a2b");
    expect(bare).toMatch(/<a href="\/privacy">Privacy Policy<\/a>[\s\S]*<a href="\/terms">Terms and Conditions<\/a><\/p><\/footer>/);
    const full = assemble(kit(), good[0]!.page, "acme-1a2b");
    expect(full).not.toContain("fg-legal\"");
  });

  it("every page carries the guard script: clickable logo, no dead social icons, pictures that open", () => {
    const html = assemble(kit(), good[0]!.page, "acme-1a2b");
    expect(html).toContain(QA_JS);
    expect(QA_JS).toContain("fg-zoom");
    expect(() => new Function(QA_JS)).not.toThrow();
  });
});
