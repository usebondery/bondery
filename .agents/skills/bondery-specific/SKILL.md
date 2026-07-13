---
name: bondery-specific
description: Bondery-specific architectural decisions, product UX patterns, and their rationale.
metadata:
  version: 0.1.0
---

## References

Consult these resources as needed:

```
references/
  api/              API design, usage, mutations, route ordering, sync (see api/README.md)
  ux/               UX patterns — common/, mobile/, desktop/, product/ (see ux/README.md)
  ux-patterns.md    Redirect to ux/ (legacy path)
```

# Package boundaries

Monorepo shared packages follow a one-way dependency graph:

- `@bondery/schemas` — contract layer (types, Zod **validation** schemas, constants). Must not import any other `@bondery/*` package.
- `@bondery/helpers` — behavior layer (parsing, formatting, geocoding, routes). May depend on schemas.
- `@bondery/helpers/forms` — Zod pipelines that validate with schemas then normalize with helpers. Use on form submit/save.

| Need | Import from |
|------|-------------|
| Type or validation schema | `@bondery/schemas` |
| Utility / formatter | `@bondery/helpers` (subpath) |
| Form submit (validate + normalize) | `@bondery/helpers/forms` |

See `packages/schemas/README.md` and `packages/helpers/README.md`.

## Compiled workspace packages

