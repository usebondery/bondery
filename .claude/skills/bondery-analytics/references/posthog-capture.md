# PostHog capture

Where and how to send product analytics events in Bondery.

## Client capture

**Init:** `apps/webapp/instrumentation-client.ts`

- Reads `posthogKey` and `posthogHost` from `window.__BONDERY_RUNTIME_CONFIG__` (Zod: `webappRuntimeConfigSchema`)
- No init when key absent → silent no-op

**Wrapper:** `apps/webapp/src/lib/analytics/client.ts`

```typescript
import { captureEvent } from "@/lib/analytics/client";

captureEvent("contacts:contact_create");
captureEvent("interactions:interaction_create", {
  activity_type: values.type,
  participant_count: values.participantIds.length,
});
```

- `"use client"` components only
- Do **not** import `posthog-js` directly in feature code
- Do **not** re-export `posthog` from feature modules

## Server capture (webapp)

**Wrapper:** `apps/webapp/src/lib/analytics/server.ts`

```typescript
import { captureServerEvent } from "@/lib/analytics/server";

captureServerEvent(userId, "signup_flow:user_create", {
  signup_method: "email",
});
```

- `distinctId` must be the authenticated **user UUID**
- Uses `posthog-node` with `flushAt: 1` and Next.js `after()` for non-blocking flush
- No-op when `BONDERY_PUBLIC_POSTHOG_KEY` unset

**Today:** `captureServerEvent` has no call sites — use it for growth and authoritative events.

## API capture (future pattern)

For Fastify routes without Next `after()`:

- Use the shared client from `apps/api/src/services/analytics/posthog-client.ts` (`getPosthogClient()`, `null` without a key or in tests) with an explicit `flush()` before the handler returns. Do not construct another `PostHog` instance, or
- Capture from webapp server actions / route handlers that already have session context

Prefer **one authoritative source** per event — do not duplicate client + server for the same action.

## Identity

After login:

```typescript
posthog.identify(userId); // user UUID
```

On logout:

```typescript
posthog.reset();
```

**Status:** `identify` / `reset` are **not wired yet**. See [identity-and-privacy.md](./identity-and-privacy.md). Any auth work touching analytics should add them.

## Event naming

All new events: `category:object_action` per [naming-and-schema.md](./naming-and-schema.md).

Template: [../assets/event-template.ts](../assets/event-template.ts).

## Capture checklist

- [ ] Wrapper used (`captureEvent` / `captureServerEvent`), not raw `posthog.capture`
- [ ] Success boundary — after mutation/API success, not on click alone for CRUD
- [ ] Canonical name in [event-catalog.md](./event-catalog.md)
- [ ] Server capture for growth/truth events
- [ ] `identify` / `reset` updated if auth lifecycle changed
