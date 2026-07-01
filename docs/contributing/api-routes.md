# API routes

Every Fastify route in `apps/api/src/routes/` is part of the published API contract. Docs are **compiled** from Zod schemas — never hand-written per endpoint.

See [schemas.md](./schemas.md) for which `@bondery/schemas` subpaths each app may import.

## Canonical route shape

Relative imports within `apps/api` are **extensionless** (same as `packages/*`). `@bondery/*` workspace imports are unchanged.

```typescript
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse, withCreatedResponse } from "../../lib/openapi-route-responses";
import { contactResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";

export const myRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Contacts"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
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

Nested route modules (e.g. `contacts/enrichment/*`) inherit `onRoute` from the parent plugin — only add `description` and `response` there.

## Checklist for new or changed routes

- [ ] `description` on every route `schema`
- [ ] `response` with `withOkResponse`, `withCreatedResponse`, or explicit status map + `standardErrorResponses`
- [ ] `satisfies FastifyZodOpenApiSchema` on the schema object
- [ ] Request shapes from `@bondery/schemas` or `@bondery/schemas/http` (use `contactIdSchema` for UUID params, not plain `z.string()`)
- [ ] `applyOpenApiRouteMeta` on the top-level route plugin:
  - `integration` — API key + bearer (contacts, groups, tags, interactions, imports, geocode)
  - `session` — bearer only (me, chat, sync, subscriptions, extension, admin)
  - `internal` — hidden from GitBook (`webhooks`, `internal/*`)
- [ ] Handler return shape matches the declared response schema
- [ ] **OpenAPI example** on every success response schema (see below)
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

`npm run test:contracts -w @bondery/schemas` validates every registered example with `schema.parse(example)`. `npm run check-openapi -w apps/api` fails if any `2xx` or `4xx`/`5xx` `application/json` response lacks an `example` or has an empty schema.

## OpenAPI error response examples

Standard errors come from `standardErrorResponses` in `@bondery/schemas/http/responses` (400, 401, 403, 404, 429, 500, 503). They are included automatically by `withOkResponse` / `withCreatedResponse` — no per-route work for most endpoints.

Error examples live in [`packages/schemas/src/openapi/fixtures/errors.ts`](../../packages/schemas/src/openapi/fixtures/errors.ts). The wire shape is `{ error: string }` with optional `retryAfter` on 429 (see `apiErrorResponseSchema`).

| Helper | When to use |
|--------|-------------|
| `conflictResponse` | Route returns 409 with `{ error }` only (API keys, checkout, relationships, important dates) |
| `syncConflictResponse` | Route returns 409 with `{ error, contact }` (contact PATCH sync conflict) |

`generate-openapi` patches duplicate empty error schemas (`schema: {}`) to `$ref: ApiError` — a fastify-zod-openapi limitation when reusing the same Zod component across routes.

## Vercel (separate API project)

Each app (`apps/api`, `apps/webapp`, …) is its own Vercel project with **Root Directory** set to that app folder (for the API: `apps/api`, **not** the monorepo root).

Workspace packages follow the [Turborepo compiled-package model](https://turborepo.dev/docs/guides/tools/typescript#compiled-packages): `types` → `./src/*.ts` (editor IntelliSense), `default` → `./dist/*.js` (runtime). All `build` and `dev` tasks depend on `^build`, so `packages/*/dist` exists before apps start. When adding package subpaths (especially directory barrels like `src/foo/index.ts`), run `npm run sync-exports` from the repo root.

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
| `withOkResponse`, `withCreatedResponse` | App-level helpers that add standard errors (`apps/api/src/lib/openapi-route-responses.ts`) |
| `*ResponseSchema` in entity modules | List/detail/delete shapes (`contactsListResponseSchema`, etc.) |

## Enforcement

| Command | What it checks |
|---------|----------------|
| `npm run check-api-schema-patterns -w apps/api` | Route files have descriptions, responses, `FastifyZodOpenApiSchema` |
| `npm run check-openapi` | Regenerates spec, fails on drift, requires JSON examples on 2xx and 4xx/5xx, bans empty error schemas and "Default Response" on public paths |
| `npm run test:contracts -w @bondery/schemas` | Schema boundary assertions + OpenAPI example validation (`check-openapi-examples.ts`) |

CI runs all of the above on every pull request.

## References

- [Architecture](architecture.md) — API documentation pipeline
- [Geocode routes](../../apps/api/src/routes/geocode/index.ts) — minimal integration example
- [Groups routes](../../apps/api/src/routes/groups/index.ts) — CRUD + pagination example
