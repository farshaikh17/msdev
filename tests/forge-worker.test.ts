import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { Intake } from "@/forge/schema";
import { costOf, CREDIT_MARKER, factsBlock, mapEmbed, parseParts, sitemapFor, tidyCss, type Kit } from "../cloudflare/forge/src/designer";
import { clearAttempts, makeSlug, pruneThrottle, recordAttempt, throttled } from "../cloudflare/forge/src/db";
import { folderId, parseFolder, serveVideo } from "../cloudflare/forge/src/drive";
import { heroMotion, matchVideo, parseKeywords, parseVideoUrls } from "../cloudflare/forge/src/hero";
import { privacyPage, termsPage } from "../cloudflare/forge/src/legal";
import { assemble, chatWidget, DEFAULT_WIDGET_ID, formScript, widgetId } from "../cloudflare/forge/src/site";

describe("Forge worker — multi-page sites", () => {
  it("splits a reply into its parts", () => {
    const p = parseParts("@@@ THEME\ndark\n@@@ CSS\n```css\n.a{color:red}\n```\n@@@ MAIN\n<main><h1>Hi</h1></main>\n");
    expect(p).toEqual({ THEME: "dark", CSS: ".a{color:red}", MAIN: "<main><h1>Hi</h1></main>" });
  });

  it("plans at least 15 pages, with service pages and both legal pages (design SOP)", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Acme Plumbing", industry: "Plumbing", services: "Drain cleaning, Water heaters" }));
    expect(pages.length).toBeGreaterThanOrEqual(15);
    expect(pages[0].path).toBe("/");
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
    const services = pages.filter((p) => p.path.startsWith("/services/"));
    expect(services.length).toBeGreaterThanOrEqual(4);
    expect(services.map((p) => p.path)).toContain("/services/drain-cleaning");
    expect(pages.filter((p) => p.kind === "legal").map((p) => p.path)).toEqual(["/privacy", "/terms"]);
  });

  it("caps service pages at six", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "Acme", services: "A1, B2, C3, D4, E5, F6, G7, H8" }));
    expect(pages.filter((p) => p.path.startsWith("/services/")).length).toBe(6);
  });

  it("uses the planned services and preview photos when the business gave none", () => {
    const i = Intake.parse({ businessName: "Sterling Wildlife", industry: "Animal control service" });
    const pages = sitemapFor(i, ["Raccoon Removal", "Bat Exclusion", "Snake Removal", "Attic Restoration"]);
    expect(pages.map((p) => p.path)).toContain("/services/raccoon-removal");
    const brief = factsBlock(i, null, "s-1a2b", { services: ["Raccoon Removal"], imagePrompts: [], cost: 0 }, [
      { url: "https://sites.example/s-1a2b/_img/v1/photo-1.jpg", description: "A technician inspecting an attic" },
    ]);
    expect(brief).toContain("Raccoon Removal (typical for this niche");
    expect(brief).toContain("Preview photos made for this site");
    expect(brief).toContain("https://sites.example/s-1a2b/_img/v1/photo-1.jpg — A technician inspecting an attic");
    expect(brief).not.toContain("Typical services for this trade"); // no generic home-services hints for an unknown niche
  });

  it("maps the real service area", () => {
    expect(mapEmbed(Intake.parse({ businessName: "Acme", city: "Kettering, OH" }))).toBe("https://maps.google.com/maps?q=Kettering%2C%20OH&z=10&output=embed");
    expect(mapEmbed(Intake.parse({ businessName: "Acme" }))).toBe("");
  });

  it("writes legal pages marked for the business's review", () => {
    const i = Intake.parse({ businessName: "Acme & Sons", phone: "(937) 604-4830" });
    for (const p of [privacyPage(i), termsPage(i)]) {
      expect(p.body).toContain("Acme &amp; Sons");
      expect(p.body).toContain("Draft for review");
      expect(p.body).toContain('href="tel:+19376044830"');
      expect(p.body.match(/<h1>/g)?.length).toBe(1);
    }
  });

  it("assembles a page with the saved theme applied before paint", () => {
    const kit: Kit = { theme: "dark", accent: "#e3a92b", fonts: "", css: ".x{}", header: "<header></header>", footer: `<footer>${CREDIT_MARKER}</footer>`, script: "1", brief: "" };
    const html = assemble(kit, { title: "A & B", description: "d", css: ".y{}", body: "<main></main>" }, "acme-1a2b");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain("<title>A &amp; B</title>");
    expect(html).toContain('"fg-theme-acme-1a2b"');
    expect(html).toContain(".x{}\n.y{}");
  });

  it("puts the linked Mianro credit with a red heart in the footer", () => {
    const kit: Kit = { theme: "light", accent: "", fonts: "", css: "", header: "", footer: `<footer>${CREDIT_MARKER}</footer>`, script: "", brief: "" };
    const html = assemble(kit, { title: "t", description: "d", css: "", body: "<main></main>" }, "acme-1a2b");
    // Only "Mianro Systems" is the link; "Made with ♥ by" is plain text, with a bigger red heart.
    expect(html).toContain('<span class="mianro-credit">Made with <span class="mianro-heart" role="img" aria-label="love">♥</span> by <a href="https://www.mianrosystems.com/" target="_blank" rel="noopener">Mianro Systems</a></span>');
    expect(html).toContain(".mianro-heart{color:#e11d48!important;font-size:1.4em");
    expect(html).toContain("header a,header button"); // header stays on one line
    expect(html).not.toContain(CREDIT_MARKER);
  });

  it("sends forms to the demo's lead inbox", () => {
    const s = formScript("/acme-1a2b/_lead");
    expect(s).toContain('fetch("/acme-1a2b/_lead"');
    expect(s).toContain("stopImmediatePropagation");
  });
});

