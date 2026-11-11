/**
 * Studio art directions. Left to itself, a model settles on the same safe look every time (an
 * italic serif accent phrase, a marquee band, a giant wordmark footer). Each Studio build is held
 * to ONE of these instead, picked to suit the trade (and varied by site, so two plumbers don't
 * match), or chosen on the build form. A concept fixes the type, the colour logic, the layout and
 * the signature moves, and names what the other concepts do so it avoids them.
 */

export interface Concept {
  id: string;
  name: string;
  /** One line for the build form. */
  blurb: string;
  /** What Claude is told: the art direction in full. */
  brief: string;
  /** How the home page's first screen is composed (each look's is different). */
  hero: string;
  /** The home page as a sequence of scenes, in order: the layout of each, not just its topic. */
  scenes: string[];
  /** The motion this look uses, and the moves it must not use (so looks don't converge). */
  moves: string;
  never: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Magazine layouts, big serif headlines, quiet colour",
    brief:
      "EDITORIAL. A premium print magazine. Display type: an oversized high-contrast serif (Instrument Serif, Playfair Display, Cormorant Garamond, DM Serif Display) at very large sizes with tight tracking; text in a clean grotesk (Hanken Grotesk, Inter Tight). Asymmetric 12-column grids, a wide left margin for small captions and folios, photographs cropped boldly and set at different scales, thin hairline rules, pull quotes in large italic. Quiet palette: warm paper or deep ink plus one considered accent. Reveal text line by line. Do NOT use marquees, stickers, neon, heavy shadows or round pills; keep it restrained and confident.",
    hero: "A magazine cover, NOT a full-bleed photo. Paper-coloured background. The headline in the oversized serif, left-aligned across about eight of twelve columns, running over two or three lines. A tall portrait picture frame (3:4) sits to the right, dropping below the fold and overlapping the next section; the moving picture plays inside that frame. A narrow far-left column carries a small folio (issue-style label, town, trade). Under the headline a short standfirst paragraph, then the primary button and a quiet text link. A single hairline rule. No overlay, no gradient.",
    scenes: [
      "Contents: the offer as a numbered table of contents (01, 02, 03…): one full-width row each with the name in large serif, a one-line description and a small arrow, hairline rules between rows. No cards, no images, no icons.",
      "Feature spread: one very wide photograph, then the story of the business as a two-column article beginning with a drop cap, with a small captioned inset photo.",
      "A page that is only a pull quote: one review set very large in italic serif, centred, with the name beneath in small caps. Nothing else on the screen.",
      "Notes: three or four short numbered editorial paragraphs (why people choose this business / how it works), set in a narrow two-column grid with wide margins and margin captions.",
      "Photo essay: three photographs at clearly different scales in an asymmetric grid (one large, one small and offset, one tall), each with a caption in small type.",
      "Colophon: where to find the business, with the address or area in large serif type, the hours as a small table, and a modest framed map.",
      "Questions, set as an interview: each question in italic, each answer in roman beneath, open on the page (no accordion boxes).",
      "A letter: the form presented as writing to the business, on a paper panel with generous margins, ending with a quiet closing line. No closing banner.",
    ],
    moves:
      'Line-by-line text reveals (data-split="lines"), clip reveals on images (data-reveal="clip"), a slow parallax on the feature photograph. Restraint is the point.',
    never:
      "No marquee, no pinned horizontal gallery, no stacked cards, no shader background, no shadows, no pills, no giant wordmark footer, no numbered stickers.",
  },
  {
    id: "kinetic",
    name: "Kinetic",
    blurb: "Giant condensed type, hard colour blocks, high energy",
    brief:
      "KINETIC. Loud, fast, confident. Display type: giant condensed uppercase grotesk (Big Shoulders Display, Anton, Bebas Neue, Archivo Narrow Black, Oswald) at 12–20vw with leading under 0.9, sometimes cropped by the viewport edge; text in a neutral sans. Hard flat colour blocks that change from section to section (the brand colour, near-black, off-white and one contrast colour), diagonal or stepped section edges, rotated stickers and badges, a fast marquee, oversized numerals, chunky square buttons. Motion is snappy: chars splitting, parallax, sticky stacking cards. Do NOT use thin serifs, soft gradients, glass or pastel colours.",
    hero: "A poster, NOT a photo with text on it. The whole first screen is one flat block of the brand colour. The headline in giant condensed capitals fills the full width (about 18–22vw), tight leading, deliberately cropped by the right edge. The picture is a small tilted card (about a quarter of the width) overlapping the headline, with a hard border; the moving picture plays inside that card. One rotated sticker. A chunky square-cornered button and the phone in heavy type. No overlay, no gradient.",
    scenes: [
      "Two marquee bands running in opposite directions, in contrasting flat colours, naming what the business offers.",
      "The offer as full-width colour-block rows, each row a different flat colour with a huge numeral, the name in giant caps and a one-line description; the whole row is the link and inverts its colours on hover. No images.",
      "A wall of three oversized statements (real numbers counting up if any were given, otherwise bold plain-word claims that are supportable), each on its own colour block.",
      "How it works as sticky stacking cards (data-stack): each step a full-width card in a different colour that stacks over the last.",
      "A photo wall: a tight grid of hard-bordered photographs at slight rotations, with captions as small rotated stickers.",
      "One review, huge, on a contrasting block, revealed word by word as you scroll (data-scrub-text).",
      "Location on a split block with a hard diagonal or stepped edge: map on one side, address and hours in heavy caps on the other.",
      "The form on a near-black block under a giant two-word heading; then short questions as a plain bold list.",
    ],
    moves:
      'Headlines split by character (data-split="chars"), marquees, stacking cards (data-stack), magnetic buttons, counters. Fast and snappy.',
    never:
      "No serif type, no soft gradients, no shader, no pinned horizontal gallery, no arched or rounded image masks, no hairline rules, no pastel colours.",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    blurb: "Dark, full-bleed imagery, film grain, slow reveals",
    brief:
      "CINEMATIC. A film title sequence. Dark by default: a near-black canvas tinted toward the brand hue, one luminous accent used sparingly for light and highlights. Full-bleed photography in letterboxed sections with a visible film grain (data-grain), vignettes and slow parallax; display type is thin and wide-tracked uppercase or a light grotesk (Syne, Unbounded light, Manrope, Jost) at moderate size with a lot of space; short lines of copy like subtitles. A living shader background in the hero. Sections feel like scenes. Do NOT use bright flat colour blocks, stickers, cards with borders, or italic serif accent phrases.",
    hero: "A film's opening shot. The moving picture fills the whole first screen, with letterbox bars top and bottom and film grain (data-grain), and only a light vignette so the picture stays clearly visible. The title is a SMALL, wide-tracked title card in capitals, centred low in the frame like an opening credit (not a giant headline), with one short line beneath like a subtitle. A thin outlined button and a small scroll cue. The business name may appear as a tiny credit in a corner.",
    scenes: [
      "A statement alone on a near-black screen: two or three sentences in light type that brighten word by word as you scroll (data-scrub-text). Nothing else.",
      "A film strip: a pinned horizontal sequence (data-horizontal) with one full-height panel per thing the business offers, each a full-bleed picture with the name and one line set bottom-left like a subtitle, and a small frame counter (1/5).",
      "A full-bleed still with a single line of the business's story set bottom-left, and a text link to the about page.",
      "Credits roll: why people choose the business or how it works, as a narrow centred column of short lines in small caps and light type, like end credits.",
      "A review as a subtitle: one sentence at the bottom of a full-bleed picture, with the name as a caption.",
      "Location as an establishing shot: a dark section with the map inside a letterboxed frame and the address and hours in wide-tracked small type.",
      "Questions as a quiet list of thin rows on near-black.",
      "The end card: the form on a dark screen under a small-caps title, like a final frame.",
    ],
    moves:
      "Film grain, a living shader tint in the hero only, one pinned horizontal strip (data-horizontal), scrubbed text, slow parallax on stills, slow fades.",
    never:
      "No marquee, no stickers or badges, no bordered cards, no stacked cards, no bright flat colour blocks, no giant headline, no italic serif accent phrase, no rounded pills.",
  },
  {
    id: "brutalist",
    name: "Neo-brutalist",
    blurb: "Raw grid, thick borders, hard shadows, playful honesty",
    brief:
      "NEO-BRUTALIST. Raw, honest, a little cheeky. Visible structure: 2–3px solid black borders on everything, hard offset shadows (no blur), flat saturated colours (one strong brand colour plus a loud secondary like yellow, lilac or mint) on an off-white or light-grey base, a monospace for labels (Space Mono, JetBrains Mono, DM Mono) with a heavy grotesk for headings (Space Grotesk bold, Archivo Black, Familjen Grotesk). Rectangular buttons that lift on hover, a visible grid, oversized numbers, tilted tags, ticker tape. Photos get a thick border and a hard shadow. Do NOT use gradients, glass, soft shadows, rounded pills or elegant serifs.",
    hero: "A spec sheet, NOT a photo with text on it. Off-white background with a visible grid of thin lines. Top-left, the headline sits inside a thick black-bordered box. To the right, the picture sits in its own thick-bordered box with a hard offset shadow; the moving picture plays inside that box. Beneath, a small monospace table of facts (STATUS / AREA / CALL / HOURS, only what was given). A rectangular button that lifts on hover. A loud secondary colour on one element only.",
    scenes: [
      "A ticker tape strip in monospace capitals.",
      "The offer as a table, like a spreadsheet: bordered rows with columns for number, name, what it is and an arrow; a row fills with the loud colour on hover. No cards, no images.",
      "A bento grid of unequal thick-bordered boxes mixing the story of the business, one photograph, one plain fact, one short quote and a button box.",
      "How it works as a flowchart: bordered boxes joined by drawn arrows, monospace labels.",
      "A review presented as a printed receipt or ticket with a perforated edge.",
      "Photographs as a contact sheet: a strict grid of equal frames with monospace frame numbers and captions.",
      "Location: a thick-framed map beside a monospace legend (address, hours, area).",
      "Questions as plus-and-minus toggles in bordered rows, then the form as a paper form with labelled boxes and a stamp-style submit button.",
    ],
    moves:
      "Hard hover lifts with offset shadows, a ticker (marquee), slight tilt on tags (data-tilt), counters for real numbers.",
    never:
      "No gradients, no shader, no soft or blurred shadows, no serif type, no pinned horizontal gallery, no scrubbed text, no rounded pills, no full-bleed photo hero.",
  },
  {
    id: "swiss",
    name: "Swiss modernist",
    blurb: "Strict grid, one typeface, huge numerals, lots of white",
    brief:
      "SWISS MODERNIST. Precise and rational. A single neo-grotesk family (Inter Tight, Hanken Grotesk, Instrument Sans, Geist) used at only a few sizes: tiny 12px captions and uppercase labels against huge headings and huge numerals; a strict 12-column grid with generous empty space, thin rules, a clear baseline rhythm; palette of off-white (or black) plus ONE strong accent (international red, cobalt or signal orange). Information shown like data: indexed lists, tabular figures, small cross-reference marks. Images are cropped square or in tall columns, never rounded. Motion is minimal and exact: clip reveals and counters. Do NOT use decoration, gradients, shadows, illustrations or italic serif accents.",
    hero: "A typographic poster on a strict twelve-column grid, NOT a photo with text on it. White (or black) background. A giant numeral or a single giant word in the accent colour anchors the top-left. The headline at a moderate size in columns 1–7. A perfectly square picture in columns 8–12 aligned to the baseline grid; the moving picture plays inside that square. A small tabular information list (phone, hours, area: only what was given). One thin rule in the accent colour. A small solid button and a plain arrow link.",
    scenes: [
      "Index: the offer as a numbered two-column list with thin rules, tabular numerals, the name and a one-line description. No cards.",
      "A strict half-and-half: one large square photograph beside a short text about the business, both aligned to the same grid lines.",
      "In brief: three or four facts shown like data (real numbers counting up if given, otherwise single strong words) with tiny uppercase labels.",
      "How it works as a horizontal timeline with tick marks and short labels.",
      "Three square photographs in one row with captions beneath in 12px type.",
      "One review as a single sentence in large grotesk with an oversized quotation mark in the accent colour.",
      "Location: a square map beside an address and hours table.",
      "Questions as a two-column list (question left, answer right), then the form with underlined inputs only.",
    ],
    moves: "Clip reveals on images and counters. Almost nothing else moves.",
    never:
      "No shader, no marquee, no stacked cards, no pinned horizontal gallery, no rounded corners, no shadows, no gradients, no decoration, no italic serif.",
  },
  {
    id: "organic",
    name: "Organic",
    blurb: "Soft shapes, arches, earthy warm colour, human touch",
    brief:
      "ORGANIC. Warm, human, tactile. Soft arched and blob-shaped image masks, overlapping cut-outs, rounded cards with generous padding, earthy warm palette (clay, sage, oat, deep forest or ink for text, one bright accent), subtle paper or linen texture, hand-drawn underline and squiggle accents drawn as small inline SVG, a friendly soft display face (Fraunces soft, Young Serif, Gloock, Bricolage Grotesque) with a humanist text face (Figtree, Nunito Sans). Asymmetric layouts with curved section dividers. Gentle motion: floating shapes, soft parallax. Do NOT use sharp 90-degree boxes, neon, monospace labels or giant condensed type.",
    hero: "Soft and hand-made, NOT a dark photo with text on it. A warm, light background colour. The headline in the soft serif on the left with a hand-drawn squiggle (inline SVG) beneath the whole last line. On the right, a large arched picture frame with a smaller round picture overlapping its lower corner; the moving picture plays inside the arch. Two or three soft floating shapes drift slowly. A rounded button and a quiet text link. A curved bottom edge leads into the next section.",
    scenes: [
      "What the business does as a winding path: the items alternate left and right along a drawn dashed line, each with a small arched picture and a short paragraph.",
      "A letter from the business: the story set as a personal note beside an arched portrait, ending with the owner's or business's name.",
      "Three overlapping rounded cards for who it's for or the occasions it suits, slightly rotated.",
      "A gallery as organic masonry: pictures in different arch, circle and soft blob masks at different sizes.",
      "A review inside a large rounded speech shape with a small leaf or dot accent.",
      "How it works as stepping stones: numbered circles along a curve.",
      "Location: a rounded map with the address beside it and a soft shape behind.",
      "Gentle rounded questions, then the form inside one big rounded panel with a curved top edge.",
    ],
    moves:
      "Gentle floating shapes (data-parallax), soft upward reveals, a slight tilt on cards.",
    never:
      "No shader, no marquee, no hard rectangular boxes, no monospace, no giant condensed capitals, no pinned horizontal gallery, no dark overlay hero.",
  },
  {
    id: "americana",
    name: "Heritage badge",
    blurb: "Sign-painter craft: badges, stamps, cream paper, trusted local",
    brief:
      "HERITAGE BADGE. A trusted neighbourhood trade with pride in its craft. Cream or kraft-paper backgrounds with deep red, navy or forest and a gold or mustard highlight; display type in a bold slab or sign-painter style (Alfa Slab One, Bevan, Oswald or Playfair Display Black) with a plain sturdy text face (Libre Franklin, Work Sans); round badges, rosettes, ribbons, rubber-stamp marks, pinstripe borders, ticket-style cards, 'free estimate' coupons; copy in a plain friendly voice. Never state a founding year, licence or award that wasn't given. Do NOT use neon, glass, thin type, gradients or minimalism.",
    hero: "A hand-painted shop sign, NOT a photo with text on it. Cream or kraft paper background with a pinstripe border framing the whole first screen. A centred, symmetrical composition: a small arched banner line, the big slab headline centred beneath it, a round seal or badge to one side. Below, the picture in a postcard or ticket frame with scalloped or notched corners; the moving picture plays inside that frame. A coupon-style button with a dashed edge.",
    scenes: [
      "A strip of three stamped promises (rubber-stamp circles or rosettes), each a plain supportable promise.",
      "The offer as a sign-painter's board: a framed panel with two columns of items joined to short descriptions by dotted leaders.",
      "Our story: a ribbon heading, a postcard photograph at a slight angle, and the story in a friendly plain voice.",
      "A ticket: one big perforated coupon inviting the main action (an offer only if one was given; otherwise a plain invitation).",
      "Photographs as pinned postcards at slight rotations, with handwritten-style captions in a plain italic.",
      "From the guest book: reviews as cards with a small rosette each.",
      "How it works as a row of numbered round badges.",
      "Location as an old map panel with a compass mark, then questions, then the form as an order pad with ruled lines.",
    ],
    moves:
      'Badges that scale in (data-reveal="scale"), a slight tilt on postcards and tickets (data-tilt), at most one slow marquee.',
    never:
      "No shader, no glass or blur, no thin elegant type, no pinned horizontal gallery, no scrubbed text, no neon, no full-bleed dark photo hero.",
  },
  {
    id: "playful",
    name: "Playful pop",
    blurb: "Bright colour, chunky rounded type, friendly shapes",
    brief:
      "PLAYFUL POP. Friendly and bright. Chunky rounded display type (Unbounded, Dela Gothic One, Fredoka, Bricolage Grotesque extra bold) with a simple rounded sans for text; a cheerful multi-colour palette (the brand colour plus three supporting brights on a warm white or deep violet), big pill buttons, sticker shapes, wobbling blobs and stars drawn as inline SVG, emoji-free iconography, cards that tilt and bounce on hover, rounded photo frames. Generous, easy copy. Motion is bouncy: magnetic buttons, tilt, marquees. Do NOT use serifs, thin type, hairline rules or a serious dark mood.",
    hero: "Bright and bouncy, NOT a dark photo with text on it. A saturated flat background colour. The headline centred in chunky rounded type, set whole on a slightly tilted sticker-shaped block of a second bright colour. Stickers, stars and blobs (inline SVG) float around it at different depths. The picture sits in a rounded blob-shaped frame that tilts with the pointer; the moving picture plays inside it. One big pill button that follows the pointer.",
    scenes: [
      "A bouncing marquee of words and small drawn icons.",
      "The offer as a grid of chunky cards, each a different bright colour with a big simple drawn icon, which tilt and lift on hover.",
      "Who it's for: three large rounded panels side by side, each a different colour, with a friendly heading and two lines.",
      "The story as a big speech bubble next to two or three photographs in tilted rounded frames.",
      "How it works as a board-game path: numbered spaces along a looping line.",
      "Reviews as a chat thread of coloured bubbles.",
      "A photo collage in rounded frames with sticker captions.",
      "Location with a big drawn map pin beside a rounded map, then questions as pills, then the form in one large colourful card.",
    ],
    moves:
      "Magnetic buttons, tilt (data-tilt), a marquee, bouncy scale-in reveals, floating stickers (data-parallax).",
    never:
      "No serif type, no shader, no hairline rules, no dark moody sections, no scrubbed text, no pinned horizontal gallery, no letterbox bars.",
  },
  {
    id: "luxe",
    name: "Luxe",
    blurb: "Black and ivory, gold detail, fine type, lots of space",
    brief:
      "LUXE. Quiet, expensive, unhurried. Black, deep charcoal or ivory with a fine metallic accent (champagne, brass or a muted jewel colour) used for hairlines and small details only; thin elegant display type (Cormorant Garamond light, Bodoni Moda, Italiana, Marcellus) in generous sizes with wide tracking in small caps for labels, with a light sans for text (Jost, Montserrat light, Manrope); extreme whitespace, centred symmetric compositions, slow fades, tall portrait photography, thin 1px frames and corner marks. Buttons are thin outlined rectangles. Do NOT use loud colour, stickers, heavy type, shadows or busy layouts.",
    hero: "Quiet and expensive, NOT a photo with a headline on it. Black, deep charcoal or ivory, mostly empty. Everything centred: a tiny wide-tracked small-caps label, then the headline in the thin elegant serif at a moderate size (never giant), then one short line. Below, a tall portrait picture in a thin frame, revealed slowly; the moving picture plays inside that frame. A thin outlined rectangular button. Thin corner marks.",
    scenes: [
      "A single centred sentence between two thin rule ornaments.",
      "The offer as a generously spaced list with roman numerals: full-width rows with the name on the left in the serif, one line on the right, a hairline between rows. No cards, no icons.",
      "A diptych: two tall portrait photographs side by side in thin frames, with one small caption.",
      "The story as a narrow centred column of text.",
      "One review, centred, in italic serif inside a thin frame.",
      "Three columns of details (how it works or what's included) with small-caps headings and hairlines.",
      "Location: the address in large thin type with a small framed map and hours in small caps.",
      "A discreet list of questions, then a minimal centred form with underlined fields, closing with a small monogram.",
    ],
    moves:
      "Slow fades, slow clip reveals on pictures, very slow parallax. Nothing fast.",
    never:
      "No marquee, no stacked cards, no pinned horizontal gallery, no loud shader, no stickers, no heavy type, no cards with backgrounds, no bright colour.",
  },
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id);
export const conceptById = (id: string | undefined | null) =>
  CONCEPTS.find((c) => c.id === id);

