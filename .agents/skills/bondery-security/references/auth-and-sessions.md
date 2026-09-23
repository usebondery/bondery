# Auth and sessions

Authentication and session patterns across API and clients.

## Better Auth (identity issuer)

Config: `apps/api/src/lib/auth/index.ts`

- Social providers: GitHub, LinkedIn OIDC
- Passwordless sign-in email: Better Auth `magicLink` plugin (`disableSignUp: false`, `storeToken: "hashed"`, 15-minute expiry). Tokens live in Redis secondary storage (`bondery:auth:verification:<hashed-token>`), not Postgres. A Redis index `bondery:magic-link:prev:<email-hash>` deletes the previous verification on resend. Per-email cap: 3 sends / 15 minutes (`bondery:magic-link:send:<email-hash>`).
- New-user name: OAuth copies the IdP display name onto `User.name` at create (GitHub `name` or `login`, LinkedIn OIDC `name`). Magic-link verify often creates the user with an empty name; `databaseHooks.user.create.before` then sets `User.name` to the email local-part with no case change. `user.create.after` splits that string once onto the myself `people` row (`firstName` / `lastName`) and does not update an existing myself row.
- Session: 30-day expiry, daily refresh; dual-write Postgres + Redis (`secondaryStorage`, `storeSessionInDatabase: true`, key prefix `bondery:auth:`). Redis miss falls back to Postgres — see `docs/adr/0001-better-auth-redis-secondary-storage.mdx`.
- Magic-link verify sets the **API-domain Better Auth session only**. The webapp still needs the OAuth BFF cookie (`bondery_webapp_session`) — `/login` callbacks go to `/auth/start`; `/oauth/login` callbacks go to `/oauth/consent` with the current search. Dual-session is still required after verify.
- `account.encryptOAuthTokens: true` — IdP tokens in `Account` encrypted at rest (AES-256-GCM via Better Auth secret). Do not read those columns via Prisma; use `auth.api.getAccessToken` when a plaintext provider token is required.
- OAuth 2.1 / OIDC provider with PKCE required
- Canonical resource: `BONDERY_PUBLIC_API_URL` with scope `api:access`
- Issuer is always `BONDERY_PUBLIC_API_URL` — not `Host` / `X-Forwarded-*` (`auth/routes.ts`)

OAuth client secrets provisioned at deploy only: `apps/api/scripts/provision-oauth-clients.ts` (not runtime admin API).

## Fastify auth strategies

Registered in `apps/api/src/lib/platform/auth/strategies.ts`:

| Strategy | Use |
|----------|-----|
| `verifySession` | Session or OAuth resource JWT |
| `verifyAuth` | Session, OAuth JWT, or API key |
| `verifyAdmin` | Session + `user.role = admin` (Better Auth platform admin) |
| `verifyServiceSecret` | `BONDERY_PRIVATE_SERVICE_SECRET` bearer |

### JWT vs opaque bearer (no fallback)

```
Bearer token shape?
├── JWT (3 dot-separated segments) → resolveOAuthBearerUser only
│   └── failure → unauthorized (never calls getSession)
└── Opaque → auth.api.getSession (Better Auth native / mobile bearer)
```

OAuth JWT verification checks:
- JWKS signature (`jose`)
- `iss` = `BONDERY_PUBLIC_API_URL`
- `aud` = API resource identifier
- `api:access` scope present
- `client_id` in trusted set (`BONDERY_PUBLIC_OAUTH_CLIENT_ID`, `BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID`)

Integration tests: `apps/api/src/test/auth-integration.test.ts`.

## API keys

`@better-auth/api-key` plugin (`apps/api/src/lib/auth/index.ts`):
- Prefix: `bondery_key_` (`defaultPrefix`)
- Verification: `auth.api.verifyApiKey` in `verifyAuth` (`strategies.ts`)
- Permissions stored as BA JSON (`api: ["read"]` or `api: ["full"]`); product UI/API only exposes `read` and `full`
- Route allowlist: `api-key-access.ts` — integration area only
- Hard cutover: legacy `api_keys` table dropped; users must re-issue keys

API keys shown once at creation in UI — never stored in client localStorage.

## Webapp dual-session model

| Cookie | Domain | Purpose |
|--------|--------|---------|
| Better Auth session | API (`BONDERY_PUBLIC_API_URL`) | Social sign-in, OAuth AS native session |
| `bondery_webapp_session` | Webapp | Encrypted BFF credential for RSC/BFF |
| `bondery_oauth_flow` | Webapp | PKCE verifier + state (10 min TTL) |

**BFF session** (`apps/webapp/src/lib/auth/oauthClient.server.ts`):
- JWE (`dir` + `A256GCM`), key = SHA-256(`BONDERY_PRIVATE_WEBAPP_SESSION_SECRET`)
- `httpOnly`, `sameSite: lax`, `secure` when HTTPS
- OAuth code+PKCE against API AS; includes `resource` on authorize, exchange, refresh

**BFF proxy** (`apps/webapp/src/app/api/[[...path]]/route.ts`):
- Requires decrypted webapp session
- Forwards Bearer OAuth JWT to API — browser never holds API access token in JS for REST

**Token refresh:** `apps/webapp/src/proxy.ts` — refreshes 5 min before expiry.

**CSRF:** No explicit CSRF tokens. Mitigations: `sameSite: lax`, OAuth `state` validation, server-side Bearer injection. Document reliance — do not add cookie-authenticated API endpoints without CSRF analysis.

## Mobile

`apps/mobile/src/lib/auth/client.ts`:
- `@better-auth/expo` — opaque bearer session token
- Native: `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- Web (Expo): falls back to `localStorage` for PKCE verifier survival — flag when reviewing mobile-web flows

Deep link scheme: `bondery://` (trusted origin on API).

## Chrome extension

`apps/chrome-extension/src/lib/auth/index.ts`:
- OAuth tokens in `browser.storage.local` (persists across restarts)
- PKCE + **state CSRF check** on callback (`features/background/oauth.ts`)
- API calls: Bearer + `X-Bondery-Extension-Version` (`lib/api/transport.ts`)
- API calls only from background — enforced by `check-extension-patterns.ts`

**Review trigger:** `storage.local` vs `storage.session` tradeoff for token persistence.

## Extension version gate

`apps/api/src/lib/extension/version-check.ts`:
- Unauthenticated requests without Cookie, Bearer, or extension version → 401
- Extension below `MIN_EXTENSION_VERSION` (generated 3-part previous production CalVer) → 426 `extension_outdated`. `GET /extension/manifest` also exposes `latestVersion` for a non-blocking nudge.
- Skips `/auth/*`, `/webhooks/*`, `/health/*`, `/extension/manifest`

## Service secret (internal)

`verifyServiceSecret` compares `BONDERY_PRIVATE_SERVICE_SECRET` with plain `===` (not timing-safe).

**Review trigger:** consider `timingSafeEqual` for defense-in-depth.

## Auth checklist

- [ ] Route uses correct shell strategy (not custom auth in handler)
- [ ] JWT bearer never falls back to session lookup
- [ ] OAuth JWT checks `iss`, `aud`, `api:access` scope, trusted `client_id`
- [ ] Webapp secrets stay server-only; mobile/extension use PKCE
- [ ] API key verified via Better Auth; route allowlist respected
- [ ] Session cookies: `httpOnly`, appropriate `sameSite`, `secure` in prod
- [ ] OAuth `state` validated on callback flows
