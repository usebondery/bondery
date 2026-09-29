# Integrations and clients

Webhooks, WebSockets, AI tools, extension bridges, and mobile privacy boundaries.

## Webhooks

### Stripe subscriptions

`apps/api/src/routes/webhooks/stripe.ts`:
- **Signature verification** via `stripe.webhooks.constructEvent` on the raw request body
- **Raw body preserved** — custom `application/json` buffer parser; signature over exact bytes
- Rejects if `BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET` unset → `webhook_not_configured`
- Invalid signature → 400 `bad_request`
- Unhandled event types → 200 no-op (idempotent)
- Rate limit disabled
- User resolution: `metadata.bondery_user_id` first, email fallback

**Pattern for new webhooks:** verify signature on raw body before JSON parse; fail closed if secret unset.

### Internal callbacks

No internal HTTP email routes — reminder digests are dispatched via pg-boss only (`services/notifications/reminder-dispatch.ts`).

## Sync WebSocket

`apps/api/src/routes/sync/ws.ts`:
- Short-lived WS ticket (60s TTL, single-use) obtained via authenticated REST (`lib/sync/wake/tickets.ts`)
- **Origin check** against `trusted-origins.ts` allowlist on WS upgrade
- Rate limit exempt for WS + ws-ticket endpoints

Mobile client: `apps/mobile/src/lib/sync/sync-wake-client.ts`.

## AI tools

AI chat routes use `AI_TIER` rate limit (20 req/min).

**Rules:**
- Tool arguments from the model are **untrusted input** — Zod-validate before use
- Tools must operate on user-scoped domain context (`getAuth` + `userId` filter)
- Model output never grants authority or bypasses auth
- Do not expose internal IDs, secrets, or other users' data through tool responses

## CORS and trusted origins

`apps/api/src/lib/platform/trusted-origins.ts`:
- Origins: webapp URL, website URL, `bondery://`, `BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS`
- Dev: `localhost` / `127.0.0.1` wildcards
- `credentials: true`; headers: `Content-Type`, `Authorization`, `X-Bondery-Extension-Version`
- **Requests with no `Origin` header are allowed** — intentional for non-browser clients

Better Auth responses need manual CORS merge via `withCorsHeaders` (`auth/routes.ts`) because of `reply.hijack()`.

CORS is **not** authorization — it controls browser cross-origin access only.

## Chrome extension boundaries

Implementation (WXT entrypoints, interceptors, enrich tab): [bondery-chrome-extension host-integrations](../../bondery-chrome-extension/references/host-integrations.md). This section is the threat model.

### Architecture rules (enforced by CI)

`apps/chrome-extension/scripts/check-extension-patterns.ts`:
- API calls **only from background** — not content scripts
- UI in shadow DOM (`lib/ui/renderInShadowRoot.tsx`)

### Webapp ↔ extension bridge

- Content script: `entrypoints/webapp.content/index.tsx` (hardcoded to `app.usebondery.com` + `localhost`)
- Bridge: `features/webapp-bridge/index.ts`
- Message types: `BONDERY_EXTENSION_PING/PONG`, `BONDERY_AUTH_STATUS_*`, `BONDERY_ENRICH_*`
- Responses posted to `window.location.origin`
- Webapp enrich API checks `event.source === window` + `requestId` match

**Review triggers:**
- Instagram interceptor uses `postMessage(..., "*")` — spoofable profile metadata
- Enrich bridge forwards `event.data.payload` without schema validation at bridge layer
- Content-script host matches don't follow env for staging/custom domains
- Auth status bridge exposes `{ isAuthenticated, user: { id, email } }` to same-origin scripts

### Instagram interceptor

`entrypoints/instagram.content/index.tsx` — MAIN-world script injection (high privilege). Patches `fetch`/`XHR`.

### LinkedIn scraping

Reads JSON-LD via `code.innerHTML` (read-only DOM parse). Auto-enrich trust chain: webapp session → API queue → extension content script.

## Mobile privacy

### SQLite (local-first CRM)

`apps/mobile/src/lib/sync/schema/migrations.ts` — PII: names, emails, phones, addresses, notes.

- **No SQLCipher / encryption at rest**
- WAL mode enabled
- **Wipe on logout / user switch:** `SyncProvider.tsx` → `resetLocalSyncState()` → `wipeSyncDatabase()`
- Push mutations sanitized (UUID + datetime only): `sanitize-push-mutation.ts`

**Threat model:** device compromise = full CRM read. Mitigation = OS-level encryption + wipe on logout.

### Deep links and external URLs

- OAuth: `bondery://` scheme + `@better-auth/expo` callback
- `openExternalUrl` has **no URL allowlist** — opens any string via in-app browser

**Review trigger:** allowlist `openExternalUrl` inputs; audit Android `allowBackup` with SQLite.

### Network

- Bearer on every request; 401 → local sign-out (`lib/api/transport.ts`)
- HTTPS in production via `BONDERY_PUBLIC_API_URL`
- No certificate pinning (typical for RN)

## Email share (SMTP)

`apps/api/src/domains/contacts/share.ts` — `tls: { rejectUnauthorized: false }`.

**Review trigger:** MITM risk on email path; document or fix.

## Analytics / privacy

PostHog: public key via runtime config. `captureEvent` helper warns against PII (`apps/webapp/src/lib/analytics/client.ts`).

Runtime config JSON escaped against `</script>` in layout.

## Integrations checklist

- [ ] Webhook verifies HMAC/signature on raw body before parse
- [ ] Webhook secret required in production (fail closed if unset)
- [ ] WS ticket: short TTL, single-use, origin validated
- [ ] AI tool args Zod-validated; scoped to authenticated user
- [ ] Extension API calls only from background
- [ ] Extension `postMessage` origins reviewed for spoofing
- [ ] Mobile SQLite wipe on logout documented if touching sync auth
- [ ] CORS changes reviewed — not treated as auth