describe("Forge worker — page CSS", () => {
  it("drops repeated rules and stops at a whole rule under the cap", () => {
    const rule = "@media (max-width:360px){.a{color:red}}";
    expect(tidyCss(`.x{a:b}\n${rule}\n${rule}\n.y{c:d}`)).toBe(`.x{a:b}\n${rule}\n.y{c:d}`);
    const long = Array.from({ length: 2000 }, (_, n) => `.r${n}{color:red}`).join("\n");
    const out = tidyCss(long, 1000);
    expect(out.length).toBeLessThanOrEqual(1000);
    expect(out.endsWith("}")).toBe(true);
  });
});

describe("Forge worker — build cost", () => {
  it("prices a call by model, including cached input", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(24);
    expect(costOf("claude-haiku-5-5", { input_tokens: 2_000, cache_read_input_tokens: 20_000, output_tokens: 10_000 })).toBeCloseTo(0.0054);
    expect(costOf("some-other-model", { output_tokens: 1000 })).toBe(0);
  });
});

describe("Forge worker — chat widget", () => {
  it("reads a widget ID, embed code, off, or falls back", () => {
    expect(widgetId("", DEFAULT_WIDGET_ID)).toBe(DEFAULT_WIDGET_ID);
    expect(widgetId("off", DEFAULT_WIDGET_ID)).toBe("");
    expect(widgetId('<script src="x" data-widget-id="abc123def456abc1"></script>', "")).toBe("abc123def456abc1");
    expect(widgetId("abc123def456abc1", "")).toBe("abc123def456abc1");
    expect(widgetId("not a widget", "")).toBe("");
  });

  it("recolours the widget to the site's accent", () => {
    const w = chatWidget(DEFAULT_WIDGET_ID, "#11968a");
    expect(w).toContain("--chat-widget-primary-color:#11968a!important");
    expect(w).toContain(`data-widget-id="${DEFAULT_WIDGET_ID}"`);
    expect(chatWidget(DEFAULT_WIDGET_ID, "red")).not.toContain("<style>");
    expect(chatWidget("", "#11968a")).toBe("");
  });
});

