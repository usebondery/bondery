# API routes

Every Fastify route in `apps/api/src/routes/` is part of the published API contract. Docs are **compiled** from Zod schemas — never hand-written per endpoint.

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
- [ ] `npm run build:api` or `npx turbo build --filter=api` from repo root after route/schema changes
- [ ] OpenAPI spec updates automatically via the pre-commit hook when `apps/api` or `packages/schemas` change; run `npm run check-openapi` manually before release if needed

## Vercel (separate API project)

Each app (`apps/api`, `apps/webapp`, …) is its own Vercel project with **Root Directory** set to that app folder (for the API: `apps/api`, **not** the monorepo root).

The API project uses [`apps/api/vercel.json`](../../apps/api/vercel.json):

1. **Install** — Vercel installs npm workspaces from the monorepo root (no `cd ../..` needed).
2. **Build** — `npm run build` runs `tsup` (bundles `@bondery/*` into `dist/index.js`) then copies the bundle to `api/index.js` for the serverless function.
3. **Routing** — `rewrites` send all paths to the `/api` function; Fastify still serves `/api/contacts`, etc.
4. **`framework: null`** — disables Vercel Fastify zero-config on `src/index.ts` (which would deploy unbundled source and fail on `@bondery/*/src/*.ts`).

Do **not** use legacy `builds` / `routes` in `vercel.json` — they disable dashboard build settings and skip `buildCommand` (deploy completes in milliseconds with no install or bundle).

Do **not** list `src/`, `scripts/`, or `tsup.config.ts` in `.vercelignore` — Vercel removes those files before `npm run build`, so `tsup` fails with “No input files”.

**Troubleshooting:** If runtime errors mention `/var/task/apps/api/src/index.js`, Root Directory is set to the repo root — change it to `apps/api`. If `tsup` fails with no input files, check `.vercelignore` is not excluding `src/`.

`openapi.yaml` is committed; generation is not part of the deploy build.

In the Vercel project settings, enable **Include source files outside of the Root Directory** so builds can read `packages/*`.

## Shared primitives

| Import | Purpose |
|--------|---------|
| `contactIdSchema`, `EXAMPLE_CONTACT_ID` | UUID path/body params with OpenAPI examples |
| `okResponse`, `createdResponse`, `standardErrorResponses` | Low-level response map builders in `@bondery/schemas/http` |
| `withOkResponse`, `withCreatedResponse` | App-level helpers that add standard errors (`apps/api/src/lib/openapi-route-responses.ts`) |
| `*ResponseSchema` in entity modules | List/detail/delete shapes (`contactsListResponseSchema`, etc.) |

## Enforcement

| Command | What it checks |
|---------|----------------|
| `npm run check-api-schema-patterns -w apps/api` | Route files have descriptions, responses, `FastifyZodOpenApiSchema` |
| `npm run check-openapi` | Regenerates spec, fails on drift, bans "Default Response" on public paths, Redocly lint |
| `npm run test:contracts -w @bondery/schemas` | Schema boundary assertions |

CI runs all of the above on every pull request.

## References

- [Architecture](architecture.md) — API documentation pipeline
- [Geocode routes](../../apps/api/src/routes/geocode/index.ts) — minimal integration example
- [Groups routes](../../apps/api/src/routes/groups/index.ts) — CRUD + pagination example
