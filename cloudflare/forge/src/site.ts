/**
 * Serving demo websites: put a multi-page site together from its kit and page,
 * point its links at the demo's own address, deliver its forms to the team app,
 * and add the GoHighLevel chat widget in the site's primary colour.
 */
import { esc } from "../../../src/forge/render";
import { CREDIT, CREDIT_CSS, CREDIT_MARKER, tidyCss, type Kit, type PageDraft } from "./designer";

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
  return `${css}<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${id}"></script>`;
}

/** Fallbacks under the kit's own CSS: legal pages and form messages stay readable even if the kit missed them. */
const BASE_CSS = `.legal{max-width:760px;margin:0 auto;padding:clamp(48px,8vw,112px) 20px;line-height:1.7}.legal h2{margin-top:2em}.legal-note{padding:14px 18px;border:1px solid currentColor;border-radius:12px;opacity:.85}
.form-thanks{padding:24px;border-radius:16px;border:1px solid currentColor;font-weight:600}.form-error{color:#c0262d;font-weight:600;margin-top:10px}`;

/** One page of a multi-page site as a full HTML document. */
export function assemble(kit: Kit, page: PageDraft, slug: string): string {
  const key = JSON.stringify(`fg-theme-${slug}`);
  // Apply a saved light/dark choice before the first paint.
  const boot = `<script>try{var t=localStorage.getItem(${key});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>`;
  return `<!doctype html><html lang="en" data-theme="${kit.theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="noindex">
${boot}${kit.fonts}<style>${BASE_CSS}\n${kit.css}${page.css ? `\n${tidyCss(page.css)}` : ""}\n${CREDIT_CSS}</style></head><body>
${kit.header}
${page.body}
${kit.footer.split(CREDIT_MARKER).join(CREDIT)}
<script>${kit.script}</script></body></html>`;
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
 * mark the current page in the nav, and add the chat widget.
 */
export function finish(res: Response, opts: { prefix: string; current: string | null; widget: string; leadUrl: string }): Response {
  const local = (v: string | null) => !!v && v.startsWith("/") && !v.startsWith("//");
  const move = (v: string) => {
    const [, path, rest] = v.match(/^([^?#]*)(.*)$/)!;
    return `${opts.prefix}${path === "/" ? "" : path}${rest}`;
  };
  let r = new HTMLRewriter()
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
  r = r.on("body", { element: (e) => e.append(formScript(opts.leadUrl) + opts.widget, { html: true }) });
  return r.transform(res);
}
