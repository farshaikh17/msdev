# Forge: the plan from here

Version 5 (final), 2026-11-12. Reviewed by ten judges under the tenth-man rule: nine specialists approve or amend, the tenth must show how the plan fails, the nine fix it, and the tenth attacks again. After three rounds the tenth found no fatal failure. The record is at the end.

## North Star

Every website works and looks amazing, and feels made for that one business: creative, with a real idea behind it, so the owner thinks "this is us, and I would pay for it". The AI does the reasoning (who this business is, what we have, how to make it special) and then makes it. Our code checks the facts, the fit and the result; it is not the author.

Quality and creativity come first. Cutting cost comes after quality is proven; reselling after that. Today this is an internal tool.

## What is actually wrong

Six Studio sites, six looks and first screens picked by hand. The first screens differ; everything else repeats. The causes, in order of weight:

1. **Nothing asks who the business is.** The only step before design is a cheap call that lists services and photos. The two best moments so far (the museum's lantern that "shows you around"; the florist's "Flowers for vows, goodbyes and Tuesdays") are the two that came from the business itself.
2. **The standing prompt pulls every site to the same place.** It bans blue and yellow accents and praises warm tinted neutrals (so: orange on cream, 12 of 12 sites); lists font pairings (the model takes the first); specifies the pinned photo-with-steps scene beat by beat (four of six sites); fixes one voice, one page width, one list of blocks.
3. **The sites are not about the real business.** No phone, address or hours on two live home pages; a letter in a square for a logo; a museum with "Get a Quote".
4. **The designer never sees its own page.** One pass, no look at the result below the first screen. Pages thin out as they go down. The automatic review looks only at the first screen too.
5. **Every Studio site gets the same furniture**: a flying object and a "brand moment", whether or not the business has an object worth following.

## What we can and cannot know about a business

Checked in the code: a Google Maps link gives only the name and map position; OpenStreetMap adds the town, and the street address only when it knows the business. There is no Google key and Maps pages are not scraped (owner's rule). So phone, hours, reviews, photos and logo come from only two places: **the business's own website**, when it has one, and **the person building the site**.

Three honest tiers, shown on the build form before building:

- **Has a website:** we read it. To add: keep the logo (today discarded), the site's main colours, and any reviews it publishes.
- **Facebook only, or nothing online:** we do not fetch Facebook. The rep adds what they can see.
- **Nothing given:** name, town, trade only. The site is built honestly on that, but a brief has almost nothing to reason from: five plumbers in one town with no details can honestly yield about three different ideas, not five. So **Studio needs at least one real thing about the business**: a website, or one line of "What you saw". Without it the form says so and offers Standard instead.

The build form gains, all optional except where marked: phone (the site is flagged **"not ready to send"** until there is one), address, hours, logo link or upload, one brand colour, a storefront or van photo, and one line: **"What you saw"** (the sign colour, the van, how long they have been there). Bulk lines become `name | city | link | phone`.

Rules for thin data, enforced in the prompts and checked after:

- **Never invented:** phone, address, hours, prices, years in business, names, licences, awards, ratings, a review attributed to anyone, an AI photo presented as their building or their people.
- **Left out rather than faked:** hours, the map pin, ratings, team sections. A missing block is not noticed; a wrong one is.
- **Honest samples, labelled beside the item:** AI photos of the work only; review cards that say they are samples.
- **Logo:** their full name set in type as a wordmark. Never a letter in a square.
- **After a prospect replies:** a "They replied" button opens a short intake (logo, five photos, hours, colour) and rebuilds. That is the moment real material arrives.

## The four changes

### A. The brief: the AI reasons before it designs

`src/brief.ts`, run **first**: before the look and the first screen are chosen (today `build.ts` picks both by formula before anything is known about the business).

- **Three concepts from three separate calls** (Sonnet), none seeing the others, each given a different lens dealt by code from about eight: the place, the owner's story, the material or craft, the customer's moment, the name, what rivals never do. With thin identity: two calls, using only place, name and trade.
- Each concept must give: **the one true thing** about this business, quoting where in the facts it comes from; **the idea** in one sentence; **what it refuses**. Everything else is optional: colour and type direction, the voice, the home page's arc, and whether the business has an object worth following or a moment worth stopping the scroll for. **The default for both effects is no.**
- Each call is told what the account's recent sites in the same trade and town were built around, as "already made".
- **Choosing:** code only removes concepts that break a hard rule (below). One blind call (Opus, low effort) sees the survivors shuffled and answers: "which could only be this business, and which would its owner show a friend?"
- The chosen brief is stored with the site and shown on its page, so anyone can read why the site looks the way it does.
- About $0.11 a site (estimate).

**The idea outranks the look.** Today each of the nine looks arrives marked "fixed: hold every page to it" and brings its own fonts, colours and a list of eight scenes; a brief added beside that would survive only as a headline. So, when a brief exists:

- The brief decides the palette, the type character, the scenes of the page and their order, the big moment, the voice and the photography.
- A look becomes **materials**, not orders: its layout habits, frames and density. Its font names and colour sentences become examples. Its **scene layouts stay as a pattern library**: they are precise layouts written because looser direction once gave generic pages, and they are what keeps a page strong below the first screen. The brief says what each scene of the page is *about*; the writer builds each from one of the look's layouts, or something visibly better. A look's "never" list still applies, except where the idea needs otherwise. The winning concept picks the look by name with a reason, from the ones that fit the trade, or picks none.
- The first screen: the concept picks one of the ten signature first screens that fits, or describes its own in three sentences using only motion the engine already has. "Its own" is limited to one site in three until it has proven reliable, and its three sentences are what the first-screen review checks the result against.
- The brief is the first block every writer sees (the kit, the home page and every inner page share it), headed "This site's idea (decides everything below)", with: "Where the idea and the materials disagree, the idea wins." Each inner page also gets one line from the brief: the idea on this page.

Hard rules in code (small, not a table of everything): a real brand colour or logo given on the form is used as it is; bereavement, legal, health and childcare get no flying object, no brand moment and no wit; no button or page the trade does not have.

### B. The prompt stops causing sameness

When a brief exists, remove from the standing prompt: the accent colour ban and the warm-neutrals sentence; the font pairing list; the fixed widths and spacing numbers; the beat-by-beat pinned story; the single voice. The fixed "must carry" list shrinks to four things every home page needs (what they offer, proof, where they are, the action); the rest live on their own pages unless the brief wants them. The brief supplies colour, type, voice and the page's arc instead. The home page call first writes a one-screen **score** (the arc, where the one loud moment sits, where it is quiet) and then writes the sections to it.

**Pages must still move, but not all in the same way.** The rule that every Studio page has one pinned photo story, one brightening statement and four drifting pictures was added because early Studio sites stood still, and a measured check enforces it, so it cannot simply be deleted. It is replaced in the same slice, prompt and check together: the engine has six kinds of scroll motion (a held scene, a sideways gallery, stacking cards, a statement that brightens, pictures that drift, a band that runs with the scroll). The brief picks **one held piece and two other kinds**; the check passes when at least three kinds are present, one of them held, at least two pictures drift, and something measurably moves between frames at three points down the page. Using the same held piece as the account's last two sites raises a note, not a failure. Two details: every look must allow at least two different legal combinations (a restrained look that bans the running band, the sideways gallery and stacking cards would otherwise fall straight back to today's trio, so its bans yield to the idea here); and "something moves" is measured on the sections that claim to move, since a video or a running band would otherwise pass it for the whole page. The pointer spotlight and its hint on the first screen also become the brief's choice.

