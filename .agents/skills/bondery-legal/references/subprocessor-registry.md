# Subprocessor registry

Living, code-grounded inventory of vendors that receive or process user or contact data. **More accurate than the Privacy Policy table** until a generated manifest exists (see [long-term-roadmap.md](./long-term-roadmap.md)).

Update this file in the **same PR** that adds or removes a vendor integration.

**Policy source:** `apps/website/src/components/legal/Privacy.tsx` §15 (subprocessors array).

| Status | Meaning |
|--------|---------|
| `in-sync` | Listed in Privacy.tsx and matches code |
| `drifted` | Listed in Privacy.tsx but code differs |
| `undisclosed` | In code but missing or wrong in Privacy.tsx |
| `policy-only` | In Privacy.tsx only; no longer in active code |

## Registry

| Vendor | Purpose | Data categories | Region | Code pointer | Policy sync |
|--------|---------|-----------------|--------|--------------|-------------|
| **Hetzner** | Website, webapp, API hosting | All server-side PII | EU | `deploy/bondery/` | `in-sync` |
| **Postgres** (self-managed) | Primary database | Full app PII | EU (hosted) | `DATABASE_URL`, `packages/db/prisma/` | `drifted` — policy lists **Supabase** instead |
| **Better Auth** | Identity, OAuth AS, sessions | Email, name, provider IDs, session IP/UA | EU (hosted) | `apps/api/src/lib/auth/index.ts` | `undisclosed` — policy lists Supabase for auth |
| **PostHog** | Product analytics (webapp + API server capture) | Pseudonymous events, pageviews; admin may query `person.properties.email` | EU | `apps/webapp/instrumentation-client.ts`, `apps/api/src/services/analytics/posthog-capture.ts`, `BONDERY_PUBLIC_POSTHOG_*` | `in-sync` |
| **Plunk** | Transactional email (SMTP relay) | User email, contact share fields, reminder content | EU/US (Plunk) | `BONDERY_PRIVATE_EMAIL_*` (SMTP → Plunk), `services/notifications/`, `domains/contacts/share.ts` | `in-sync` — code uses generic SMTP env; production credentials are Plunk. See [bondery-emails](../../bondery-emails/SKILL.md) |
| **Anthropic** | AI chat assistant | Chat messages + contact PII from tool results | US | `BONDERY_PRIVATE_ANTHROPIC_API_KEY`, `services/chat/` | `in-sync` |
| **Stripe** | Subscriptions, billing | Email, user UUID, subscription metadata | US / EU | `BONDERY_PRIVATE_STRIPE_*`, `routes/subscriptions/`, `routes/webhooks/stripe.ts` | `in-sync` |
| **GitHub** | OAuth sign-in | Email, name, avatar URL, provider account ID | US | `BONDERY_PRIVATE_AUTH_GITHUB_*`, Better Auth | `undisclosed` — not in subprocessor table |
| **LinkedIn** | OAuth sign-in (OIDC) | Email, name, profile (`openid profile email`) | US/EU | `BONDERY_PRIVATE_AUTH_LINKEDIN_*`, Better Auth | `undisclosed` — not in subprocessor table |
| **Mapy.com** | Geocoding, timezone | Location/address strings from contacts | EU | `BONDERY_PRIVATE_MAPS_KEY`, `lib/integrations/mapy.ts`, `routes/geocode/` | `in-sync` |
| **OpenStreetMap** | Map tiles (browser) | Tile requests (IP, viewport) | — | `apps/webapp/src/components/map/PeopleMapClient.tsx` | `in-sync` |
| **S3-compatible / local disk** | Avatars, LinkedIn logos | Image binary | Config-dependent | `BONDERY_STORAGE_DRIVER`, `BONDERY_PRIVATE_S3_*`, `lib/storage/` | `drifted` — policy attributes storage to Supabase |
| **Redis** | Rate limits, sync wake | Request/user IDs in keys | EU (hosted) | `BONDERY_PRIVATE_REDIS_URL` | `undisclosed` — described under Hetzner notes only |
| **Supabase** | — | — | — | Legacy stubs only (`apps/api/src/lib/data/supabase.ts` unused) | `drifted` — **stale in policy** |

## Data flows not involving third-party SaaS

| Flow | Mechanism | Data | Code pointer |
|------|-----------|------|--------------|
| LinkedIn enrich | Chrome extension scrapes in user's browser → Bondery API | Profile, work/edu, photos | `apps/chrome-extension/.../enrich.ts`, `domains/contacts/enrichment/` |
| Instagram import | User ZIP upload | Usernames, follow dates | `routes/import/instagram/` |
| LinkedIn CSV import | User file upload | Names, emails, companies | `routes/import/linkedin/` |
| vCard import/export | User file / download | Contact PII | `routes/import/vcard/`, `lib/contacts/vcard.ts` |
| Marketing site analytics | Self-hosted Plausible CE on `plausible.usebondery.com` | Aggregate pageviews, referrers, UTMs (no cookies, no PII) | `apps/website/src/app/layout.tsx`, `deploy/plausible/` |

No third-party enrichment API — extension scraping only.

## Adding a new vendor

1. Add a row to this table with `policy-sync: undisclosed`
2. Add env vars to `packages/helpers/src/env/manifest.ts` if applicable
3. Flag Privacy.tsx §15 update for human review (reality-sync or counsel)
4. Read `bondery-security` for technical hardening (auth, secrets, webhooks)
5. For email ESP changes, read [bondery-emails](../../bondery-emails/SKILL.md)

## Registry checklist

- [ ] New vendor row added with purpose, data categories, region, code pointer
- [ ] `policy-sync` status set (`undisclosed` until Privacy.tsx updated)
- [ ] Vendor privacy/DPA URL cited from vendor's site — not guessed
- [ ] Same PR updates registry and code (or flags follow-up issue)
