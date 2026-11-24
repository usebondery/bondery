# UUIDv7 strategy

Bondery needs client-generated IDs for offline-first mobile mutations. UUIDv7 preserves that property while improving insertion locality relative to random UUIDv4.

## Current state

Server-side Prisma models declare:

```prisma
id String @id @default(uuid()) @db.Uuid
```

The `@default(uuid())` is vestigial metadata for TypeScript — Postgres has no database default. IDs are supplied at insert time by `@bondery/helpers/ids` and a Prisma client extension in `@bondery/db` that injects UUIDv7 on `create`, `createMany`, and `upsert` when `id` is missing.

Mobile re-exports the same helper:

```typescript
// apps/mobile/src/lib/sync/ids.ts
export { generateId, isValidUuid } from "@bondery/helpers/ids";
```

Optimistic mobile mutations generate these IDs before synchronization, and API create paths accept client-supplied IDs.

## Policy

- **New entity IDs use UUIDv7**
- Keep the Postgres column type as `uuid`
- Existing UUIDv4 rows remain valid and are never rewritten
- Protocol sequences and composite/natural keys remain unchanged
- Do not introduce a new UUIDv4 `@default(uuid())` for a new entity

UUID versions can coexist in one `uuid` column and primary-key index.

## Recommended server path

Use the shared helper from `@bondery/helpers/ids`:

```typescript
import { generateId } from "@bondery/helpers/ids";

export function createEntityId(): string {
  return generateId();
}
```

API create operations should set `id: input.id ?? generateId()`:

- Preserve mobile's client-supplied UUIDv7
- Generate UUIDv7 for web/API creates
- Avoid dependence on a database extension

The Prisma client extension in `@bondery/db` also injects UUIDv7 when a create path omits `id`, including nested `create` payloads. Do not rely on that as an excuse to skip explicit IDs in new domain code.

## Prisma schema

Models still declare `@default(uuid())` for TypeScript ergonomics on create inputs. Postgres has no database default, and the `@bondery/db` client extension injects UUIDv7 before every `create`, `createMany`, and `upsert` — so new rows get v7 at runtime even though the Prisma metadata references v4.

## Why not DB-generated UUIDv7?

A database default cannot satisfy offline-first records that must have an ID before reaching Postgres. A DB extension could cover server-only inserts but would create two generation paths and an additional operational dependency.

Use one application-level UUIDv7 algorithm across clients and server.

## Index and ordering caveat

UUIDv7 is time-sortable and improves B-tree insertion locality, but API ordering must still use explicit business timestamps and stable tie-breakers. Never replace `ORDER BY created_at, id` with implicit primary-key order without validating semantics.

## UUIDv7 checklist

- [ ] New entity IDs use UUIDv7, not UUIDv4
- [ ] Mobile client-supplied IDs remain accepted
- [ ] Existing UUIDv4 rows remain untouched
- [ ] Every create/upsert/bootstrap path supplies an ID before removing defaults
- [ ] Ordering remains explicit; UUIDv7 is not treated as a business timestamp
- [ ] Rollout is a dedicated verified change, not drive-by cleanup
