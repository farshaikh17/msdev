# Custom domains for won sites: one-time setup

Forge already does the app side: a site marked **Won** gets a "Their own web address" card, the
address is saved, the customer is told the one DNS record to add, "Check again" looks the record up,
and the sites Worker serves the site at the root of that address. What Forge cannot do by itself is
give a customer's address a certificate and send its visits to the Worker. Cloudflare for SaaS does
that, and it needs a domain of yours on Cloudflare. Forge's own addresses stay on workers.dev.

## Once, in the Cloudflare dashboard (about 15 minutes)

1. **A domain on Cloudflare** for this, e.g. a Mianro domain (call it `mianro-sites.com` here).
2. **Fallback origin:** in that zone, add a DNS record `sites` (proxied, orange cloud), e.g. an
   `AAAA` record to `100::`. Then **SSL/TLS → Custom Hostnames → Fallback Origin**: `sites.mianro-sites.com`.
   (Cloudflare for SaaS must be enabled on the zone; check its current pricing on the Custom Hostnames page.)
3. **Route the traffic to Forge:** **Workers Routes → Add route** `*/*` → Worker `forge-sites`.
   If other subdomains of that zone serve something else, add routes for them with *None*.
4. **Tell Forge the target:** on the `forge-demo` Worker, **Settings → Variables**, add
   `FORGE_DOMAIN_TARGET` = `sites.mianro-sites.com`. (No redeploy needed.)

From then on, each won site's card shows its customer: *CNAME · www · sites.mianro-sites.com*.

## Each new address: by hand, or automatic

- **By hand (no key):** when a rep saves an address, add it under **SSL/TLS → Custom Hostnames → Add
  Custom Hostname** in that zone. About a minute.
- **Automatic (optional):** create an API token with *Zone → SSL and Certificates → Edit* on that
  zone, and add two settings to `forge-demo`: `CF_SAAS_ZONE` (the zone id, a variable) and
  `CF_SAAS_TOKEN` (the token, a **secret**). Forge then registers and removes addresses itself, and
  the card shows when the certificate is issued.

## Notes

- A bare address (`oharaplumbing.com`) usually can't take a CNAME at most domain companies: the card
  says to use `www.` and forward the bare address to it. Forge answers on both forms.
- An address can belong to one site only. Archiving a site removes its address.
- A won site never expires; if its status later changes from Won, its 30-day expiry applies again.
