/**
 * The Studio motion engine: GSAP (with ScrollTrigger and SplitText) and Lenis smooth scrolling from
 * a CDN, plus our own runtime that turns data-attributes into award-style effects. Claude writes
 * the markup; the runtime does the animation, so effects are reliable on every page.
 *
 * Fail-safe by design: nothing is hidden by CSS. Elements are only set to their "before" state by
 * the runtime itself, after the libraries have loaded, and never when the visitor prefers reduced
 * motion. If a CDN is blocked, the page simply shows everything without animation.
 */

export const MOTION_LIBS = [
  "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
  "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js",
  "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js",
  "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js",
];

/** What the page writers may use (shown to Claude in the Studio brief). */
export const MOTION_API = `Our motion engine is loaded on every page (GSAP + ScrollTrigger + SplitText + Lenis smooth scroll). Add effects ONLY with these attributes; never write animation code, never load scripts, never hide things with CSS (no opacity:0 / transform start states in CSS: the engine sets them when it runs).
- data-split="lines" | "words" | "chars" on a heading or short paragraph: masked text reveal when it scrolls in (in the first section it plays on load). Use on every major heading; "chars" for the hero headline.
- data-scrub-text on a large paragraph (a statement/manifesto): words light up from faint to full as you scroll.
- data-reveal="up" | "fade" | "scale" | "clip" | "left" | "right" on any block: reveals on scroll. data-stagger on a parent (e.g. a card grid) reveals its children one after another.
- data-parallax="0.15" (−0.4 to 0.4) on an image or decorative element: moves at a different speed while scrolling. Put it on the <img> inside a wrapper with overflow:hidden (make the img ~120% tall).
- data-marquee on a wrapper whose first child is the content to loop (e.g. a row of words with separators); it duplicates and scrolls it forever, reversing with the scroll direction. data-speed="1" (0.5–3).
- data-horizontal on a <section> whose child has data-horizontal-track (a flex row of wide panels/cards): pinned horizontal scrolling on desktop; on phones it becomes a swipeable row.
- data-stack on a parent whose children are full-width cards: each card pins and the earlier ones scale back as the next slides over (sticky stacked cards).
- data-counter="120" (with optional data-suffix="+" data-prefix="$") on a number: counts up when visible. Only for real numbers you were given.
- data-magnetic on primary buttons and round icon buttons: they pull towards the pointer.
- data-cursor-text="View" (or "Call", "Open", "Drag") on cards, gallery items and links: the custom cursor grows and shows the label. The custom cursor itself is automatic on desktop.
- data-tilt on cards: subtle 3D tilt toward the pointer.
- data-distort on an image wrapper: liquid ripple distortion on hover.
- data-shader="flow" data-colors="#hex,#hex,#hex" on an empty <div> placed absolutely (inset:0) inside a position:relative section: a living WebGL gradient in those colours that reacts to the pointer. Use the brand palette; great for hero backgrounds, CTA bands and the footer.
- data-grain on a section: a subtle animated film-grain overlay.
- data-follow on an element inside a position:relative container: it trails the pointer within the container (e.g. a floating image preview in a list of services).
- data-reveal="blur" on first-screen copy (the paragraph, the buttons): rises 28px out of a 12px blur, staggered after the headline. The premium load-in.
- data-depth="0.02" (0.01 to 0.06) on layered first-screen elements (a badge, a floating card, a picture frame): each drifts against the pointer by its own amount, so the layers separate. Bigger numbers sit "closer".
- data-pin="3" on a <section> that contains one <div data-pin-stage> (exactly one screen tall: 100vh, overflow hidden): the stage pins while the visitor scrolls 3 more screens, and that scroll drives everything inside it. Inside the stage: data-at="0.2" on a block makes it write in (rise out of blur) when the scroll reaches 20%, and data-until="0.55" makes it leave again; data-write on a paragraph inside such a block writes it in word by word; data-pin-zoom="1.25" on the stage's background picture pushes the camera in from 1 to 1.25 across the whole scroll; data-pin-count="24" on a number counts up across its block's span. Lay the blocks out absolutely in different corners of the stage so that those sharing the screen never overlap, and give 3 to 5 beats. On phones the stage is not pinned and the blocks simply stack, so write them in reading order.
Our engine also adds a short preloader (first visit), smooth page-to-page transitions, and smooth scrolling. Links to other pages just work.`;

