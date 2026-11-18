/**
 * The sample gallery (forge-sites, /examples): finished designs shown under made-up business names, so a
 * rep can share the same examples with any prospect. Nothing is built for it: each sample is one of the
 * account's live sites served again with its name, phone, email and address swapped for a sample's (or,
 * with "Try it with your business", for the prospect's own). Forms on a sample keep nothing, views aren't
 * counted on the real demo, and samples don't expire.
 */

export interface Sample {
  /** The address: /examples/<id>. */
  id: string;
  /** The live site it shows. */
  slug: string;
  trade: string;
  edition: "Studio" | "Standard";
  name: string;
  /** A reserved fictional number (555-0100 to 555-0199), in the source's area code. */
  phone: string;
  email: string;
  /** Other ways the source's name is written on its pages (a short name, a possessive), and what replaces each. */
  swaps: [string, string][];
}

export const SAMPLES: Sample[] = [
  { id: "plumbing", slug: "the-plumbers-db585ae2", trade: "Plumbing", edition: "Studio", name: "Harbor Line Plumbing", phone: "3055550142", email: "hello@harborlineplumbing.com", swaps: [["THE PLUMBERS", "HARBOR LINE PLUMBING"], ["Water, held. The plumbers.", "Water, held."]] },
  { id: "plumbing-classic", slug: "o-hara-plumbing-co-inc-f725053b", trade: "Plumbing", edition: "Studio", name: "Prairie Pipe & Drain", phone: "3085550117", email: "office@prairiepipe.com", swaps: [["O'Hara Plumbing Co", "Prairie Pipe & Drain"], ["O’Hara Plumbing", "Prairie Pipe & Drain"], ["O'Hara Plumbing", "Prairie Pipe & Drain"], ["O’Hara’s", "Prairie’s"], ["O'Hara's", "Prairie's"], ["O’Hara", "Prairie"], ["O'Hara", "Prairie"], ["O&#39;Hara", "Prairie"], ["O'HARA", "PRAIRIE"]] },
  { id: "towing", slug: "figueroa-s-towing-460e8a4c", trade: "Towing", edition: "Studio", name: "Coastline Towing", phone: "4075550163", email: "dispatch@coastlinetowing.com", swaps: [["Figueroa’s", "Coastline"], ["Figueroa's", "Coastline"], ["Figueroa&#39;s", "Coastline"], ["FIGUEROA’S", "COASTLINE"], ["Figueroa", "Coastline"], ["FIGUEROA", "COASTLINE"]] },
  { id: "landscaping", slug: "olvin-s-landscaping-co-b0845b96", trade: "Landscaping", edition: "Studio", name: "Greenfield Landscaping Co.", phone: "3035550128", email: "yards@greenfieldlandscaping.com", swaps: [["Olvin’s", "Greenfield"], ["Olvin's", "Greenfield"], ["Olvin&#39;s", "Greenfield"], ["OLVIN’S", "GREENFIELD"], ["Olvin", "Greenfield"], ["OLVIN", "GREENFIELD"]] },
  { id: "tree-service", slug: "t-boys-04300bec", trade: "Tree service", edition: "Studio", name: "Bayou Tree Co.", phone: "3375550136", email: "crew@bayoutree.com", swaps: [["T Boys", "Bayou Tree Co."], ["T BOYS", "BAYOU TREE CO."], ["T-Boys", "Bayou Tree Co."]] },
  { id: "bakery", slug: "madruga-bakery-037746ad", trade: "Bakery", edition: "Studio", name: "Morning Loaf Bakery", phone: "3055550175", email: "orders@morningloaf.com", swaps: [["MADRUGA", "MORNING LOAF"], ["Madruga", "Morning Loaf"]] },
  { id: "florist", slug: "flower-house-67049291", trade: "Florist", edition: "Studio", name: "Petal & Stem", phone: "3375550181", email: "hello@petalandstem.com", swaps: [["FLOWER HOUSE", "PETAL & STEM"]] },
  { id: "med-spa", slug: "eco-beauty-medspa-miami-e32dc457", trade: "Med spa", edition: "Standard", name: "Lumen MedSpa", phone: "3055550194", email: "care@lumenmedspa.com", swaps: [["Eco Beauty MedSpa", "Lumen MedSpa"], ["Eco Beauty", "Lumen"], ["ECO BEAUTY", "LUMEN"]] },
  { id: "auto-repair", slug: "bob-s-garage-c4e2acc3", trade: "Auto repair", edition: "Standard", name: "Courthouse Auto Repair", phone: "8595550123", email: "service@courthouseauto.com", swaps: [["Bob’s Garage", "Courthouse Auto Repair"], ["Bob's Garage", "Courthouse Auto Repair"], ["Bob&#39;s Garage", "Courthouse Auto Repair"], ["BOB’S GARAGE", "COURTHOUSE AUTO REPAIR"], ["BOB'S GARAGE", "COURTHOUSE AUTO REPAIR"], ["Bob’s", "Courthouse Auto’s"], ["Bob's", "Courthouse Auto's"], ["Bob, owner", "The owner"]] },
];

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);