The flying object and the brand moment appear only when the brief asked for them. The signature first screens stay (they work); a first screen that needs an object is only offered when the brief found one.

**Standard is untouched.** Standard sites get no brief and their prompt does not change; a test pins that. "Build on the design of an existing site" keeps working as it does (it copies a design and skips the brief): it is the cheap route, not the creative one, and the form says so.

### C. The designer sees its own page and revises once

- **Settled capture** (`review.ts`): scroll for real in screen-height steps, wait for the engine at each, take a frame (8 on desktop, 3 on a phone), and keep the frames as separate pictures (one big sheet shrinks the text until it cannot be read). The frames are taken once and reused for the checks, the critic and the art-director pass. A full-page screenshot shows pinned scenes as blanks; this shows what a visitor sees. A near-blank frame is then a real fault and is flagged.
- **One art-director pass** on the home page: Opus gets the frames, its own page and the brief; it says where the page stops being about this business, where it is empty, what to cut; and returns replacements for the weakest sections only. It replaces today's score-driven rewrite (which cost $0.50 to $0.80 and moved no score, because the writer never saw the page).
- Accepted only if the measured checks still pass.
- **Browser time is finite** (5 hours a month on the current plan, and today the review is skipped silently when it runs out). Estimated at about 110 seconds a Studio site, that is roughly 160 sites a month. Seconds per site are logged from Slice 2, and a skipped review or pass shows on the site page as "skipped: browser time used up".
- **This is unproven.** It stays only if you prefer the revised page, shown blind beside the original, on at least 4 of 5 trial sites.
- The critic is told "a website for a local business; you do not know who made it", sees the frames, and returns notes only. No score is used as a gate.

### D. Real identity on the form

As set out above: the fields, the tiers, the "not ready to send" flag, the wordmark, the thin-data rules, reading the logo and colours from a website when there is one.

## The work, in order

Small slices. Each is one session for a cheaper model, and nothing starts until the slice before has passed. One change at a time, so that if a rebuild comes back worse, the cause is known.

