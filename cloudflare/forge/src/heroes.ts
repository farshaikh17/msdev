/**
 * Signature heroes for Studio sites. The motionsites.ai prompts that set our bar each build one
 * first screen around ONE engineered mechanic (a spotlight that reveals a second picture, a camera
 * dive into the picture, a set of switchable scenes, a full-screen slider, a hanging badge), with an
 * exact composition, type scale and timing. Left to describe a first screen in adjectives, a model
 * improvises the same safe layout every time. So a Studio site is dealt one of these heroes, mixed
 * with its art direction (which supplies the material: type, colour, frames), and the account's
 * recent heroes are passed over so neighbouring sites open differently.
 *
 * Each hero names the mechanic our motion engine runs (so it always works), the media our system
 * places in it, and a precise spec for the designer, written the way those prompts are written.
 */

export interface Hero {
  id: "spotlight" | "dive" | "switcher" | "slides" | "hangtag" | "float" | "front" | "spin";
  name: string;
  /** One line for the build form. */
  blurb: string;
  /** What our system fills the hero's picture layer with. */
  media: "pair" | "dive" | "switch" | "photo" | "object" | "front" | "spin";
  /** The designer's exact brief for the first screen (placeholders are filled per site). */
  spec: string;
  /** What the quality check compares the first screen against. */
  check: string;
}

const SLOT = `The picture layer is supplied by our system: put exactly <div class="hero-motion" aria-hidden="true"></div> (empty and unstyled) as the first child of the hero section, which is position:relative, overflow:hidden, width 100%, height 100dvh, with a dark base colour behind it.`;

