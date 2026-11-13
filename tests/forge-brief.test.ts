import { describe, expect, it } from "vitest";
import { conceptTask, factsOf, judgeTask, lensesFor, parseConcept, tierOf, type BriefInput } from "../cloudflare/forge/src/brief";

const bare: BriefInput = { slug: "t-boys-04300bec", businessName: "T Boys", trade: "Tree Service", town: "Eunice, LA" };
const seen: BriefInput = { slug: "joes-plumbing-1", businessName: "Joe's Plumbing", trade: "Plumber", town: "Opelousas, LA", saw: "One-man shop; Joe answers the phone himself and the reviews say he is fast and honest." };

describe("the brief", () => {
  it("knows how much it knows", () => {
    expect(tierOf(bare)).toBe("none");
    expect(tierOf(seen)).toBe("some");
    expect(tierOf({ ...seen, website: "x".repeat(500) })).toBe("rich");
  });

  it("deals different lenses, fewer and safer when it knows little, and never the people lens without facts about people", () => {
    const none = lensesFor(bare);
    expect(none).toHaveLength(2);
    expect(new Set(none.map((l) => l.id)).size).toBe(2);
    for (const l of none) expect(["place", "name", "moment", "craft", "object"]).toContain(l.id);
    // The same business always gets the same lenses.
    expect(lensesFor(bare).map((l) => l.id)).toEqual(none.map((l) => l.id));
    const some = lensesFor(seen);
    expect(some).toHaveLength(3);
    expect(new Set(some.map((l) => l.id)).size).toBe(3);
    // "Joe answers the phone himself" is a fact about a person, so the people lens may be dealt; a bare listing never gets it.
    for (let n = 0; n < 40; n++) expect(lensesFor({ ...bare, slug: `s-${n}` }).some((l) => l.id === "people")).toBe(false);
    // Across many plumbers the lenses spread out, and recent ones are passed over when there are others.
    const used = new Set<string>();
    for (let n = 0; n < 30; n++) for (const l of lensesFor({ ...seen, slug: `p-${n}` })) used.add(l.id);
    expect(used.size).toBeGreaterThanOrEqual(6);
    const avoid = lensesFor(seen).slice(0, 2).map((l) => l.id);
    for (const l of lensesFor(seen, avoid)) expect(avoid).not.toContain(l.id);
  });

  it("shows only the facts given, and asks for the true thing with its evidence", () => {
    expect(factsOf(bare)).not.toMatch(/rep saw|website/i);
    expect(factsOf(seen)).toContain("What our rep saw: One-man shop");
    const t = conceptTask(seen, lensesFor(seen)[0]!, ["A neighbour's site built on the river"]);
    expect(t).toContain("@@@ TRUTH");
    expect(t).toContain("@@@ EVIDENCE");
    expect(t).toContain("Never invent anything specific");
    expect(t).toContain("Already made nearby");
    expect(t).toContain("editorial:");
    expect(t).toContain("float:");
  });

  it("keeps a concept only when its required parts came back", () => {
    const ok = parseConcept("@@@ TRUTH\nIt is in Eunice.\n@@@ EVIDENCE\n\"Town: Eunice, LA\"\n@@@ IDEA\nThe prairie at dawn.\n@@@ REFUSES\nNo stock smiles.\n@@@ OBJECT\nnone", "place");
    expect(ok?.truth).toBe("It is in Eunice.");
    expect(ok?.object).toBe("none");
    expect(ok?.lens).toBe("place");
    expect(parseConcept("@@@ TRUTH\nx\n@@@ IDEA\ny", "place")).toBeNull();
  });

  it("shows the judge the concepts without their lenses, in the given order", () => {
    const c = (truth: string, lens: string) => ({ lens, truth, evidence: "e", idea: `idea ${truth}`, refuses: "r" });
    const t = judgeTask(seen, [c("one", "place"), c("two", "craft")], [1, 0]);
    expect(t.indexOf("idea two")).toBeLessThan(t.indexOf("idea one"));
    expect(t).not.toMatch(/place|craft/);
    expect(t).toContain("@@@ INVENTED");
  });
});

