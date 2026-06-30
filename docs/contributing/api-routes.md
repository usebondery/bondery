# API routes

Every Fastify route in `apps/api/src/routes/` is part of the published API contract. Docs are **compiled** from Zod schemas — never hand-written per endpoint.

## Canonical route shape

```typescript
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { withOkResponse, withCreatedResponse } from "../../lib/openapi-route-responses.js";
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
- [ ] `npm run generate-openapi -w apps/api` and commit `apps/api/openapi.yaml`

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
