# API routes

Every Fastify route in `apps/api/src/routes/` is part of the published API contract. Docs are **compiled** from Zod schemas — never hand-written per endpoint. OpenAPI (`apps/api/openapi.yaml`) is committed; lint-staged regenerates it on API/schema changes. CI enforces freshness. Don't rely on deploy to regenerate.

See [schemas.md](./schemas.md) for which `@bondery/schemas` subpaths each app may import.

## Canonical route shape

Relative imports within `apps/api` are **extensionless** (same as `packages/*`). `@bondery/*` workspace imports are unchanged.

```typescript
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { withOkResponse, withCreatedResponse } from "../../lib/platform/openapi/responses.js";
import { contactResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";

export const myRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Contacts"];
    }
  });

  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single contact by UUID.",
        params: uuidParamSchema,
        response: withOkResponse(contactResponseSchema, "Contact details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => { /* ... */ },
  );
};
```

Register the plugin in [`register-all.ts`](../../apps/api/src/routes/register-all.ts) with the correct `area` (`integration`, `session`, `admin`, `internal`, `webhook`, or `composite`). Area shells in [`lib/platform/route-areas.ts`](../../apps/api/src/lib/platform/route-areas.ts) attach auth hooks and `openApiArea` — route modules must not call `registerApiKeyProtectedHooks`, `registerSessionAuthHooks`, or `applyOpenApiRouteMeta` directly.

Nested route modules (e.g. `contacts/enrichment/*`) inherit metadata from the parent shell — only add `description` and `response` there.

## Route ordering in API docs

GitBook renders endpoints in **Fastify registration order** — there is no separate sort step. Full rationale and examples: [`.agents/skills/bondery-specific/references/api-route-ordering.md`](../../.agents/skills/bondery-specific/references/api-route-ordering.md).

### Path tiers

| Tier | Name | Examples |
|------|------|----------|
| 1 | Collection | `GET/POST/DELETE /api/contacts` |
| 2 | Static siblings | `/map-pins`, `/by-social`, `/important-dates/upcoming` |
| 3 | Single resource | `GET/PATCH/DELETE /api/contacts/{id}` |
| 4 | Sub-resources | `/api/contacts/{id}/groups`, `/api/groups/{id}/contacts` |
| 5 | Auxiliary | merge, enrich-queue (`AUXILIARY_FIRST_SEGMENTS` in `@bondery/schemas/openapi/route-order`) |

Same tier → alphabetical by path segment.

### HTTP methods (same path)

`GET → POST → PUT → PATCH → DELETE`

### Sidebar tag order

Integrator dependency order in the `tags` array in [`apps/api/src/openapi/swagger-config.ts`](../../apps/api/src/openapi/swagger-config.ts). Route plugin registration order lives in [`apps/api/src/routes/register-all.ts`](../../apps/api/src/routes/register-all.ts).

`Health → Contacts → Groups → Tags → Interactions → Import → Share → Geocode → Me → Sync → Extension → Chat → Subscriptions → Stats → Webhooks → Internal`

### Checklist when adding routes

- [ ] Route registered in the correct tier (not appended at file bottom by default)
- [ ] Same-path methods follow GET → POST → PUT → PATCH → DELETE
- [ ] New auxiliary paths added to `AUXILIARY_FIRST_SEGMENTS` when tier 5
- [ ] `npm run check-openapi` passes (includes route-order CI check)

## Checklist for new or changed routes

- [ ] `description` on every route `schema`
- [ ] `response` with `withOkResponse`, `withCreatedResponse`, or explicit status map + `standardErrorResponses`
- [ ] `satisfies FastifyZodOpenApiSchema` on the schema object
- [ ] Request shapes from `@bondery/schemas` or `@bondery/schemas/http` (use `contactIdSchema` for UUID params, not plain `z.string()`)
- [ ] New route plugin added to `ROUTE_MOUNTS` in [`register-all.ts`](../../apps/api/src/routes/register-all.ts) with the correct `area`
- [ ] Handler return shape matches the declared response schema
- [ ] **OpenAPI example** on every success response schema (see below)
- [ ] **OpenAPI example** on every JSON request body schema (see below)
- [ ] If the route returns **409**, spread `conflictResponse` or `syncConflictResponse` from `@bondery/schemas/http/responses`
- [ ] If an error status returns a **non-ApiError JSON body**, override that status in `response` (see `GET /health` 503)
- [ ] `npm run build:api` or `npx turbo build --filter=api` from repo root after route/schema changes
- [ ] OpenAPI spec updates automatically via the pre-commit hook when `apps/api` or `packages/schemas` change; run `npm run check-openapi` manually before release if needed

