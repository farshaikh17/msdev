// Every Studio look has its own pointer, not one cursor shared by every site.
import { describe, expect, it } from "vitest";
import { assemble, dropEmptyCalls, oneCredit, samplesNotPlaceholders } from "../cloudflare/forge/src/site";
import { MOTION_CSS } from "../cloudflare/forge/src/motion";
import { QA_CSS, QA_JS } from "../cloudflare/forge/src/qa";
import { FACTS } from "../cloudflare/forge/src/review";
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
  it("ships the phone and header safety nets with every page, and the review measures phone fit", () => {
    // A see-through header that can't be read gets a solid background (always, past the first screen, on a phone).
    expect(QA_JS).toContain('hd.classList.add("fg-solid")');
    expect(QA_JS).toContain("innerWidth<900&&scrollY>innerHeight*0.6");
    expect(QA_CSS).toContain("header.fg-solid{");
    // Text touching the edge gets room; a heading too wide is set smaller.
    expect(QA_JS).toContain('e.style.paddingLeft=');
    expect(QA_JS).toContain("fs*=0.92");
    expect(QA_JS).toContain("an ad tracker, not a photo");
    expect(QA_JS).toContain("measured with their padding inside");
    expect(QA_JS).toContain("pulled over their neighbours");
    expect(QA_JS).toContain("Words must be readable on the colour actually behind them");
    expect(QA_JS).toContain("dark lettering over a dark area");
    // The page script still parses.
    expect(() => new Function(QA_JS)).not.toThrow();
    expect(FACTS).toContain("cramped:");
    // The particles brand moment is shown still on phones.
    expect(MOTION_CSS).toContain(".m-parts-off::before{content:attr(data-word)");
  });
  it("keeps the credit on one line, the copyright year current, and stacks squeezed grid rows on phones", () => {
    const html = assemble({ ...(kit("swiss") as object), footer: "<footer><p>© 2025 Gables Inn.</p><!--mianro-credit--></footer>" } as never, page, "s");
    expect(html).toContain(`© ${new Date().getUTCFullYear()} Gables Inn.`);
    expect(html).toContain(".mianro-heart{display:inline!important");
    expect(QA_JS).toContain('n.style.gridTemplateColumns="minmax(0,1fr)"');
    expect(QA_JS).toContain('a[href^="tel:"]');
    expect(() => new Function(QA_JS)).not.toThrow();
  });
  it("keeps a phone header's menu button on screen when the name or tagline is long", () => {
    expect(QA_JS).toContain("Phones: a header whose name or tagline is too long");
    expect(QA_JS).toContain('brand.style.textOverflow="ellipsis"');
    expect(() => new Function(QA_JS)).not.toThrow();
  });
  it("collapses a phone layout whose side-by-side columns run off the screen or crush their words", () => {
    expect(QA_JS).toContain("Phones: a grid of side-by-side columns");
    expect(QA_JS).toContain("words>40&&r.width<W*0.45");
    expect(() => new Function(QA_JS)).not.toThrow();
  });
  it("keeps the main headline inside the screen and clear of panels, and the motion engine keeps a block's own centring", () => {
    expect(QA_JS).toContain("Any screen: the main headline's words never run past the edge");
    expect(QA_JS).toContain('e.style.visibility="hidden"');
    expect(() => new Function(QA_JS)).not.toThrow();
  });
  it("never lets a header's name spill over the menu, and the still brand word fits a phone", () => {
    expect(QA_JS).toContain('brand.style.minWidth="max-content"');
    expect(MOTION_CSS).toContain(".m-parts-off{display:block!important");
    expect(MOTION_CSS).toContain("calc(170vw / var(--m-len,6))");
    expect(MOTION_CSS).toContain(".m-bob{animation:m-bob");
    expect(() => new Function(QA_JS)).not.toThrow();
  });
  it("takes call links with no number out of the page, and keeps real ones", () => {
    expect(dropEmptyCalls('<p>Hi <a class="b" href="tel:+1">Call the desk</a> <a href="tel:">x</a></p>')).toBe("<p>Hi  </p>");
    const real = '<a href="tel:+13056675657">Call</a>';
    expect(dropEmptyCalls(real)).toBe(real);
  });
  it("keeps one credit line when a design wrote its own", () => {
    const ours = '<span class="mianro-credit">Made with <span class="mianro-heart" role="img" aria-label="love">♥</span> by <a href="https://www.mianrosystems.com/">Mianro Systems</a></span>';
    const footer = `<footer><div class="fb"><span>© 2026 Bright Path.</span> <span>Made with <span class="heart" aria-label="love">♥</span> by Mianro Systems</span></div><p>${ours}</p></footer>`;
    const out = oneCredit(footer, ours);
    expect(out.split("Mianro Systems").length - 1).toBe(1);
    expect(out).toContain(`<span>${ours}</span></div>`);
    // A footer with only ours is left alone.
    const plain = `<footer>${ours}</footer>`;
    expect(oneCredit(plain, ours)).toBe(plain);
  });
  it("ships the before/after slider, the duplicate-CTA and footer-column fixes, and a header check that never flickers", () => {
    expect(QA_JS).toContain("Before/after pairs shown as two separate pictures become one drag slider");
    expect(QA_CSS).toContain(".fg-ba{position:relative");
    expect(QA_JS).toContain("the footer's copy is hidden");
    expect(QA_JS).toContain("Desktop footers: a column that collides");
    expect(QA_JS).toContain("only changes the class");
    expect(QA_JS).not.toContain('if(hd.classList.contains("fg-solid")){hd.classList.remove("fg-solid")}');
    expect(() => new Function(QA_JS)).not.toThrow();
  });
});
