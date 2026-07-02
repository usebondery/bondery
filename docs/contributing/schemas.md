# Schemas package imports

`@bondery/schemas` is the shared contract layer (types, Zod schemas, constants). Keep imports narrow by consumer so the webapp never loads API-only OpenAPI fixture graphs at runtime.

## Import policy

| Consumer | Allowed imports |
|----------|-----------------|
| webapp | `@bondery/schemas` (types + entity schemas + constants), `@bondery/schemas/constants`, `@bondery/schemas/entities/*`, `@bondery/schemas/supabase.types` — not `@bondery/schemas/http` |
| mobile | `@bondery/schemas`, `@bondery/schemas/sync`, entity subpaths, constants |
| API | Any subpath, including `@bondery/schemas/openapi/*`, `@bondery/schemas/http/responses` |

## Webapp rules

- Do **not** import `@bondery/schemas/openapi/*` at runtime (OpenAPI fixtures and registry are API-only).
- Do **not** import `EXAMPLE_*` or `registerOpenApiComponentSchemas` from the root `@bondery/schemas` barrel.
- `import type { ... } from "@bondery/schemas"` is always fine — types erase at compile time.

`npm run check-schemas-imports:strict` in the webapp enforces these rules in CI.

## API OpenAPI examples

Route-level examples live in `@bondery/schemas/openapi/fixtures/*`. **Runtime modules** (`entities/*`, `sync/*`, root `index.ts`, `contact-id.ts`) must not import those fixtures or attach `.meta({ example })` at module init.

OpenAPI example validation runs in CI only:

- `scripts/openapi-example-fixtures.ts` — maps schema export names → fixture payloads
- `scripts/check-openapi-examples.ts` — validates fixtures against runtime Zod schemas
- `scripts/check-no-init-cycles.mjs` — blocks `#openapi/` imports in runtime paths

`http/index.ts` may inline small request/response samples; it must not import `schema-examples` or `requests` fixture barrels.

## Why this matters

Importing the full OpenAPI fixture barrel from entity modules created a circular module graph when Turbopack bundled `@bondery/schemas` with Zod for SSR, causing `Cannot access '…' before initialization` at runtime. The root barrel must stay web-safe: do not re-export `#http/index.js` or OpenAPI fixture barrels from `src/index.ts`.
