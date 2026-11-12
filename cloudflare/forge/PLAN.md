# Forge: the plan from here

Written 2026-11-12, after the first batch of Studio builds with the new heroes. Three parts:

1. **Variety**: why Studio sites look alike, and the fix.
2. **Finishing**: what is left before the building phase is over, and how we know it is over.
3. **Selling**: what happens after.

Parts 1 and 2 are written so another model (or developer) can pick up a phase and build it: each phase names its files, what to build, and how to check it is done.

---

## Part 1. Variety

### What the last builds actually show

Six Studio sites built today, six different looks and six different first screens, all chosen by hand. Measured in a browser:

| Site | Look | First screen | Accent colour | Ground | Fonts |
|---|---|---|---|---|---|
| Whataburger | Swiss | Hanging badge | orange `#E85400` | cream | Inter Tight |
| Waffle House | Brutalist | Colour slider | orange `#d9480f` | cream | Archivo Black + Space Grotesk |
| The Superette | Cinematic | Scene switcher | orange `#F07D50` | warm black | Unbounded + Manrope |
| T Boys | Kinetic | Camera dive | orange `#E85A14` | warm black | Big Shoulders + Hanken Grotesk |
| Flower House | Editorial | Spotlight | red `#9b2c3f` | cream | Instrument Serif + Hanken Grotesk |
| Pointe Coupee Museum | Organic | Flying object | rust `#a5462a` | cream | Fraunces + Figtree |

The first screens really are different. The sameness is everything else:

1. **Colour.** All 12 Studio sites ever built have a red-to-orange accent on either cream or warm black. The prompt says "your choice; pick one that suits the trade" (`designer.ts:634`), and the model makes the same choice every time.
2. **Fonts.** Each look lists four or five fonts and the model always takes the first. Every Cinematic site is Unbounded + Manrope; every Brutalist site is Archivo Black + Space Grotesk; every Editorial site is Instrument Serif + Hanken Grotesk.
3. **The same ten blocks on every home page.** `studioHome()` in `designer.ts` gives every site the same "must carry" list: the offer, the story, how it works, photos, reviews, questions, the map, the form. So every page below the first screen is the same inventory in a slightly different order, with the same headings ("Find us in Eunice" on three sites, "How a visit comes together" on two, "What guests say" on two).
4. **The same middle set piece.** The scroll floor requires one pinned sequence, and the model builds the same one each time: one photo held for four screens with numbered step cards over it (four of six sites, each exactly 3,600px tall). The brand moment has only two kinds, so it repeats too.
5. **The same photographs.** One style line for every site ("Professional photograph for a local business website, realistic, natural light", `images.ts:11`) gives every site the same warm stock-photo look.
6. **The same shapes.** Four of six sites have 6px button corners; cards, rules and frames follow the look, not the site.
7. **The variety memory is too narrow.** `recentLooks()` remembers only look, deal and first screen. It knows nothing about colour, fonts, sections or set pieces, so it cannot steer away from them.
8. **The test itself.** All recent builds are food or shops in one town (Eunice), three of them chains whose real brand colour is orange. Real use will be more varied than this, but points 1 to 7 would still show.

The lesson, which matches what the signature heroes taught us: **whatever the model is left to choose, it chooses the same way every time. Whatever our code deals, varies.** The first screens vary because code deals them. Everything in the list above is left to the model.

### The fix: a Design DNA, dealt by code

Each Studio site gets a **DNA**: a set of design decisions dealt by our code before anything is designed, stored with the site, and checked afterwards. The model's job changes from choosing to executing.

