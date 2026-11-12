# Forge Websites: where we stand and the plan to finish

Written 2026-11-11 from a full QA pass: the test suite, the browser walkthrough, a crawl of the live
app and sites, and the production records of every build so far.

## What "complete" means

1. **Reliable.** A build started from a business name finishes without help, and every page works.
2. **Good.** A Studio site scores 8 or more on our own quality check, looks like its chosen look, and
   does not look like the last Studio site.
3. **Meets QA.** Every site passes the 13 QA standards (`src/qa.ts`) with nothing open.
4. **Usable.** Someone who has never seen the tool can build, check, fix and send a site unaided.
5. **Sellable.** Real domain, real prices, a way to pay, and terms a lawyer has read.

## Where each stands

| | Status | Evidence |
|---|---|---|
| 1. Reliable | Close | 269 tests, 38 browser steps, 71-page live crawl all pass. One real build failure so far (a design cut off), fixed with an automatic retry that has not yet been seen to fire. |
| 2. Good | Not yet | Six Studio builds scored 5 to 6. The looks now differ (the Kinetic build "follows the Kinetic brief with real nerve"), but no build has run since the floor rules, the per-site deal and hero-first went in. |
| 3. Meets QA | Built, unproven | The guards are live and pass on five sites. No site has been through the 13-rule check yet: it runs on the next build or "Check again". |
| 4. Usable | Close | Redesigned around look at it / make it better / send it. Not yet tried by anyone but the owner. |
| 5. Sellable | Not started | Owner decisions: domain, prices, payment links, legal review. |

## What the build records showed, and what was fixed on 2026-11-11

- Every site failed "No script errors" because browsers ask for a site icon we didn't have. Sites now
  carry an icon, and a missing file no longer counts as a script error.
- Sites built without a phone number failed the phone check and were marked down for it. The check is
  skipped when no number was given.
- The critique asked for star ratings, review counts and years in business, which the designer is
  forbidden to invent. It is now told not to.
- The score shown was of the page before its automatic rewrite. The page is now scored again after.
- Hero pictures didn't show the product (an empty dining room for a restaurant). The picture plan now
  puts the thing customers come for first.

## Cost per site today (from production)

| | Range |
|---|---|
| Standard build | about $0.80 |
| Studio build | $2.30 to $3.10 |
| Quality check with a home page rewrite | $0.45 to $0.70 |
| Hero first (new, Studio) | not yet measured; expected $0.30 to $0.50 |

## The plan

**Phase 1: fix what the records show.** Done 2026-11-11 (the list above).

**Phase 2: three proving builds (needs the owner to press Build; about $10 of Claude use).**
1. A Studio restaurant in Cinematic (redesign El Rodeo), to compare with the two earlier versions.
2. A Studio contractor with the look left on "Let Forge choose".
3. A Standard contractor.
For each: the score, whether the first screen matches the look, whether the three differ, the QA
standards result, the cost by stage, and a phone-width scan of every page.
Pass: Studio 8 or more, QA standards with nothing open, no page wider than a phone.

