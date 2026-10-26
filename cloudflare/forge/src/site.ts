/**
 * Serving demo websites: put a multi-page site together from its kit and page,
 * point its links at the demo's own address, and add the GoHighLevel chat widget
 * in the site's primary colour.
 */
import { esc } from "../../../src/forge/render";
import type { Kit, PageDraft } from "./designer";

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

/** One page of a multi-page site as a full HTML document. */
export function assemble(kit: Kit, page: PageDraft, slug: string): string {
  const key = JSON.stringify(`fg-theme-${slug}`);
  // Apply a saved light/dark choice before the first paint.
  const boot = `<script>try{var t=localStorage.getItem(${key});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>`;
  return `<!doctype html><html lang="en" data-theme="${kit.theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="noindex">
${boot}${kit.fonts}<style>${kit.css}${page.css ? `\n${page.css}` : ""}</style></head><body>
${kit.header}
${page.body}
${kit.footer}
<script>${kit.script}</script></body></html>`;
}

/**
 * Point the site's root-relative links ("/services") at this demo ("/<slug>/services"),
 * mark the current page in the nav, and add the chat widget.
 */
export function finish(res: Response, opts: { prefix: string; current: string | null; widget: string }): Response {
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
  if (opts.widget) r = r.on("body", { element: (e) => e.append(opts.widget, { html: true }) });
  return r.transform(res);
}
