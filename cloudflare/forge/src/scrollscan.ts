// The scroll check that runs after every build, in the worker's own browser (Browser Rendering): the
// same look as qa/sitecheck.mjs (keep the two in step), on the home page at desktop and phone width.
// It scrolls the page the way a person does, so pinned scenes and scrubbed motion play, and looks at
// each screen: words over words, darkened blocks, words off a phone screen, empty screens; then
// placeholder wording, NaN, 555 numbers, broken or tracker images, empty call links and a blinking header.
import type { BrowserPage } from "./review";

/** Run at each stop: what is wrong on this screen (also records how full the screen is). */
export const STOP_JS = `(() => {{
  const iss = [], vh = innerHeight, vw = innerWidth;
  const op = (e) => { let o = 1; for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); o *= +cs.opacity; if (cs.visibility === "hidden" || cs.display === "none") return 0; } return o; };
  const pinned = (e) => { for (let x = e; x; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === "fixed" || p === "sticky") return true; } return false; };
  const moving = (e) => e.closest('[aria-hidden=true],.sr-only,.visually-hidden,marquee,[class*=marquee i],[class*=ticker i],[class*=track i],[class*=scroller i],[class*=carousel i],[class*=slider i],[class*=lane i]');
  // A tilted card (rotate) has rows whose boxes overlap though the words don't.
  const tilted = (e) => { for (let x = e, k = 0; x && k < 8; x = x.parentElement, k++) { const m = getComputedStyle(x).transform.match(/^matrix\\(([^)]+)\\)/); if (m && Math.abs(parseFloat(m[1].split(",")[1])) > 0.005) return true; } return false; };
  // Words on top of words (a floating or pinned bar passing over text is fine).
  const T = [...document.querySelectorAll("main h1,main h2,main h3,main p,main li,main blockquote,footer p,footer a,footer h2,footer h3")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 8 && r.top > 70 && r.bottom < vh - 10 && (e.innerText || "").trim().length > 2 && !moving(e) && op(e) > 0.6 && !pinned(e) && !tilted(e); });
  const leaf = T.filter((e) => !T.some((o) => o !== e && e.contains(o)));
  for (let a = 0; a < leaf.length; a++) for (let b = a + 1; b < leaf.length; b++) {
    const A = leaf[a].getBoundingClientRect(), B = leaf[b].getBoundingClientRect();
    const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (ox > 8 && oy > 8 && ox * oy > 0.25 * Math.min(A.width * A.height, B.width * B.height)) {
      // Only when the lower words actually show through or get cut (a card sliding fully over another is fine).
      // Both words are painted there, with nothing opaque between them (a card hidden under the next section is fine).
      const stack = document.elementsFromPoint(Math.max(A.left, B.left) + ox / 2, Math.max(A.top, B.top) + oy / 2);
      const ia = stack.findIndex((x) => leaf[a].contains(x)), ib = stack.findIndex((x) => leaf[b].contains(x));
      const solid = (x) => { const c = getComputedStyle(x); const al = c.backgroundColor.match(/[\\d.]+/g); return c.backgroundImage !== "none" || (al && (al.length < 4 || +al[3] > 0.85) && c.backgroundColor !== "rgba(0, 0, 0, 0)"); };
      const between = ia >= 0 && ib >= 0 && stack.slice(Math.min(ia, ib) + 1, Math.max(ia, ib)).some((x) => !leaf[a].contains(x) && !leaf[b].contains(x) && solid(x));
      if (ia >= 0 && ib >= 0 && !between) iss.push(\`text over text: "\${leaf[a].innerText.trim().slice(0, 30)}" / "\${leaf[b].innerText.trim().slice(0, 30)}"\`);
    }
  }
  // A big part of the screen darkened by a filter (the stacked-card black flash).
  for (const e of document.querySelectorAll("main *")) {
    const f = getComputedStyle(e).filter; const m = f.match(/brightness\\(([\\d.]+)/);
    if (!m || +m[1] >= 0.4) continue;
    const r = e.getBoundingClientRect();
    if (r.width * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) > vw * vh * 0.25) { iss.push(\`darkened block (brightness \${(+m[1]).toFixed(2)}): \${(e.className + "").slice(0, 40)}\`); break; }
  }
  // Phones: words past the screen's edge (swipe rows excluded).
  if (vw < 500) for (const e of document.querySelectorAll("main h1,main h2,main h3,main p,main a,main button")) {
    const r = e.getBoundingClientRect();
    if (r.height > 0 && r.top > 0 && r.top < vh && op(e) > 0.6 && (r.right > vw + 4 || r.left < -4) && !moving(e) && !pinned(e)) { iss.push(\`off the phone screen: \${(e.innerText || "").trim().slice(0, 30)}\`); break; }
  }
  if (document.documentElement.scrollWidth > vw + 2) iss.push("page scrolls sideways");
  // How much of the screen shows something (words, a picture, a painted background): sampled on a grid.
  let n = 0, t = 0;
  // Pictures that pointer sampling can't reach (a background video under a layer with pointer-events: none).
  const media = [...document.querySelectorAll("img,video,canvas,picture,iframe")].filter((m) => op(m) > 0.3).map((m) => m.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < vh);
  for (let x = 20; x < vw; x += 60) for (let y = 90; y < vh; y += 60) {
    if (media.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) { t++; n++; continue; }
    t++;
    // Looking through see-through layers (a tint over a photo is still a photo on screen).
    const stack = document.elementsFromPoint(x, y).slice(0, 8);
    const e = stack[0];
    if (!e) continue;
    // The footer is content (sparse link columns on plain paper are not an empty screen).
    if (e.closest("footer") || [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) || stack.some((s) => /^(IMG|VIDEO|CANVAS|svg|path|PICTURE|IFRAME)$/i.test(s.tagName) || getComputedStyle(s).backgroundImage !== "none")) n++;
  }
  window.__fill = (window.__fill || []).concat(Math.round((100 * n) / t));
  return iss;
}})()`;

