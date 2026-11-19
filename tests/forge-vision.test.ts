import { describe, expect, it } from "vitest";
import { lookAt, photoFits, VISION_MODEL } from "../cloudflare/forge/src/vision";
import type { Env } from "../cloudflare/forge/src/env";

const envSaying = (answer: string | Error) => {
  const calls: { model: string; input: { messages: { content: unknown[] }[] } }[] = [];
  const env = { AI: { run: async (model: string, input: never) => { calls.push({ model, input }); if (answer instanceof Error) throw answer; return { choices: [{ message: { content: answer } }] }; } } } as unknown as Env;
  return { env, calls };
};

describe("looking at photos with Workers AI", () => {
  it("reads FIT and OFF, sends the picture as a data URI to the vision model", async () => {
    const off = envSaying("OFF - Two men shaking hands in a gym.");
    expect(await photoFits(off.env, new Uint8Array([1, 2, 3]), "commercial flooring")).toEqual({ fits: false, saw: "Two men shaking hands in a gym." });
    expect(off.calls[0]!.model).toBe(VISION_MODEL);
    expect(JSON.stringify(off.calls[0]!.input.messages[0]!.content)).toContain("data:image/jpeg;base64,AQID");
    expect((await photoFits(envSaying("FIT - Installer laying carpet tiles.").env, new Uint8Array([1]), "flooring"))?.fits).toBe(true);
  });

  it("treats a failure or an unclear answer as 'couldn't look', never as a verdict", async () => {
    expect(await photoFits(envSaying(new Error("busy")).env, new Uint8Array([1]), "flooring")).toBeNull();
    expect(await photoFits(envSaying("Maybe?").env, new Uint8Array([1]), "flooring")).toBeNull();
    expect(await lookAt({} as Env, [new Uint8Array([1])], "q")).toBeNull();
  });
});

import { matchClips } from "../cloudflare/forge/src/hero";
import { Intake } from "@/forge/schema";

describe("hero clips follow what a clip is about", () => {
  const kitchen = { keywords: ["kitchen remodeling", "kitchen renovation", "cabinets", "countertops", "backsplash", "flooring"], urls: ["kitchen.mp4"] };
  const floors = { keywords: ["flooring", "floor installation", "carpet"], urls: ["floors.mp4"] };
  it("a word at the end of a kitchen clip's list doesn't put a kitchen video on a flooring site", () => {
    const i = Intake.parse({ businessName: "Master Floor Pro", industry: "Commercial Flooring Contractor" });
    expect(matchClips([kitchen] as never, i)).toEqual([]);
    expect(matchClips([kitchen, floors] as never, i)).toEqual(["floors.mp4"]);
    expect(matchClips([kitchen] as never, Intake.parse({ businessName: "Joe's Kitchens", industry: "Kitchen Remodeling" }))).toEqual(["kitchen.mp4"]);
  });
});