import { chooseDesign, firstScreenOf, ideaBlock, lookOf, ownScreen, wants, type Brief, type Idea } from "../cloudflare/forge/src/brief";
import { systemFor, studioHome, sitemapFor } from "../cloudflare/forge/src/designer";
import { HERO_IDS, OBJECT_HEROES, pickHero, studioExtras } from "../cloudflare/forge/src/heroes";
import { CONCEPT_IDS } from "../cloudflare/forge/src/concepts";
import { Intake } from "@/forge/schema";

const idea = (o: Partial<Idea> = {}): Idea => ({
  lens: "place",
  truth: "It is the museum of the parish where a river was cut off.",
  evidence: '"Pointe Coupee Museum"',
  idea: "The page bends like the oxbow of False River.",
  refuses: "No dusty sepia.",
  headline: "The river moved. We kept what it left.",
  voice: "quiet, local, exact",
  arc: "1. The river\n2. What it left\n3. Visit",
  palette: "river green and paper",
  type: "a calm serif",
  look: "editorial - quiet",
  firstScreen: "own: A softly toned photograph of the river bend fills the screen. The headline sits low on the left. A thin line traces the bend as the page scrolls. - because the river is the story",
  object: "none",
  moment: "none",
  why: "Only this museum",
  ...o,
});
const brief = (concepts: Partial<Idea>[], chosen = 0): Brief => ({ tier: "none", concepts: concepts.map((c) => idea(c)), chosen, why: "", invented: [], cost: 0 });