Shared packages follow the [Turborepo compiled-package model](https://turborepo.dev/docs/guides/tools/typescript#compiled-packages):

- **TypeScript:** extend `@bondery/typescript-config` (`base.json` or `react-library.json`); `module` / `moduleResolution` = NodeNext.
- **Exports:** `types` → `src/`, `default` → `dist/`; run `npm run sync-exports` after adding public subpaths.
- **Internal imports:** `#*` hash paths with `.js` suffix (not `tsconfig` paths).
- **Build:** `rimraf dist && tsc` (+ rewrite hash imports); **compile:** incremental `tsc` for dev cold start; **dev:** `tsc --watch` run alongside apps via Turbo `with`.
- **Apps:** consume `dist/` via exports — no `transpilePackages`, no `packages/*/src` aliases (mobile Metro resolves workspace packages from `src/` separately).

# API usage

All Bondery clients call the Fastify API through a transport wrapper layer — never ad-hoc `fetch` with duplicated auth and error parsing. Read `references/api/api-usage.md` for:

- Which wrapper to use per runtime (webapp browser vs server, mobile, chrome extension)
- `*Json` vs `*JsonOrNull` — throw on error vs graceful `null`
- `@bondery/helpers/api` — `ApiError`, nested error parsing, `getUserFacingError`
- **Unauthorized (401):** clear caches, local sign-out, hard redirect — see `references/api/api-usage.md` § Unauthorized sessions
- Status probe — webapp uses BFF `GET /api/status`; chrome extension calls Fastify `/status` directly

Pair with `references/api/api-mutations.md` when implementing create/update flows.

## Webapp domain module layer

The webapp has a **domain module layer** on top of transport — same idea as mobile `lib/domains/*`, but backed by REST + TanStack Query instead of SQLite sync.

| Layer | Location | Use |
|-------|----------|-----|
| **Resources** | `lib/api/resources/*` | Path builders, response normalizers |
| **Domains** | `lib/api/domains/*`, `lib/api/domains/server/*` | Typed API calls per feature |
| **Query hooks** | `lib/query/hooks/*` | Cache keys, mutations, invalidation |

**Rule:** Feature components and pages call **domain hooks** (`useContactsQuery`, mutation hooks, etc.) — not `clientApiJson` / `serverApiJson` directly. Transport stays in `lib/api/client.ts` and `lib/api/server.ts`.

See `apps/webapp/src/lib/api/README.md` and `references/api/api-usage.md` § Domain modules.


# Mobile local-first data

Tier-1 domain data (contacts, groups, tags, and child tables in `SYNC_TABLE_KEYS`) is **local-first on mobile**:

- **Reads:** `lib/sync/repositories/*` + `useSyncQuery` — never REST list/detail in `features/`.
- **Writes:** `submitSyncMutation` via `lib/domains/*` — optimistic SQLite + unified outbox; drainer pushes immediately when online.
- **Sync:** `PullManager` bootstraps and long-polls `GET /api/sync/pull`; materializers apply server rows into SQLite (server wins on pull).
- **Online-only:** `lib/api/online-only.ts` (settings, geocode, photos, share, vCard, account delete).

Run `npm run check-sync-patterns --workspace=mobile` locally when touching mobile sync code. Full architecture: `references/api/sync-architecture.md`.


# API design

List endpoints follow a shared pagination contract. Read `references/api/api-design.md` for:

- Three response tiers (Paginated / Collection / Capped)
- Query params: `limit`, `offset`, `search`, `sort` — no abbreviations
- Nested `pagination` with `totalCount`, `hasMore`, and echoed `sort`/`search`
- Server-side `hasMore` as the single source of truth for table “load more” UI

Published API reference order follows Fastify **registration order**. Read `references/api/api-route-ordering.md` when adding or reordering routes — path tiers, HTTP method order, sidebar tag order, and CI enforcement.


# UI translations

Do not hardcode user-facing strings in the webapp (or other clients that share `packages/translations`). All visible copy — labels, placeholders, buttons, notifications, aria labels, validation messages — belongs in translation files.

- **Stack:** [i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/) (web) / i18next on mobile. Tooling: [i18next-cli](https://github.com/i18next/i18next-cli) (`npm run i18n:status --workspace=@bondery/translations`).
- **Supported locales:** `en`, `cs`, `de` — source of truth [`packages/schemas/locale/supported-locales.json`](../../packages/schemas/locale/supported-locales.json). Import `SUPPORTED_LOCALES` / `DEFAULT_LOCALE` from `@bondery/schemas/locale` (also re-exported by `@bondery/translations`).
- **Source of truth (strings):** `packages/translations/src/locales/{en,cs,de}/**` — one JSON file per namespace; add every new key to **all** supported locales.
- **Webapp hooks:** `useWebTranslations(namespace, keyPrefix?)`, `useCommonTranslations()`, `useValidationTranslations(keyPrefix?)` from `@/lib/i18n/useWebTranslations`.
- **Namespaces:** Group keys by feature/page (e.g. `GroupsPage`, `ContactInfo`). Shared chrome lives in `common.json` (`actions.cancel`, `feedback.errorTitle`, etc.).
- **Mobile:** `useMobileTranslations(namespace?, keyPrefix?)` or `t("key", { ns: "MobileContacts" })` — never `MobileApp.*` dotted paths.
- **Patterns:** Prefer small hooks for repeated copy (e.g. `useContactInfoLabels`, `useContactsTableCopy`) over duplicating `useMemo` blocks. For modals opened outside React, set the title from the modal component via `modals.updateModal` once `t` is available.
- **CI (translations):** `check-translations`, `check-api-error-translations`, `i18n:types:check`, `i18n:status:check`, `i18n:lint`, `verify-i18next-hook-extraction.mjs` (see root `package.json` / `.github/workflows/verify.yml`).
- **Exceptions:** Non-UI strings (logs, API field names, test IDs) and proper nouns/brand names that should not be translated.

When touching UI, wire strings to translations in the same change — do not leave English literals for a follow-up.


# API errors (Stripe-style)

Machine-readable API failures use a nested envelope: `{ "error": { "type", "code", "message", "request_id", "doc_url", ... } }`.

- **Catalog:** `@bondery/schemas/errors` — `API_ERROR_CODES`, `getErrorDefinition`, `getErrorDocUrl`. Codes are **snake_case** only; no ad-hoc literals in production.
- **Before merge:** every new code needs (1) catalog entry via `apps/api/scripts/generate-api-error-catalog.ts`, (2) docs page at `/docs/api/errors/{code}` on the website, (3) `common.errors.api.{code}` in **en/cs/de**.
- **API:** throw via `badRequest` / `notFound` / `internal` / `new DomainError(...)` with catalog codes; global mapper in `apps/api/src/lib/platform/errors/map-to-response.ts` builds the nested body. Never put internal details in `message` for 5xx.
- **Clients:** import `@bondery/helpers/api` — `ApiError`, `buildApiErrorFromResponse`, `getUserFacingError(error, t)`. Show copy via `getUserMessage(t)` or `getUserFacingError` — **never** surface server `message` in notifications. App transport (`clientApiJson`, `apiRequest`) stays in each app.
- **CI:** `check-route-errors` runs inside `npm run check-types -w apps/api`; also `check-api-error-translations`, `check-error-docs`, `check-user-facing-errors` at repo root.


# Keyboard shortcuts (display)

Do not use Mantine's `Kbd` from `@mantine/core` for shortcut hints in the UI. Use **`Kbd` from `@bondery/mantine-next`** — it wraps Mantine's chip with platform-aware labels via `useOs` (Ctrl vs ⌘, Shift vs ⇧, etc.).

- **Import:** `import { Kbd, parseShortcutKeys } from "@bondery/mantine-next"`.
- **API:** `<Kbd keys={["mod", "k"]} size="xs" />` — pass shortcut **tokens**, not pre-formatted strings. Use `"mod"` for the primary modifier (Ctrl on Windows/Linux, ⌘ on macOS/iOS).
- **With `HOTKEYS`:** `keys={parseShortcutKeys(HOTKEYS.COMMAND_PALETTE)}` — keeps display in sync with `useHotkeys` / Spotlight bindings in `@/lib/platform/config`.
- **Do not** hardcode `Ctrl`, `Cmd`, or `⌘` in JSX; do not translate shortcut labels via i18n (they are OS conventions, not locale strings).
- **Binding vs display:** `HOTKEYS` + `useHotkeys` define behavior; `Kbd` + `parseShortcutKeys` define what the user sees. Keep both pointed at the same constant.


# Using avatars and logos

Contact photos live in Supabase Storage at `avatars/{userId}/{personId}.jpg`. The `people.has_avatar` boolean (maintained by API write paths on upload/delete) gates whether the API returns a public URL in `Contact.avatar` or `null`.

- **Read path:** `resolveContactAvatarUrl()` in the API checks `has_avatar` before constructing the storage URL. Clients should treat `avatar: null` as “show initials” — no phantom requests or 404 fallbacks.
- **Write path:** All avatar uploads and deletes go through `avatar-storage.ts` helpers that update both storage and `has_avatar` together.
- **Components:** Use `PersonAvatar` / `ContactAvatar` / Mantine `Avatar` with `name` + `color` for initials fallback when `avatar` is null.

LinkedIn company/school logos use the separate `linkedin_logos` bucket and are unrelated to `has_avatar`.

# Fastify server

Use Fastify built in console logging functions of `request.log` and `reply.log` instead of `console.log` for better performance, structured logging, and integration with Fastify's logging ecosystem.

**Route schemas:** Use Zod from `@bondery/schemas` and `@bondery/schemas/http` with `fastify-zod-openapi` — not TypeBox. Export route plugins as `AppRoutePlugin` from `apps/api/src/lib/platform/fastify-types.ts`. Put `satisfies FastifyZodOpenApiSchema` on the inner `schema` object (not the route options wrapper). Do not annotate handlers with `reply: FastifyReply` — it breaks request type inference. In `onRoute` hooks, mutate `routeOptions.schema.tags` in place; never `{ ...routeOptions.schema }` (spread drops the plugin symbol config and breaks OpenAPI generation). Call `applyOpenApiRouteMeta(routeOptions, { area })` from `apps/api/src/lib/platform/openapi/meta.ts` on every top-level route plugin (`integration` = API key + bearer, `session` = bearer only, `internal` = hidden from public docs). Every route `schema` must include `description` and `response` — use `withOkResponse` / `withCreatedResponse` from `apps/api/src/lib/platform/openapi/responses.ts` for standard success + error shapes. Shared read models are registered for OpenAPI `$ref`s via `registerOpenApiComponentSchemas()` at API bootstrap. **Registration order is published doc order** — follow `references/api/api-route-ordering.md` when adding routes. Regenerate `apps/api/openapi.yaml` after route changes; see `docs/contributing/api-routes.md`.

# Code review

When reviewing code, focus on the following aspects:

1. **Code Quality**: Ensure the code is clean, well-structured, and follows best practices. Look for readability, maintainability, and adherence to coding standards.
2. **Functionality**: Verify that the code works as intended and meets the requirements.
3. **Performance**: Assess the efficiency of the code, looking for potential bottlenecks or areas where performance can be improved.
4. **Security**: Check for any security vulnerabilities or potential risks in the code.
5. **Edge Cases**: Consider how the code handles edge cases and unexpected inputs.
6. **Documentation**: Verify that the code is well-documented, with clear comments and explanations where necessary.
7. **UX** Consider the user experience implications of the code, ensuring it provides a smooth and intuitive experience for users. Read `references/ux/README.md` — start with `common/` (empty states, loading, lists, writing), then `mobile/`, `desktop/`, or `product/` as needed.

# Supabase extensions schema

Always install Postgres extensions in the `extensions` schema, never in `public`. Installing extensions in `public` is a security risk (Supabase advisor lint `0014_extension_in_public`) because public users can exploit extension objects to escalate privileges.

**Rule:** Every `CREATE EXTENSION` statement in a migration must include `WITH SCHEMA extensions`.

```sql
-- ✅ correct
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ❌ wrong – omitting WITH SCHEMA defaults to public
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

When an extension lives in `extensions`, all references to its functions and operators must be schema-qualified as `extensions.<function>` (e.g., `extensions.unaccent(...)`, `extensions.gin_trgm_ops`, `extensions.word_similarity(...)`).

**Legacy migrations:** `pg_trgm` / `unaccent` were once created in `public` (`20260404100000`) and moved to `extensions` in `20260408100000_move_extensions_to_extensions_schema.sql`. `uuid-ossp` remains in `public` from the initial schema and is unused (tables use `gen_random_uuid()`). New installs should not repeat `CREATE EXTENSION` in `public`; remediate with `ALTER EXTENSION … SET SCHEMA extensions` or drop unused extensions.

# Naming Conventions

## Props

- Boolean props should be prefixed with `is` or `has` to indicate their true/false nature (e.g., `isActive`, `hasPermission`).

## Functions

- get<FunctionName>: Functions that retrieve data or perform a read operation should be prefixed with `get` (e.g., `getUser`, `getContactList`).
- set<FunctionName>: Functions that modify data or perform a write operation should be prefixed with `set` (e.g., `setUser`, `setContactList`).
- is<FunctionName>: Functions that return a boolean value should be prefixed with `is` (e.g., `isUserActive`, `isContactVerified`).
- has<FunctionName>: Functions that check for the presence of something should be prefixed with `has` (e.g., `hasPermission`, `hasAccess`).
