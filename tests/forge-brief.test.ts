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
