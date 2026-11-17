# Verification

How to prove analytics changes work before merge.

## Local dev — PostHog

1. Set `BONDERY_PUBLIC_POSTHOG_KEY` and `BONDERY_PUBLIC_POSTHOG_HOST` in webapp env (via `pnpm run env` sync).
2. Run webapp; open DevTools → Network.
3. Filter `posthog` or `eu.i.posthog.com`.
4. Trigger the user action.
5. Confirm payload has:
   - Correct **static** event name (`category:object_action`)
   - Expected properties (static keys, values not in event name)

If key unset, confirm **no** PostHog network calls (no-op).

## Local dev — Plausible

1. Set `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN` and `BONDERY_PUBLIC_PLAUSIBLE_HOST` on website.
2. Run website; confirm script loads from Plausible CE host.
3. Navigate marketing pages; check Plausible realtime dashboard.
4. Product webapp routes should **not** send Plausible events.

## PostHog Live Events

1. Open PostHog project → Activity → Live events.
2. Filter by your test user's `distinct_id` (UUID).
3. Confirm event and properties match [event-catalog.md](./event-catalog.md).

Watch for exploding event definitions (sign of dynamic naming).

## Plausible dashboard

Self-hosted CE → site matching `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN` → realtime / pageviews.

## Automated tests

- Mock `captureEvent` when testing components that call analytics
- Do not assert on real PostHog network calls in unit tests
- Run `bondery-verification-loop` for touched workspaces (`check:types` on `apps/webapp/src/lib/analytics/**`)

## PR report template

```markdown
## Analytics verification
- [ ] Tool: Plausible / PostHog (correct surface)
- [ ] Event: `category:object_action` in event-catalog.md
- [ ] No PII in properties
- [ ] Server vs client choice documented
- [ ] Live event / Plausible pageview seen (or no-op when env absent)
- [ ] bondery-legal if new data flow
```

## Verification checklist

- [ ] Network or Live Events confirms event
- [ ] No dynamic event or property key names
- [ ] Wrong-surface regression checked (no Plausible on webapp)
