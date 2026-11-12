import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { Intake } from "@/forge/schema";
import { profileFor } from "../cloudflare/forge/src/profiles";
import { reverseGeocode } from "../cloudflare/forge/src/places";
import { CONCEPTS, drawFor, pickConcept } from "../cloudflare/forge/src/concepts";
import { HEROES, pickHero } from "../cloudflare/forge/src/heroes";
import { costOf, CREDIT_MARKER, factsBlock, mapEmbed, parseParts, profileNote, sitemapFor, studioHome, systemFor, tidyCss, type Kit } from "../cloudflare/forge/src/designer";
import { clearAttempts, makeSlug, pruneThrottle, recordAttempt, throttled } from "../cloudflare/forge/src/db";
import { formatPhone, mergeIntake, parseMapsUrl, pickBusiness } from "../cloudflare/forge/src/places";
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

  it("gives a bar and grill a restaurant's pages, not a contractor's", () => {
    const i = Intake.parse({ businessName: "Winnett Bar & Grill" });
    const pages = sitemapFor(i, ["Burgers & Sandwiches", "Steaks", "Starters", "Drinks"]);
    const paths = pages.map((p) => p.path);
    expect(paths).toEqual(expect.arrayContaining(["/", "/menu", "/menu/steaks", "/events", "/gallery", "/visit", "/reserve", "/privacy", "/terms"]));
    expect(paths.some((x) => /^\/(services|quote|areas|process)/.test(x))).toBe(false);
    expect(pages.length).toBeGreaterThanOrEqual(15);
    expect(pages.find((p) => p.path === "/reserve")!.name).toBe("Reserve a Table");
    expect(pages[0]!.brief).not.toMatch(/\{items|\{stepsPath|\{visitPath|\{itemsPath/);
    expect(pages[0]!.brief).toContain("/menu/steaks");
    expect(profileNote(i)).toContain("Reserve a Table");
    // With nothing planned, it falls back to menu sections, never to home services.
    expect(sitemapFor(i).filter((p) => p.role === "item").map((p) => p.name)).toContain("Steaks");
  });

  it("picks the kind of business from the trade first, then the name", () => {
    const kind = (businessName: string, industry = "") => profileFor({ businessName, industry }).id;
    expect(kind("Acme Plumbing")).toBe("contractor");
    expect(kind("Smith & Sons")).toBe("contractor");
    expect(kind("Blue Lagoon Spa Repair")).toBe("contractor");
    expect(kind("Olvin's Landscaping Co.")).toBe("contractor");
    expect(kind("Bright Smile", "Family Dentist")).toBe("health");
    expect(kind("Luxe", "Hair Salon")).toBe("beauty");
    expect(kind("Iron Works", "Gym")).toBe("fitness");
    expect(kind("Harper & Lane", "Law Firm")).toBe("professional");
    expect(kind("Petal & Stem Florist")).toBe("retail");
    expect(kind("The Grill", "Roofing")).toBe("contractor");
    expect(kind("B&B Motel", "Motel")).toBe("lodging");
    // Places people visit get their own wording (no quotes or service areas), but a more specific kind still wins.
    expect(kind("Pointe Coupee Museum", "Museum")).toBe("attraction");
    expect(kind("Riverside Winery", "")).toBe("attraction");
    expect(kind("Gallery Salon", "")).toBe("beauty");
    expect(kind("Temple Family Dental", "")).toBe("health");
    expect(kind("Memorial Hospital", "Hospital")).toBe("health");
    // A thrift shop is a shop, but it needs a Donate page, not custom orders.
    const thrift = sitemapFor(Intake.parse({ businessName: "Main Street Thrift Shop", industry: "Thrift Store" })).map((p) => p.path);
    expect(thrift).toContain("/donate");
    expect(thrift).not.toContain("/custom-orders");
    expect(sitemapFor(Intake.parse({ businessName: "B&B Motel", industry: "Motel" })).map((p) => p.path)).toEqual(expect.arrayContaining(["/rooms", "/rates", "/your-stay", "/location"]));
    expect(profileNote(Intake.parse({ businessName: "Acme Plumbing" }))).toBe("");
  });

  it("gives each Studio look its own first screen, its own order of scenes and its own bans", () => {
    const pages = sitemapFor(Intake.parse({ businessName: "El Rodeo", industry: "Mexican Restaurant" }), ["Tacos", "Seafood Platters", "Margaritas", "Appetizers"]);
    const homes = CONCEPTS.map((c) => studioHome(pages, c.id));
    expect(new Set(homes).size).toBe(CONCEPTS.length);
    for (const [n, c] of CONCEPTS.entries()) {
      expect(c.scenes.length).toBeGreaterThanOrEqual(7);
      expect(homes[n]).toContain(c.hero);
      expect(homes[n]).toContain(c.never);
      // The business's own pages and main action are in every plan.
      expect(homes[n]).toContain("/menu/tacos");
      expect(homes[n]).toContain('"Reserve a Table" → /reserve');
      expect(systemFor("studio", c.id)).toContain(c.hero);
    }
    // No two looks open with the same first screen or share a second scene.
    expect(new Set(CONCEPTS.map((c) => c.hero)).size).toBe(CONCEPTS.length);
    expect(new Set(CONCEPTS.map((c) => c.scenes[0])).size).toBe(CONCEPTS.length);
    // Only the looks that ask for a pinned horizontal strip or stacked cards get them.
    const uses = (re: RegExp) => CONCEPTS.filter((c) => re.test(c.scenes.join(" "))).map((c) => c.id);
    expect(uses(/data-horizontal/)).toEqual(["cinematic"]);
    expect(uses(/data-stack/)).toEqual(["kinetic"]);
    // The old one-recipe-for-all wording is gone.
    expect(systemFor("studio", "luxe")).not.toContain("use most of these on the home page");
  });

  it("deals each site its own structure within a look, and avoids what the account built recently", () => {
    const look = CONCEPTS.find((c) => c.id === "cinematic")!;
    const last = look.scenes.length - 1;
    const a = drawFor(look, "el-rodeo-1a2b");
    // The opening and closing scenes keep their places; every scene is used exactly once.
    expect(a.order[0]).toBe(0);
    expect(a.order.at(-1)).toBe(last);
    expect([...a.order].sort((x, y) => x - y)).toEqual(look.scenes.map((_, i) => i));
    expect(a.order).toContain(a.feature);
    // The same site always gets the same deal; another site in the same look gets a different one once the first is on record.
    expect(drawFor(look, "el-rodeo-1a2b").print).toBe(a.print);
    const seen = [a.print];
    for (const slug of ["la-playa-9f8e", "casa-luna-77aa", "mar-y-sol-31c0", "el-faro-5d5d"]) {
      const d = drawFor(look, slug, seen);
      expect(seen.map((p) => p.split(":")[1])).not.toContain(d.print.split(":")[1]);
      seen.push(d.print);
    }
    // The deal reaches the page plan: the dealt order, the biggest moment and the mirroring are all in it.
    const pages = sitemapFor(Intake.parse({ businessName: "El Rodeo", industry: "Mexican Restaurant" }), ["Tacos", "Seafood Platters", "Margaritas", "Appetizers"]);
    const plan = studioHome(pages, "cinematic", a);
    const at = a.order.map((i) => plan.indexOf(look.scenes[i]!));
    expect(at.every((x) => x > 0)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
    expect(plan).toContain("biggest moment");
    // With a choice of looks for the trade, the two most recent are passed over.
    const first = pickConcept({ industry: "Restaurant" }, "x-1").id;
    expect(pickConcept({ industry: "Restaurant" }, "x-1", [first]).id).not.toBe(first);
    expect(pickConcept({ industry: "Restaurant", concept: "luxe" }, "x-1", ["luxe"]).id).toBe("luxe");
  });

  it("finds the town from a map position, and the street only when the business itself is named there", async () => {
    const reply = (name: string) => new Response(JSON.stringify({ name, address: { house_number: "320", road: "Chocktoot Street", village: "Chiloquin", state: "Oregon", "ISO3166-2-lvl4": "US-OR", postcode: "97624" } }));
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply("El Rodeo Mexican Seafood")).mockResolvedValueOnce(reply(""));
    expect(await reverseGeocode("42.5779779,-121.867045", "El Rodeo Mexican Seafood")).toEqual({ city: "Chiloquin, OR", address: "320 Chocktoot Street, Chiloquin, OR 97624" });
    expect(await reverseGeocode("42.5779779,-121.867045", "Somebody Else")).toEqual({ city: "Chiloquin, OR", address: "" });
    expect(String(spy.mock.calls[0]![0])).toContain("nominatim.openstreetmap.org/reverse");
    expect(await reverseGeocode("not a position", "x")).toBeNull();
    spy.mockRestore();
  });

  it("deals Studio sites a signature hero: video scenes when the trade has clips, otherwise one the account hasn't used lately", () => {
    // Every hero has a precise spec, its own mechanic and a check line.
    expect(HEROES.length).toBe(10);
    expect(new Set(HEROES.map((x) => x.media)).size).toBeGreaterThanOrEqual(4);
    for (const x of HEROES) {
      expect(x.spec.length).toBeGreaterThan(600);
      // Every hero but the slider (whose slides carry their own pictures) and the flying object (its own layer) has the picture layer our system fills.
      if (!["slides", "float", "orbit"].includes(x.id)) expect(x.spec).toContain('class="hero-motion"');
      expect(x.check.length).toBeGreaterThan(40);
    }
    // Asked for: always that one.
    expect(pickHero({ hero: "dive" }, "a-1", ["dive"], 0).id).toBe("dive");
    // Clips for the trade: the switcher, unless the last site already had it.
    expect(pickHero({}, "a-1", [], 3).id).toBe("switcher");
    expect(pickHero({}, "a-1", ["switcher"], 3).id).not.toBe("switcher");
    // No clips: never the switcher, never the last two used, and sites spread across the rest.
    const seen = new Set<string>();
    for (const slug of ["a-1", "b-2", "c-3", "d-4", "e-5", "f-6", "g-7", "h-8", "i-9", "j-10", "k-11", "l-12"]) {
      const x = pickHero({}, slug, ["spotlight", "dive"], 0);
      expect(["slides", "hangtag", "float", "front", "spin", "breakout", "orbit"]).toContain(x.id);
      seen.add(x.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
    // The home page plan carries the spec, and the art direction knows the hero outranks its own first screen.
    const pages = sitemapFor(Intake.parse({ businessName: "DMAX Wheels", industry: "Wheel and tire shop" }), ["Custom Wheels", "Tire Sales", "Alignment", "Balancing"]);
    const plan = studioHome(pages, "kinetic", undefined, "slides");
    expect(plan).toContain("COLOUR-FIELD SLIDER");
    expect(plan).toContain("gives way to this signature hero");
    expect(systemFor("studio", "kinetic", "slides")).toContain('signature hero "Colour-field slider"');
    expect(systemFor("studio", "kinetic")).not.toContain("signature hero \"");
  });

  it("fills the picture layer for each kind of signature hero", () => {
    const p = ["/s/_img/v/photo-1.jpg", "/s/_img/v/photo-2.jpg", "/s/_img/v/photo-3.jpg"];
    // Switcher: library clips first, then photos, labelled, at most four.
    const sw = heroMotion(null, p, "", { media: "switch", clips: ["https://v/a.mp4", "https://v/b.mp4"], labels: ["Tires", "Wheels", "Alignment", "Brakes"] });
    expect((sw.match(/data-switch-item/g) ?? []).length).toBe(4);
    expect(sw.match(/<(video|img) data-switch-item/g)).toEqual(["<video data-switch-item", "<video data-switch-item", "<img data-switch-item", "<img data-switch-item"]);
    expect(sw).toContain('data-label="Alignment"');
    expect((sw.match(/autoplay/g) ?? []).length).toBe(1);
    // Dive: the first scene and a second one to land in.
    const dv = heroMotion(null, p.slice(0, 2), "", { media: "dive" });
    expect(dv).toContain("photo-1.jpg");
    expect(dv).toMatch(/<img data-dive-to src="[^"]*photo-2\.jpg"/);
    // Spotlight: the pair; a plain hero: one picture.
    expect(heroMotion(null, p.slice(0, 1), "/s/_img/v/reveal-1.jpg")).toContain("data-spotlight-reveal");
    expect(heroMotion(null, p.slice(0, 1))).not.toContain("data-spotlight-reveal");
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
    expect(mapEmbed(Intake.parse({ businessName: "Acme", city: "Kettering, OH" }))).toBe("https://www.google.com/maps?q=Kettering%2C%20OH&z=12&output=embed");
    // A street address or coordinates give a closer map than the city alone.
    expect(mapEmbed(Intake.parse({ businessName: "Acme", city: "Kettering, OH", address: "12 Main St, Kettering, OH" }))).toContain("12%20Main%20St");
    expect(mapEmbed(Intake.parse({ businessName: "Acme", city: "Kettering, OH", mapQuery: "39.68,-84.17" }))).toBe("https://www.google.com/maps?q=39.68%2C-84.17&z=15&output=embed");
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
    db.exec("CREATE TABLE tokens (expires_at INTEGER)"); // the hourly cleanup also clears old one-time links
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

describe("Forge worker — details from a website and Google link", () => {
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Pollux Air" },
      {
        "@type": ["HVACBusiness", "LocalBusiness"],
        name: "Pollux Air Conditioning",
        telephone: "+1-305-956-6855",
        address: { "@type": "PostalAddress", streetAddress: "100 Biscayne Blvd", addressLocality: "Miami", addressRegion: "FL", postalCode: "33132" },
        geo: { latitude: "25.7743", longitude: -80.1881 },
        openingHoursSpecification: [{ dayOfWeek: ["https://schema.org/Monday", "Tuesday"], opens: "08:00", closes: "17:00" }],
      },
    ],
  });

  it("reads the business's own details from its schema.org data", () => {
    const b = pickBusiness([ld], []);
    expect(b).toMatchObject({ name: "Pollux Air Conditioning", phone: "+1-305-956-6855", street: "100 Biscayne Blvd", city: "Miami", region: "FL", postal: "33132", lat: 25.7743, lng: -80.1881 });
    expect(b?.hours).toBe("Mon, Tue 08:00–17:00");
  });

  it("falls back to a tel: link, ignores broken data, and returns nothing when there's nothing", () => {
    expect(pickBusiness(["{not json"], ["tel:+13059566855"])?.phone).toBe("+13059566855");
    expect(pickBusiness([], [])).toBeUndefined();
    expect(pickBusiness([JSON.stringify({ "@type": "WebSite", name: "x" })], [])).toBeUndefined();
  });

  it("fills only what was left blank, never what was typed", () => {
    const typed = Intake.parse({ businessName: "Pollux", phone: "(786) 000-1111" });
    const { intake, filled } = mergeIntake(typed, pickBusiness([ld], []));
    expect(intake.phone).toBe("(786) 000-1111");
    expect(intake.city).toBe("Miami, FL");
    expect(intake.address).toBe("100 Biscayne Blvd, Miami, FL 33132");
    expect(intake.mapQuery).toBe("25.7743,-80.1881");
    expect(filled).toEqual(["address", "city", "hours", "mapQuery"]);
    expect(formatPhone("+13059566855")).toBe("(305) 956-6855");
  });

  it("reads the name and location out of Google Maps links", () => {
    const long = "https://www.google.com/maps/place/Pollux+Air+Conditioning/@25.7743,-80.1881,17z/data=!3m1!4b1!4m6!3m5!1s0x88d9b:0xabc!8m2!3d25.77431!4d-80.18811!16s%2Fg%2F11abc";
    expect(parseMapsUrl(long)).toEqual({ name: "Pollux Air Conditioning", lat: 25.77431, lng: -80.18811 });
    expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query=Joe%27s+Plumbing+Orlando")).toEqual({ name: "Joe's Plumbing Orlando", lat: undefined, lng: undefined });
    expect(parseMapsUrl("https://www.google.com/maps?q=28.5,-81.3")).toEqual({ name: "", lat: 28.5, lng: -81.3 });
    expect(parseMapsUrl("https://example.com/maps/place/Evil/@1.0,2.0")).toBeNull();
    expect(parseMapsUrl("not a url")).toBeNull();
  });
});

describe("details people type in the wrong box", () => {
  it("moves a street address out of the City field", async () => {
    const { splitStreetCity } = await import("../cloudflare/forge/src/places");
    expect(splitStreetCity("105 Court St, Cynthiana, KY 41031, United States", "")).toEqual({ city: "Cynthiana, KY", address: "105 Court St, Cynthiana, KY 41031" });
    expect(splitStreetCity("12 Main Street, Orlando, FL", "")).toEqual({ city: "Orlando, FL", address: "12 Main Street, Orlando, FL" });
    // Ordinary cities, and an address already given, are left alone.
    expect(splitStreetCity("Orlando, FL", "")).toEqual({ city: "Orlando, FL", address: "" });
    expect(splitStreetCity("105 Court St, Cynthiana, KY", "1 Other Rd")).toEqual({ city: "105 Court St, Cynthiana, KY", address: "1 Other Rd" });
    expect(splitStreetCity("29 Palms", "")).toEqual({ city: "29 Palms", address: "" });
  });

  it("keeps the trade's own name when we have no preset for it", async () => {
    const { draftContent } = await import("../src/forge/copy");
    const { Intake } = await import("../src/forge/schema");
    expect(draftContent(Intake.parse({ businessName: "Bob's Garage", industry: "auto repair shop" })).industry).toBe("Auto Repair Shop");
    expect(draftContent(Intake.parse({ businessName: "Acme", industry: "Plumbing" })).industry).toBe("Plumbing");
    expect(draftContent(Intake.parse({ businessName: "Acme" })).industry).toBe("Local Business");
    expect(draftContent(Intake.parse({ businessName: "Winnett Bar & Grill" })).industry).toBe("Restaurant");
  });
});