/** Which concepts suit a trade (best first). Anything not matched can use any of them. */
const SUITS: [RegExp, string[]][] = [
  [
    /landscap|lawn|garden|tree|yard|nursery|irrigat/i,
    ["organic", "editorial", "cinematic", "americana"],
  ],
  [
    /plumb|drain|pipe|sewer|rooter|water heater/i,
    ["kinetic", "americana", "brutalist", "swiss"],
  ],
  [
    /hvac|air ?con|a\/c|heat|cool|furnace/i,
    ["swiss", "kinetic", "cinematic", "playful"],
  ],
  [
    /roof|gutter|siding|chimney/i,
    ["cinematic", "kinetic", "americana", "brutalist"],
  ],
  [/electric|lighting|solar/i, ["cinematic", "kinetic", "swiss", "brutalist"]],
  [
    /clean|maid|janitor|wash|laundr/i,
    ["playful", "swiss", "organic", "editorial"],
  ],
  [
    /pest|termite|wildlife|animal|exterminat|rodent/i,
    ["brutalist", "americana", "kinetic", "organic"],
  ],
  [
    /auto|car |garage|mechanic|tire|detail|body shop|collision|towing/i,
    ["kinetic", "brutalist", "cinematic", "americana"],
  ],
  [
    /dent|orthodon|medical|clinic|doctor|chiropract|therap|vet/i,
    ["swiss", "luxe", "organic", "playful"],
  ],
  [
    /salon|spa|beauty|hair|nail|barber|lash|massage|wellness|tattoo/i,
    ["luxe", "editorial", "organic", "playful"],
  ],
  [
    /restaurant|cafe|coffee|bakery|food|pizza|bar |catering|truck/i,
    ["editorial", "playful", "americana", "cinematic"],
  ],
  [
    /law|attorney|account|insur|financ|real estate|realt|mortgage|consult/i,
    ["luxe", "swiss", "editorial", "cinematic"],
  ],
  [
    /gym|fitness|yoga|crossfit|trainer|martial|dance/i,
    ["kinetic", "cinematic", "brutalist", "playful"],
  ],
  [
    /remodel|construct|contractor|paint|floor|handyman|fence|concrete|pav|mason|carpent|deck/i,
    ["americana", "swiss", "brutalist", "editorial"],
  ],
];

