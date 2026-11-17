# Identity and privacy

PostHog identity resolution and Bondery privacy constraints.

## distinct_id

- **Format:** Bondery user UUID (same on web, mobile, server)
- **Never:** email, `"system"`, `"backend"`, or catch-all IDs for high-volume non-user streams
- **Anonymous → identified:** call `posthog.identify(userId)` after login so pre-login events merge

`posthog.identify(userId)` runs in `ProductAnalyticsShellSync` after shell session load. `posthog.reset()` runs in `endSession.ts` on logout.

## PII in event properties

**Never include in `captureEvent` / `captureServerEvent` / `captureProductEvent` properties:**

- Email, name, phone, address
- Contact notes, message bodies, LinkedIn URLs with identifying content
- Free-text feedback strings (use booleans or scores only)

**Allowed:**

- User UUID as `distinct_id` (not as a redundant property unless needed for server capture)
- Coarse enums: `signup_method`, `activity_type`, `import_source`
- Counts: `participant_count`, `item_count`
- Booleans: `has_general_feedback`, `is_subscribed`, `is_first_import`

Do not send email or other PII as event properties. Person profile data in PostHog stays in PostHog — it is not event payload PII.

## Product analytics opt-out

| Control | Behavior |
|---------|----------|
| Settings toggle (`productAnalyticsEnabled`) | Stored on `user_settings`; drives PostHog `opt_in` / `opt_out` |
| Browser DNT (`navigator.doNotTrack`) | Honored in `instrumentation-client.ts` — opts out regardless of user preference |
| Server capture | `captureProductEvent` checks `productAnalyticsEnabled` before sending |

The settings UI is in **Settings → Data management → Product analytics**. Copy describes **pseudonymous** usage data, not full anonymization.

`DO_NOT_TRACK` env var is for third-party tooling (e.g. Prisma CLI telemetry) — **not** used to disable product analytics.

## Internal users

Filter team usage so metrics are not inflated:

- Tag events with `is_employee: true` for internal accounts, or
- Filter `@bondery` emails in PostHog dashboards
- Exclude `localhost`, staging hosts in production dashboards
- No capture in dev when keys unset (already true for PostHog)

Plausible: `captureOnLocalhost` only in development on the website.

## Consent and legal

| Claim / area | Status |
|--------------|--------|
| Analytics opt-out UI | **Implemented** — Settings → Data management |
| Browser DNT | **Implemented** — `instrumentation-client.ts` |
| Plausible cookieless marketing analytics | Implemented on website |
| PostHog product analytics | Webapp + API when keys configured |

New events or properties → `bondery-legal` data-flow workflow and subprocessor registry.

## Reverse proxy (ad blockers)

PostHog recommends a reverse proxy so events use your domain and survive blockers. Not implemented in Bondery today.

## Identity checklist

- [ ] `distinct_id` is user UUID (consistent casing/format across platforms)
- [ ] No PII in event properties
- [ ] `identify` on login and `reset` on logout (when auth code touched)
- [ ] `productAnalyticsEnabled` respected on client and server capture
- [ ] Internal/test traffic filtered in dashboards or tagged
- [ ] `bondery-legal` for new data flows
