# Forge Demo

Type a business's name (or paste its Google Maps link) and Claude designs a complete,
multi-page website for it in about 7–20 minutes, to the design team's website SOP. Teams and
agencies each have their own account, build credits, branding and API, so Forge Demo is both
Mianro's own demo tool and a product that can be resold.

Everything runs on the Cloudflare Workers **Free** plan: two Workers, one D1 database, one
Queue, one KV namespace, and Workers AI for photos.

## What a build produces

For each business (about $0.85–0.95 in Claude fees, 7–20 minutes):

- **15+ pages**: Home (12+ sections and a quote form), About, Services, a page per service
  (4–6, chosen for the real niche), Our Process, Our Work, Reviews, FAQs, Service Areas with a
  real map, Contact, Get a Quote, Privacy Policy and Terms.
- Light and dark modes in the chosen colour, a one-line header, the footer credit, working
  forms, the GoHighLevel chat widget in the site's colour, and six AI-generated preview photos.
- A moving hero: a library video for the business's trade, or its photos cross-fading.
- It reads the business's own website (if given) for facts, photos, phone, address, hours and
  map position, and accepts a Google Maps link in place of a name. No Google key is needed.
- The legal pages are our own draft wording and are marked for the business to review.

The site is served from its own origin (`forge-sites`), so AI-written pages can never reach the
app. A demo works the moment it's created (a quick template site); Claude's design replaces it
when every page is written, and not before. A failed build is retried without re-paying for
pages already done.

## Accounts, roles and credits

| | Who | Can |
|---|---|---|
| **Administrator** | Mianro staff (on the Mianro account) | everything, plus the **Admin** console |
| **Owner** | runs a customer account | demos, team, API keys, settings |
| **Member** | on a customer account | build and manage the account's demos |

- Everything belongs to an **account**. One account can never see, open, change or archive
  another's demos, leads, keys or videos (this is tested; see below).
- Each full build **uses 1 credit**, including a redesign. A build that fails is refunded
  (once). Picking a stalled build up again isn't charged twice. Mianro's own account builds
  free. An account at zero credits can still use its existing sites.
- An account can run **3 builds at once**.
- Credits are added by hand in **Admin → account → Credits**, with a note that is kept in the
  history (for example "Paid invoice 1042"). There is no payment provider yet: invoice
  customers however you like, then add credits.
- **Admin → Accounts** shows each account's credits, demos, builds, and what its builds have
  cost Mianro in Claude fees (this month and in all), so margins are visible.
- **Suspend** switches off an account's sign-ins, API keys, demo sites and forms (within a
  minute). Nothing is deleted. **Delete** removes the account and everything it owned.

### Onboarding a customer

1. **Admin → New account**: name, the owner's email, starting credits.
2. Send the owner the invite link shown (it works once and expires in 7 days; no email is sent).
3. They choose a password, then set up their GoHighLevel page and chat widget under Settings,
   invite their team under Team, and optionally make API keys under API.

## White-label

- **Footer credit**: the default is "Made with ♥ by Mianro Systems" (the design SOP). Only
  Mianro staff can change it per account, to "Made with ♥ by *their name*" with their link, or
  to nothing. It changes on sites already built within a minute.
- **Chat widget**: each account sets its own GoHighLevel widget (a demo can override it). An
  account with no widget set gets none; only the Mianro account falls back to Mianro's widget.
- **GoHighLevel page**: each account pastes the snippet into its own GHL page and saves the
  page's address; demo links then read `<their page>?d=<demo>`.
