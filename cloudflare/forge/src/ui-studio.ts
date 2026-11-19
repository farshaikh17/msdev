/**
 * The Studio pickers in the builder, drawn so a rep can see what they are choosing: each look moves the
 * way its sites move, each first screen is a small animated diagram of what visitors see first, and the
 * live preview beside the form takes on the chosen look's layout and plays the chosen first screen.
 * Pure CSS and markup (no images); every animation stops under reduced motion (see ui.ts).
 */

/** How each look moves, in a few words (shown under its tile). */
export const LOOK_MOVES: Record<string, string> = {
  auto: "Forge picks the look that suits the trade",
  editorial: "Lines draw in, words fade up, calm pace",
  kinetic: "Giant type slams in, a ticker runs past",
  cinematic: "Letterbox opens, slow push into the picture",
  brutalist: "Blocks snap into place with hard shadows",
  swiss: "Grid lines slide, numbers count up",
  organic: "Soft shapes breathe and drift",
  americana: "Badges stamp down, banners unfurl",
  playful: "Shapes bounce, buttons wiggle",
  luxe: "A gold frame traces, letters spread slowly",
};

/** Each first screen as a tiny animated diagram (markup only; styled by HERO_ART_CSS). */
export const HERO_ART: Record<string, string> = {
  auto: `<i class="ha-pic"></i><i class="ha-q">?</i><b class="ha-cap">A different one each time</b>`,
  spotlight: `<i class="ha-pic dark"></i><i class="ha-spot"></i><b class="ha-h">Headline</b>`,
  dive: `<i class="ha-pic"></i><i class="ha-zoom"></i><i class="ha-pic2"></i><b class="ha-h">Headline</b>`,
  switcher: `<i class="ha-scene s1"></i><i class="ha-scene s2"></i><i class="ha-scene s3"></i><b class="ha-h">Headline</b><span class="ha-tabs"><i></i><i></i><i></i><u></u></span>`,
  slides: `<span class="ha-fields"><i></i><i></i><i></i></span><span class="ha-num">01</span><b class="ha-h">Service</b>`,
  hangtag: `<b class="ha-word">NAME</b><i class="ha-tall"></i><span class="ha-badge"><i>★</i></span>`,
  float: `<b class="ha-h">Headline</b><i class="ha-obj fly"></i><i class="ha-path"></i>`,
  front: `<i class="ha-pic soft"></i><b class="ha-word behind">WORD</b><i class="ha-subject"></i>`,
  spin: `<i class="ha-obj spin"></i><i class="ha-call c1"></i><i class="ha-call c2"></i><i class="ha-call c3"></i>`,
  breakout: `<span class="ha-card"><i class="ha-pic"></i></span><i class="ha-subject out"></i>`,
  orbit: `<b class="ha-word mid">NAME</b><span class="ha-ring"><i class="ha-obj"></i></span>`,
};

/** The Standard first-screen layouts as small animated wireframes (pieces arrive in the order a visitor reads them). */
export const LAYOUT_ART: Record<string, string> = {
  auto: `<i class="ha-pic"></i><i class="ha-q">?</i><b class="ha-cap">Chosen for the kind of business</b>`,
  "place-band": `<i class="wf-ph band"></i><i class="wf-h l"></i><i class="wf-t r"></i><i class="wf-b r2"></i>`,
  letterbox: `<i class="wf-ph box"></i><i class="wf-h l"></i><i class="wf-t r"></i><i class="wf-b r2"></i>`,
  split: `<i class="wf-h sl"></i><i class="wf-t sl2"></i><i class="wf-b sl3"></i><i class="wf-ph right"></i>`,
  "subject-stage": `<i class="wf-h top"></i><i class="wf-t topr"></i><i class="wf-ph stage"></i>`,
  "calm-side": `<i class="wf-ph full"></i><i class="wf-h ov"></i><i class="wf-t ov2"></i><i class="wf-b ov3"></i>`,
  oversized: `<i class="wf-h big"></i><i class="wf-h big2"></i><i class="wf-t lo"></i><i class="wf-ph lor"></i>`,
  triptych: `<i class="wf-h tri"></i><i class="wf-b tri2"></i><i class="wf-ph t1"></i><i class="wf-ph t2"></i><i class="wf-ph t3"></i>`,
};
export const layoutArt = (id: string) => `<span class="hart lart lart-${id}" aria-hidden="true">${LAYOUT_ART[id] ?? LAYOUT_ART.auto}</span>`;

