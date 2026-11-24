# PostHog flags, replay, and logs

**Status:** API **logs** and **error tracking** are enabled (see [API logs and error tracking](#api-logs-and-error-tracking-enabled)). Session replay and feature flags are **not** enabled. Read this before adding SDK features beyond basic `capture`.

## API logs and error tracking (enabled)

A failed request must not live only in the API container's stdout. Two pipelines send it to PostHog. Both are off without `BONDERY_PUBLIC_POSTHOG_KEY` (local dev, self-hosted) and in tests.

| Pipeline           | What is sent                                                                        | Where                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Logs**           | Every Pino record at **warn or above**, from Fastify's logger and the shared logger | `apps/api/src/lib/platform/telemetry/posthog-logs.ts`                                                          |
| **Error tracking** | One `$exception` per **5xx** response, plus uncaught exceptions                     | `apps/api/src/services/analytics/capture-server-exception.ts`, called from `setErrorHandler` in `build-app.ts` |

How logs work:

- `@opentelemetry/instrumentation-pino` patches Pino and forwards records over OTLP to `${BONDERY_PUBLIC_POSTHOG_HOST}/i/v1/logs`, authenticated with the project token. Service name: `bondery-api`.
- **Start order matters.** `src/index.ts` imports `instrument.ts` first and loads the server with a dynamic import, so Pino is patched before anything requires it. Keep `index.ts` to those two statements.
- **Only `require("pino")` is patched.** No ESM loader hook is registered. `lib/platform/logger.ts` loads Pino with `require` for this reason. A new logger made with `import { pino } from "pino"` would not be shipped.
- `FilteringLogRecordProcessor` drops records below warn. `telemetry/redact.ts` then replaces the values of `email`, `authorization`, `cookie`, `set-cookie`, `password`, `secret` and `token` keys at any depth, and scrubs email addresses out of all message text. Exceptions get the same email scrub (`scrubExceptionEvent` in `posthog-client.ts`).

Rules when you touch API logging:

- To make something visible in PostHog, log it at **warn** or **error**. Info stays on the server.
- An event that can never succeed (for example a Stripe webhook for a deleted user) is logged at warn and answered 2xx. Do not turn it into a 5xx just to get it noticed.
- Exceptions carry `request_id`, route pattern, method, status and error code, and **no user id**. Logs keep the pseudonymous `userId` UUID. Never add emails, names or request bodies.
- Use the shared client from `services/analytics/posthog-client.ts`. Do not construct another `PostHog` instance.
- `lib/` must not import `services/` (`check:lib-imports`), so exception capture is wired in `build-app.ts`, not in `lib/platform/errors/`.

## Product analytics vs logs vs events

| Signal          | Tool                       | Examples                                             |
| --------------- | -------------------------- | ---------------------------------------------------- |
| User actions    | PostHog **events**         | `contacts:contact_create`, `signup_flow:user_create` |
| System behavior | PostHog **logs** (OTLP)    | API request outcomes, retries, timeouts              |
| UX debugging    | **Session replay** (gated) | Visual repro — privacy review required               |

Do not `capture()` infra failures that belong in logs:

- `database_connection_failed`
- `stripe_api_timeout`
- Step-level "entering function" noise at INFO

See [PostHog logging best practices](https://posthog.com/docs/logs/best-practices).

## Logs: principles

- **Centralize** via OpenTelemetry → PostHog OTLP ingest
- **Wide events at INFO** — one rich log per request per service
- **Step logs at DEBUG** — granular tracing when investigating
- **Structured JSON** — queryable keys, not prose strings
- **Static attribute keys** — same cardinality rules as event properties
- **Business context:** `service`, `route`, `user_id` (UUID), `request_id`
- **Correlate** with product events via `distinct_id` / `request_id` — do not duplicate full payloads
- **Schema as API contract** — version deliberately

### What not to log

- Contact content, emails, passwords, tokens
- Full request/response bodies with PII
- See PostHog automatic PII scrubbing — do not rely on it alone

## Session replay

- Enable only with legal/privacy review (`bondery-legal`)
- Mask sensitive fields in UI
- Not a substitute for product events

## Feature flags

- Same PostHog project as analytics when enabled
- Document flag keys; do not use flags as implicit analytics

## Adoption checklist

- [ ] Product/legal sign-off before replay or new log pipelines
- [ ] Logs separated from product events
- [ ] No PII in log attributes
- [ ] Skill and `bondery-legal` registry updated
