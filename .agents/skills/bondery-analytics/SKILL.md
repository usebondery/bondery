---
name: bondery-analytics
description: >
  Bondery analytics routing and conventions for Plausible (marketing site) and
  PostHog (product analytics, future flags/replay/logs). Use when
  adding tracking events, wiring analytics SDKs, env vars, distinct_id/identity,
  server vs client capture, PostHog naming (category:object_action),
  or debugging missing events.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Analytics

Router and contract enforcer for **Plausible** (marketing) and **PostHog** (product). This skill is not an SDK tutorial — it tells agents which system to use, where capture lives, and what naming/privacy rules must hold.

## When to use

- Adding or changing tracking events, funnels, or KPI instrumentation
- Wiring Plausible (`apps/website`) or PostHog (`apps/webapp`, API, future mobile)
- Server vs client capture, `distinct_id`, identity linking (`identify` / `reset`)
- Analytics env vars, runtime config, CSP for analytics scripts
- PostHog session replay, feature flags, or logs (when adopted)
- Debugging events not appearing (ad blockers, missing env, dev vs prod)

## When not to use

| Topic | Skill |
|-------|-------|
| Privacy policy copy, subprocessors, consent UX | `bondery-legal` |
| PII in API payloads, auth, tenant isolation | `bondery-security` |
| Plausible CE infra deploy (Traefik, Postgres) | `deploy/plausible/` |
| Application error logging outside PostHog Logs | ops runbooks |

## Architecture

```text
apps/website          → Plausible CE (anonymous, aggregate pageviews)
apps/webapp (+ API)   → PostHog EU (identified product analytics)
apps/mobile           → PostHog (future; same naming catalog)
```

**Same signal never in both systems.** Marketing (`apps/website`) stays on Plausible for privacy/legal reasons. Product (`apps/webapp`) stays on PostHog. Bridge marketing → product via UTMs/referrers only — not shared `distinct_id` (unless product explicitly changes this).

PostHog’s generic advice is one project for website + app. **Bondery intentionally does not** follow that — do not add PostHog to the website or Plausible to the webapp.

## Non-negotiables