export const heroArt = (id: string) => `<span class="hart hart-${id}" aria-hidden="true">${HERO_ART[id] ?? HERO_ART.auto}</span>`;

export const STUDIO_PICK_CSS = `
/* the two Studio choices, as two clearly separate panels */
.spanel{border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:12px;background:color-mix(in srgb,var(--bg) 60%,var(--surface))}
.spanel-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.spanel-h b{font:800 1rem var(--display)}.spanel-h small{color:var(--muted);font-size:.85rem}
.spanel-k{width:26px;height:26px;border-radius:8px;background:var(--ink);color:var(--surface);display:inline-grid;place-items:center;font:800 .8rem var(--display)}
.design .moves{display:flex;gap:6px;align-items:center;font:600 .74rem var(--body);color:var(--ember)}.design .moves:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
/* look tiles: each moves the way its sites do (loops gently; the selected one keeps playing) */
.la{overflow:hidden}
.la-auto{animation:hue 6s linear infinite}@keyframes hue{to{filter:hue-rotate(360deg)}}
.la-editorial u:first-of-type{transform-origin:left;animation:drawx 3.4s ease-in-out infinite}.la-editorial>span{animation:fadeup 3.4s ease-in-out infinite}
@keyframes drawx{0%{transform:scaleX(.1)}30%,100%{transform:scaleX(1)}}
@keyframes fadeup{0%,70%{opacity:1;transform:none}82%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
.la-kinetic>span{animation:slam 2.6s cubic-bezier(.2,.9,.2,1.2) infinite}@keyframes slam{0%,10%{transform:translateY(105%)}30%,85%{transform:none}100%{transform:translateY(-105%)}}
.la-kinetic u{animation:wob 2.6s ease-in-out infinite}@keyframes wob{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-4deg) scale(1.1)}}
.la-cinematic u{animation:bars 4s ease-in-out infinite}@keyframes bars{0%,10%{height:34%}45%,85%{height:14%}100%{height:34%}}
.la-cinematic>span{animation:track 4s ease-in-out infinite}@keyframes track{0%{letter-spacing:.15em;opacity:.3}40%,100%{letter-spacing:.42em;opacity:1}}
.la-cinematic{background-size:120% 120%!important;animation:push 4s ease-in-out infinite}@keyframes push{0%{background-position:50% 50%}100%{background-position:60% 40%}}
.la-brutalist>span{animation:snap 2.2s steps(1) infinite}@keyframes snap{0%{transform:translate(0,0);box-shadow:5px 5px 0 #000}50%{transform:translate(-3px,-3px);box-shadow:9px 9px 0 #000}}
.la-swiss u:first-of-type{animation:count 3s steps(1) infinite}.la-swiss u:last-of-type{transform-origin:left;animation:drawx 3s ease-in-out infinite}
@keyframes count{0%{opacity:.6}33%{opacity:.8}66%,100%{opacity:1}}
.la-organic u:first-of-type{animation:breathe 4s ease-in-out infinite}.la-organic u:last-of-type{animation:drift 4s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07) translateY(-3px)}}@keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(-8px,6px)}}
.la-americana u:last-of-type{animation:stamp 3s cubic-bezier(.2,.9,.2,1.3) infinite}.la-americana>span{animation:unfurl 3s ease-in-out infinite}
@keyframes stamp{0%{transform:scale(2.2) rotate(-30deg);opacity:0}20%,100%{transform:none;opacity:1}}@keyframes unfurl{0%{clip-path:inset(0 100% 0 0)}35%,100%{clip-path:inset(0 0 0 0)}}
.la-playful u{animation:bounce 1.6s cubic-bezier(.3,1.6,.5,1) infinite}.la-playful u:last-of-type{animation-delay:.4s}.la-playful>span{animation:wiggle 2s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes wiggle{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(3deg) scale(1.05)}}
.la-luxe u{animation:trace 4.5s ease-in-out infinite}.la-luxe>span{animation:spread 4.5s ease-in-out infinite}
@keyframes trace{0%{clip-path:inset(0 100% 100% 0)}40%,100%{clip-path:inset(0 0 0 0)}}@keyframes spread{0%{letter-spacing:.12em;opacity:.4}50%,100%{letter-spacing:.3em;opacity:1}}
/* first-screen diagrams */
.hart{position:relative;display:block;aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:#12141c;margin-bottom:6px}
.hart i,.hart b,.hart span{position:absolute;display:block;font-style:normal}
.ha-pic{inset:0;background:linear-gradient(135deg,#566f63,#2d3c35 55%,#8a6e48)}.ha-pic.dark{filter:brightness(.45) saturate(.6)}.ha-pic.soft{filter:saturate(.7)}
.ha-h{left:10%;right:10%;top:16%;text-align:center;color:#fff;font:800 .95rem/1 var(--display);letter-spacing:-.01em;z-index:3}
.ha-cap{left:0;right:0;bottom:10%;text-align:center;color:#fff;font:600 .68rem var(--body);opacity:.85}
.ha-q{left:50%;top:40%;transform:translate(-50%,-50%);color:#fff;font:800 1.9rem var(--display);animation:qspin 3s ease-in-out infinite}@keyframes qspin{0%,100%{transform:translate(-50%,-50%) rotateY(0)}50%{transform:translate(-50%,-50%) rotateY(180deg)}}
.ha-spot{width:46%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#ffe2b8 0%,#e3a15c 35%,rgba(227,161,92,0) 70%);mix-blend-mode:screen;animation:spot 4s ease-in-out infinite}
@keyframes spot{0%{left:8%;top:30%}25%{left:50%;top:18%}50%{left:52%;top:48%}75%{left:20%;top:52%}100%{left:8%;top:30%}}
.ha-zoom{left:38%;top:36%;width:24%;height:30%;border:2px solid #fff;border-radius:3px;animation:zoomin 3.6s ease-in infinite}@keyframes zoomin{0%,15%{transform:scale(1);opacity:1}70%{transform:scale(4.2);opacity:.2}100%{transform:scale(4.2);opacity:0}}
.ha-pic2{inset:0;background:linear-gradient(160deg,#c8763f,#5b2b17);opacity:0;animation:land 3.6s ease-in infinite}@keyframes land{0%,62%{opacity:0;transform:scale(1.4)}80%,100%{opacity:1;transform:none}}
.ha-scene{inset:0;opacity:0;animation:xfade 6s infinite}.ha-scene.s1{background:linear-gradient(135deg,#566f63,#2d3c35)}.ha-scene.s2{background:linear-gradient(135deg,#8a6e48,#3c2b1b);animation-delay:2s}.ha-scene.s3{background:linear-gradient(135deg,#3b4f78,#18213a);animation-delay:4s}
@keyframes xfade{0%{opacity:0}8%,33%{opacity:1}41%,100%{opacity:0}}
.ha-tabs{left:14%;right:14%;bottom:12%;height:8px;display:flex!important;gap:6%}.ha-tabs i{position:static!important;flex:1;height:3px;background:rgba(255,255,255,.35);border-radius:2px}.ha-tabs u{position:absolute;left:0;bottom:5px;width:29%;height:3px;background:#fff;border-radius:2px;animation:tabmove 6s steps(1) infinite}
@keyframes tabmove{0%{left:0}33%{left:35.5%}66%{left:71%}}
.ha-fields{inset:0;display:flex!important;width:300%;animation:fields 6s cubic-bezier(.7,0,.3,1) infinite}.ha-fields i{position:static!important;flex:1}.ha-fields i:nth-child(1){background:#e2622b}.ha-fields i:nth-child(2){background:#1d4f8c}.ha-fields i:nth-child(3){background:#217a4b}
@keyframes fields{0%,25%{transform:translateX(0)}33%,58%{transform:translateX(-33.33%)}66%,92%{transform:translateX(-66.66%)}100%{transform:translateX(0)}}
.ha-num{left:8%;top:10%;color:#fff;font:800 1.4rem var(--display);opacity:.9}.hart-slides .ha-h{top:auto;bottom:14%;left:8%;text-align:left}
.ha-word{left:0;right:0;top:22%;text-align:center;color:#f0e6d6;font:400 2.2rem/1 'Anton',Impact,sans-serif;letter-spacing:.02em}
.ha-tall{left:38%;width:24%;top:14%;bottom:0;background:linear-gradient(180deg,#566f63,#2d3c35);border-radius:4px 4px 0 0}
.ha-badge{left:56%;top:-2%;width:30px;transform-origin:50% 0;animation:swing 2.4s ease-in-out infinite}.ha-badge:before{content:"";display:block;width:1px;height:26px;margin:0 auto;background:#f0e6d6}.ha-badge i{position:static!important;width:30px;height:30px;border-radius:50%;background:#e3a92b;color:#12141c;display:grid!important;place-items:center;font:700 .8rem var(--body)}
@keyframes swing{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-14deg)}}
.ha-obj{width:22%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffc29e,#ff5a1f 55%,#7a2a00);box-shadow:0 0 18px rgba(255,110,50,.55)}
.ha-obj.fly{animation:fly 3.6s cubic-bezier(.5,0,.3,1) infinite}@keyframes fly{0%{left:66%;top:34%;transform:scale(1)}50%{left:62%;top:36%;transform:scale(1.05)}100%{left:6%;top:110%;transform:scale(.7) rotate(160deg)}}
.ha-path{left:20%;right:20%;top:52%;height:40%;border-left:2px dashed rgba(255,255,255,.25);border-bottom:2px dashed rgba(255,255,255,.25);border-radius:0 0 0 60px}
.hart-float .ha-h{left:8%;right:auto;text-align:left;top:34%;width:50%}
.ha-word.behind{top:20%;font-size:2.8rem;color:#fff;animation:slideaway 4s ease-in-out infinite}@keyframes slideaway{0%,40%{transform:none}90%,100%{transform:translateX(-60%)}}
.ha-subject{left:34%;width:32%;bottom:0;height:62%;background:#1b1d24;border-radius:46% 46% 8px 8px / 36% 36% 8px 8px;z-index:2}.ha-subject:before{content:"";position:absolute;left:30%;width:40%;top:-34%;aspect-ratio:1;border-radius:50%;background:#1b1d24}
.ha-obj.spin{left:39%;top:26%;border-radius:22%;background:linear-gradient(135deg,#ffc29e,#ff5a1f 60%,#7a2a00);animation:turn 3s linear infinite}@keyframes turn{to{transform:rotateY(360deg)}}
.ha-call{width:5px;height:5px;border-radius:50%;background:#fff;opacity:0;animation:callout 3s infinite}.ha-call:after{content:"";position:absolute;left:8px;top:1px;width:28px;height:3px;background:rgba(255,255,255,.6);border-radius:2px}
.ha-call.c1{left:16%;top:24%}.ha-call.c2{left:68%;top:40%;animation-delay:1s}.ha-call.c3{left:18%;top:70%;animation-delay:2s}@keyframes callout{0%,10%{opacity:0}25%,60%{opacity:1}75%,100%{opacity:0}}
.ha-card{left:18%;right:18%;top:30%;bottom:10%;border-radius:8px;overflow:hidden;box-shadow:0 10px 24px rgba(0,0,0,.5);animation:tilt 3.4s ease-in-out infinite}.ha-card .ha-pic{position:absolute}
.ha-subject.out{left:36%;width:28%;height:72%;bottom:10%;animation:tilt 3.4s ease-in-out infinite}@keyframes tilt{0%,100%{transform:perspective(300px) rotateY(-10deg)}50%{transform:perspective(300px) rotateY(10deg)}}
.ha-word.mid{top:38%;font-size:2rem;z-index:2}
.ha-ring{left:14%;right:14%;top:30%;height:46%;animation:ringz 3.2s linear infinite}.ha-ring .ha-obj{width:24px;height:24px;left:calc(50% - 12px);top:-12px}
@keyframes ringz{0%{transform:rotate(0) scaleY(.35);z-index:3}49%{z-index:3}50%{z-index:1}100%{transform:rotate(360deg) scaleY(.35);z-index:1}}
/* the live preview takes on the chosen look's layout, and plays the chosen first screen */
.lf-site{position:relative;overflow:hidden}
.lfd{position:absolute;display:none;pointer-events:none}
.lf-photo .hart{position:absolute;inset:0;aspect-ratio:auto;margin:0;border-radius:inherit}
.live-frame[data-look=editorial] .lfd-a{display:block;left:12px;right:12px;top:40px;border-top:1px solid var(--ink);font:600 .45rem var(--body);letter-spacing:.14em;padding-top:3px}.live-frame[data-look=editorial] .lfd-a:after{content:"ISSUE N°1"}
.live-frame[data-look=editorial] .lf-h1{font-style:italic;font-size:1.7rem;text-transform:none;font-weight:400}
.live-frame[data-look=kinetic] .lf-h1{font-size:2.4rem;line-height:.86}.live-frame[data-look=kinetic] .lf-site{padding-bottom:18px}.live-frame[data-look=kinetic] .lfd-c{display:block;left:0;right:0;bottom:0;height:16px;background:#111;color:var(--bg);font:700 .55rem/16px var(--body);white-space:nowrap;overflow:hidden}
.live-frame[data-look=kinetic] .lfd-c:before{content:"CALL NOW · FREE QUOTES · SAME DAY · CALL NOW · FREE QUOTES · SAME DAY · CALL NOW · FREE QUOTES ·";display:inline-block;animation:tick 6s linear infinite}@keyframes tick{to{transform:translateX(-50%)}}
.live-frame[data-look=cinematic] .lf-h1{font-size:.9rem;letter-spacing:.35em;text-transform:uppercase;text-align:center;font-weight:500}.live-frame[data-look=cinematic] .lf-photo{height:120px}
.live-frame[data-look=cinematic] .lf-photo:before,.live-frame[data-look=cinematic] .lf-photo:after{content:"";position:absolute;left:0;right:0;height:14%;background:#000;z-index:2;animation:none}.live-frame[data-look=cinematic] .lf-photo:before{top:0}.live-frame[data-look=cinematic] .lf-photo:after{bottom:0;top:auto;width:auto;border-radius:0}
.live-frame[data-look=brutalist] .lf-photo,.live-frame[data-look=brutalist] .lf-btn{border:3px solid #000;box-shadow:5px 5px 0 #000;border-radius:0}.live-frame[data-look=brutalist] .lf-btn{background:#ffe14d;color:#000}.live-frame[data-look=brutalist] .lf-rows i{border:2px solid #000;border-radius:0;background:transparent}
.live-frame[data-look=swiss] .lfd-a{display:block;right:12px;top:150px;font:700 2.6rem/1 'Inter Tight',sans-serif;color:#e10600}.live-frame[data-look=swiss] .lfd-a:after{content:"01"}.live-frame[data-look=swiss] .lf-photo{border-radius:0}.live-frame[data-look=swiss] .lf-rows i{border-radius:0;background:none;border-top:1px solid var(--ink)}
.live-frame[data-look=organic] .lf-photo{border-radius:999px 999px 12px 12px;height:120px}.live-frame[data-look=organic] .lfd-b{display:block;right:24px;top:118px;width:34px;height:34px;border-radius:50%;background:#c97b5a;animation:floaty 4s ease-in-out infinite;z-index:3}
.live-frame[data-look=americana] .lfd-a{display:block;inset:6px;border:2px solid var(--ink);outline:1px solid #c8922b;outline-offset:-5px}.live-frame[data-look=americana] .lfd-b{display:block;right:18px;top:46px;width:30px;height:30px;border-radius:50%;background:#c8922b;color:var(--bg);font:.75rem/30px Georgia;text-align:center;z-index:3}.live-frame[data-look=americana] .lfd-b:after{content:"★"}
.live-frame[data-look=playful] .lfd-a,.live-frame[data-look=playful] .lfd-b{display:block;border-radius:50%;z-index:3;animation:bounce 1.6s cubic-bezier(.3,1.6,.5,1) infinite}.live-frame[data-look=playful] .lfd-a{left:16px;top:44px;width:16px;height:16px;background:#ff7ac0}.live-frame[data-look=playful] .lfd-b{right:20px;top:150px;width:26px;height:14px;border-radius:999px;background:#3be0b0;animation-delay:.4s}
.live-frame[data-look=playful] .lf-btn{border-radius:999px;background:#ffd84d;color:#2a1570;transform:rotate(-4deg)}.live-frame[data-look=playful] .lf-photo{border-radius:22px}
.live-frame[data-look=luxe] .lfd-a{display:block;inset:8px;border:1px solid rgba(217,199,163,.55)}.live-frame[data-look=luxe] .lf-h1{font-weight:300;letter-spacing:.22em;text-transform:uppercase;font-size:1rem;text-align:center}.live-frame[data-look=luxe] .lf-btn{background:none;border:1px solid var(--acc);color:var(--ink);justify-self:center}
.live-hero{font:600 .72rem var(--body);color:var(--muted);text-align:center;min-height:1.2em}
/* Standard layouts: light wireframes, each piece rising in the order it is read */
.lart{background:#f4f1ea}.lart i{animation:wfin 4s cubic-bezier(.2,.7,.2,1) infinite}
.wf-ph{background:linear-gradient(135deg,#9db4a7,#6f8f80 45%,#d8c7a7);border-radius:3px}.wf-h{height:9%;background:#22231f;border-radius:2px}.wf-t{height:5%;background:#8d8a82;border-radius:2px}.wf-b{height:9%;width:16%;background:#c4572a;border-radius:3px}
@keyframes wfin{0%{opacity:0;transform:translateY(8px)}18%,88%{opacity:1;transform:none}100%{opacity:0}}
.lart i:nth-child(2){animation-delay:.15s}.lart i:nth-child(3){animation-delay:.3s}.lart i:nth-child(4){animation-delay:.45s}.lart i:nth-child(5){animation-delay:.6s}
.wf-ph.band{left:0;right:0;top:0;height:52%;border-radius:0}.wf-ph.box{left:8%;right:8%;top:8%;height:46%}
.wf-h.l{left:8%;top:64%;width:38%}.wf-t.r{left:54%;top:64%;width:36%}.wf-b.r2{left:54%;top:76%}
.wf-h.sl{left:8%;top:22%;width:36%;height:12%}.wf-t.sl2{left:8%;top:42%;width:30%}.wf-b.sl3{left:8%;top:54%}.wf-ph.right{left:52%;right:6%;top:12%;bottom:12%}
.wf-h.top{left:8%;top:10%;width:46%;height:14%}.wf-t.topr{left:62%;top:14%;width:28%}.wf-ph.stage{left:8%;right:8%;top:34%;bottom:6%;border-radius:0}
.wf-ph.full{inset:0;border-radius:0;background:linear-gradient(90deg,#2d3c35 0%,#566f63 45%,#a99a7a)}.lart-calm-side .wf-h{background:#fff}.wf-h.ov{left:7%;top:30%;width:40%;height:13%}.wf-t.ov2{left:7%;top:50%;width:32%;background:rgba(255,255,255,.7)}.wf-b.ov3{left:7%;top:62%}
.wf-h.big{left:8%;top:10%;width:76%;height:16%}.wf-h.big2{left:8%;top:30%;width:52%;height:16%}.wf-t.lo{left:8%;top:58%;width:34%}.wf-ph.lor{left:52%;right:8%;top:56%;bottom:6%}
.wf-h.tri{left:6%;top:22%;width:22%;height:20%}.wf-b.tri2{left:6%;top:50%;width:18%}.wf-ph.t1{left:34%;top:10%;width:34%;bottom:10%}.wf-ph.t2{left:71%;top:10%;width:23%;height:38%}.wf-ph.t3{left:71%;top:52%;width:23%;bottom:10%}

`;
