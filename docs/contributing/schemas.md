# Schemas package imports

`@bondery/schemas` is the shared contract layer (types, Zod schemas, constants). Keep imports narrow by consumer so the webapp never loads API-only OpenAPI fixture graphs at runtime.

## Import policy

| Consumer | Allowed imports |
|----------|-----------------|
| webapp | `@bondery/schemas` (types + entity schemas + constants), `@bondery/schemas/constants`, `@bondery/schemas/entities/*`, `@bondery/schemas/supabase.types` |
| mobile | `@bondery/schemas`, `@bondery/schemas/sync`, entity subpaths, constants |
| API | Any subpath, including `@bondery/schemas/openapi/*`, `@bondery/schemas/http/responses` |

## Webapp rules

- Do **not** import `@bondery/schemas/openapi/*` at runtime (OpenAPI fixtures and registry are API-only).
- Do **not** import `EXAMPLE_*` or `registerOpenApiComponentSchemas` from the root `@bondery/schemas` barrel.
- `import type { ... } from "@bondery/schemas"` is always fine — types erase at compile time.

`npm run check-schemas-imports:strict` in the webapp enforces these rules in CI.

## API OpenAPI examples

Route-level examples live in `@bondery/schemas/openapi/fixtures/responses`. Entity schema `.meta({ example })` values come from the internal `schema-examples` module (fixture data only, no Zod datetime init).

## Why this matters

Importing the full OpenAPI fixture barrel from entity modules created a circular module graph when Turbopack bundled `@bondery/schemas` with Zod for SSR, causing `Cannot access '…' before initialization` at runtime. The root barrel must stay web-safe.