/** A small stable number from text (so the same site always gets the same concept, different sites differ). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The concept for a Studio build: the one asked for, else one that suits the trade, varied by site,
 * and not one the account's last two Studio sites used (when the trade leaves a choice).
 */
export function pickConcept(intake: { concept?: string; industry?: string; businessName?: string; services?: string }, slug: string, recent: string[] = []): Concept {
  const asked = conceptById(intake.concept);
  if (asked) return asked;
  const text = `${intake.industry ?? ""} ${intake.businessName ?? ""} ${intake.services ?? ""}`;
  const shortlist = SUITS.find(([re]) => re.test(text))?.[1] ?? CONCEPT_IDS;
  const fresh = shortlist.filter((id) => !recent.slice(0, 2).includes(id));
  const from = fresh.length ? fresh : shortlist;
  return conceptById(from[hash(slug) % from.length])!;
}

/**
 * The deal for one site within its look. A look is a material (type, colour, picture frames, its
 * own scenes); the deal decides how this particular page is put together from it, so two sites in
 * the same look don't share a skeleton: the order of the middle scenes, which one is made the
 * biggest moment, whether the first screen is mirrored, and the kind of menu and footer.
 */
export interface Draw {
  /** Scene indexes in the order to build them (the first and last scenes keep their places). */
  order: number[];
  /** The scene given the most room. */
  feature: number;
  mirror: boolean;
  nav: string;
  footer: string;
  /** What makes two deals the same: compared against the account's recent sites. */
  print: string;
}

