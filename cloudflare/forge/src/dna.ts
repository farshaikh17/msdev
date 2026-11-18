/**
 * Design DNA: the parts of a site's look that make two sites feel different at a glance (the colour
 * family, the type pairing, the shape language, light or dark, and for Standard the first-screen layout)
 * are decided here, in code, not by the writing model. Left to itself a model settles on one safe look
 * every time (the lean model's was deep navy with an amber button, six sites running), whatever its
 * brief says. So each build is dealt a DNA unlike the account's recent sites, the writer is told it
 * exactly, and afterwards its stylesheet is held to it: colours are moved onto the DNA's hues at their
 * own lightness (so contrast stays as designed) and its fonts are swapped for the DNA's pair.
 */

import TASTE_PALETTES from "./taste/palettes.json";
import TASTE_TYPE from "./taste/type.json";

export interface Hues {
  /** Neutral tint (backgrounds, ink, lines): hue in degrees and chroma (OKLCH). */
  n: [number, number];
  /** The accent: hue and chroma. */
  a: [number, number];
  /** A second, smaller colour: hue and chroma. */
  b: [number, number];
}

interface PaletteDef {
  id: string;
  name: string;
  hues: Hues;
  /** A curated palette's own colours for its own mode (tasteskill), used exactly. */
  exact?: { bg: string; surface: string; ink: string; muted: string; accent: string; accentInk: string };
  /** The trades a curated palette was made for (tasteskill's trade tags). */
  trades?: string[];
  tags?: string[];
  /** How the palette is used (tasteskill's note): where the accent goes, what inverts. */
  note?: string;
  /** Light, dark, or either. */
  mode: "light" | "dark" | "any";
  /** The looks (concept ids, or "standard") it suits; "*" for all. */
  suits: string[];
}

// Hue families spread around the wheel, so neighbouring sites never share an accent.
const PALETTES: PaletteDef[] = [
  { id: "terracotta-sage", name: "terracotta and sage on warm paper", hues: { n: [70, 0.014], a: [40, 0.13], b: [140, 0.05] }, mode: "light", suits: ["editorial", "organic", "americana", "standard"] },
  { id: "cobalt-cream", name: "cobalt blue on cream with a saffron note", hues: { n: [85, 0.012], a: [264, 0.17], b: [75, 0.13] }, mode: "light", suits: ["swiss", "editorial", "kinetic", "standard"] },
  { id: "forest-brass", name: "deep forest green with brass", hues: { n: [150, 0.012], a: [155, 0.1], b: [85, 0.1] }, mode: "any", suits: ["luxe", "organic", "editorial", "cinematic", "standard"] },
  { id: "plum-blush", name: "plum with a blush of coral", hues: { n: [350, 0.014], a: [345, 0.14], b: [30, 0.1] }, mode: "any", suits: ["luxe", "editorial", "playful", "cinematic", "standard"] },
  { id: "poster-red", name: "signal red and near-black on off-white", hues: { n: [80, 0.006], a: [29, 0.2], b: [264, 0.15] }, mode: "light", suits: ["kinetic", "brutalist", "swiss", "americana"] },
  { id: "teal-citrus", name: "teal with a citrus yellow", hues: { n: [180, 0.012], a: [185, 0.11], b: [85, 0.15] }, mode: "any", suits: ["playful", "organic", "swiss", "standard"] },
  { id: "ink-vermilion", name: "ink black on ivory with one vermilion mark", hues: { n: [90, 0.008], a: [35, 0.18], b: [250, 0.03] }, mode: "light", suits: ["editorial", "brutalist", "swiss", "luxe"] },
  { id: "indigo-ochre", name: "indigo night with ochre", hues: { n: [280, 0.02], a: [75, 0.13], b: [280, 0.12] }, mode: "dark", suits: ["cinematic", "luxe", "editorial"] },
  { id: "sky-coral", name: "clear sky blue with coral", hues: { n: [240, 0.014], a: [32, 0.16], b: [240, 0.12] }, mode: "light", suits: ["playful", "swiss", "standard", "kinetic"] },
  { id: "moss-rust", name: "moss green with rust", hues: { n: [110, 0.014], a: [120, 0.1], b: [40, 0.12] }, mode: "any", suits: ["organic", "americana", "editorial", "standard"] },
  { id: "violet-peach", name: "electric violet with peach", hues: { n: [290, 0.012], a: [290, 0.19], b: [45, 0.12] }, mode: "any", suits: ["playful", "kinetic", "cinematic"] },
  { id: "navy-gold", name: "navy with old gold", hues: { n: [255, 0.018], a: [88, 0.13], b: [255, 0.1] }, mode: "any", suits: ["luxe", "americana", "editorial", "standard"] },
  { id: "rose-teal", name: "rose with deep teal", hues: { n: [10, 0.012], a: [0, 0.16], b: [195, 0.08] }, mode: "light", suits: ["playful", "organic", "luxe", "standard"] },
  { id: "sand-cyan", name: "sand with sea cyan", hues: { n: [75, 0.016], a: [215, 0.12], b: [45, 0.12] }, mode: "light", suits: ["organic", "swiss", "standard", "editorial"] },
  { id: "lime-ink", name: "acid lime and ultramarine on black", hues: { n: [110, 0.006], a: [275, 0.2], b: [125, 0.2] }, mode: "dark", suits: ["kinetic", "brutalist", "playful"] },
  { id: "bordeaux-linen", name: "bordeaux on linen with champagne", hues: { n: [40, 0.014], a: [15, 0.13], b: [85, 0.08] }, mode: "any", suits: ["luxe", "editorial", "cinematic", "standard"] },
  { id: "pine-mint", name: "pine and mint with honey", hues: { n: [160, 0.016], a: [155, 0.14], b: [90, 0.12] }, mode: "any", suits: ["organic", "playful", "standard", "swiss"] },
  { id: "steel-signal", name: "steel grey with signal blue and orange", hues: { n: [250, 0.004], a: [262, 0.21], b: [40, 0.19] }, mode: "light", suits: ["swiss", "brutalist", "kinetic"] },
  { id: "flag", name: "old-flag red and navy on parchment", hues: { n: [80, 0.018], a: [25, 0.17], b: [260, 0.1] }, mode: "light", suits: ["americana", "kinetic", "standard"] },
  { id: "mustard-ink", name: "mustard on charcoal with petrol", hues: { n: [70, 0.008], a: [88, 0.14], b: [205, 0.06] }, mode: "any", suits: ["americana", "brutalist", "kinetic", "editorial"] },
  { id: "berry-lemon", name: "berry with lemon", hues: { n: [340, 0.012], a: [355, 0.18], b: [100, 0.14] }, mode: "light", suits: ["playful", "kinetic", "standard"] },
  { id: "clinic-mint", name: "graphite with clean mint and coral", hues: { n: [200, 0.01], a: [175, 0.1], b: [30, 0.12] }, mode: "light", suits: ["swiss", "standard", "organic"] },
  { id: "midnight-violet", name: "midnight with violet and pink", hues: { n: [285, 0.03], a: [285, 0.17], b: [355, 0.14] }, mode: "dark", suits: ["cinematic", "luxe", "playful"] },
  { id: "ice-sun", name: "ice blue night with a sun yellow", hues: { n: [240, 0.02], a: [235, 0.12], b: [90, 0.14] }, mode: "dark", suits: ["cinematic", "swiss", "kinetic"] },
  { id: "ember-teal", name: "ember red with teal on soot", hues: { n: [200, 0.012], a: [32, 0.17], b: [190, 0.09] }, mode: "dark", suits: ["cinematic", "kinetic", "americana"] },
  { id: "clay-blue", name: "clay pink with workwear blue", hues: { n: [50, 0.014], a: [250, 0.13], b: [30, 0.09] }, mode: "light", suits: ["editorial", "organic", "americana", "standard"] },
  { id: "olive-plum", name: "olive with plum", hues: { n: [100, 0.012], a: [330, 0.12], b: [110, 0.08] }, mode: "any", suits: ["editorial", "luxe", "organic", "standard"] },
  { id: "tangerine-slate", name: "tangerine on slate", hues: { n: [240, 0.012], a: [50, 0.17], b: [220, 0.08] }, mode: "light", suits: ["kinetic", "playful", "swiss", "standard"] },
];

