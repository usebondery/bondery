# Sending and environment

## Production ESP

**Plunk via SMTP.** The API uses Nodemailer with generic env vars; production credentials point at Plunk's SMTP endpoint (dashboard → SMTP settings). Code does not import Plunk SDK.

Production default: **`next-smtp.useplunk.com:587`** (STARTTLS).

## Environment variables

Required in dev/prod for API (`packages/helpers/src/env/manifest.ts`, group `Email`):

| Variable | Purpose |
|----------|---------|
| `BONDERY_PRIVATE_EMAIL_HOST` | SMTP host (Plunk: `next-smtp.useplunk.com`) |
| `BONDERY_PRIVATE_EMAIL_PORT` | Port — **587** (STARTTLS, production) or **465** (implicit TLS) |
| `BONDERY_PRIVATE_EMAIL_USER` | SMTP username |
| `BONDERY_PRIVATE_EMAIL_PASS` | SMTP password |
| `BONDERY_PRIVATE_EMAIL_ADDRESS` | From address (e.g. `robot@usebondery.com`) |

Declared in `apps/api/src/env-schema.ts`, `.env.local.example`, `deploy/bondery/.env.example`.

## Shared transporter API

`apps/api/src/lib/notifications/transporter.ts`:

| Function | Use |
|----------|-----|
| `initEmailTransport(log?)` | Eager SMTP verify on `onReady` (before jobs); boot fails on missing env or verify failure in development and production |
| `verifyEmailTransport()` | Re-verify shared pool (`/health/ready` when cache is cold) |
| `getEmailTransportReadiness()` | Last verify result for health reporting |
| `isEmailConfigured()` | Check SMTP env before send |
| `getEmailConfig()` | Cached config (`fromAddress`, etc.) after first send |
| `getEmailTransporter()` | Lazy singleton pool (internal; prefer `sendRenderedEmail`) |
| `sendRenderedEmail(options, log?)` | Send HTML + plaintext (`multipart/alternative`) via the shared pool; logs and rethrows on failure |
| `shutdownEmailTransporter()` | Close pool on app shutdown (`build-server.ts` `onClose`) |
| `emailTransportOptions(config)` | Port-aware TLS + pool options (unit tests) |

**Senders call `sendRenderedEmail` only** — never `createTransport` from services.

### Transporter lifecycle (Nodemailer pooling)

1. **One transporter per process** — each `createTransport()` is a separate pool. Bondery uses a module singleton (`getEmailTransporter()`).
2. **Match `maxConnections` / `maxMessages` to provider limits** — defaults: `pool: true`, `maxConnections: 3`, `maxMessages: 100` (Plunk-safe). Tune in `transporter.ts` if provider docs require it; no env vars.
3. **`idle` event for high-volume sending** — pull-based queue draining when SMTP is the bottleneck. **Not implemented today**; senders use sequential `sendRenderedEmail` in loops. Consider bounded concurrency first if digest batches routinely exceed ~500 sends/run.
4. **Close the pool on shutdown** — `shutdownEmailTransporter()` in `build-server.ts` `onClose`, **after** `stopJobs()` so pg-boss workers finish in-flight sends.
5. **Eager verify on startup** — `initEmailTransport()` in `build-server.ts` `onReady`, **before** `startJobs()`. Development and production boot fail if SMTP env is missing or verify fails. `NODE_ENV=test` (CI) skips live verify.

### TLS and port

| Port | `secure` | `requireTLS` | Cert verify |
|------|----------|--------------|-------------|
| 465 | `true` | `false` | `rejectUnauthorized: true` |
| 587 | `false` | `true` | `rejectUnauthorized: true` |
| Loopback (`127.0.0.1` / `localhost`) in non-production | `false` | `false` (`ignoreTLS: true`) | unused |

Development and other non-production, non-test boots **throw** when `BONDERY_PRIVATE_EMAIL_HOST` is not loopback. Message: start Mailpit (`pnpm run start:mailpit`) and set `BONDERY_PRIVATE_EMAIL_HOST=127.0.0.1`. Production still uses STARTTLS on 587 / implicit TLS on 465.

## From / replyTo / CC conventions

The SMTP **address** is always `BONDERY_PRIVATE_EMAIL_ADDRESS` (e.g. `robot@usebondery.com`). That is env (secret/deploy). The **display name** is one product constant in `apps/api/src/lib/notifications/email-from.ts` — **not env**:

```typescript
export const EMAIL_FROM_DISPLAY_NAME = `Robot from ${LEGAL_ENTITY.brandName}`;
// "Robot from Bondery"
```

Call `formatEmailFrom(config.fromAddress)` for **every** product email (sign-in, welcome, share, digest, trial, account deleted, feedback). Do not invent per-email From names. Do not add `BONDERY_PRIVATE_EMAIL_FROM_NAME`. White-label (self-host operator name + logo + legal entity) is a product feature, not a single SMTP env var.

| Email type | From | Reply-To | CC |
|------------|------|----------|-----|
| Automated product (trial, digest, account deleted, welcome, sign-in link) | `formatEmailFrom(address)` | From address (where set) | — |
| User-initiated share | `formatEmailFrom(address)` | Sender's email | Sender's email |
| Internal feedback | `formatEmailFrom(address)` | User email | User email |

Avoid `no-reply@` From addresses — use reply-capable addresses; set `replyTo` when the user should be able to respond.

Senders must pass **both** `html` and `text` from `renderEmailParts` ([`toPlainText`](https://react.email/docs/utilities/render#4-convert-to-plain-text)). Nodemailer then sends `multipart/alternative`.

## Graceful degradation

In **`NODE_ENV=test`** (CI), SMTP may be absent — automated sends no-op when unconfigured:

```typescript
if (!isEmailConfigured()) {
  log?.warn("Skipping email: SMTP is not configured");
  return;
}
```

In development and production, missing SMTP fails boot via `initEmailTransport()`; senders should still guard with `isEmailConfigured()` for safety.

User-initiated sends (share contact) return API errors (`email_service_not_configured`) when SMTP is missing.

## Health check

`GET /health/ready` (readiness) live-verifies SMTP via the shared transporter pool when the health cache is cold (60s TTL). Missing SMTP env marks the service unhealthy (`configured: false, ok: false`) in development and production. In `NODE_ENV=test`, unconfigured SMTP is not critical (`configured: false, ok: true`). Misconfigured SMTP (vars present, verify fails) is always unhealthy → HTTP 503.

`GET /health/live` (liveness) does not check SMTP.

Development and production run eager `initEmailTransport()` before pg-boss jobs start; boot fails on missing env or verify failure. CI (`NODE_ENV=test`) skips live verify.

## Changing ESP

1. Update Plunk (or new provider) credentials in deployment env
2. Update [subprocessor registry](../../bondery-legal/references/subprocessor-registry.md) and Privacy Policy in the same PR
3. Verify DNS (SPF/DKIM/DMARC) — see [deliverability.md](./deliverability.md)
