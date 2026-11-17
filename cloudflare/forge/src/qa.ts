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
export const EMPTY_PHOTO = /(photos?|pictures?|images?)\b[^.!?<]{0,60}\b(appears?|go|goes|added)\b[^.!?<]{0,20}\bhere|space for (your|real|the)\b[^.!?<]{0,20}(photos?|pictures?)|(photos?|pictures?) coming soon/i;

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
export function qaFixHtml(html: string, footer: { hasPrivacy: boolean; hasTerms: boolean }): string {
  let out = html.replace(/href\s*=\s*(["'])tel:([^"']*)\1/gi, (m, q: string, v: string) => {
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

export const QA_CSS = `header.fg-solid{background:color-mix(in srgb,var(--bg,#fff) 94%,transparent)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-color:transparent!important;box-shadow:0 1px 0 rgba(0,0,0,.08)!important;transition:background-color .3s}
header.fg-solid [data-fg-ink],header.fg-solid [data-fg-ink] svg{color:var(--ink,#111)!important}header.fg-solid [data-fg-ink][class*="icon" i],header.fg-solid [data-fg-ink][class*="toggle" i]{border-color:color-mix(in srgb,var(--ink,#111) 25%,transparent)!important}
.fg-legal{text-align:center;font-size:.85rem;opacity:.85;margin:14px 0 0}.fg-legal a{color:inherit;text-decoration:underline;text-underline-offset:3px}
main img[data-fg-zoom]{cursor:zoom-in}
[data-fg-filled]{position:relative;overflow:hidden;padding:0!important}[data-fg-filled]>img{display:block;width:100%;height:100%;min-height:200px;object-fit:cover}
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
window.__fgFill=function(urls){try{urls=urls||[];
var P=/(photos?|pictures?|images?)\\b[^.!?]{0,60}\\b(appears?|go|goes|added)\\b[^.!?]{0,20}\\bhere|space for (your|real|the)\\b[^.!?]{0,20}(photos?|pictures?)|(photos?|pictures?) coming soon/i;
var abs=function(u){try{return new URL(u,location.href).href}catch(e){return u}},used={};
[].forEach.call(document.images,function(i){used[i.currentSrc||i.src]=1});
var pool=urls.filter(function(u){return !used[abs(u)]}).concat(urls),k=0,done=[];
[].slice.call(document.querySelectorAll("main p,main span,main div,main figcaption,main h3,main h4,main small,main strong")).forEach(function(el){
var t=(el.textContent||"").trim();if(!t||t.length>170||!P.test(t)||/before|after|review/i.test(t))return;
var box=el;while(box.parentElement&&!/^(MAIN|SECTION|ARTICLE|BODY)$/.test(box.parentElement.tagName)&&(box.parentElement.textContent||"").trim().length<=t.length+110&&!box.parentElement.querySelector("img,video,iframe,form,a[href]"))box=box.parentElement;
if(box.querySelector("img,video")||done.indexOf(box)>=0||done.some(function(d){return d.contains(box)}))return;done.push(box);
if(!pool.length){box.style.display="none";box.setAttribute("data-fg-filled","");return}
var img=document.createElement("img");img.src=pool[k++%pool.length];img.alt="Sample photo";img.loading="lazy";img.setAttribute("data-fg-zoom","");
var tag=document.createElement("span");tag.textContent="Sample photo";
box.innerHTML="";box.setAttribute("data-fg-filled","");box.appendChild(img);box.appendChild(tag)});

// A see-through header whose text can't be read against what is behind it (light text over a light
// section, often in the other theme) gets a solid background and the page's ink colour until it can.
(function(){var hd=document.querySelector("body>header,header");if(!hd)return;
function rgb(v){var m=(v||"").match(/[0-9.]+/g);return m&&m.length>=3?m.map(Number):null}
function lum(c){var a=[c[0],c[1],c[2]].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]}
function behind(){var r=hd.getBoundingClientRect();var y=Math.min(innerHeight-1,Math.max(0,r.bottom+6));var els=document.elementsFromPoint(innerWidth/2,y);
for(var i=0;i<els.length;i++){if(hd.contains(els[i]))continue;for(var n=els[i];n&&n!==document.documentElement;n=n.parentElement){var st=getComputedStyle(n);
if(/^(IMG|VIDEO|CANVAS|PICTURE|svg)$/i.test(n.tagName)||st.backgroundImage!=="none")return null;var c=rgb(st.backgroundColor);if(c&&(c.length<4||c[3]>0.5))return c}}
return rgb(getComputedStyle(document.body).backgroundColor)}
function check(){if(hd.classList.contains("fg-solid")){hd.classList.remove("fg-solid")}
var own=rgb(getComputedStyle(hd).backgroundColor);if(own&&own.length>=4&&own[3]>0.5)return;if(own&&own.length===3)return;
// On a phone a see-through header over the page's words is a jumble whatever the colours: past the first screen it is always solid.
if(innerWidth<900&&scrollY>innerHeight*0.6){solid();return}
var link=hd.querySelector("nav a,a");if(!link)return;var fg=rgb(getComputedStyle(link).color);var bg=behind();if(!fg||!bg)return;
var a=lum(fg),b=lum(bg);if((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)<2.5)solid()}
function solid(){
hd.querySelectorAll("a,button,summary,span,[class*=brand i],[class*=logo i]").forEach(function(el){if(el.closest(".dd-panel,[class*=panel i],[class*=dropdown i],[class*=menu-overlay i]"))return;for(var n=el;n&&n!==hd;n=n.parentElement){var c=rgb(getComputedStyle(n).backgroundColor);if(c&&!(c.length>=4&&c[3]<0.3))return}el.setAttribute("data-fg-ink","")});
hd.classList.add("fg-solid")}
var t=0;function soon(){if(t)return;t=requestAnimationFrame(function(){t=0;check()})}
addEventListener("scroll",soon,{passive:true});addEventListener("resize",soon);
new MutationObserver(soon).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme","class"]});
setTimeout(check,400);setTimeout(check,2500)})();

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
// tagline lines are hidden first, then the name is cut with an ellipsis, until the last button fits.
(function(){function fit(){var hd=document.querySelector("body>header,header");if(!hd||innerWidth>=900)return;
function over(){var W=document.documentElement.clientWidth,bs=hd.querySelectorAll("button,summary,a[class*=menu i],[class*=toggle i],[class*=burger i]");for(var i=0;i<bs.length;i++){var r=bs[i].getBoundingClientRect();if(r.width&&(r.right>W+1||r.left<-1))return true}return hd.scrollWidth>hd.clientWidth+2}
if(!over())return;var brand=hd.querySelector("a[href]");if(!brand)return;var big=parseFloat(getComputedStyle(brand).fontSize)||0;
brand.querySelectorAll("*").forEach(function(e){var f=parseFloat(getComputedStyle(e).fontSize);if(f>big)big=f});
hd.querySelectorAll("small,span,em,div,p").forEach(function(e){if(!over())return;if(e.querySelector("a,button,summary,svg,img")||e.closest("nav,button,summary"))return;var f=parseFloat(getComputedStyle(e).fontSize);if(f<big*0.8&&(e.textContent||"").trim())e.style.display="none"});
if(over()){brand.style.minWidth="0";brand.style.overflow="hidden";brand.style.textOverflow="ellipsis";brand.style.whiteSpace="nowrap";brand.style.flex="1 1 auto";brand.style.maxWidth="60vw"}}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,200)});else setTimeout(fit,600);addEventListener("orientationchange",function(){setTimeout(fit,200)})})();

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

// Any screen: the main headline's words never run past the edge of the screen (or are cut off by their box):
// it is set smaller until its last line ends inside, down to 55% of its size.
(function(){function clear(h){var r=document.createRange();r.selectNodeContents(h);var lines=[].filter.call(r.getClientRects(),function(x){return x.width>2});if(!lines.length)return;
var top=Math.min.apply(null,lines.map(function(x){return x.top})),bot=Math.max.apply(null,lines.map(function(x){return x.bottom})),L=Math.min.apply(null,lines.map(function(x){return x.left})),R=Math.max.apply(null,lines.map(function(x){return x.right}));
var sec=h.closest("section")||h.parentElement;[].forEach.call(sec.querySelectorAll("*"),function(e){if(e.contains(h)||h.contains(e))return;var st=getComputedStyle(e);if(st.position!=="absolute"||!(e.textContent||"").trim()||e.closest("[aria-hidden=true]"))return;
var b=e.getBoundingClientRect();if(!(b.width&&b.left<R&&b.right>L&&b.top<bot&&b.bottom>top))return;
var room=sec.getBoundingClientRect().bottom-bot-24;if(room>=b.height){e.style.top=(parseFloat(st.top)||0)+(bot+16-b.top)+"px";e.style.bottom="auto"}else e.style.visibility="hidden"})}
function fit(){var h=document.querySelector("main h1");if(!h)return;setTimeout(function(){clear(h)},60);var W=document.documentElement.clientWidth,cs=getComputedStyle(h),fs=parseFloat(cs.fontSize),min=fs*0.55,n=0;
function out(){var r=document.createRange();r.selectNodeContents(h);var rs=r.getClientRects(),box=h.parentElement.getBoundingClientRect();for(var i=0;i<rs.length;i++){if(rs[i].width<2)continue;if(rs[i].right>W-6||rs[i].left<0)return true}return h.scrollWidth>h.clientWidth+2}
if(!out())return;
// First let it wrap inside the room it has; only then make it smaller.
var left=Math.max(0,h.getBoundingClientRect().left);h.style.whiteSpace="normal";h.style.overflowWrap="break-word";h.style.maxWidth=Math.max(240,W-left-24)+"px";
// ...unless wrapping makes it run into other words on the first screen: then it stays on its lines and only shrinks.
var sec=h.closest("section")||h.parentElement,hr=h.getBoundingClientRect(),hit=[].some.call(sec.querySelectorAll("p,span,a,li,small,div"),function(e){if(h.contains(e)||e.contains(h)||!(e.textContent||"").trim()||e.children.length>3)return false;var r=e.getBoundingClientRect();return r.width>0&&r.left<hr.right&&r.right>hr.left&&r.top<hr.bottom&&r.bottom>hr.top});
if(hit){h.style.whiteSpace="";h.style.overflowWrap="";h.style.maxWidth=""}
while(out()&&fs>min&&n++<14){fs*=0.92;h.style.fontSize=fs+"px"}}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(fit,1600);setTimeout(fit,4000)});else setTimeout(fit,2000);addEventListener("resize",function(){clearTimeout(fit.t);fit.t=setTimeout(fit,300)})})();
}catch(x){}};`;