// ---- the tasteskill library (MIT, src/taste): 64 palettes made for trades, 39 type pairings ------------

/** The tasteskill trade tags a business falls under (what its curated palettes were made for). */
export function tasteTrades(text: string): string[] {
  const t = text.toLowerCase();
  const out = new Set<string>();
  const add = (re: RegExp, ...tags: string[]) => re.test(t) && tags.forEach((x) => out.add(x));
  add(/restaurant|grill|\bbar\b|taco|seafood|burger|diner|pizza|bistro|kitchen|steak|sushi|bbq|barbecue|eatery|tavern|pub\b|waffle/, "restaurant");
  add(/caf[eé]|coffee|yogurt|ice cream|gelato|dessert|juice|tea\b|smoothie|creamery/, "cafe");
  add(/bakery|bread|pastr|cake|bagel|donut|patisserie/, "bakery");
  add(/hotel|\binn\b|motel|lodge|b&b|bed and breakfast|resort|guest ?house|hostel/, "hotel");
  add(/clinic|hospital|dental|dentist|ortho|medical|doctor|pharmacy|veterinar|\bvet\b|physio|chiro|optomet|urgent care/, "clinic");
  add(/spa\b|salon|beauty|wellness|massage|yoga|gym|fitness|med ?spa|barber|nail|pilates/, "wellness");
  add(/law|attorney|lawyer|account|tax|insurance|real estate|realty|property|financial|bank|notary/, "law");
  add(/plumb|hvac|air ?con|heating|electric|roof|towing|tow\b|auto|tire|wheel|mechanic|garage|construction|contractor|landscap|lawn|tree|pest|wildlife|trapp|clean|paint|storage|warehouse|moving|handyman|locksmith|pool|fence|concrete|weld|repair|install/, "workshop");
  add(/shop|store|thrift|retail|boutique|market|grocer|superette|florist|flower|nursery|hardware store|gift|jewel|fuel|gas station|convenience/, "retail");
  add(/school|daycare|preschool|museum|gallery|park|church|escape|arcade|casino|theater|theatre|studio|academy|library|club|venue|stadium|ballpark/, "studio");
  add(/wedding|event|bridal|florist|catering|party/, "wedding");
  add(/agency|marketing|design|photograph|consult/, "agency");
  if (!out.size) ["workshop", "studio", "agency"].forEach((x) => out.add(x));
  return [...out];
}

