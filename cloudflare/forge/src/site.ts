/**
 * Serving demo websites: put a multi-page site together from its kit and page,
 * point its links at the demo's own address, deliver its forms to the team app,
 * and add the GoHighLevel chat widget in the site's primary colour.
 */
import { QA_CSS, QA_JS, qaFixHtml } from "./qa";
import { MOTION_CSS, motionScripts } from "./motion";
import { esc } from "../../../src/forge/render";
import { pagesOf, CREDIT, CREDIT_CSS, CREDIT_MARKER, tidyCss, type Kit, type PageDraft } from "./designer";
import type { HTMLElement } from "./env";
import type { Tenant } from "./tenants";
import { HERO_CSS, LEGACY_HERO_BG } from "./hero";

/** Mianro's GoHighLevel chat widget, used unless Settings or the demo names another. */
export const DEFAULT_WIDGET_ID = "6a872a7164c286aff3546896";

/**
 * What to show for a demo's chat widget field (or the team setting): empty means "use the
 * fallback", "off" turns it off, and an ID or the pasted embed code names a widget.
 */
export function widgetId(value: string, fallback: string): string {
  const v = value.trim();
  if (!v) return fallback;
  if (/^(off|none|no)$/i.test(v)) return "";
  const id = v.match(/data-widget-id=["']?([a-z0-9]+)/i)?.[1] ?? (/^[a-z0-9]{12,40}$/i.test(v) ? v : "");
  return id;
}

/** The loader script plus CSS that recolours the bubble and chat window to the site's accent. */
export function chatWidget(id: string, accent: string): string {
  if (!/^[a-z0-9]{12,40}$/i.test(id)) return "";
  const c = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "";
  const css = c
    ? `<style>chat-widget{--chat-widget-primary-color:${c}!important;--chat-widget-active-color:${c}!important;--chat-widget-bubble-color:${c}!important}</style>`
    : "";
  // The widget's greeting bubble ("Hi there! Have a question?") lands on top of the hero: keep it
  // off phones altogether, and on desktop hold it back for ten seconds. The chat button itself stays.
  const quiet = `<script>(function(){var n=0,t=setInterval(function(){var w=document.querySelector("chat-widget"),r=w&&w.shadowRoot;if(r){clearInterval(t);var s=document.createElement("style");s.textContent=".lc_text-widget--prompt{display:none!important}";r.appendChild(s);if(matchMedia("(min-width:768px)").matches)setTimeout(function(){s.remove()},10000)}else if(++n>80)clearInterval(t)},250)})()</script>`;
  return `${css}<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${id}"></script>${quiet}`;
}

/** Fallbacks under the kit's own CSS: legal pages and form messages stay readable even if the kit missed them. */
const BASE_CSS = `.legal{max-width:760px;margin:0 auto;padding:clamp(48px,8vw,112px) 20px;line-height:1.7}.legal h2{margin-top:2em}.legal-note{padding:14px 18px;border:1px solid currentColor;border-radius:12px;opacity:.85}
.form-thanks{padding:24px;border-radius:16px;border:1px solid currentColor;font-weight:600}.form-error{color:#c0262d;font-weight:600;margin-top:10px}`;

/**
 * QA guard after the kit's CSS: the header stays on one line. Nav labels, phone and buttons never
 * wrap, and between tablet and wide desktop the header row scales down a little so it fits.
 */
export const HEADER_CSS = `header a,header button,header summary,header li,header [class*="phone"],header [class*="btn"]{white-space:nowrap}
@media (min-width:900px) and (max-width:1279px){header>*{zoom:.88}}
/* The chat bubble sits bottom-right: leave room under the footer so it never covers the credit line. */
body>footer::after{content:"";display:block;height:84px}`;

/**
 * The footer credit for an account's sites. Mianro's own line is the default (the design SOP);
 * Mianro can switch an account to its own name and link, or to none.
 */
export function creditFor(t: Pick<Tenant, "creditMode" | "creditName" | "creditUrl">): string {
  if (t.creditMode === "none") return "";
  const name = t.creditName.trim();
  if (t.creditMode === "custom" && name) {
    const url = /^https:\/\/[^\s"'<>]+$/.test(t.creditUrl) ? t.creditUrl : "";
    const who = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name);
    return `<span class="mianro-credit">Made with <span class="mianro-heart" role="img" aria-label="love">♥</span> by ${who}</span>`;
  }
  return CREDIT;
}

/** The older template page's footer credit, in the account's own words (the Mianro default is left as it is). */
export function templateCredit(html: string, t: Pick<Tenant, "creditMode" | "creditName" | "creditUrl">): string {
  if (t.creditMode === "mianro") return html;
  const line = /<span class="fg-credit">[\s\S]*?<\/a><\/span>/;
  if (t.creditMode === "none") return html.replace(line, "");
  const name = t.creditName.trim();
  if (!name) return html;
  const url = /^https:\/\/[^\s"'<>]+$/.test(t.creditUrl) ? t.creditUrl : "";
  const who = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name);
  return html.replace(line, `<span class="fg-credit">Made with <span class="fg-heart" role="img" aria-label="love">♥</span> by ${who}</span>`);
}

/** The chat widget for a site: the demo's own, else the account's; only Mianro's account falls back to the Mianro widget. */
export function widgetFor(tenant: Pick<Tenant, "id" | "chatWidget">, demoWidget: string): string {
  return widgetId(demoWidget, widgetId(tenant.chatWidget, tenant.id === 1 ? DEFAULT_WIDGET_ID : ""));
}

/** One page of a multi-page site as a full HTML document. */
export function assemble(kit: Kit, page: PageDraft, slug: string, credit: string = CREDIT): string {
  const key = JSON.stringify(`fg-theme-${slug}`);
  // Apply a saved light/dark choice before the first paint.
  const boot = `<script>try{var t=localStorage.getItem(${key});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>`;
  const studio = kit.style === "studio";
  const accent = /^#[0-9a-f]{6}$/i.test(kit.accent) ? kit.accent : "#111111";
  // A site icon (the accent colour with the page's first letter), so browsers don't ask for one that isn't there.
  const icon = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><text x="32" y="44" font-family="Georgia,serif" font-size="36" font-weight="700" text-anchor="middle" fill="#fff">${esc((page.title.trim()[0] ?? "•").toUpperCase())}</text></svg>`)}">`;
  const doc = `<!doctype html><html lang="en" data-theme="${kit.theme}"${studio ? ` style="--m-accent:${accent}"` : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(page.title)}</title>${icon}<meta name="description" content="${esc(page.description)}"><meta name="robots" content="noindex">
${boot}${kit.fonts}<style>${BASE_CSS}\n${kit.css}${page.css ? `\n${tidyCss(page.css)}` : ""}\n${HEADER_CSS}\n${HERO_CSS}\n${CREDIT_CSS}\n${QA_CSS}${studio ? MOTION_CSS : ""}</style></head><body>
${kit.header}
${page.body}
${kit.footer.split(CREDIT_MARKER).join(credit)}
<script>${kit.script}</script><script>${QA_JS}</script>${studio ? motionScripts() : ""}</body></html>`;
  // The QA standards that need no judgement: +1 on phone links, legal links always in the footer.
  const legal = (path: string) => !pagesOf(kit).some((p) => p.path === path) || new RegExp(`href\\s*=\\s*["']${path}["']`, "i").test(kit.footer);
  return qaFixHtml(doc, { hasPrivacy: legal("/privacy"), hasTerms: legal("/terms") });
}

/**
 * Sends every form on the page to `url` (the demo's lead inbox in the team app) and swaps the form
 * for a confirmation. Runs before the page's own handlers, so each form is sent exactly once.
 */
export function formScript(url: string): string {
  return `<script>document.addEventListener("submit",function(e){var f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();e.stopImmediatePropagation();if(!f.reportValidity())return;var d={};new FormData(f).forEach(function(v,k){if(typeof v==="string"&&v.trim())d[k]=d[k]?d[k]+", "+v:v});var b=f.querySelector("button[type=submit],button:not([type]),input[type=submit]");if(b)b.disabled=true;var old=f.querySelector(".form-error");if(old)old.remove();fetch(${JSON.stringify(url)},{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({page:location.pathname,fields:d})}).then(function(r){if(!r.ok)throw 0;var t=document.createElement("div");t.className="form-thanks";t.setAttribute("role","status");t.tabIndex=-1;t.textContent="Thanks! We've got your details and will be in touch shortly.";f.replaceWith(t);t.focus()}).catch(function(){if(b)b.disabled=false;var m=document.createElement("p");m.className="form-error";m.setAttribute("role","alert");m.textContent="Sorry, that didn't send. Please try again or give us a call.";f.appendChild(m)})},true);</script>`;
}

/**
 * Point the site's root-relative links ("/services") at this demo ("/<slug>/services"),
 * mark the current page in the nav, fill the hero's motion layer, and add the chat widget.
 */
export interface OgTags {
  title: string;
  description: string;
  url: string;
  image: string | null;
}

/** Social/link-preview tags for a demo page (iMessage, WhatsApp, Slack and co. read these). */
export function ogHtml(og: OgTags): string {
  return `<meta property="og:type" content="website"><meta property="og:title" content="${esc(og.title)}"><meta property="og:description" content="${esc(og.description)}"><meta property="og:url" content="${esc(og.url)}">${
    og.image ? `<meta property="og:image" content="${esc(og.image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">` : '<meta name="twitter:card" content="summary">'
  }`;
}

export function finish(res: Response, opts: { prefix: string; current: string | null; widget: string; leadUrl: string; heroMotion?: string; legacyHero?: boolean; og?: OgTags }): Response {
  const local = (v: string | null) => !!v && v.startsWith("/") && !v.startsWith("//");
  const move = (v: string) => {
    const [, path, rest] = v.match(/^([^?#]*)(.*)$/)!;
    return `${opts.prefix}${path === "/" ? "" : path}${rest}`;
  };
  let r = new HTMLRewriter()
    .on("head", {
      element(e) {
        if (opts.og) e.append(ogHtml(opts.og), { html: true });
      },
    })
    .on("a[href]", {
      element(e) {
        const href = e.getAttribute("href");
        if (!local(href)) return;
        if (opts.current !== null && href === opts.current) e.setAttribute("aria-current", "page");
        e.setAttribute("href", move(href!));
      },
    })
    .on("form[action]", {
      element(e) {
        const a = e.getAttribute("action");
        if (local(a)) e.setAttribute("action", move(a!));
      },
    });
  // The home hero's moving background (a library video, or the site's photos animated).
  if (opts.heroMotion) {
    let filled = false;
    const fill = (e: HTMLElement, legacy: boolean) => {
      if (filled) return;
      filled = true;
      if (legacy) e.setAttribute("class", `${e.getAttribute("class") ?? ""} hero-motion-fill`);
      e.setInnerContent(opts.heroMotion!, { html: true });
    };
    r = r.on(".hero-motion", { element: (e) => fill(e, false) });
    if (opts.legacyHero) r = r.on(LEGACY_HERO_BG, { element: (e) => fill(e, true) });
  }
  r = r.on("body", { element: (e) => e.append(formScript(opts.leadUrl) + opts.widget, { html: true }) });
  return r.transform(res);
}