describe("Forge worker — hero motion and video library", () => {
  const lib = [
    { id: 1, name: "HVAC", keywords: ["hvac", "air conditioning", "ac"], urls: ["https://x.filesafe.space/a.mp4", "https://x.filesafe.space/b.mp4"] },
    { id: 2, name: "Plumbing", keywords: ["plumbing", "plumber", "drain"], urls: ["https://cdn.example/p.mp4"] },
  ];

  it("matches a business to its trade's videos, the trade field counting most", () => {
    const hvac = Intake.parse({ businessName: "Pollux Air Conditioning", industry: "HVAC" });
    expect(lib[0].urls).toContain(matchVideo(lib, hvac, "pollux-1a2b"));
    expect(matchVideo(lib, Intake.parse({ businessName: "Acme", industry: "Plumber" }), "acme-1a2b")).toBe("https://cdn.example/p.mp4");
    // Whole words only: "ac" doesn't match inside "Acme" or "Tracking".
    expect(matchVideo(lib, Intake.parse({ businessName: "Acme Tracking" }), "acme-1a2b")).toBeNull();
    // With the trade left empty, the services the site was built with still find it.
    expect(lib[0].urls).toContain(matchVideo(lib, Intake.parse({ businessName: "Pollux Air Conditioning" }), "p-1a2b", "AC Repair Commercial HVAC Services"));
    // The same demo always gets the same clip.
    expect(matchVideo(lib, hvac, "pollux-1a2b")).toBe(matchVideo(lib, hvac, "pollux-1a2b"));
  });

  it("accepts only https video links", () => {
    expect(parseVideoUrls("https://a.com/x.mp4\nhttp://a.com/y.mp4 https://a.com/page javascript:alert(1)\nhttps://assets.cdn.filesafe.space/S/media/6ada.mp4")).toEqual([
      "https://a.com/x.mp4",
      "https://assets.cdn.filesafe.space/S/media/6ada.mp4",
    ]);
    expect(parseKeywords("HVAC, Air Conditioning\n a, hvac")).toEqual(["hvac", "air conditioning"]);
  });

  it("fills the hero with a video (photo as poster), three animated photos, or one drifting photo", () => {
    const photos = ["/s/_img/v/photo-1.jpg", "/s/_img/v/photo-2.jpg", "/s/_img/v/photo-3.jpg", "/s/_img/v/photo-4.jpg"];
    const v = heroMotion("https://cdn.example/p.mp4", photos);
    expect(v).toContain('<video autoplay muted loop playsinline preload="auto" poster="/s/_img/v/photo-1.jpg">');
    expect(heroMotion(null, photos).match(/<img /g)?.length).toBe(3);
    expect(heroMotion(null, photos.slice(0, 2)).match(/<img /g)?.length).toBe(1);
    expect(heroMotion(null, [])).toBe("");
  });
});