interface TastePalette {
  id: string;
  name: string;
  tags: string[];
  trades: string[];
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  fields?: { bg: string; ink: string }[];
  note?: string;
}

const tastePalettes: PaletteDef[] = (TASTE_PALETTES as TastePalette[]).flatMap((p) => {
  const bg = hexToOklch(p.bg), sf = hexToOklch(p.surface), ac = hexToOklch(p.accent), ink = hexToOklch(p.ink);
  if (!bg || !sf || !ac || !ink) return [];
  // Never violet or lavender as the page's own colour (the skill's rule).
  if (ac.c > 0.06 && ac.h > 275 && ac.h < 320) return [];
  const tint = bg.c >= 0.006 ? bg : sf.c >= 0.006 ? sf : ink;
  const field = (p.fields ?? []).map((f) => hexToOklch(f.bg)).find((c) => c && c.c > 0.04) ?? null;
  const mode: "light" | "dark" = bg.l > 0.5 ? "light" : "dark";
  return [{
    id: `t-${p.id}`,
    name: p.name.toLowerCase(),
    hues: { n: [Math.round(tint.h), Math.min(0.03, Math.max(0.006, tint.c))], a: [Math.round(ac.h), Math.min(0.2, Math.max(0.04, ac.c))], b: field ? [Math.round(field.h), Math.min(0.18, field.c)] : [Math.round(ac.h + 35) % 360, Math.min(0.1, ac.c * 0.6)] },
    mode,
    suits: [],
    exact: { bg: p.bg, surface: p.surface, ink: p.ink, muted: p.muted, accent: p.accent, accentInk: p.accentInk },
    trades: p.trades,
    tags: p.tags,
    ...(p.note ? { note: p.note } : {}),
  }];
});

interface TasteType {
  id: string;
  class: string;
  kinds: Record<string, number>;
  place?: string;
  display: { family: string; w: unknown };
  text: { family: string; w: unknown };
}

const CLASS_LOOKS: Record<string, string[]> = {
  serif: ["editorial", "luxe", "organic", "cinematic", "standard"],
  slab: ["americana", "standard", "editorial"],
  "neo-grotesk": ["swiss", "cinematic", "standard"],
  geometric: ["playful", "swiss", "standard"],
  "grotesk-soft": ["playful", "organic", "standard"],
  soft: ["playful", "organic", "standard"],
  wide: ["kinetic", "brutalist", "swiss"],
};

const weights = (w: unknown): number[] => (Array.isArray(w) ? w.map(Number).filter((n) => n > 0) : typeof w === "string" || typeof w === "number" ? String(w).match(/\d{3}/g)?.map(Number) ?? [] : []);
const gq = (family: string, w: number[]) => `family=${family.replace(/ /g, "+")}:wght@${[...new Set(w.length ? w : [400, 700])].sort((a, b) => a - b).join(";")}`;

const tasteFonts: FontDef[] = (TASTE_TYPE as TasteType[])
  // Pairings made for services, products or places (not software-only faces).
  .filter((t) => (t.kinds.service ?? 0) + (t.kinds.product ?? 0) > 0 || t.place)
  .map((t) => ({
    id: `t-${t.id}`,
    display: t.display.family,
    text: t.text.family,
    q: t.display.family === t.text.family ? gq(t.display.family, [...weights(t.display.w), ...weights(t.text.w), 700]) : `${gq(t.display.family, [...weights(t.display.w), 700])}&${gq(t.text.family, [...weights(t.text.w), 600])}`,
    suits: CLASS_LOOKS[t.class] ?? ["standard"],
  }));

interface FontDef {
  id: string;
  display: string;
  text: string;
  /** The Google Fonts css2 query for both families. */
  q: string;
  suits: string[];
}