export const MOTION_CSS = `
.m-cursor{position:fixed;left:0;top:0;width:10px;height:10px;border-radius:50%;background:#fff;mix-blend-mode:difference;pointer-events:none;z-index:2147483600;transform:translate(-50%,-50%);display:grid;place-items:center;font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#000;opacity:0;transition:opacity .3s}
.m-cursor span{opacity:0;transition:opacity .2s;white-space:nowrap}.m-cursor.label span{opacity:1}
.m-ring{position:fixed;left:0;top:0;width:38px;height:38px;border:1px solid rgba(255,255,255,.7);border-radius:50%;mix-blend-mode:difference;pointer-events:none;z-index:2147483599;transform:translate(-50%,-50%);opacity:0;transition:opacity .3s}
html.m-on .m-cursor,html.m-on .m-ring{opacity:1}
@media (hover:none),(pointer:coarse){.m-cursor,.m-ring{display:none}}
.m-curtain{position:fixed;inset:0;z-index:2147483500;background:var(--m-accent,#111);transform:translateY(100%);pointer-events:none}
.m-pre{position:fixed;inset:0;z-index:2147483550;background:var(--m-ink,#0b0b0d);color:var(--m-paper,#f5f3ee);display:flex;align-items:flex-end;justify-content:space-between;padding:clamp(20px,4vw,48px);font:500 clamp(14px,1.4vw,18px)/1.2 system-ui,sans-serif;letter-spacing:.02em}
.m-pre b{font-size:clamp(64px,14vw,220px);font-weight:600;line-height:.8;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.m-line{overflow:hidden;display:block;padding-bottom:.08em;margin-bottom:-.08em}
[data-shader]{position:absolute;inset:0;overflow:hidden;pointer-events:none}[data-shader] canvas{width:100%;height:100%;display:block}
[data-grain]{position:relative;isolation:isolate}
[data-grain]::after{content:"";position:absolute;inset:-50%;z-index:3;pointer-events:none;opacity:.07;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:m-grain 1s steps(6) infinite}
@keyframes m-grain{0%{transform:translate(0,0)}20%{transform:translate(-8%,4%)}40%{transform:translate(6%,-6%)}60%{transform:translate(-4%,8%)}80%{transform:translate(8%,2%)}100%{transform:translate(0,0)}}
[data-marquee]{overflow:hidden;white-space:nowrap}[data-marquee]>*{display:inline-flex}
[data-horizontal]{overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;max-width:100%}:where([data-horizontal-track]){display:flex}:where([data-horizontal-track])>:where(*){scroll-snap-align:start;flex-shrink:0;min-width:min(78vw,560px)}
[data-horizontal].m-pinned{overflow:hidden;scroll-snap-type:none}
.m-spot [data-spotlight-reveal]{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;-webkit-mask-image:radial-gradient(circle var(--m-r,240px) at var(--m-x,-999px) var(--m-y,-999px),#000 0,#000 40%,rgba(0,0,0,.75) 60%,rgba(0,0,0,.4) 75%,rgba(0,0,0,.12) 88%,transparent 100%);mask-image:radial-gradient(circle var(--m-r,240px) at var(--m-x,-999px) var(--m-y,-999px),#000 0,#000 40%,rgba(0,0,0,.75) 60%,rgba(0,0,0,.4) 75%,rgba(0,0,0,.12) 88%,transparent 100%)}
[data-spotlight]:not(.m-spot) [data-spotlight-reveal]{display:none}
[data-pin].m-pinned [data-pin-stage]{position:relative;height:100vh;overflow:hidden}
.m-pin-bar{position:absolute;left:50%;bottom:22px;width:120px;height:2px;margin-left:-60px;background:rgba(128,128,128,.3);border-radius:2px;z-index:5;pointer-events:none}.m-pin-bar i{display:block;height:100%;background:var(--m-accent,#111);transform-origin:0 50%;transform:scaleX(0)}
[data-follow]{pointer-events:none;display:none}html.m-on.m-fine [data-follow]{display:block}
html.m-wait [data-split],html.m-wait [data-reveal]{visibility:hidden}
html.m-on,html.m-on body{overflow-x:clip}html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}.lenis.lenis-stopped{overflow:hidden}
@media (prefers-reduced-motion:reduce){[data-grain]::after{animation:none}}
`;