1. **Route to the right tool** before writing code (Plausible vs PostHog).
2. **PostHog event names** use `category:object_action` — see [references/naming-and-schema.md](references/naming-and-schema.md). Lowercase, snake_case, present-tense allowed verbs only.
3. **Static event and property names** — never `` `page_viewed_${path}` ``; pass variable values as properties.
4. **`distinct_id` = Bondery user UUID** — same format on web, mobile, and server; call `identify()` after login and `reset()` on logout.
5. **No PII in event properties** — no email, name, phone, or contact content in `captureEvent` / `captureServerEvent` payloads.
6. **Growth and truth events on the server** — signup, subscribe, delete, billing (PostHog best practice #7).
7. **No raw `posthog.capture()` in feature code** — use `captureEvent` / `captureServerEvent` wrappers.
8. **Logs ≠ product events** — do not `capture()` infra failures that belong in logs (when PostHog Logs is adopted).
9. **New data flows** → `bondery-legal` checklist (vendors, properties, consent).

## Tool router

| Question | Tool | Surface |
|----------|------|---------|
| Marketing traffic, campaigns, referrers? | Plausible | `apps/website` |
| Feature usage, funnels, retention? | PostHog | webapp, mobile, API |
| Admin DAU / WAU / MAU / NPS? | PostHog product UI | operators use PostHog, not a Bondery page |
| Feature flags, replay, logs? | PostHog (gated) | see [references/posthog-flags-replay-logs.md](references/posthog-flags-replay-logs.md) |

## Server vs client capture

| Client (`captureEvent`) | Server (`captureServerEvent` / API) |
|-------------------------|-------------------------------------|
| UI interactions where partial data is OK | Signup, subscribe, delete, billing |
| Clicks, modal opens, client-only flows | Events that must match DB truth |
| Extension-enriched UX signals | Webhooks, background jobs |

`captureServerEvent` uses Next.js `after()` to flush after the response. API routes need their own flush pattern if capturing server-side.

## Decision tree

| Task | Read |
|------|------|
| Marketing pageviews / Plausible | [references/plausible-website.md](references/plausible-website.md) |
| PostHog naming convention | [references/naming-and-schema.md](references/naming-and-schema.md) |
| Canonical event list | [references/event-catalog.md](references/event-catalog.md) |
| Where / how to capture | [references/posthog-capture.md](references/posthog-capture.md) |
| Identity, PII, internal users | [references/identity-and-privacy.md](references/identity-and-privacy.md) |
| Env vars and runtime config | [references/env-and-runtime-config.md](references/env-and-runtime-config.md) |
| Replay, flags, logs (future) | [references/posthog-flags-replay-logs.md](references/posthog-flags-replay-logs.md) |
| Prove events work | [references/verification.md](references/verification.md) |

Full index: [references/README.md](references/README.md).

Cross-skills: `bondery-legal`, `bondery-security`, `bondery-verification-loop`.

## Repo map (quick)

| Concern | Location |
|---------|----------|
| Plausible website | `apps/website/src/app/layout.tsx`, `apps/website/proxy.ts` |
| Plausible deploy | `deploy/plausible/compose.yml`, `deploy/plausible/README.md` |
| PostHog client init | `apps/webapp/instrumentation-client.ts` |
| Client wrapper | `apps/webapp/src/lib/analytics/client.ts` |
| Server wrapper | `apps/webapp/src/lib/analytics/server.ts` |
| Runtime config schema | `packages/schemas/src/runtime-config.ts` |
| Env manifest | `packages/helpers/src/env/manifest.ts` |

## Adding a new product event (workflow)

1. Confirm **PostHog** (not Plausible).
2. Name the event with `category:object_action` — check [references/event-catalog.md](references/event-catalog.md) first.
3. Choose client vs server — [references/posthog-capture.md](references/posthog-capture.md).
4. Add `captureEvent(...)` or `captureServerEvent(...)` at the **success boundary** (after mutation succeeds).
5. Document in `event-catalog.md` (canonical name + properties).
6. Run [references/verification.md](references/verification.md).
7. `bondery-legal` if new properties or vendor impact.

Snippet template: [assets/event-template.ts](assets/event-template.ts).

## Gotchas

- PostHog initializes only when runtime config includes `posthogKey` (`instrumentation-client.ts`).
- **`identify()` / `reset()`** wired in app shell (`ProductAnalyticsShellSync`) and `endSession.ts`.
- **Product analytics opt-out** implemented — Settings → Data management; see [identity-and-privacy.md](references/identity-and-privacy.md).
- Privacy §6: analytics opt-out UI is available — keep legal docs in sync via `bondery-legal`.
- Default PostHog host: `https://eu.i.posthog.com` (EU).
- Mobile analytics not wired — follow `posthog-capture.md` when added.
- Plausible: `captureOnLocalhost` only in development (`apps/website` layout).

## Analytics checklist (before merge)

- [ ] Correct tool (Plausible vs PostHog) and surface (`website` vs `webapp` / API)
- [ ] Event name follows `category:object_action` — documented in `references/event-catalog.md`
- [ ] Static event name and property keys; variable data in property **values**
- [ ] Property names follow `object_adjective` / `is_*` / `has_*` rules
- [ ] No PII in event properties
- [ ] Server capture for authoritative / growth events
- [ ] `identify` / `reset` considered for auth lifecycle changes
- [ ] No raw `posthog.capture()` outside analytics wrappers
- [ ] Env vars added to manifest if introducing new keys
- [ ] Verified in PostHog Live Events or Plausible realtime (or confirmed no-op when env absent)
- [ ] `bondery-legal` if new vendor, property, or consent impact
- [ ] `bondery-verification-loop` for touched workspaces