## OpenAPI response examples

GitBook shows route-level `example` payloads (not auto-generated model placeholders). Examples are attached via Zod `.meta({ example })` and wired automatically by `withOkResponse` / `withCreatedResponse` — **no per-route example argument**.

When adding a new `*ResponseSchema`:

1. Add `EXAMPLE_*` to [`packages/schemas/src/openapi/fixtures/responses.ts`](../../packages/schemas/src/openapi/fixtures/responses.ts) (compose from [`fixtures/entities.ts`](../../packages/schemas/src/openapi/fixtures/entities.ts) and [`fixtures/primitives.ts`](../../packages/schemas/src/openapi/fixtures/primitives.ts)).
2. Chain `.meta({ example: EXAMPLE_* })` on the response schema export.
3. Register the schema in [`packages/schemas/scripts/check-openapi-examples.ts`](../../packages/schemas/scripts/check-openapi-examples.ts) if it is a new export.

For inline route-only schemas (e.g. admin stats), attach `.meta({ example })` on the schema in the route file and import the fixture from `@bondery/schemas`.

`npm run test:contracts -w @bondery/schemas` validates every registered example with `schema.parse(example)`. `npm run check-openapi -w apps/api` fails if any `2xx` or `4xx`/`5xx` `application/json` response lacks an `example` or has an empty schema, and if any `POST`/`PUT`/`PATCH` JSON request body lacks an `example`.

## OpenAPI request examples

GitBook shows copy-pasteable request payloads on mutation routes. Examples attach via Zod `.meta({ example })` on the same schema used in `schema.body` — no per-route example argument.

When adding or changing a request body schema:

1. Add `EXAMPLE_*_REQUEST` to [`packages/schemas/src/openapi/fixtures/requests.ts`](../../packages/schemas/src/openapi/fixtures/requests.ts) (compose from [`fixtures/entities.ts`](../../packages/schemas/src/openapi/fixtures/entities.ts) and [`fixtures/primitives.ts`](../../packages/schemas/src/openapi/fixtures/primitives.ts)).
2. Chain `.meta({ example: EXAMPLE_*_REQUEST })` on the body schema export in `@bondery/schemas`.
3. Register the schema in [`packages/schemas/scripts/check-openapi-examples.ts`](../../packages/schemas/scripts/check-openapi-examples.ts) under `REQUEST_SCHEMA_EXAMPLES`.

Guidelines:

- **Create** (`POST`): show required fields only.
- **Update** (`PATCH`/`PUT`): show a small partial payload (one to three fields).
- **Wire shape**: examples are what the client sends (pre-transform input).
- **Shared bodies** (`idsRequestBodySchema`, `tagMembershipRequestSchema`, …): one example reused across routes.
- **No JSON example**: multipart uploads (`POST …/photo`) and body-less creates (`POST /api/chat/sessions`) — document in `description` instead.

## OpenAPI error response examples

Standard errors come from `standardErrorResponses` in `@bondery/schemas/http/responses` (400, 401, 403, 404, 429, 500, 503). They are included automatically by `withOkResponse` / `withCreatedResponse` — no per-route work for most endpoints.

Error examples live in [`packages/schemas/src/openapi/fixtures/errors.ts`](../../packages/schemas/src/openapi/fixtures/errors.ts). The wire shape is `{ error: string }` with optional `retryAfter` on 429 (see `apiErrorResponseSchema`).

| Helper | When to use |
|--------|-------------|
| `conflictResponse` | Route returns 409 with `{ error }` only (API keys, checkout, relationships, important dates) |
| `syncConflictResponse` | Route returns 409 with `{ error, contact }` (contact PATCH sync conflict) |

