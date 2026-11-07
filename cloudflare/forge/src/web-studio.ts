/**
 * Forge Studio on the public site: the /studio page (built with the Studio motion engine itself,
 * so the page is the demo) and /studio/concept, a one-page concept site for a fictional roofer.
 */
import { MOTION_CSS, motionScripts } from "./motion";
import { STUDIO_CREDITS } from "./tenants";
import { CALL_URL, ic } from "./web-ui";

export const STUDIO_CSS = `
.st-hero{position:relative;min-height:calc(100svh - 68px);display:flex;flex-direction:column;justify-content:flex-end;padding:110px 0 48px;overflow:hidden;background:#0b0907;color:#f4efe7}
.st-hero .wrap{position:relative;z-index:2;width:100%}
.st-hero h1{font:600 clamp(3rem,min(10vw,14.5vh),10.5rem)/.88 var(--serif);letter-spacing:-.045em;max-width:12ch}
.st-hero h1 em{font-style:italic;font-weight:500;color:#ff7a45}
.st-row{display:flex;justify-content:space-between;align-items:flex-end;gap:20px 28px;margin-top:28px;flex-wrap:wrap}
.st-row p{max-width:44ch;color:#d8d0c4;font-size:1.12rem}
.st-round{width:156px;height:156px;border-radius:50%;background:#ff6b3d;color:#140904;display:grid;place-items:center;text-align:center;font:600 .92rem/1.2 var(--sans);text-decoration:none;letter-spacing:.02em;flex:none}
.st-eyebrow{display:flex;gap:14px;font:500 .78rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:#cfc6b8;margin-bottom:24px}
.st-mq{border-block:1px solid var(--line);padding:22px 0;font:600 clamp(2.4rem,6vw,5.2rem)/1 var(--serif);letter-spacing:-.03em}
.st-mq span{padding-right:.6em}.st-mq i{font-style:normal;color:var(--ember);padding-right:.6em}
.st-statement{font:500 clamp(1.9rem,4.4vw,4rem)/1.12 var(--serif);letter-spacing:-.02em;max-width:22ch}
.st-num{display:flex;gap:16px;font:500 .78rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:22px}
.st-big{font:600 clamp(2.6rem,7vw,6.4rem)/.92 var(--serif);letter-spacing:-.04em;max-width:14ch}
.st-h{min-height:100svh;display:flex;align-items:center;overflow:hidden;padding:0}
.st-h [data-horizontal-track]{gap:28px;padding:0 max(20px,calc((100vw - 1220px)/2 + 20px))}
.st-panel{position:relative;flex:none;width:min(78vw,640px);height:min(72vh,560px);border-radius:28px;overflow:hidden;padding:36px;display:flex;flex-direction:column;justify-content:space-between;color:#f4efe7;background:#120f0c;border:1px solid rgba(255,255,255,.08)}
.st-panel>*{position:relative;z-index:2}.st-panel b{font:500 .8rem var(--sans);letter-spacing:.14em;color:#ffb08f}
.st-panel h3{font:600 clamp(2rem,4vw,3.4rem)/1 var(--serif);letter-spacing:-.03em;max-width:12ch}.st-panel p{color:#cfc6b8;max-width:38ch}
.st-panel .demo-type{font:600 clamp(3rem,7vw,6rem)/.9 var(--serif);letter-spacing:-.04em}
.st-panel .demo-type em{color:#ff7a45}
.st-cards{position:relative;height:150px;margin:6px 0}.st-cards i{position:absolute;left:0;right:22%;height:96px;border-radius:16px;box-shadow:0 20px 40px -16px #000}.st-cards i:nth-child(1){top:0;background:#3a2a1f;transform:scale(.88);transform-origin:top}.st-cards i:nth-child(2){top:22px;background:#f2c46d;transform:scale(.94);transform-origin:top}.st-cards i:nth-child(3){top:48px;background:#ff6b3d}
.st-stack{display:grid;gap:5vh}
.st-card{min-height:62vh;border-radius:30px;padding:clamp(28px,4vw,56px);display:grid;align-content:space-between;gap:30px;color:#140b06}
.st-card h3{font:600 clamp(2.4rem,6vw,5.4rem)/.92 var(--serif);letter-spacing:-.04em;max-width:13ch}.st-card p{max-width:46ch;font-size:1.08rem}
.st-card span{font:600 .8rem var(--sans);letter-spacing:.14em;text-transform:uppercase}
.st-cmp{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media (max-width:760px){.st-cmp{grid-template-columns:1fr}}
.st-cmp>div{border-radius:24px;padding:34px;border:1px solid var(--line);background:var(--surface);display:grid;gap:16px;align-content:start}
.st-cmp>div.hot{background:#0f0c0a;color:#f4efe7;border-color:transparent}.st-cmp>div.hot li{color:#ded5c8}
.st-concept{display:grid;grid-template-columns:1.3fr .7fr;gap:40px;align-items:center}@media (max-width:900px){.st-concept{grid-template-columns:1fr}}
.st-concept .shot{border-radius:22px;overflow:hidden;border:1px solid var(--line2);box-shadow:var(--shadow-lg);display:block}
.st-end{position:relative;overflow:hidden;background:#0b0907;color:#f4efe7;padding:22vh 0 12vh}
.st-end .wrap{position:relative;z-index:2}
.st-end h2{font:600 clamp(3rem,12vw,11rem)/.86 var(--serif);letter-spacing:-.05em}
@media (max-width:700px){.st-hero{padding-bottom:28px}.st-row p{font-size:1rem}.st-round{width:108px;height:108px;font-size:.8rem}.st-panel{padding:26px}}
`;

