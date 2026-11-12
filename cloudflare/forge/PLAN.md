# Forge: the plan from here

Version 2, 2026-11-12. Version 1 was reviewed by nine specialist judges (creative direction, AI prompting, front-end, measurement, cost, the customer, the agency, brand, delivery). All nine approved with changes; this version carries those changes. A tenth judge then attacks it (see "Review record" at the end).

## North Star

Every website works and looks amazing, and feels made for that one business: creative, with a real idea behind it, so the owner thinks "this is us, and I would pay for it". The AI does the reasoning (who this business is, what we have, how to make it special) and then makes it. Our code is the referee: it guarantees the facts, the fit, the variety and the quality. It is not the author.

Later, in this order: bring the cost down; resell it. Today it is an internal tool.

## What the last builds showed

Six Studio sites, six looks and six first screens picked by hand. The first screens differ. Everything else repeats: a red-to-orange accent on cream or warm black on all 12 Studio sites ever built; one font pair per look; the same blocks with the same headings; the same pinned photo-with-steps scene on four of six; one photographic style. The judges added what version 1 missed:

- **The sites are not about the real business.** No phone, address or hours on two live home pages; a letter in a square for a logo; every photo AI-made; a museum with "Get a Quote" and "Service Areas". An owner looks for their own name, phone and storefront first.
- **Nothing asks who the business is.** The only step before design is a cheap planning call that lists services and photos. The two best moments so far (the museum's lantern that "shows you around", the florist's "Flowers for vows, goodbyes and Tuesdays") are the two that came from the business itself.
- **The prompt causes the sameness.** It bans blue and yellow accents and praises warm tinted neutrals (so: orange on cream); it lists font pairings (the model takes the first); it specifies the pinned story beat by beat; it fixes one voice, one page width, one spacing scale. Replacing one line would leave all of that pulling every site back to the same place.
- **Orange was right for three of the six** (chains whose brand is orange). A rule that forbids repeating a colour would have made them wrong.

## The design, in one picture

```
1. Real identity   facts, logo, brand colours, real photos   (code + scraping)
2. The brief       who they are, the idea, three concepts    (AI reasons)
3. The referee     fit, variety, legality; picks and locks   (code)
4. The making      kit and pages inside the locked choices   (AI makes)
5. The check       facts, adherence, sameness, quality       (code, then AI, then you)
```

### 1. Real identity (before any design)

- From the Maps listing and the business's current site: phone, address, hours, rating, real reviews, real photos, the logo (header image, `og:image`, touch icon, SVG: `scrape.ts` discards these today), brand colours (`theme-color`, the logo's and the site's main colours), price level, whether it is a chain.
- **Identity strength**: locked (a real logo and colours exist), partial, or none.
- Real photos outrank AI photos. Real brand colours outrank any dealt palette.
- A build with no phone and no address is flagged on the site page before it is sent to anyone.

### 2. The brief (the AI's reasoning)

One call (`src/brief.ts`, Sonnet, medium effort, about $0.04) before design. It reads the identity, the site's text, the reviews, and a short list of what the account's recent sites were built around. It writes:

- **Who they are**: position in one sentence, price tier, audience, three personality words, the local or heritage hook, and whether to follow, bend or break the trade's conventions, with the reason.
- **Three concepts on different premises.** Each: the one true thing about this business; the idea in one sentence; a visual metaphor from its own objects, materials or place; the signature object (from its story, not just its trade); the story the home page tells; a palette family and type character; the set piece; the voice with two sample headings; what it refuses.

Stored with the site (`kit.brief`) and shown on the site page, so anyone can read why a site looks the way it does.

### 3. The referee (code)

Code does not invent; it filters and locks, in this order of precedence:

1. **Locked brand.** Real colours and logo are used as they are and are exempt from every variety rule; those sites vary through type, sections, set piece and photography.
2. **Fit.** A guardrail table per category: allowed looks, voices, photo treatments, motion intensity, contrast floor. Tight for bereavement, legal, health and childcare (no wit, no particle bursts, no brutalism, no black-and-white food). Loose for bars, tattoo, gyms, food.
3. **Variety.** Scoped to the **campaign** (trade + town), with no window, and reserved at deal time so a batch of 25 plumbers cannot collide; then the account's recent sites.

How a choice is made: for each gene, code offers three or four options that pass 1 to 3; the brief's concepts name their pick with a one-line reason; code scores the three concepts against history and fit, takes the most distant one that passes, and validates every pick is on the shortlist. The result is the site's **DNA** (`kit.dna`): palette, type pair, shape language, section list, set piece, photo treatment, voice, each with its reason.

