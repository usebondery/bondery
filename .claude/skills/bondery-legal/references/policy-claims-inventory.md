# Policy claims inventory

Maps checkable factual claims in published legal documents to implementation status. **Gaps are flagged, not hidden.**

**Sources:**
- Privacy: `apps/website/src/components/legal/Privacy.tsx` (August 18, 2026)
- Terms: `apps/website/src/components/legal/Terms.tsx` (November 13, 2026 — **counsel review pending**)

| Status | Meaning |
|--------|---------|
| `implemented` | Code matches the claim |
| `unimplemented` | Policy claims capability; code does not provide it |
| `policy-only` | Stated in policy; no product enforcement |
| `drifted` | Code and policy disagree on facts |

## Terms of Service

| Claim | Location | Status | Notes |
|-------|----------|--------|-------|
| Final contractual terms | `Terms.tsx` | **policy-only** | Full text published November 13, 2026. **Awaiting counsel sign-off** — substantive terms (governing law, liability, withdrawal right) drafted by an agent under `escalation-boundaries.md` and not reviewed by counsel. |
| Age minimum 16 | `Terms.tsx` §2 | `policy-only` | Matches Privacy §11. No signup age gate in webapp, mobile, or API. |
| Premium $10 USD/month, 15-day trial | `Terms.tsx` §6 | `implemented` | `apps/api/src/routes/subscriptions/checkout.ts` sets `trial_period_days: 15`; price on website `Pricing.tsx` |
| Cancel keeps access to period end | `Terms.tsx` §6(d) | `implemented` | `cancel_at_period_end` in `services/billing/stripe-helpers.ts` |
| Non-payment downgrades, does not delete | `Terms.tsx` §6(e) | `policy-only` | Stripe dunning moves the mirror to `canceled`; no data deletion path exists |
| 14-day EU withdrawal right, waiver on start | `Terms.tsx` §7 | `policy-only` | No checkout UI records the waiver. **Counsel item** — the waiver needs a recorded acceptance to be effective. |
| Czech law, courts of Brno, no arbitration | `Terms.tsx` §17 | `policy-only` | Chosen per product decision. **Counsel item** — jurisdiction and liability wording. |
| Liability cap: 12 months of fees or 100 EUR | `Terms.tsx` §14 | `policy-only` | Not mirrored in any contract artifact yet |
| Self-host is operator's own responsibility | `Terms.tsx` §9 | `implemented` | Matches [self-host-vs-cloud.md](./self-host-vs-cloud.md); AGPL-3.0 in root `LICENSE` |
| Contact-data controller split | `Terms.tsx` §4(b) | `policy-only` | Architectural statement, same as Privacy §13 |
| Sub-processor obligations | — | n/a | Deferred to Privacy §15. Table is still `drifted` — see below. |

**Escalate:** the published text is a draft for counsel review. Treat the items marked **Counsel item** as open, and do not present the page as legally reviewed.

## Privacy Policy — data practices

| Claim | Policy § | Status | Evidence |
|-------|--------|--------|----------|
| We do not sell personal information | Intro | `implemented` | No sale code paths |
| User is controller for contact data; Bondery is processor | §2 | `policy-only` | Architectural statement; enforce via tenant isolation (`bondery-security`) |
| Extension only activates on user click | §4 | `implemented` | Extension architecture (`check-extension-patterns.ts`) |
| No biometric data processed | §4 | `implemented` | No biometric collection in schemas. Voice input is disclosed separately in §3(i) |
| Voice input uses the browser engine; Bondery does not receive audio | §3(i) | `implemented` | No audio route, upload, or storage in `apps/api` or the webapp. Client-only `SpeechRecognition` in `lib/speech/dictation/browserDictationEngine.ts` |
| Read aloud runs on the device; no audio leaves the device | §3(i) | `implemented` | `SpeechSynthesis` in `lib/speech/browserSpeechEngine.ts`; no server route |
| GitHub/LinkedIn sign-in: email, name, provider ID only | §5 | `implemented` | Better Auth providers (`lib/auth/index.ts`) |
| Data deleted immediately on account delete | §8 | `implemented` | `services/me/account.ts`, Prisma cascades |
| Backups purged within 30 days after deletion | §8 | **unimplemented** | No automated backup-purge job found |
| IP logs retained up to 90 days then deleted/anonymized | §8 | **unimplemented** | No log-anonymization job found; Session stores IP/UA |
| Data retained while account active | §8 | `implemented` | Standard DB retention |
| Services not intended for children under 16 | §11 | `policy-only` | No signup age gate in webapp/mobile/API |
| GDPR rights; respond within 30 days via email | §12 | `policy-only` | Manual process via `team@usebondery.com` |
| EU-based; SCCs for transfers outside EEA | §13 | `policy-only` | Infra/docs; Anthropic US disclosed |

