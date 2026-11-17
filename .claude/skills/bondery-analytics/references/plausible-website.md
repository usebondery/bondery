# Plausible (marketing website)

Plausible Community Edition tracks **anonymous aggregate traffic** on the marketing site only.

## Scope

| In scope | Out of scope |
|----------|--------------|
| `apps/website` pageviews | `apps/webapp` product app |
| Referrers, UTMs, outbound links | User identity, funnels, feature events |
| Cookieless aggregate metrics | PostHog events |

Product analytics remain on PostHog. See `deploy/plausible/README.md`.

## Implementation

**Layout:** `apps/website/src/app/layout.tsx`

- `next-plausible` `PlausibleProvider` wraps children when both env vars are set:
  - `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN` — site hostname registered in Plausible (e.g. `usebondery.com`)
  - `BONDERY_PUBLIC_PLAUSIBLE_HOST` — self-hosted CE base URL (script + ingest)
- `captureOnLocalhost: true` only when `NODE_ENV === "development"`
- Script: `{plausibleHost}/js/script.js` with `data-domain={plausibleDomain}`

**CSP:** `apps/website/proxy.ts` — allow Plausible origin in script/connect directives.

## Ops

| Item | Location |
|------|----------|
| Compose / deploy | `deploy/plausible/compose.yml` |
| Env example | `deploy/plausible/.env.example` |
| Ops domain wiring | `BONDERY_INFRA_PLAUSIBLE_DOMAIN` on ops Dokploy app |

After deploy: register site domain in Plausible admin to match `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN`.

## What agents should not do

- Add Plausible to `apps/webapp` or `apps/mobile`
- Add custom Plausible events in code without product/legal approval (default is pageviews only)
- Add PostHog to `apps/website`
- Send PII or user IDs to Plausible

## Plausible checklist

- [ ] Change is limited to `apps/website` (or deploy/docs for CE)
- [ ] Both `BONDERY_PUBLIC_PLAUSIBLE_*` vars documented if new
- [ ] CSP updated if Plausible host changes
- [ ] No product events or identity on Plausible
- [ ] `bondery-legal` if new data category or vendor change