const FONTS: FontDef[] = [
  { id: "fraunces", display: "Fraunces", text: "Inter Tight", q: "family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..700&family=Inter+Tight:wght@400;500;600", suits: ["editorial", "organic", "luxe", "standard"] },
  { id: "instrument", display: "Instrument Serif", text: "Hanken Grotesk", q: "family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700", suits: ["editorial", "luxe", "cinematic", "standard"] },
  { id: "playfair", display: "Playfair Display", text: "Manrope", q: "family=Playfair+Display:ital,wght@0,500..800;1,500..700&family=Manrope:wght@400;500;600;700", suits: ["editorial", "luxe", "standard"] },
  { id: "dmserif", display: "DM Serif Display", text: "DM Sans", q: "family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400..700", suits: ["editorial", "americana", "standard"] },
  { id: "cormorant", display: "Cormorant Garamond", text: "Jost", q: "family=Cormorant+Garamond:ital,wght@0,400..700;1,400..600&family=Jost:wght@400;500;600", suits: ["luxe", "organic"] },
  { id: "bigshoulders", display: "Big Shoulders Display", text: "Hanken Grotesk", q: "family=Big+Shoulders+Display:wght@600..900&family=Hanken+Grotesk:wght@400;500;600;700", suits: ["kinetic", "americana", "brutalist"] },
  { id: "anton", display: "Anton", text: "Inter Tight", q: "family=Anton&family=Inter+Tight:wght@400;500;600;700", suits: ["kinetic", "brutalist", "cinematic"] },
  { id: "bebas", display: "Bebas Neue", text: "Work Sans", q: "family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700", suits: ["kinetic", "americana"] },
  { id: "archivo", display: "Archivo Black", text: "Archivo", q: "family=Archivo+Black&family=Archivo:wght@400;500;600;700", suits: ["brutalist", "swiss", "kinetic"] },
  { id: "spacegrotesk", display: "Space Grotesk", text: "IBM Plex Sans", q: "family=Space+Grotesk:wght@400..700&family=IBM+Plex+Sans:wght@400;500;600", suits: ["swiss", "brutalist", "cinematic", "standard"] },
  { id: "unbounded", display: "Unbounded", text: "Manrope", q: "family=Unbounded:wght@400..800&family=Manrope:wght@400;500;600;700", suits: ["playful", "kinetic"] },
  { id: "bricolage", display: "Bricolage Grotesque", text: "Figtree", q: "family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600;700", suits: ["playful", "organic", "standard", "kinetic"] },
  { id: "syne", display: "Syne", text: "DM Sans", q: "family=Syne:wght@500..800&family=DM+Sans:opsz,wght@9..40,400..700", suits: ["cinematic", "playful", "kinetic"] },
  { id: "youngserif", display: "Young Serif", text: "Instrument Sans", q: "family=Young+Serif&family=Instrument+Sans:wght@400..700", suits: ["organic", "editorial", "standard", "americana"] },
  { id: "gloock", display: "Gloock", text: "Figtree", q: "family=Gloock&family=Figtree:wght@400;500;600;700", suits: ["editorial", "luxe", "cinematic"] },
  { id: "abril", display: "Abril Fatface", text: "Lato", q: "family=Abril+Fatface&family=Lato:wght@400;700", suits: ["americana", "editorial"] },
  { id: "alfaslab", display: "Alfa Slab One", text: "Work Sans", q: "family=Alfa+Slab+One&family=Work+Sans:wght@400;500;600;700", suits: ["americana", "brutalist", "kinetic"] },
  { id: "zilla", display: "Zilla Slab", text: "Source Sans 3", q: "family=Zilla+Slab:ital,wght@0,500;0,700;1,500&family=Source+Sans+3:wght@400;600;700", suits: ["americana", "standard", "editorial"] },
  { id: "outfit", display: "Outfit", text: "Source Serif 4", q: "family=Outfit:wght@400..800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600", suits: ["swiss", "standard", "editorial"] },
  { id: "michroma", display: "Michroma", text: "Manrope", q: "family=Michroma&family=Manrope:wght@400;500;600;700", suits: ["cinematic", "swiss"] },
  { id: "oswald", display: "Oswald", text: "Lora", q: "family=Oswald:wght@400..700&family=Lora:ital,wght@0,400..600;1,400", suits: ["cinematic", "americana"] },
  { id: "caslon", display: "Libre Caslon Display", text: "Libre Franklin", q: "family=Libre+Caslon+Display&family=Libre+Franklin:wght@400;500;600;700", suits: ["editorial", "luxe", "standard"] },
  { id: "fredoka", display: "Fredoka", text: "Nunito", q: "family=Fredoka:wght@400..700&family=Nunito:wght@400;600;700", suits: ["playful"] },
  { id: "righteous", display: "Righteous", text: "Poppins", q: "family=Righteous&family=Poppins:wght@400;500;600;700", suits: ["playful", "kinetic"] },
  { id: "marcellus", display: "Marcellus", text: "Mulish", q: "family=Marcellus&family=Mulish:wght@400;600;700", suits: ["luxe", "organic", "standard"] },
  { id: "hedvig", display: "Hedvig Letters Serif", text: "Figtree", q: "family=Hedvig+Letters+Serif:opsz@12..24&family=Figtree:wght@400;500;600;700", suits: ["organic", "editorial", "standard"] },
  { id: "redhat", display: "Red Hat Display", text: "Red Hat Text", q: "family=Red+Hat+Display:wght@500..900&family=Red+Hat+Text:wght@400;500;600", suits: ["swiss", "standard", "cinematic"] },
  { id: "darkergrotesque", display: "Darker Grotesque", text: "Karla", q: "family=Darker+Grotesque:wght@500..900&family=Karla:wght@400;500;600;700", suits: ["brutalist", "kinetic", "swiss"] },
];

interface ShapeDef {
  id: string;
  /** What the writer is told. */
  spec: string;
  suits: string[];
}

const SHAPES: ShapeDef[] = [
  { id: "sharp", spec: "SHARP: square corners everywhere (border-radius 0 on cards, buttons, images and inputs), 1px solid lines in the line colour to divide things, no shadows.", suits: ["editorial", "swiss", "brutalist", "kinetic", "standard"] },
  { id: "soft", spec: "SOFT: cards and images rounded 14px, buttons 10px, inputs 8px; very soft, low shadows (0 1px 2px and 0 8px 24px at low opacity); no hard borders.", suits: ["standard", "organic", "luxe", "playful"] },
  { id: "round", spec: "ROUND: big friendly radii (cards and images 26px, buttons and tags fully pill-shaped, inputs 14px), thick 2px outlines on secondary buttons, no shadows except on hover.", suits: ["playful", "organic", "standard"] },
  { id: "chunky", spec: "CHUNKY: 6px radius, 2px solid ink-coloured borders on cards, buttons and images, and a hard offset shadow (4px 4px 0 in the ink colour) that shifts on hover; bold and tactile.", suits: ["brutalist", "kinetic", "playful", "americana"] },
  { id: "hairline", spec: "HAIRLINE: 2px radius at most, hairline 1px rules instead of boxes, lots of air, buttons as text with an underline or a thin outlined rectangle, no shadows, no filled cards.", suits: ["luxe", "editorial", "cinematic", "swiss", "standard"] },
  { id: "framed", spec: "FRAMED: pictures sit in thick mats (12px of the surface colour around them, 4px radius), cards are flat colour panels with no border or shadow, buttons are solid rectangles with 4px corners.", suits: ["americana", "organic", "editorial", "standard", "cinematic"] },
];