export function studioPage(): string {
  return `<section class="st-hero" data-grain><div data-shader="flow" data-colors="#ff6b3d,#3b1608,#0b0907"></div>
<div class="wrap"><div class="st-eyebrow" data-reveal="fade"><span>Forge Studio</span><span>·</span><span>Award-style websites</span></div>
<h1 data-split="chars">Websites people <em>remember.</em></h1>
<div class="st-row"><p data-reveal="up">Our creative tier. Art-directed, kinetic, cinematic sites, designed by AI with a real motion engine underneath, for businesses that want to look like nobody else in town.</p>
<a class="st-round" href="/preview?tier=studio" data-magnetic data-cursor-text="Go">Get a Studio preview</a></div></div></section>

<div class="st-mq" data-marquee data-speed="1.1" aria-label="Studio features"><div><span>Kinetic type</span><i>✦</i><span>Living WebGL colour</span><i>✦</i><span>Smooth scroll</span><i>✦</i><span>Page transitions</span><i>✦</i><span>Custom cursor</span><i>✦</i><span>Art direction</span><i>✦</i></div></div>

<section><div class="wrap"><p class="st-statement" data-scrub-text>Most local businesses get a template. A Studio site starts with a concept: a type system, a palette and motion that make people stop scrolling, and then pick up the phone.</p></div></section>

<section style="padding-bottom:0"><div class="wrap"><div class="st-num" data-reveal="fade"><span>01</span><span>Signature moves</span></div><h2 class="st-big" data-split="lines">Every Studio site gets the good stuff.</h2></div></section>
<section class="st-h" data-horizontal aria-label="Signature moves"><div data-horizontal-track>
<article class="st-panel" data-cursor-text="Drag"><b>01 · KINETIC TYPE</b><div class="demo-type" data-split="chars">Big. <em>Bold.</em> Alive.</div><p>Headlines that assemble letter by letter, and statements that light up word by word as you read.</p></article>
<article class="st-panel"><div data-shader="flow" data-colors="#ff8a3d,#6b1d4f,#0d0a14"></div><b>02 · LIVING COLOUR</b><h3>WebGL backgrounds in the brand's colours</h3><p>A slow, fluid gradient that follows the pointer. No stock video, no heavy downloads.</p></article>
<article class="st-panel" data-cursor-text="View"><b>03 · SCROLL STORIES</b><h3>Pinned galleries and stacked cards</h3><div class="st-cards" aria-hidden="true"><i></i><i></i><i></i></div><p>Sections that pin, slide sideways and stack as you scroll, like this one.</p></article>
<article class="st-panel" data-tilt data-cursor-text="Tilt"><b>04 · POINTER PLAY</b><h3>A cursor with something to say</h3><p>Magnetic buttons, tilting cards, image ripples and labels that follow the pointer on desktop.</p></article>
<article class="st-panel"><b>05 · TRANSITIONS</b><h3>Pages that flow into each other</h3><p>A preloader on arrival and a smooth wipe between pages, so the whole site feels like one piece.</p></article>
</div></section>

<section><div class="wrap"><div class="st-num" data-reveal="fade"><span>02</span><span>How it's made</span></div><h2 class="st-big" data-split="lines" style="margin-bottom:48px">Designed like an agency would. Built in an afternoon.</h2>
<div class="st-stack" data-stack>
<div class="st-card" style="background:#ff6b3d"><span>Step one</span><div><h3>A concept, not a template.</h3><p>Forge picks one strong art direction for the business (editorial, kinetic, cinematic or playful) and holds every page to it.</p></div></div>
<div class="st-card" style="background:#f2c46d"><span>Step two</span><div><h3>A real motion engine.</h3><p>GSAP, ScrollTrigger and smooth scrolling, tuned by us and tested on every page. If a visitor prefers less motion, the site calmly respects it.</p></div></div>
<div class="st-card" style="background:#efe7da"><span>Step three</span><div><h3>Still a business site.</h3><p>Service pages, quote and contact forms that land in your inbox, a map, both light and dark mode, and a phone number one tap away.</p></div></div>
</div></div></section>

<section class="alt"><div class="wrap"><div class="st-num" data-reveal="fade"><span>03</span><span>Standard or Studio</span></div><h2 class="st-big" data-split="lines" style="margin-bottom:40px">Two tiers. Same speed to a first look.</h2>
<div class="st-cmp" data-stagger><div><h3>Standard</h3><ul class="ticks"><li>${ic("check")}A polished, fast 15+ page site</li><li>${ic("check")}Calm, tasteful animation</li><li>${ic("check")}Best for most trades and quick wins</li><li>${ic("check")}1 credit for partners</li></ul></div>
<div class="hot"><h3>Studio</h3><ul class="ticks"><li>${ic("check")}Art-directed concept and type system</li><li>${ic("check")}Kinetic type, WebGL, smooth scroll, transitions</li><li>${ic("check")}For brands that want to be remembered</li><li>${ic("check")}${STUDIO_CREDITS} credits for partners</li></ul></div></div></div></section>

<section><div class="wrap st-concept"><a class="shot" href="/studio/concept" data-cursor-text="Open" data-distort><img src="/studio/concept.webp" alt="The Northlight Roofing concept site" width="1280" height="800" loading="lazy"></a>
<div><div class="st-num"><span>04</span><span>See it moving</span></div><h2 class="st-big" style="font-size:clamp(2.2rem,4.5vw,3.6rem)" data-split="lines">A concept site, built with the Studio engine.</h2><p class="lead" style="margin:18px 0 26px">Northlight Roofing is a made-up roofer. Open it on a laptop and scroll: everything you see is the engine every Studio site uses.</p><a class="btn hot" href="/studio/concept" data-magnetic>Open the concept ${ic("arrow")}</a></div></div></section>

<section class="st-end" data-grain><div data-shader="flow" data-colors="#ff6b3d,#5a1d0c,#0b0907"></div><div class="wrap"><h2 data-split="lines">Let's make them remember you.</h2>
<div class="st-row"><p>Tell us the business. We'll come back with a Studio preview you can click through.</p><div class="cta-row"><a class="btn hot lg" href="/preview?tier=studio" data-magnetic>Get a Studio preview ${ic("arrow")}</a><a class="btn ghost lg" style="color:#f4efe7;border-color:rgba(255,255,255,.4)" href="${CALL_URL}" target="_blank" rel="noopener">Book a call</a></div></div></div></section>`;
}

