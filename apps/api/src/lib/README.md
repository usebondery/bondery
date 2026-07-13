# `apps/api/src/lib`

Infrastructure and shared utilities for the API. **`lib/` root has no `.ts` files** — only subsystem folders. CI enforces this via `check-lib-root.ts`.

## Subsystems

| Folder | Responsibility |
|--------|----------------|
| `platform/` | Fastify glue, auth, errors, OpenAPI, route shells |
| `data/` | Supabase, Redis, pagination, search, SQL select fragments |
| `contacts/` | Stateless CRM primitives shared by domains and services |
| `integrations/` | Stateless third-party adapters with multiple consumers |
| `extension/` | Chrome extension helpers and version check |
| `import/` | Import helpers (data URIs, default groups, LinkedIn) |
| `notifications/` | Email transporter |
| `sync/` | Offline sync engine (do not restructure casually) |
| `health/` | Health probes and routes |

Feature-specific adapters with a single owner live under `services/` instead (e.g. `services/admin/posthog.ts`, `services/billing/polar.ts`).

## Where do I put new code?

| Task | Location |
|------|----------|
| Auth strategy, error helper, OpenAPI wrapper | `platform/` |
| Supabase client, Redis, pagination, shared `SELECT` fragments | `data/` |
| Contact channel/address parsing, enrichment, avatar storage | `contacts/` |
| Geocoding adapter used by import + routes | `integrations/` |
| Extension version enforcement | `extension/` |
| vCard decode, LinkedIn import helpers | `import/` |
| Sync push/pull, conflict resolution | `sync/` |
| Billing-only Polar client | `services/billing/` |
| Admin-only PostHog client | `services/admin/` |

### `data/select-fragments.ts` vs `services/*/queries.ts`

- **`data/select-fragments.ts`** — reusable Supabase column lists and row shapes (`CONTACT_SELECT`, `GROUP_SELECT`, …). Imported by domains, sync, and enrichment helpers.
- **`services/<area>/queries.ts`** — full read handlers: auth-scoped queries, filters, pagination, response assembly. Called from route `GET` handlers only.

## Layering

**Allowed:** `routes` → `services` / `domains` → `lib`

**Forbidden:** `lib` → `routes` or `lib` → `services` (enforced by `check-lib-imports.ts`)

Domains may import `lib/sync`, `lib/contacts`, and `lib/platform/errors`. Services may import `lib` and `domains` for orchestration.

## No barrel files

Import directly from the module file (e.g. `lib/platform/auth/strategies.js`). Do not add `index.ts` re-exports at subsystem roots.