/** Standard sites' first screen: varied so they don't all open the same way. */
// First-screen layouts for Standard sites, after taste-skill's hero compositions (MIT; see ./taste).
// "place" suits a business people visit (food, rooms, shops, venues); "service" one that comes to you.
const STANDARD_HEROES: { id: string; fits: "place" | "service" | "any"; spec: string }[] = [
  { id: "place-band", fits: "place", spec: "PLACE BAND: right under the header the moving picture runs as a full-width band about 56vh tall with nothing on it (no words, no tint); under it, inside the content column, the h1 on the left half (about 48px, max two lines) and, starting at the column's midpoint, the sentence and one button. All of it ends inside the first screen. The .hero-motion layer goes inside the band. No overlay." },
  { id: "letterbox", fits: "place", spec: "LETTERBOX: the moving picture sits inside the content column as a wide frame (about 1200x500, square or barely rounded corners) 24px under the header; under it the h1 on the left and the sentence plus one button from the column's midpoint, level with the h1's top. The .hero-motion layer goes inside the frame. No overlay, no words on the picture." },
  { id: "split", fits: "any", spec: "SPLIT: text on the left five columns (h1 at the top, sentence, two buttons, up to three short real facts); the moving picture on the right half, top-aligned with the h1 and ending on the column's right edge, tall (about 70vh). Optionally one small opaque card on the picture's lower-left corner with one real fact. The .hero-motion layer goes inside the picture's frame. No overlay." },
  { id: "subject-stage", fits: "any", spec: "SUBJECT STAGE: a head row first: the h1 on the left seven columns in two lines; the sentence and buttons stacked on the right four columns, their foot level with the h1's foot. Below it the moving picture as a wide stage across the whole column down to 24px above the fold, square corners. The .hero-motion layer goes inside the stage. No overlay." },
  { id: "calm-side", fits: "service", spec: "CALM SIDE: the moving picture fills the whole first screen; the words (h1 about 72-80px on two lines, sentence, buttons) sit on its calmer left side across six columns, with up to four real facts in a row at the foot. Only a soft directional shade on that side keeps them readable (the rest of the picture stays clear). On phones the words move under a shorter picture. The .hero-motion layer is the section's first child." },
  { id: "oversized", fits: "service", spec: "OVERSIZED WORDS: the h1 set very large (about 120-144px on two lines, phone 52px) on the plain ground at the top; under it on the left half the sentence and buttons, and on the right half the moving picture in a wide frame (about 4:3) whose top is level with the sentence. The .hero-motion layer goes inside that frame. No overlay." },
  { id: "triptych", fits: "any", spec: "TRIPTYCH: the h1 (about 52px) on the left three columns with the sentence and one large button; on the remaining columns a still collage of three pictures at one ratio family (one large, two smaller, edges on the column lines, never overlapping text). The .hero-motion layer fills the large one; the other two are photos from the list." },
];

