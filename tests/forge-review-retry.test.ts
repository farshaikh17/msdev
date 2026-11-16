// A review that found every browser busy is tried again a few minutes later, without paying for the QA pass twice.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { build } from "../cloudflare/forge/src/build";
import { getDemo } from "../cloudflare/forge/src/db";
import { reviewSite } from "../cloudflare/forge/src/review";
import type { Env } from "../cloudflare/forge/src/env";

vi.mock("../cloudflare/forge/src/db", async (orig) => ({ ...(await orig<typeof import("../cloudflare/forge/src/db")>()), getDemo: vi.fn(), getKit: vi.fn(async () => null) }));
vi.mock("../cloudflare/forge/src/review", async (orig) => ({ ...(await orig<typeof import("../cloudflare/forge/src/review")>()), reviewSite: vi.fn() }));

const env = {} as Env;
const job = { slug: "s", version: "v1", stage: "review" as const };
beforeEach(() => {
  vi.mocked(getDemo).mockResolvedValue({ slug: "s", liveVersion: "v1" } as never);
});

describe("the review when no browser is free", () => {
  it("waits and tries again, up to four times", async () => {
    vi.mocked(reviewSite).mockResolvedValue({ at: "now", skipped: "error: Unable to create new browser: code: 503: message: No browser available" });
    expect(await build(env, job, 1)).toBe(120);
    expect(await build(env, job, 3)).toBe(360);
    expect(await build(env, job, 4)).toBe("done");
  });
  it("is done when it ran, or was skipped for a reason waiting won't fix", async () => {
    vi.mocked(reviewSite).mockResolvedValue({ at: "now", score: 8 } as never);
    expect(await build(env, job, 1)).toBe("done");
    vi.mocked(reviewSite).mockResolvedValue({ at: "now", skipped: "browser budget for this month is used up" });
    expect(await build(env, job, 1)).toBe("done");
  });
});