describe("Forge worker — hero videos from Google Drive", () => {
  it("reads the video files from a public folder page", () => {
    const files = parseFolder(readFileSync("tests/fixtures/drive-folder.html", "utf8"));
    expect(files.length).toBe(20);
    expect(files).toContainEqual({ id: "1O48l3xrnqZ9jAR1gdJDPebgD0Xzbx0Eq", name: "Electrician_wiring_electrical_panel_20261019112812.mp4" });
  });

  it("takes a folder link or ID", () => {
    expect(folderId("https://drive.google.com/drive/folders/1vOIKvNmw2oj72lrHYu7QVKbbr88MQ82f?usp=sharing")).toBe("1vOIKvNmw2oj72lrHYu7QVKbbr88MQ82f");
    expect(folderId("1vOIKvNmw2oj72lrHYu7QVKbbr88MQ82f")).toBe("1vOIKvNmw2oj72lrHYu7QVKbbr88MQ82f");
    expect(folderId("https://example.com/x")).toBe("");
  });

  it("serves byte ranges (Safari needs them to play video)", async () => {
    const bytes = new Uint8Array(1000).map((_, i) => i % 256);
    const env = { VIDEOS: { get: async () => bytes.buffer } } as unknown as Parameters<typeof serveVideo>[1];
    const full = await serveVideo(new Request("https://s/_v/x.mp4"), env, "x");
    expect(full.status).toBe(200);
    expect(full.headers.get("accept-ranges")).toBe("bytes");
    const part = await serveVideo(new Request("https://s/_v/x.mp4", { headers: { range: "bytes=10-19" } }), env, "x");
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 10-19/1000");
    expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    const tail = await serveVideo(new Request("https://s/_v/x.mp4", { headers: { range: "bytes=990-" } }), env, "x");
    expect(tail.headers.get("content-range")).toBe("bytes 990-999/1000");
  });

  it("spreads demos across all the clips of the matching trade", () => {
    const clips = ["a", "b", "c"].map((c, n) => ({ id: n, name: "HVAC", keywords: ["hvac"], urls: [`https://s/_v/${c}.mp4`] }));
    const picks = new Set(["one-1a2b", "two-3c4d", "three-5e6f", "four-7a8b", "five-9c0d"].map((s) => matchVideo(clips, Intake.parse({ businessName: "Cool Co", industry: "HVAC" }), s)));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe("Forge worker — rate limiting", () => {
  /** A D1 look-alike over in-memory SQLite, running the app's real throttle migration and queries. */
  function fakeEnv() {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync("cloudflare/forge/migrations/0008_throttle.sql", "utf8"));
    const DB = {
      prepare(sql: string) {
        let args: unknown[] = [];
        const st = {
          bind: (...a: unknown[]) => ((args = a), st),
          first: async () => (db.prepare(sql).get(...(args as never[])) as never) ?? null,
          run: async () => void db.prepare(sql).run(...(args as never[])),
          all: async () => ({ results: db.prepare(sql).all(...(args as never[])) as never[] }),
        };
        return st;
      },
    };
    return { env: { DB } as unknown as Parameters<typeof throttled>[0], db };
  }

  it("blocks an address after its allowed attempts, and only that address", async () => {
    const { env } = fakeEnv();
    for (let n = 0; n < 5; n++) {
      expect(await throttled(env, "login:1.2.3.4", 5)).toBe(false);
      await recordAttempt(env, "login:1.2.3.4", 15 * 60_000);
    }
    expect(await throttled(env, "login:1.2.3.4", 5)).toBe(true);
    expect(await throttled(env, "login:5.6.7.8", 5)).toBe(false);
  });

  it("starts counting again once the window has passed", async () => {
    const { env, db } = fakeEnv();
    for (let n = 0; n < 5; n++) await recordAttempt(env, "login:1.2.3.4", 15 * 60_000);
    expect(await throttled(env, "login:1.2.3.4", 5)).toBe(true);
    db.exec("UPDATE throttle SET reset_at = reset_at - 16 * 60 * 1000"); // 16 minutes later
    expect(await throttled(env, "login:1.2.3.4", 5)).toBe(false);
    await recordAttempt(env, "login:1.2.3.4", 15 * 60_000);
    expect((db.prepare("SELECT count FROM throttle").get() as { count: number }).count).toBe(1);
  });

  it("clears the count on a correct sign-in, and prunes old counters", async () => {
    const { env, db } = fakeEnv();
    await recordAttempt(env, "login:a", 60_000);
    await recordAttempt(env, "login:b", 60_000);
    await clearAttempts(env, "login:a");
    expect(db.prepare("SELECT count(*) c FROM throttle").get()).toEqual({ c: 1 });
    db.exec("UPDATE throttle SET reset_at = 1");
    await pruneThrottle(env);
    expect(db.prepare("SELECT count(*) c FROM throttle").get()).toEqual({ c: 0 });
  });

  it("makes demo links that can't be guessed by trying", () => {
    expect(makeSlug("Pollux Air Conditioning")).toMatch(/^pollux-air-conditioning-[0-9a-f]{8}$/);
    expect(makeSlug("Pollux Air Conditioning")).not.toBe(makeSlug("Pollux Air Conditioning"));
  });
});