/** A one-page concept site for a fictional roofer, built with the Studio engine. */
export function studioConcept(): string {
  const css = `
:root{--bg:#0d0c0b;--ink:#f2ede4;--muted:#9a948a;--accent:#ff5b2e;--line:rgba(242,237,228,.14)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 "Hanken Grotesk",system-ui,sans-serif;overflow-x:hidden}
a{color:inherit}h1,h2,h3{font-family:"Big Shoulders Display",sans-serif;font-weight:800;text-transform:uppercase;line-height:.86;letter-spacing:-.01em;margin:0}
.top{position:fixed;inset:0 0 auto;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:22px clamp(18px,4vw,48px);mix-blend-mode:difference;color:#fff;font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
.top nav{display:flex;gap:28px}.top a{text-decoration:none}
.hero{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;padding:110px clamp(18px,4vw,48px) 96px;overflow:hidden}
.hero h1{font-size:clamp(3.4rem,min(11.5vw,17vh),15rem);position:relative;z-index:2;max-width:13ch}
.hero h1 em{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;text-transform:none;color:#ffb38f}
.row{display:flex;justify-content:space-between;align-items:end;gap:24px;position:relative;z-index:2;margin-top:28px;flex-wrap:wrap}
.row p{max-width:34ch;color:#e3dcd0;margin:0}
.round{display:inline-flex;align-items:center;justify-content:center;width:150px;height:150px;border-radius:50%;background:var(--accent);color:#120a06;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:.06em;font-size:13px;flex:none}
.mq{border-block:1px solid var(--line);padding:26px 0;font:800 clamp(3rem,8vw,7rem)/1 "Big Shoulders Display";text-transform:uppercase}
.mq span{padding-right:40px}.mq i{color:var(--accent);font-style:normal;padding-right:40px}
.statement{padding:18vh clamp(18px,4vw,48px);font:400 clamp(2rem,4.6vw,4.4rem)/1.1 "Instrument Serif",serif;max-width:1400px;margin:0}
.num{display:flex;gap:16px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);padding:0 clamp(18px,4vw,48px);margin-bottom:24px}
.big{font-size:clamp(3.2rem,9vw,9rem);padding:0 clamp(18px,4vw,48px);margin-bottom:6vh}
.h{min-height:100svh;display:flex;align-items:center;overflow:hidden}
.h [data-horizontal-track]{gap:3vw;padding:0 clamp(18px,4vw,48px)}
.panel{width:min(78vw,820px);height:min(70vh,620px);border-radius:24px;overflow:hidden;position:relative;flex:none;display:flex;align-items:flex-end;padding:32px}
.panel .ph{position:absolute;inset:-12% 0}
.panel h3{position:relative;font-size:clamp(2.6rem,5vw,5rem)}.panel small{position:absolute;top:28px;left:32px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
.list{padding:0 clamp(18px,4vw,48px);position:relative}
.list a{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:28px 0;text-decoration:none;font:800 clamp(2.2rem,6vw,5.4rem)/1 "Big Shoulders Display";text-transform:uppercase;transition:color .3s,padding .3s}
.list a:last-of-type{border-bottom:1px solid var(--line)}.list a:hover{color:var(--accent);padding-left:18px}.list a span{font:400 14px "Hanken Grotesk";letter-spacing:.1em}
.list .pv{width:300px;height:200px;border-radius:16px;background:radial-gradient(120% 90% at 30% 20%,#ff5b2e,#2a120a);z-index:3}
.stack{padding:12vh clamp(18px,4vw,48px) 14vh;display:grid;gap:4vh}
.card{min-height:66vh;border-radius:28px;padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;justify-content:space-between;color:#120a06}
.card h3{font-size:clamp(3rem,8vw,7.4rem)}.card p{max-width:40ch;font-size:18px}
.contact{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;padding:48px clamp(18px,4vw,48px);overflow:hidden}
.contact h2{font-size:clamp(4.4rem,19vw,22rem);position:relative;z-index:2}
.meta{position:relative;z-index:2;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:24px;color:#e9e3d8}
.badge{position:fixed;left:16px;bottom:16px;z-index:60;background:rgba(13,12,11,.82);backdrop-filter:blur(10px);border:1px solid var(--line);color:var(--ink);font:500 12px/1.4 "Hanken Grotesk";padding:10px 14px;border-radius:999px;text-decoration:none}
.badge b{color:var(--accent)}
.heart{color:#e11d48;font-size:1.3em}
@media(max-width:760px){.top nav{display:none}.round{width:116px;height:116px}.list .pv{display:none}}
`;
  const panels = [
    ["Cherry Creek", "#ff5b2e", "#2a120a", "Full replacement"],
    ["Wash Park", "#e9c46a", "#3a2a0a", "Storm repair"],
    ["Highlands", "#5aa9e6", "#0a1a2a", "Metal roof"],
    ["Lakewood", "#9be564", "#13240a", "Inspection"],
  ];
  return `<!doctype html><html lang="en" style="--m-accent:#ff5b2e;--m-ink:#0d0c0b;--m-paper:#f2ede4"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Northlight Roofing | A Forge Studio concept</title><meta name="description" content="A concept site for a fictional Denver roofer, built with the Forge Studio motion engine."><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Hanken+Grotesk:wght@400;600&family=Instrument+Serif:ital@0;1&display=swap">
<style>${MOTION_CSS}${css}</style></head><body>
<header class="top"><a href="#top">Northlight®</a><nav aria-label="Sections"><a href="#work">Work</a><a href="#services">Services</a><a href="#contact">Contact</a></nav><span>Denver, CO</span></header>
<main id="top">
<section class="hero" data-grain><div data-shader="flow" data-colors="#ff5b2e,#3a1d12,#0d0c0b"></div>
<h1 data-split="chars">Roofs that <em>outlast</em> the weather</h1>
<div class="row"><p data-reveal="up">A design-minded roofing crew for Denver's older homes. Storm repair, replacements and the details nobody else sweats.</p><a class="round" href="#contact" data-magnetic data-cursor-text="Quote">Get a quote</a></div></section>
<div class="mq" data-marquee data-speed="1.2"><div><span>Storm repair</span><i>✦</i><span>Replacements</span><i>✦</i><span>Metal roofs</span><i>✦</i><span>Inspections</span><i>✦</i></div></div>
<p class="statement" data-scrub-text>Every roof is a promise kept for thirty winters: hail, wind and snow included. We don't hand you a brochure. We hand you a roof you never have to think about again.</p>
<div class="num" id="work"><span>01</span><span>Selected roofs</span></div><h2 class="big" data-split="lines">Recent work</h2>
<section class="h" data-horizontal aria-label="Recent work"><div data-horizontal-track>
${panels.map(([n, a, b, t]) => `<article class="panel" data-cursor-text="View" data-distort><div class="ph" style="background:radial-gradient(120% 90% at 30% 20%,${a},${b})" data-parallax="0.2"></div><small>${t}</small><h3>${n}</h3></article>`).join("")}
</div></section>
<div class="num" id="services" style="margin-top:14vh"><span>02</span><span>Services</span></div>
<div class="list"><div class="pv" data-follow></div>
<a href="#contact" data-cursor-text="Quote">Storm repair <span>01</span></a><a href="#contact" data-cursor-text="Quote">Replacements <span>02</span></a><a href="#contact" data-cursor-text="Quote">Metal roofs <span>03</span></a><a href="#contact" data-cursor-text="Quote">Inspections <span>04</span></a></div>
<div class="stack" data-stack>
<div class="card" style="background:#ff5b2e" data-tilt><span>01 / 03 · Inspect</span><div><h3>We look first</h3><p>A drone and a ladder before a quote. You get photos of what we found, and a straight answer.</p></div></div>
<div class="card" style="background:#e9c46a"><span>02 / 03 · Plan</span><div><h3>One clear price</h3><p>Materials, timing and clean-up in writing. No surprises halfway through the job.</p></div></div>
<div class="card" style="background:#f2ede4"><span>03 / 03 · Build</span><div><h3>Done in days</h3><p>A crew that shows up when it says it will, and leaves the yard cleaner than it found it.</p></div></div></div>
</main>
<footer class="contact" id="contact" data-grain><div data-shader="flow" data-colors="#ff5b2e,#5a1f0e,#0d0c0b"></div><h2 data-split="lines">Let's talk roofs</h2>
<div class="meta"><span>A concept site · not a real business</span><span>Made with <span class="heart">♥</span> by <a href="https://mianrosystems.com">Mianro Systems</a></span></div></footer>
<a class="badge" href="/studio">Concept built with <b>Forge Studio</b> · back</a>
${motionScripts()}</body></html>`;
}
