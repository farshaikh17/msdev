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
- Signature-hero mechanics (use only when this site's signature hero calls for them; its spec says exactly how): data-dive on a hero section with a data-dive-stage inside (camera dive on scroll; data-dive-out / data-dive-in on its text blocks; data-dive-origin="x% y%" on the stage); data-switch on a hero section with an empty data-switch-nav (scene switcher); data-slides on a section of data-slide children with data-color and data-title, plus an empty data-slides-tabs (colour-field slider); data-sway on a hanging badge (drops in on its strap, sways, swings on hover); data-perch on the empty boxes the flying object lands in; data-front on a hero whose giant word carries data-front-text (it passes behind the photo's cut-out subject); the turning showcase is a data-pin hero whose stage holds our object; data-breakout on the photo card whose subject breaks out of it; data-orbit around the headline our object circles; data-mask-zoom (with data-word, one img and a data-mask-after block) and data-particles (with data-word and a data-particles-after block) for the brand moment.
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
.hero-motion [data-dive-to]{opacity:0}[data-dive-stage]{position:relative}
@media (max-width:899px){[data-dive] [data-dive-in]{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;transform:none!important;margin:0 auto;padding:48px 20px;opacity:1!important;filter:none!important}}
.hero-motion [data-switch-item]{transition:opacity 1s ease-in-out;animation:none!important;transform:scale(1.03)}.hero-motion [data-switch-item]:not(:first-child){opacity:0}
.m-sw .hero-motion [data-switch-item]{opacity:0}.m-sw .hero-motion [data-switch-item].on{opacity:1}
.m-switch-btn{background:none;border:0;border-bottom:1px solid transparent;color:inherit;font:inherit;cursor:pointer;opacity:.5;transition:opacity .3s,border-color .3s}.m-switch-btn:hover{opacity:.8}.m-switch-btn.on{opacity:1;border-bottom-color:currentColor}
[data-slides]{transition:background-color 1.2s cubic-bezier(.77,0,.18,1)}[data-slides]:not(.m-sl) [data-slide]:not(:first-of-type){display:none}
.m-sl [data-slide]{position:absolute;inset:0;transition:transform 1.2s cubic-bezier(.77,0,.18,1),opacity 1.2s cubic-bezier(.77,0,.18,1)}
.m-sl [data-slide].in{transform:translateY(100%);opacity:0;visibility:hidden}.m-sl [data-slide].out{transform:translateY(-100%);opacity:0}.m-sl [data-slide].on{transform:none;opacity:1}
[data-slides-tabs]{position:relative}.m-slide-tab{display:flex;align-items:baseline;gap:12px;background:none;border:0;color:inherit;font:inherit;cursor:pointer;opacity:.62;padding:0;margin:0 0 18px;text-align:left;transition:opacity .4s}.m-slide-tab.on{opacity:1}.m-slide-tab small{font-size:.58em;opacity:.7}
.m-slides-bar{position:absolute;left:-22px;top:0;width:2px;height:24px;background:rgba(128,128,128,.3);transition:transform .6s cubic-bezier(.77,0,.18,1),height .6s}.m-slides-bar i{display:block;width:100%;height:100%;background:currentColor;transform-origin:50% 0;transform:scaleY(0)}
@media (max-width:899px){[data-slides-tabs]{display:flex;gap:14px;flex-wrap:wrap}.m-slide-tab{margin:0}.m-slide-tab small,.m-slides-bar{display:none}}
[data-pin].m-pinned [data-pin-stage]{position:relative;height:100vh;overflow:hidden}
.m-pin-bar{position:absolute;left:50%;bottom:22px;width:120px;height:2px;margin-left:-60px;background:rgba(128,128,128,.3);border-radius:2px;z-index:5;pointer-events:none}.m-pin-bar i{display:block;height:100%;background:var(--m-accent,#111);transform-origin:0 50%;transform:scaleX(0)}
[data-follow]{pointer-events:none;display:none}html.m-on.m-fine [data-follow]{display:block}
.m-float{position:fixed;left:0;top:0;z-index:30;pointer-events:none;opacity:0;transform-origin:0 0;will-change:transform,opacity;filter:drop-shadow(0 30px 34px rgba(0,0,0,.32)) drop-shadow(0 6px 10px rgba(0,0,0,.16))}
.m-float canvas{width:100%;height:100%;display:block}
[data-perch]{pointer-events:none}[data-perch] .m-perch-still{width:100%;height:100%;object-fit:contain;display:block}
.hero-motion:has(.m-spin){z-index:1}
.hero-motion .m-spin{position:absolute;inset:7% 10%;filter:drop-shadow(0 44px 50px rgba(0,0,0,.45));will-change:transform}
.hero-motion .m-spin img,.hero-motion .m-spin canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:contain!important;animation:none!important;opacity:1!important;transform:none!important}
.hero-subject{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
.hero-subject img,.hero-motion[data-front-layer] img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;animation:none!important;opacity:1!important;transform:none}
.hero-subject,.hero-motion[data-front-layer]{transform-origin:50% 62%}
[data-front] [data-front-text]{text-shadow:0 4px 40px rgba(0,0,0,.32),0 1px 3px rgba(0,0,0,.18)}
[data-breakout]{position:relative;perspective:1100px}[data-breakout]>.m-tilt{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
[data-breakout] .hero-motion{clip-path:inset(16% 3% 0 3% round 22px);filter:drop-shadow(0 30px 40px rgba(0,0,0,.35))}
[data-breakout] .hero-subject{overflow:visible;filter:drop-shadow(0 24px 28px rgba(0,0,0,.35))}
[data-orbit]{position:relative}[data-orbit] .m-orb{position:absolute;left:0;top:0;pointer-events:none;will-change:transform;filter:drop-shadow(0 18px 22px rgba(0,0,0,.35))}[data-orbit] .m-orb.back{z-index:1}[data-orbit] .m-orb.front{z-index:3}
.m-mask{position:relative;height:100vh;overflow:hidden;padding:0!important}.m-mask>img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;border-radius:0;margin:0}
.m-mask .m-mask-svg{position:absolute;inset:-2px;width:calc(100% + 4px);height:calc(100% + 4px);z-index:1;will-change:transform}
.m-mask [data-mask-after]{position:absolute;left:0;right:0;bottom:12vh;z-index:2;text-align:center;padding:0 20px;color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.45)}
.m-parts{position:relative;height:100vh;overflow:hidden}.m-parts canvas.m-parts-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.m-parts [data-particles-after]{position:absolute;left:0;right:0;bottom:10vh;z-index:2;text-align:center;padding:0 20px}
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
// --- scene switcher: full-screen scenes crossfade, chosen from a labelled row (no library needed)
all("[data-switch]").forEach(function(sec){
  var items=all("[data-switch-item]",sec),nav=sec.querySelector("[data-switch-nav]");if(items.length<2)return;
  var cur=0,lock=false,timer=null;sec.classList.add("m-sw");
  var btns=items.map(function(it,i){var b=d.createElement("button");b.type="button";b.className="m-switch-btn";b.textContent=it.getAttribute("data-label")||("Scene "+(i+1));b.addEventListener("click",function(){go(i,true)});if(nav)nav.appendChild(b);return b});
  function show(i){items.forEach(function(it,k){it.classList.toggle("on",k===i);if(it.tagName==="VIDEO"){if(k===i){try{it.currentTime=0;var p=it.play();if(p&&p.catch)p.catch(function(){})}catch(e){}}else{try{it.pause()}catch(e){}}}});btns.forEach(function(b,k){b.classList.toggle("on",k===i);b.setAttribute("aria-pressed",k===i?"true":"false")})}
  function go(i,user){if(i===cur||lock)return;lock=true;cur=i;show(i);setTimeout(function(){lock=false},1000);if(user)restart()}
  function restart(){if(reduce)return;clearInterval(timer);timer=setInterval(function(){if(!d.hidden)go((cur+1)%items.length)},7000)}
  show(0);restart();
});
// --- colour-field slider: slides rise one screen at a time, with a numbered tab list and a progress line
all("[data-slides]").forEach(function(sec){
  var slides=all("[data-slide]",sec),tabs=sec.querySelector("[data-slides-tabs]")||d.querySelector("[data-slides-tabs]");if(slides.length<2)return;
  var cur=0,timer=null,DUR=5000;sec.classList.add("m-sl");
  var bar=null,fill=null,btns=[];
  if(tabs){bar=d.createElement("div");bar.className="m-slides-bar";fill=d.createElement("i");bar.appendChild(fill);tabs.appendChild(bar);
    btns=slides.map(function(sl,i){var b=d.createElement("button");b.type="button";b.className="m-slide-tab";var n=d.createElement("small");n.textContent=(i<9?"0":"")+(i+1);var t=d.createElement("span");t.textContent=sl.getAttribute("data-title")||("Slide "+(i+1));b.appendChild(n);b.appendChild(t);b.addEventListener("click",function(){go(i)});tabs.appendChild(b);return b})}
  function paint(i,prev){
    slides.forEach(function(sl,k){sl.classList.remove("on","out","in");if(k===i)sl.classList.add("on");else if(k===prev)sl.classList.add("out");else sl.classList.add("in")});
    var c=slides[i].getAttribute("data-color");if(c)sec.style.backgroundColor=c;
    btns.forEach(function(b,k){b.classList.toggle("on",k===i)});
    if(bar&&btns[i]){var bt=btns[i].offsetTop,bh=btns[i].offsetHeight;bar.style.transform="translateY("+bt+"px)";bar.style.height=bh+"px"}
    if(fill){fill.style.transition="none";fill.style.transform="scaleY(0)";void fill.offsetWidth;if(!reduce){fill.style.transition="transform "+DUR+"ms linear";fill.style.transform="scaleY(1)"}}
  }
  function go(i){if(i===cur)return;var p=cur;cur=(i+slides.length)%slides.length;paint(cur,p);restart()}
  function restart(){clearTimeout(timer);if(reduce)return;timer=setTimeout(function(){if(!d.hidden)go(cur+1);else restart()},DUR)}
  var sy=null;sec.addEventListener("touchstart",function(e){sy=e.touches[0].clientY},{passive:true});
  sec.addEventListener("touchend",function(e){if(sy===null)return;var dy=e.changedTouches[0].clientY-sy;sy=null;if(Math.abs(dy)>50&&Math.abs(dy)<innerHeight*.6)go(cur+(dy<0?1:-1))},{passive:true});
  paint(0,-1);restart();
});
// --- frames: a set of transparent pictures drawn into a canvas (fitted, centred), for objects that turn
function frameSet(urls){var imgs=urls.map(function(u){var im=new Image();im.decoding="async";im.src=u;return im});return {imgs:imgs,n:imgs.length,ready:function(i){var im=imgs[i];return !!(im&&im.complete&&im.naturalWidth)}}}
// The part of a cut-out that isn't empty (cut-outs keep a wide transparent margin), measured once per picture.
function bbox(im){
  if(im.__bb)return im.__bb;var nw=im.naturalWidth,nh=im.naturalHeight,bb={x:0,y:0,w:nw,h:nh};
  try{var n=64,cv=d.createElement("canvas");cv.width=n;cv.height=n;var c=cv.getContext("2d");c.drawImage(im,0,0,n,n);var p=c.getImageData(0,0,n,n).data,x0=n,y0=n,x1=-1,y1=-1;
    for(var y=0;y<n;y++)for(var x=0;x<n;x++)if(p[(y*n+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
    if(x1>=x0&&y1>=y0){var pad=1;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(n-1,x1+pad);y1=Math.min(n-1,y1+pad);bb={x:x0/n*nw,y:y0/n*nh,w:(x1-x0+1)/n*nw,h:(y1-y0+1)/n*nh}}}catch(e){}
  im.__bb=bb;return bb;
}
function draw(c,im,w,h){var b=bbox(im),sc=Math.min(w/b.w,h/b.h),dw=b.w*sc,dh=b.h*sc;c.drawImage(im,b.x,b.y,b.w,b.h,(w-dw)/2,(h-dh)/2,dw,dh)}
function paint(cv,set,i){
  var w=cv.width,h=cv.height,k=i;if(!w||!h)return false;
  for(var j=0;j<set.n&&!set.ready(k);j++)k=(k+1)%set.n;if(!set.ready(k))return false;
  var c=cv.getContext("2d");c.clearRect(0,0,w,h);draw(c,set.imgs[k],w,h);return true;
}
function fit(cv){var r=Math.min(W.devicePixelRatio||1,2),w=Math.round(cv.clientWidth*r),h=Math.round(cv.clientHeight*r);if(w&&h&&(cv.width!==w||cv.height!==h)){cv.width=w;cv.height=h;return true}return false}
// --- subject in front: place the giant word so the subject overlaps part of it (the magazine-cover look) but it stays readable.
// The cut-out's outline is read from its pixels; each height from the top down is tried, and the first where the subject
// covers a modest share of the letters wins. If every height hides too much, the word goes in front of the subject.
all(".hero-subject").forEach(function(sub){
  var sec=sub.parentElement,img=sub.querySelector("img"),txt=sec&&(sec.querySelector("[data-front-text]")||sec.querySelector("h1"));if(!img||!txt)return;
  var base=null;
  function place(){
    try{
      var nw=img.naturalWidth,nh=img.naturalHeight,bw=sec.clientWidth,bh=sec.clientHeight;if(!nw||!nh||!bw||!bh)return;
      if(base===null)base=txt.style.top;txt.style.top=base;sub.style.zIndex="";
      var cw=96,ch=Math.max(8,Math.round(96*nh/nw)),cv=d.createElement("canvas");cv.width=cw;cv.height=ch;var c=cv.getContext("2d");c.drawImage(img,0,0,cw,ch);
      var px=c.getImageData(0,0,cw,ch).data,sc=Math.max(bw/nw,bh/nh),ox=(bw-nw*sc)/2,oy=(bh-nh*sc)/2;
      var sr=sec.getBoundingClientRect(),rg=d.createRange();rg.selectNodeContents(txt);var tr=rg.getBoundingClientRect();
      var L=tr.left-sr.left,R=tr.right-sr.left,H=tr.height*.78,off=tr.top-txt.getBoundingClientRect().top;if(R-L<20||H<10)return;
      function solid(x,y){var ix=Math.floor((x-ox)/sc/nw*cw),iy=Math.floor((y-oy)/sc/nh*ch);if(ix<0||iy<0||ix>=cw||iy>=ch)return 0;return px[(iy*cw+ix)*4+3]>160?1:0}
      function cover(top){var n=0,k=0;for(var i=0;i<28;i++)for(var j=0;j<6;j++){n+=solid(L+(R-L)*(i+.5)/28,top+off+H*(.12+.76*j/5));k++}return n/k}
      var best=null,low=1,lowAt=null;
      for(var t=bh*.06;t<=bh*.5;t+=bh*.02){var cv2=cover(t);if(cv2<low){low=cv2;lowAt=t}if(best===null&&cv2>=.05&&cv2<=.3)best=t}
      if(best!==null)txt.style.top=Math.round(best)+"px";
      else if(low>.38)sub.style.zIndex="1";
      else if(low>=.05)txt.style.top=Math.round(lowAt)+"px";
    }catch(e){}
  }
  if(img.complete)place();else img.addEventListener("load",place);
  var rt;W.addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(place,150)});
});
// --- breakout: the photo card and its cut-out subject tilt together in 3D, the subject floating in front of the card
all("[data-breakout]").forEach(function(card){
  var layer=card.querySelector(".hero-motion"),sub=card.querySelector(".hero-subject");if(!layer)return;
  var t=d.createElement("div");t.className="m-tilt";card.insertBefore(t,layer);t.appendChild(layer);if(sub){t.appendChild(sub);sub.style.transform="translateZ(70px) scale(.94)"}
  layer.style.transform="translateZ(0)";
  // The card's top edge goes just below the subject's head, so the head and shoulders break out over it.
  var simg=sub&&sub.querySelector("img");
  function edge(){try{var b=bbox(simg),nw=simg.naturalWidth,nh=simg.naturalHeight,cw=card.clientWidth,ch=card.clientHeight,sc=Math.max(cw/nw,ch/nh),oy=(ch-nh*sc)/2,top=(oy+b.y*sc)/ch,cut=Math.max(.12,Math.min(.45,top+(b.h*sc/ch)*.24));layer.style.clipPath="inset("+(cut*100).toFixed(1)+"% 3% 0 3% round 22px)"}catch(e){}}
  if(simg){if(simg.complete)edge();else simg.addEventListener("load",edge);W.addEventListener("resize",edge)}
  var rx=0,ry=0,tx=0,ty=0,lift=0;
  if(fine)W.addEventListener("pointermove",function(e){var r=card.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*16;ty=-((e.clientY-r.top)/r.height-.5)*12},{passive:true});
  function frame(now){
    if(!fine&&!reduce){var k=now/1000;tx=Math.sin(k*.6)*7;ty=Math.cos(k*.5)*5}
    var r=card.getBoundingClientRect();lift=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height)));
    rx+=(ty-rx)*.08;ry+=(tx-ry)*.08;
    t.style.transform="rotateX("+rx.toFixed(2)+"deg) rotateY("+ry.toFixed(2)+"deg)";
    if(sub)sub.style.transform="translateZ(70px) translateY("+(-lift*40).toFixed(1)+"px) scale("+(.94+lift*.06).toFixed(3)+")";
    if(!reduce)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
// --- orbit: the signature object circles the headline on a tilted ellipse, behind the letters and then in front
all("[data-orbit]").forEach(function(box){
  var src=(d.querySelector(".m-float")||{getAttribute:function(){return ""}}).getAttribute("data-still");if(!src)return;
  var back=d.createElement("canvas"),front=d.createElement("canvas"),im=new Image(),drawn=0;back.className="m-orb back";front.className="m-orb front";box.appendChild(back);box.appendChild(front);im.src=src;
  var ang=-.6,last=performance.now(),sy=scrollY,boost=0;
  function frame(now){
    var dt=Math.min(.05,(now-last)/1000);last=now;var dy=Math.abs(scrollY-sy);sy=scrollY;boost=Math.min(4,boost*.92+dy*.02);
    if(!reduce)ang+=dt*(.55+boost);
    var w=box.clientWidth,h=box.clientHeight,size=Math.min(h*.62,w*.26,260),z=Math.sin(ang),sc=.62+.38*(z+1)/2;
    var px=Math.round(size*Math.min(W.devicePixelRatio||1,2));if(im.complete&&im.naturalWidth&&drawn!==px){drawn=px;[back,front].forEach(function(cv){cv.width=cv.height=px;var c=cv.getContext("2d");c.clearRect(0,0,px,px);draw(c,im,px,px)})}
    var x=w/2+Math.cos(ang)*w*.56-size/2,y=h/2+Math.sin(ang)*h*.34-Math.cos(ang)*h*.12-size/2;
    [back,front].forEach(function(im){im.style.width=im.style.height=size+"px";im.style.transform="translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0) scale("+sc.toFixed(3)+") rotate("+(Math.cos(ang)*-14).toFixed(1)+"deg)"});
    front.style.opacity=z>0?1:0;back.style.opacity=z>0?0:.85;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
// --- headlines over a picture: light type gets a soft shadow so it reads over the brightest part of any photo
all("section").forEach(function(sec){
  if(!sec.querySelector(":scope > .hero-motion, :scope .hero-motion"))return;
  all("h1, h2",sec).forEach(function(h){
    if(h.closest("[data-front-text]")||getComputedStyle(h).textShadow!=="none")return;
    var m=(getComputedStyle(h).color.match(/\d+(\.\d+)?/g)||[]).map(Number);if(m.length<3)return;
    if(.2126*m[0]+.7152*m[1]+.0722*m[2]>170)h.style.textShadow="0 2px 26px rgba(0,0,0,.38), 0 1px 3px rgba(0,0,0,.22)";
  });
});
// --- turning showcase: the object turns by itself; a pinned stage drives it with the scroll instead
all(".m-spin").forEach(function(box){
  var urls=(box.getAttribute("data-spin-frames")||"").split("|").filter(Boolean),img=box.querySelector("img"),cv=null,set=null,last=-1,manual=false,t0=performance.now(),vis=true;
  if(urls.length>1){cv=d.createElement("canvas");box.appendChild(cv);set=frameSet(urls)}
  function show(i){if(!set)return;i=((i%set.n)+set.n)%set.n;var grown=fit(cv);if(i===last&&!grown)return;if(paint(cv,set,i)){last=i;if(img)img.style.visibility="hidden"}}
  box.__spin={set:function(p){manual=true;if(set)show(Math.round(p*(set.n-1)));box.style.transform="translate3d(0,"+((.5-p)*24).toFixed(1)+"px,0) scale("+(.92+.12*p).toFixed(3)+")"+(set?"":" rotate("+((p-.5)*26).toFixed(2)+"deg)")},auto:function(){manual=false;box.style.transform=""}};
  if("IntersectionObserver" in W)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(box);
  function tick(now){if(!manual&&vis){var t=(now-t0)/1000;if(set)show(reduce?0:Math.floor(t*9));else if(!reduce)box.style.transform="rotate("+(Math.sin(t*.7)*7).toFixed(2)+"deg)"}requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
});
// --- flying object: it rests in an empty perch, and the scroll carries it in an arc to the next one, turning and tilting
(function(){
  var layer=d.querySelector(".m-float");if(!layer)return;
  var perches=all("[data-perch]"),still=layer.getAttribute("data-still")||"";
  if(!perches.length||!still){layer.remove();return}
  if(reduce){var im=d.createElement("img");im.src=still;im.alt="";im.className="m-perch-still";perches[0].appendChild(im);layer.remove();return}
  var urls=(layer.getAttribute("data-frames")||"").split("|").filter(Boolean),set=frameSet(urls.length>1?urls:[still]),cv=layer.querySelector("canvas"),path=layer.getAttribute("data-path")||"arc";
  var px=0,tilt=0,cx=null,cy=0,cs=0,born=null,last=-1,t0=performance.now(),max=0;
  if(fine)W.addEventListener("pointermove",function(e){px=e.clientX/innerWidth-.5},{passive:true});
  function rects(){return perches.map(function(p){var r=p.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,s:Math.min(r.width,r.height)}}).filter(function(r){return r.s>8})}
  function size(){var R=rects(),m=0;R.forEach(function(r){if(r.s>m)m=r.s});if(m&&Math.abs(m-max)>2){max=m;layer.style.width=layer.style.height=m+"px";fit(cv);last=-1}}
  size();W.addEventListener("resize",size);
  function frame(now){
    var R=rects();
    if(R.length&&max){
      var focus=innerHeight*.55,i=0,k;for(k=0;k<R.length;k++)if(R[k].y<=focus)i=k;
      var a=R[i],b=R[Math.min(i+1,R.length-1)],t=0;
      if(b!==a&&R[0].y<=focus)t=Math.max(0,Math.min(1,(focus-a.y)/(b.y-a.y)));
      // The arc swings toward the middle of the screen, and the object never leaves it sideways.
      var e=t*t*(3-2*t),mid=(a.x+b.x)/2,dir=mid>innerWidth/2?-1:1,lift=Math.sin(Math.PI*e);
      var amp=Math.min(innerWidth*.2,280),ts=(a.s+(b.s-a.s)*e)*(1+lift*.12),tx=a.x+(b.x-a.x)*e,ty=a.y+(b.y-a.y)*e;
      // Each site has its own flight: a swooping arc, an arc with a loop in the middle, or a zigzag.
      if(path==="loop"){tx+=lift*amp*dir+Math.sin(e*Math.PI*2)*amp*.35*dir;ty-=(1-Math.cos(e*Math.PI*2))*amp*.3}
      else if(path==="zig")tx+=Math.sin(e*Math.PI*3)*amp*.8*dir;
      else tx+=lift*amp*dir;
      tx=Math.max(ts*.45,Math.min(innerWidth-ts*.45,tx));
      var time=(now-t0)/1000;ty+=Math.sin(time*1.3)*Math.min(12,ts*.025)*(1-lift);
      if(cx===null){cx=tx;cy=ty;cs=ts}
      cx+=(tx-cx)*.18;cy+=(ty-cy)*.18;cs+=(ts-cs)*.18;
      tilt+=(lift*-18*dir+px*10+Math.sin(time*.9)*2-tilt)*.08;
      // It rocks either side of its best angle (frame 0), further while it flies, rather than showing its thin side.
      var swing=Math.sin((i+t)*Math.PI*2+time*.5)*(.08+.1*lift),f=set.n>1?Math.round(((swing%1)+1)%1*set.n)%set.n:0;
      if(f!==last&&paint(cv,set,f)){last=f;if(born===null)born=now}
      var grow=born===null?0:Math.min(1,(now-born)/1100),ge=1-Math.pow(1-grow,3);
      layer.style.opacity=ge;
      layer.style.transform="translate3d("+(cx-cs/2).toFixed(1)+"px,"+(cy-cs/2+(1-ge)*40).toFixed(1)+"px,0) scale("+(cs/max*(.8+.2*ge)).toFixed(4)+") rotate("+tilt.toFixed(2)+"deg)";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
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
    var zoom=stage.querySelector("[data-pin-zoom]"),z=zoom?num(zoom.dataset.pinZoom,1.2):1,spin=stage.querySelector(".m-spin");
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
      if(spin&&spin.__spin)spin.__spin.set(p);
      bar.firstChild.style.transform="scaleX("+p+")";
    }
    sec.classList.add("m-pinned");apply(0);
    ST.create({trigger:sec,start:"top top",end:function(){return "+="+screens*innerHeight},pin:sec,scrub:.6,invalidateOnRefresh:true,onUpdate:function(self){apply(self.progress)}});
  });
  return function(){all("[data-pin]").forEach(function(sec){sec.classList.remove("m-pinned");all("[data-at]",sec).forEach(function(el){el.style.cssText=""});all(".m-spin",sec).forEach(function(b){if(b.__spin)b.__spin.auto()})})};
});
// --- camera dive: the hero pins while the scroll pushes the camera into the picture and lands in a second scene
mm0.add("(min-width: 900px)",function(){
  all("[data-dive]").forEach(function(sec){
    var stage=sec.querySelector("[data-dive-stage]")||sec,layer=stage.querySelector(".hero-motion");if(!layer)return;
    var to=layer.querySelector("[data-dive-to]"),first=layer.querySelector("img:not([data-dive-to]),video");
    var outs=all("[data-dive-out]",stage),ins=all("[data-dive-in]",stage),screens=Math.max(1,Math.min(4,num(sec.dataset.dive,2.4)));
    layer.style.transformOrigin=stage.getAttribute("data-dive-origin")||"55% 55%";
    var bar=d.createElement("div");bar.className="m-pin-bar";bar.innerHTML="<i></i>";stage.appendChild(bar);
    function cl(v){return v<0?0:v>1?1:v}function seg(p,a,b){return cl((p-a)/(b-a))}function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
    function apply(p){
      var push=ease(seg(p,.02,.62));
      if(first)first.style.transform="scale("+(1+push*1.6)+")";
      if(first)first.style.filter=push>.55?"blur("+((push-.55)*14).toFixed(1)+"px)":"";
      if(to){var land=seg(p,.42,.62);to.style.opacity=land;to.style.transform="scale("+(1.18-.18*ease(seg(p,.42,1)))+")"}
      var o=seg(p,.02,.16);outs.forEach(function(el){el.style.opacity=1-o;el.style.transform="translate3d(0,"+(-o*70)+"px,0) scale("+(1+o*.08)+")";el.style.filter=o>0?"blur("+(o*12).toFixed(1)+"px)":"";el.style.visibility=o>=1?"hidden":"visible"});
      ins.forEach(function(el,i){var k=seg(p,.6+i*.04,.76+i*.04);el.style.opacity=k;el.style.transform="translate3d(0,"+((1-k)*30)+"px,0)";el.style.filter=k<1?"blur("+((1-k)*12).toFixed(1)+"px)":"";el.style.visibility=k<=0?"hidden":"visible"});
      bar.firstChild.style.transform="scaleX("+p+")";
    }
    sec.classList.add("m-diving");apply(0);
    // Pin the whole section, so a fixed height on it can't swallow the scroll that drives the dive.
    ST.create({trigger:sec,start:"top top",end:function(){return "+="+screens*innerHeight},pin:sec,scrub:.6,invalidateOnRefresh:true,onUpdate:function(self){apply(self.progress)}});
  });
  return function(){all("[data-dive]").forEach(function(sec){sec.classList.remove("m-diving");all("[data-dive-out],[data-dive-in],.hero-motion img,.hero-motion video",sec).forEach(function(el){el.style.opacity="";el.style.transform="";el.style.filter="";el.style.visibility=""})})};
});
// --- subject in front: the giant word rises from behind the cut-out subject, then slides up behind it as the page scrolls
all(".hero-subject").forEach(function(sub){
  var sec=sub.parentElement,layer=sec&&sec.querySelector(".hero-motion"),txt=sec&&(sec.querySelector("[data-front-text]")||sec.querySelector("h1"));if(!txt||!layer)return;
  G.set(txt,{yPercent:30,opacity:0});
  intro.to(txt,{yPercent:0,opacity:1,duration:1.5,ease:"expo.out"},.05);
  G.timeline({scrollTrigger:{trigger:sec,start:"top top",end:"bottom top",scrub:.5}}).to(txt,{yPercent:-60,ease:"none"},0).to([layer,sub],{scale:1.1,ease:"none"},0);
  if(fine){var tx=G.quickTo(txt,"x",{duration:.9,ease:"power3"});W.addEventListener("pointermove",function(e){tx((e.clientX/innerWidth-.5)*-26)},{passive:true})}
});
// --- brand moment, word zoom: the photo shows only through a giant word, then the camera flies through the word into it
all("[data-mask-zoom]").forEach(function(sec){
  var img=sec.querySelector("img"),word=(sec.getAttribute("data-word")||"").trim().slice(0,12),after=sec.querySelector("[data-mask-after]");if(!img||!word)return;
  var cs=getComputedStyle(sec),bg=cs.backgroundColor;if(!bg||/rgba\(0, 0, 0, 0\)|transparent/.test(bg))bg=getComputedStyle(d.body).backgroundColor||"#fff";
  var font=getComputedStyle(sec.querySelector("h2")||d.body).fontFamily,NS="http://www.w3.org/2000/svg",id="m-mask-"+Math.random().toString(36).slice(2,8);
  var svg=d.createElementNS(NS,"svg");svg.setAttribute("class","m-mask-svg");svg.setAttribute("viewBox","0 0 1600 900");svg.setAttribute("preserveAspectRatio","xMidYMid slice");svg.setAttribute("aria-hidden","true");
  svg.innerHTML='<defs><mask id="'+id+'"><rect width="1600" height="900" fill="#fff"/><text x="800" y="470" text-anchor="middle" dominant-baseline="middle" font-weight="900" font-size="400" textLength="1360" lengthAdjust="spacingAndGlyphs" fill="#000"></text></mask></defs><rect width="1600" height="900" fill="'+bg+'" mask="url(#'+id+')"/>';
  var tx=svg.querySelector("text");tx.textContent=word.toUpperCase();tx.setAttribute("font-family",font);
  sec.classList.add("m-mask");if(img.parentNode!==sec)sec.insertBefore(img,sec.firstChild);sec.insertBefore(svg,img.nextSibling);
  var ox=50,oy=52;try{var n=word.length,ce=tx.getExtentOfChar(Math.floor((n-1)/2));ox=(ce.x+ce.width/2)/16;oy=(ce.y+ce.height*.55)/9}catch(e){}
  svg.style.transformOrigin=ox+"% "+oy+"%";
  if(after)G.set(after,{opacity:0,y:30});
  G.timeline({scrollTrigger:{trigger:sec,start:"top top",end:function(){return "+="+innerHeight*2},pin:true,scrub:.6,invalidateOnRefresh:true}})
    .fromTo(svg,{scale:1},{scale:28,ease:"power3.in",duration:.75},0).to(svg,{opacity:0,duration:.12},.66)
    .fromTo(img,{scale:1.25},{scale:1,ease:"none",duration:1},0)
    .to(after||{},{opacity:1,y:0,duration:.2},.8);
});
// --- brand moment, particles: the object bursts into dots that re-form as the business's name
all("[data-particles]").forEach(function(sec){
  var word=(sec.getAttribute("data-word")||"").trim().slice(0,16),after=sec.querySelector("[data-particles-after]");if(!word)return;
  var src=(d.querySelector(".m-float")||d.querySelector(".m-spin img")||{getAttribute:function(){return ""}}),url=src.getAttribute(src.tagName==="IMG"?"src":"data-still")||"";
  sec.classList.add("m-parts");var cv=d.createElement("canvas");cv.className="m-parts-cv";cv.setAttribute("aria-hidden","true");sec.insertBefore(cv,sec.firstChild);
  var c=cv.getContext("2d"),P=[],prog=0,ink=getComputedStyle(sec).color||"#fff",accent=getComputedStyle(root).getPropertyValue("--m-accent").trim()||ink;
  function rgb(v){var m=String(v).match(/\d+(\.\d+)?/g);return m&&m.length>=3?[+m[0],+m[1],+m[2]]:[255,255,255]}
  function sample(draw,w,h,step){var o=d.createElement("canvas");o.width=w;o.height=h;var x=o.getContext("2d");draw(x,w,h);var data=x.getImageData(0,0,w,h).data,pts=[];for(var j=0;j<h;j+=step)for(var i=0;i<w;i+=step){var k=(j*w+i)*4;if(data[k+3]>140)pts.push([i,j,data[k],data[k+1],data[k+2]])}return pts}
  function build(im){
    var r=Math.min(W.devicePixelRatio||1,2),w=sec.clientWidth,h=sec.clientHeight;cv.width=w*r;cv.height=h*r;c.setTransform(r,0,0,r,0,0);
    var fam=getComputedStyle(sec.querySelector("h2")||d.body).fontFamily,tw=Math.round(w*.9),fs=h*.26,mc=d.createElement("canvas").getContext("2d");
    mc.font="800 "+fs+"px "+fam;var mw=mc.measureText(word).width;if(mw>tw*.94)fs*=tw*.94/mw;var th=Math.round(fs*1.4);
    var tgt=sample(function(x,W2,H2){x.fillStyle="#fff";x.font="800 "+fs+"px "+fam;x.textAlign="center";x.textBaseline="middle";x.fillText(word,W2/2,H2/2)},tw,th,Math.max(3,Math.round(fs/38)));
    var S=Math.round(Math.min(w,h)*.55),srcp=im?sample(function(x,W2,H2){draw(x,im,W2,H2)},S,S,Math.max(3,Math.round(S/70))):[];
    if(!srcp.length)for(var q=0;q<1400;q++){var a=Math.random()*6.283,rr=Math.sqrt(Math.random())*S*.4;srcp.push([S/2+Math.cos(a)*rr,S/2+Math.sin(a)*rr].concat(rgb(accent)))}
    var N=Math.min(3200,Math.max(tgt.length,srcp.length)),ac=rgb(ink);P=[];
    for(var i=0;i<N;i++){var s0=srcp[i%srcp.length],t0=tgt.length?tgt[(i*7919)%tgt.length]:s0,ang=Math.random()*6.283,dist=(.25+Math.random()*.45)*Math.min(w,h);
      P.push({sx:(w-S)/2+s0[0],sy:(h-S)/2+s0[1]-h*.06,ex:Math.cos(ang)*dist,ey:Math.sin(ang)*dist,tx:(w-tw)/2+t0[0],ty:h*.42-th/2+t0[1],c0:[s0[2]+(ac[0]-s0[2])*.35,s0[3]+(ac[1]-s0[3])*.35,s0[4]+(ac[2]-s0[4])*.35],c1:ac,sz:1.6+Math.random()*1.8})}
    paint();
  }
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function paint(){
    var w=sec.clientWidth,h=sec.clientHeight;c.clearRect(0,0,w,h);var p=prog,a=ease(Math.min(1,p/.42)),b=ease(Math.max(0,(p-.42)/.5));
    for(var i=0;i<P.length;i++){var q=P[i],x=q.sx+q.ex*a,y=q.sy+q.ey*a;x+=(q.tx-x)*b;y+=(q.ty-y)*b;
      var cr=q.c0[0]+(q.c1[0]-q.c0[0])*b,cg=q.c0[1]+(q.c1[1]-q.c0[1])*b,cb=q.c0[2]+(q.c1[2]-q.c0[2])*b;c.fillStyle="rgb("+(cr|0)+","+(cg|0)+","+(cb|0)+")";c.fillRect(x,y,q.sz,q.sz)}
  }
  var im=null;if(url){im=new Image();im.onload=function(){build(im)};im.onerror=function(){im=null;build(null)};im.src=url}else build(null);
  W.addEventListener("resize",function(){build(im&&im.complete?im:null)});
  if(after)G.set(after,{opacity:0,y:30});
  ST.create({trigger:sec,start:"top top",end:function(){return "+="+innerHeight*1.8},pin:true,scrub:.5,invalidateOnRefresh:true,onUpdate:function(self){prog=self.progress;paint();if(after){var k=Math.max(0,Math.min(1,(prog-.82)/.15));after.style.opacity=k;after.style.transform="translateY("+(1-k)*30+"px)"}}});
});
// --- hanging badge: drops in on its strap, sways, and swings when touched
all("[data-sway]").forEach(function(el){
  G.set(el,{transformOrigin:"50% 0%"});
  var idle=null;
  G.fromTo(el,{yPercent:-120,rotation:8,opacity:0},{keyframes:[{yPercent:0,rotation:-3,opacity:1,duration:.9,ease:"power2.out"},{rotation:1.6,duration:.3,ease:"sine.inOut"},{rotation:0,duration:.3,ease:"sine.out"}],delay:.7,onComplete:function(){idle=G.fromTo(el,{rotation:-1.1},{rotation:1.1,duration:3.2,ease:"sine.inOut",yoyo:true,repeat:-1})}});
  el.addEventListener("pointerenter",function(){if(!idle)return;idle.pause();G.to(el,{keyframes:[{rotation:-6,duration:.3},{rotation:4,duration:.35},{rotation:-2,duration:.35},{rotation:0,duration:.4}],ease:"sine.out",onComplete:function(){idle.restart()}})});
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