export interface Dna {
  /** What two sites are compared by: "palette:font:shape:mode:hero". */
  print: string;
  palette: string;
  paletteName: string;
  hues: Hues;
  font: string;
  display: string;
  text: string;
  fonts: string;
  shape: string;
  shapeSpec: string;
  mode: "light" | "dark";
  /** Standard sites: the first-screen layout and the art direction they borrow. */
  hero?: string;
  heroSpec?: string;
  look?: string;
  /** The curated palette's own colours, for its own mode (used exactly). */
  exact?: PaletteDef["exact"];
  /** How the palette is meant to be used. */
  paletteNote?: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

export interface Recent {
  print: string;
  accent: string;
  theme: string;
}

/**
 * The DNA for one site: suited to its look, unlike the account's recent sites (their palettes, type,
 * shapes and accent hues), and not a third dark site in a row. A brand colour from the form or the
 * business's own website leads the accent.
 */
export function pickDna(look: string, slug: string, recent: Recent[] = [], brand = "", standard = false, trades: string[] = []): Dna {
  const used = (i: number) => recent.map((r) => r.print.split(":")[i] ?? "");
  const pick = <T extends { id: string; suits: string[] }>(list: T[], idx: number, salt: string, keep = 10): T => {
    const fit = list.filter((x) => x.suits.includes(look) || x.suits.includes("*") || (standard && x.suits.includes("standard")));
    const pool = fit.length ? fit : list;
    const avoid = used(idx).slice(0, keep);
    const fresh = pool.filter((x) => !avoid.includes(x.id));
    const from = fresh.length ? fresh : pool;
    return from[hash(`${slug}:${salt}`) % from.length]!;
  };
  // Accent hues of the last four sites (from their saved accent colours) are kept clear of by 40°.
  const recentHues = recent.slice(0, 4).map((r) => hexToOklch(r.accent)).filter((c): c is Oklch => !!c && c.c > 0.04).map((c) => c.h);
  // The curated palettes made for this trade lead (a Standard site keeps to light ones, as the skill does
  // for local businesses); the studio's own palettes for the look fill in when too few fit.
  const tasteFit = tastePalettes.filter((p) => p.trades!.some((t) => trades.includes(t)) && (!standard || p.mode === "light"));
  const ownFit = PALETTES.filter((p) => p.suits.includes(look) && (!standard || p.mode !== "dark"));
  const fitPal = tasteFit.length >= 4 ? tasteFit : [...tasteFit, ...ownFit];
  const poolPal = fitPal.length >= 4 ? fitPal : [...PALETTES, ...tastePalettes.filter((p) => !standard || p.mode === "light")];
  const avoidPal = used(0).slice(0, 10);
  const darkRun = recent.slice(0, 2).filter((r) => r.theme === "dark").length;
  const lightRun = recent.slice(0, 3).filter((r) => r.theme === "light").length;
  const okMode = (p: PaletteDef) => !(darkRun >= 2 && p.mode === "dark") && !(lightRun >= 3 && p.mode === "light");
  const gapOf = (p: PaletteDef) => Math.min(360, ...recentHues.map((h) => hueGap(h, p.hues.a[0])));
  const clear = (list: PaletteDef[]) => list.filter((p) => !avoidPal.includes(p.id) && okMode(p) && gapOf(p) >= 40);
  // Suited and clear of the recent accents; else any palette clear of them; else the most distant suited one.
  let cands = clear(poolPal);
  if (!cands.length) cands = clear([...tastePalettes, ...PALETTES].filter((p) => !standard || p.mode !== "dark"));
  if (!cands.length) {
    const rest = poolPal.filter((p) => !avoidPal.includes(p.id) && okMode(p));
    const pool2 = rest.length ? rest : poolPal;
    const best = Math.max(...pool2.map(gapOf));
    cands = pool2.filter((p) => gapOf(p) === best);
  }
  const pal = cands[hash(`${slug}:palette`) % cands.length]!;
  let hues = pal.hues;
  // The business's own colour leads, when it is a real colour (not black, white or grey).
  const b = hexToOklch(brand);
  if (b && b.c > 0.05) {
    hues = { ...pal.hues, a: [Math.round(b.h), Math.max(0.08, Math.min(0.2, b.c))] };
  }
  const mode: "light" | "dark" = standard ? "light" : pal.mode !== "any" ? pal.mode : darkRun >= 1 ? "light" : lightRun >= 2 ? "dark" : hash(`${slug}:mode`) % 3 === 0 ? "dark" : "light";
  const font = pick([...FONTS, ...tasteFonts], 1, "font");
  const shape = pick(SHAPES, 2, "shape", 2);
  let hero: (typeof STANDARD_HEROES)[number] | undefined;
  if (standard) {
    const avoid = used(4).slice(0, 3);
    const place = trades.some((t) => ["restaurant", "cafe", "bakery", "hotel", "retail"].includes(t));
    const service = trades.some((t) => ["workshop", "clinic", "law", "agency", "wellness"].includes(t));
    const kind = place && !service ? "place" : service && !place ? "service" : "any";
    const suited = STANDARD_HEROES.filter((h) => kind === "any" || h.fits === "any" || h.fits === kind);
    const fresh = suited.filter((h) => !avoid.includes(h.id));
    const from = fresh.length ? fresh : suited;
    hero = from[hash(`${slug}:hero`) % from.length]!;
  }
  return {
    print: `${pal.id}:${font.id}:${shape.id}:${mode}:${hero?.id ?? ""}`,
    palette: pal.id,
    paletteName: pal.name,
    hues,
    font: font.id,
    display: font.display,
    text: font.text,
    fonts: `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?${font.q}&display=swap" rel="stylesheet">`,
    shape: shape.id,
    shapeSpec: shape.spec,
    mode,
    ...(hero ? { hero: hero.id, heroSpec: hero.spec } : {}),
    ...(standard ? { look } : {}),
    // A curated palette is used to the letter in its own mode (with the business's colour as its accent).
    ...(pal.note ? { paletteNote: pal.note } : {}),
    ...(pal.exact && pal.mode === mode ? { exact: b && b.c > 0.05 ? { ...pal.exact, accent: oklchToHex({ l: Math.min(0.62, Math.max(0.42, b.l)), c: Math.min(0.2, b.c), h: b.h }) } : pal.exact } : {}),
  };
}

/** The palette as concrete tokens for both modes (what the writer is told to use). */
export function dnaTokens(d: Pick<Dna, "hues"> & { exact?: Dna["exact"]; mode?: Dna["mode"] }): { light: Record<string, string>; dark: Record<string, string> } {
  const made = madeTokens(d);
  const e = d.exact;
  if (!e || !d.mode) return made;
  // The curated palette's own mode, exactly; its lines and second surface mixed from its own colours.
  const mix = (x: string, y: string, k: number) => {
    const p = hexToOklch(x)!, q = hexToOklch(y)!;
    return oklchToHex({ l: p.l + (q.l - p.l) * k, c: p.c + (q.c - p.c) * k, h: p.c < 0.01 ? q.h : p.h });
  };
  made[d.mode] = { ...made[d.mode], bg: e.bg, surface: e.surface, "surface-2": mix(e.surface, e.ink, 0.06), ink: e.ink, muted: e.muted, line: mix(e.bg, e.ink, 0.14), accent: e.accent, "accent-ink": e.accentInk };
  return made;
}

function madeTokens(d: Pick<Dna, "hues">): { light: Record<string, string>; dark: Record<string, string> } {
  const { n, a, b } = d.hues;
  const N = (l: number, k = 1) => oklchToHex({ l, c: n[1] * k, h: n[0] });
  const A = (l: number) => oklchToHex({ l, c: a[1], h: a[0] });
  const B = (l: number) => oklchToHex({ l, c: b[1], h: b[0] });
  const inkOn = (l: number) => (l > 0.68 ? N(0.18, 1.5) : "#ffffff");
  const aL = 0.55, aD = 0.72;
  return {
    light: { bg: N(0.975, 1), surface: N(0.995, 0.5), "surface-2": N(0.94, 1.6), ink: N(0.2, 1.8), muted: N(0.48, 1.6), line: N(0.88, 1.6), accent: A(aL), "accent-ink": inkOn(aL), "accent-2": B(0.62) },
    dark: { bg: N(0.17, 1.8), surface: N(0.215, 1.8), "surface-2": N(0.26, 1.8), ink: N(0.95, 0.8), muted: N(0.74, 1.2), line: N(0.32, 1.6), accent: A(aD), "accent-ink": inkOn(aD), "accent-2": B(0.76) },
  };
}

/** What the writer is told: these override any colour or lettering mentioned elsewhere. */
export function dnaBrief(d: Dna): string {
  const t = dnaTokens(d);
  const list = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `--${k}: ${v}`).join("; ");
  return `## This site's design DNA (fixed by the studio; it overrides any colour, font or shape named anywhere above)
- Colour: ${d.paletteName}.${d.paletteNote ? ` How it is used: ${d.paletteNote}` : ""} Define exactly these tokens and build every colour from them (tints with color-mix are fine; no other hues):
  light (on :root): ${list(t.light)}
  dark (on [data-theme="dark"]): ${list(t.dark)}
  The default mode is ${d.mode.toUpperCase()}: design it first and best. The accent is for the primary button, links and small marks; the second colour is used sparingly (a tag, a rule, one panel).
- Type: "${d.display}" for display (headlines, big numbers, the wordmark) and "${d.text}" for everything else. Use exactly this Google Fonts link and no other fonts:
${d.fonts}
- Shape language: ${d.shapeSpec}${d.heroSpec ? `\n- First screen layout: ${d.heroSpec}` : ""}`;
}