One slot per site is **not dealt**: one section and the brand moment are invented from the metaphor, bounded only by the motion engine's attributes.

Composition rules the referee enforces: at most two pinned scenes on a page, never adjacent; no perch for the flying object inside a pinned or sideways section; the flying object hides while a scene is pinned; pinned length capped on phones.

### 4. The making

- **Tokens are generated by code.** From the palette and shapes, `tokensCss()` writes the full set a site needs, for light and dark: grounds, surfaces, inks, muted, borders, accent, accent-hover, text-on-accent, shadow, focus ring, radii, with a contrast solver that adjusts the accent to pass 4.5:1. The font link is ours. The engine's own hard-coded colours become tokens too. The kit's CSS may contain no literal colours; a check snaps strays to the nearest token in code (no model call).
- **The standing prompt loses what causes sameness** when a DNA is present: the font pairing list, the fixed widths and spacing, the warm-neutrals sentence, the beat-by-beat pinned story, the single voice.
- **Sections are intent, not pixels.** Each of about eight section modules states its purpose, the content it must carry, the engine attributes it may use, and phone rules, plus a dealt composition seed (alignment, density, picture scale). The model designs it. Exact specs stay only where the engine needs them: the signature first screens and the set pieces.
- **Voice** is the brief's, with banned heading *patterns* (not just strings) from the campaign's recent sites.
- **Photos**: a shot list with variety (wide, detail, people, place), the dealt treatment, real photos first.

### 5. The check

Measured by code, every build (free): the existing checks; DNA adherence (tokens in use, dealt fonts rendered, dealt sections present); truth checks (no button or page the trade does not have; phone and address present; sample labels visible); a blank-band check on full-page captures at five scroll stops; phone pass at 390px with touch fallbacks; a fingerprint as a cheap trigger only.

Judged by a model: the critic sees **full-page** strips (today it sees only the first screen), blind to the DNA, three runs, median, fixed rubric, with ten anchor screenshots (five award-level, five template) scored on every run so drift is visible. One added question: "state this site's idea from the screenshots alone; could this page belong to a competitor?" Sameness is judged by a vision model comparing pairs of full-page strips with names blurred ("same designer or template?", 1 to 5, naming what is alike). This runs at the gates and on demand from the variety board, not on every build.