**Slice 1. Read ten briefs (no builds, about $1.20).** Build `brief.ts` and run it on five businesses already built (the museum, the florist, the tree service, the diner, the Cajun restaurant) **and on five plumbers in one town with only a name and one line of "what you saw" each**, because that is what the pilot will really look like. You read the chosen brief and the rejected ones for each. **Pass: you say each is about that business, and no two share an idea, including among the five plumbers.** If not, the brief prompt is fixed and re-run; nothing else starts.

**Slice 2a. The idea reaches the page (1 real build, about $3.50).** Run the brief first and give it precedence over the look (A); make the prompt changes, with the new movement rule and its check together (B). Nothing else. Rebuild one existing site and show old beside new, **all the way down the page, not just the first screen**. **Pass:** you see different and more "them" at the top and no weaker below it; the brief's colours and type are visibly the page's; someone shown the finished home page beside three briefs with names and towns removed (the real one and two decoys from the same trade) picks the real one. If the page is worse, only one change is in play, so the cause is known.

**Slice 2b. Real identity and seeing the page (2 real builds, about $7).** The form fields, the "not ready to send" flag and the thin-data rules (D); reading the logo and colours from a website; settled capture. Rebuild two more existing sites, one with a real website and one with nothing online. **Pass:** the real details are on the page and nothing is invented; the capture frames show the page as a visitor sees it, pinned scenes included.

**Slice 3. The revision pass (5 real builds, about $17).** Add the art-director pass (C). Five builds in the pilot trade, each shown to you blind, with and without the revision. **Pass: you prefer the revised page on 4 of 5**; otherwise the pass is removed and the plan continues without it.

**Status (13 Nov 2026).** Slice 1 passed. Slices 2a, 2b and 3 are built and deployed but **not yet tested on real builds** (the owner chose to build everything first and test after). What is in place: the brief leads the design; the "What you saw" field, the logo and brand colour read from a website, the wordmark and thin-data rules, the "add phone" flag; a Studio build refuses to start without one real fact; the review scrolls the page for real (8 desktop screens, 3 phone), counts blank screens, and shows the critic the whole page; the art director's pass revises the home page once and keeps the original at `/<slug>/_before` for the blind comparison (`FORGE_ART_PASS=off` turns it off). Testing follows the slices' pass rules above, in order.

**Gate A: start using it on real prospects.** Those five pilot-trade builds: no failed measured check; every site flagged correctly for missing phone; you say they are different from each other and good. Total to here: 8 real builds, about $28.

**Later, each only if real use shows that named problem:**

- *Two sites in one town look alike:* a rule that no two sites in a campaign share first screen + colour family + big moment (pools of at least 5, 6 and 4 give 120 combinations; when a pool runs out, reuse the least recently used that still fits; fit is never broken for variety).
- *A prospect says "less orange" on a call:* a small block of colour and font variables written by code, so **Re-roll colours and fonts** takes seconds and costs nothing. Offered only on sites built with it.
- *Briefs go wrong for a kind of business:* a fuller guardrail table per category.
- *Pages still repeat below the first screen:* section modules written as intent (purpose, content, allowed motion), not pixel specs; more set pieces.
- *Photos look alike:* photo treatments.
- *You want to compare many sites at a glance:* a variety board built from the capture sheets.
- *Cost matters:* cached shared prompt on the big calls (same output, safe now); then, one at a time and each tested against quality: lower effort on the kit, cheaper models for simple inner pages.

**Dropped from earlier versions:** code dealing every design decision from lists; a ban on literal colours with automatic snapping; fingerprints and similarity scores; anchor screenshots and three-run medians; reply-rate weighting per design choice; the swatch board and the 200-deal test; the mood chooser; your own "blind" rating of your own sites.

**Kept from the loose ends:** before/after pairs (prove on one real pair, or drop for trades where it fails); the turning showcase is offered only when it can really turn.

## Cost

Estimates; to be confirmed by logging cost per stage (added in Slice 2). Today a Studio site is $2.30 to $3.44. With the brief (+$0.11) and the revision pass (+$0.30 to $0.80, replacing a rewrite that cost $0.50 to $0.80 on some sites): **about $3.40 typical, $3.00 to $4.20**. Ceiling for now: $4.50. Savings are deferred until quality is proven, then tested one at a time. The image allowance (about 90 a day) should fail loudly instead of silently building sites with fewer photos.

## Gate B: before reselling

Ten sites across ten trades and five towns with "Let Forge choose", including three businesses with real logos and three with nothing online:

1. No failed measured check; no blank frames; nothing invented (every fact on the site traceable to the form or their website).
2. Each site's brief names a true thing, and a reader shown the site can say what its idea is.
3. **Three people who run a business and have never seen Forge** look at the ten live on a phone and answer two questions: "would you pay for this?" and "which of these look made by the same company?" Pass: most say yes to most, and no pair is named by more than one of them.
4. Cost within the ceiling; the walkthrough and tests pass.

