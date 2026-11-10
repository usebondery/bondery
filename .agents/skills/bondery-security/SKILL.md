---
name: bondery-security
description: >
  Bondery security patterns — tenant isolation, auth areas, sessions, secrets,
  input validation, uploads, webhooks, client trust boundaries, and deployment hardening.
  Use when adding authentication, authorization, API routes, secrets, uploads, webhooks,
  payments, sensitive data, extension bridges, or reviewing security-sensitive changes.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Security

## When to use

- Implementing authentication, authorization, or session handling
- Adding or changing API routes, webhooks, or internal service calls
- Handling user input, file uploads, or HTML/markdown rendering
- Working with secrets, env vars, or client token storage
- Integrating payments (Stripe), AI tools, sync WebSockets, or third-party APIs
- Reviewing changes that touch tenant data, cookies, CORS, or extension bridges
- Planning self-hosted deployment or production hardening

Do **not** activate for routine UI refactors, copy changes, or non-security API contract work — use `bondery-api` / `bondery-ux` instead.

## Trust-boundary workflow

1. Identify which trust boundary the change crosses (browser, BFF, API, DB, extension, webhook).
2. Read the matching reference file from the decision tree below.
3. Verify auth is wired through route shells — never ad-hoc in route handlers.
4. Confirm tenant-owned Prisma queries scope by authenticated `userId`, not request input.
5. Run contextual verification commands (see below).
6. Complete the security checklist before merge.

## Non-negotiables (ranked)

1. **Tenant isolation** — `getAuth(request).client` is unscoped Prisma. Every tenant-owned query must filter by `where: { userId: user.id }` (or equivalent join). There is **no RLS** on the current API path. Foreign and nonexistent resources should normally be indistinguishable (404, not 403).
2. **Route shell auth** — Auth hooks live only in `apps/api/src/lib/platform/route-areas.ts`, mounted via `routes/register-all.ts`. Custom-auth routes (webhooks, WS tickets) must implement their own verification.
3. **JWT vs opaque bearer** — JWT-shaped bearer tokens route exclusively to OAuth JWT verification. On failure, return `null` — **never** fall back to `auth.api.getSession`.
4. **Secrets in env only** — Use `packages/helpers/src/env/manifest.ts` (`BONDERY_PRIVATE_*`, `secret: true`). No hardcoded keys, tokens, or passwords.
5. **Public clients never get secrets** — Webapp OAuth client secrets stay server-only. Mobile and extension use PKCE + state validation.
6. **CORS is not authorization** — Trusted origins (`lib/platform/trusted-origins.ts`) control browser cross-origin access, not who can read data.
7. **Webhooks verify raw bytes** — HMAC/signature validation on the exact request body before parsing (Stripe pattern in `routes/webhooks/stripe.ts`).
8. **5xx errors are sanitized** — Client sees generic message; details only in server logs (`map-to-response.ts`).
9. **AI tool arguments are untrusted** — Zod-validate and scope to user-owned domain context; model output never grants authority.
10. **No secrets or PII in logs or client bundles** — Redact tokens, cookies, passwords, and contact PII from structured logs.
11. **CSP is built in exactly one place** — Every policy comes from `@bondery/helpers/security`. No app hand-writes a directive, and `script-src` never carries `'unsafe-inline'`. `pnpm run check:security-headers` enforces both.

## Decision tree

| Task | Read |
|------|------|
| Trust boundaries, route shells, tenant isolation | [references/security-architecture.md](references/security-architecture.md) |
| Better Auth, sessions, API keys, OAuth, client tokens | [references/auth-and-sessions.md](references/auth-and-sessions.md) |
| Input validation, uploads, XSS, errors, public files | [references/input-storage-and-output.md](references/input-storage-and-output.md) |
| Security headers, CSP, Trusted Types, CORS, reporting | [references/headers-csp-and-cors.md](references/headers-csp-and-cors.md) |
| Webhooks, WS, AI tools, extension/mobile bridges | [references/integrations-and-clients.md](references/integrations-and-clients.md) |
| Secrets, env, deploy, Redis, supply chain | [references/secrets-deployment-and-supply-chain.md](references/secrets-deployment-and-supply-chain.md) |
| Security review process, severity, false positives | [references/review-playbook.md](references/review-playbook.md) |

Full index: [references/README.md](references/README.md).

Cross-skill owners: API contracts → `bondery-api`; UI error display → `bondery-ux`; Prisma schema/migrations (classic) → `bondery-database` (Prisma Next → `prisma-next-*` via `bondery-database/references/prisma-skills.md`); generic Postgres indexes/RLS (legacy stack) → `supabase-postgres-best-practices`; E2E auth flows → `bondery-e2e-tests`; policy/subprocessor disclosure accuracy → `bondery-legal`.

## Verification commands

Run only what applies to the change:

```bash
# Route auth wiring + OpenAPI area audit
pnpm run check:types -w api          # includes check-route-security

# OAuth / auth integration (optional; Postgres + migrate required)
pnpm run test:auth -w api

# Env contract drift
pnpm run env -- --check

# Compose secret isolation (self-host)
node deploy/bondery/scripts/check-compose.mjs

# Extension architecture boundaries
pnpm run check:types -w chrome-extension
```

## Known-safe patterns (not bugs)

- API Helmet with **CSP disabled** — JSON API, not HTML (`build-app.ts`)
- Webapp session cookies use **`SameSite=Lax`** — required for OAuth redirect flows
- CORS allows requests **with no `Origin` header** — non-browser clients (`trusted-origins.ts`)
- `GET /files/:bucket/*` is **intentionally unauthenticated** — public avatars/logos by UUID path
- Global rate limit with Redis required in production (`rate-limit.ts`)
- Legacy `apps/supabase-db` RLS migrations apply only to Supabase stacks — **not** the current Prisma API

## Security checklist (before merge)

- [ ] Tenant-owned Prisma queries scoped by authenticated `userId` — not request params alone
- [ ] Route mounted through correct shell (`integration`, `session`, `admin`, `internal`, or custom with explicit auth)
- [ ] `openApiArea` set on every shelled route (CI enforces)
- [ ] Input validated with Zod at route + domain layer
- [ ] New secrets added to `packages/helpers/src/env/manifest.ts` with `secret: true`
- [ ] No secrets, tokens, or PII in logs or client bundles
- [ ] Webhook handler verifies signature on raw body before JSON parse
- [ ] Upload routes enforce MIME whitelist + magic-byte validation (+ intended size limit)
- [ ] 5xx responses use catalog/generic messages — no stack traces to client
- [ ] Policy headers come from `@bondery/helpers/security`; `proxy.ts` exports `config`
- [ ] `pnpm run check:security-headers` passes if a proxy or policy changed
- [ ] CORS changes go through `trusted-origins.ts` and are not treated as authorization
- [ ] Negative tests for unauthenticated, unauthorized, and cross-tenant access where applicable
- [ ] `pnpm run check:types -w api` passes if API routes changed
- [ ] Known gaps documented as review triggers, not silently assumed safe — see reference files
