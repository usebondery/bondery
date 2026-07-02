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
  api-design.md        List API tiers, pagination contract, query/response rules
  api-route-ordering.md  Published API doc order (registration order, path tiers, tag sidebar)
  api-usage.md      Transport wrappers (clientApi*/serverApi*/apiRequest), *Json vs *JsonOrNull, ApiError
  api-mutations.md  Mutation responses — return full objects, no post-mutation GET
  sync-architecture.md  Mobile offline sync — pull/bootstrap, push mutations, server-authoritative merge, versioning
  ux-patterns.md    Feedback, progressive disclosure, destructive actions, autofocus, modal blocking dismiss, mobile settings previews & async states, mobile sheets & forms
  mobile-forms.md   React Hook Form patterns for ActionSheetPopup forms (typed useSheetForm, Sheet*Field wrappers, schema output, audit guardrails)
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
- **Build:** `rimraf dist && tsc`; **dev:** `tsc --watch`; root `npm run dev` runs `turbo watch dev` with `^build` on cold start.
- **Apps:** consume `dist/` via exports — no `transpilePackages`, no `packages/*/src` aliases.

# API usage

All Bondery clients call the Fastify API through a transport wrapper layer — never ad-hoc `fetch` with duplicated auth and error parsing. Read `references/api-usage.md` for:

- Which wrapper to use per runtime (webapp browser vs server, mobile, chrome extension)
- `*Json` vs `*JsonOrNull` — throw on error vs graceful `null`
- `ApiError` and shared error parsing
- **Unauthorized (401):** clear caches, local sign-out, hard redirect — see `references/api-usage.md` § Unauthorized sessions
- Webapp: `lib/api/domains/*` + `lib/query/hooks/*` for app data (transport stays in `lib/api/client.ts`)
- Status probe — webapp uses BFF `GET /api/status`; chrome extension calls Fastify `/status` directly

Pair with `references/api-mutations.md` when implementing create/update flows.


# Mobile local-first data

Tier-1 domain data (contacts, groups, tags, and child tables in `SYNC_TABLE_KEYS`) is **local-first on mobile**:

- **Reads:** `lib/sync/repositories/*` + `useSyncQuery` — never REST list/detail in `features/`.
- **Writes:** `submitSyncMutation` via `lib/domains/*` — optimistic SQLite + unified outbox; drainer pushes immediately when online.
- **Sync:** `PullManager` bootstraps and long-polls `GET /api/sync/pull`; materializers apply server rows into SQLite (server wins on pull).
- **Online-only:** `lib/api/online-only.ts` (settings, geocode, photos, share, vCard, account delete).

Run `npm run check-sync-patterns --workspace=mobile` in CI. Full architecture: `references/sync-architecture.md`.


# API design

List endpoints follow a shared pagination contract. Read `references/api-design.md` for:

- Three response tiers (Paginated / Collection / Capped)
- Query params: `limit`, `offset`, `search`, `sort` — no abbreviations
- Nested `pagination` with `totalCount`, `hasMore`, and echoed `sort`/`search`
- Server-side `hasMore` as the single source of truth for table “load more” UI

Published API reference order follows Fastify **registration order**. Read `references/api-route-ordering.md` when adding or reordering routes — path tiers, HTTP method order, sidebar tag order, and CI enforcement.


# UI translations

Do not hardcode user-facing strings in the webapp (or other clients that share `packages/translations`). All visible copy — labels, placeholders, buttons, notifications, aria labels, validation messages — belongs in translation files.

- **Source of truth:** `packages/translations/src/en.json` and `packages/translations/src/cs.json` — add every new key to **both** locales.
- **Webapp hook:** `useWebTranslations` from `@/lib/i18n/useWebTranslations` (same API as `useTranslations("Namespace")`).
- **Namespaces:** Group keys by feature/page (e.g. `GroupsPage`, `ContactInfo`). Reuse `WebAppCommon` for shared chrome (`SuccessTitle`, `ErrorTitle`, `Cancel`, etc.).
- **Patterns:** Prefer small hooks for repeated copy (e.g. `useContactInfoLabels`, `useContactsTableCopy`) over duplicating `useMemo` blocks. For modals opened outside React, set the title from the modal component via `modals.updateModal` once `t` is available.
- **Exceptions:** Non-UI strings (logs, API field names, test IDs) and proper nouns/brand names that should not be translated.