## Selling (after Gate A, alongside the later work)

1. **By hand first:** 20 real leads in one trade and region. Each site carries a simple status (sent, replied, won, lost and why); write down every "this isn't us".
2. **When someone says yes:** the "They replied" intake, their real photos and logo, one round of edits, a custom domain. Demos expire after 30 days and stay unlisted.
3. **Decide the offer and price** from what the 20 leads show.
4. **Train the team** on the guide; first five sites each with you watching.
5. **50-lead pilot.**
6. **Resellers** only after Gate B.

## Decisions only you can make

- **A storefront photo:** is it required before a pitch can be sent, or only prompted? (The customer judge: required. The agency judge: prompted, or reps will not build 20 in a sitting.)
- **A bulk line with no link and no phone:** build it with the "not ready to send" flag (recommended), or reject it.
- **The revision pass:** about $0.40 more per Studio site, kept only if you prefer the result in Slice 3.
- **Three outside business owners** for Gate B, about 30 minutes each. Without them the gate is your own eye.
- **A Google Places key:** the one exception to "no third-party keys" that would fill phone and hours automatically (a few cents a lead; Google restricts storing and showing its reviews and photos). Recommended: run the 20 leads without it and decide from how many arrive with nothing.
- The pilot's trade and region.

## Review record

**Round 1: nine judges, all "approve with changes".** They moved the plan from "code deals every decision and the AI executes" to "the AI reasons in a brief and code referees"; added real identity, fit before variety, a full-page critic, steering buttons, two gates, cheaper sessions.

**Round 1, the tenth man: "the plan fails", seven ways.**
1. Identity cannot be fetched (no Google key, no scraping). *Fixed:* three honest tiers; the form asks the rep; thin-data rules; nothing promised from Maps.
2. Nothing raises quality; the plan lowered effort. *Fixed:* the designer sees its own settled frames and revises once, kept only if you prefer it blind; effort cuts deferred.
3. Sameness would move to the brief's form and the engine's furniture. *Fixed:* three separate concept calls with different lenses; only three required fields; effects off by default; chosen for "only this business", not for distance.
4. The measurements were blind on this engine and your rating was not blind. *Fixed:* settled frame capture; critic gives notes, not a gate score; three outside business owners at Gate B.
5. Too much machinery. *Fixed:* four changes in three small slices; everything else waits for a named problem or is dropped.
6. The free first test proved the wrong thing. *Fixed:* the first test is five real briefs you read.
7. Variety per campaign would run out. *Fixed:* a three-part rule with pool sizes and a reuse rule, built only when campaigns need it.

**Round 2, the tenth man: "still fails, on one point only".** Four of the seven round-1 fixes held outright.
1. FATAL as written, cheap to fix: the brief did not own the design; the nine looks did, chosen before it and marked "fixed". *Fixed:* the brief runs first and outranks the look; a look is materials; the concept picks the look and the first screen; the idea heads every writer's instructions.
2. SERIOUS: a measured check forces the same pinned scene on every page, so "effects off by default" would fail it or change nothing. *Fixed:* one held piece and two other kinds from six, chosen by the brief; prompt and check replaced together.
3. SERIOUS: Slice 1 tested briefs on easy businesses. *Fixed:* five thin-data plumbers in one town are in the test; Slice 2 passes only if a reader can match the page to its brief; Studio needs one real fact.
4. SERIOUS: the art-director pass leans on a browser allowance that runs out silently. *Fixed:* fewer frames, captured once; seconds logged; a skipped pass is shown.

**Round 3, the tenth man: "no fatal failure remains".** All four round-2 fixes close against the code. Three serious points and some minor ones were folded in: the second slice is split in two so one change is tested at a time; the looks' scene layouts are kept as a pattern library; restrained looks keep at least two legal ways to move; an "own" first screen is checked against its own description; Standard is pinned as untouched; the decoy test hides names and towns.

## Risks to watch (the tenth man's remaining bets)

1. **Weaker below the first screen.** The first rebuild could be more "them" at the top and thinner underneath than today's site. Slice 2a's old-beside-new comparison runs the whole page for this reason.
2. **A slice overruns its session.** If a cheaper model cannot finish a slice cleanly in one sitting, stop and split it again; do not carry a half-built slice into the next.
3. **Thin-data campaigns.** Twenty plumbers with one line each will share ideas sooner than twenty with websites. Watch how many leads arrive with nothing; that number decides the Google Places question.
4. **The revision pass is unproven.** It is the only thing in the plan aimed at raising quality rather than changing it. If you do not prefer it blind, quality stays where it is and the next lever is the photographs.