## Privacy Policy — cookies and analytics

| Claim | Policy § | Status | Evidence |
|-------|--------|--------|----------|
| Essential cookies: auth session, language prefs | §6 | `implemented` | Webapp cookies (`lib/cookies/`, `oauthClient.server.ts`) |
| Analytics cookies; disable in account settings | §6 | `implemented` | Settings → Data management → Product analytics (`productAnalyticsEnabled`); `apps/webapp/src/app/(app)/app/(shell)/settings/components/cards/ProductAnalyticsSection.tsx` |
| Marketing site uses self-hosted cookieless analytics | §6 | `implemented` | `apps/website/src/app/layout.tsx`, `deploy/plausible/`, `BONDERY_PUBLIC_PLAUSIBLE_*` |
| No advertising/tracking/marketing cookies | §6 | `implemented` | No ad SDKs |
| Browser Do Not Track honored for product analytics | §6 | `implemented` | `apps/webapp/instrumentation-client.ts` (`navigator.doNotTrack`) |
| `DO_NOT_TRACK` env disables product analytics | — | `policy-only` | Env var is for third-party CLI telemetry (e.g. Prisma); not wired to PostHog — see long-term-roadmap §6 |
| Cookie consent banner | — | **unimplemented** | No consent UI on website |

## Privacy Policy — subprocessors

| Claim | Policy § | Status | Evidence |
|-------|--------|--------|----------|
| Subprocessor table accurate | §15 | **drifted** | Supabase, Plunk stale; GitHub, LinkedIn, Better Auth, SMTP undisclosed — see [subprocessor-registry.md](./subprocessor-registry.md) |
| Anthropic: only when user messages AI; not for training | §15, docs | `implemented` | Chat routes only; policy-aligned |
| PostHog EU hosting | §15 | `implemented` | Default `eu.i.posthog.com` |

## Privacy Policy — rights and export

| Claim | Policy § | Status | Evidence |
|-------|--------|--------|----------|
| Right to access, rectify, delete, export | §12 | Partial | Delete: `DELETE /api/me` + UI. Export: CRM ZIP (`GET /me/export`) includes contact avatars when present. Import of the user's own CRM ZIP: `POST /me/import`. Per-contact vCard. Still not chat, billing, or API keys; email path remains |
| Exercise rights via `team@usebondery.com` | §12 | `policy-only` | Manual email process |

## Marketing / FAQ (not legal docs, but public claims)

| Claim | Location | Status | Notes |
|-------|----------|--------|-------|
| Hosted on EU servers | `Features.tsx`, FAQ schema | `implemented` | Hetzner EU |
| E2EE planned | FAQ schema | `policy-only` | Future; not implemented |
| TLS + AES at rest | FAQ schema | Partial | TLS yes; app-level encryption at rest not documented in code |

## Claims inventory checklist

- [ ] New feature checked against relevant rows — update status if claim satisfied or contradicted
- [ ] Gaps labeled `unimplemented` or `drifted` — not treated as resolved
- [ ] Substantive claim changes escalated — not silently deleted to hide gaps
- [ ] Registry and inventory updated together when vendors change