/** Run once at the bottom: what is wrong on the page as a whole. */
export const END_JS = `(() => {{
  const iss = [], t = document.body.innerText;
  const credits = (t.match(/Made with .{0,20}(Mianro|Mainro)/gi) || []).length;
  if (credits !== 1) iss.push(\`\${credits} "Made with" credits\`);
  const P = /(photos?|pictures?|images?)\\b[^.!?\\n]{0,60}\\b(appears?|go|goes|added)\\b[^.!?\\n]{0,20}\\bhere|photos? coming soon|\\b(your|real) (own )?(photos?|pictures?) (here|go here)|\\badd your (own )?(photos?|pictures?)|lorem ipsum|\\[(your|business|insert)[^\\]]*\\]|\\{\\{|\\bTODO\\b|\\bundefined\\b|\\(XXX\\)|example\\.com/;
  const m = t.match(new RegExp(P.source, "i"));
  if (m) iss.push(\`placeholder wording: "\${m[0].slice(0, 50)}"\`);
  if (/\\bNaN\\b/.test(t)) iss.push('"NaN" on the page');
  if (/\\b555-01\\d\\d\\b/.test(t)) iss.push("made-up 555 phone number");
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 40);
  if (broken.length) iss.push(\`\${broken.length} broken image(s): \${(broken[0].getAttribute("src") || "").slice(-50)}\`);
  if ([...document.images].some((i) => /\\.php(\\?|$)|bping/.test(i.src))) iss.push("ad-tracker image");
  if ([...document.querySelectorAll('a[href^="tel:"]')].some((a) => a.getAttribute("href").replace(/\\D/g, "").length < 10)) iss.push("call link with no number");
  const hd = window.__hd || []; let fast = 0;
  for (let i = 1; i < hd.length; i++) if (hd[i] - hd[i - 1] < 400) fast++;
  if (fast > 2) iss.push(\`header blinks (\${fast} quick changes)\`);
  // Screens of nothing while scrolling (a pinned story with gaps, an empty band).
  const f = (window.__fill || []).slice(0, -1);
  let run = 0, worst = 0;
  for (const v of f) { run = v < 8 ? run + 1 : 0; worst = Math.max(worst, run); }
  if (f.some((v) => v < 5)) iss.push(\`an empty screen while scrolling (\${Math.min(...f)}% filled)\`);
  else if (worst >= 4) iss.push(\`\${worst} screens in a row that are mostly empty\`);
  return iss;
}})()`;

const SETUP_JS = `(() => { window.__fill = []; window.__hd = []; const hd = document.querySelector("header"); if (hd) new MutationObserver(() => window.__hd.push(performance.now())).observe(hd, { attributes: true, attributeFilter: ["class"] }); return 1; })()`;
const STEP_JS = `(async () => { for (let s = 0; s < 7; s++) { window.scrollBy(0, 100); await new Promise((r) => setTimeout(r, 25)); } return 1; })()`;

const list = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);

/** Scroll the open page from top to bottom and return what was found (each finding once). */
export async function scrollScan(page: BrowserPage, sleep: (ms: number) => Promise<void>, settle = 450): Promise<string[]> {
  await page.evaluate("window.scrollTo(0, 0)");
  await page.evaluate(SETUP_JS);
  const H = Number(await page.evaluate<number>("document.documentElement.scrollHeight")) || 0;
  const found = new Set<string>();
  for (let y = 0, k = 0; y < H + 900 && k < 30; y += 700, k++) {
    await page.evaluate(STEP_JS);
    await sleep(settle);
    const first = list(await page.evaluate<string[]>(STOP_JS));
    if (!first.length) continue;
    // Look again a moment later: a finding mid-animation (words passing as they move in) is not one.
    await sleep(settle * 2);
    const again = new Set(list(await page.evaluate<string[]>(STOP_JS)));
    for (const m of first) if (again.has(m) || !/^text over text|^darkened/.test(m)) found.add(m);
  }
  if (H) for (const m of list(await page.evaluate<string[]>(END_JS))) found.add(m);
  await page.evaluate("window.scrollTo(0, 0)");
  return [...found];
}

/** Findings a rewrite of the home page can fix (the credit line and the header come from the kit). */
export const pageFixable = (m: string) => !/"Made with" credits|header blinks|ad-tracker|page did not load|scrolls sideways/.test(m);

/** A finding as a note for the page writer. */
export function scanNote(m: string): string {
  if (m.startsWith("text over text")) return `Two pieces of text sit on top of each other while scrolling (${m.slice(16)}): give each its own space (in a pinned scene only one beat shows at a time; push the lower block down) so words never cover other words.`;
  if (m.startsWith("darkened block")) return `A large block goes dark while scrolling (${m}): don't dim stacked cards or panels with a brightness filter.`;
  if (m.startsWith("off the phone screen")) return `On a phone some words run past the screen's edge (${m.slice(22)}): let them wrap and keep 20px from each edge.`;
  if (/empty screen|mostly empty/.test(m)) return `While scrolling, the page shows a screen with almost nothing on it (${m}): shorten the tall or pinned section that causes it, or fill it with its picture and words.`;
  if (m.startsWith("placeholder wording")) return `The page has placeholder wording (${m.slice(21)}): remove it or replace it with real content.`;
  if (m.includes("555")) return "The page shows a made-up 555 phone number: use the business's real number or leave it out.";
  return `${m}: fix this.`;
}
