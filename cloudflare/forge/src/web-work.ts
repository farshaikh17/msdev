/**
 * Our work: real websites, shown on the public Forge site. "instant" ones were designed by the
 * Forge app from a business name; "custom" ones are Mianro's hand-tuned builds from the
 * forge.mianrosystems.com portfolio. Screenshots live in /public/work (served as static files).
 */

export interface Work {
  id: string;
  name: string;
  trade: string;
  place: string;
  kind: "instant" | "custom";
  url: string;
  /** One paragraph on what the site does. */
  blurb: string;
  highlights: string[];
  /** The look, in a sentence. */
  look: string;
  /** Matches a trade page (/trades/<slug>) for "get one like this". */
  tradeSlug: string;
}

const SITES = "https://forge-sites.dev1-024.workers.dev/";

export const WORK: Work[] = [
  {
    id: "pollux",
    name: "Pollux Air Conditioning",
    trade: "HVAC",
    place: "Miami-Dade, FL",
    kind: "instant",
    url: `${SITES}pollux-air-conditioning-b215`,
    blurb: "A 24/7 air-conditioning company in South Florida. The site leads with the emergency, gives every repair its own page and puts the quote form and phone number on every screen.",
    highlights: ["Designed from the business name in one build", "Hero video of a technician at work", "A page for every service, plus areas and reviews", "Quote form and chat widget in the brand colour", "Light and dark mode"],
    look: "Deep teal and warm white, with a confident sans headline and an italic accent line.",
    tradeSlug: "hvac",
  },
  {
    id: "sterling",
    name: "Sterling Wildlife",
    trade: "Animal control",
    place: "Orlando, FL",
    kind: "instant",
    url: `${SITES}sterling-wildlife-animal-control-trappin-383d`,
    blurb: "Wildlife removal with a calm, trustworthy voice: an inspection-first process, problem-by-problem pages and a clear path to a quote.",
    highlights: ["Designed from the business name in one build", "Plain-spoken copy for worried homeowners", "Problem pages: attics, walls, decks and more", "Quote form, map and opening hours", "Light and dark mode"],
    look: "Forest green with an editorial serif, line illustrations and soft paper tones.",
    tradeSlug: "pest-control",
  },
  {
    id: "brightpath",
    name: "Bright Path Lighting & Electric",
    trade: "Electrician",
    place: "Kettering, OH",
    kind: "instant",
    url: `${SITES}bright-path-lighting-and-electric-7c56`,
    blurb: "An owner-operated electrician, built around the owner himself: a personal tone, a free-estimate form up front and pages for the jobs people actually call about.",
    highlights: ["Designed from the business name in one build", "Built around the owner's name and story", "Free-estimate form in the first screen", "Service pages for panels, EV chargers and lighting", "Light and dark mode"],
    look: "Charcoal and electric gold, with a bold sans and a handwritten-feel italic.",
    tradeSlug: "electricians",
  },
  {
    id: "proair",
    name: "ProAir Residential HVAC",
    trade: "HVAC",
    place: "Heating, cooling & heat pumps",
    kind: "custom",
    url: "https://preview-1787248153170794959.vibepreview.com/",
    blurb: "A home-comfort platform with an interactive thermostat dial, an instant system and rebate calculator, a symptom checker and live technician dispatch tracking.",
    highlights: ["Interactive comfort-dial thermostat", "Instant system and rebate calculator", "Guided symptom checker", "Old-versus-new system comparison slider"],
    look: "Deep navy radial gradients, emerald and cyan glows, glass-card telemetry.",
    tradeSlug: "hvac",
  },
  {
    id: "pureclean",
    name: "PureClean Carpet Care",
    trade: "Carpet cleaning",
    place: "Riverside, CA",
    kind: "custom",
    url: "https://preview-1787247968336466646.vibepreview.com/",
    blurb: "A high-energy steam-cleaning site with live truck-mount gauges, a drag-to-clean pet-stain demo and instant per-room pricing.",
    highlights: ["Live steam temperature and pressure gauges", "Drag-to-clean pet-stain demo", "Per-room instant quote and booking", "Service bento grid with pet-safe badges"],
    look: "Earthy dark palette with electric teal and gold, glowing glass metrics.",
    tradeSlug: "cleaning",
  },
  {
    id: "matts",
    name: "Matt's Plumbing Service",
    trade: "Plumbing",
    place: "Dubois, WY",
    kind: "custom",
    url: "https://preview-1787247304920325981.vibepreview.com/",
    blurb: "A trusted local plumber's site with one-tap emergency dispatch, before-and-after case studies, water-heater upgrade pages and a service-area map.",
    highlights: ["24/7 emergency dispatch buttons", "Before-and-after image reveals", "Google Maps service-area hub", "Water heater and repiping estimate funnels"],
    look: "Dark slate with warm amber, high-contrast type and clean cards.",
    tradeSlug: "plumbers",
  },
  {
    id: "arc",
    name: "ARC Design Landscape",
    trade: "Landscaping",
    place: "San Diego County, CA",
    kind: "custom",
    url: "https://preview-1787248516354021774.vibepreview.com/",
    blurb: "An editorial design-and-build site for a landscape contractor: 3D renderings, before-during-after timelines and an outdoor-room planner.",
    highlights: ["Three-phase transformation scroller", "Six-zone outdoor room planner", "Video hero at dusk", "Material picker and 3D walkthrough booking"],
    look: "Warm paper and ink, terracotta accents and high-end editorial type.",
    tradeSlug: "landscapers",
  },
  {
    id: "voltedge",
    name: "VoltEdge Electrical",
    trade: "Electrician",
    place: "New York tri-state",
    kind: "custom",
    url: "https://preview-1787249503679215076.vibepreview.com/",
    blurb: "A master electrician's site with a blueprint-to-power-on timeline, tilting service cards, EV charger pages and a 24/7 quick-quote funnel.",
    highlights: ["3D tilt cards for eight service lines", "Four-step blueprint-to-power-on timeline", "Accreditation ticker", "Interactive coverage map"],
    look: "Electric cyan on obsidian, particle effects and bold type.",
    tradeSlug: "electricians",
  },
  {
    id: "homeshield",
    name: "HomeShield Pest Protection",
    trade: "Pest control",
    place: "Austin, TX",
    kind: "custom",
    url: "https://preview-1787249722881649180.vibepreview.com/",
    blurb: "A quarterly pest-protection site with a 3D home-perimeter visual, instant pricing, a pest identifier and photo inspection reports.",
    highlights: ["3D home perimeter barrier visual", "Seven-stage entry-point walkthrough", "Instant price and booking engine", "Pest identification with photo upload"],
    look: "Night-dark with glowing emerald shields and warm amber.",
    tradeSlug: "pest-control",
  },
];

export const workById = (id: string) => WORK.find((w) => w.id === id);
export const img = (id: string, size: "" | "-sm" | "-long" | "-phone" = "") => `/work/${id}${size}.webp`;
export const KIND_LABEL = { instant: "Built by Forge AI", custom: "Custom build" } as const;