| Gene | Choices | Dealt how |
|---|---|---|
| Look | 9 (exists) | exists |
| First screen | 10 (exists) | exists |
| Flight path, brand moment | 3 and 2 (exist) | brand moment grows to 6 (see set piece) |
| **Palette** | about 24 named palettes, each with a light and dark form: ground, surface, ink, accent, second accent | fits the trade's temperament; never one of the account's last 6; a brand colour typed on the form replaces the accent only |
| **Type pair** | 4 or 5 per look (about 40 in all) | never one of the look's last 3 uses in the account |
| **Shape language** | corners (square, small, large, pill) x borders (none, hairline, heavy) x shadows (none, soft, hard) x picture frames (square, arch, circle, tilted, polaroid) | from the sets each look allows |
| **Section set** | a pool of about 18 section modules, each with 2 or 3 layouts; a site gets 7 to 9 | 4 required kinds (offer, proof, where, action) in a dealt layout, plus 3 to 5 dealt from the pool; reviews, questions and "how it works" no longer have to be on every home page (they have their own pages) |
| **Set piece** | 8: pinned story, sideways gallery, stacking cards, word zoom, particle burst, marquee wall, scrubbed statement, depth collage | never one of the account's last 2 |
| **Photo treatment** | 6: natural, bright and airy, moody low-key, flash editorial, film grain, black and white with one colour | from the sets each look allows |
| **Voice** | 6: plainspoken, warm neighbour, dry wit, confident expert, lyrical, punchy | by trade and look; plus a list of headings the account's recent sites already used, which may not be reused |

Counting only palette x type x set piece x section set x first screen, that is tens of thousands of combinations before the look, shapes, photos and voice. Two sites in the same trade and town will share at most one or two genes.

Three rules make it hold:

- **Tokens are written by code, not by the model.** The palette becomes CSS variables (`--ground`, `--ink`, `--accent`...) and the font link is generated by us and placed in the kit. The designer is told to use only those variables. A check rejects raw colours outside the palette.
- **Modules are specs, like the heroes.** Each section module and set piece is written the way the signature heroes are: exact layout, sizes, which engine attributes. The home page brief becomes "first screen spec, then these module specs in this order".
- **Memory covers every gene.** The DNA is stored in the kit (`kit.dna`), and dealing reads the account's last 8 DNAs.

### Detection: proving a site is different

Dealing prevents sameness; detection confirms it and catches drift.

1. **Fingerprint.** The review already opens every site in a browser. It will also record a fingerprint: ground and accent hue, fonts actually rendered, corner radius, the sequence of section kinds, set pieces present, the headings, the first screen.
2. **Similarity score.** The fingerprint is compared with the account's last 8 sites. Above a set limit, the review shows "Too similar to [site]: same palette, same section order", and the cheap genes (palette, fonts) are re-dealt automatically, since they are only tokens.
3. **DNA adherence.** The same pass checks the site kept to its DNA: the palette variables in use, the dealt fonts rendered, the dealt modules present. Measured, not judged.
4. **Variety board.** One admin page: thumbnails of the last 24 Studio sites side by side with their DNA under each. The human check; sameness is obvious at a glance.
5. **Regression test.** `npm run forge:variety` deals DNA for 200 made-up businesses and fails if neighbours share a palette, type pair or set piece, or if any choice is used far more than its share.

### Smarter prompts (the other half)

- **Trade intelligence.** `profiles.ts` now covers nine kinds of business. Add the missing ones (automotive, childcare and schools, pets, events, non-profits) and give each "what a customer wants to do first", which drives the first screen's action and the form.
- **Photo planning.** A shot list with variety built in (one wide, one detail, one of people, one of the place), the treatment's own wording, people at a natural distance, never close-up hands.
- **Copy.** A voice card per site, the banned-headings list, and the standing rules against AI tells that the floor already has.
- **The review's critique.** It scored today's sites 6 and 7 out of 10 and its notes were right (object too small, headline over white petals, melted hands). Feed its repeated complaints back into the specs once a week rather than fixing them site by site.

---

## Part 2. Finishing the building phase

### Phases, in order

Each phase is one working session, ends deployed, and has a test that must pass before the next starts.

**Phase 1. Colour and type (the biggest visible win).**
- New `src/dna.ts`: the palette library, type pairs per look, `dealDna(intake, slug, recent)`, tests for spread and avoidance.
- `designer.ts`: write the palette variables and font link into the kit by code; replace line 634; tell the designer to use only the variables.
- `db.ts`: `recentLooks` returns the stored DNA; `kit.dna` saved.
- `qa.ts`: lint for colours outside the palette.
- Done when: three Studio builds for the same trade in the same town come out with three different palettes and three different font pairs, and no red-orange unless it was dealt or typed in.

