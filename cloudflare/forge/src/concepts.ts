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
}

export const CONCEPTS: Concept[] = [
  {
    id: "editorial",
    name: "Editorial",
    blurb: "Magazine layouts, big serif headlines, quiet colour",
    brief:
      "EDITORIAL. A premium print magazine. Display type: an oversized high-contrast serif (Instrument Serif, Playfair Display, Cormorant Garamond, DM Serif Display) at very large sizes with tight tracking; text in a clean grotesk (Hanken Grotesk, Inter Tight). Asymmetric 12-column grids, a wide left margin for small captions and folios, photographs cropped boldly and set at different scales, thin hairline rules, pull quotes in large italic. Quiet palette: warm paper or deep ink plus one considered accent. Reveal text line by line. Do NOT use marquees, stickers, neon, heavy shadows or round pills; keep it restrained and confident.",
  },
  {
    id: "kinetic",
    name: "Kinetic",
    blurb: "Giant condensed type, hard colour blocks, high energy",
    brief:
      "KINETIC. Loud, fast, confident. Display type: giant condensed uppercase grotesk (Big Shoulders Display, Anton, Bebas Neue, Archivo Narrow Black, Oswald) at 12–20vw with leading under 0.9, sometimes cropped by the viewport edge; text in a neutral sans. Hard flat colour blocks that change from section to section (the brand colour, near-black, off-white and one contrast colour), diagonal or stepped section edges, rotated stickers and badges, a fast marquee, oversized numerals, chunky square buttons. Motion is snappy: chars splitting, parallax, sticky stacking cards. Do NOT use thin serifs, soft gradients, glass or pastel colours.",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    blurb: "Dark, full-bleed imagery, film grain, slow reveals",
    brief:
      "CINEMATIC. A film title sequence. Dark by default: a near-black canvas tinted toward the brand hue, one luminous accent used sparingly for light and highlights. Full-bleed photography in letterboxed sections with a visible film grain (data-grain), vignettes and slow parallax; display type is thin and wide-tracked uppercase or a light grotesk (Syne, Unbounded light, Manrope, Jost) at moderate size with a lot of space; short lines of copy like subtitles. A living shader background in the hero. Sections feel like scenes. Do NOT use bright flat colour blocks, stickers, cards with borders, or italic serif accent phrases.",
  },
  {
    id: "brutalist",
    name: "Neo-brutalist",
    blurb: "Raw grid, thick borders, hard shadows, playful honesty",
    brief:
      "NEO-BRUTALIST. Raw, honest, a little cheeky. Visible structure: 2–3px solid black borders on everything, hard offset shadows (no blur), flat saturated colours (one strong brand colour plus a loud secondary like yellow, lilac or mint) on an off-white or light-grey base, a monospace for labels (Space Mono, JetBrains Mono, DM Mono) with a heavy grotesk for headings (Space Grotesk bold, Archivo Black, Familjen Grotesk). Rectangular buttons that lift on hover, a visible grid, oversized numbers, tilted tags, ticker tape. Photos get a thick border and a hard shadow. Do NOT use gradients, glass, soft shadows, rounded pills or elegant serifs.",
  },
  {
    id: "swiss",
    name: "Swiss modernist",
    blurb: "Strict grid, one typeface, huge numerals, lots of white",
    brief:
      "SWISS MODERNIST. Precise and rational. A single neo-grotesk family (Inter Tight, Hanken Grotesk, Instrument Sans, Geist) used at only a few sizes: tiny 12px captions and uppercase labels against huge headings and huge numerals; a strict 12-column grid with generous empty space, thin rules, a clear baseline rhythm; palette of off-white (or black) plus ONE strong accent (international red, cobalt or signal orange). Information shown like data: indexed lists, tabular figures, small cross-reference marks. Images are cropped square or in tall columns, never rounded. Motion is minimal and exact: clip reveals and counters. Do NOT use decoration, gradients, shadows, illustrations or italic serif accents.",
  },
  {
    id: "organic",
    name: "Organic",
    blurb: "Soft shapes, arches, earthy warm colour, human touch",
    brief:
      "ORGANIC. Warm, human, tactile. Soft arched and blob-shaped image masks, overlapping cut-outs, rounded cards with generous padding, earthy warm palette (clay, sage, oat, deep forest or ink for text, one bright accent), subtle paper or linen texture, hand-drawn underline and squiggle accents drawn as small inline SVG, a friendly soft display face (Fraunces soft, Young Serif, Gloock, Bricolage Grotesque) with a humanist text face (Figtree, Nunito Sans). Asymmetric layouts with curved section dividers. Gentle motion: floating shapes, soft parallax. Do NOT use sharp 90-degree boxes, neon, monospace labels or giant condensed type.",
  },
  {
    id: "americana",
    name: "Heritage badge",
    blurb: "Sign-painter craft: badges, stamps, cream paper, trusted local",
    brief:
      "HERITAGE BADGE. A trusted neighbourhood trade with pride in its craft. Cream or kraft-paper backgrounds with deep red, navy or forest and a gold or mustard highlight; display type in a bold slab or sign-painter style (Alfa Slab One, Bevan, Oswald or Playfair Display Black) with a plain sturdy text face (Libre Franklin, Work Sans); round badges, rosettes, ribbons, rubber-stamp marks, pinstripe borders, ticket-style cards, 'free estimate' coupons; copy in a plain friendly voice. Never state a founding year, licence or award that wasn't given. Do NOT use neon, glass, thin type, gradients or minimalism.",
  },
  {
    id: "playful",
    name: "Playful pop",
    blurb: "Bright colour, chunky rounded type, friendly shapes",
    brief:
      "PLAYFUL POP. Friendly and bright. Chunky rounded display type (Unbounded, Dela Gothic One, Fredoka, Bricolage Grotesque extra bold) with a simple rounded sans for text; a cheerful multi-colour palette (the brand colour plus three supporting brights on a warm white or deep violet), big pill buttons, sticker shapes, wobbling blobs and stars drawn as inline SVG, emoji-free iconography, cards that tilt and bounce on hover, rounded photo frames. Generous, easy copy. Motion is bouncy: magnetic buttons, tilt, marquees. Do NOT use serifs, thin type, hairline rules or a serious dark mood.",
  },
  {
    id: "luxe",
    name: "Luxe",
    blurb: "Black and ivory, gold detail, fine type, lots of space",
    brief:
      "LUXE. Quiet, expensive, unhurried. Black, deep charcoal or ivory with a fine metallic accent (champagne, brass or a muted jewel colour) used for hairlines and small details only; thin elegant display type (Cormorant Garamond light, Bodoni Moda, Italiana, Marcellus) in generous sizes with wide tracking in small caps for labels, with a light sans for text (Jost, Montserrat light, Manrope); extreme whitespace, centred symmetric compositions, slow fades, tall portrait photography, thin 1px frames and corner marks. Buttons are thin outlined rectangles. Do NOT use loud colour, stickers, heavy type, shadows or busy layouts.",
  },
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id);
export const conceptById = (id: string | undefined | null) => CONCEPTS.find((c) => c.id === id);