/** The runtime. Runs at the end of <body>, after the libraries. */
export const MOTION_JS = String.raw`(function(){
var d=document,root=d.documentElement,W=window;
var reduce=W.matchMedia&&W.matchMedia("(prefers-reduced-motion: reduce)").matches;
var fine=W.matchMedia&&W.matchMedia("(hover: hover) and (pointer: fine)").matches;
var G=W.gsap,ST=W.ScrollTrigger,SPLIT=W.SplitText;
function all(s,el){return Array.prototype.slice.call((el||d).querySelectorAll(s))}
function num(v,f){v=parseFloat(v);return isNaN(v)?f:v}
// Shaders work even without GSAP.
all("[data-shader]").forEach(shader);
if(!G||!ST||reduce){root.classList.add("m-static");all("[data-counter]").forEach(function(el){el.textContent=(el.dataset.prefix||"")+el.dataset.counter+(el.dataset.suffix||"")});return}
// Lines are measured with the real fonts: wait for them (briefly), keeping the animated text hidden meanwhile.
root.classList.add("m-wait");
var ready=false;function go(){if(ready)return;ready=true;try{setup()}catch(err){console.warn("motion",err);all("[data-split],[data-reveal],[data-stagger]>*").forEach(function(el){el.style.opacity="";el.style.transform="";el.style.clipPath=""})}root.classList.remove("m-wait")}
if(d.fonts&&d.fonts.ready){d.fonts.ready.then(go,go);setTimeout(go,1500)}else go();
function setup(){
G.registerPlugin(ST);if(SPLIT)G.registerPlugin(SPLIT);
root.classList.add("m-on");
var lenis=null;
if(W.Lenis){lenis=new W.Lenis({duration:1.15,smoothWheel:true});lenis.on("scroll",ST.update);G.ticker.add(function(t){lenis.raf(t*1000)});G.ticker.lagSmoothing(0)}
var first=d.querySelector("main section, main > *");
var intro=G.timeline({paused:true});
var mm0=G.matchMedia();
// --- text
all("[data-split]").forEach(function(el){
  if(!SPLIT)return;var type=el.dataset.split||"lines";
  var s=new SPLIT(el,{type:type==="lines"?"lines":type==="words"?"lines,words":"lines,words,chars",linesClass:"m-line",mask:"lines",autoSplit:false});
  var parts=type==="chars"?s.chars:type==="words"?s.words:s.lines;
  G.set(parts,{yPercent:110});
  // Once revealed, put the plain text back so it re-wraps naturally on resize or rotation.
  var tw={yPercent:0,duration:type==="chars"?1:1.1,ease:"expo.out",stagger:type==="chars"?.025:type==="words"?.04:.1,onComplete:function(){s.revert()}};
  if(first&&first.contains(el))intro.to(parts,tw,.05);else G.to(parts,Object.assign({scrollTrigger:{trigger:el,start:"top 88%"}},tw));
});
all("[data-scrub-text]").forEach(function(el){
  if(!SPLIT)return;var s=new SPLIT(el,{type:"words"});
  G.fromTo(s.words,{opacity:.14},{opacity:1,stagger:.1,ease:"none",scrollTrigger:{trigger:el,start:"top 80%",end:"bottom 45%",scrub:true}});
});
// --- reveals
var SX=Math.min(80,Math.round(innerWidth*.06));var FROM={blur:{y:28,opacity:0,filter:"blur(12px)"},up:{y:70,opacity:0},fade:{opacity:0},scale:{scale:.88,opacity:0},left:{x:-SX,opacity:0},right:{x:SX,opacity:0},clip:{clipPath:"inset(100% 0% 0% 0%)"}};
var nblur=0;
all("[data-reveal]").forEach(function(el){
  var f=FROM[el.dataset.reveal]||FROM.up,to={y:0,x:0,scale:1,opacity:1,clipPath:"inset(0% 0% 0% 0%)",duration:1.2,ease:"expo.out"};
  if(f.filter){to.filter="blur(0px)";to.duration=1.1;to.ease="cubic-bezier(.16,1,.3,1)";to.clearProps="filter"}
  G.set(el,f);
  if(first&&first.contains(el))intro.to(el,to,f.filter?.45+(nblur++)*.15:.25);else G.to(el,Object.assign({scrollTrigger:{trigger:el,start:"top 90%"}},to));
});
all("[data-stagger]").forEach(function(el){
  var kids=el.children;if(!kids.length)return;G.set(kids,{y:60,opacity:0});
  G.to(kids,{y:0,opacity:1,duration:1,ease:"expo.out",stagger:.09,scrollTrigger:{trigger:el,start:"top 88%"}});
});
// --- parallax
all("[data-parallax]").forEach(function(el){
  var s=Math.max(-.6,Math.min(.6,num(el.dataset.parallax,.15)));
  G.fromTo(el,{yPercent:-s*50},{yPercent:s*50,ease:"none",scrollTrigger:{trigger:el.parentElement||el,start:"top bottom",end:"bottom top",scrub:true}});
});
// --- pinned scroll story: the stage holds still while the scroll writes its content in and out
mm0.add("(min-width: 900px)",function(){
  all("[data-pin]").forEach(function(sec){
    var stage=sec.querySelector("[data-pin-stage]");if(!stage)return;
    var screens=Math.max(1,Math.min(6,num(sec.dataset.pin,3)));
    var blocks=all("[data-at]",stage).map(function(el){
      var w=el.hasAttribute("data-write")?el:el.querySelector("[data-write]"),words=null;
      if(w&&SPLIT){words=new SPLIT(w,{type:"words"}).words}
      var c=el.hasAttribute("data-pin-count")?el:el.querySelector("[data-pin-count]");
      return {el:el,at:num(el.dataset.at,0),until:el.hasAttribute("data-until")?num(el.dataset.until,1):null,words:words,count:c,end:c?num(c.dataset.pinCount,0):0};
    });
    var zoom=stage.querySelector("[data-pin-zoom]"),z=zoom?num(zoom.dataset.pinZoom,1.2):1;
    var bar=d.createElement("div");bar.className="m-pin-bar";bar.innerHTML="<i></i>";stage.appendChild(bar);
    function cl(v){return v<0?0:v>1?1:v}
    function apply(p){
      blocks.forEach(function(b){
        var k=cl((p-b.at)/.1),o=b.until===null?0:cl((p-b.until)/.08);
        b.el.style.opacity=k*(1-o);b.el.style.visibility=k*(1-o)<=0?"hidden":"visible";
        b.el.style.transform="translate3d(0,"+((1-k)*30-o*40)+"px,0)";
        b.el.style.filter=k<1||o>0?"blur("+((1-k)*10+o*10)+"px)":"";
        if(b.words){var span=(b.until===null?1:b.until)-b.at,n=b.words.length;b.words.forEach(function(wd,i){var q=cl(((p-b.at)/(span*.6))*1.6-i/n*1.1);wd.style.opacity=.15+.85*q})}
        if(b.count){var q2=cl((p-b.at)/Math.max(.12,((b.until===null?1:b.until)-b.at)*.6));b.count.textContent=(b.count.dataset.prefix||"")+Math.round(b.end*q2).toLocaleString()+(b.count.dataset.suffix||"")}
      });
      if(zoom)zoom.style.transform="scale("+(1+(z-1)*p)+")";
      bar.firstChild.style.transform="scaleX("+p+")";
    }
    sec.classList.add("m-pinned");apply(0);
    ST.create({trigger:sec,start:"top top",end:function(){return "+="+screens*innerHeight},pin:stage,scrub:.6,invalidateOnRefresh:true,onUpdate:function(self){apply(self.progress)}});
  });
  return function(){all("[data-pin]").forEach(function(sec){sec.classList.remove("m-pinned");all("[data-at]",sec).forEach(function(el){el.style.cssText=""})})};
});
// --- marquee
all("[data-marquee]").forEach(function(el){
  var item=el.firstElementChild;if(!item)return;
  var copies=Math.max(2,Math.ceil((el.offsetWidth*2)/Math.max(item.offsetWidth,1)));
  var row=d.createElement("div");row.style.cssText="display:inline-flex;will-change:transform";
  for(var i=0;i<copies;i++){var c=item.cloneNode(true);if(i)c.setAttribute("aria-hidden","true");row.appendChild(c)}
  el.innerHTML="";el.appendChild(row);
  var speed=num(el.dataset.speed,1),dir=1,x=0,w=item.offsetWidth||400,boost=0;
  G.ticker.add(function(){x-=(.6*speed+boost)*dir;boost*=.92;if(x<=-w)x+=w;if(x>0)x-=w;G.set(row,{x:x})});
  ST.create({onUpdate:function(self){dir=self.direction;boost=Math.min(8,Math.abs(self.getVelocity())/300)}});
});
// --- horizontal
var mm=G.matchMedia();
mm.add("(min-width: 900px)",function(){
  all("[data-horizontal]").forEach(function(sec){
    var track=sec.querySelector("[data-horizontal-track]");if(!track)return;
    var dist=function(){return Math.max(0,track.scrollWidth-sec.clientWidth)};
    // Nothing wider than the screen to slide through: leave it as an ordinary (swipeable) row.
    if(dist()<40)return;
    sec.classList.add("m-pinned");
    G.to(track,{x:function(){return -dist()},ease:"none",scrollTrigger:{trigger:sec,start:"top top",end:function(){return "+="+dist()},pin:true,scrub:1,invalidateOnRefresh:true}});
  });
  all("[data-stack]").forEach(function(wrap){
    var cards=Array.prototype.slice.call(wrap.children);
    cards.forEach(function(card,i){
      if(i===cards.length-1)return;
      G.to(card,{scale:.9,opacity:.55,filter:"blur(1px)",ease:"none",scrollTrigger:{trigger:cards[i+1],start:"top bottom",end:"top 15%",scrub:true}});
      ST.create({trigger:card,start:"top 12%",endTrigger:wrap,end:"bottom bottom",pin:true,pinSpacing:false});
    });
  });
  return function(){all("[data-horizontal]").forEach(function(sec){sec.classList.remove("m-pinned")})};
});
// --- counters
all("[data-counter]").forEach(function(el){
  var end=num(el.dataset.counter,0),o={v:0},pre=el.dataset.prefix||"",suf=el.dataset.suffix||"",dec=(String(el.dataset.counter).split(".")[1]||"").length;
  el.textContent=pre+"0"+suf;
  G.to(o,{v:end,duration:2,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 90%"},onUpdate:function(){el.textContent=pre+o.v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,",")+suf}});
});
// --- spotlight: a second picture shows through a soft circle that trails the pointer (drifts by itself on touch screens)
all("[data-spotlight]").forEach(function(box){
  var top=box.querySelector("[data-spotlight-reveal]");if(!top)return;
  var r=Math.round(Math.min(260,Math.max(120,innerWidth*.2))),sx=-999,sy=-999,tx=-999,ty=-999,seen=false,t0=performance.now();
  top.style.setProperty("--m-r",r+"px");box.classList.add("m-spot");
  function place(e){var b=box.getBoundingClientRect();tx=e.clientX-b.left;ty=e.clientY-b.top;if(!seen){seen=true;sx=tx;sy=ty}}
  if(fine)W.addEventListener("pointermove",place,{passive:true});
  G.ticker.add(function(){
    var b=box.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;
    if(!fine||!seen){var t=(performance.now()-t0)/1000;tx=b.width*(.5+.3*Math.sin(t*.45));ty=b.height*(.48+.2*Math.sin(t*.9+1));if(sx<-900){sx=tx;sy=ty}}
    sx+=(tx-sx)*.1;sy+=(ty-sy)*.1;
    top.style.setProperty("--m-x",sx.toFixed(1)+"px");top.style.setProperty("--m-y",sy.toFixed(1)+"px");
  });
});
// --- depth: layered first-screen elements drift against the pointer by their own amounts
(function(){
  var layers=all("[data-depth]");if(!layers.length||!fine)return;
  var px=0,py=0,qx=0,qy=0;
  W.addEventListener("pointermove",function(e){px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5},{passive:true});
  var set=layers.map(function(el){return {x:G.quickSetter(el,"x","px"),y:G.quickSetter(el,"y","px"),k:Math.max(-.08,Math.min(.08,num(el.dataset.depth,.02)))}});
  G.ticker.add(function(){qx+=(px-qx)*.06;qy+=(py-qy)*.06;if(scrollY>innerHeight*1.2)return;set.forEach(function(l){l.x(-qx*innerWidth*l.k);l.y(-qy*innerHeight*l.k)})});
})();
// --- pointer effects (desktop only)
if(fine){
  root.classList.add("m-fine");
  var dot=d.createElement("div");dot.className="m-cursor";dot.innerHTML="<span></span>";var ring=d.createElement("div");ring.className="m-ring";
  d.body.appendChild(ring);d.body.appendChild(dot);
  var dx=G.quickTo(dot,"x",{duration:.12}),dy=G.quickTo(dot,"y",{duration:.12}),rx=G.quickTo(ring,"x",{duration:.5,ease:"power3"}),ry=G.quickTo(ring,"y",{duration:.5,ease:"power3"});
  W.addEventListener("pointermove",function(e){dx(e.clientX);dy(e.clientY);rx(e.clientX);ry(e.clientY)});
  d.addEventListener("pointerover",function(e){
    var t=e.target.closest&&e.target.closest("[data-cursor-text],a,button,summary,label,input,textarea,select");
    if(!t){G.to(dot,{width:10,height:10,duration:.3});G.to(ring,{scale:1,opacity:1,duration:.3});dot.classList.remove("label");return}
    var txt=t.getAttribute("data-cursor-text");
    if(txt){dot.firstChild.textContent=txt;dot.classList.add("label");G.to(dot,{width:86,height:86,duration:.35,ease:"power3"});G.to(ring,{opacity:0,duration:.2})}
    else{dot.classList.remove("label");G.to(dot,{width:10,height:10,duration:.3});G.to(ring,{scale:1.6,duration:.35})}
  });
  all("[data-magnetic]").forEach(function(el){
    var mx=G.quickTo(el,"x",{duration:.6,ease:"elastic.out(1,.4)"}),my=G.quickTo(el,"y",{duration:.6,ease:"elastic.out(1,.4)"});
    el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect();mx((e.clientX-r.left-r.width/2)*.35);my((e.clientY-r.top-r.height/2)*.35)});
    el.addEventListener("pointerleave",function(){mx(0);my(0)});
  });
  all("[data-tilt]").forEach(function(el){
    el.style.transformStyle="preserve-3d";
    el.addEventListener("pointermove",function(e){var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;G.to(el,{rotationY:px*10,rotationX:-py*10,transformPerspective:900,duration:.5})});
    el.addEventListener("pointerleave",function(){G.to(el,{rotationY:0,rotationX:0,duration:.8,ease:"power3"})});
  });
  all("[data-follow]").forEach(function(el){
    var box=el.parentElement;if(!box)return;var fx=G.quickTo(el,"x",{duration:.6,ease:"power3"}),fy=G.quickTo(el,"y",{duration:.6,ease:"power3"});
    G.set(el,{position:"absolute",left:0,top:0,xPercent:-50,yPercent:-50,opacity:0,scale:.8});
    box.addEventListener("pointermove",function(e){var r=box.getBoundingClientRect();fx(e.clientX-r.left);fy(e.clientY-r.top)});
    box.addEventListener("pointerenter",function(){G.to(el,{opacity:1,scale:1,duration:.4})});
    box.addEventListener("pointerleave",function(){G.to(el,{opacity:0,scale:.8,duration:.4})});
  });
  var dist=all("[data-distort]");
  if(dist.length){
    var svg=d.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("width","0");svg.setAttribute("height","0");svg.style.position="absolute";
    svg.innerHTML='<filter id="m-distort"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    d.body.appendChild(svg);var dm=svg.querySelector("feDisplacementMap"),tb=svg.querySelector("feTurbulence");
    dist.forEach(function(el){
      el.addEventListener("pointerenter",function(){el.style.filter="url(#m-distort)";G.fromTo(dm,{attr:{scale:0}},{attr:{scale:38},duration:.5,yoyo:true,repeat:1,ease:"sine.inOut",onComplete:function(){el.style.filter=""}});G.fromTo(tb,{attr:{baseFrequency:"0.012 0.02"}},{attr:{baseFrequency:"0.004 0.008"},duration:1})});
    });
  }
}
// --- page transitions + preloader
d.documentElement.style.setProperty("--m-accent",getComputedStyle(root).getPropertyValue("--m-accent")||"#111");
var cur=d.createElement("div");cur.className="m-curtain";d.body.appendChild(cur);
var seen=false;try{seen=sessionStorage.getItem("m-seen")==="1";sessionStorage.setItem("m-seen","1")}catch(e){}
var arriving=false;try{arriving=sessionStorage.getItem("m-go")==="1";sessionStorage.removeItem("m-go")}catch(e){}
function start(){intro.play();ST.refresh()}
if(arriving){G.set(cur,{yPercent:0});G.to(cur,{yPercent:-100,duration:.8,ease:"expo.inOut",delay:.05,onComplete:function(){G.set(cur,{yPercent:100})}});intro.delay(.35);start()}
else if(!seen){
  var pre=d.createElement("div");pre.className="m-pre";var name=(d.title.split("|")[0]||"").trim();
  pre.innerHTML="<span></span><b>0</b>";pre.firstChild.textContent=name;d.body.appendChild(pre);
  var n={v:0},bnum=pre.querySelector("b");if(lenis)lenis.stop();
  G.to(n,{v:100,duration:1.4,ease:"power2.inOut",onUpdate:function(){bnum.textContent=Math.round(n.v)},onComplete:function(){
    G.to(pre,{yPercent:-100,duration:.9,ease:"expo.inOut",onComplete:function(){pre.remove();if(lenis)lenis.start()}});intro.delay(.45);start()}});
}else start();
d.addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;
  var h=a.getAttribute("href");if(!h||h.charAt(0)==="#"||a.target==="_blank"||a.hasAttribute("download")||/^(mailto|tel|sms):/i.test(h))return;
  var u;try{u=new URL(a.href,location.href)}catch(x){return}
  if(u.origin!==location.origin||(u.pathname===location.pathname&&u.hash))return;
  e.preventDefault();try{sessionStorage.setItem("m-go","1")}catch(x){}
  G.fromTo(cur,{yPercent:100},{yPercent:0,duration:.6,ease:"expo.inOut",onComplete:function(){location.href=u.href}});
});
W.addEventListener("pageshow",function(e){if(e.persisted)G.set(cur,{yPercent:100})});
W.addEventListener("load",function(){ST.refresh()});
}

function shader(box){
  var colors=(box.dataset.colors||"#ff5a36,#2b1a6b,#0b0b10").split(",").map(function(h){h=h.trim().replace("#","");if(h.length===3)h=h.split("").map(function(c){return c+c}).join("");var n=parseInt(h,16);return isNaN(n)?[0,0,0]:[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]});
  while(colors.length<3)colors.push(colors[colors.length-1]||[0,0,0]);
  var cv=d.createElement("canvas");box.appendChild(cv);var gl=cv.getContext("webgl",{premultipliedAlpha:false,antialias:false});
  if(!gl){box.style.background="radial-gradient(120% 120% at 20% 20%,rgb("+colors[0].map(function(v){return v*255}).join(",")+"),rgb("+colors[1].map(function(v){return v*255}).join(",")+") 50%,rgb("+colors[2].map(function(v){return v*255}).join(",")+"))";return}
  var vs="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var fs="precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c1,c2,c3;"+
  "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}"+
  "float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}"+
  "void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.6;float tt=t*.06;vec2 q=vec2(fb(p+tt),fb(p+vec2(5.2,1.3)-tt));"+
  "vec2 w=vec2(fb(p+3.*q+vec2(1.7,9.2)+(m-.5)*1.2+tt*1.6),fb(p+3.*q+vec2(8.3,2.8)-tt));float f=fb(p+2.5*w);"+
  "vec3 col=mix(c3,c2,smoothstep(.15,.75,f));col=mix(col,c1,smoothstep(.45,1.,f*f+length(w)*.35));"+
  "col+=(h(gl_FragCoord.xy+t)-.5)*.035;gl_FragColor=vec4(col,1.);}";
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  var ur=gl.getUniformLocation(pr,"r"),ut=gl.getUniformLocation(pr,"t"),um=gl.getUniformLocation(pr,"m");
  gl.uniform3fv(gl.getUniformLocation(pr,"c1"),colors[0]);gl.uniform3fv(gl.getUniformLocation(pr,"c2"),colors[1]);gl.uniform3fv(gl.getUniformLocation(pr,"c3"),colors[2]);
  var mx=.5,my=.5,tx=.5,ty=.5,vis=true,dpr=Math.min(W.devicePixelRatio||1,1.5),t0=performance.now();
  function size(){var w=box.clientWidth,h=box.clientHeight;cv.width=Math.max(1,w*dpr*.6);cv.height=Math.max(1,h*dpr*.6);gl.viewport(0,0,cv.width,cv.height)}
  size();W.addEventListener("resize",size);
  W.addEventListener("pointermove",function(e){var r=box.getBoundingClientRect();tx=(e.clientX-r.left)/Math.max(r.width,1);ty=1-(e.clientY-r.top)/Math.max(r.height,1)});
  if("IntersectionObserver" in W)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(box);
  function frame(now){if(vis){mx+=(tx-mx)*.04;my+=(ty-my)*.04;gl.uniform2f(ur,cv.width,cv.height);gl.uniform1f(ut,reduce?0:(now-t0)/1000);gl.uniform2f(um,mx,my);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}if(!reduce)requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
}
})();`;

/** Script tags for the libraries plus the runtime, for the end of <body>. */
export function motionScripts(): string {
  return `${MOTION_LIBS.map((u) => `<script src="${u}"></script>`).join("")}<script>${MOTION_JS}</script>`;
}