export const HEROES: Hero[] = [
  {
    id: "spotlight",
    name: "Spotlight reveal",
    blurb: "A second picture shows through a soft circle that follows the pointer",
    media: "pair",
    check: "a full-screen picture with a two-line headline centred near the top (first line in the display face, second line in the text face, both large), one short paragraph bottom-left and a paragraph with a pill button bottom-right, and a centred glass pill menu",
    spec: `SIGNATURE HERO: SPOTLIGHT REVEAL. Build this first screen exactly; dress it in the art direction's fonts and colours.
- Section: full screen (100dvh), dark base colour. ${SLOT} Our system puts two matched pictures in it: the second shows through a soft 260px circle that trails the pointer (on phones it drifts by itself). Nothing of yours may cover the middle of the picture.
- Headline (h1, z-index above the picture): absolutely positioned at top 14%, left 0, right 0, centred, colour white, line-height .95, pointer-events none. Two block lines, both at clamp(48px, 7.5vw, 112px):
  line 1 in the direction's display face (italic if it has one), letter-spacing -.05em, data-reveal="blur";
  line 2 in the text face at weight 400, letter-spacing -.08em, margin-top -4px, data-reveal="blur".
  Eight words at most across both lines, about what the business does, ideally with a turn between the lines ("Layers hold / tales of time").
- Bottom-left (hidden below 640px): absolute, bottom 56px, left clamp(40px,4vw,56px), max-width 260px, one paragraph at 14px, line-height 1.6, colour white at 80%, data-reveal="blur".
- Bottom-right: absolute, bottom clamp(40px,10vh,96px), right clamp(20px,4vw,56px), max-width 260px (full width minus 40px on phones, left-aligned), a column with an 18px gap: one paragraph at 14px in white at 80%, then the primary action as a pill button (padding 12px 28px, the accent colour, white 14px text weight 500) that scales to 1.03 and gains a soft accent-coloured shadow on hover and scales to .95 when pressed, data-reveal="blur", data-magnetic.
- Header: fixed, transparent, padding 20px: the logo mark and the business name on the left in the display face; in the centre (from 768px) a pill holding the main links, background white at 20%, backdrop blur 12px, 1px border in white at 30%, radius 999px, padding 8px, links 14px weight 500 in white at 80% with 6px 16px padding and a white-at-20% rounded hover; on the right a solid white pill button with dark text for the main action.
- Add one 12px hint at the bottom centre in white at 60%: "Move to look inside" (or the direction's equivalent words; never on phones).`,
  },
  {
    id: "dive",
    name: "Camera dive",
    blurb: "Scrolling pushes the camera into the picture and lands on a second scene",
    media: "dive",
    check: "a full-screen picture with a one-line headline centred low, a coordinates-style detail panel with corner brackets, and a caption bottom-left; as the page is scrolled the camera pushes into the picture",
    spec: `SIGNATURE HERO: CAMERA DIVE (a pinned scroll story). Build this first screen exactly; dress it in the art direction's fonts and colours.
- The hero <section> carries data-dive="2.4" (it stays pinned while the visitor scrolls 2.4 screens). Inside it, one stage <div data-dive-stage> 100vh tall, overflow hidden, position relative. ${SLOT.replace("first child of the hero section", "first child of the stage")} Our system puts two pictures in it: the hero scene and a second, closer scene. As the visitor scrolls, the camera pushes into the first picture toward the point you name with data-dive-origin="60% 55%" on the stage (pick where the most interesting thing in the hero picture is), then lands in the second scene.
- Headline block (data-dive-out, it lifts and blurs away as the dive starts): centred horizontally, its top at 52vh. A small label chip (the direction's label style), then an h1 on ONE line, at clamp(44px, 6.4vw, 104px), weight 500, letter-spacing -.045em, line-height .92: four words or fewer.
- Detail panel (data-dive-out): absolute at left 54%, top 64%: a thin 1px corner-bracket frame (only 14px of each corner shows, made with clip-path), a small chip, then three short lines in a monospace at 11px with letter-spacing .12em, white, text-shadow 0 1px 6px rgba(0,0,0,.35), showing REAL facts only (the town, the trade, the phone or opening hours; never invented coordinates or numbers).
- Caption bottom-left (data-dive-out): left and bottom 34px, a 2px accent left rule, 16px left padding, three lines in the monospace at 11.5px uppercase, line-height 1.75, saying what the business does.
- Scroll hint bottom-right: a 20px outlined circle with a small chevron and "Scroll to explore" at 11px, letter-spacing .16em.
- Statement (data-dive-in, it resolves out of blur when the camera lands): centred, width min(820px, 90vw), white: a chip, then an h2 at clamp(34px, 4.6vw, 70px), line-height 1, letter-spacing -.04em, with a strong soft text-shadow so it reads over the picture, then one 16px sentence. This is the site's promise in one line.
- On phones the dive does not pin: the hero shows the first picture with the headline, and the statement follows below it in the flow.`,
  },
  {
    id: "switcher",
    name: "Scene switcher",
    blurb: "Full-screen scenes crossfade, chosen from a labelled row under the headline",
    media: "switch",
    check: "a full-screen moving scene behind a large centred headline, a glass pill badge above it and a glass pill with the main action below it, a row of labelled scene buttons, and a row of short facts along the bottom",
    spec: `SIGNATURE HERO: SCENE SWITCHER. Build this first screen exactly; dress it in the art direction's fonts and colours.
- Section: full screen (h-screen and 100dvh), black base, data-switch. ${SLOT} Our system fills it with three or four full-screen scenes (moving video where the trade has it, otherwise photographs that drift), each labelled. They crossfade over one second.
- Content column above it: flex column, full height, centred text, white.
  - Header row (padding 24px clamp(20px,4vw,48px)): the business name on the left in the display face (italic if it has one) at 24px; on the right (from 768px) a glass pill holding the main links at 14px in white at 90% and a solid white pill button with dark text for the main action.
  - Glass style for every pill: background rgba(255,255,255,.01), backdrop-filter blur(4px), box-shadow inset 0 1px 1px rgba(255,255,255,.1), radius 999px, and a 1.4px gradient border drawn with a ::before (white at 45% at the top and bottom edges, fading to nothing in the middle), masked to the border with mask-composite: exclude.
  - Badge: a glass pill (padding 8px 16px, 13px) above the headline with one true sentence about the business.
  - Headline (h1): clamp(40px, 6vw, 88px), line-height 1.1, max-width 900px, in the display face, two lines with a break, data-split="words".
  - One sentence under it: max-width 560px, 16px, line-height 1.6, white at 85%, data-reveal="blur".
  - The main action inside a glass pill (max-width 380px): a short line of text on the left and a solid white pill button with dark text on the right, data-reveal="blur".
  - Scene row: an empty <div data-switch-nav></div> under the action; our engine fills it with one button per scene. Style its buttons with the class .m-switch-btn: 13px, padding 6px 4px, margin 0 10px, white at 50%, a 1px transparent bottom border; .m-switch-btn.on is full white with a white bottom border; hover white at 80%.
  - A flexible spacer, then a row of four short TRUE facts along the bottom (12–14px, white at 70%), separated by thin vertical rules from 640px up, wrapping on phones: the trade, the town, opening hours or the phone, and what the business is known for. Never invent numbers.
- Every line of text must stay readable over every scene: add a soft dark radial wash behind the content column.`,
  },
  {
    id: "slides",
    name: "Colour-field slider",
    blurb: "Full-screen colour fields slide through the services, with a numbered tab list",
    media: "photo",
    check: "a full-screen flat colour field with a large two-line title, a framed picture floating beside it, a numbered vertical tab list on the left with a progress line, and a dark pill button under the title; the slides change by themselves",
    spec: `SIGNATURE HERO: COLOUR-FIELD SLIDER. Build this first screen exactly; dress it in the art direction's fonts and palette.
- Section: full screen (100dvh), data-slides, overflow hidden. Inside it, one <div data-slide> per service (four or five), each absolutely filling the section, with data-color set to a different soft colour from the direction's palette (pastel when the palette is light, deep when it is dark) and data-title set to the service's short name. Our engine stacks them, slides them vertically one screen at a time every five seconds, and crossfades the background colour.
- Inside each slide:
  - The title: two lines (a word or two each, e.g. "Brake" / "repair"), centred at 56% across, in the display face at clamp(56px, 9.9vw, 150px), weight 500, line-height 1.02, the ink colour, data-depth="0.01".
  - One picture of that service in a frame: about 30vw wide (60vw on phones), aspect 4:5, radius 12px, a soft shadow below it (an ellipse blurred 14px at 22% ink), placed to one side of the title so it overlaps the title's edge, data-depth="0.04". Use the preview photos (a different one per slide; reuse with a different crop if you run out).
  - A dark pill button under the title (66px tall, 38px side padding, the ink colour with light text at 17px, an arrow that moves 6px right on hover) linking to that service's page, with the words "Discover".
- Tab list: an empty <div data-slides-tabs></div> fixed at left 46px, vertically centred, 22px left padding. Our engine fills it with a numbered tab per slide ("01  Brake repair") and a 2px vertical progress line; style .m-slide-tab (19px weight 500, 62% opacity; .m-slide-tab.on at full opacity, numbers at 11px) and .m-slides-bar (rgba of the ink at 22%).
- On phones the tab list becomes a horizontal row of names under the title, and the title is clamp(40px, 13vw, 64px).`,
  },
  {
    id: "hangtag",
    name: "Wordmark and hanging badge",
    blurb: "A giant wordmark behind a tall picture, with a badge that drops in and swings",
    media: "photo",
    check: "a giant wordmark across the top behind a tall picture that overlaps it, a handwritten-style word rotated over the wordmark, a badge hanging from a strap at the top right, and white rectangular menu tags with a hard shadow",
    spec: `SIGNATURE HERO: WORDMARK AND HANGING BADGE. Build this first screen exactly; dress it in the art direction's fonts and colours.
- Section: full screen (100dvh), a deep colour from the palette as a vertical gradient from dark at the top to lighter at the bottom.
- Wordmark: the business name (or its most distinctive word) as an inline SVG across the full width at the top: viewBox "0 0 1440 260", preserveAspectRatio none, one <text> with textLength="1412" lengthAdjust="spacingAndGlyphs", weight 900, font-size 268, letter-spacing -6, filled with a vertical gradient from white (opacity 1) to the palette's light tint (opacity .28) so the letters melt into the background at their feet. data-reveal="clip".
- Picture: a tall portrait frame (about 34vw wide, aspect 3:4, radius 6px, no border) centred horizontally, its top at 20vh so it overlaps the bottom of the wordmark and sits in front of it. ${SLOT.replace("first child of the hero section", "first child of the frame")} data-depth="0.02".
- Handwriting: one word that sums the business up in a handwritten Google font (Caveat Brush or similar), 82px, white, rotated -8deg, transform-origin left centre, text-shadow 0 2px 14px rgba(0,0,0,.18), placed over the left part of the wordmark at top 148px.
- Hanging badge: data-sway on a box at the top right (right 6vw, top 0), 240px wide: a 6px strap running from above the top edge down 30vh, a small metal clip, then a white card (radius 8px, padding 20px 16px, ink text) reading in the text face: the business name at 26px weight 800 line-height .95, a thin rule, the trade at 10px weight 700, then three dotted-underlined rows of REAL facts (town, phone, hours or what they do) at 9px weight 700. Our engine drops it in on its strap, lets it sway gently, and swings it when the pointer touches it.
- Menu: white rectangular tags (no radius) with the ink colour text at 16px weight 600, height 37px, padding 0 18px, a hard 3px ledge shadow plus a soft drop (box-shadow 0 3px 0 rgba(0,0,0,.18), 0 6px 14px rgba(0,0,0,.18)); on hover they lift 2px and tilt -1.5deg.
- Bottom centre: "Scroll" in 12px uppercase with a thin 22px line above it in which a white bead drips down every 1.6 seconds.
- On phones the wordmark spans 94vw at the top, the badge is 27vw wide at the top right, and the picture is 70vw wide.`,
  },
  {
    id: "float",
    name: "Flying object",
    blurb: "The trade's own object floats beside the headline, then flies down the page as you scroll",
    media: "object",
    check: "a large headline on the left and the business's own object (cut out, no background) floating large on the right over a rich colour field; as the page is scrolled the object flies down to sit beside later sections",
    spec: `SIGNATURE HERO: FLYING OBJECT. Build this first screen exactly; dress it in the art direction's fonts and colours.
- Our system supplies the business's signature object (OBJECT below), cut out with no background, and flies it through the page: it rests in one empty "perch" box, and as the visitor scrolls it lifts off, swoops and turns, and lands in the next perch. You only place the perches: each is an empty <div data-perch aria-hidden="true"></div> with an explicit width and aspect-ratio:1, in the normal flow (never position:absolute, never inside a pinned or horizontal-scroll section), with nothing inside it and nothing of yours on top of it.
- Section: full screen (100dvh), position relative, overflow hidden, no photograph: a rich deep colour field from the palette, ideally a living gradient (<div data-shader="flow" data-colors="#hex,#hex,#hex"> absolutely filling it, in the palette's deep and accent colours) with data-grain.
- Two columns from 900px (one column on phones, the perch after the text): left, vertically centred, max-width 560px:
  - Headline (h1): clamp(52px, 7.6vw, 124px), the display face, weight 600, letter-spacing -.045em, line-height .92, colour the light tint, data-split="words". Six words at most.
  - One sentence under it at 17px, line-height 1.6, max-width 440px, the light tint at 80%, data-reveal="blur".
  - Two actions: the primary as a pill (the accent colour, 15px weight 600, padding 16px 30px) with data-magnetic, the secondary as a text link with an arrow, data-reveal="blur".
  - A row of three short TRUE facts (12px, letter-spacing .04em, the light tint at 65%) separated by thin rules.
  right: the first perch, width min(42vw, 600px) (78vw on phones), centred in the column, with a soft radial glow of the accent colour behind it (a separate absolutely placed element with blur, not inside the perch).
- Add TWO more perches further down the home page: one in the second or third section, beside a statement or the services list (width min(24vw, 300px); 46vw on phones), and one in the final call-to-action section beside the action (width min(18vw, 220px); 36vw on phones). Leave the space around them clear: the object lands there.
- A small scroll cue at the bottom centre: a 1px line 40px tall with a dot sliding down it, and "Scroll" at 11px letter-spacing .2em.`,
  },
  {
    id: "front",
    name: "Subject in front of the headline",
    blurb: "A giant word sits behind the photo's subject, like a magazine cover, and slides away as you scroll",
    media: "front",
    check: "a full-screen photograph with an enormous one- or two-word headline that passes BEHIND the photo's main subject (the subject overlaps the letters), a short paragraph bottom-left and a button bottom-right",
    spec: `SIGNATURE HERO: SUBJECT IN FRONT OF THE HEADLINE (a magazine cover). Build this first screen exactly; dress it in the art direction's fonts and colours.
- Section: full screen (100dvh), position relative, overflow hidden, dark base colour, data-front. ${SLOT} Our system puts the hero photograph in it and lays a cut-out of the photograph's main subject exactly over it at z-index 3, so whatever sits at z-index 2 passes BEHIND the subject.
- The headline (h1, data-front-text): ONE or TWO words only, the most striking word for this business (its trade or what it does: "TIRES", "BLOOM", "SMILES"), set ENORMOUS so the subject overlaps it: position absolute, left 0, right 0, top 22%, text-align centre, font-size clamp(96px, 19vw, 330px), the display face at its boldest, letter-spacing -.05em, line-height .8, colour white (or the palette's lightest tint), z-index 2, white-space nowrap, pointer-events none. The rest of the message goes in the h2-sized line below.
- A second line (p, z-index 4): position absolute, left clamp(20px,4vw,56px), bottom clamp(110px,16vh,150px), max-width 340px, 17px line-height 1.5, white at 85%, data-reveal="blur": what the business does and where, in one sentence.
- The primary action (z-index 4): position absolute, right clamp(20px,4vw,56px), bottom clamp(110px,16vh,150px), a pill button (the accent colour, 15px weight 600, padding 16px 30px) with data-magnetic and data-reveal="blur".
- A row of four short TRUE facts along the bottom (z-index 4, 12px, letter-spacing .06em, white at 70%, separated by thin vertical rules, wrapping on phones), and a soft dark gradient (z-index 1, bottom 45% of the section) so the text reads.
- The header and every other element in the section must have z-index 4 or more. Keep the middle of the picture clear apart from the giant word.
- Our engine raises the word from behind the subject on load and slides it up behind the subject as the visitor scrolls.`,
  },
  {
    id: "spin",
    name: "Turning showcase",
    blurb: "The trade's own object turns in the middle of the screen as you scroll, with callouts appearing around it",
    media: "spin",
    check: "the business's own object (cut out) large in the centre of a dark gradient with an enormous faint word behind it and the headline at the left; as the page is scrolled the object turns and short callouts appear beside it",
    spec: `SIGNATURE HERO: TURNING SHOWCASE (a pinned product reveal). Build this first screen exactly; dress it in the art direction's fonts and colours.
- The hero <section> carries data-pin="2.5" and holds exactly one <div data-pin-stage> (100vh, overflow hidden, position relative), background a deep radial gradient from the palette, lighter in the centre (e.g. radial-gradient(60% 60% at 50% 55%, a mid tone, the deepest tone)). ${SLOT.replace("first child of the hero section", "first child of the stage").replace(", width 100%, height 100dvh, with a dark base colour behind it", "")} Our system puts the business's signature object (OBJECT below), cut out, in the middle of it, and turns it once round as the visitor scrolls 2.5 screens.
- Behind it: one enormous word (the trade, e.g. "WHEELS") in the display face at clamp(120px, 22vw, 360px), weight 800, letter-spacing -.04em, the lightest tint at 7% opacity, centred, position absolute, top 50% translateY(-50%), z-index 0, white-space nowrap, pointer-events none.
- Beats (blocks laid out absolutely in the stage, z-index 2, each with data-at and data-until, so they write in and out as the object turns; never over the middle 40% of the stage):
  1. data-at="0" data-until="0.3": at the left, vertically centred, max-width 420px: the headline (h1) at clamp(40px, 5vw, 76px), line-height 1, letter-spacing -.035em, the lightest tint; one sentence at 16px at 80%; the primary action as a pill button (the accent colour) with data-magnetic.
  2. data-at="0.3" data-until="0.5", right side, top 30%; 3. data-at="0.5" data-until="0.7", left side, top 55%; 4. data-at="0.7" data-until="0.88", right side, top 60%: each a callout about one service or what the business is known for: a 1px line 80px long in the accent colour pointing toward the centre, a small number chip ("01"), a title at 22px weight 600 and one sentence at 14px at 75%, data-write on the sentence. TRUE things only.
  5. data-at="0.88": centred near the bottom (bottom 9%): a pill button with the main action and the phone number beside it.
- A scroll cue at the bottom left in the first beat: "Scroll to turn" at 11px letter-spacing .2em with a small rotating ring icon.
- On phones the stage is not pinned (our engine turns the object by itself): the beats stack in reading order under the object, the word behind shrinks to 30vw.`,
  },
];

export const HERO_IDS = HEROES.map((h) => h.id);
export const heroById = (id: string | undefined | null) => HEROES.find((h) => h.id === id);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // Finish with an avalanche step: FNV's low bits barely move between similar names, and picks use the low bits.
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The hero for a Studio build: the one asked for; otherwise, when the trade has video clips in
 * the library, the scene switcher (moving video is the strongest first screen we have); otherwise
 * one the account hasn't used in its last two Studio sites, varied by site.
 */
export function pickHero(intake: { hero?: string }, slug: string, recent: string[] = [], clips = 0): Hero {
  const asked = heroById(intake.hero);
  if (asked) return asked;
  if (clips >= 2 && !recent.slice(0, 1).includes("switcher")) return heroById("switcher")!;
  const fresh = HERO_IDS.filter((id) => !recent.slice(0, 2).includes(id) && (id !== "switcher" || clips >= 1));
  const from = fresh.length ? fresh : HERO_IDS.filter((id) => id !== "switcher" || clips >= 1);
  return heroById(from[hash(slug) % from.length])!;
}