- **Hero videos**: the shared library (Mianro's) is used by every account; an account can add
  its own clips by link too.

## API and webhooks

Owners make API keys under **API**. `Authorization: Bearer fk_live_…` works on:

- `POST /api/v1/demos`: build a demo (same fields as the form; 201, or 402 no credits, 422 a
  field is wrong, 429 too many builds / requests)
- `GET /api/v1/demos/{slug}` · `GET /api/v1/demos/{slug}/leads` (form submissions) · `GET /api/v1/demos` · `GET /api/v1/me`

60 requests a minute per key. Keys are stored only as hashes (shown once). Under **Settings** an
account can set a **webhook** address: it receives signed `demo.ready` / `demo.failed` messages
when a build ends, `lead.created` the moment a visitor submits a form on one of its demo sites
(with the submitted fields), and `ping` for a test, so its own automation can create the contact in
its CRM, post to Google Chat, add a sheet row or update GoHighLevel. The in-app **API** page documents the messages and how to verify the signature
(`x-forge-signature` = HMAC-SHA256 of `"<timestamp>.<body>"`).

## Photos and videos

- **Photos**: six per site from Cloudflare Workers AI (FLUX.2 [klein]), planned from the
  business's niche. Free allowance: 10,000 neurons a day, about 20 sites a day. They are
  illustrative; galleries and before/after stay labelled spaces for the business's real photos.
- **Videos**: clips are copied hourly from a shared Google Drive folder (Admin → Shared hero
  videos; the folder must be shared by link as *Viewer*, never *Editor*) into Workers KV, and
  given a trade and keywords from their file names. Admins fix any trade in the same screen.
  A demo plays a clip whose trade matches its own, or animates its photos.

## Security

- Passwords are PBKDF2-SHA256 (100,000 rounds). Sessions are signed cookies (HttpOnly, Secure,
  SameSite=Lax) that stop working when the person's password changes or they're removed.
  Form posts from other sites are refused.
- Wrong passwords: 5 per address and 20 per email per 15 minutes. The public form endpoint:
  8 posts per address per 10 minutes, 300 stored per demo. New demo links carry 8 random hex
  digits.
- Strangers can't start builds (so can't spend Claude credit), and every page is `noindex`.
- Limits are per address, so a network of many addresses is slowed but not stopped: use long
  passwords. The free plan's daily request allowance can't be protected without a custom domain.

## Running it

**Deploy**: `npm run forge:deploy` applies the database migrations, then deploys `forge-sites`
and `forge-demo`.

**Cloudflare resources**: D1 `forge-demo`, Queue `forge-builds`, KV `VIDEOS`, Workers AI. Secrets
(Workers → forge-demo → Settings → Variables and Secrets): `ANTHROPIC_API_KEY` (without it
sites use the built-in template), and `FORGE_PASSWORD` (only used once, below). Optional
variables: `CLAUDE_MODEL`, `CLAUDE_PAGE_MODEL`, `CLAUDE_EFFORT` (low / medium / high).