`generate-openapi` patches duplicate empty error schemas (`schema: {}`) to `$ref: ApiError` — a fastify-zod-openapi limitation when reusing the same Zod component across routes.

## Server bootstrap

The API separates **app assembly** from **runtime boot**:

| Function | Module | Use |
|----------|--------|-----|
| `buildApp()` | [`apps/api/src/build-app.ts`](../../apps/api/src/build-app.ts) | Plugins, swagger, routes — no Redis, JWKS verify, or listen |
| `buildServer()` | [`apps/api/src/build-server.ts`](../../apps/api/src/build-server.ts) | `buildApp()` plus `onReady` (auth JWKS verify, sync wake) and `onClose` shutdown |
| `registerAllRoutes()` | [`apps/api/src/routes/register-all.ts`](../../apps/api/src/routes/register-all.ts) | Ordered route mount table — add new route modules here |

[`apps/api/scripts/generate-openapi.ts`](../../apps/api/scripts/generate-openapi.ts) imports `build-app.ts` directly so OpenAPI generation never loads `index.ts` side effects (auto-listen, Vercel handler). New runtime startup hooks belong in `build-server.ts`, not `build-app.ts`.

### Redis

Long-lived ioredis connections are owned by [`apps/api/src/lib/data/redis.ts`](../../apps/api/src/lib/data/redis.ts):

| Client | Used for |
|--------|----------|
| `getRedisCommands()` | Rate limit, WS tickets, sync wake publish |
| `getRedisSubscriber()` | Sync wake subscribe only |

`build-server.ts` `onClose` calls `shutdownSyncWakeRuntime()` then `shutdownRedis()`. Do not call `new Redis()` elsewhere — CI enforces via `check-redis-singleton`. Health probes use ephemeral clients intentionally.

## API key route policy

Auth and `openApiArea` are applied by **area shells** when routes mount in [`register-all.ts`](../../apps/api/src/routes/register-all.ts). Shells live in [`lib/platform/route-areas.ts`](../../apps/api/src/lib/platform/route-areas.ts):

| `area` in mount table | Shell | API keys |
|-----------------------|-------|----------|
| `integration` | `integrationRoutes` | Allowed (`read` / `full`) |
| `session` | `sessionRoutes` | Denied (session bearer only) |
| `admin` | `adminRoutes` | Denied (admin bearer only) |
| `internal` | `internalRoutes` | Denied (service secret) |
| `webhook` | `openApiAreaRoutes("internal", …)` | HMAC in handler |
| `composite` | passthrough | Plugin composes sub-shells (sync HTTP vs WS) |

Runtime enforcement: [`assertApiKeyAccess`](../../apps/api/src/lib/platform/auth/api-key-access.ts) allows API keys only when `openApiArea === "integration"`.

- **Contacts** — split across [`contactIntegrationRoutes`](../../apps/api/src/routes/contacts/index.ts) and [`contactSessionRoutes`](../../apps/api/src/routes/contacts/session-routes.ts) at the same prefix

CI: `npm run check-route-security -w apps/api` (wired into `check-types`). Boot-time audit: `route-security-audit.test.ts` in `test:api`.

## Layering

The API uses four code layers under `apps/api/src/`. Each layer has a single responsibility — place new code in the correct folder before opening a PR.

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| Routes | `routes/` | HTTP adapter only: Zod/OpenAPI schemas, auth context (`getAuth` / `withDomainRoute`), response shaping. No business logic. |
| Domains | `domains/` | Sync-aware CRM mutations (contacts, groups, tags, import, merge). Emit sync changes via `emitSyncBatch` / `persistSyncChanges`. |
| Services | `services/` | App features and read queries: me, billing, chat, interactions, notifications, admin stats, `*/queries.ts` list/detail reads. |
| Lib | `lib/` | Infrastructure subsystems — see [`lib/README.md`](../../apps/api/src/lib/README.md). No `.ts` files at `lib/` root. |

#### `lib/` subsystems

| Folder | Responsibility |
|--------|----------------|
| `lib/platform/` | Fastify glue, auth, errors, OpenAPI, route shells |
| `lib/data/` | Supabase, Redis, pagination, search, `select-fragments.ts` |
| `lib/contacts/` | Shared CRM primitives (channels, enrichment, avatars) |
| `lib/integrations/` | Third-party adapters (e.g. Mapy geocoding) |
| `lib/extension/`, `lib/import/`, `lib/notifications/` | Extension, import helpers, email transporter |
| `lib/sync/`, `lib/health/` | Sync engine and health probes (existing layout) |