When touching UI, wire strings to translations in the same change — do not leave English literals for a follow-up.


# Using avatars and logos

Contact photos live in Supabase Storage at `avatars/{userId}/{personId}.jpg`. The `people.has_avatar` boolean (maintained by API write paths on upload/delete) gates whether the API returns a public URL in `Contact.avatar` or `null`.

- **Read path:** `resolveContactAvatarUrl()` in the API checks `has_avatar` before constructing the storage URL. Clients should treat `avatar: null` as “show initials” — no phantom requests or 404 fallbacks.
- **Write path:** All avatar uploads and deletes go through `avatar-storage.ts` helpers that update both storage and `has_avatar` together.
- **Components:** Use `PersonAvatar` / `ContactAvatar` / Mantine `Avatar` with `name` + `color` for initials fallback when `avatar` is null.

LinkedIn company/school logos use the separate `linkedin_logos` bucket and are unrelated to `has_avatar`.

# Fastify server

Use Fastify built in console logging functions of `request.log` and `reply.log` instead of `console.log` for better performance, structured logging, and integration with Fastify's logging ecosystem.

**Route schemas:** Use Zod from `@bondery/schemas` and `@bondery/schemas/http` with `fastify-zod-openapi` — not TypeBox. Export route plugins as `AppRoutePlugin` from `lib/fastify-types.ts`. Put `satisfies FastifyZodOpenApiSchema` on the inner `schema` object (not the route options wrapper). Do not annotate handlers with `reply: FastifyReply` — it breaks request type inference. In `onRoute` hooks, mutate `routeOptions.schema.tags` in place; never `{ ...routeOptions.schema }` (spread drops the plugin symbol config and breaks OpenAPI generation). Call `applyOpenApiRouteMeta(routeOptions, { area })` from `lib/openapi-route-meta.ts` on every top-level route plugin (`integration` = API key + bearer, `session` = bearer only, `internal` = hidden from public docs). Every route `schema` must include `description` and `response` — use `withOkResponse` / `withCreatedResponse` from `lib/openapi-route-responses.ts` for standard success + error shapes. Shared read models are registered for OpenAPI `$ref`s via `registerOpenApiComponentSchemas()` at API bootstrap. **Registration order is published doc order** — follow `references/api-route-ordering.md` when adding routes. Regenerate `apps/api/openapi.yaml` after route changes; see `docs/contributing/api-routes.md`.

# Code review

When reviewing code, focus on the following aspects:

1. **Code Quality**: Ensure the code is clean, well-structured, and follows best practices. Look for readability, maintainability, and adherence to coding standards.
2. **Functionality**: Verify that the code works as intended and meets the requirements.
3. **Performance**: Assess the efficiency of the code, looking for potential bottlenecks or areas where performance can be improved.
4. **Security**: Check for any security vulnerabilities or potential risks in the code.
5. **Edge Cases**: Consider how the code handles edge cases and unexpected inputs.
6. **Documentation**: Verify that the code is well-documented, with clear comments and explanations where necessary.
7. **UX** Consider the user experience implications of the code, ensuring it provides a smooth and intuitive experience for users. Read `references/ux-patterns.md` for Bondery-specific patterns covering feedback, progressive disclosure, destructive actions, autofocus, and non-dismissible modals during blocking work.

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

# Naming Conventions

## Props

- Boolean props should be prefixed with `is` or `has` to indicate their true/false nature (e.g., `isActive`, `hasPermission`).

## Functions

- get<FunctionName>: Functions that retrieve data or perform a read operation should be prefixed with `get` (e.g., `getUser`, `getContactList`).
- set<FunctionName>: Functions that modify data or perform a write operation should be prefixed with `set` (e.g., `setUser`, `setContactList`).
- is<FunctionName>: Functions that return a boolean value should be prefixed with `is` (e.g., `isUserActive`, `isContactVerified`).
- has<FunctionName>: Functions that check for the presence of something should be prefixed with `has` (e.g., `hasPermission`, `hasAccess`).