// ---- holding a stylesheet to its DNA -----------------------------------------------------------------

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function srgbToLin(v: number) {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function linToSrgb(v: number) {
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, s)) * 255);
}
function rgbToOklch(r: number, g: number, b: number): Oklch {
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}
function oklchToRgb({ l: L, c, h }: Oklch): [number, number, number] {
  // Reduce chroma until the colour fits in sRGB, so a tinted neutral never clips to a wrong hue.
  for (let k = c; k >= 0; k -= 0.005) {
    const a = k * Math.cos((h * Math.PI) / 180), b = k * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    if (k <= 0.005 || [R, G, B].every((v) => v >= -0.001 && v <= 1.001)) return [linToSrgb(R), linToSrgb(G), linToSrgb(B)];
  }
  return [0, 0, 0];
}
const hex2 = (n: number) => n.toString(16).padStart(2, "0");
function oklchToHex(c: Oklch): string {
  const [r, g, b] = oklchToRgb(c);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}
function hexToOklch(hex: string): Oklch | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.split("").map((x) => x + x).join("") : m[1]!;
  return rgbToOklch(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

const COLOR_RE = /(%23|#)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*([\d.]+%?))?\s*\)/g;

/** The saturated hues a stylesheet uses, most used first (what its accent and second colour were). */
export function sourceHues(css: string): number[] {
  const seen: { h: number; n: number }[] = [];
  for (const m of css.matchAll(COLOR_RE)) {
    const rgb = parseRgb(m);
    if (!rgb) continue;
    const c = rgbToOklch(...rgb);
    if (c.c < 0.05 || c.l < 0.12 || c.l > 0.97) continue;
    const near = seen.find((s) => hueGap(s.h, c.h) < 30);
    if (near) near.n++;
    else seen.push({ h: c.h, n: 1 });
  }
  return seen.sort((a, b) => b.n - a.n).map((s) => Math.round(s.h));
}

function parseRgb(m: RegExpMatchArray): [number, number, number] | null {
  if (m[2]) {
    let h = m[2];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((x) => x + x).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  if (m[3]) return [Number(m[3]), Number(m[4]), Number(m[5])].map((v) => Math.min(255, v)) as [number, number, number];
  return null;
}

/**
 * Move every colour in some CSS (or HTML with inline styles) onto the DNA's hues, keeping each
 * colour's lightness, so the design's contrast and its light/dark structure stay exactly as written.
 * Neutrals take the DNA's tint; the source's main accent hue becomes the DNA's accent and any other
 * strong hue its second colour. `src` lists the source's saturated hues (from its stylesheet), so
 * every page of a site is moved the same way.
 */
export function recolor(text: string, d: Pick<Dna, "hues">, src: number[]): string {
  const { n, a, b } = d.hues;
  const main = src[0];
  return text.replace(COLOR_RE, (whole, pre: string | undefined, hex: string | undefined, r, g, bl, alpha: string | undefined) => {
    const rgb = parseRgb([whole, pre, hex, r, g, bl, alpha] as unknown as RegExpMatchArray);
    if (!rgb) return whole;
    const c = rgbToOklch(...rgb);
    let out: Oklch;
    if (c.c < 0.045) {
      // A neutral: the DNA's tint, a little stronger in the mid tones, none at the extremes of white and black.
      const k = c.l > 0.985 || c.l < 0.04 ? 0 : 1 + 0.8 * (1 - Math.abs(c.l - 0.5) * 2);
      out = { l: c.l, c: n[1] * k, h: n[0] };
    } else {
      const isMain = main === undefined || hueGap(c.h, main) < 30;
      const [h, ch] = isMain ? a : b;
      // Keep how strong the colour was relative to a typical accent, within the DNA's own chroma.
      out = { l: c.l, c: Math.max(0.03, Math.min(ch * 1.15, ch * (c.c / 0.13))), h };
    }
    const [R, G, B] = oklchToRgb(out);
    if (hex) {
      const hasAlpha = hex.length === 8 || hex.length === 4;
      const al = hasAlpha ? (hex.length === 8 ? hex.slice(6) : hex[3]! + hex[3]!) : "";
      return `${pre}${hex2(R)}${hex2(G)}${hex2(B)}${al}`;
    }
    return alpha !== undefined ? `rgba(${R}, ${G}, ${B}, ${alpha})` : `rgb(${R}, ${G}, ${B})`;
  });
}

/** The font families named in a Google Fonts link. */
export function fontFamilies(links: string): string[] {
  return [...links.matchAll(/family=([^:&"']+)/g)].map((m) => decodeURIComponent(m[1]!.replace(/\+/g, " ")).trim()).filter((f, i, all) => f && all.indexOf(f) === i);
}

/**
 * Which of the fonts a stylesheet was written with play the display part and which the text part:
 * the family set on body (or the least display-like one) is the text face, every other the display face.
 */
export function fontRoles(css: string, srcLinks: string, d: Pick<Dna, "display" | "text">): Record<string, "display" | "text"> {
  const fams = fontFamilies(srcLinks).filter((f) => f !== d.display && f !== d.text);
  const roles: Record<string, "display" | "text"> = {};
  if (!fams.length) return roles;
  const esc = (f: string) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const score = (f: string) => {
    let n = 0;
    for (const m of css.matchAll(new RegExp(`([^{}]*)\\{([^{}]*?)\\b${esc(f)}\\b`, "g"))) {
      const sel = m[1] ?? "", decl = (m[2] ?? "").split(";").pop() ?? "";
      const where = `${sel} ${decl}`;
      if (/\b(body|html|p|input|button|textarea|select)\b|--(?:ff|font)-?(?:t|text|body|sans|base|ui)\b/i.test(where)) n -= 2;
      if (/\bh[1-3]\b|display|head|title|brand|logo|wordmark|--(?:ff|font)-?(?:d|display|head|serif|title)\b/i.test(where)) n += 2;
    }
    return n;
  };
  if (fams.length === 1) return { [fams[0]!]: "text" };
  const textFam = [...fams].sort((x, y) => score(x) - score(y))[0]!;
  for (const f of fams) roles[f] = f === textFam ? "text" : "display";
  return roles;
}

/** Put the DNA's pair in place of the fonts a stylesheet (or a page's CSS) was written with. */
export function applyFonts(css: string, roles: Record<string, "display" | "text">, d: Pick<Dna, "display" | "text">): string {
  let out = css;
  // Longest names first, so "Inter" never eats the start of "Inter Tight".
  for (const f of Object.keys(roles).sort((x, y) => y.length - x.length)) {
    const to = roles[f] === "text" ? d.text : d.display;
    out = out.replace(new RegExp(`(["']?)\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b(?![ -]?[A-Z0-9])\\1`, "g"), `"${to}"`);
  }
  return out;
}

/** Swap the fonts a stylesheet was written with for the DNA's pair (one family only: headings get the display face). */
export function refont(css: string, srcLinks: string, d: Pick<Dna, "display" | "text">): string {
  const roles = fontRoles(css, srcLinks, d);
  let out = applyFonts(css, roles, d);
  if (Object.keys(roles).length === 1) out += `\n:where(h1,h2,h3){font-family:"${d.display}",${/serif|slab|garamond|caslon|playfair|fraunces/i.test(d.display) ? "serif" : "sans-serif"}}`;
  return out;
}

/** recolor for HTML: only inside style attributes, SVG paint attributes and <style> blocks (never in text, where "#200" is a suite number). */
export function recolorHtml(html: string, d: Pick<Dna, "hues">, src: number[]): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => recolor(m, d, src))
    .replace(/\b(style|fill|stroke|stop-color|color|flood-color|data-colors)\s*=\s*(["'])([^"']*)\2/gi, (_m, a: string, q: string, v: string) => `${a}=${q}${recolor(v, d, src)}${q}`);
}