`data/select-fragments.ts` holds reusable Supabase column lists; `services/<area>/queries.ts` holds full read handlers for `GET` routes.

### Where to put new code

| Task | Layer |
|------|-------|
| `POST /api/contacts` create | `domains/contacts/` + thin route |
| `GET /api/contacts` list/search | `services/contacts/queries.ts` + thin route |
| `POST /api/me/feedback` email | `services/notifications/` + thin route |
| AI chat agent, tools, quota | `services/chat/` |
| Offline sync push dispatch | `lib/sync/apply-mutation.ts` → `domains/` |
| Shared contact channel parsing | `lib/contacts/` (used by domains and services) |

**Dependency direction:** `routes` → `services` / `domains` → `lib`. Domains may call `lib/sync` and `lib/contacts`; services may call `lib` and `domains` for orchestration. `lib` must not import from `routes/` or `services/` (CI: `check-lib-imports`).

### Route file structure

Keep route plugins small. Split large resources into focused modules registered from a thin `index.ts`:

```
routes/contacts/
  index.ts           # contactIntegrationRoutes — registers sub-modules
  list-routes.ts     # GET /
  detail-routes.ts   # GET/PATCH/DELETE /:id
  mutation-routes.ts # POST /, DELETE /
  schemas.ts         # route-local Zod query schemas
```

Utility modules under `routes/` (parsers, schemas, route registrars) are listed in [`scripts/route-non-plugin-files.json`](../../apps/api/scripts/route-non-plugin-files.json) so CI does not treat them as mountable route plugins.

## Command layer (mutations)

Mutating handlers (`POST` / `PUT` / `PATCH` / `DELETE`) must not call Supabase write methods directly. Use:

| Layer | Folder | When |
|-------|--------|------|
| CRM commands | [`apps/api/src/domains/`](../../apps/api/src/domains) | Contacts, groups, tags, import, merge — emit sync when touching [`SYNC_TABLES`](../../packages/schemas/src/sync/tables.ts) |
| Platform services | [`apps/api/src/services/`](../../apps/api/src/services) | Me, chat, billing, interactions, notifications — no sync emit |

Route adapter pattern:

```typescript
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { createGroup } from "../../domains/groups/index.js";

fastify.post("/", { schema: { ... } }, withDomainRoute(async (ctx, request, reply) => {
  const { data } = await createGroup(ctx, request.body);
  return reply.status(201).send({ group: data.group });
}));
```

Helpers: [`domainContextFromRequest`](../../apps/api/src/lib/platform/domain-context.ts), [`persistSyncChanges`](../../apps/api/src/lib/sync/persist-changes.ts) (CRM sync emit).

CI enforces no route writes via `npm run check-no-route-writes`.

## Read paths (queries)

`GET` handlers must not embed Supabase query logic inline. Extract reads into `services/<area>/queries.ts` and call from the route:

```typescript
import { listContacts } from "../../services/contacts/queries.js";

fastify.get("/", { schema: { ... } }, async (request) => {
  const { client, user } = getAuth(request);
  return listContacts(client, user.id, request.query, request.log);
});
```

Existing query modules: `services/contacts/queries.ts`, `services/tags/queries.ts`, `services/groups/queries.ts`, `services/interactions/queries.ts`.

## Vercel (separate API project)

Each app (`apps/api`, `apps/webapp`, …) is its own Vercel project with **Root Directory** set to that app folder (for the API: `apps/api`, **not** the monorepo root).

