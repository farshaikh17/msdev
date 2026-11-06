/**
 * The public Forge website. A light (warm paper) and a dark (deep ink) theme, switchable from the
 * header and remembered per visitor; real screenshots of real sites in device frames; small,
 * dependency-free scripts for the theme, the menu, the build demo and the work filter.
 */
import { esc } from "../../../src/forge/render";
import { FAQS, GUIDES, INCLUDED, TRADES, TRADE_GROUPS, type Faq, type Guide, type Plan, type Trade, tradeBySlug } from "./web-content";
import { KIND_LABEL, WORK, type Work, img } from "./web-work";

export interface Showcase {
  slug: string;
  name: string;
  trade: string;
  url: string;
  image: string | null;
}

export interface Shell {
  title: string;
  desc: string;
  path: string;
  origin: string;
  signedIn: boolean;
  jsonld?: unknown[];
  status?: number;
  noindex?: boolean;
  /** Social preview image (a path on this site). */
  image?: string;
}

/** Mianro's booking link (from forge.mianrosystems.com). */
export const CALL_URL = "https://calendly.com/mianro/forge-demo";

// ---- Icons (stroke icons, 24px grid) -----------------------------------------------------------

const PATHS: Record<string, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  out: '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-1 2-2 0-1.4 1-2 2.2-2H18a3 3 0 0 0 3-3c0-6-4-11-9-11Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-8Z"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9S14.5 18.2 12 21c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.3C1.4 7.2 3.6 4 7 4c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.6 3.2 4.3 6.7C19.5 15.4 12 20 12 20Z"/>',
};
export const ic = (name: string, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] ?? ""}</svg>`;

// ---- Styles ----------------------------------------------------------------------------------

const CSS = `
:root{--bg:#fbf6ee;--bg2:#f4ecdf;--surface:#fffdf9;--surface2:#fff;--ink:#14161c;--ink2:#2b303b;--muted:#5d6472;--line:rgba(20,22,28,.1);--line2:rgba(20,22,28,.16);
--ember:#e4572e;--ember-d:#c4421c;--amber:#f2a33a;--glow:rgba(228,87,46,.18);--chip:#fff;--shadow:0 1px 2px rgba(20,22,28,.05),0 12px 40px -12px rgba(20,22,28,.18);--shadow-lg:0 40px 100px -30px rgba(20,22,28,.35);
--frame:#1b1f29;--frame2:#2a2f3c;--band:#10172a;--band-ink:#eef1f7;--band-muted:#a9b3c6;
--serif:"Fraunces",Georgia,serif;--sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--r:18px;color-scheme:light}
[data-theme=dark]{--bg:#090c13;--bg2:#0d121c;--surface:#111826;--surface2:#151d2d;--ink:#f1f3f8;--ink2:#d6dbe6;--muted:#97a1b4;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);
--ember:#ff6b3d;--ember-d:#ff8a63;--amber:#ffb454;--glow:rgba(255,107,61,.22);--chip:#151d2d;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 50px -18px rgba(0,0,0,.7);--shadow-lg:0 50px 120px -30px rgba(0,0,0,.85);
--frame:#05070b;--frame2:#1a2130;--band:#0e1524;--band-ink:#f1f3f8;--band-muted:#9aa6bb;color-scheme:dark}
@media (prefers-color-scheme:dark){:root:not([data-theme]){--bg:#090c13;--bg2:#0d121c;--surface:#111826;--surface2:#151d2d;--ink:#f1f3f8;--ink2:#d6dbe6;--muted:#97a1b4;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--ember:#ff6b3d;--ember-d:#ff8a63;--glow:rgba(255,107,61,.22);--chip:#151d2d;--frame:#05070b;--band:#0e1524;color-scheme:dark}}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 var(--sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;transition:background .3s,color .3s}
h1,h2,h3,h4{font-family:var(--serif);font-weight:600;line-height:1.08;letter-spacing:-.02em;margin:0;text-wrap:balance;font-variation-settings:"opsz" 120}
h1{font-size:clamp(2.5rem,6.4vw,5rem)}h2{font-size:clamp(1.9rem,4.2vw,3.1rem)}h3{font-size:1.28rem;letter-spacing:-.01em}
em.x{font-style:italic;font-weight:500;background:linear-gradient(100deg,var(--ember),var(--amber));-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.06em}
p{margin:0}a{color:var(--ember-d)}img{max-width:100%;display:block}
.i{width:20px;height:20px;flex:none}
.wrap{max-width:1220px;margin:0 auto;padding:0 max(20px,env(safe-area-inset-left,0px))}
.skip{position:absolute;left:-999px}.skip:focus{left:12px;top:12px;background:var(--surface);padding:8px 12px;z-index:99;border-radius:8px}
/* header */
header.hd{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);border-bottom:1px solid var(--line)}
.hd-in{display:flex;align-items:center;gap:20px;height:68px}
.logo{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font:600 1.4rem var(--serif);letter-spacing:-.02em}
.logo b{font:500 .68rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-left:2px;align-self:flex-end;padding-bottom:5px}
.mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(140deg,var(--amber),var(--ember) 55%,#b8321a);display:grid;place-items:center;color:#fff;box-shadow:0 6px 20px -6px var(--ember)}
.mark svg{width:18px;height:18px}
.menu{display:flex;align-items:center;gap:4px;margin-left:auto;font-size:.93rem;font-weight:500}
.menu>a{color:var(--ink2);text-decoration:none;padding:8px 12px;border-radius:999px;white-space:nowrap}.menu>a:hover,.menu>a.on{color:var(--ink);background:var(--line)}
.tbtn{width:40px;height:40px;border-radius:50%;border:1px solid var(--line2);background:var(--chip);color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none}
.tbtn:hover{border-color:var(--ember)}.tbtn .moon{display:none}[data-theme=dark] .tbtn .sun{display:none}[data-theme=dark] .tbtn .moon{display:block}
.burger{display:none;margin-left:auto;align-items:center;gap:8px}.burger details{position:static}
.burger summary{list-style:none;cursor:pointer;width:40px;height:40px;border-radius:50%;border:1px solid var(--line2);display:grid;place-items:center;background:var(--chip)}
.burger summary::-webkit-details-marker{display:none}
.burger nav{position:absolute;left:0;right:0;top:100%;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 20px 22px;display:grid;gap:2px;box-shadow:var(--shadow)}
.burger nav a{padding:13px 4px;color:var(--ink);text-decoration:none;font-weight:500;border-bottom:1px solid var(--line)}
@media (max-width:980px){.menu{display:none}.burger{display:flex}}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--ink);color:var(--bg);border:0;border-radius:999px;padding:13px 22px;font:600 .96rem var(--sans);text-decoration:none;cursor:pointer;transition:transform .18s,box-shadow .18s,background .18s;white-space:nowrap}
.btn:hover{transform:translateY(-1px)}.btn .i{width:18px;height:18px;transition:transform .18s}.btn:hover .i{transform:translateX(2px)}
.btn.hot{background:linear-gradient(135deg,var(--ember),#d9421a);color:#fff;box-shadow:0 10px 30px -10px var(--ember)}.btn.hot:hover{box-shadow:0 16px 40px -12px var(--ember)}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line2)}.btn.ghost:hover{border-color:var(--ink)}
.btn.sm{padding:9px 16px;font-size:.88rem}.btn.lg{padding:16px 28px;font-size:1.02rem}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font:600 .74rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--ember-d)}
.eyebrow::before{content:"";width:22px;height:1.5px;background:currentColor}
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;border-radius:999px;border:1px solid var(--line2);background:var(--chip);font:500 .84rem var(--sans);color:var(--ink2)}
.pill i{font-style:normal;background:var(--ember);color:#fff;border-radius:999px;padding:2px 9px;font-size:.72rem;font-weight:600;letter-spacing:.04em}
.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18);flex:none}
section{padding:110px 0;position:relative}section.tight{padding:64px 0}
.lead{font-size:clamp(1.05rem,1.6vw,1.2rem);color:var(--muted);max-width:62ch;line-height:1.6}
.center{text-align:center}.center .lead{margin-inline:auto}
.head{display:flex;justify-content:space-between;align-items:end;gap:20px 40px;flex-wrap:wrap;margin-bottom:48px}.head .lead{margin-top:14px}
.alt{background:var(--bg2)}
/* hero */
.hero{padding:70px 0 40px;overflow:hidden}
.hero::before{content:"";position:absolute;inset:-20% -10% auto auto;width:900px;height:900px;background:radial-gradient(closest-side,var(--glow),transparent);pointer-events:none}
.hero::after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 70% 60% at 50% 30%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 30%,#000 30%,transparent 75%);opacity:.6;pointer-events:none}
.hero .wrap{position:relative;z-index:1}
.hero-copy{max-width:880px;margin:0 auto;text-align:center;display:grid;justify-items:center;gap:24px}
.hero h1{font-weight:600}.hero .lead{max-width:640px}
.cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.facts{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 26px;color:var(--muted);font-size:.9rem}.facts span{display:inline-flex;gap:7px;align-items:center}.facts .i{width:17px;height:17px;color:var(--ember)}
.stage{position:relative;margin:64px auto 0;max-width:1100px;perspective:2000px}
.laptop{position:relative;border-radius:16px;background:var(--frame);padding:10px 10px 0;box-shadow:var(--shadow-lg);border:1px solid var(--line2)}
.laptop .bar{display:flex;align-items:center;gap:6px;padding:4px 6px 10px}.laptop .bar i{width:10px;height:10px;border-radius:50%;background:#3a4152}.laptop .bar i:first-child{background:#ff5f57}.laptop .bar i:nth-child(2){background:#febc2e}.laptop .bar i:nth-child(3){background:#28c840}
.laptop .bar b{margin:0 auto;font:500 .75rem var(--sans);color:#8b93a5;background:#1d2230;border-radius:7px;padding:4px 40px;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.screen{border-radius:8px 8px 0 0;overflow:hidden;aspect-ratio:16/10;background:#0b0f17;position:relative}
.screen img{width:100%;height:100%;object-fit:cover;object-position:top;position:absolute;inset:0;transition:opacity .9s ease}
.screen img.off{opacity:0}
.phone{position:absolute;width:23%;min-width:150px;right:-3%;bottom:-8%;border-radius:34px;background:var(--frame);padding:9px;box-shadow:var(--shadow-lg);border:1px solid var(--line2)}
.phone .scr{border-radius:26px;overflow:hidden;aspect-ratio:390/844;position:relative;background:#0b0f17}
.phone .scr img{width:100%;height:100%;object-fit:cover;object-position:top;position:absolute;inset:0;transition:opacity .9s}.phone .scr img.off{opacity:0}
.phone::before{content:"";position:absolute;top:16px;left:50%;transform:translateX(-50%);width:30%;height:18px;background:var(--frame);border-radius:12px;z-index:2}
.float{position:absolute;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line2);border-radius:16px;padding:12px 16px;box-shadow:var(--shadow);font-size:.86rem;z-index:3;animation:bob 6s ease-in-out infinite}
.float b{display:block;font-size:.92rem}.float small{color:var(--muted)}.float .ico{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--glow);color:var(--ember)}
.f1{left:-4%;top:18%}.f2{left:6%;bottom:-6%;animation-delay:-3s}
@keyframes bob{50%{transform:translateY(-8px)}}
@media (max-width:760px){.f1,.f2{display:none}.phone{right:-2%;bottom:-10%;width:30%;min-width:0;border-radius:22px;padding:5px}.phone .scr{border-radius:18px}.phone::before{top:9px;height:10px}.stage{margin-top:40px}.laptop{padding:6px 6px 0;border-radius:12px}.laptop .bar{padding:2px 4px 6px}.laptop .bar b{display:none}}
/* marquee */
.strip{padding:70px 0 30px;overflow:hidden}
.strip p.cap{text-align:center;color:var(--muted);font-size:.9rem;margin-bottom:26px}
.track{display:flex;gap:18px;width:max-content;animation:slide 70s linear infinite}.track.rev{animation-direction:reverse;margin-top:18px}
.strip:hover .track{animation-play-state:paused}
.track a{display:block;width:320px;border-radius:14px;overflow:hidden;border:1px solid var(--line2);box-shadow:var(--shadow);flex:none;aspect-ratio:16/10;background:var(--surface)}
.track img{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform .5s}.track a:hover img{transform:scale(1.04)}
@keyframes slide{to{transform:translateX(-50%)}}
/* build demo */
.demo{display:grid;grid-template-columns:.9fr 1.1fr;gap:56px;align-items:center}@media (max-width:900px){.demo{grid-template-columns:1fr}}
.console{background:var(--surface);border:1px solid var(--line2);border-radius:22px;padding:26px;box-shadow:var(--shadow);display:grid;gap:18px}
.field{display:flex;align-items:center;gap:12px;border:1px solid var(--line2);border-radius:14px;padding:14px 16px;background:var(--bg);font-weight:500}
.field .i{color:var(--muted)}.caret{display:inline-block;width:2px;height:1.1em;background:var(--ember);vertical-align:-3px;margin-left:2px;animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
.steps-live{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.steps-live li{display:flex;gap:12px;align-items:center;color:var(--muted);font-size:.95rem;transition:color .3s}
.steps-live li span{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line2);display:grid;place-items:center;flex:none;transition:.3s}
.steps-live li span svg{width:14px;height:14px;opacity:0;color:#fff}
.steps-live li.done{color:var(--ink)}.steps-live li.done span{background:var(--ember);border-color:var(--ember)}.steps-live li.done span svg{opacity:1}
.steps-live li.now span{border-color:var(--ember);border-top-color:transparent;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.prog{height:6px;border-radius:9px;background:var(--line);overflow:hidden}.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--ember),var(--amber));transition:width .5s}
.result .laptop{transform:none}
/* bento */
.bento{display:grid;grid-template-columns:repeat(12,1fr);gap:18px}
.tile{grid-column:span 4;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:28px;display:grid;gap:12px;align-content:start;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
.tile:hover{border-color:var(--line2);transform:translateY(-2px)}.tile p{color:var(--muted);font-size:.96rem}
.tile .ico{width:46px;height:46px;border-radius:14px;background:var(--glow);color:var(--ember);display:grid;place-items:center}.tile .ico .i{width:22px;height:22px}
.tile.wide{grid-column:span 6}.tile.q{grid-column:span 3}.tile.big{grid-column:span 8;grid-row:span 2}
.tile.big .phones{display:flex;gap:14px;margin-top:10px;max-height:330px;overflow:hidden;mask-image:linear-gradient(#000 75%,transparent);-webkit-mask-image:linear-gradient(#000 75%,transparent)}.tile.big .phones img{width:31%;border-radius:18px;border:5px solid var(--frame);box-shadow:var(--shadow);align-self:flex-start}
@media (max-width:980px){.bento{grid-template-columns:repeat(2,1fr)}.tile,.tile.wide,.tile.q{grid-column:span 1}.tile.big{grid-column:span 2;grid-row:auto}}
@media (max-width:620px){.bento{grid-template-columns:1fr}.tile,.tile.wide,.tile.q,.tile.big{grid-column:span 1}}
/* work cards */
.works{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}@media (max-width:980px){.works{grid-template-columns:repeat(2,1fr)}}@media (max-width:640px){.works{grid-template-columns:1fr}}
.wcard{display:grid;gap:14px;color:inherit;text-decoration:none}
.wshot{border-radius:16px;overflow:hidden;border:1px solid var(--line2);aspect-ratio:4/3;background:var(--surface);box-shadow:var(--shadow);position:relative}
.wshot img{width:100%;height:100%;object-fit:cover;object-position:50% 0;transition:object-position 7s cubic-bezier(.4,0,.2,1),transform .4s}
.wcard:hover .wshot img,.wcard:focus-visible .wshot img{object-position:50% 100%}
.wshot .kind{position:absolute;top:12px;left:12px;background:rgba(10,12,18,.72);color:#fff;backdrop-filter:blur(8px);font:600 .72rem var(--sans);letter-spacing:.04em;padding:5px 11px;border-radius:999px}
.wshot .kind.ai{background:linear-gradient(135deg,var(--ember),#d9421a)}
.wmeta{display:flex;justify-content:space-between;gap:12px;align-items:start}.wmeta b{font:600 1.12rem var(--serif);letter-spacing:-.01em}.wmeta small{display:block;color:var(--muted);font-size:.86rem;margin-top:2px}
.wmeta .go{width:38px;height:38px;border-radius:50%;border:1px solid var(--line2);display:grid;place-items:center;flex:none;transition:.2s}.wcard:hover .go{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:34px}
.filters button{font:500 .88rem var(--sans);padding:9px 16px;border-radius:999px;border:1px solid var(--line2);background:var(--chip);color:var(--ink2);cursor:pointer}
.filters button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.wcard[hidden]{display:none}
/* split audience */
.aud{display:grid;grid-template-columns:1fr 1fr;gap:24px}@media (max-width:860px){.aud{grid-template-columns:1fr}}
.acard{border-radius:26px;padding:42px;display:grid;gap:18px;align-content:start;border:1px solid var(--line);background:var(--surface);position:relative;overflow:hidden}
.acard.dark{background:var(--band);color:var(--band-ink);border-color:transparent}.acard.dark p,.acard.dark li{color:var(--band-muted)}.acard.dark .eyebrow{color:#ffb08f}
.acard .btn{justify-self:start}
.ticks{list-style:none;padding:0;margin:4px 0 6px;display:grid;gap:12px}.ticks li{display:flex;gap:12px;align-items:flex-start}
.ticks li .i{width:22px;height:22px;padding:4px;border-radius:50%;background:var(--glow);color:var(--ember);margin-top:1px}
/* stats + band */
.band{background:var(--band);color:var(--band-ink)}.band .lead,.band p{color:var(--band-muted)}.band .eyebrow{color:#ffb08f}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:28px}@media (max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}}
.stats b{display:block;font:600 clamp(2.4rem,5vw,3.6rem)/1 var(--serif);letter-spacing:-.03em;background:linear-gradient(120deg,#fff,#ffc8b0);-webkit-background-clip:text;background-clip:text;color:transparent}
.stats span{display:block;margin-top:10px;color:var(--band-muted);font-size:.95rem}
/* steps */
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;counter-reset:s}@media (max-width:900px){.steps{grid-template-columns:repeat(2,1fr)}}@media (max-width:560px){.steps{grid-template-columns:1fr}}
.steps.three{grid-template-columns:repeat(3,1fr)}@media (max-width:900px){.steps.three{grid-template-columns:1fr}}
.step{padding:28px;border-radius:var(--r);background:var(--surface);border:1px solid var(--line);display:grid;gap:10px;align-content:start}
.step b{font:600 .8rem var(--sans);letter-spacing:.12em;color:var(--ember-d)}.step p{color:var(--muted);font-size:.95rem}
/* compare */
.cmp-wrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--line);background:var(--surface)}
table.cmp{width:100%;border-collapse:collapse;min-width:640px}.cmp th,.cmp td{padding:18px 22px;text-align:left;border-bottom:1px solid var(--line);font-size:.95rem}
.cmp th{font:600 .74rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.cmp tr:last-child td{border-bottom:0}
.cmp td:first-child{font-weight:600}.cmp td.us{color:var(--ink);font-weight:600;background:var(--glow)}.cmp th.us{color:var(--ember-d);background:var(--glow)}
/* pricing */
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;align-items:stretch}
.plan{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:34px;display:grid;gap:16px;align-content:start;position:relative}
.plan.hot{border:1.5px solid var(--ember);box-shadow:0 30px 70px -30px var(--ember)}
.plan .tagx{position:absolute;top:-13px;left:30px;background:linear-gradient(135deg,var(--ember),#d9421a);color:#fff;font:600 .7rem var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
.price{font:600 3.2rem/1 var(--serif);letter-spacing:-.03em}.per{font-size:.88rem;color:var(--muted)}.plan p{color:var(--muted)}
/* faq */
.faq{display:grid;gap:12px;max-width:860px;margin:0 auto}
.faq details{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:2px 24px;transition:border-color .2s}.faq details[open]{border-color:var(--line2)}
.faq summary{cursor:pointer;font:600 1.04rem var(--sans);padding:20px 0;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";font:400 1.6rem/1 var(--sans);color:var(--ember);transition:transform .2s}.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{padding:0 0 22px;color:var(--muted)}
/* cta */
.cta{position:relative;overflow:hidden;border-radius:32px;padding:80px 32px;text-align:center;display:grid;gap:22px;justify-items:center;background:radial-gradient(120% 140% at 50% 0%,#ff7a45 0%,#e4572e 38%,#a8301a 100%);color:#fff}
.cta::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at center,#000,transparent 70%);-webkit-mask-image:radial-gradient(ellipse at center,#000,transparent 70%)}
.cta>*{position:relative;z-index:1}.cta p{color:#ffe6dc;max-width:54ch;font-size:1.12rem}
.cta .btn{background:#fff;color:#a8301a}.cta .btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.5)}
/* footer */
footer.ft{border-top:1px solid var(--line);padding:70px 0 34px;font-size:.93rem;background:var(--bg2)}
.ft-grid{display:grid;grid-template-columns:1.7fr repeat(3,1fr);gap:36px}@media (max-width:800px){.ft-grid{grid-template-columns:1fr 1fr}}
footer h4{font:600 .74rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
footer a{color:var(--ink2);text-decoration:none;display:block;padding:4px 0}footer a:hover{color:var(--ember-d)}
.ft-bot{border-top:1px solid var(--line);margin-top:44px;padding-top:22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:.86rem}
.ft-bot .heart{color:#e0245e;font-size:1.15em}.ft-bot a{display:inline;color:var(--ink)}
/* inner pages */
.pagehead{padding:80px 0 30px;position:relative}.pagehead h1{font-size:clamp(2.3rem,5.4vw,4.2rem);max-width:18ch}.pagehead .lead{margin-top:20px}
.crumb{font-size:.86rem;color:var(--muted);margin-bottom:16px}.crumb a{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:28px;display:grid;gap:10px;align-content:start;color:inherit;text-decoration:none;transition:.2s}
a.card:hover{border-color:var(--ember);transform:translateY(-2px)}.card p{color:var(--muted);font-size:.95rem}
.card .ico{width:44px;height:44px;border-radius:13px;background:var(--glow);color:var(--ember);display:grid;place-items:center}
.tag{display:inline-block;font:600 .7rem var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--glow);color:var(--ember-d);justify-self:start}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.trade{display:grid;gap:4px;padding:20px 22px;border-radius:16px;background:var(--surface);border:1px solid var(--line);text-decoration:none;color:var(--ink);font-weight:600;transition:.2s}
.trade small{font-weight:400;color:var(--muted);font-size:.86rem}.trade:hover{border-color:var(--ember);transform:translateY(-2px)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}@media (max-width:900px){.split{grid-template-columns:1fr}}
.prose{max-width:720px}.prose h2{margin:44px 0 14px;font-size:1.75rem}.prose p{margin:0 0 18px;font-size:1.07rem;color:var(--ink2)}
.search{display:flex;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:6px;max-width:560px;box-shadow:var(--shadow)}
.search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;padding:10px 16px;color:var(--ink)}.search input:focus{outline:0}.search:focus-within{border-color:var(--ember)}
/* work detail */
.wd{display:grid;grid-template-columns:1.45fr 1fr;gap:48px;align-items:start}@media (max-width:960px){.wd{grid-template-columns:1fr}}
.wd .screen.tall{aspect-ratio:auto;height:min(70vh,640px);overflow-y:auto;overscroll-behavior:contain}.wd .screen.tall img{position:static;height:auto}
.wd aside{display:grid;gap:22px;position:sticky;top:96px}
.wd .phone{position:relative;right:auto;bottom:auto;width:210px;margin-top:-140px;margin-left:auto;margin-right:-20px}@media (max-width:960px){.wd .phone{display:none}}
.kv{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;font-size:.92rem}.kv dt{color:var(--muted)}.kv dd{margin:0;font-weight:500}
.next{display:grid;grid-template-columns:1fr 1fr;gap:16px}
/* forms */
form.f{background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:34px;display:grid;gap:18px;box-shadow:var(--shadow)}
form.f .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:600px){form.f .two{grid-template-columns:1fr}form.f{padding:24px}}
form.f label{display:grid;gap:7px;font-size:.88rem;font-weight:600}
form.f input,form.f textarea,form.f select{font:inherit;font-weight:400;border:1px solid var(--line2);border-radius:12px;padding:13px 15px;background:var(--bg);color:var(--ink);width:100%}
form.f input:focus,form.f textarea:focus,form.f select:focus{outline:3px solid var(--glow);border-color:var(--ember)}
.formgrid{display:grid;grid-template-columns:1fr 1.25fr;gap:56px;align-items:start}@media (max-width:900px){.formgrid{grid-template-columns:1fr}}
.hp{position:absolute;left:-5000px;height:0;overflow:hidden}
.err{background:rgba(220,38,38,.12);color:#dc2626;border-radius:12px;padding:12px 16px;font-weight:600}[data-theme=dark] .err{color:#fca5a5}
.okbox{background:var(--surface);border:1px solid var(--line);border-radius:28px;padding:48px;display:grid;gap:16px;justify-items:start}
.okbox .ico{width:56px;height:56px;border-radius:50%;background:var(--glow);color:var(--ember);display:grid;place-items:center}
.small{font-size:.86rem;color:var(--muted)}
/* reveal */
.js .rv{opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}.js .rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.js .rv{opacity:1;transform:none}}
`;

// ---- Scripts ---------------------------------------------------------------------------------

/** Runs before first paint: the saved theme (or the system's), so there's no flash. */
const THEME_BOOT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem("forge-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t);d.classList.add("js")})()`;

const SITE_JS = `(function(){
var d=document.documentElement;
document.querySelectorAll("[data-theme-toggle]").forEach(function(b){b.addEventListener("click",function(){var t=d.getAttribute("data-theme")==="dark"?"light":"dark";d.setAttribute("data-theme",t);try{localStorage.setItem("forge-theme",t)}catch(e){}b.setAttribute("aria-label","Switch to "+(t==="dark"?"light":"dark")+" mode")})});
document.addEventListener("click",function(e){var m=document.querySelector(".burger details[open]");if(m&&!m.contains(e.target))m.removeAttribute("open")});
var io="IntersectionObserver" in window?new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}})},{rootMargin:"0px 0px -8% 0px"}):null;
document.querySelectorAll(".rv").forEach(function(el){io?io.observe(el):el.classList.add("in")});
// rotating hero screens
document.querySelectorAll("[data-rotate]").forEach(function(box){var imgs=box.querySelectorAll("img"),n=0;if(imgs.length<2)return;setInterval(function(){imgs[n].classList.add("off");n=(n+1)%imgs.length;imgs[n].classList.remove("off");var lbl=box.closest(".stage,.result");if(lbl){var u=lbl.querySelector("[data-url]");if(u)u.textContent=imgs[n].getAttribute("data-host")||""}},4200)});
document.querySelectorAll("[data-rotate-phone]").forEach(function(box){var imgs=box.querySelectorAll("img"),n=0;if(imgs.length<2)return;setTimeout(function(){setInterval(function(){imgs[n].classList.add("off");n=(n+1)%imgs.length;imgs[n].classList.remove("off")},4200)},2100)});
// the build demo
var demo=document.querySelector("[data-demo]");
if(demo){var names=JSON.parse(demo.getAttribute("data-demo")),field=demo.querySelector("[data-type]"),items=demo.querySelectorAll(".steps-live li"),bar=demo.querySelector(".prog i"),shot=demo.querySelectorAll("[data-shot] img"),k=0,started=false;
function run(){var item=names[k%names.length],txt=item.name,i=0;field.textContent="";items.forEach(function(li){li.className=""});bar.style.width="0";
var typer=setInterval(function(){field.textContent=txt.slice(0,++i);if(i>=txt.length){clearInterval(typer);step(0)}},55);
function step(s){if(s>=items.length){shot.forEach(function(im,j){im.classList.toggle("off",j!==k%names.length)});k++;setTimeout(run,4200);return}items[s].className="now";setTimeout(function(){items[s].className="done";bar.style.width=((s+1)/items.length*100)+"%";step(s+1)},650)}}
if(io){new IntersectionObserver(function(es,o){if(es[0].isIntersecting&&!started){started=true;o.disconnect();run()}}).observe(demo)}else run()}
// work filter
var fl=document.querySelector("[data-filter]");
if(fl){fl.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;fl.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});var v=b.getAttribute("data-v");document.querySelectorAll("[data-tags]").forEach(function(c){c.hidden=v!=="all"&&c.getAttribute("data-tags").split(" ").indexOf(v)<0})})}
})();`;

// ---- Layout ----------------------------------------------------------------------------------

const NAV: [string, string][] = [
  ["/work", "Our work"],
  ["/how-it-works", "How it works"],
  ["/pricing", "Pricing"],
  ["/resellers", "For agencies"],
  ["/guides", "Guides"],
];

function chrome(sh: Shell, body: string): string {
  const on = (p: string) => (sh.path === p || sh.path.startsWith(p + "/") ? ' class="on"' : "");
  const links = NAV.map(([p, l]) => `<a href="${p}"${on(p)}>${l}</a>`).join("");
  const account = sh.signedIn ? `<a href="/">Dashboard</a>` : `<a href="/login">Sign in</a>`;
  const canonical = `${sh.origin}${sh.path === "/" ? "/" : sh.path}`;
  const og = `${sh.origin}${sh.image ?? img("pollux")}`;
  const ld = (sh.jsonld ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("");
  const toggle = `<button class="tbtn" type="button" data-theme-toggle aria-label="Switch light or dark mode" title="Light or dark mode">${ic("sun", "i sun")}${ic("moon", "i moon")}</button>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script>${THEME_BOOT}</script>
<title>${esc(sh.title)}</title><meta name="description" content="${esc(sh.desc)}">
${sh.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:title" content="${esc(sh.title)}"><meta property="og:description" content="${esc(sh.desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}"><meta property="og:site_name" content="Forge by Mianro Systems"><meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0b0f17">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&display=swap">
<style>${CSS}</style>${ld}</head><body><a class="skip" href="#main">Skip to main content</a>
<header class="hd"><div class="wrap hd-in"><a class="logo" href="/" aria-label="Forge home"><span class="mark">${ic("bolt")}</span>Forge<b>by Mianro</b></a>
<nav class="menu" aria-label="Main">${links}${account}<span style="width:6px"></span>${toggle}<span style="width:6px"></span><a class="btn hot sm" href="/preview">Free preview</a></nav>
<div class="burger">${toggle}<details><summary aria-label="Menu">${ic("menu")}</summary><nav aria-label="Mobile">${links}${account}<a class="btn hot" style="margin-top:14px;border:0" href="/preview">Get your free preview</a></nav></details></div></div></header>
<main id="main">${body}</main>
<footer class="ft"><div class="wrap"><div class="ft-grid">
<div><a class="logo" href="/"><span class="mark">${ic("bolt")}</span>Forge</a><p style="max-width:36ch;color:var(--muted);margin-top:14px">Premium websites for local businesses, designed by AI in minutes and finished by people who care. Built by Mianro Systems.</p>
<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap"><a class="btn hot sm" style="display:inline-flex" href="/preview">Free preview</a><a class="btn ghost sm" style="display:inline-flex" href="${CALL_URL}" target="_blank" rel="noopener">Book a call</a></div></div>
<div><h4>Product</h4><a href="/work">Our work</a><a href="/how-it-works">How it works</a><a href="/pricing">Pricing</a><a href="/trades">Trades</a><a href="/faq">Questions</a></div>
<div><h4>Partners</h4><a href="/resellers">For agencies</a><a href="/resellers/apply">Become a partner</a><a href="/guides">Guides</a><a href="/login">Sign in</a></div>
<div><h4>Company</h4><a href="/contact">Contact</a><a href="https://forge.mianrosystems.com" target="_blank" rel="noopener">Forge by Mianro</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/sitemap.xml">Sitemap</a></div></div>
<div class="ft-bot"><span>© ${new Date().getUTCFullYear()} Mianro Systems. All rights reserved.</span><span>Made with <span class="heart">♥</span> by <a href="https://mianrosystems.com">Mianro Systems</a></span></div></div></footer>
<script>${SITE_JS}</script>
</body></html>`;
}

export function shell(sh: Shell, body: string): Response {
  return new Response(chrome(sh, body), {
    status: sh.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-cache", "x-content-type-options": "nosniff", "x-frame-options": "SAMEORIGIN", "referrer-policy": "strict-origin-when-cross-origin" },
  });
}

// ---- Shared pieces ---------------------------------------------------------------------------

const host = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

const ctaBand = (title = "See your business on a website like these.", sub = "Tell us the business. We'll build a free preview and send you the link. No card, no commitment.") =>
  `<section class="tight"><div class="wrap"><div class="cta rv"><span class="eyebrow" style="color:#fff">Free preview</span><h2 style="max-width:18ch">${esc(title)}</h2><p>${esc(sub)}</p><div class="cta-row"><a class="btn lg" href="/preview">Get my free preview ${ic("arrow")}</a><a class="btn ghost lg" href="${CALL_URL}" target="_blank" rel="noopener">Book a call</a></div></div></div></section>`;

const faqList = (items: Faq[] = FAQS) => `<div class="faq">${items.map((f) => `<details class="rv"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>`;
const tradeName = (t: Trade) => (t.name === "Gym or studio" ? "Gyms & studios" : t.who.replace(/^./, (c) => c.toUpperCase()));
const tradeCard = (t: Trade) => `<a class="trade" href="/trades/${t.slug}">${esc(tradeName(t))}<small>${esc(t.services.slice(0, 3).join(" · "))}</small></a>`;

function laptop(urls: Work[], opts: { rotate?: boolean; eager?: boolean } = {}): string {
  const first = urls[0]!;
  return `<div class="laptop"><div class="bar"><i></i><i></i><i></i><b data-url>${esc(host(first.url))}</b></div><div class="screen"${opts.rotate ? " data-rotate" : ""}>${urls
    .map((w, j) => `<img src="${img(w.id)}" data-host="${esc(host(w.url))}" alt="${esc(w.name)} website" width="1280" height="800"${j ? ' class="off" loading="lazy"' : opts.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`)
    .join("")}</div></div>`;
}

function phone(urls: Work[], rotate = false): string {
  return `<div class="phone"><div class="scr"${rotate ? " data-rotate-phone" : ""}>${urls.map((w, j) => `<img src="${img(w.id, "-phone")}" alt="${esc(w.name)} on a phone" width="390" height="844" loading="lazy" decoding="async"${j ? ' class="off"' : ""}>`).join("")}</div></div>`;
}

function workCard(w: Work, i = 0): string {
  const tags = [w.kind, w.tradeSlug].join(" ");
  return `<a class="wcard rv" href="/work/${w.id}" data-tags="${esc(tags)}" style="transition-delay:${(i % 3) * 80}ms"><div class="wshot"><img src="${img(w.id, "-long")}" alt="${esc(w.name)} website, full page" loading="lazy" decoding="async" width="720" height="3000"><span class="kind${w.kind === "instant" ? " ai" : ""}">${KIND_LABEL[w.kind]}</span></div>
<div class="wmeta"><div><b>${esc(w.name)}</b><small>${esc(w.trade)} · ${esc(w.place)}</small></div><span class="go">${ic("arrow")}</span></div></a>`;
}

function showcaseCard(s: Showcase): string {
  return `<a class="wcard rv" href="${esc(s.url)}" target="_blank" rel="noopener" data-tags="instant"><div class="wshot">${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.name)} website" loading="lazy">` : ""}<span class="kind ai">New from Forge</span></div><div class="wmeta"><div><b>${esc(s.name)}</b><small>${esc(s.trade)}</small></div><span class="go">${ic("out")}</span></div></a>`;
}

// ---- Home ------------------------------------------------------------------------------------

export function homePage(plans: Plan[], showcase: Showcase[]): string {
  const ai = WORK.filter((w) => w.kind === "instant");
  const half = Math.ceil(WORK.length / 2);
  const row = (list: Work[]) => [...list, ...list].map((w) => `<a href="/work/${w.id}" aria-label="${esc(w.name)}" tabindex="-1"><img src="${img(w.id, "-sm")}" alt="" loading="lazy" decoding="async" width="640" height="400"></a>`).join("");
  return `<section class="hero"><div class="wrap"><div class="hero-copy">
<span class="pill"><i>New</i> AI-designed websites for local businesses</span>
<h1>Websites that win the work. <em class="x">Designed in minutes.</em></h1>
<p class="lead">Forge builds a complete, multi-page website for any local business from just its name: real pages, photos, working forms and a map. See yours before you pay a cent.</p>
<div class="cta-row"><a class="btn hot lg" href="/preview">Get my free preview ${ic("arrow")}</a><a class="btn ghost lg" href="/work">See our work</a></div>
<div class="facts"><span>${ic("layers")}15+ pages per site</span><span>${ic("bolt")}Ready in minutes</span><span>${ic("moon")}Light &amp; dark mode</span><span>${ic("inbox")}Forms that reach you</span></div></div>
<div class="stage rv">${laptop(ai, { rotate: true, eager: true })}${phone([WORK[1]!, WORK[2]!, WORK[0]!], true)}
<div class="float f1"><span class="ico">${ic("spark")}</span><div><b>Designed from a name</b><small>"Pollux Air Conditioning, Miami"</small></div></div>
<div class="float f2"><span class="ico">${ic("inbox")}</span><div><b>New quote request</b><small>Sent to your inbox and CRM</small></div></div></div></div></section>

<div class="strip" aria-label="Sites built with Forge"><p class="cap">Real sites, built with Forge</p><div class="track">${row(WORK.slice(0, half))}</div><div class="track rev">${row(WORK.slice(half))}</div></div>

<section><div class="wrap demo"><div class="rv"><span class="eyebrow">How it works</span><h2 style="margin-top:14px">Type a business. <em class="x">Watch it become a website.</em></h2>
<p class="lead" style="margin-top:18px">Give Forge a name and a city, or paste the Google Maps link. It reads what's public about the business, plans the pages, writes the words, makes the photos and puts it all together, while you get on with your day.</p>
<div class="cta-row" style="justify-content:flex-start;margin-top:28px"><a class="btn" href="/how-it-works">See how it works ${ic("arrow")}</a></div></div>
<div class="console rv" data-demo='${esc(JSON.stringify(ai.map((w) => ({ name: `${w.name}, ${w.place}` }))))}'>
<div class="field">${ic("globe")}<span><span data-type>${esc(`${ai[0]!.name}, ${ai[0]!.place}`)}</span><span class="caret"></span></span></div>
<ol class="steps-live"><li class="done"><span>${ic("check")}</span>Reading the business's public details</li><li class="done"><span>${ic("check")}</span>Planning 15+ pages for the trade</li><li class="done"><span>${ic("check")}</span>Writing the copy in a local voice</li><li class="done"><span>${ic("check")}</span>Making photos and choosing a hero video</li><li class="done"><span>${ic("check")}</span>Adding forms, map and chat</li><li class="done"><span>${ic("check")}</span>Live on its own link</li></ol>
<div class="prog"><i style="width:100%"></i></div>
<div class="result" data-shot>${laptop(ai)}</div></div></div></section>

<section class="alt"><div class="wrap"><div class="head"><div class="rv"><span class="eyebrow">Our work</span><h2 style="margin-top:14px;max-width:16ch">Sites our clients are proud to send</h2><p class="lead">Hover a site to scroll the whole page. Every one is live.</p></div><a class="btn ghost rv" href="/work">All work ${ic("arrow")}</a></div>
<div class="works">${[WORK[0]!, WORK[3]!, WORK[1]!, WORK[6]!, WORK[2]!, WORK[8]!].map(workCard).join("")}${showcase.slice(0, 3).map(showcaseCard).join("")}</div></div></section>

<section><div class="wrap"><div class="head"><div class="rv"><span class="eyebrow">What you get</span><h2 style="margin-top:14px;max-width:18ch">Everything a local business site needs. Nothing it doesn't.</h2></div></div>
<div class="bento">
<div class="tile big rv"><span class="ico">${ic("phone")}</span><h3>Made for the phone in their pocket</h3><p>Most customers find a local business on their phone. Every Forge site is designed phone-first: a one-line header, a tap-to-call button and a quote form that's always one thumb away.</p><div class="phones">${[WORK[0]!, WORK[1]!, WORK[2]!].map((w) => `<img src="${img(w.id, "-phone")}" alt="${esc(w.name)} on a phone" loading="lazy" width="390" height="844">`).join("")}</div></div>
<div class="tile rv"><span class="ico">${ic("layers")}</span><h3>Every page they need</h3><p>15 or more real pages: home, services with a page each, about, reviews, gallery, areas, FAQs, quote and contact, plus the legal pages.</p></div>
<div class="tile rv"><span class="ico">${ic("palette")}</span><h3>A design that fits the trade</h3><p>Colours, type and layout chosen for the business, not stamped from a template.</p></div>
<div class="tile q rv"><span class="ico">${ic("image")}</span><h3>Photos and hero video</h3><p>Fresh photos for every site and a hero video that suits the trade.</p></div>
<div class="tile q rv"><span class="ico">${ic("inbox")}</span><h3>Leads that land</h3><p>Quote and contact forms save every enquiry and can send it straight to your CRM.</p></div>
<div class="tile q rv"><span class="ico">${ic("pin")}</span><h3>Local details, right</h3><p>Address, hours and a Google Map, read from the business's own listing.</p></div>
<div class="tile q rv"><span class="ico">${ic("moon")}</span><h3>Light and dark mode</h3><p>Every site looks right either way, and visitors can switch.</p></div>
</div></div></section>

<section class="band"><div class="wrap"><div class="stats rv"><div><b>15+</b><span>pages in every site</span></div><div><b>Minutes</b><span>from a name to a live link</span></div><div><b>${TRADES.length}</b><span>trades with tailored designs</span></div><div><b>$0</b><span>to see your preview</span></div></div></div></section>

<section><div class="wrap"><div class="center rv" style="margin-bottom:48px"><span class="eyebrow">Who it's for</span><h2 style="margin-top:14px">Two ways to use Forge</h2></div>
<div class="aud"><div class="acard rv"><span class="eyebrow">Business owners</span><h3 style="font-size:2rem">A website that brings in work</h3><p class="lead" style="font-size:1.05rem">Tell us your business. We'll show you a finished preview first, then launch it and look after it when you're happy.</p>
<ul class="ticks"><li>${ic("check")}See it before you pay anything</li><li>${ic("check")}Launched on your own domain</li><li>${ic("check")}Changes and updates handled for you</li></ul><a class="btn hot" href="/preview">Get my free preview ${ic("arrow")}</a></div>
<div class="acard dark rv"><span class="eyebrow">Agencies &amp; freelancers</span><h3 style="font-size:2rem">Sell websites under your own name</h3><p class="lead" style="font-size:1.05rem">Build previews for every prospect in minutes. Your brand on every site, your prices, your clients.</p>
<ul class="ticks"><li>${ic("check")}Your name on every site, or none</li><li>${ic("check")}Team sign-ins, API and webhooks</li><li>${ic("check")}Simple credit packs, failed builds refunded</li></ul><a class="btn" style="background:#fff;color:#10172a" href="/resellers">Become a partner ${ic("arrow")}</a></div></div></div></section>

<section class="alt"><div class="wrap"><div class="center rv" style="margin-bottom:40px"><span class="eyebrow">Why Forge</span><h2 style="margin-top:14px">The fastest way to a site worth sending</h2></div>
<div class="cmp-wrap rv"><table class="cmp"><thead><tr><th></th><th>Traditional agency</th><th>DIY builder</th><th class="us">Forge</th></tr></thead><tbody>
<tr><td>First draft</td><td>Weeks</td><td>Your evenings</td><td class="us">Minutes</td></tr>
<tr><td>See it before you pay</td><td>Rarely</td><td>You build it first</td><td class="us">Always</td></tr>
<tr><td>Pages</td><td>Usually 5–8</td><td>What you make</td><td class="us">15+</td></tr>
<tr><td>Design made for your trade</td><td>Yes</td><td>Templates</td><td class="us">Yes</td></tr>
<tr><td>Forms, map and chat</td><td>Extra</td><td>Plug-ins</td><td class="us">Included</td></tr></tbody></table></div></div></section>

<section><div class="wrap"><div class="head"><div class="rv"><span class="eyebrow">For agencies</span><h2 style="margin-top:14px">Credit packs for partners</h2><p class="lead">One credit is one finished site. Packs never expire.</p></div><a class="btn ghost rv" href="/pricing">Full pricing ${ic("arrow")}</a></div>${plansHtml(plans)}</div></section>

<section class="alt"><div class="wrap"><div class="head"><div class="rv"><span class="eyebrow">The playbook</span><h2 style="margin-top:14px">Guides for winning local clients</h2></div><a class="btn ghost rv" href="/guides">All guides ${ic("arrow")}</a></div>
<div class="cards">${GUIDES.slice(0, 3).map(guideCard).join("")}</div></div></section>

<section><div class="wrap"><div class="center rv" style="margin-bottom:44px"><span class="eyebrow">Questions</span><h2 style="margin-top:14px">Good to know</h2></div>${faqList(FAQS.slice(0, 6))}<p class="center" style="margin-top:26px"><a href="/faq">All questions →</a></p></div></section>
${ctaBand()}`;
}

function guideCard(g: Guide): string {
  return `<a class="card rv" href="/guides/${g.slug}"><span class="tag">${esc(g.read)} read</span><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></a>`;
}

export function plansHtml(plans: Plan[]): string {
  return `<div class="plans">${plans
    .map(
      (p) =>
        `<div class="plan rv${p.featured ? " hot" : ""}">${p.featured ? '<span class="tagx">Most popular</span>' : ""}<h3>${esc(p.name)}</h3><div class="price">${esc(p.price)}</div><div class="per">${p.credits} credits · about ${esc(per(p))} per site</div><p>${esc(p.blurb)}</p><a class="btn${p.featured ? " hot" : " ghost"}" href="/resellers/apply?plan=${encodeURIComponent(p.name)}">Choose ${esc(p.name)}</a></div>`,
    )
    .join("")}</div>`;
}

function per(p: Plan): string {
  const n = Number(p.price.replace(/[^0-9.]/g, ""));
  return p.credits > 0 && n > 0 ? `$${(n / p.credits).toFixed(2)}` : "—";
}

// ---- Work ------------------------------------------------------------------------------------

export function workIndex(showcase: Showcase[]): string {
  const trades = [...new Set(WORK.map((w) => w.tradeSlug))];
  const label = (s: string) => {
    const t = tradeBySlug(s);
    return t ? tradeName(t) : s;
  };
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">Our work</span><h1>Real sites, <em class="x">live today</em></h1><p class="lead">Instant builds designed by Forge from a business name, and custom builds by the Mianro team. Hover to scroll a whole page; open any one to explore it.</p></div></div>
<section class="tight" style="padding-top:20px"><div class="wrap"><div class="filters" data-filter role="group" aria-label="Filter work"><button type="button" data-v="all" aria-pressed="true">All</button><button type="button" data-v="instant" aria-pressed="false">Built by Forge AI</button><button type="button" data-v="custom" aria-pressed="false">Custom builds</button>${trades
    .map((t) => `<button type="button" data-v="${esc(t)}" aria-pressed="false">${esc(label(t))}</button>`)
    .join("")}</div>
<div class="works">${showcase.map(showcaseCard).join("")}${WORK.map(workCard).join("")}</div></div></section>${ctaBand("Want one like these?")}`;
}

export function workDetail(w: Work): string {
  const i = WORK.indexOf(w);
  const prev = WORK[(i - 1 + WORK.length) % WORK.length]!;
  const next = WORK[(i + 1) % WORK.length]!;
  return `<div class="pagehead" style="padding-bottom:40px"><div class="wrap"><div class="crumb"><a href="/work">Our work</a> / ${esc(w.name)}</div><span class="tag" style="margin-bottom:14px">${KIND_LABEL[w.kind]}</span><h1 style="margin-top:12px">${esc(w.name)}</h1><p class="lead">${esc(w.blurb)}</p>
<div class="cta-row" style="justify-content:flex-start;margin-top:26px"><a class="btn hot" href="${esc(w.url)}" target="_blank" rel="noopener">Open the live site ${ic("out")}</a><a class="btn ghost" href="/preview?trade=${esc(w.tradeSlug)}">Get a site like this</a></div></div></div>
<section class="tight" style="padding-top:10px"><div class="wrap wd"><div><div class="laptop"><div class="bar"><i></i><i></i><i></i><b>${esc(host(w.url))}</b></div><div class="screen tall" tabindex="0" aria-label="Scroll the ${esc(w.name)} home page"><img src="${img(w.id, "-long")}" alt="${esc(w.name)} home page, full length" width="720" height="3000" loading="lazy"></div></div>${phone([w])}</div>
<aside><dl class="kv"><dt>Trade</dt><dd>${esc(w.trade)}</dd><dt>Where</dt><dd>${esc(w.place)}</dd><dt>Type</dt><dd>${KIND_LABEL[w.kind]}</dd><dt>Look</dt><dd>${esc(w.look)}</dd></dl>
<div><h3 style="margin-bottom:14px">Highlights</h3><ul class="ticks">${w.highlights.map((h) => `<li>${ic("check")}${esc(h)}</li>`).join("")}</ul></div>
<p class="small">Scroll inside the screen to see the whole home page.</p></aside></div></section>
<section class="tight"><div class="wrap"><div class="next"><a class="card" href="/work/${prev.id}"><span class="small">← Previous</span><h3>${esc(prev.name)}</h3></a><a class="card" style="text-align:right" href="/work/${next.id}"><span class="small">Next →</span><h3>${esc(next.name)}</h3></a></div></div></section>${ctaBand(`Want a site like ${w.name}?`)}`;
}

// ---- Inner pages -----------------------------------------------------------------------------

const STEPS_FULL = [
  { t: "Tell us the business", d: "A name and a city, or paste its Google Maps link. If it already has a website, Forge reads the facts from it." },
  { t: "Forge designs it", d: "AI plans the pages for the trade, writes the copy, makes the photos and builds a design that fits the business." },
  { t: "Share the link", d: "Every site has its own link. Send it, put it on a GoHighLevel page, or let your own system pick it up through the API." },
  { t: "Launch and win", d: "When it's a yes, it goes live on the business's domain, and its forms are already capturing leads." },
];

export function howPage(): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">How it works</span><h1>From a business name to a <em class="x">finished website</em></h1><p class="lead">Forge takes the slow, expensive part of building a website, the first full draft, and makes it take minutes.</p></div></div>
<section class="tight"><div class="wrap"><div class="steps">${STEPS_FULL.map((s, i) => `<div class="step rv"><b>STEP ${i + 1}</b><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join("")}</div></div></section>
<section class="alt"><div class="wrap split"><div class="rv"><span class="eyebrow">Inside every site</span><h2 style="margin-top:14px">Built like a real agency would build it</h2><ul class="ticks" style="margin-top:24px">${INCLUDED.map((i) => `<li>${ic("check")}${esc(i)}</li>`).join("")}</ul></div><div class="stage rv" style="margin:0">${laptop([WORK[2]!])}${phone([WORK[2]!])}</div></div></section>
<section><div class="wrap"><div class="cards">
<div class="card rv"><span class="ico">${ic("palette")}</span><h3>A design system per site</h3><p>Colours, type, spacing and components chosen for the business and used on every page, so it feels like one brand.</p></div>
<div class="card rv"><span class="ico">${ic("pin")}</span><h3>Real local details</h3><p>Name, address, hours and map come from the business's own listing or website when they're public.</p></div>
<div class="card rv"><span class="ico">${ic("inbox")}</span><h3>Forms that work from day one</h3><p>Every quote and contact form saves the enquiry and can notify your system the moment it arrives.</p></div>
<div class="card rv"><span class="ico">${ic("lock")}</span><h3>Safe by design</h3><p>Each account sees only its own work, sites run isolated from the app, and any account can be switched off at once.</p></div></div></div></section>${ctaBand()}`;
}

export function pricingPage(plans: Plan[]): string {
  return `<div class="pagehead center"><div class="wrap" style="display:grid;justify-items:center"><span class="eyebrow">Pricing</span><h1 style="margin-inline:auto">Simple, honest pricing</h1><p class="lead">Business owners get a done-for-you website. Agencies and freelancers buy credits and build as many previews as they need.</p></div></div>
<section class="tight"><div class="wrap"><div class="aud"><div class="acard rv"><span class="eyebrow">For business owners</span><h3 style="font-size:2rem">Done for you</h3><p class="lead" style="font-size:1.05rem">We build your preview free. If you love it, we launch it on your domain and look after it, as part of the Forge system for trades.</p>
<ul class="ticks"><li>${ic("check")}Free preview, no card needed</li><li>${ic("check")}Launch, hosting and updates handled</li><li>${ic("check")}Add missed-call text-back, reviews and follow-up</li></ul>
<div class="cta-row" style="justify-content:flex-start"><a class="btn hot" href="/preview">Get my free preview ${ic("arrow")}</a><a class="btn ghost" href="https://forge.mianrosystems.com/pricing" target="_blank" rel="noopener">See Forge plans ${ic("out")}</a></div></div>
<div class="acard dark rv"><span class="eyebrow">For agencies &amp; freelancers</span><h3 style="font-size:2rem">Credit packs</h3><p class="lead" style="font-size:1.05rem">One credit builds one finished site. Failed builds are refunded automatically, and packs never expire.</p>
<ul class="ticks"><li>${ic("check")}Your brand on every site</li><li>${ic("check")}Unlimited team members</li><li>${ic("check")}API keys and signed webhooks</li></ul><a class="btn" style="background:#fff;color:#10172a" href="#packs">See the packs ${ic("arrow")}</a></div></div></div></section>
<section class="alt" id="packs"><div class="wrap"><div class="center rv" style="margin-bottom:44px"><span class="eyebrow">Partner packs</span><h2 style="margin-top:14px">Credit packs</h2></div>${plansHtml(plans)}<p class="small center" style="margin-top:22px">Packs are invoiced by Mianro Systems. We add the credits as soon as the invoice is paid.</p></div></section>
<section><div class="wrap split"><div class="rv"><h2>Included in every pack</h2><ul class="ticks" style="margin-top:22px">${INCLUDED.map((i) => `<li>${ic("check")}${esc(i)}</li>`).join("")}</ul></div>
<div class="card rv"><h3>Need a bigger volume?</h3><p>Building hundreds of previews a month? Tell us how many and we'll put together a custom pack.</p><a class="btn" style="justify-self:start" href="/contact">Talk to us ${ic("arrow")}</a></div></div></section>
<section class="alt"><div class="wrap"><div class="center rv" style="margin-bottom:40px"><h2>Pricing questions</h2></div>${faqList(FAQS.filter((f) => /credit|pay|brand|own/i.test(f.q)))}</div></section>${ctaBand()}`;
}

export function resellersPage(): string {
  return `<section class="hero" style="padding-bottom:70px"><div class="wrap"><div class="hero-copy"><span class="pill"><i>Partners</i> For agencies and freelancers</span><h1>Sell premium websites <em class="x">under your own name</em></h1><p class="lead">Show every prospect their finished website before they pay. Forge does the building in minutes; you keep the brand, the client and the margin.</p>
<div class="cta-row"><a class="btn hot lg" href="/resellers/apply">Become a partner ${ic("arrow")}</a><a class="btn ghost lg" href="/pricing#packs">See the packs</a></div></div>
<div class="stage rv">${laptop([WORK[0]!, WORK[1]!, WORK[2]!], { rotate: true })}</div></div></section>
<section class="alt"><div class="wrap"><div class="center rv" style="margin-bottom:44px"><span class="eyebrow">Built for resellers</span><h2 style="margin-top:14px">Everything you need to resell</h2></div><div class="bento">
<div class="tile rv"><span class="ico">${ic("tag")}</span><h3>White-label</h3><p>The credit line on each site carries your agency's name and link, or nothing at all.</p></div>
<div class="tile rv"><span class="ico">${ic("users")}</span><h3>Your team</h3><p>Invite as many people as you like. Owners run the account; members build.</p></div>
<div class="tile rv"><span class="ico">${ic("key")}</span><h3>API &amp; webhooks</h3><p>Create sites from your own tools and get a signed message when one is ready or a lead arrives.</p></div>
<div class="tile rv"><span class="ico">${ic("chart")}</span><h3>Clear credits</h3><p>See your balance and every build. Failed builds are refunded automatically.</p></div>
<div class="tile rv"><span class="ico">${ic("lock")}</span><h3>Your data stays yours</h3><p>Accounts are isolated. Nobody else sees your sites or your clients' leads.</p></div>
<div class="tile rv"><span class="ico">${ic("play")}</span><h3>Your own videos</h3><p>Add hero videos for the trades you sell to, on top of the shared library.</p></div></div></div></section>
<section class="band"><div class="wrap"><div class="center rv" style="margin-bottom:44px"><span class="eyebrow">Getting started</span><h2 style="margin-top:14px">Live in a day</h2></div><div class="steps three">
<div class="step rv" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)"><b>STEP 1</b><h3>Apply</h3><p>Tell us about your agency and the trades you sell to.</p></div>
<div class="step rv" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)"><b>STEP 2</b><h3>Get your account</h3><p>We set it up, add your first credits and send your sign-in link.</p></div>
<div class="step rv" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)"><b>STEP 3</b><h3>Build and send</h3><p>Make your first previews and send them to prospects the same day.</p></div></div></div></section>
<section><div class="wrap"><div class="center rv" style="margin-bottom:40px"><h2>Partner questions</h2></div>${faqList(FAQS.slice(3, 9))}</div></section>${ctaBand("Ready to resell?", "Apply and we'll set up your account and first credits within a business day.")}`;
}

export function tradesIndex(q: string): string {
  const needle = q.trim().toLowerCase();
  const list = needle ? TRADES.filter((t) => `${t.who} ${t.name} ${t.search} ${t.services.join(" ")}`.toLowerCase().includes(needle)) : TRADES;
  const body = needle
    ? list.length
      ? `<div class="grid4">${list.map(tradeCard).join("")}</div>`
      : `<div class="card"><h3>No match for "${esc(q.slice(0, 60))}"</h3><p>Forge can design for almost any local business, even ones we haven't listed.</p><a class="btn" style="justify-self:start" href="/preview">Ask for a preview</a></div>`
    : TRADE_GROUPS.map((g) => `<h3 style="margin:34px 0 16px">${esc(g)}</h3><div class="grid4">${TRADES.filter((t) => t.group === g).map(tradeCard).join("")}</div>`).join("");
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">Trades</span><h1>${needle ? `Results for "${esc(q.slice(0, 60))}"` : "Websites for every kind of local business"}</h1><p class="lead">Pick a trade to see what Forge builds for it.</p>
<form class="search" style="margin-top:28px" action="/trades" method="get" role="search"><input name="q" value="${esc(q.slice(0, 60))}" placeholder="Search a trade, e.g. dentist" aria-label="Search trades"><button class="btn hot" type="submit">Search</button></form></div></div>
<section class="tight"><div class="wrap">${body}</div></section>${ctaBand()}`;
}

export function tradePage(t: Trade): string {
  const others = TRADES.filter((x) => x.slug !== t.slug && x.group === t.group).slice(0, 4);
  const work = WORK.filter((w) => w.tradeSlug === t.slug);
  return `<div class="pagehead"><div class="wrap"><div class="crumb"><a href="/trades">Trades</a> / ${esc(t.who)}</div><span class="eyebrow">Websites for ${esc(t.who)}</span><h1>A website that books ${esc(t.who === "restaurants" ? "tables" : "jobs")}, <em class="x">designed in minutes</em></h1><p class="lead">${esc(t.pain)} Forge builds a complete site for any ${esc(t.name.toLowerCase())} in minutes, so you can see it before you pay.</p>
<div class="cta-row" style="justify-content:flex-start;margin-top:26px"><a class="btn hot lg" href="/preview?trade=${t.slug}">Get a free preview ${ic("arrow")}</a><a class="btn ghost lg" href="/resellers">For agencies</a></div></div></div>
${work.length ? `<section class="tight"><div class="wrap"><div class="head"><h2>${esc(tradeName(t))} sites we've built</h2></div><div class="works">${work.map(workCard).join("")}</div></div></section>` : ""}
<section class="alt"><div class="wrap split"><div class="rv"><h2>What a ${esc(t.name.toLowerCase())} site includes</h2><p class="lead" style="margin:16px 0 8px">A home page that speaks to people searching "${esc(t.search)}", with a page for each service:</p><ul class="ticks">${t.services.map((s) => `<li>${ic("check")}${esc(s)}</li>`).join("")}</ul></div>
<div class="card rv"><h3>And on every site</h3><ul class="ticks" style="margin:6px 0 0">${INCLUDED.slice(0, 5).map((i) => `<li>${ic("check")}${esc(i)}</li>`).join("")}</ul></div></div></section>
<section><div class="wrap"><div class="head"><h2>More trades</h2></div><div class="grid4">${others.map(tradeCard).join("")}</div></div></section>${ctaBand()}`;
}

export function guidesIndex(): string {
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">The playbook</span><h1>Guides for winning local clients</h1><p class="lead">Plain advice on finding clients, pricing and pitching websites.</p></div></div>
<section class="tight"><div class="wrap"><div class="cards">${GUIDES.map(guideCard).join("")}</div></div></section>${ctaBand()}`;
}

export function guidePage(g: Guide): string {
  return `<div class="pagehead"><div class="wrap"><div class="crumb"><a href="/guides">Guides</a> / ${esc(g.title)}</div><span class="tag">${esc(g.read)} read</span><h1 style="margin-top:16px;max-width:20ch">${esc(g.title)}</h1><p class="lead">${esc(g.blurb)}</p></div></div>
<section class="tight"><div class="wrap"><article class="prose">${g.body.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("")}</article></div></section>
<section class="alt"><div class="wrap"><div class="head"><h2>Keep reading</h2></div><div class="cards">${GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3).map(guideCard).join("")}</div></div></section>${ctaBand()}`;
}

export function faqPage(): string {
  return `<div class="pagehead center"><div class="wrap" style="display:grid;justify-items:center"><span class="eyebrow">Questions</span><h1 style="margin-inline:auto">Everything you might ask</h1></div></div><section class="tight"><div class="wrap">${faqList()}<p class="center" style="margin-top:30px">Something else? <a href="/contact">Ask us</a>.</p></div></section>${ctaBand()}`;
}

export type FormKind = "contact" | "sample" | "reseller";
export interface FormState {
  kind: FormKind;
  values: Record<string, string>;
  error?: string;
}

const val = (s: FormState, k: string) => esc(s.values[k] ?? "");

export function formPage(s: FormState): string {
  const reseller = s.kind === "reseller";
  const sample = s.kind === "sample";
  const title = reseller ? "Become a Forge partner" : sample ? "Get your free website preview" : "Talk to us";
  const sub = reseller
    ? "Tell us about your agency. We reply within one business day to set up your account."
    : sample
      ? "Tell us the business. We'll build a complete preview of its new website and send you the link. Free, with no commitment."
      : "Questions, bigger volumes or something custom? Send us a note and a real person will reply.";
  const trade = s.values.trade ?? "";
  const side = sample
    ? `<div class="rv"><div class="stage" style="margin:0">${laptop([WORK[0]!, WORK[1]!, WORK[2]!], { rotate: true })}</div><ul class="ticks" style="margin-top:34px"><li>${ic("check")}A complete site, not a mock-up</li><li>${ic("check")}Usually ready the same day</li><li>${ic("check")}No card, no commitment</li></ul></div>`
    : reseller
      ? `<div class="rv"><ul class="ticks"><li>${ic("check")}Your brand on every site</li><li>${ic("check")}Credit packs that never expire</li><li>${ic("check")}API keys and webhooks</li><li>${ic("check")}Failed builds refunded</li></ul><p class="small" style="margin-top:20px">Prefer to talk first? <a href="${CALL_URL}" target="_blank" rel="noopener">Book a call</a>.</p></div>`
      : `<div class="rv"><p class="lead">Prefer to talk? <a href="${CALL_URL}" target="_blank" rel="noopener">Book a 20-minute call</a> with the Mianro team.</p></div>`;
  return `<div class="pagehead"><div class="wrap"><span class="eyebrow">${reseller ? "Partners" : sample ? "Free preview" : "Contact"}</span><h1>${esc(title)}</h1><p class="lead">${esc(sub)}</p></div></div>
<section class="tight" style="padding-top:20px"><div class="wrap formgrid"><form class="f" method="post" action="${reseller ? "/resellers/apply" : "/contact"}">${s.error ? `<div class="err" role="alert">${esc(s.error)}</div>` : ""}
<input type="hidden" name="kind" value="${s.kind}"><div class="hp" aria-hidden="true"><label>Leave this empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
<div class="two"><label>Your name<input name="name" required maxlength="80" value="${val(s, "name")}" autocomplete="name"></label><label>Email<input name="email" type="email" required maxlength="120" value="${val(s, "email")}" autocomplete="email"></label></div>
<div class="two"><label>${reseller ? "Agency or company" : sample ? "Business name (optional)" : "Company (optional)"}<input name="company" maxlength="100" value="${val(s, "company")}" ${reseller ? "required" : ""} autocomplete="organization"></label><label>Phone (optional)<input name="phone" type="tel" maxlength="40" value="${val(s, "phone")}" autocomplete="tel"></label></div>
<label>${sample ? "Its website or Google Maps link" : "Your website (optional)"}<input name="website" maxlength="200" value="${val(s, "website")}" placeholder="${sample ? "e.g. joesplumbing.com or a maps.app.goo.gl link" : "https://"}"></label>
${
  reseller
    ? `<div class="two"><label>Sites you'd build each month<select name="volume">${["1–10", "11–50", "51–200", "200+"].map((v) => `<option${s.values.volume === v ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Pack you're interested in<input name="plan" maxlength="40" value="${val(s, "plan")}" placeholder="Starter, Agency, Studio"></label></div>
<label>Which trades do you sell to?<input name="trades" maxlength="160" value="${val(s, "trades")}" placeholder="e.g. plumbers, dentists in Orlando"></label>`
    : sample && trade
      ? `<input type="hidden" name="trade" value="${esc(trade)}"><p class="small">Trade: <b>${esc(tradeBySlug(trade)?.who ?? trade)}</b></p>`
      : ""
}
<label>${reseller ? "Anything else we should know?" : sample ? "The business, in a sentence" : "How can we help?"}<textarea name="message" rows="4" maxlength="2000" ${reseller ? "" : "required"} placeholder="${sample ? "e.g. Joe's Plumbing, a family plumber in Tampa, FL" : ""}">${val(s, "message")}</textarea></label>
<button class="btn hot lg" type="submit">${reseller ? "Send my application" : sample ? "Build my free preview" : "Send"} ${ic("arrow")}</button><p class="small">We use your details only to reply to you. See our <a href="/privacy">privacy policy</a>.</p></form>${side}</div></section>`;
}

export function thanksPage(kind: FormKind): string {
  const reseller = kind === "reseller";
  return `<section><div class="wrap" style="max-width:780px"><div class="okbox"><span class="ico">${ic("check")}</span><h1 style="font-size:clamp(2rem,4vw,2.8rem)">${reseller ? "Application received" : kind === "sample" ? "Your preview is on its way" : "Thanks, we've got it"}</h1><p class="lead">${reseller ? "We'll review it and reply within one business day with next steps and your first invoice." : kind === "sample" ? "We'll build it and email you the link, usually within one business day." : "We'll reply by email, usually within one business day."}</p><div class="cta-row" style="justify-content:flex-start"><a class="btn" href="/work">Browse our work</a><a class="btn ghost" href="/">Home</a></div></div></div></section>`;
}

const LEGAL_UPDATED = "November 2026";

export function termsPage(): string {
  return `<div class="pagehead"><div class="wrap"><h1>Terms of service</h1><p class="small" style="margin-top:14px">Last updated ${LEGAL_UPDATED}</p></div></div><section class="tight"><div class="wrap"><article class="prose">
<h2>The service</h2><p>Forge is provided by Mianro Systems ("we"). It lets approved accounts create preview websites for businesses and share them by link. A preview is a draft meant to help win a client; it is not a hosted production website unless we agree otherwise in writing.</p>
<h2>Accounts and credits</h2><p>Access is by invitation. You are responsible for what happens under your account and for keeping sign-ins private. One credit builds one site; credits are refunded when a build fails and are otherwise not refundable. Packs are invoiced and credits are added when payment is received.</p>
<h2>What you may build</h2><p>Only build previews for real businesses you have a genuine reason to contact, and only with information you are entitled to use. Do not use Forge for anything unlawful, misleading or harmful, to impersonate a business, or to send unsolicited messages in breach of the law that applies to you. You are responsible for following those laws.</p>
<h2>Content and AI</h2><p>Previews are written by AI from the details you provide and public information. Check them before you rely on them, including any claims, prices, licences or reviews. Photos in previews are illustrative.</p>
<h2>Availability</h2><p>We work to keep Forge running but do not promise it will always be available. We may suspend an account that breaks these terms or puts others at risk, and we may change or end features with notice where we can.</p>
<h2>Liability</h2><p>To the extent the law allows, our liability for any claim is limited to the amount you paid us in the three months before the claim, and we are not liable for indirect or lost-profit losses.</p>
<h2>Contact</h2><p>Questions about these terms: use the <a href="/contact">contact form</a>.</p></article></div></section>`;
}

export function privacyPage(): string {
  return `<div class="pagehead"><div class="wrap"><h1>Privacy policy</h1><p class="small" style="margin-top:14px">Last updated ${LEGAL_UPDATED}</p></div></div><section class="tight"><div class="wrap"><article class="prose">
<h2>What we collect</h2><p>On this website: the details you type into our forms (name, email, phone, company, message) and, if you use the switch, your light or dark mode choice, kept in your own browser. We do not use advertising trackers. When you use an account: your email, a hashed password, the businesses you build previews for, and the form submissions that arrive on those previews.</p>
<h2>How we use it</h2><p>To reply to you, run your account, keep the service secure and invoice you. We do not sell personal information.</p>
<h2>Who sees it</h2><p>Only our staff, and the service providers that run Forge for us (our hosting, our AI providers and our fonts provider). Each account can see only its own data.</p>
<h2>Visitors to preview sites</h2><p>When someone fills in a form on a preview site, the details go to the account that built it. That account decides what to do with them and is responsible for doing so lawfully.</p>
<h2>Keeping and deleting</h2><p>We keep inquiries for as long as needed to follow up. You can ask us to delete your details at any time through the <a href="/contact">contact form</a>.</p>
<h2>Security</h2><p>Passwords are stored hashed, sign-in attempts are limited, preview sites are isolated from the app, and accounts cannot see one another's data.</p></article></div></section>`;
}

export function notFoundPage(): string {
  return `<section class="hero"><div class="wrap"><div class="hero-copy"><span class="eyebrow">404</span><h1>That page isn't here</h1><p class="lead">It may have moved. Try one of these instead.</p><div class="cta-row"><a class="btn hot" href="/">Home</a><a class="btn ghost" href="/work">Our work</a><a class="btn ghost" href="/pricing">Pricing</a></div></div></div></section>`;
}

export function homeLd(origin: string, plans: Plan[]): unknown[] {
  return [
    { "@context": "https://schema.org", "@type": "Organization", name: "Forge by Mianro Systems", url: origin, logo: `${origin}/favicon.svg`, description: "AI-designed websites for local businesses, with a white-label partner program." },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Forge", url: origin, potentialAction: { "@type": "SearchAction", target: `${origin}/trades?q={query}`, "query-input": "required name=query" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ...plans.map((p) => ({ "@context": "https://schema.org", "@type": "Offer", name: `${p.name} pack: ${p.credits} site credits`, price: p.price.replace(/[^0-9.]/g, "") || undefined, priceCurrency: "USD", url: `${origin}/pricing` })),
  ];
}