**First run**: open the app. With no administrator yet it offers **Set up the administrator**: enter
the current team password (the old shared password, which proves it's you), your email, and a
new password. After that nobody signs in with the team password again, and set-up is closed.

**Lost the team password before set-up?** In the Cloudflare dashboard → D1 → forge-demo →
Console, run `DELETE FROM settings WHERE key = 'teamPasswordHash'`; the `FORGE_PASSWORD`
secret then works again.

**Lost an administrator password?** Another administrator uses Admin → account → People →
New password link. If there is no other, in the D1 console run
`DELETE FROM users WHERE role = 'admin'`: first-run set-up opens again (it needs the team
password, as above).

**Hourly job** (`23 * * * *`): syncs the Drive folder and clears old rate-limit counters.

**Free-plan limits worth knowing**: 100,000 requests a day (across the Workers), about 20 sites
a day of AI photos, Queues 10,000 operations a day (a site uses about 100). If builds ever stop
finishing, Workers Paid ($5/month) lifts the CPU limits.

## Code map

| File | What it does |
|---|---|
| `index.ts` | entry: routes the two Workers, queue consumer, hourly job |
| `app.ts` | the signed-in app: sign-in, set-up, invites, demos, team, API keys, settings, admin |
| `serve.ts` | public pages: sites, photos, forms (applies the account's credit line, widget, videos) |
| `api.ts` | the JSON API |
| `build.ts` | starting builds (credits, limits) and the queue jobs that design a site |
| `designer.ts` | Claude prompts: the design brief, sitemap, planning, design kit and pages |
| `demos.ts` | creating/redesigning a demo (shared by the form and the API) |
| `tenants.ts` | accounts, people, links, API keys, credits, costs |
| `auth.ts`, `crypto.ts` | passwords, sessions, tokens |
| `db.ts` | demos, versions, pages, images, leads, videos, rate limits |
| `places.ts` | details from a business's website; Google Maps links |
| `site.ts`, `hero.ts` | assembling a page; footer credit, chat widget; the moving hero |
| `webhook.ts`, `drive.ts`, `images.ts`, `legal.ts`, `scrape.ts` | notifications, Drive sync, photos, legal pages, website reader |
| `ui*.ts` | the screens |
| `migrations/` | the database, in order |

## Tests

`npx vitest run tests/forge-app.test.ts tests/forge-worker.test.ts` runs the app's real routes
against a database built from the real migrations (in-memory SQLite standing in for D1), with no
network and no Claude spend. They cover set-up and sign-in, isolation between accounts, roles,
credits and refunds, suspension and deletion, invites and resets, the API, webhooks, and the
footer credit and chat widget. Breaking the account filter, the credit charge or the suspension
check each makes them fail.

## The public website

Signed-out visitors to the app's address see the public Forge website instead of the sign-in page
(sign in at `/login`; the first-run "Set up the administrator" link is on that page). It is the
reseller-facing front door: home, how it works, pricing, a reseller program page, trade pages
(one per trade in `src/web-content.ts`), guides, questions, examples, contact, terms and privacy,
plus `/sitemap.xml` and `/robots.txt`. Signed-in people still land on their dashboard at `/`.

- **Words and trades:** `src/web-content.ts`. **Layout and pages:** `src/web-ui.ts`. **Routes, forms and
  settings:** `src/web.ts`.
- **Forms:** contact, "get a sample" and reseller applications are saved in the `inquiries` table
  (limited to 5 per address per hour, with a hidden bot field). Mianro staff read them under
  **Admin → Inquiries**, mark them new / talking / won / closed, and a reseller application has a
  **Create account** button that pre-fills the new-account form.
- **Prices and examples:** **Admin → Website** edits the credit packs shown on the pricing page and
  chooses up to nine demos for the Examples page (only active accounts' demos appear).
- **Terms and privacy** are plain-language drafts; have them reviewed before relying on them.
- Tests: `tests/forge-web.test.ts`.

## Full browser QA (dummy data, nothing touches production)

`npm run forge:qa` starts a throw-away local copy of Forge (its own database, built from the real
migrations; no secrets) and drives it with a real browser through the whole product: crawls every
public page (links, headings, alt text, form labels, console errors, phone-width overflow, mobile
menu, dark mode), sends the three public forms, sets up the administrator, turns a reseller
application into a customer account, accepts the invite, builds a demo, submits a form on it,
creates a team invite and an API key, uses the API, adds credits, changes the footer credit,
features an example, suspends and reactivates the account, and checks sign-in rate limiting.
It needs Playwright (already installed here) and takes about two minutes. Screenshots go to
`cloudflare/forge/qa/shots/`.

## Forge Studio (the creative tier)

Each build is either **Standard** (1 credit) or **Studio** (3 credits), chosen on the build form or
with `"style": "studio"` in the API. A failed Studio build refunds all 3 credits.

A Studio build:
- gets an art-direction brief on top of the normal one (pick one concept, such as editorial, kinetic
  grotesk, cinematic dark or playful, and hold every page to it), with Opus at medium effort for the
  design system and home page and Sonnet (not Haiku) for the inner pages. Expect roughly three to
  five times the Claude cost of a Standard site.
- loads the **motion engine** (`src/motion.ts`) on every page: GSAP 3.15 with ScrollTrigger and
  SplitText and Lenis smooth scrolling from jsDelivr, plus our runtime. Claude only writes HTML
  attributes (`data-split`, `data-scrub-text`, `data-reveal`, `data-stagger`, `data-parallax`,
  `data-marquee`, `data-horizontal`, `data-stack`, `data-counter`, `data-magnetic`,
  `data-cursor-text`, `data-tilt`, `data-distort`, `data-shader`, `data-grain`, `data-follow`); the
  runtime adds the custom cursor, preloader and page transitions.
- fails safe: nothing is hidden by CSS. If the CDN is blocked or the visitor prefers reduced
  motion, every page shows all its content without animation.

The public site shows the tier at `/studio` (itself built with the engine) and a concept site for a
made-up roofer at `/studio/concept`. "Get a Studio preview" requests arrive in Admin → Inquiries
with `tier: studio`.

## After a build: review, views, outreach, changes, bulk

- **Automatic quality check** (`src/review.ts`): a few minutes after a site goes live, a `review`
  job opens it in Cloudflare Browser Run, screenshots it on desktop and phone (saved as
  `shot-desktop.jpg`, `shot-phone.jpg`; a 1200×630 `og.jpg` becomes the link preview), runs checks
  (sideways scrolling, one h1, alt text, broken links and images, script errors, tap-to-call, a
  form, text size), has Claude Sonnet critique the screenshots (a few cents), and when the score is
  under 7 or a hard check fails, writes the home page again with the notes. If the business has a
  website it is captured too (`old-desktop.jpg`, `old-phone.jpg`) and scored, for the before/after
  page at `<site>/_pitch`. Owners can re-run it from the demo page.
  **Budget:** browser seconds are counted per month in `settings` (`browser:YYYY-MM`) and the
  review stops at `BROWSER_BUDGET_SECONDS` (5 hours, half of the 10 the Workers Paid plan includes),
  so Browser Run never bills extra. Admin shows the minutes used. Without the binding, or past the
  budget, sites still go live; the review is just marked skipped.
- **Who looked:** every real page view (bots and link-preview fetchers excluded) is counted per day
  with a hashed visitor id (`demo_views`, `demo_visitors`; hashes kept 60 days). The dashboard
  shows 7-day views; the demo page shows today / 7 / 30 days and a per-day table. The first view of
  each day sends the account's webhook a `demo.viewed` event with that day's counts.
- **Outreach kit:** one click writes an email, a text and a 30-second call script with Haiku, and
  the demo page shows a QR code for the site link (`src/outreach.ts`).
- **Change requests:** "Request a change" rewrites one page of the live site with the instruction
  on the cheaper model (`change` job; no credit, cost recorded as `change`). "Quick text fix"
  replaces an exact phrase on every page with no AI.
- **Bulk builds:** up to 25 businesses at once (a name, `name | city`, or a Google Maps link per
  line). Credits for the batch are checked first; three build at a time and the rest wait with
  status `queued`, started when a build finishes (and by the hourly cron as a safety net).
- **Anti-template rules:** the design brief now names the devices that make a site look AI-made
  (an eyebrow on every heading, numbered markers everywhere, gradient text, identical card grids,
  nested cards, pill-rounded cards) and limits them to deliberate use.

## QA standards and the design floor

- **QA standards** (`src/qa.ts`): the rules Mianro's QA team blocks a site for (from the Design Team Website Tracker): logo links, footer links, legal pages, dead buttons and anchors, social icons without a profile, repeated or empty headings, page titles, forms, phone links. Guards on every page make the commonest faults impossible (logo always links home, pictures open when clicked, `+1` on phone links, legal links in the footer). After a build, every page is linted, repaired (header and footer once, then up to six pages on the mid-priced model), linted again, and the result is shown on the site's page in the app.
- **The floor** (`src/designer.ts`): the tells of a machine-made page are ruled out for every site, and the quality check measures them in a browser (labels above headings, a coloured or italic word in the headline, a long headline, facts joined by dots). Adapted from the ideas in [Hallmark](https://github.com/nutlope/hallmark) (MIT).
- **Studio looks are materials, not plans** (`src/concepts.ts`): each look has its own first screen and scenes; `drawFor` deals each site its own scene order, biggest moment, mirroring, menu and footer, and avoids what the account built recently.
- **Hero first** (Studio, when Browser Run is available): the first screen is designed alone, opened in a browser on desktop and phone, critiqued against its look, revised once if needed, and only then is the rest of the home page written around it.