Workspace packages follow the [Turborepo compiled-package model](https://turborepo.dev/docs/guides/tools/typescript#compiled-packages): `types` → `./src/*.ts` (editor IntelliSense), `import` / `node` / `default` → `./dist/*.js` (runtime). All `build` and `dev` tasks depend on `^build`, so `packages/*/dist` exists before apps start. When adding package subpaths (especially directory barrels like `src/foo/index.ts`), run `npm run sync-exports` from the repo root.

The API project uses [`apps/api/vercel.json`](../../apps/api/vercel.json):

1. **Install** — Vercel installs npm workspaces from the monorepo root.
2. **Build** — `turbo build --filter=api` builds workspace packages (`^build`) then the API. No separate package compile step in `vercel.json`.
3. **No API bundler** — no `tsup`, no custom Build Output API scripts.

In the Vercel project settings, enable **Include source files outside of the Root Directory** so builds can read `packages/*`.

`openapi.yaml` is committed; generation is not part of the deploy build.

## Shared primitives

| Import | Purpose |
|--------|---------|
| `contactIdSchema`, `EXAMPLE_CONTACT_ID` | UUID path/body params with OpenAPI examples |
| `EXAMPLE_*` in `@bondery/schemas` | Composed OpenAPI response fixtures (`openapi/fixtures/`) |
| `okResponse`, `createdResponse`, `standardErrorResponses`, `conflictResponse`, `syncConflictResponse` | Low-level response map builders in `@bondery/schemas/http/responses` |
| `withOkResponse`, `withCreatedResponse` | App-level helpers that add standard errors (`apps/api/src/lib/platform/openapi/responses.ts`) |
| `*ResponseSchema` in entity modules | List/detail/delete shapes (`contactsListResponseSchema`, etc.) |

## Enforcement

| Command | What it checks |
|---------|----------------|
| `npm run check-api-schema-patterns -w apps/api` | Route files have descriptions, responses, `FastifyZodOpenApiSchema` |
| `npm run check-route-security -w apps/api` | No auth hooks in routes; mount table covers all plugins; non-plugin files listed in `route-non-plugin-files.json` |
| `npm run check-openapi` | Regenerates spec, fails on drift, requires JSON examples on 2xx and 4xx/5xx, bans empty error schemas and "Default Response" on public paths |
| `npm run check-route-errors -w apps/api` | Bans legacy error patterns; requires `code` on DomainError |
| `npm run test:contracts -w @bondery/schemas` | Schema boundary assertions + OpenAPI example validation (`check-openapi-examples.ts`) |

CI runs all of the above on every pull request.

## Error responses

Every API error JSON body includes a human-readable `error` string and a stable machine `code`. Clients should branch on `code`; display `error` to users for 4xx.

| Status | Wire body | Notes |
|--------|-----------|-------|
| 4xx | `{ error, code }` | Use throw helpers — message is client-safe |
| 5xx | `{ error: "Internal Server Error", code, request_id }` | Generic message only; detail in server logs |
| 409 sync | `{ error, code: "SYNC_CONFLICT", contact }` | Optimistic concurrency |
| 429 | `{ error, code: "RATE_LIMIT_EXCEEDED", retryAfter }` | Rate limit |

### Throwing errors

- **Routes and domains throw** — never `reply.status(5xx)`. The global `setErrorHandler` in `build-app.ts` maps all thrown errors via `map-error-to-response.ts`.
- **Helpers** (`apps/api/src/lib/platform/errors/http-errors.ts`): `unauthorized`, `forbidden`, `badRequest`, `notFound`, `conflict`, `internal`, `serviceUnavailable`.
- **Domain logic**: `throw new DomainError(message, statusCode, code, cause?)` for 4xx; `throw internal(code, cause?)` for 5xx (never leak DB/driver text).
- **Codes**: `SCREAMING_SNAKE` in `apps/api/src/lib/platform/errors/codes.ts` (auth) or entity-specific at call sites (`CONTACT_NOT_FOUND`, `TAGS_LIST_FAILED`). Convention: `{ENTITY}_{ACTION}_{REASON}`.
- **Auth**: migrated to helpers with `AUTH_*` / `API_KEY_*` codes — no `Error + statusCode`.

`npm run check-route-errors -w apps/api` bans `handleDomainError`, `reply.status(5xx)` in routes, `Error + statusCode` in auth, and `DomainError` without `code`.

## References

- [Architecture](architecture.md) — API documentation pipeline
- [Geocode routes](../../apps/api/src/routes/geocode/index.ts) — minimal integration example
- [Groups routes](../../apps/api/src/routes/groups/index.ts) — CRUD + pagination example
