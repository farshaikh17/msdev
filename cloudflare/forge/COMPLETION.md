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
