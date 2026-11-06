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
- `GET /api/v1/demos/{slug}` · `GET /api/v1/demos` · `GET /api/v1/me`

60 requests a minute per key. Keys are stored only as hashes (shown once). Under **Settings** an
account can set a **webhook** address: it receives signed `demo.ready` / `demo.failed` messages
(and `ping`) so its own automation can post to Google Chat, add a sheet row or update
GoHighLevel. The in-app **API** page documents the messages and how to verify the signature
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
