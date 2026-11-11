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

export type QaRule = "logo" | "footer-links" | "legal" | "dead-link" | "dead-anchor" | "button" | "social" | "heading-twice" | "heading-empty" | "h1" | "title" | "form" | "phone";

export const QA_RULES: Record<QaRule, string> = {
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

export const QA_CSS = `.fg-legal{text-align:center;font-size:.85rem;opacity:.85;margin:14px 0 0}.fg-legal a{color:inherit;text-decoration:underline;text-underline-offset:3px}
main img[data-fg-zoom]{cursor:zoom-in}
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
function zoomable(i){return i.closest("main")&&!i.closest("a,button,.hero-motion,[data-no-zoom]")&&i.getBoundingClientRect().width>=140}
function mark(){[].slice.call(document.querySelectorAll("main img")).forEach(function(i){if(zoomable(i))i.setAttribute("data-fg-zoom","")})}
mark();addEventListener("load",mark);
document.addEventListener("click",function(e){var i=e.target;if(!i||i.tagName!=="IMG"||!zoomable(i))return;
var o=document.createElement("div");o.className="fg-zoom";o.setAttribute("role","dialog");o.setAttribute("aria-label","Photo");
var big=document.createElement("img");big.src=i.currentSrc||i.src;big.alt=i.alt||"";var b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Close");b.textContent="\\u00d7";
o.appendChild(big);o.appendChild(b);document.body.appendChild(o);requestAnimationFrame(function(){o.classList.add("on")});b.focus();
function close(){o.remove();document.removeEventListener("keydown",key)}function key(k){if(k.key==="Escape")close()}
o.addEventListener("click",close);document.addEventListener("keydown",key)});
}catch(x){}})();`;