const NAVS = [
  "a floating bar inset from the edges",
  "a full-width bar with one hairline under it",
  "only the name on the left and a Menu button on the right, with every link in the full-screen menu",
];
const FOOTERS = [
  "tall, led by the business name set large above the link columns",
  "one compact band of columns",
  "a single centred column: the name, the links in a row, the details beneath",
];

export function drawFor(c: Concept, seed: string, recent: string[] = []): Draw {
  const last = c.scenes.length - 1;
  let draw: Draw | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    let h = hash(`${seed}:${c.id}:${attempt}`);
    const next = (n: number) => {
      h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
      return ((h ^ (h >>> 16)) >>> 0) % n;
    };
    const middle = Array.from({ length: last - 1 }, (_, i) => i + 1);
    for (let i = middle.length - 1; i > 0; i--) {
      const j = next(i + 1);
      [middle[i], middle[j]] = [middle[j]!, middle[i]!];
    }
    const order = [0, ...middle, last];
    const feature = middle[next(middle.length)]!;
    const mirror = next(2) === 1;
    const nav = next(NAVS.length);
    const footer = next(FOOTERS.length);
    const print = `${c.id}:${order.join("")}:${feature}:${mirror ? 1 : 0}:${nav}${footer}`;
    draw = { order, feature, mirror, nav: NAVS[nav]!, footer: FOOTERS[footer]!, print };
    // Different enough from a recent site in the same look: not the same order, and not the same opening scenes with the same mirroring.
    const clash = recent.some((r) => {
      const [id, o, , m] = r.split(":");
      return id === c.id && (o === order.join("") || (o?.slice(0, 4) === order.join("").slice(0, 4) && m === (mirror ? "1" : "0")));
    });
    if (!clash) break;
  }
  return draw!;
}