**Phase 3: fix what the proving builds show, then build one more of each to confirm.**
Stop after two rounds: if Studio still scores under 8, the remaining gap is the pictures (AI previews
instead of the business's own photos), which is a product decision, not a bug.

**Phase 4: internal rollout.**
- A one-page guide for internal users.
- Two people other than the owner each build and send a site unaided; fix what trips them.
- Run "Check again" on the sites that will be shown to customers.

**Phase 5: selling (owner decisions).** Domain, prices, payment links, a lawyer's read of the terms.

## Known gaps not in the plan

- No check yet for faint text over a hero photo or overlapping elements (QA notes mention both).
- Phone numbers are not read from a Google Maps link, so sites built from one have no phone unless it
  is typed in or the business has a website we can read.
- The Standard home page still has twelve or more sections (the design SOP); only Studio was cut to nine.

## Update, 2026-11-12: after the first two proving builds

Two Studio sites were built on the new pipeline (a paint store in Cinematic, a thrift shop in
Neo-brutalist). Both finished unaided, both follow their look, and they do not resemble each other.

**What they showed, now fixed for every site**
- The pinned sideways photo strip was broken on every Studio site (panels collapsed to zero width).
- Empty "Your photos appear here" boxes: 54 across eight sites. The designer is no longer told to
  draw them, a guard fills any that remain with the site's sample photos, and a 14th QA rule catches them.
- Sites built from a Google Maps link had no town. The town now comes from the map position.
- The phone field is on the main form. Thrift and resale shops get a Donate page.
- A phone menu parked off-screen made Standard sites twice as wide as a phone.
- The automatic home page rewrite cost $0.50 to $0.80 and moved neither score. It now runs only when
  a measured check fails, and keeps the original if a rewrite scores lower.

**Where the five goals stand**

| | Status |
|---|---|
| 1. Reliable | Met. Every build since the retry fix has finished; 273 tests, 38 browser steps, 71-page crawl and a phone-width scan of every page of 13 live sites pass. |
| 2. Good | Partly. The looks are distinct and the checks pass, but both proving builds scored 6 on our own critique, which holds Studio to an award-site bar. The remaining gap is mostly the pictures: AI samples in place of the business's own photos. |
| 3. Meets QA | Met for new builds (both passed with nothing open). Sites built before 2026-11-11 get the full check when "Check again" is pressed. |
| 4. Usable | Not yet proven: nobody but the owner has used it. |
| 5. Sellable | Owner decisions outstanding: domain, prices, payment links, legal review. |

**Cost of the two proving builds:** $3.15 and $4.26 all in (build, QA repairs, quality check). With
the rewrite change, expect about $2.60 to $3.50 for Studio.

**What is left before calling it complete**
1. Two people other than the owner each build and send a site with GUIDE.md and nothing else.
2. Press "Check again" on any older site that will be shown to a customer.
3. Decide whether the Studio score target stays at 8. If it does, the lever is real photos: paste the
   business's photo links (or its website) into the form.
4. The owner decisions in goal 5.

## Update, 2026-11-12: Studio heroes that go beyond photographs

The motionsites prompts are now ideas the planner fills per business, not fixed layouts:

- **Flying object** (the bee idea): the planner names one object for the trade (a wheel, a croissant, a leaf). It is drawn on a plain backdrop, cut out with Cloudflare Images, and flies from perch to perch down the home page as the visitor scrolls, rocking and tilting.
- **Subject in front of the headline** (the model/car idea): the hero photo's subject is cut out and laid over a giant one-word headline, which rises from behind it and slides away on scroll.
- **Turning showcase** (the 3D idea): a short generated clip of the object turning is cut into 24 transparent frames; a pinned first screen turns it as the visitor scrolls, with callouts writing in around it.
- **Generated hero video**: when the library has no clip for the trade, the camera dive, scene switcher and hanging-badge heroes get the hero photo brought to life as a 6-second clip.

Costs: cut-outs and frames sit in Cloudflare's free allowances (5,000 Images transformations a month; Media Transformations free in beta). Clips use video models (MiniMax Hailuo 2.3, about $0.28 a clip; Pruna P-Video, about $0.10, as the fallback) paid from **AI Gateway credits**, which must be loaded in the Cloudflare dashboard (AI → AI Gateway → Credits). At most one clip per Studio site. Without credits the build carries on: the turning object becomes a still that sways, and the heroes use library clips or photos.

Needs the Images and Media bindings (in wrangler.jsonc) and a deploy.

**Decision (same day): no Cloudflare video generation.** It is switched off (it only runs if the FORGE_VIDEO_GEN variable is set to "on"). GHL Creator Studio has no public API, so moving heroes come from the video library: clips made in Creator Studio (free on the agency plan) are saved into the shared Google Drive folder, and the hourly sync imports them and sorts them by trade. Without a clip, the turning showcase shows the cut-out object swaying and growing as the visitor scrolls (no frames).