**Phase 2. Sections and set pieces.**
- `src/modules.ts`: about 18 section modules and 8 set pieces as exact specs; engine support for the two new set pieces (marquee wall, depth collage).
- `studioHome()`: the brief is built from the dealt modules; the fixed "must carry" list goes; the scroll floor is met by the dealt set piece instead of by rule.
- Headings memory: store each site's headings; pass the account's recent ones as banned.
- Done when: the section sequence of three same-trade builds differs in at least half its positions, and no heading repeats across them.

**Phase 3. Photos, shapes, voice.**
- `images.ts`: six treatments in the prompt; black-and-white and duotone done in CSS.
- Shape tokens in the kit (`--radius`, border and shadow tokens), dealt.
- Voice cards in the page prompts.
- Done when: a side-by-side of six builds shows visibly different photography and shapes.

**Phase 4. Detection.**
- `review.ts`: fingerprint, similarity score, DNA adherence, auto re-deal of palette and fonts.
- Admin variety board; `npm run forge:variety`.
- Done when: rebuilding a site with a copy of another site's DNA is flagged, and 200 dealt DNAs pass the spread test.

**Phase 5. Loose ends.** Everything already known and not yet done:
- Before/after pairs: the prompt fix has never been seen in a real pair. Build one, check it, fix or drop the feature for trades where it does not work.
- The turning showcase without video only sways; either supply turning frames another way (several stills of the object drawn at set angles) or retire it from "Let Forge choose".
- A "Rebuild in today's design" button for sites built before these changes.
- Old versions' images and clips are never cleaned up; add the cleanup.
- Speed and access: a Lighthouse pass on three Studio sites (the motion libraries, image sizes), and a keyboard and screen-reader pass.
- The daily picture allowance (about 90) caps Studio at roughly 9 sites a day; decide whether to raise it by paying for images or to queue builds past the cap.
- The image-heavy pages of the app (variety board, site lists) on a phone.

### The gate: when building is over

The technical phase ends when all of these are true, not before:

1. **Ten in a row.** Ten Studio builds across ten different trades and at least five towns, all with "Let Forge choose", each scoring 8 or more in the automatic review with no failed measured check.
2. **Variety.** Those ten pass the similarity check against each other, and the variety board looks varied to you.
3. **Your QA sheet.** Each of the ten passes the standards in the Design Team Website Tracker.
4. **Standard holds.** Five Standard builds still pass (they share the pipeline).
5. **Cost.** Studio at or under $3.50 a site, Standard under $1, measured on those builds.
6. **Nothing red.** The 38-step walkthrough and the test suite pass on the final deploy.

Ten trades for the gate: plumber, roofer, landscaper, restaurant, salon, dentist, law firm, gym, florist, museum or venue.

---

## Part 3. Selling

Once the gate is passed, the work stops being code. In order:

1. **Decide the offer.** What a client buys (the site alone, or the site plus hosting and GHL), Standard against Studio pricing, and what a credit costs resellers. Prices in the app are still placeholders.
2. **Make it yours.** A real domain in place of workers.dev for the app and for client sites; the terms and privacy pages reviewed by a lawyer; payment links.
3. **The pitch, end to end.** The flow the product was built for: Google Maps link in, site out, send the before-and-after pitch page, get told when they view it, follow up. Run it by hand on 20 real leads first and write down every snag.
4. **Train the team.** `GUIDE.md` turned into a 10-minute walkthrough; the team builds their first five sites with you watching.
5. **Pilot.** 50 leads in two weeks, one trade, one region. Track: sites built, pitch pages viewed, replies, calls booked, sales. These numbers set the price and tell us what to fix.
6. **Then resellers.** White-label is already built (accounts, credits, API, webhooks). Open it to two or three partner agencies after the pilot, not before.
7. **Support.** Who answers when a build fails or a client wants a change, and how fast; the change-request box already exists.

### Decisions only you can make

- The domain, the prices, and whether a lawyer reviews the legal pages before the pilot.
- Whether to pay for more images a day (lifts the Studio cap) or keep within the free allowance.
- Whether existing Studio sites are rebuilt in the new design (3 credits each) or left.
- Which trade and region the pilot starts with.
