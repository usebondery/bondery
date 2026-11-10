# Fastify server

## Logging

Use Fastify built-in `request.log` and `reply.log` instead of `console.log` for structured logging and performance.

## Route schemas

- **Validation:** Zod from `@bondery/schemas` and `@bondery/schemas/http` with `fastify-zod-openapi` — not TypeBox
- **Export:** route plugins as `AppRoutePlugin` from `apps/api/src/lib/platform/fastify-types.ts`
- **Schema placement:** `satisfies FastifyZodOpenApiSchema` on the inner `schema` object (not the route options wrapper)
- **Handlers:** do not annotate with `reply: FastifyReply` — breaks request type inference
- **`onRoute` hooks:** mutate `routeOptions.schema.tags` in place; never `{ ...routeOptions.schema }` (spread drops plugin symbol config and breaks OpenAPI generation)

## OpenAPI metadata

Call `applyOpenApiRouteMeta(routeOptions, { area })` from `apps/api/src/lib/platform/openapi/meta.ts` on every **top-level** route plugin:

| Area | Auth |
|------|------|
| `integration` | API key + bearer |
| `session` | Bearer only |
| `internal` | Hidden from public docs |

Every route `schema` must include `description` and `response`. Use `withOkResponse` / `withCreatedResponse` from `apps/api/src/lib/platform/openapi/responses.ts` for standard success + error shapes.

Every inline property and every parameter needs a description. Add `.describe()` on the Zod field that the spec emits. `.extend()`, `.pick()`, and a copied `.shape` drop the parent description. Set it again on those fields. A property that is only a `$ref` uses the target schema. `pnpm run check:openapi` fails when a published property or parameter has no description.

Shared read models register for OpenAPI `$ref`s via `registerOpenApiComponentSchemas()` at API bootstrap.

## Registration order

**Registration order is published doc order** — follow [api-route-ordering.md](./api-route-ordering.md) when adding routes.

After route changes:

1. `pnpm run generate:openapi -w api`
2. Confirm order in diff
3. See `docs/contributing/api-routes.mdx`

## Path constants

Canonical route prefixes: `API_ROUTES` in `packages/helpers/src/globals/paths.ts`. Mount order: `apps/api/src/routes/register-all.ts`.

Fastify mounts routes **without** `/api` prefix. Webapp BFF prepends `/api` via `toBffApiPath()`.

## Checklist

- [ ] Zod schemas from `@bondery/schemas` — not TypeBox
- [ ] `AppRoutePlugin` export; `satisfies FastifyZodOpenApiSchema` on inner schema
- [ ] `applyOpenApiRouteMeta` with correct `area`
- [ ] `description` + `response` on schema; standard error responses included
- [ ] Every inline property and every parameter has a `.describe()`. `check:openapi` fails when one is missing.
- [ ] Route registered in correct tier and method order
- [ ] `openapi.yaml` regenerated
