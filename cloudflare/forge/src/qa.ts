/**
 * Mianro's website QA standards, as the QA team applies them (taken from the notes that get a site
 * blocked in the Design Team Website Tracker), turned into three things:
 *
 *  - guards that run on every page and make the commonest faults impossible (a logo that isn't a
 *    link, social icons that go nowhere, pictures that don't open, a phone link without +1);
 *  - a lint over every page of a finished site, with no browser and no AI, that finds the rest
 *    (dead links and anchors, missing legal links, repeated or empty headings, shared titles);
 *  - the wording of the repair each finding needs, for the page writer.
 */
import type { Kit, PageDraft, PageSpec } from "./designer";

export interface QaIssue {
  /** The page it's on, or "site" for the header and footer every page shares. */
  path: string;
  /** Which standard it breaks (stable id, shown grouped in the app). */
  rule: QaRule;
  what: string;
}

export type QaRule = "pictures" | "logo" | "footer-links" | "legal" | "dead-link" | "dead-anchor" | "button" | "social" | "heading-twice" | "heading-empty" | "h1" | "title" | "form" | "phone";

export const QA_RULES: Record<QaRule, string> = {
  pictures: "Every picture frame holds a picture (no empty photo boxes)",
  logo: "Logo links to the home page (header and footer)",
  "footer-links": "Every footer link goes to the right page",
  legal: "Privacy Policy and Terms are in the footer and open",
  "dead-link": "No link goes to a page that doesn't exist",
  "dead-anchor": "No button or link points at a section that isn't there",
  button: "Every button does something",
  social: "No social icon without a real profile to go to",
  "heading-twice": "No heading appears twice on a page",
  "heading-empty": "No empty headings",
  h1: "One main heading per page",
  title: "Every page has its own title",
  form: "The home and contact pages have a working form",
  phone: "The phone number is a tap-to-call link with +1",
};

export interface QaResult {
  at: string;
  /** What's still wrong after the repairs (empty: the site meets the standards). */
  issues: QaIssue[];
  /** How many findings the first pass had, and which pages were written again to fix them. */
  found: number;
  repaired: string[];
  costUsd: number;
}

const text = (html: string) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"))?.slice(2).find((v) => v !== undefined);

interface Link {
  href: string | undefined;
  label: string;
  tag: string;
}

/** Every <a> in a piece of HTML, with its href and what it says (text, aria-label or title). */
function links(html: string): Link[] {
  const out: Link[] = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const tag = m[1] ?? "";
    out.push({ href: attr(` ${tag}`, "href"), label: (text(m[2] ?? "") || attr(` ${tag}`, "aria-label") || attr(` ${tag}`, "title") || "").slice(0, 60), tag });
  }
  return out;
}

/** The wording of an empty photo box ("Your photos appear here", "Space for your photos", "Photo coming soon"). */
export const EMPTY_PHOTO = /(photos?|pictures?|images?)\b[^.!?<]{0,60}\b(appears?|go|goes|added)\b[^.!?<]{0,20}\bhere|space for (your|real|the)\b[^.!?<]{0,20}(photos?|pictures?)|(photos?|pictures?) coming soon|\b(your|real) (own |real )?(photos?|pictures?|images?) (here|go here)\b|\badd your (own )?(photos?|pictures?)\b/i;

const SOCIAL = /\b(facebook|instagram|twitter|linkedin|pinterest|tiktok|youtube|yelp|whatsapp|snapchat|threads)\b|^(x|fb|ig|social( link)?)$/i;
const isSocial = (l: Link) => SOCIAL.test(l.label) || SOCIAL.test(l.tag) || /(facebook|instagram|twitter|x|linkedin|pinterest|tiktok|youtube)\.com/i.test(l.href ?? "");
const external = (href: string) => /^(https?:)?\/\//i.test(href);
const special = (href: string) => /^(tel:|mailto:|sms:)/i.test(href);

/** The site's QA lint: every page, the shared header and footer, no browser needed. */
export function lintSite(kit: Kit, specs: PageSpec[], pages: { path: string; page: PageDraft }[], opts: { phone?: string } = {}): QaIssue[] {
  const issues: QaIssue[] = [];
  const add = (path: string, rule: QaRule, what: string) => {
    if (!issues.some((i) => i.path === path && i.rule === rule && i.what === what)) issues.push({ path, rule, what });
  };
  const paths = new Set(specs.map((p) => p.path));
  const chrome = `${kit.header}\n${kit.footer}`;
  const idsIn = (html: string) => new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]!));
  const chromeIds = idsIn(chrome);

  const checkLinks = (where: string, html: string, ids: Set<string>, kind: "footer-links" | "dead-link") => {
    for (const l of links(html)) {
      const name = l.label ? `"${l.label}"` : "an unlabelled link";
      if (l.href === undefined) {
        if (/\b(btn|button|cta)\b/i.test(l.tag)) add(where, "button", `The button ${name} has no link, so it does nothing.`);
        continue;
      }
      const href = l.href.trim();
      if (isSocial(l) && !(external(href) && !/^(https?:)?\/\/(www\.)?(facebook|instagram|twitter|x|linkedin|pinterest|tiktok|youtube)\.com\/?$/i.test(href))) {
        add(where, "social", `The social link ${name} has no real profile address. Remove it (and its icon).`);
        continue;
      }
      if (href === "" || href === "#" || /^javascript:/i.test(href)) {
        add(where, kind === "footer-links" ? "footer-links" : "button", `${name} goes nowhere (href "${href}").`);
        continue;
      }
      if (external(href) || special(href)) continue;
      const [path, hash] = href.split("#") as [string, string | undefined];
      if (path && path.startsWith("/")) {
        const clean = path.replace(/\/+$/, "") || "/";
        if (!paths.has(clean.split("?")[0]!)) add(where, kind, `${name} links to ${clean}, which isn't a page of this site.`);
      } else if (!path && hash && !ids.has(hash) && !chromeIds.has(hash)) {
        add(where, "dead-anchor", `${name} points to #${hash}, but nothing on the page has that id.`);
      }
    }
  };

  // The header and footer every page shares.
  const headerLinks = links(kit.header);
  if (!headerLinks.some((l) => l.href === "/" && !isSocial(l))) add("site", "logo", "The header logo or name isn't a link to the home page (/).");
  const footerLinks = links(kit.footer);
  if (!footerLinks.some((l) => l.href === "/" && !isSocial(l))) add("site", "logo", "The footer logo or name isn't a link to the home page (/).");
  for (const [path, name] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms and Conditions"],
  ] as const)
    if (paths.has(path) && !footerLinks.some((l) => l.href === path)) add("site", "legal", `The footer has no link to the ${name} page (${path}).`);
  checkLinks("site", kit.header, chromeIds, "dead-link");
  checkLinks("site", kit.footer, chromeIds, "footer-links");

  // Each page.
  const titles = new Map<string, string[]>();
  for (const { path, page } of pages) {
    const spec = specs.find((s) => s.path === path);
    if (!spec) continue;
    const ids = idsIn(page.body);
    checkLinks(path, page.body, ids, "dead-link");
    const empty = (page.body.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").match(new RegExp(EMPTY_PHOTO.source, "gi")) ?? []).length;
    if (empty) add(path, "pictures", `The page has ${empty} empty photo box${empty === 1 ? "" : "es"} ("photos appear here" placeholders). Put one of the site's photos (listed in the business facts) in each, as an <img> with object-fit: cover and a descriptive alt, using different photos or crops; remove the placeholder icon and wording. An empty before/after area with no pair of pictures is removed entirely.`);
    // A made-up "555" phone number (unless it is the number the business was entered with).
    const fake = page.body.match(/\(?\b\d{3}\)?[\s.-]*555[\s.-]*01\d\d\b/);
    if (fake && !(opts.phone ?? "").includes("555")) add(path, "phone", `The page shows a made-up phone number (${fake[0]}). Use the business's real number from the facts everywhere, or leave the number out.`);
    const heads = [...page.body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2] ?? "") }));
    const h1 = heads.filter((h) => h.level === 1).length;
    if (h1 !== 1) add(path, "h1", `The page has ${h1} main headings (h1); it needs exactly one.`);
    const seen = new Map<string, number>();
    for (const h of heads) {
      if (!h.text) {
        add(path, "heading-empty", "There is an empty heading on the page.");
        continue;
      }
      const key = h.text.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, n] of seen) if (n > 1 && key.length > 3) add(path, "heading-twice", `The heading "${heads.find((h) => h.text.toLowerCase() === key)!.text.slice(0, 70)}" appears ${n} times.`);
    if (spec.kind === "ai") {
      const t = page.title.trim().toLowerCase();
      titles.set(t, [...(titles.get(t) ?? []), path]);
      const needsForm = path === "/" || path === "/contact" || spec.role === "cta" || path === "/quote";
      if (needsForm && !/<form\b/i.test(page.body)) add(path, "form", "The page has no form.");
      if (path === "/" && opts.phone && !/href\s*=\s*["']tel:/i.test(`${page.body}${chrome}`)) add(path, "phone", "The phone number isn't a tap-to-call link anywhere on the home page.");
    }
  }
  for (const [title, where] of titles) if (where.length > 1) for (const p of where.slice(1)) add(p, "title", `The page title "${title.slice(0, 60)}" is also used on ${where[0]}. Give this page its own.`);
  return issues;
}

/** What the page writer is told to fix on one page (or on the shared header and footer). */
export function repairNote(issues: QaIssue[]): string {
  return `Our QA team's standards found these faults. Fix every one and change nothing else:\n${issues.map((i) => `- ${i.what}`).join("\n")}\nRules: a link to a page that doesn't exist goes to the nearest real page from the site's page list, or is removed; a button or link to a missing section gets that section's real id, or links to the right page instead; a social icon without a real profile address is removed together with its icon; a repeated heading is reworded or one copy is removed; the logo or business name in the header and in the footer is a link to "/".`;
}

const tel = (digits: string) => (digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : digits);

/**
 * Repairs that need no judgement, applied to every page as it is put together: phone links carry
 * the country code, and the footer always has working Privacy Policy and Terms links.
 */