const digitsOf = (p: string) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};

/** Every common way a 10-digit US number is written, from the most specific (so "+1…" goes before the bare digits). */
function phoneForms(d: string): string[] {
  if (d.length !== 10) return d ? [d] : [];
  const [a, b, c] = [d.slice(0, 3), d.slice(3, 6), d.slice(6)];
  return [`+1 (${a}) ${b}-${c}`, `+1 ${a}-${b}-${c}`, `+1 ${a} ${b} ${c}`, `+1.${a}.${b}.${c}`, `+1${d}`, `1-${a}-${b}-${c}`, `(${a}) ${b}-${c}`, `(${a})${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`, `${a} ${b} ${c}`, `1${d}`, d];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const replaceAll = (html: string, from: string, to: string) => (from && from !== to ? html.split(from).join(to) : html);

/** What a visitor typed into "Try it with your business" (kept short and plain). */
export function ownDetails(url: URL): { name: string; phone: string } | null {
  const name = (url.searchParams.get("name") ?? "").replace(/[\u0000-\u001f<>{}]/g, "").trim().slice(0, 60);
  const phone = digitsOf(url.searchParams.get("phone") ?? "");
  if (!name && phone.length !== 10) return null;
  return { name, phone: phone.length === 10 ? phone : "" };
}

/** Pairs to swap in a page, longest first (a name inside a longer name is never half-replaced). */
export function swapsFor(sample: Sample, source: { businessName: string; phone?: string; email?: string; address?: string; city?: string }, own: { name: string; phone: string } | null): [string, string][] {
  const name = own?.name || sample.name;
  const phone = own?.phone || sample.phone;
  const pairs: [string, string][] = [];
  const names = [source.businessName, source.businessName.replace(/[’']/g, (q) => (q === "’" ? "'" : "’"))];
  for (const n of new Set(names)) {
    pairs.push([n, name], [esc(n), esc(name)], [n.toUpperCase(), name.toUpperCase()], [esc(n).toUpperCase(), esc(name).toUpperCase()]);
  }
  // The sample's own short forms go to the visitor's name too.
  // (A swap that rewrites a phrase rather than naming the business keeps its wording.)
  const naming = (to: string) => sample.name.toLowerCase().startsWith(to.toLowerCase().split(/[’'\s]/)[0] ?? "~");
  for (const [from, to] of sample.swaps) {
    const out = own?.name && naming(to) ? (from === from.toUpperCase() ? name.toUpperCase() : name) : to;
    pairs.push([from, out], [esc(from), esc(out)]);
  }
  const fromForms = phoneForms(digitsOf(source.phone ?? ""));
  const toForms = phoneForms(phone);
  fromForms.forEach((f, i) => pairs.push([f, toForms[i] ?? toForms[toForms.length - 1] ?? ""]));
  if (source.email) pairs.push([source.email, sample.email]);
  // The street address goes (the town stays: the sample is a business there).
  const town = (source.city ?? "").split(",").slice(0, 2).join(",").trim();
  if (source.address && source.address !== source.city) pairs.push([source.address, town], [esc(source.address), esc(town)]);
  return pairs.filter(([f]) => f.length >= 3).sort((x, y) => y[0].length - x[0].length);
}

/** A page of a sample: the source's page with every swap made. */
export function personalise(html: string, pairs: [string, string][]): string {
  for (const [from, to] of pairs) html = replaceAll(html, from, to);
  return html;
}

/** The bar on every sample page: it says it is a sample and lets the visitor put their own business in. */
export function sampleBar(sample: Sample, own: { name: string; phone: string } | null): string {
  return `<details id="forge-sample-bar" style="position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:min(520px,calc(100vw - 100px));background:#111;color:#fff;font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.28)">
<summary style="cursor:pointer;padding:9px 13px;list-style:none;font-weight:600">Sample design · try it with your business</summary>
<form method="get" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0;padding:0 12px 12px">
<span style="flex:1 1 100%;opacity:.85">${own ? "Showing your business." : `${esc(sample.name)} is a made-up business.`} Type a name and phone and the whole site shows them.</span>
<input name="name" placeholder="Business name" value="${esc(own?.name ?? "")}" aria-label="Business name" style="flex:1 1 150px;min-width:0;padding:7px 9px;border-radius:8px;border:0;font:inherit;color:#111">
<input name="phone" placeholder="Phone" value="${esc(own?.phone ?? "")}" aria-label="Phone" inputmode="tel" style="flex:1 1 110px;min-width:0;padding:7px 9px;border-radius:8px;border:0;font:inherit;color:#111">
<button style="padding:7px 12px;border-radius:8px;border:0;background:#fff;color:#111;font:inherit;font-weight:600;cursor:pointer">Show me</button>
<a href="/examples" style="color:#fff;opacity:.8">All samples</a>
</form></details>`;
}

/** Links inside a sample keep the visitor's own name and phone as they move between pages. */
export function carryDetails(html: string, prefix: string, own: { name: string; phone: string } | null): string {
  if (!own) return html;
  const q = new URLSearchParams({ ...(own.name ? { name: own.name } : {}), ...(own.phone ? { phone: own.phone } : {}) }).toString().replace(/&/g, "&amp;");
  return html.replace(new RegExp(`href="(${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/[a-z0-9-]+){0,2}/?)(#[^"]*)?"`, "g"), (_m, path: string, hash = "") => `href="${path}?${q}${hash}"`);
}

/** The gallery's index page. */
export function galleryPage(shots: Record<string, string>): string {
  const cards = SAMPLES.map(
    (s) => `<li><a href="/examples/${s.id}">${shots[s.id] ? `<img src="${esc(shots[s.id]!)}" alt="" loading="lazy">` : `<span class="noimg">${esc(s.name)}</span>`}<b>${esc(s.name)}</b><span>${esc(s.trade)} · ${s.edition}</span></a></li>`,
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sample websites</title>
<style>:root{--bg:#f6f5f2;--ink:#151515;--mut:#5d5d5d;--card:#fff;--line:#e3e1dc}@media (prefers-color-scheme:dark){:root{--bg:#121212;--ink:#f1f1f1;--mut:#a9a9a9;--card:#1c1c1c;--line:#2c2c2c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1200px;margin:0 auto;padding:56px 20px 80px}
h1{font-size:clamp(32px,5vw,52px);line-height:1.05;letter-spacing:-.02em;font-weight:500;margin:0 0 12px}p{color:var(--mut);max-width:62ch;margin:0 0 28px}
form{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 40px;max-width:640px}input{flex:1 1 200px;min-width:0;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font:inherit}button{padding:12px 18px;border:0;border-radius:10px;background:var(--ink);color:var(--bg);font:inherit;font-weight:600;cursor:pointer}
ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:24px}a{color:inherit;text-decoration:none}li a{display:flex;flex-direction:column;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 10px 16px;transition:transform .3s}li a:hover{transform:translateY(-2px)}
li img,.noimg{display:grid;place-items:center;font-size:24px;font-weight:600;color:var(--mut);width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:8px;background:var(--line)}li b{font-weight:600;padding:6px 6px 0}li span{color:var(--mut);padding:0 6px;font-size:14px}</style></head>
<body><main><h1>Sample websites</h1><p>Each one is a finished design, shown under a made-up business. Type a business name and phone number below and every sample shows them instead.</p>
<form method="get" action="/examples" id="own"><input name="name" placeholder="Business name" aria-label="Business name"><input name="phone" placeholder="Phone" inputmode="tel" aria-label="Phone"><button>Show them with my business</button></form>
<ul>${cards}</ul></main>
<script>(()=>{const q=new URLSearchParams(location.search);const f=document.getElementById("own");f.name.value=q.get("name")||"";f.phone.value=q.get("phone")||"";if(!q.get("name")&&!q.get("phone"))return;const s=new URLSearchParams();if(q.get("name"))s.set("name",q.get("name"));if(q.get("phone"))s.set("phone",q.get("phone"));document.querySelectorAll("li a").forEach(a=>a.href=a.getAttribute("href")+"?"+s)})()</script></body></html>`;
}