describe("the brief leads the design", () => {
  it("reads a concept's choices", () => {
    expect(wants("none")).toBe(false);
    expect(wants("None - nothing to follow")).toBe(false);
    expect(wants("The waffle: cut out, it follows the scroll")).toBe(true);
    expect(lookOf({ look: "americana: sign-painter craft" }, CONCEPT_IDS)).toBe("americana");
    expect(lookOf({ look: "none, the clock matters more" }, CONCEPT_IDS)).toBeUndefined();
    expect(firstScreenOf({ firstScreen: "own: A huge phone number" }, HERO_IDS)).toBe("own");
    expect(firstScreenOf({ firstScreen: "breakout - the subject" }, HERO_IDS)).toBe("breakout");
    expect(ownScreen(idea())).toMatch(/^A softly toned photograph.*as the page scrolls\.$/);
  });

  it("takes the idea's look and first screen, unless a neighbour just used them or the form asked for others", () => {
    const o = { recentLooks: [] as string[], recentHeroes: [] as string[], lookIds: CONCEPT_IDS, heroIds: HERO_IDS, clips: 0 };
    expect(chooseDesign(brief([{}]), o)).toEqual({ look: "editorial", hero: "own" });
    // A neighbour used the look: the next concept's look is taken.
    expect(chooseDesign(brief([{}, { look: "organic - soft" }]), { ...o, recentLooks: ["editorial"] }).look).toBe("organic");
    // Every concept's look was just used: none (the usual pick takes over).
    expect(chooseDesign(brief([{}]), { ...o, recentLooks: ["editorial"] }).look).toBeUndefined();
    // Its own first screen at most one site in three.
    expect(chooseDesign(brief([{}]), { ...o, recentHeroes: ["dive", "own"] }).hero).toBeUndefined();
    expect(chooseDesign(brief([{}]), { ...o, recentHeroes: ["dive", "spin", "own"] }).hero).toBe("own");
    // A first screen built around an object only when the idea has one; the switcher only with clips.
    expect(chooseDesign(brief([{ firstScreen: "orbit - circles" }]), o).hero).toBeUndefined();
    expect(chooseDesign(brief([{ firstScreen: "orbit - circles", object: "a glossy wheel" }]), o).hero).toBe("orbit");
    expect(chooseDesign(brief([{ firstScreen: "switcher - scenes" }]), o).hero).toBeUndefined();
    // What the form asked for wins.
    expect(chooseDesign(brief([{}]), { ...o, askedLook: "kinetic", askedHero: "dive", recentLooks: ["kinetic"] })).toEqual({ look: "kinetic", hero: "dive" });
    // The usual pick can be told to leave out the heroes built around an object.
    for (let n = 0; n < 30; n++) expect(OBJECT_HEROES).not.toContain(pickHero({}, `s-${n}`, [], 0, OBJECT_HEROES).id);
  });

  it("leaves Standard and Studio-without-a-brief exactly as they were, and puts the idea first when there is one", () => {
    const std = systemFor("standard");
    expect(std).toContain("Good pairings: Fraunces + Inter");
    expect(systemFor("standard", "editorial", "dive", idea())).toBe(std);
    const old = systemFor("studio", "editorial", "dive");
    expect(old).toContain("Good pairings: Fraunces + Inter");
    expect(old).toContain("electric blue or yellow");
    expect(old).toContain("The scroll floor (every Studio home page");
    expect(old).toContain("Art direction for this site (fixed: hold every page to it)");
    const neu = systemFor("studio", "editorial", "dive", idea());
    for (const gone of ["Good pairings", "electric blue or yellow", "Tinted neutrals toward the brand hue", "1200px max content width", "Write like the owner talking to a neighbour", "The scroll floor (every Studio home page", "fixed: hold every page to it", "matched picture behind it"])
      expect(neu).not.toContain(gone);
    expect(neu).toContain("This site's idea (decides everything below)");
    expect(neu).toContain("The page bends like the oxbow of False River.");
    expect(neu).toContain("Materials for this idea");
    expect(neu).toContain("at least one of them a held piece");
    expect(neu.indexOf("This site's idea")).toBeLessThan(neu.indexOf("Materials for this idea"));
    // The spotlight's own paragraph only for the spotlight.
    expect(systemFor("studio", "editorial", "spotlight", idea())).toContain("matched picture behind it");
    expect(ideaBlock(idea({ voice: "none" }))).not.toContain("Voice:");
  });

  it("builds the home page from the idea's story, with the look's scenes as layouts to draw on", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Pointe Coupee Museum", industry: "Museum" }), ["Exhibits", "Tours"]);
    const home = studioHome(pages, "editorial", undefined, "own", "pc-1", idea());
    expect(home).toContain("in the order its idea gives");
    expect(home).toContain("THIS SITE'S OWN FIRST SCREEN");
    expect(home).toContain("A softly toned photograph of the river bend");
    expect(home).toContain("Layouts you may use");
    expect(home).toContain("What the home page must carry");
    // No object and no moment asked for: no perches and no brand moment.
    expect(home).not.toContain("data-perch");
    expect(home).not.toContain("BRAND MOMENT");
    // Without an idea the home page is as before.
    expect(studioHome(pages, "editorial", undefined, "dive", "pc-1")).toContain("Compose the home page as the sequence of scenes below");
  });

  it("asks for the flying object and the brand moment only when the idea does", () => {
    expect(studioExtras("dive", "a-1", { object: "none", moment: "none" })).toBe("");
    expect(studioExtras("dive", "a-1", { object: "a waffle", moment: "none" })).toContain("data-perch");
    const m = studioExtras("dive", "a-1", { object: "none", moment: "The grid fills with the town's mornings" });
    expect(m).toContain("data-mask-zoom");
    expect(m).not.toContain("data-perch");
    expect(m).toContain("The grid fills with the town's mornings");
    // Without an idea, as before: the flight and a brand moment.
    expect(studioExtras("dive", "a-1")).toContain("data-perch");
  });
});