/** Sample review quotes a writer left as instructions ("Sample review text appears here once your reviews are connected"). */
const SAMPLE_QUOTE = /([“"]?)Sample review text\b[^<“”"]*([”"]?)/g;
const SAMPLE_LINES = [
  "Easy to deal with from the first call, and everything was exactly as they said it would be.",
  "Friendly, quick and straight with us about what we needed. We'll be back.",
  "Clear answers, fair treatment and no surprises. Exactly what we hoped for.",
  "They took the time to explain everything and it showed in the result.",
];
/** Notes to the owner left in the copy ("…belong here, in the owner's own words…"). */
/** Placeholder lines written for the owner, and what a visitor sees instead. */
const PLACEHOLDERS: [RegExp, string][] = [
  [/Hours coming soon\.?/g, "Call for today's hours"],
  [/Service area map\s*[—–-]\s*add your city to show it here\.?/g, "Call us to check we cover your address."],
  [/Sample text:\s*/g, ""],
];
const OWNER_NOTE = /[^<>.]*\bbelong here, in the owner's own words\.[^<>]*?(?=<)/g;

/** Instruction-like sample reviews become short, plain sample quotes (still under their "Sample review" label); notes to the owner go. */
export function sampleQuotes(html: string): string {
  let k = 0;
  const out = html.replace(SAMPLE_QUOTE, (_m, open: string, close: string) => `${open}${SAMPLE_LINES[k++ % SAMPLE_LINES.length]}${close}`).replace(OWNER_NOTE, "We would rather show you than tell you: come in, ask anything, and judge us by how the visit feels.");
  // A box holding only a short heading and nothing under it (a "Phone" block with no number given) goes.
  const bare = out.replace(/<div([^>]*)>\s*<h([2-4])[^>]*>[^<]{1,40}<\/h\2>\s*<\/div>/g, (m, attrs: string) => (/data-|id=/.test(attrs) ? m : ""));
  return PLACEHOLDERS.reduce((h, [re, to]) => h.replace(re, to), bare);
}

export function qaFixHtml(html: string, footer: { hasPrivacy: boolean; hasTerms: boolean }): string {
  // Lines left by a mangled find-and-replace edit ("=======" showing as text on the page) go.
  let out = sampleQuotes(html).replace(/^[ \t]*(?:={7}|<{7} (?:FIND|SEARCH)[^\n]*|>{7} REPLACE[^\n]*)[ \t]*$\n?/gm, "").replace(/href\s*=\s*(["'])tel:([^"']*)\1/gi, (m, q: string, v: string) => {
    if (v.trim().startsWith("+")) return m;
    const d = v.replace(/\D/g, "");
    return d.length === 10 || (d.length === 11 && d.startsWith("1")) ? `href=${q}tel:${tel(d)}${q}` : m;
  });
  if (!footer.hasPrivacy || !footer.hasTerms) {
    const line = `<p class="fg-legal">${footer.hasPrivacy ? "" : `<a href="/privacy">Privacy Policy</a>`}${!footer.hasPrivacy && !footer.hasTerms ? " &nbsp;|&nbsp; " : ""}${footer.hasTerms ? "" : `<a href="/terms">Terms and Conditions</a>`}</p>`;
    const at = out.toLowerCase().lastIndexOf("</footer>");
    out = at >= 0 ? `${out.slice(0, at)}${line}${out.slice(at)}` : out;
  }
  return out;
}

export const QA_CSS = `.fg-ba-box{list-style:none;margin:0 auto;padding:0;width:100%;max-width:880px}.fg-ba{position:relative;overflow:hidden;width:100%;border-radius:inherit;user-select:none;-webkit-user-select:none;touch-action:pan-y}.fg-ba>img,.fg-ba-after img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;margin:0;max-width:none}.fg-ba-after{position:absolute;inset:0}.fg-ba-line{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);pointer-events:none}.fg-ba-line span{position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.3)}.fg-ba-line span::before{content:"\\2039\\00a0\\203A";position:absolute;inset:0;display:grid;place-items:center;font:700 18px/1 system-ui,sans-serif;color:#222}.fg-ba-l,.fg-ba-r{position:absolute;top:12px;font:600 12px/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.55);padding:6px 9px;border-radius:4px;pointer-events:none}.fg-ba-l{left:12px}.fg-ba-r{right:12px}.fg-ba input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;-webkit-appearance:none;appearance:none}
header.fg-solid{background:color-mix(in srgb,var(--bg,#fff) 94%,transparent)!important;border-color:transparent!important;box-shadow:0 1px 0 rgba(0,0,0,.08)!important;transition:background-color .3s}
header.fg-solid [data-fg-ink],header.fg-solid [data-fg-ink] svg{color:var(--ink,#111)!important}header.fg-solid [data-fg-ink][class*="icon" i],header.fg-solid [data-fg-ink][class*="toggle" i]{border-color:color-mix(in srgb,var(--ink,#111) 25%,transparent)!important}
.fg-legal{text-align:center;font-size:.85rem;opacity:.85;margin:14px 0 0}.fg-legal a{color:inherit;text-decoration:underline;text-underline-offset:3px}
main img[data-fg-zoom]{cursor:zoom-in}
[hidden]{display:none!important}[data-fg-photo]::before,[data-fg-photo]::after{display:none!important}[data-fg-photo]>*{visibility:hidden!important}[data-fg-filled]{position:relative;overflow:hidden;padding:0!important}[data-fg-filled]>img{display:block;width:100%;height:100%;min-height:200px;object-fit:cover}
[data-fg-filled]>span{position:absolute;left:10px;bottom:10px;font:600 11px/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.55);padding:5px 8px;border-radius:4px}
.fg-zoom{position:fixed;inset:0;z-index:2147483640;background:rgba(8,10,14,.92);display:grid;place-items:center;padding:4vmin;cursor:zoom-out;opacity:0;transition:opacity .2s}
.fg-zoom.on{opacity:1}.fg-zoom img{max-width:100%;max-height:92vh;border-radius:8px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.fg-zoom button{position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#111;font:600 20px/1 system-ui,sans-serif;cursor:pointer}
@media (prefers-reduced-motion:reduce){.fg-zoom{transition:none}}`;

/**
 * Runs on every page. Makes the faults our QA team blocks most often impossible:
 *  - the logo or name in the header and footer always goes to the home page;
 *  - a social icon with nowhere real to go is taken off the page;
 *  - any picture in the page opens large when clicked (and closes on click, the button or Escape);
 *  - a link to a section that isn't on the page no longer does nothing: it goes to the top of the page's main content.
 */
export const QA_JS = `(function(){try{
var h=document.querySelector("header a[href]");var homeHref=h?h.getAttribute("href"):"/";
function brand(root){if(!root)return;var el=root.querySelector('[class*="logo" i],[class*="brand" i],[class*="wordmark" i]')||root.querySelector("img,svg");
if(!el||el.closest("a")||el.querySelector("a"))return;var a=document.createElement("a");a.href=homeHref;a.setAttribute("aria-label","Home");a.style.cssText="color:inherit;text-decoration:none;display:inline-block";el.parentNode.insertBefore(a,el);a.appendChild(el)}
brand(document.querySelector("body>header,header"));brand(document.querySelector("body>footer,footer"));
var S=/(facebook|instagram|twitter|linkedin|pinterest|tiktok|youtube|yelp|whatsapp|snapchat|threads)/i;
[].slice.call(document.querySelectorAll("a")).forEach(function(a){var raw=a.getAttribute("href"),label=((a.textContent||"")+" "+(a.getAttribute("aria-label")||"")+" "+(a.getAttribute("title")||"")+" "+a.className).trim();
if(!S.test(label)&&!/^(x|fb|ig)$/i.test((a.textContent||"").trim()))return;
var real=raw&&/^https?:\\/\\//i.test(raw)&&a.host!==location.host&&a.pathname.length>1;if(real){a.target="_blank";a.rel="noopener";return}
var li=a.closest("li");(li&&li.children.length===1?li:a).remove()});
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var id=a.getAttribute("href").slice(1);if(!id)return;
if(!document.getElementById(id)){e.preventDefault();var m=document.querySelector("main");if(m)m.scrollIntoView({behavior:"smooth"})}});
function zoomable(i){return i.closest("main")&&!i.closest("a,button,.hero-motion,.hero-subject,[data-perch],[data-no-zoom]")&&i.getBoundingClientRect().width>=140}
function mark(){[].slice.call(document.querySelectorAll("main img")).forEach(function(i){if(zoomable(i))i.setAttribute("data-fg-zoom","")})}
mark();addEventListener("load",mark);
document.addEventListener("click",function(e){var t=e.target,i=t;if(!t||!t.closest||t.closest("a,button,input,select,textarea,label,summary,[role=button],.fg-zoom"))return;
if(t.tagName!=="IMG"){if((t.innerText||"").trim().length>60)return;i=(document.elementsFromPoint(e.clientX,e.clientY)||[]).filter(function(x){return x.tagName==="IMG"})[0]}
if(!i||!zoomable(i))return;
var o=document.createElement("div");o.className="fg-zoom";o.setAttribute("role","dialog");o.setAttribute("aria-label","Photo");
var big=document.createElement("img");big.src=i.currentSrc||i.src;big.alt=i.alt||"";var b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Close");b.textContent="\\u00d7";
o.appendChild(big);o.appendChild(b);document.body.appendChild(o);requestAnimationFrame(function(){o.classList.add("on")});b.focus();
function close(){o.remove();document.removeEventListener("keydown",key)}function key(k){if(k.key==="Escape")close()}
o.addEventListener("click",close);document.addEventListener("keydown",key)});
}catch(x){}})();
/* Any empty photo box left on a page ("Your photos appear here") is filled with one of the site's photos, or hidden when the site has none. */
window.__fgFill=function(urls){try{urls=urls||[];window.__fgPhotos=urls;
var P=/(photos?|pictures?|images?)\\b[^.!?]{0,60}\\b(appears?|go|goes|added)\\b[^.!?]{0,20}\\bhere|space for (your|real|the)\\b[^.!?]{0,20}(photos?|pictures?)|(photos?|pictures?) coming soon|\\b(your|real) (own |real )?(photos?|pictures?|images?) (here|go here)\\b|\\badd your (own )?(photos?|pictures?)\\b/i;
var abs=function(u){try{return new URL(u,location.href).href}catch(e){return u}},used={};
[].forEach.call(document.images,function(i){used[i.currentSrc||i.src]=1});
var pool=urls.filter(function(u){return !used[abs(u)]}).concat(urls),k=0,done=[];
/* A picture copied from a parked web page is an ad tracker, not a photo: swap in a real one, or hide it. */
[].forEach.call(document.querySelectorAll("main img"),function(i){var s=i.getAttribute("src")||"";if(!/\\.php(\\?|$)|bping|\\/pixel[./?]/i.test(s))return;
if(pool.length){i.src=pool[k++%pool.length];i.removeAttribute("srcset")}else{var f=i.closest("figure,div")||i;f.style.display="none"}});
[].slice.call(document.querySelectorAll("main p,main span,main div,main figcaption,main h3,main h4,main small,main strong")).forEach(function(el){
var t=(el.textContent||"").trim();if(!t||t.length>170||!P.test(t)||/before|after|review/i.test(t))return;
var box=el;while(box.parentElement&&!/^(MAIN|SECTION|ARTICLE|BODY)$/.test(box.parentElement.tagName)&&(box.parentElement.textContent||"").trim().length<=t.length+110&&!box.parentElement.querySelector("img,video,iframe,form,a[href]"))box=box.parentElement;
if(box.querySelector("img,video")||done.indexOf(box)>=0||done.some(function(d){return d.contains(box)}))return;done.push(box);
if(!pool.length){box.style.display="none";box.setAttribute("data-fg-filled","");return}
var img=document.createElement("img");img.src=pool[k++%pool.length];img.alt="Sample photo";img.loading="lazy";img.setAttribute("data-fg-zoom","");
var tag=document.createElement("span");tag.textContent="Sample photo";
box.innerHTML="";box.setAttribute("data-fg-filled","");box.appendChild(img);box.appendChild(tag)});
/* A before-and-after section with no real pairs yet is removed: two unrelated sample photos there say nothing. */
[].forEach.call(document.querySelectorAll("main section"),function(sec){if(!sec.querySelector("[data-fg-filled]")||sec.querySelector(".fg-ba"))return;
if(!/before (and|&) after|before\\/after/i.test(sec.textContent||""))return;
if([].some.call(sec.querySelectorAll("img"),function(i){return !i.closest("[data-fg-filled]")}))return;sec.style.display="none"});

// A see-through header whose text can't be read against what is behind it (light text over a light
// section, often in the other theme) gets a solid background and the page's ink colour until it can.
(function(){var hd=document.querySelector("body>header,header");if(!hd)return;
function rgb(v){v=v||"";var o=v.indexOf("("),m=(o>=0?v.slice(o+1,v.indexOf(")",o)>o?v.indexOf(")",o):v.length):v).match(/[0-9.]+/g);if(!m||m.length<3)return null;m=m.map(Number);if(v.indexOf("color(")>=0){m[0]*=255;m[1]*=255;m[2]*=255}return m}
function lum(c){var a=[c[0],c[1],c[2]].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]}
function behind(){var r=hd.getBoundingClientRect();var y=Math.min(innerHeight-1,Math.max(0,r.bottom+6));var els=document.elementsFromPoint(innerWidth/2,y);
for(var i=0;i<els.length;i++){if(hd.contains(els[i]))continue;for(var n=els[i];n&&n!==document.documentElement;n=n.parentElement){var st=getComputedStyle(n);
if(/^(IMG|VIDEO|CANVAS|PICTURE|svg)$/i.test(n.tagName)||st.backgroundImage!=="none")return null;var c=rgb(st.backgroundColor);if(c&&(c.length<4||c[3]>0.5))return c}}
return rgb(getComputedStyle(document.body).backgroundColor)}
var fg0=null,held=0,ht=0;
// Decides from the colours as designed (measured while the header is not solid), and only changes the class
// when the answer changes, so it never flickers while scrolling.
function check(){var on=hd.classList.contains("fg-solid");
if(!on){var own=rgb(getComputedStyle(hd).backgroundColor);if(own&&(own.length===3||own[3]>0.5))return;var link=hd.querySelector("nav a,a");if(!link)return;fg0=rgb(getComputedStyle(link).color)}
if(!fg0)return;var want;
// On a phone a see-through header over the page's words is a jumble whatever the colours: past the first screen it is always solid.
if(innerWidth<900&&scrollY>innerHeight*0.6)want=true;else{var bg=behind();if(!bg)return;var a=lum(fg0),b=lum(bg);want=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)<2.5}
if(want){held=Date.now();if(!on)solid()}else if(on){if(Date.now()-held<600){clearTimeout(ht);ht=setTimeout(check,650);return}hd.classList.remove("fg-solid")}}
function solid(){
hd.querySelectorAll("a,button,summary,span,[class*=brand i],[class*=logo i]").forEach(function(el){if(el.closest(".dd-panel,[class*=panel i],[class*=dropdown i],[class*=menu-overlay i]"))return;for(var n=el;n&&n!==hd;n=n.parentElement){var c=rgb(getComputedStyle(n).backgroundColor);if(c&&!(c.length>=4&&c[3]<0.3))return}el.setAttribute("data-fg-ink","")});
hd.classList.add("fg-solid")}
var t=0;function soon(){if(t)return;t=requestAnimationFrame(function(){t=0;check()})}
addEventListener("scroll",soon,{passive:true});addEventListener("resize",soon);
new MutationObserver(soon).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme","class"]});
setTimeout(check,400);setTimeout(check,2500)})();

// Cards pulled over their neighbours with negative side margins cut off the neighbours' words: the pull is removed.
// A block that opens with a heading and sits flush against a list, form or cards above it gets room to breathe.
(function(){function fix(){
[].forEach.call(document.querySelectorAll("main *"),function(e){var cs=getComputedStyle(e);if(parseFloat(cs.marginLeft)>-8&&parseFloat(cs.marginRight)>-8)return;var par=e.parentElement;if(!par)return;var pd=getComputedStyle(par).display;if(!/grid|flex/.test(pd))return;
var r=e.getBoundingClientRect();if(!(e.innerText||"").trim())return;var hit=[].some.call(par.children,function(o){if(o===e||!(o.innerText||"").trim())return false;var q=o.getBoundingClientRect();return Math.min(r.right,q.right)-Math.max(r.left,q.left)>12&&Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top)>40});
if(hit){e.style.marginLeft="0";e.style.marginRight="0"}});
[].forEach.call(document.querySelectorAll("main h2"),function(h){var a=h;while(a.parentElement&&a.parentElement.tagName!=="SECTION"&&a.parentElement.tagName!=="MAIN"&&!a.previousElementSibling&&a.parentElement.firstElementChild===a)a=a.parentElement;
var prev=a.previousElementSibling;if(!prev||a.getAttribute("data-fg-gap"))return;var pc=getComputedStyle(prev);if(pc.position==="absolute"||pc.position==="fixed"||pc.display==="none")return;
var pr=prev.getBoundingClientRect(),ar=a.getBoundingClientRect();if(pr.height<120||!prev.querySelector("details,summary,ul,ol,form,img,article,[class*=card i],[class*=item i]"))return;
var gap=a.offsetParent&&a.offsetParent===prev.offsetParent?a.offsetTop-(prev.offsetTop+prev.offsetHeight):ar.top-pr.bottom;if(gap>-2&&gap<10){a.style.marginTop="clamp(40px,5vw,72px)";a.setAttribute("data-fg-gap","1")}})}
if(document.readyState==="complete")setTimeout(fix,300);else addEventListener("load",function(){setTimeout(fix,300)});})();

// (Big display words over a photo are judged by the over-picture guard below, from what is really behind them.)

// Words must be readable on the colour actually behind them: a heading, paragraph, link or label whose colour is
// within a whisker of its solid background (a writer setting text in the background colour, or one mode's ink
// left on the other mode's paper) takes whichever of the page's two inks reads. Text over photos and big faded
// watermark words are left as designed.
(function(){function rgb(v){v=v||"";var o=v.indexOf("("),m=(o>=0?v.slice(o+1,v.indexOf(")",o)>o?v.indexOf(")",o):v.length):v).match(/[0-9.]+/g);if(!m||m.length<3)return null;m=m.map(Number);if(v.indexOf("color(")>=0){m[0]*=255;m[1]*=255;m[2]*=255}return m}
function lum(c){var a=[c[0],c[1],c[2]].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]}
function ratio(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
function gradColor(s){var parts=[],dep=0,cur="";for(var i=0;i<s.length;i++){var ch=s[i];if(ch==="(")dep++;if(ch===")")dep--;if(ch===","&&!dep){parts.push(cur);cur=""}else cur+=ch}parts.push(cur);
// Several gradients in one background: the bottom-most one that is solid enough is the panel's colour.
for(var j=parts.length-1;j>=0;j--){if(parts[j].indexOf("gradient(")<0)continue;var cols=(parts[j].match(/(?:rgba?|color)[(][^)]*[)]/g)||[]).map(rgb).filter(Boolean);if(!cols.length)continue;var al=cols.reduce(function(t,c){return t+(c.length>3?c[3]:1)},0)/cols.length;if(al<.85)continue;
return [0,1,2].map(function(k){return Math.round(cols.reduce(function(t,c){return t+c[k]},0)/cols.length)})}return null}
// A band painted with a solid-enough gradient (a dark call-to-action band) is the colour behind its words, not the page under it.
// A card whose panel colour is drawn by a ::before/::after layer (absolutely placed, solid, covering most of the card) has
// that colour behind its words. A small one (a dot, a line, a badge) is decoration, not the panel.
function pseudoBg(n){var out=null;["::before","::after"].forEach(function(ps){if(out)return;var c=getComputedStyle(n,ps);if(!c||c.content==="none"||c.content==="normal"||!/absolute|fixed/.test(c.position)||+c.opacity<.9)return;var b=rgb(c.backgroundColor);if(b&&(b.length<4||b[3]>.85)){var q2=n.getBoundingClientRect(),pw=parseFloat(c.width),ph=parseFloat(c.height);if(q2.width>40&&q2.height>30&&pw>=q2.width*.6&&ph>=q2.height*.6)out=b}});return out}
// A background image counts as a photo only on a big box, as a raster picture drawn once (not a texture, pattern or icon).
function photoBg(n,cs){var u=(cs.backgroundImage.match(/url[(]"?([^")]+)"?[)]/)||[])[1];if(!u||/^data:image[/]svg|[.]svg([?#]|$)/i.test(u))return false;var q2=n.getBoundingClientRect();if(q2.width<120||q2.height<80)return false;return !(/repeat/.test(cs.backgroundRepeat)&&!/no-repeat/.test(cs.backgroundRepeat)&&cs.backgroundSize!=="cover")}
// What is really painted under the words where they sit on screen (a panel can be a sibling layered behind them, not a
// parent): the first solid colour under them, or null for a photo. Off screen, the boxes holding them are used instead.
function hitBg(e){var r=e.getBoundingClientRect();if(r.bottom<4||r.top>innerHeight-4||r.right<4||r.left>innerWidth-4)return undefined;
var x=Math.min(innerWidth-2,Math.max(2,r.left+Math.min(12,r.width/3))),y=Math.min(innerHeight-2,Math.max(2,r.top+r.height/2)),s=document.elementsFromPoint(x,y),i=-1;
for(var k=0;k<s.length;k++)if(s[k]===e||e.contains(s[k])){i=k;break}if(i<0)return undefined;
for(var k2=i;k2<s.length;k2++){var n=s[k2];if(n!==e&&e.contains(n))continue;var cs=getComputedStyle(n);if(n!==e&&/^(IMG|VIDEO)$/.test(n.tagName)&&+cs.opacity>.3)return null;
// A drawing under the words (an inline illustration or a canvas scene): its colours can't be read, so the words are left as
// designed. A shader canvas is only a light effect over the box's own colour, so it is looked past.
if(n!==e&&n.tagName==="CANVAS"&&n.closest("[data-shader],[class*=shader i]"))continue;
if(n!==e&&(/^(CANVAS|svg)$/i.test(n.tagName)||n.closest("svg"))&&+cs.opacity>.3){var dq=n.getBoundingClientRect();if(dq.width>160&&dq.height>100)return false}
if(photoBg(n,cs))return null;var c=rgb(cs.backgroundColor);if(c&&(c.length<4||c[3]>0.85)&&+cs.opacity>.85)return c;var pb=pseudoBg(n);if(pb)return pb;
if(/gradient/.test(cs.backgroundImage)){var gc=gradColor(cs.backgroundImage);if(gc)return gc}}return undefined}
function behind(e){var h=hitBg(e);if(h!==undefined)return h;for(var n=e;n&&n!==document.documentElement;n=n.parentElement){var cs=getComputedStyle(n);var pb=pseudoBg(n);if(pb){var own=rgb(cs.backgroundColor);if(!(own&&(own.length<4||own[3]>0.85)))return pb}if(cs.backgroundImage!=="none"&&!/gradient/.test(cs.backgroundImage))return null;if(/gradient/.test(cs.backgroundImage)&&cs.backgroundImage.indexOf("url(")<0){var gc=gradColor(cs.backgroundImage);if(gc)return gc}if(/^(IMG|VIDEO|PICTURE)$/.test(n.tagName))return null;var c=rgb(cs.backgroundColor);if(c&&(c.length<4||c[3]>0.85))return c}return rgb(getComputedStyle(document.body).backgroundColor)||[255,255,255]}
function solid(e){for(var n=e;n&&n!==document.documentElement;n=n.parentElement){var c=rgb(getComputedStyle(n).backgroundColor);if(c&&(c.length<4||c[3]>0.85))return c}return null}
function overPicture(e){var r=e.getBoundingClientRect(),sec=e.closest("section,header,footer")||document.body;return [].some.call(sec.querySelectorAll("img,video,canvas,.hero-motion"),function(m){if(e.contains(m)||m.contains(e))return false;var q=m.getBoundingClientRect();if(q.width<120||q.height<80)return false;var cs=getComputedStyle(m);if(cs.visibility==="hidden"||+cs.opacity<.1)return false;return q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top})}
// A photo painted between the words and their solid background (a hero picture under its headline): that is the
// over-picture guard's to judge, from the picture itself.
function underPicture(e){var r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return false;var st=document.createElement("style");st.textContent="main *{pointer-events:auto!important}";document.head.appendChild(st);
try{var y=r.top+r.height/2;return [r.left+Math.min(10,r.width/4),r.left+r.width/2].some(function(x){var s=document.elementsFromPoint(x,y),i=-1;for(var k=0;k<s.length;k++)if(s[k]===e||e.contains(s[k])){i=k;break}if(i<0)return false;
for(var k2=i+1;k2<s.length;k2++){var n=s[k2];if(e.contains(n))continue;if(/^(IMG|VIDEO)$/.test(n.tagName))return +getComputedStyle(n).opacity>.3;var c=rgb(getComputedStyle(n).backgroundColor);if(c&&(c.length<4||c[3]>0.85))return false;if(photoBg(n,getComputedStyle(n)))return true}return false})}finally{st.remove()}}
function run(){var st=document.createElement("style");st.textContent="main *,footer *{pointer-events:auto!important}";document.head.appendChild(st);try{look()}finally{st.remove()}}
// Each pass judges a word by the colour it was designed with (kept when first changed): undoing the change first and
// reading the colour at once would catch a colour transition mid-way and flip the fix off and on.
function clearAll(){[].forEach.call(document.querySelectorAll("[data-fg-readable]:not([data-fg-pic])"),function(e){e.style.removeProperty("color");e.style.removeProperty("-webkit-text-fill-color");e.removeAttribute("data-fg-readable");e.removeAttribute("data-fg-orig")})}
function undo(e){if(!e.hasAttribute("data-fg-readable"))return;e.style.removeProperty("color");e.style.removeProperty("-webkit-text-fill-color");e.removeAttribute("data-fg-readable");e.removeAttribute("data-fg-orig")}
function look(){
var light=[250,250,248],dark=[18,18,20];
[].forEach.call(document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main a,main button,main label,main blockquote,main figcaption,main span,footer p,footer a,footer li,footer span,footer h2,footer h3"),function(e){
if(![].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim().length>1}))return;
if(e.closest(".sr-only,.visually-hidden,[data-fg-lit],[data-fg-pic],[class*=marquee i],[class*=ticker i]"))return;
// Hidden from screen readers is skipped, except the word and line pieces of an animated heading (the heading reads them out).
var ah=e.closest("[aria-hidden=true]");if(ah&&!ah.closest("h1,h2,h3,h4,p,[data-split]"))return;
var cs=getComputedStyle(e),head=!!e.closest("h1,h2,h3");if(cs.display==="none"||(!head&&(cs.visibility==="hidden"||parseFloat(cs.opacity)<.3)))return;
var fs=parseFloat(cs.fontSize),deco=fs>180&&!e.closest("h1,h2");
var c=rgb(e.getAttribute("data-fg-orig")||(cs.webkitTextFillColor&&!/transparent|rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor)?cs.webkitTextFillColor:cs.color));if(!c||(c.length>3&&c[3]<.35))return;
var bg=behind(e);if(bg===false)return undo(e);
// The same colour as the solid background (a heading set in var(--bg)): wrong whatever else is behind it.
if(!bg){var sb=solid(e);if(!sb)return undo(e);var fz=parseFloat(cs.fontSize),big2=fz>=24||(fz>=18.6&&+cs.fontWeight>=600);if(ratio(c,sb)>=1.25&&(underPicture(e)||ratio(c,sb)>=(big2?2.2:3)))return undo(e);bg=sb}
else{if(underPicture(e))return undo(e);var fsz=parseFloat(cs.fontSize),lg=fsz>=24||(fsz>=18.6&&+cs.fontWeight>=600);if(ratio(c,bg)>=(deco?1.5:lg?2.2:3))return undo(e)}
var to=ratio(light,bg)>=ratio(dark,bg)?light:dark;var v="rgb("+to.join(",")+")";if(!e.hasAttribute("data-fg-orig"))e.setAttribute("data-fg-orig","rgb("+c.slice(0,3).map(Math.round).join(",")+")");
e.style.setProperty("color",v,"important");e.style.setProperty("-webkit-text-fill-color",v,"important");e.setAttribute("data-fg-readable","")})}
function go(){setTimeout(run,700);setTimeout(run,2600);setTimeout(run,6000)}if(document.readyState==="complete")go();else addEventListener("load",go);
new MutationObserver(function(){clearAll();setTimeout(run,60);setTimeout(function(){clearAll();run()},800)}).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
// Looked at again after scrolling: reveal animations rebuild headings (their words become new elements) as they come into view.
var st=0;addEventListener("scroll",function(){clearTimeout(st);st=setTimeout(run,700)},{passive:true})})();

// Words that stay faded or blurred once they are on screen (a reveal animation that never finished, a scroll-scrubbed
// word-by-word paragraph left half-lit where the reader stopped) are shown in full after they have sat on screen for
// a second. Slides waiting their turn, menus, marquees, decoration and anything fully hidden on purpose are left alone.
(function(){
var SEL="main h1,main h2,main h3,main h4,main p,main li,main a,main button,main span,main div,main blockquote,main figcaption,main small,main dt,main dd";
var seen=new WeakMap();
function faded(e){var o=1,b=false;for(var n=e;n&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n);o*=+cs.opacity;if(/blur[(][1-9]/.test(cs.filter))b=true;if(n.tagName==="MAIN")break}return {o:o,b:b}}
function skip(e){return !!e.closest("[class*=slide i],[class*=carousel i],[class*=swiper i],[class*=marquee i],[class*=ticker i],[class*=track i],[class*=modal i],[class*=drawer i],[class*=menu i],[class*=tooltip i],[class*=popover i],nav,.sr-only,.visually-hidden,[hidden]")}
var css=null;function rule(){if(css)return;css=document.createElement("style");css.textContent="[data-fg-shown]{opacity:1!important;filter:none!important}";document.head.appendChild(css)}
// A stylesheet rule, not an inline style: a page script scrubbing the words writes their inline opacity on every frame.
function show(e){rule();for(var n=e;n&&n.tagName!=="MAIN"&&n!==document.body;n=n.parentElement){var cs=getComputedStyle(n);if(+cs.opacity<.98||/blur/.test(cs.filter)){n.setAttribute("data-fg-shown","")}}
// Word and letter pieces of a split line are shown together.
[].forEach.call(e.querySelectorAll("*"),function(c){var cs=getComputedStyle(c);if(+cs.opacity<.98||/blur/.test(cs.filter)){c.setAttribute("data-fg-shown","")}})}
function run(){var now=Date.now(),H=innerHeight,W=innerWidth;
[].forEach.call(document.querySelectorAll(SEL),function(e){
if(![].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim().length>1}))return;
var r=e.getBoundingClientRect();if(r.width<4||r.height<4||r.bottom<12||r.top>H-12||r.right<0||r.left>W){seen.delete(e);return}
var cs=getComputedStyle(e);if(cs.visibility==="hidden"||cs.display==="none")return;
var f=faded(e);if(f.o>=.95&&!f.b){seen.delete(e);return}
// Fully invisible text is usually waiting on purpose (a slide, a hover card); only part-faded or blurred words count,
// and fully invisible pieces only when the line they belong to is showing others.
if(f.o<.05&&!f.b){var line=e.closest("h1,h2,h3,h4,p,blockquote");if(!line||line===e)return;if(faded(line).o<.05)return}
if(skip(e))return;
var t=seen.get(e);if(!t){seen.set(e,now);return}
if(now-t>=1000){show(e);seen.delete(e)}})}
var tm=0;function soon(){clearTimeout(tm);tm=setTimeout(function(){run();setTimeout(run,1100)},250)}
function go(){run();setTimeout(run,1200);setTimeout(run,2400);setTimeout(run,4000)}
if(document.readyState==="complete")go();else addEventListener("load",go);
addEventListener("scroll",soon,{passive:true})})();

// Any screen: a paragraph squeezed into a sliver (one or two words a line: a column template or fixed width the layout
// forgot to widen) gets room: the boxes holding it span their row and drop their narrow width, until it reads in lines.
(function(){function room(){var W=document.documentElement.clientWidth,min=W<700?Math.min(200,W*.5):120;
document.querySelectorAll("main p,main li,main blockquote,main dd,main div").forEach(function(e){
if(![].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim().length>1}))return;
var t=(e.textContent||"").trim();if(t.length<80)return;var r=e.getBoundingClientRect();if(!r.width||r.width>=min||r.height<60)return;
if(e.closest("[data-horizontal-track],[class*=marquee i],[class*=ticker i],[class*=track i],[class*=carousel i],[class*=slider i],[class*=swiper i],header,nav,footer,[aria-hidden=true]"))return;
for(var n=e,k=0;n&&k<5&&n.tagName!=="MAIN"&&e.getBoundingClientRect().width<min;n=n.parentElement,k++){var par=n.parentElement;if(!par)break;var pc=getComputedStyle(par),nc=getComputedStyle(n);
if(nc.display.indexOf("grid")>=0&&n!==e){n.style.gridTemplateColumns="minmax(0,1fr)";n.style.gridTemplateAreas="none";[].forEach.call(n.children,function(c){c.style.gridColumn="1 / -1";c.style.gridRow="auto"})}
if(pc.display.indexOf("grid")>=0){n.style.gridColumn="1 / -1";n.style.gridRow="auto";if(W<700){par.style.gridTemplateColumns="minmax(0,1fr)";par.style.gridTemplateAreas="none"}}
if(pc.display.indexOf("flex")>=0&&pc.flexDirection.indexOf("row")===0){par.style.flexWrap="wrap";n.style.flex="1 1 100%"}
if(n.getBoundingClientRect().width<par.getBoundingClientRect().width*.6){n.style.width="auto";n.style.maxWidth="100%";n.style.minWidth="0";if(W<700){n.style.marginLeft="0";n.style.marginRight="0"}}
n.setAttribute("data-fg-room","")}})}
function go(){setTimeout(room,800);setTimeout(room,2500)}
if(document.readyState==="complete")go();else addEventListener("load",go);addEventListener("orientationchange",function(){setTimeout(room,400)})})();

// A picture's place left empty (a big painted block or frame holding at most a short caption, where a photo belongs)
// takes one of the site's own photos, the ones this page doesn't show yet first. A diagram's caption and any tint over the
// box go (they describe the empty shape, not the photo).
// Swatches, stat cards, buttons, forms, maps, decoration and anything with real words in it are left alone.
(function(){
function rgba(v){v=v||"";var o=v.indexOf("("),m=(o>=0?v.slice(o+1,v.indexOf(")",o)>o?v.indexOf(")",o):v.length):v).match(/[0-9.]+/g);if(!m||m.length<3)return null;var k=v.indexOf("color(")>=0?255:1;return [+m[0]*k,+m[1]*k,+m[2]*k,m.length>3?+m[3]:1]}
var SKIP=/(swatch|chip|colou?r|palette|stat|count|number|badge|logo|map|chart|bar|line|divider|rule|marquee|track|ticker|blob|shape|deco|orb|glow|grain|noise|overlay|scrim|backdrop|cursor|dot|progress|skeleton)/i;
function photos(){return [].map.call(document.querySelectorAll("img"),function(i){return i.currentSrc||i.src||""}).filter(function(s){return /[/]_img[/][a-z0-9]+[/](photo|own)-[0-9]+[.]jpg/.test(s)})}
function run(){var used=photos(),list=window.__fgPhotos||[];if(!used.length&&!list.length)return;var base=(used[0]||list[0]||"").replace(/(photo|own)-[0-9]+[.]jpg.*$/,"");
var have={};used.forEach(function(s){have[s.replace(/^.*[/]/,"").replace(/[?#].*$/,"")]=1});
[].forEach.call(document.querySelectorAll("[data-fg-photo]"),function(e){var u=(e.style.backgroundImage.match(/(photo|own)-[0-9]+[.]jpg/)||[])[0];if(u)have[u]=1});
var pool=list.length?list.filter(function(u){return !have[u.replace(/^.*[/]/,"")]}):[];if(!list.length)for(var n=1;n<=8;n++)if(!have["photo-"+n+".jpg"])pool.push(base+"photo-"+n+".jpg");(list.length?list:used).forEach(function(u){if(pool.indexOf(u)<0)pool.push(u)});
var k=0;window.__fgFilled=window.__fgFilled||[];
[].forEach.call(document.querySelectorAll("main div,main figure,main li,main a"),function(e){
if(e.hasAttribute("data-fg-photo")||e.closest("[aria-hidden=true],form,nav,footer,header,[data-fg-filled],[data-fg-photo]"))return;
var r=e.getBoundingClientRect();if(r.width<220||r.height<160||r.width>innerWidth*.9)return;
if(e.querySelector("img,video,canvas,svg,picture,iframe,input,textarea,select,button,object,embed"))return;
if(SKIP.test(e.className+" "+(e.id||"")))return;
var cs=getComputedStyle(e);if(cs.backgroundImage!=="none"||+cs.opacity<.9||cs.position==="absolute"||cs.position==="fixed")return;
var words=(e.textContent||"").replace(/[ ]+/g," ").trim();if(words.length>28)return;
// Its words, if any, read as a caption (small), not a figure or a heading.
if(words&&[].some.call(e.querySelectorAll("*"),function(c){return parseFloat(getComputedStyle(c).fontSize)>17&&(c.innerText||"").trim()}))return;
var b=rgba(cs.backgroundColor),painted=(b&&b[3]>.6)||parseFloat(cs.borderTopWidth)>=1;if(!painted)return;
// The innermost such box only, and only where a sibling or parent holds words beside it (a picture's place in a layout).
if([].some.call(e.children,function(c){var q=c.getBoundingClientRect();return q.width>=220&&q.height>=160}))return;
var src=pool[k++%pool.length];if(!src)return;
e.style.setProperty("background-image",'url("'+src+'")',"important");
e.style.setProperty("background-size","cover","important");e.style.setProperty("background-position","center","important");
e.setAttribute("data-fg-photo","");window.__fgFilled.push((e.className+"").slice(0,30)+(words?" ("+words+")":""))})}
function go(){run();setTimeout(run,1500);setTimeout(run,4000)}
if(document.readyState==="complete")go();else addEventListener("load",go);
var t=0;addEventListener("scroll",function(){if(t)return;t=setTimeout(function(){t=0;run()},300)},{passive:true})})();

// Words over a photo or video read in light and dark mode alike. What is actually behind each line (the photo's own
// pixels, sampled, under every overlay and tint painted between) is measured. Words that don't stand out enough are
// fixed the gentlest way that works: the photo darkened a little (the designer's colour kept), else the words in white
// or near-black, else white words on a photo darkened enough (never below 45% of its light, or 40% counting the page's own darkening). Patterns, icons and pictures it can't read are left alone.
(function(){
// rgb(), rgba() and the newer color(srgb r g b / a) form (values 0 to 1).
function rgba(v){v=v||"";var o=v.indexOf("(");if(o>=0)v=v.slice(0,o+1)+v.slice(o+1,v.indexOf(")",o)+1>0?v.indexOf(")",o):v.length);var m=v.slice(o+1).match(/[0-9.]+/g);if(!m||m.length<3)return null;if(v.indexOf("color(")>=0){return [+m[0]*255,+m[1]*255,+m[2]*255,m.length>3?+m[3]:1]}return [+m[0],+m[1],+m[2],m.length>3?+m[3]:1]}
function lin(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
function lum(c){return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])}
function ratio(a,b){return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)}
var grids=new Map(),bgImgs={};
// A photo's light, as a small grid laid out the way it is drawn (cover, contain or stretched).
function grid(m,src,nw,nh,fit,q){var key=Math.round(q.width)+"x"+Math.round(q.height)+src;var c=grids.get(m);if(c&&c.key===key&&m.tagName!=="VIDEO")return c;
var W=64,H=Math.max(8,Math.round(64*q.height/q.width));var cv=document.createElement("canvas");cv.width=W;cv.height=H;var g=cv.getContext("2d");
try{if(fit==="fill")g.drawImage(src,0,0,W,H);else{var sc=fit==="contain"?Math.min(q.width/nw,q.height/nh):Math.max(q.width/nw,q.height/nh);var dw=nw*sc*W/q.width,dh=nh*sc*H/q.height;g.drawImage(src,(W-dw)/2,(H-dh)/2,dw,dh)}
var d=g.getImageData(0,0,W,H).data,L=new Float32Array(W*H);for(var i=0;i<W*H;i++)L[i]=lum([d[i*4],d[i*4+1],d[i*4+2]]);c={key:key,W:W,H:H,L:L};grids.set(m,c);return c}catch(err){return null}}
function photoUrl(cs){if(cs.backgroundImage.indexOf("gradient")>=0&&cs.backgroundImage.indexOf("url(")<0)return null;var u=(cs.backgroundImage.match(/url[(]"?([^")]+)"?[)]/)||[])[1];
if(!u||/^data:image[/]svg|[.]svg([?#]|$)/i.test(u)||/repeat/.test(cs.backgroundRepeat)&&!/no-repeat/.test(cs.backgroundRepeat)&&cs.backgroundSize!=="cover")return null;return u}
// The photo element under a point, if it is one (an <img> or <video> big enough, or a box with a raster photo background).
// A <canvas> is an effect layer (a shader, particles); its pixels can't be read back, so it never counts as a photo.
function isPhoto(n,cs){var q=n.getBoundingClientRect();if(q.width<120||q.height<80)return false;if(n.tagName==="CANVAS")return false;if(/^(IMG|VIDEO)$/.test(n.tagName))return !/[.]svg([?#]|$)/i.test(n.currentSrc||"");return !!photoUrl(cs)}
function lightOf(m,box){var q=m.getBoundingClientRect(),g=null;
if(/^(IMG|VIDEO|CANVAS)$/.test(m.tagName)){var nw=m.videoWidth||m.naturalWidth||m.width,nh=m.videoHeight||m.naturalHeight||m.height;if(nw&&nh)g=grid(m,m,nw,nh,m.tagName==="CANVAS"?"fill":getComputedStyle(m).objectFit,q)}
else{var cs=getComputedStyle(m),u=photoUrl(cs);if(u){var im=bgImgs[u];if(!im){im=bgImgs[u]=new Image();im.onload=function(){setTimeout(run,50)};im.src=u}
if(im.complete&&im.naturalWidth)g=grid(m,im,im.naturalWidth,im.naturalHeight,cs.backgroundSize==="contain"?"contain":"cover",q)}}
if(!g)return null;var bf=Math.pow(Math.min(1.5,baseBright(m)),2.2);var v=[];var x0=Math.floor((box.left-q.left)/q.width*g.W),x1=Math.ceil((box.right-q.left)/q.width*g.W),y0=Math.floor((box.top-q.top)/q.height*g.H),y1=Math.ceil((box.bottom-q.top)/q.height*g.H);
for(var y=Math.max(0,y0);y<Math.min(g.H,y1);y++)for(var x=Math.max(0,x0);x<Math.min(g.W,x1);x++)v.push(g.L[y*g.W+x]);
if(!v.length)return null;v.sort(function(a,b){return a-b});var lo=v[Math.floor(v.length*.3)],hi=v[Math.min(v.length-1,Math.floor(v.length*.7))];
lo*=bf;hi=Math.min(1,hi*bf);return m.tagName==="VIDEO"?[Math.max(0,lo-.08),Math.min(1,hi+.12)]:[lo,hi]}
// How bright the page draws a photo now (brightness filters on it and the boxes holding it, our own dimming included).
function baseBright(m){var b=1;for(var n=m,d=0;n&&d<6&&n!==document.body;n=n.parentElement,d++){var f=getComputedStyle(n).filter;if(!f||f==="none")continue;(f.match(/brightness[(]([0-9.]+)/g)||[]).forEach(function(s){b*=parseFloat(s.slice(11))})}
return b}
// A linear gradient's tint at a point (angle, stops, positions); null where it can't be read.
function gradAt(n,cs,x,y){var s=cs.backgroundImage;if(s.indexOf("linear-gradient(")!==0||s.indexOf("gradient(",10)>=0)return null;
var inner=s.slice(16,s.lastIndexOf(")")),parts=[],dep=0,cur="";for(var i=0;i<inner.length;i++){var ch=inner[i];if(ch==="(")dep++;if(ch===")")dep--;if(ch===","&&!dep){parts.push(cur.trim());cur=""}else cur+=ch}parts.push(cur.trim());
var ang=180,m0=parts[0].match(/^(-?[0-9.]+)deg$/),to={"to top":0,"to right":90,"to bottom":180,"to left":270};if(m0){ang=+m0[1];parts.shift()}else if(parts[0] in to){ang=to[parts.shift()]}else if(/^to /.test(parts[0]))return null;
var stops=parts.map(function(p){var c=rgba(p),pm=p.match(/[)] *([0-9.]+)%/);return {c:c,at:pm?+pm[1]/100:null}}).filter(function(o){return o.c});if(stops.length<2)return null;
stops.forEach(function(o,k){if(o.at===null)o.at=k/(stops.length-1)});
var q=n.getBoundingClientRect(),a=ang*Math.PI/180,L=Math.abs(q.width*Math.sin(a))+Math.abs(q.height*Math.cos(a));if(!L)return null;
var t=((x-q.left-q.width/2)*Math.sin(a)-(y-q.top-q.height/2)*Math.cos(a))/L+.5;
var A=stops[0],B=stops[stops.length-1];for(var k=0;k<stops.length-1;k++)if(t>=stops[k].at&&t<=stops[k+1].at){A=stops[k];B=stops[k+1];break}
var f=B.at>A.at?Math.max(0,Math.min(1,(t-A.at)/(B.at-A.at))):0,al=(A.c[3]*(1-f)+B.c[3]*f)*+cs.opacity;
return [lum(A.c)*(1-f)+lum(B.c)*f,al,al]}
// Tints drawn as ::before/::after layers (a hero's dark overlay is often one): the hit test can't see them. Those on the
// photo itself and on the boxes holding it, up to the one that also holds the words, count as tints over the photo.
function pseudoTints(m,e,x,y,layers){for(var n=m;n&&n!==document.body;n=n.parentElement){["::before","::after"].forEach(function(ps){var c=getComputedStyle(n,ps);
if(!c||c.content==="none"||c.content==="normal"||c.display==="none"||!/absolute|fixed/.test(c.position))return;var op=+c.opacity;if(op<.02)return;
var b=rgba(c.backgroundColor);if(b&&b[3]>0)layers.push([lum(b),b[3]*op,b[3]*op]);
if(c.backgroundImage.indexOf("gradient")>=0){var ga=gradAt(n,c,x,y);if(ga)layers.push(ga);else{var cols=c.backgroundImage.match(/(?:rgba?|color)[(][^)]*[)]/g)||[];if(cols.length){var ls=cols.map(rgba),al=ls.map(function(k){return k[3]*op}),mn=Math.min.apply(null,al);if(mn>0)layers.push([ls.reduce(function(s,k){return s+lum(k)},0)/ls.length,mn,mn])}}}});
if(n.contains(e))break}}
// What lies behind a point of the words: the photo's light range there and the tints over it; null for a solid colour or no photo.
function backdrop(e,x,y){var stack=document.elementsFromPoint(x,y),i=-1;for(var k=0;k<stack.length;k++)if(stack[k]===e||e.contains(stack[k])){i=k;break}if(i<0)return null;
var layers=[];for(var k=i;k<stack.length;k++){var n=stack[k];if(n!==e&&e.contains(n))continue;var cs=getComputedStyle(n);
if(n!==e&&+cs.opacity<.5&&(/^(IMG|VIDEO|CANVAS)$/.test(n.tagName)||photoUrl(cs)))continue;
if(n!==e&&isPhoto(n,cs)){pseudoTints(n,e,x,y,layers);var r=e.getBoundingClientRect(),h=Math.max(12,r.height/2),rg=lightOf(n,{left:x-h,right:x+h,top:r.top,bottom:r.bottom});return rg?{lo:rg[0],hi:rg[1],layers:layers,media:n}:{unknown:true}}
var op=+cs.opacity,b=rgba(cs.backgroundColor);if(b&&b[3]*op>=.94)return {solid:true};if(b&&b[3]>0)layers.push([lum(b),b[3]*op,b[3]*op]);
if(cs.backgroundImage!=="none"){var ga=gradAt(n,cs,x,y);if(ga)layers.push(ga);else if(cs.backgroundImage.indexOf("gradient")>=0){var cols=cs.backgroundImage.match(/(?:rgba?|color)[(][^)]*[)]/g)||[];
if(cols.length){var ls=cols.map(rgba),al=ls.map(function(c){return c[3]*op});var mn=Math.min.apply(null,al);if(mn>0)layers.push([ls.reduce(function(s,c){return s+lum(c)},0)/ls.length,mn,mn])}}
else if(cs.backgroundImage.indexOf("url(")>=0)return null}}
return null}
// The light behind the words with the photo darkened by k (a CSS brightness, so the light falls by about k^2.2).
function under(p,k){var f=Math.pow(k,2.2),lo=p.lo*f,hi=p.hi*f;for(var j=p.layers.length-1;j>=0;j--){var l=p.layers[j],vals=[lo*(1-l[1])+l[0]*l[1],lo*(1-l[2])+l[0]*l[2],hi*(1-l[1])+l[0]*l[1],hi*(1-l[2])+l[0]*l[2]];lo=Math.min.apply(null,vals);hi=Math.max.apply(null,vals)}return [lo,hi]}
function score(t,pts,k){var w=99;pts.forEach(function(p){var u=under(p,k),s=t>=u[0]&&t<=u[1]?1:Math.min(ratio(t,u[0]),ratio(t,u[1]));if(s<w)w=s});return w}
var SEL="main h1,main h2,main h3,main h4,main p,main li,main a,main button,main label,main blockquote,main figcaption,main span,main small,main strong,main em,main div,main dt,main dd";
var done=new WeakSet();window.__fgUnread=[];
function reset(){[].forEach.call(document.querySelectorAll("[data-fg-pic]"),function(e){["color","-webkit-text-fill-color","text-shadow","border-color"].forEach(function(p){e.style.removeProperty(p)});e.removeAttribute("data-fg-pic")});
[].forEach.call(document.querySelectorAll("[data-fg-dim]"),function(m){m.style.filter=m.getAttribute("data-fg-dim");["data-fg-dim","data-fg-base","data-fg-k"].forEach(function(a){m.removeAttribute(a)})});window.__fgUnread=[];done=new WeakSet()}
function dim(m,k){if(!/^(IMG|VIDEO|CANVAS)$/.test(m.tagName))return false;var cur=parseFloat(m.getAttribute("data-fg-k")||"1");if(k>=cur)return true;
if(!m.hasAttribute("data-fg-dim")){m.setAttribute("data-fg-dim",m.style.filter||"");m.setAttribute("data-fg-base",getComputedStyle(m).filter)}
var base=m.getAttribute("data-fg-base");m.style.filter=(base&&base!=="none"?base+" ":"")+"brightness("+k.toFixed(2)+")";m.setAttribute("data-fg-k",k.toFixed(2));dirty=true;return true}
var dirty=false;
// A photo darkened for one line changes what every other line over it sits on: they are all looked at again (twice at most),
// and only the first look may darken a photo, so the darkening never builds up.
var pass=0;
function run(){for(pass=0;pass<3;pass++){dirty=false;look();if(!dirty)break;done=new WeakSet();window.__fgUnread=[]}pass=0}
function look(){var pe=document.createElement("style");pe.textContent="main *{pointer-events:auto!important}";document.head.appendChild(pe);
try{[].forEach.call(document.querySelectorAll(SEL),function(e){if(done.has(e))return;
if(![].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim().length>1}))return;
if(e.closest(".sr-only,.visually-hidden,[data-fg-lit],[class*=marquee i],[class*=ticker i]"))return;
var ah=e.closest("[aria-hidden=true]");if(ah&&!ah.closest("h1,h2,h3,h4,p"))return;
var cs=getComputedStyle(e);if(cs.display==="none"||cs.visibility==="hidden"||+cs.opacity<.5)return;
// Still fading or sliding in (it or a box holding it part-transparent): judged once it has settled, on a later look.
for(var an=e,op2=1;an&&an.tagName!=="MAIN"&&an!==document.body;an=an.parentElement)op2*=+getComputedStyle(an).opacity;if(op2<.95)return;
var r=e.getBoundingClientRect();if(r.width<8||r.height<8||r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth)return;
var col=rgba(cs.webkitTextFillColor&&!/transparent|rgba[(]0, 0, 0, 0[)]/.test(cs.webkitTextFillColor)?cs.webkitTextFillColor:cs.color);if(!col||col[3]<.35)return;
var pts=[],media=null,unknown=false,solid=false,y=r.top+r.height/2;[r.left+Math.min(10,r.width/4),r.left+r.width*.3,r.left+r.width*.55,r.left+r.width*.8].forEach(function(x){var b=backdrop(e,x,y);if(!b)return;if(b.solid){solid=true;return}if(b.unknown){unknown=true;return}pts.push(b);media=b.media});
// Any part of the line on a solid surface (a label pill or card over the photo): that surface is what it reads against.
if(solid){done.add(e);return}
if(unknown&&!pts.length)return;if(!pts.length){done.add(e);return}
// A photo whose pixels aren't in yet (still loading) is looked at again later.
done.add(e);var fs=parseFloat(cs.fontSize),big=fs>=24||(fs>=18.6&&+cs.fontWeight>=600),need=big?3:4.5,t=lum(col);
if(score(t,pts,1)>=need)return;
var set=function(c,sh){e.style.setProperty("color",c,"important");e.style.setProperty("-webkit-text-fill-color",c,"important");if(sh)e.style.setProperty("text-shadow",sh,"important");
var bc=rgba(cs.borderTopColor);if(parseFloat(cs.borderTopWidth)>0&&bc&&Math.abs(lum(bc)-t)<.02)e.style.setProperty("border-color",c,"important");e.setAttribute("data-fg-pic","")};
var canDim=!pass&&/^(IMG|VIDEO|CANVAS)$/.test(media.tagName)&&!media.contains(e),ours=parseFloat(media.getAttribute("data-fg-k")||"1"),own=baseBright(media)/ours,kmin=Math.min(1,Math.max(.45,.4/Math.max(.01,own))/ours);
// 1. Light words: the photo darkened a little keeps the designer's colour.
if(canDim&&t>.18)for(var k=.95;k>=Math.max(.6,kmin)-.001;k-=.05)if(score(t,pts,k)>=need){dim(media,ours*k);e.setAttribute("data-fg-pic","");return}
// 2. White or near-black words, whichever reads as the photo is.
var W=1,D=lum([17,17,17]);if(score(W,pts,1)>=need){set("#ffffff","0 1px 3px rgba(0,0,0,.35)");return}if(score(D,pts,1)>=need){set("#111111","0 1px 3px rgba(255,255,255,.35)");return}
// 3. White words, and the photo darkened as much as it takes (never below 45% of its light, or 40% counting the page's own darkening).
set("#ffffff","0 1px 2px rgba(0,0,0,.6),0 2px 14px rgba(0,0,0,.45)");
if(canDim&&kmin<1){for(var k2=.95;k2>=kmin-.001;k2-=.05)if(score(W,pts,k2)>=need||k2<kmin+.05){dim(media,ours*k2);if(score(W,pts,k2)>=need)return;break}}
if(score(lum(rgba(getComputedStyle(e).color)||[255,255,255]),pts,1)<need*.6)window.__fgUnread.push((e.innerText||"").trim().slice(0,40))})}finally{pe.remove()}}
var tm=0;function soon(){if(tm)return;tm=setTimeout(function(){tm=0;run()},200)}
// Looked at again from scratch once the first screen has settled (a photo fading or zooming in reads lighter or darker at first).
function again(){reset();run()}
function go(){run();setTimeout(run,600);setTimeout(again,2000);setTimeout(again,5000)}
if(document.readyState==="complete")go();else addEventListener("load",go);
addEventListener("scroll",soon,{passive:true});addEventListener("resize",function(){reset();soon()});
new MutationObserver(function(){reset();setTimeout(run,30);setTimeout(again,900)}).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){reset();setTimeout(run,30)})}catch(err){}})();

// The first screen's words sit above its pictures: a headline block that runs into the photo card beside it
// (a breakout or split hero whose columns overlap) is lifted over the card, so no line is cut by it.
(function(){function run(){var h=document.querySelector("main h1");if(!h)return;var sec=h.closest("section")||h.parentElement;if(!sec)return;
var pics=[].filter.call(sec.querySelectorAll("img,video,canvas"),function(m){var q=m.getBoundingClientRect();return q.width>160&&q.height>120&&!m.closest("[aria-hidden=true]")||m.closest(".hero-motion,[class*=subject i],[class*=card i],[class*=frame i]")});
var col=h;while(col.parentElement&&col.parentElement!==sec&&!pics.some(function(m){return col.parentElement.contains(m)}))col=col.parentElement;
var r=col.getBoundingClientRect();var hit=pics.some(function(m){if(col.contains(m))return false;var q=m.getBoundingClientRect();var full=q.width>innerWidth*.85&&q.height>innerHeight*.6;return !full&&q.left<r.right-8&&q.right>r.left+8&&q.top<r.bottom-8&&q.bottom>r.top+8});
if(!hit)return;if(getComputedStyle(col).position==="static")col.style.position="relative";col.style.zIndex="40";col.setAttribute("data-fg-lifted","")}
if(document.readyState==="complete")setTimeout(run,500);else addEventListener("load",function(){setTimeout(run,500)})})();

// Phones: a box set to full width plus side padding, in a design with no border-box rule, is wider than the
// screen and pushes its words and pictures off the right edge. Such boxes are measured with their padding inside.
(function(){function fix(){if(innerWidth>=700)return;[].forEach.call(document.querySelectorAll("main *,footer *,header *"),function(e){
var cs=getComputedStyle(e);if(cs.boxSizing!=="content-box"||cs.position==="fixed"||cs.position==="absolute")return;var pl=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+parseFloat(cs.borderLeftWidth)+parseFloat(cs.borderRightWidth);if(pl<2)return;
var par=e.parentElement;if(!par)return;var w=e.getBoundingClientRect().width,pw=par.clientWidth;if(w>pw+2&&w-pl<=pw+2)e.style.boxSizing="border-box"});
// A block far wider than the screen while its parent fits (a fixed or percentage width the phone layout forgot) is held to the screen.
[].forEach.call(document.querySelectorAll("main section,main section > *,main article"),function(e){if(e.closest("[class*=track i],[class*=scroller i],[class*=carousel i],[class*=marquee i],[class*=ticker i],[class*=slider i],[class*=lane i],.pin-spacer,[data-pin]"))return;
var cs=getComputedStyle(e);if(cs.position==="fixed")return;var r=e.getBoundingClientRect(),par=e.parentElement;if(!par||r.width<=innerWidth+4)return;if(par.getBoundingClientRect().width>innerWidth+4&&par.tagName!=="MAIN")return;
e.style.setProperty("width","auto","important");e.style.setProperty("max-width","100%","important");e.style.setProperty("min-width","0","important");if(cs.position==="absolute"){e.style.left="0";e.style.right="0"}})}
if(document.readyState==="complete")fix();else addEventListener("load",fix);setTimeout(fix,600);addEventListener("resize",fix)})();

// A photo that spills out of its column over the words beside it (a tall photo in a two-column row whose
// frame is wider than its track): the photo's column is held to its own width, so the words show again.
(function(){var done=[],busy=0;function hold(){busy=0;document.querySelectorAll("main h1,main h2,main h3,main p").forEach(function(e){
var r=e.getBoundingClientRect();if(!r.width||r.height<8||r.top<0||r.bottom>innerHeight)return;
[r.left+4,r.left+r.width*0.08].forEach(function(x){if(x<0||x>innerWidth)return;var y=r.top+r.height/2;
var stack=document.elementsFromPoint(x,y),top=stack[0];if(!top||e.contains(top)||top.contains(e))return;
var pic=top.closest("img,picture,video,figure");if(!pic||pic.contains(e))return;
var common=pic.parentElement;while(common&&!common.contains(e))common=common.parentElement;if(!common)return;
var item=pic;while(item.parentElement&&item.parentElement!==common)item=item.parentElement;if(done.indexOf(item)>=0)return;done.push(item);
item.style.minWidth="0";item.style.maxWidth="100%";item.style.overflow="hidden";
[].forEach.call(item.querySelectorAll("img,picture,video,figure"),function(m){m.style.maxWidth="100%"})})})}
/* Only what is on screen can be hit-tested: looked at again as the page is scrolled. */
function soon(){if(!busy){busy=1;setTimeout(hold,250)}}
if(document.readyState==="complete")hold();else addEventListener("load",hold);addEventListener("scroll",soon,{passive:true})})();

// Wider screens: a block of words that starts at the very left edge of the screen (a full-width wrapper that
// lost its side padding) gets the gutter back on that wrapper, so headline, words and buttons line up with the page.
(function(){function gut(){if(innerWidth<700)return;var W=innerWidth,done=[];
document.querySelectorAll("main h1,main h2,main h3,main p,main a[class*=btn],main a[class*=button]").forEach(function(e){
if(e.closest("[data-horizontal-track],[data-marquee],[aria-hidden=true],[class*=marquee i],[class*=ticker i]"))return;
var r=e.getBoundingClientRect();if(!r.width||r.left>=12||!(e.textContent||"").trim())return;
var w=e.parentElement;while(w&&w!==document.body){var b=w.getBoundingClientRect();if(b.left<=1&&b.width>=W-4)break;w=w.parentElement}
if(!w||w===document.body||w.tagName==="MAIN"||done.indexOf(w)>=0)return;done.push(w);
var cs=getComputedStyle(w),g=Math.round(Math.min(80,Math.max(24,W*0.05)));w.style.boxSizing="border-box";
if((parseFloat(cs.paddingLeft)||0)<g)w.style.paddingLeft=g+"px";if((parseFloat(cs.paddingRight)||0)<g)w.style.paddingRight=g+"px"})}
if(document.readyState==="complete")gut();else addEventListener("load",gut)})();

// Phones: text that touches or runs past the screen's edge gets room at the sides, and a heading wider
// than the screen is set smaller until it fits (never below 60% of its size). Free, on every site.
(function(){function fit(){if(innerWidth>=700)return;var W=innerWidth;
document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main blockquote,main label,main dd").forEach(function(e){
if(e.closest("[data-horizontal-track],[data-marquee],[aria-hidden=true],[class*=marquee i],[class*=ticker i]"))return;var r=e.getBoundingClientRect();if(!r.width||!(e.textContent||"").trim())return;
var cs=getComputedStyle(e);if(cs.position==="absolute"||cs.position==="fixed")return;
if(/^H[1-4]$/.test(e.tagName)){var fs=parseFloat(cs.fontSize),min=fs*0.6,n=0;while((e.scrollWidth>e.clientWidth+2||e.getBoundingClientRect().right>W+1)&&fs>min&&n++<12){fs*=0.92;e.style.fontSize=fs+"px"}
if(e.scrollWidth>e.clientWidth+2)e.style.overflowWrap="anywhere";r=e.getBoundingClientRect()}
var L=r.left<8,R=r.right>W-8;if(!L&&!R)return;if(r.width>=W-4&&!R)return;
e.style.boxSizing="border-box";e.style.maxWidth="100%";
if(L)e.style.paddingLeft=(parseFloat(cs.paddingLeft)||0)+Math.max(0,18-Math.max(0,r.left))+"px";
if(R)e.style.paddingRight=(parseFloat(cs.paddingRight)||0)+Math.max(0,18-Math.max(0,W-r.right))+"px"})}
function later(){setTimeout(fit,60)}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,1200)});else setTimeout(fit,1500);
addEventListener("orientationchange",later)})();

// First-screen buttons with no fill of their own: dark words over a photo can't be read (an "empty" outlined
// box). Over a picture they are set white, with a white outline.
(function(){function go(){var hero=document.querySelector("main > section, main > *");if(!hero)return;
hero.querySelectorAll("a,button").forEach(function(b){var s=getComputedStyle(b),m=(s.backgroundColor||"").match(/[0-9.]+/g);
if(m&&(m.length<4||+m[3]>0.3))return;var c=(s.color||"").match(/[0-9.]+/g);if(!c)return;var L=(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;if(L>0.45)return;
var r=b.getBoundingClientRect();if(!r.width)return;var els=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2),photo=false;
for(var i=0;i<els.length&&!photo;i++){var e=els[i];if(b.contains(e))continue;if(/^(IMG|VIDEO|CANVAS|PICTURE)$/.test(e.tagName)||getComputedStyle(e).backgroundImage!=="none")photo=true;else{var bg=(getComputedStyle(e).backgroundColor||"").match(/[0-9.]+/g);if(bg&&(bg.length<4||+bg[3]>0.5))break}}
if(photo){b.style.setProperty("color","#fff","important");b.style.setProperty("border-color","rgba(255,255,255,.75)","important")}})}
setTimeout(go,300);setTimeout(go,2000)})();

// A call link with no number in it ("tel:+1") goes nowhere: hidden. Phones: text squeezed into a sliver of a
// grid row (a title wrapped one letter a line) gets its row stacked in one column instead.
(function(){document.querySelectorAll('a[href^="tel:"]').forEach(function(a){if((a.getAttribute("href")||"").replace(/[^0-9]/g,"").length<10)a.style.display="none"});
function stack(){if(innerWidth>=700)return;
document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main span,main a,main li,main strong").forEach(function(e){
var t=(e.textContent||"").trim();if(t.length<4||e.children.length>2)return;var r=e.getBoundingClientRect();if(!r.width||r.width>=48||r.height<40)return;
for(var n=e.parentElement,k=0;n&&k<3&&n.tagName!=="MAIN";n=n.parentElement,k++){var cs=getComputedStyle(n);
if(cs.display.indexOf("grid")>=0){n.style.gridTemplateColumns="minmax(0,1fr)";n.style.gridTemplateAreas="none";[].forEach.call(n.children,function(c){c.style.gridColumn="1 / -1";c.style.gridRow="auto";c.style.gridArea="auto"});return}
if(cs.display.indexOf("flex")>=0&&cs.flexDirection.indexOf("row")===0){n.style.flexWrap="wrap";[].forEach.call(n.children,function(c){c.style.minWidth="0"});e.style.flexBasis="100%";return}}})}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(stack,900)});else setTimeout(stack,1200)})();

// Phones: a header whose name or tagline is too long pushes the menu button off the screen. Its smaller
// tagline lines are hidden first, then the header's call-to-action, then the name is set a little smaller, then the
// light/dark switch goes, then the name is cut with an ellipsis (never below 45% of the screen), until the last button fits.
(function(){function fit(){var hd=document.querySelector("body>header,header");if(!hd||innerWidth>=900)return;
function over(){var W=document.documentElement.clientWidth,bs=hd.querySelectorAll("button,summary,a[class*=menu i],[class*=toggle i],[class*=burger i]");for(var i=0;i<bs.length;i++){var r=bs[i].getBoundingClientRect();if(r.width&&(r.right>W+1||r.left<-1)&&!bs[i].closest("nav,[class*=drawer i],[aria-hidden=true]"))return true}return false}
if(!over())return;var brand=hd.querySelector("a[href]");if(!brand)return;var big=parseFloat(getComputedStyle(brand).fontSize)||0;
brand.querySelectorAll("*").forEach(function(e){var f=parseFloat(getComputedStyle(e).fontSize);if(f>big)big=f});
hd.querySelectorAll("small,span,em,div,p").forEach(function(e){if(!over())return;if(e.querySelector("a,button,summary,svg,img")||e.closest("nav,button,summary"))return;var f=parseFloat(getComputedStyle(e).fontSize);if(f<big*0.8&&(e.textContent||"").trim())e.style.display="none"});
// Then the header's own call-to-action button (the page has others), then the light/dark switch, before the name is ever cut.
if(over())[].forEach.call(hd.querySelectorAll("a[class*=btn i],a[class*=cta i],a[class*=quote i],a[class*=button i]"),function(a){if(!over()||a.closest("nav,[class*=drawer i],[class*=menu i]")||/menu|burger|toggle/i.test(a.className))return;a.style.display="none"});
// The name's words a little smaller (down to 80%) before the light/dark switch has to go.
if(over()){var tx=[].filter.call(brand.querySelectorAll("*"),function(x){return [].some.call(x.childNodes,function(n){return n.nodeType===3&&n.textContent.trim()})});if(!tx.length)tx=[brand];
var f0=tx.map(function(x){return parseFloat(getComputedStyle(x).fontSize)});for(var s=.95;s>=.8&&over();s-=.05)tx.forEach(function(x,i){x.style.setProperty("font-size",(f0[i]*s).toFixed(1)+"px","important")})}
if(over())[].forEach.call(hd.querySelectorAll("[class*=theme i],[id*=theme i],[aria-label*=theme i],[aria-label*=dark i],[aria-label*=light i]"),function(t){if(!over()||t.closest("nav,[class*=drawer i]"))return;t.style.display="none"});
if(over()){brand.style.minWidth="0";brand.style.overflow="hidden";brand.style.textOverflow="ellipsis";brand.style.whiteSpace="nowrap";brand.style.flex="1 1 auto";brand.style.maxWidth="60vw";brand.style.minWidth="45vw"}}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,200)});else setTimeout(fit,600);setTimeout(fit,1500);addEventListener("orientationchange",function(){setTimeout(fit,200)})})();

// Phones: a grid of side-by-side columns that doesn't collapse (a column running off the screen, or words
// crushed into a narrow one) is laid out as a single column instead. Sideways tracks and marquees are left alone.
(function(){function one(){if(innerWidth>=700)return;var W=document.documentElement.clientWidth;
document.querySelectorAll("main *").forEach(function(g){var cs=getComputedStyle(g);if(cs.display.indexOf("grid")<0)return;
if(g.closest("[data-horizontal-track],[data-marquee],[class*=marquee i],[class*=ticker i],[class*=track i],[class*=carousel i],[class*=slider i],header,nav"))return;
var kids=[].filter.call(g.children,function(c){var k=getComputedStyle(c);return k.display!=="none"&&k.position!=="absolute"&&k.position!=="fixed"});if(kids.length<2)return;
var ls=kids.map(function(c){return c.getBoundingClientRect().left});if(Math.max.apply(null,ls)-Math.min.apply(null,ls)<60)return;
var bad=kids.some(function(c){var r=c.getBoundingClientRect(),words=(c.textContent||"").trim().length;return r.right>W+2||c.scrollWidth>c.clientWidth+4||(words>40&&r.width<W*0.45&&!c.matches("img,picture,video,figure"))});
if(!bad)return;g.style.gridTemplateColumns="minmax(0,1fr)";g.style.gridTemplateAreas="none";kids.forEach(function(c){c.style.gridColumn="1 / -1";c.style.gridRow="auto";c.style.gridArea="auto";c.style.maxWidth="100%";c.style.minWidth="0"})})}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(one,700)});else setTimeout(one,1000);addEventListener("orientationchange",function(){setTimeout(one,300)})})();

// Any screen: big words wider than their own box (a large figure or word in a narrow column, running into its
// neighbour) are set smaller until they fit, down to 55% of their size. Marquees, sideways tracks and giant
// decorative words are left alone.
(function(){function fit(){document.querySelectorAll("main p,main span,main strong,main b,main div,main h2,main h3,main dd,main dt").forEach(function(e){
if(![].some.call(e.childNodes,function(n){return n.nodeType===3&&n.textContent.trim().length>1}))return;
var cs=getComputedStyle(e),fs=parseFloat(cs.fontSize);if(fs<26||cs.display.indexOf("inline")===0)return;
if(e.closest("[aria-hidden=true],[data-word],[class*=marquee i],[class*=ticker i],[class*=track i],[class*=carousel i],[class*=slider i],header,nav,footer"))return;
var r=e.getBoundingClientRect();if(!r.width||r.width>innerWidth*.9)return;if(e.scrollWidth<=e.clientWidth+4)return;
for(var k=0,f=fs;k<12&&e.scrollWidth>e.clientWidth+2&&f>fs*.55;k++){f=Math.max(fs*.55,f*.93);e.style.setProperty("font-size",f.toFixed(1)+"px","important")}
e.setAttribute("data-fg-fit","")})}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,500);setTimeout(fit,2200)});else setTimeout(fit,1200);addEventListener("resize",function(){clearTimeout(fit.t);fit.t=setTimeout(fit,400)})})();

// Any screen: the main headline's words never run past the edge of the screen (or are cut off by their box):
// it is set smaller until its last line ends inside, down to 55% of its size.
(function(){// The headline's visible lines only: text in a screen-reader-only part (clipped, 1px, hidden, transparent or
// moved off the screen on purpose) doesn't count.
function shown(el,h){for(var n=el;n&&n!==h.parentElement;n=n.parentElement){var c=getComputedStyle(n),b=n.getBoundingClientRect();
if(c.visibility==="hidden"||c.display==="none"||parseFloat(c.opacity)===0||(b.width<=2&&b.height<=2)||(c.clip&&c.clip!=="auto")||(c.clipPath||"").indexOf("inset(50%")>=0||(c.clipPath||"").indexOf("inset(100%")>=0||/sr-only|visually-hidden|screen-reader/i.test(n.className&&n.className.baseVal===undefined?n.className:""))return false}return true}
function rects(h){var out=[],w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT),t;while((t=w.nextNode())){if(!t.textContent.trim()||!shown(t.parentElement,h))continue;var r=document.createRange();r.selectNodeContents(t);[].forEach.call(r.getClientRects(),function(x){if(x.width>2)out.push(x)})}return out}
function clear(h){var lines=rects(h);if(!lines.length)return;
var top=Math.min.apply(null,lines.map(function(x){return x.top})),bot=Math.max.apply(null,lines.map(function(x){return x.bottom})),L=Math.min.apply(null,lines.map(function(x){return x.left})),R=Math.max.apply(null,lines.map(function(x){return x.right}));
var sec=h.closest("section")||h.parentElement;[].forEach.call(sec.querySelectorAll("*"),function(e){if(e.contains(h)||h.contains(e))return;var st=getComputedStyle(e);if(st.position!=="absolute"||!(e.textContent||"").trim()||e.closest("[aria-hidden=true]"))return;
var b=e.getBoundingClientRect();if(!(b.width&&b.left<R&&b.right>L&&b.top<bot&&b.bottom>top))return;
var room=sec.getBoundingClientRect().bottom-bot-24;if(room>=b.height){e.style.top=(parseFloat(st.top)||0)+(bot+16-b.top)+"px";e.style.bottom="auto"}else e.style.visibility="hidden"})}
function fit(){var h=document.querySelector("main h1");if(!h)return;setTimeout(function(){clear(h)},60);var W=document.documentElement.clientWidth,cs=getComputedStyle(h),fs=parseFloat(cs.fontSize),min=fs*0.55,n=0;
function out(){var rs=rects(h);for(var i=0;i<rs.length;i++){if(rs[i].right>W-6||rs[i].left<0)return true}return false}
if(!out())return;
// First let it wrap inside the room it has; only then make it smaller.
var left=Math.max(0,h.getBoundingClientRect().left);h.style.whiteSpace="normal";h.style.overflowWrap="break-word";h.style.maxWidth=Math.max(240,W-left-24)+"px";
// ...unless wrapping makes it run into other words on the first screen: then it stays on its lines and only shrinks.
var sec=h.closest("section")||h.parentElement,hr=h.getBoundingClientRect(),hit=[].some.call(sec.querySelectorAll("p,span,a,li,small,div"),function(e){if(h.contains(e)||e.contains(h)||!(e.textContent||"").trim()||e.children.length>3)return false;var r=e.getBoundingClientRect();return r.width>0&&r.left<hr.right&&r.right>hr.left&&r.top<hr.bottom&&r.bottom>hr.top});
if(hit){h.style.whiteSpace="";h.style.overflowWrap="";h.style.maxWidth=""}
while(out()&&fs>min&&n++<14){fs*=0.92;h.style.fontSize=fs+"px"}}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,1600);setTimeout(fit,4000)});else setTimeout(fit,2000);addEventListener("resize",function(){clearTimeout(fit.t);fit.t=setTimeout(fit,300)})})();

// Any screen: the header's name is never squeezed narrower than its own words (the name then spills over the
// menu links). It keeps its width; if the row then overflows, the menu's gaps tighten, then the phone link's
// words go (its icon stays), then the last menu links are hidden, until the row fits.
(function(){function fit(){var hd=document.querySelector("body>header,header");if(!hd)return;var brand=hd.querySelector("a[href]");if(!brand)return;
var spill=[].some.call(brand.querySelectorAll("*"),function(e){return e.scrollWidth>brand.clientWidth+2})||brand.scrollWidth>brand.clientWidth+2;if(!spill)return;
brand.style.flexShrink="0";brand.style.minWidth="max-content";
var W=document.documentElement.clientWidth;function over(){var bs=hd.querySelectorAll("a,button");for(var i=0;i<bs.length;i++){var r=bs[i].getBoundingClientRect();if(r.width&&r.right>W-4)return true}
var br=brand.getBoundingClientRect(),nav=hd.querySelector("nav");if(!nav)return false;var first=[].filter.call(nav.querySelectorAll("a,button"),function(x){return x.getBoundingClientRect().width>0})[0];return !!first&&first.getBoundingClientRect().left<br.right+8}
if(!over())return;var nav=hd.querySelector("nav");if(nav){nav.style.gap="4px";[].forEach.call(nav.querySelectorAll("a,button"),function(a){a.style.paddingLeft=a.style.paddingRight="8px"})}
if(over())[].forEach.call(hd.querySelectorAll('a[href^="tel:"]'),function(a){[].forEach.call(a.childNodes,function(n){if(n.nodeType===3&&n.textContent.trim()){var s=document.createElement("span");s.textContent=n.textContent;s.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";n.replaceWith(s)}})});
if(nav){var links=[].filter.call(nav.children,function(x){return x.getBoundingClientRect().width>0});for(var k=links.length-1;k>0&&over();k--)links[k].style.display="none"}}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,100)});else setTimeout(fit,500);addEventListener("resize",function(){clearTimeout(fit.t);fit.t=setTimeout(fit,300)})})();

// Before/after pairs shown as two separate pictures become one drag slider (the "after" revealed over the
// "before"), which works with a mouse, a finger or the keyboard. A pair already inside a slider is left alone.
(function(){var done=[];document.querySelectorAll('main img[src*="-before."]').forEach(function(bi){if(bi.closest(".fg-ba"))return;var m=bi.getAttribute("src").match(/ba-(\\d+)-before\\./);if(!m)return;
var ai=[].filter.call(document.querySelectorAll('main img[src*="ba-'+m[1]+'-after."]'),function(x){return !x.closest(".fg-ba")})[0];if(!ai||done.indexOf(m[1])>=0)return;
var row=bi.parentElement;while(row&&!row.contains(ai))row=row.parentElement;if(!row||row.tagName==="MAIN")return;
// The design's own slider (the two pictures stacked in one box): its box keeps its size and gets our slider instead.
var rb=bi.getBoundingClientRect(),ra=ai.getBoundingClientRect(),stacked=Math.abs(rb.left-ra.left)<4&&Math.abs(rb.top-ra.top)<4||(ra.width<rb.width*0.98&&ra.left>=rb.left-2&&ra.top>=rb.top-2&&ra.bottom<=rb.bottom+2);
function tileOf(img){var t=img;while(t.parentElement!==row)t=t.parentElement;return t}var bt=stacked?null:tileOf(bi),at=stacked?null:tileOf(ai);if(!stacked&&bt===at)return;done.push(m[1]);
var w=document.createElement("div");w.className="fg-ba";w.setAttribute("role","group");w.setAttribute("aria-label","Before and after");
w.style.aspectRatio=(bi.naturalWidth&&bi.naturalHeight?bi.naturalWidth+" / "+bi.naturalHeight:"4 / 3");
var b=document.createElement("img");b.src=bi.src;b.alt=bi.alt||"Before";var cl=document.createElement("div");cl.className="fg-ba-after";var a=document.createElement("img");a.src=ai.src;a.alt=ai.alt||"After";cl.appendChild(a);
var line=document.createElement("div");line.className="fg-ba-line";line.innerHTML="<span></span>";var lb=document.createElement("b");lb.className="fg-ba-l";lb.textContent="Before";var la=document.createElement("b");la.className="fg-ba-r";la.textContent="After";
var inp=document.createElement("input");inp.type="range";inp.min="0";inp.max="100";inp.value="50";inp.setAttribute("aria-label","Drag to compare before and after");
function set(v){cl.style.clipPath="inset(0 0 0 "+v+"%)";line.style.left=v+"%"}inp.addEventListener("input",function(){set(inp.value)});set(50);
[b,cl,line,lb,la,inp].forEach(function(x){w.appendChild(x)});
if(stacked){row.innerHTML="";row.appendChild(w);w.style.aspectRatio="";w.style.height="100%";w.style.minHeight=Math.max(200,Math.round(rb.height))+"px";return}
var box=document.createElement(bt.tagName==="LI"?"li":"div");box.className="fg-ba-box";box.appendChild(w);row.insertBefore(box,bt);bt.style.display="none";at.style.display="none";
var cs=getComputedStyle(row);if(cs.display.indexOf("grid")>=0)box.style.gridColumn="1 / -1"})})();

// A page that already ends with a big call to action, followed by a footer that opens with another one (two
// full-screen "get a quote" blocks in a row): the footer's copy is hidden.
(function(){var main=document.querySelector("main"),ft=document.querySelector("body>footer,footer");if(!main||!ft)return;
var CTA=/quote|book|reserve|enquir|contact|call|visit|appointment|estimate|order|get in touch|plan/i;
function isCta(el){if(!el)return false;var r=el.getBoundingClientRect();if(r.height<250)return false;var as=[].filter.call(el.querySelectorAll("a,button"),function(a){return CTA.test(a.textContent||"")||CTA.test(a.getAttribute("href")||"")});var t=(el.innerText||"").trim().length;return as.length>0&&t<600&&!el.querySelector("form,nav,ul li a[href] ~ a")}
var last=main.lastElementChild;while(last&&(last.offsetHeight===0||/^(SCRIPT|STYLE)$/.test(last.tagName)))last=last.previousElementSibling;
var first=ft.firstElementChild;if(!first||first.querySelector("nav,ul"))return;
/* Never the block that holds the footer itself (its legal links, credit or several link columns). */
if(first.querySelector('a[href*="privacy"],a[href*="terms"],a[href*="mianro"]')||first.querySelectorAll("a").length>4)return;
if(isCta(last)&&isCta(first))first.style.display="none"})();

// Desktop footers: a column that collides with another and drops to a row of its own while the right of the
// grid stands empty (a CSS rule that counted the columns by element type) moves into that empty space.
(function(){function fix(){if(innerWidth<900)return;var ft=document.querySelector("body>footer,footer");if(!ft)return;
ft.querySelectorAll("*").forEach(function(g){var cs=getComputedStyle(g);if(cs.display.indexOf("grid")<0)return;var cols=cs.gridTemplateColumns.split(" ").length;if(cols<4)return;
var kids=[].filter.call(g.children,function(k){return k.offsetHeight>0});if(kids.length<3)return;var top=kids[0].getBoundingClientRect().top;
var first=kids.filter(function(k){return Math.abs(k.getBoundingClientRect().top-top)<4}),rest=kids.filter(function(k){return first.indexOf(k)<0});if(!rest.length||rest.length>2)return;
var end=0;first.forEach(function(k){var e=parseInt(getComputedStyle(k).gridColumnEnd,10);if(e>end)end=e});if(!end||cols+1-end<2)return;
var at=end;rest.forEach(function(k){if(cols+1-at<2)return;var span=Math.min(cols+1-at,Math.max(2,(parseInt(getComputedStyle(k).gridColumnEnd,10)-parseInt(getComputedStyle(k).gridColumnStart,10))||2));k.style.gridColumn=at+" / "+(at+span);k.style.gridRow="1";at+=span})})}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fix,300)});else setTimeout(fix,800)})();
}catch(x){}};`;