/** Which concepts suit a trade (best first). Anything not matched can use any of them. */
const SUITS: [RegExp, string[]][] = [
  [/landscap|lawn|garden|tree|yard|nursery|irrigat/i, ["organic", "editorial", "cinematic", "americana"]],
  [/plumb|drain|pipe|sewer|rooter|water heater/i, ["kinetic", "americana", "brutalist", "swiss"]],
  [/hvac|air ?con|a\/c|heat|cool|furnace/i, ["swiss", "kinetic", "cinematic", "playful"]],
  [/roof|gutter|siding|chimney/i, ["cinematic", "kinetic", "americana", "brutalist"]],
  [/electric|lighting|solar/i, ["cinematic", "kinetic", "swiss", "brutalist"]],
  [/clean|maid|janitor|wash|laundr/i, ["playful", "swiss", "organic", "editorial"]],
  [/pest|termite|wildlife|animal|exterminat|rodent/i, ["brutalist", "americana", "kinetic", "organic"]],
  [/auto|car |garage|mechanic|tire|detail|body shop|collision|towing/i, ["kinetic", "brutalist", "cinematic", "americana"]],
  [/dent|orthodon|medical|clinic|doctor|chiropract|therap|vet/i, ["swiss", "luxe", "organic", "playful"]],
  [/salon|spa|beauty|hair|nail|barber|lash|massage|wellness|tattoo/i, ["luxe", "editorial", "organic", "playful"]],
  [/restaurant|cafe|coffee|bakery|food|pizza|bar |catering|truck/i, ["editorial", "playful", "americana", "cinematic"]],
  [/law|attorney|account|insur|financ|real estate|realt|mortgage|consult/i, ["luxe", "swiss", "editorial", "cinematic"]],
  [/gym|fitness|yoga|crossfit|trainer|martial|dance/i, ["kinetic", "cinematic", "brutalist", "playful"]],
  [/remodel|construct|contractor|paint|floor|handyman|fence|concrete|pav|mason|carpent|deck/i, ["americana", "swiss", "brutalist", "editorial"]],
];

/** A small stable number from text (so the same site always gets the same concept, different sites differ). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The concept for a Studio build: the one asked for, else one that suits the trade, varied by site. */
export function pickConcept(intake: { concept?: string; industry?: string; businessName?: string; services?: string }, slug: string): Concept {
  const asked = conceptById(intake.concept);
  if (asked) return asked;
  const text = `${intake.industry ?? ""} ${intake.businessName ?? ""} ${intake.services ?? ""}`;
  const shortlist = SUITS.find(([re]) => re.test(text))?.[1] ?? CONCEPT_IDS;
  return conceptById(shortlist[hash(slug) % shortlist.length])!;
}