Judged by you: the variety board (thumbnails side by side with each site's idea and DNA), and a blind rating at the gate.

### Steering (the team is not locked out)

On the site page: **Re-roll colours and fonts** (tokens only: free, seconds); **Like this, but different** (keep the genes you lock, re-deal the rest); a **mood** on the build form (bold, calm, premium, friendly, surprise me) that filters the shortlist; "make it our green" as a token change, not a rebuild.

### Learning from sales

Each site records its outcome (sent, viewed, replied, booked, won, lost and why, including every "this isn't us" reason), pushed from GoHighLevel, beside its DNA. The variety board shows reply rate per gene; after 100 sends the shortlists are weighted by what gets replies.

## Cost

Estimates, to be confirmed by logging cost per stage. Today a Studio site is $2.30 to $3.44.

- Savings the design makes safe: the kit at low effort once tokens and choices are dealt; simple inner pages (contact, questions, reviews) on Haiku; a cached shared block for the home and first-screen calls; palette strays fixed in code; at most one Sonnet repair for adherence, never an Opus rewrite. About $0.50 to $0.90 saved.
- Additions: the brief ($0.04); longer home brief (up to $0.05); pairwise sameness only at gates (about $1 per gate).
- **Target: $2.00 typical, $2.50 worst case; stretch $1.50.**
- Images: the free allowance (about 90 a day, about 9 Studio sites) silently drops photos when it runs out. Change it to fail loudly, and allow paid overage (well under $0.01 a site; rate to verify).

## The work, in order

Each session ends deployed, with a test a cheaper model can run **without spending credits**; real builds are only the last step of a session, and the whole plan is budgeted at 12 to 15 real builds.

**Session 0. See it before paying for it (free).**
- `npm run forge:variety`: deals DNA for 200 made-up businesses with no model call and prints the briefs; fails on collisions or lopsided use.
- `npm run forge:fixtures`: renders every set piece and token set through `assemble()` with stub content and runs the measured checks at 360px and 1440px, reduced motion, and every legal neighbour pair.
- A **swatch board**: every palette, font pair and shape set shown on one fixed sample page. You see the range the same day.
- Fingerprints of the 12 existing sites as the baseline.

**Session 1. Real identity + tokens.** Logo, colours, phone, address, hours and real photos from Maps and the current site; identity strength; `tokensCss()` with the contrast solver; the colour check; the sameness-causing prompt lines removed. Then: one first-screen-only real build, then two full builds (one business with a real brand, one without).

**Session 2. The brief and the referee.** `brief.ts`; the guardrail table; campaign-scoped variety; shortlist-pick-validate; `kit.brief` and `kit.dna` on the site page. Then two real builds in the same trade and town.

**Session 3. Seeing and steering.** Full-page capture and the blank-band check; DNA adherence and truth checks; the variety board; **Re-roll colours and fonts** and the mood chooser. No new real builds needed (works on existing sites).

**Gate A: start using it on real prospects.** Five builds in the pilot trade: no failed measured check; phone, address and logo (where one exists) on the first screen; you look at the board and say they are different and good. Then the 20 real leads begin, in parallel with the remaining sessions.

**Session 4. Sections.** Eight section modules as intent plus constraints, composition seeds, heading-pattern memory, the undealt slot; the fixed "must carry" list goes only when fixtures and two real builds show nothing is lost.

**Session 5. Set pieces.** Three more set pieces on engine attributes that already exist; pin ordering (`ScrollTrigger.sort()`), the two-pin rule. New engine work only if the board still shows sameness.

**Session 6. Photos, voice, cost.** Treatments (the CSS ones first), the brief's voice in page prompts, the effort and routing savings, cost logged per stage.

**Session 7. Measurement and outcomes.** The full-page critic with anchors; pairwise sameness; outcome tracking from GoHighLevel; "Like this, but different".

**Loose ends kept:** before/after pairs (prove on one real pair or drop per trade); retire the turning showcase from "Let Forge choose" until it can really turn. **Cut from this plan:** new engine set pieces unless needed; the weekly critique-to-spec loop (it teaches the designer the critic's taste); extra trade profiles beyond the guardrail table; automatic re-deal on similarity (the button does it).

**Gate B: before reselling.** Ten sites across ten trades and five towns, including a funeral home, a day-care, a tattoo studio and three businesses with real logos, all with "Let Forge choose":
1. No failed measured check on any; every limit in this plan defined as a number.
2. Sameness: no pair of the ten rated 4 or 5 of 5 by the pairwise judge; median 2 or less.
3. Quality: 8 of 10 at 7 or more from the full-page critic, with the anchors steady (the score is void if the anchors move by 1).
4. You, blind: shown the ten shuffled with ten real agency sites, you say "would pay" to at least 8 of ours and "seen this before" to at most 2. If your ranking and the critic's disagree, yours wins and the critic is recalibrated.
5. Brand: each site with a real logo matches it, and a blind reader can say why each site looks the way it does.
6. Cost at or under the target; the walkthrough and tests pass.

## Selling (after Gate A, in parallel)

1. **Pilot by hand:** 20 real leads in one trade and region; write down every snag and every "this isn't us".
2. **Make it real** when someone says yes: custom domain, their real photos in place of AI ones, one round of edits; demos expire after 30 days and stay unlisted.
3. **Decide the offer:** what a client buys, Standard against Studio, the price. The pilot's reply and close rates set it.
4. **Train the team** on the guide; first five sites each with you watching.
5. **50-lead pilot**, tracking sites built, viewed, replied, booked, won.
6. **Resellers** only after Gate B: palette pools, guardrails and campaigns are per account from the start so nothing needs rebuilding.

## Decisions only you can make

- Pay for image overage (pennies a site) or keep the daily cap.
- The pilot's trade and region.
- Whether existing Studio sites are rebuilt (3 credits each) once Session 2 lands.
- Domain, prices and legal review: before the 50-lead pilot, not before Gate A.

## Review record

**Round 1 (nine judges, all "approve with changes").** What each changed:
- Creative director: added the brief and the idea; shortlists instead of dictation; one undealt slot; sections as intent.
- AI prompting: three concepts with code-side selection; remove the prompt lines that cause sameness; ban heading patterns.
- Front-end: a full token set generated by code with a contrast solver; composition rules for pinned scenes; fixtures.
- Measurement: full-page critic with anchors; pairwise sameness by vision; blank-band check; your blind rating in the gate.
- Cost: lower effort and cheaper routing once choices are dealt; code-side repairs; a $2.00 target; loud image failures.
- The customer: real identity first; fit before variety; truth checks; a phone pass.
- The agency: re-roll and lock; campaign-scoped variety; two gates; outcome tracking; "make it real".
- Brand: locked brand outranks everything; category guardrails; harder trades in the gate.
- Delivery: a free Session 0; smaller sessions; tests that cost nothing; a budget of real builds.
