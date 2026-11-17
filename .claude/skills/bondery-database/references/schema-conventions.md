# Schema conventions

Grounded in `packages/db/prisma/` and its generated migrations.

## Multi-file layout

Bondery uses Prisma's multi-file schema (GA since v6.7). Prisma merges all `.prisma` files under the configured directory at generate/migrate time — no imports between files.

```
packages/db/prisma/
├── schema.prisma          # generator + datasource only
├── models/
│   ├── auth.prisma        # Better Auth: User, Session, Account, …
│   ├── oauth.prisma       # OAuth 2.1 provider tables
│   ├── settings.prisma    # enums + UserSettings
│   ├── people.prisma      # People and child tables
│   ├── groups.prisma
│   ├── tags.prisma
│   ├── interactions.prisma
│   ├── linkedin.prisma
│   └── platform.prisma    # billing, chat, sync, geocode, …
└── migrations/
```

**Configuration:** `packages/db/prisma.config.ts` must set `schema: "prisma"` (the directory), not `schema: "prisma/schema.prisma"`. Pointing at the file silently ignores sibling model files in Prisma 7.

**Rules:**

- Keep `generator` and `datasource` in `schema.prisma` at the directory root
- Keep `migrations/` at the same level as `schema.prisma`
- Group models by domain; relations work across files without imports
- Put new models in the file that matches their domain; add a new file only when a domain is large enough to warrant one
- After splitting or moving models, run `pnpm run db:generate` and confirm the client includes all models

## Naming conventions

Prisma layer uses idiomatic TypeScript names; Postgres keeps legacy snake_case via mapping.

| Layer | Convention | Example |
|-------|------------|---------|
| Model | PascalCase, singular | `People`, `UserSettings` |
| Field | camelCase | `firstName`, `createdAt` |
| Relation field | camelCase, descriptive | `lastInteractionActivity` |
| Enum | PascalCase type; lowercase values | `ColorScheme { light dark auto }` |
| DB table | snake_case via `@@map` | `@@map("people")` |
| DB column | snake_case via `@map` | `@map("first_name")` |
| DB enum | snake_case via `@@map` on enum | `@@map("color_scheme")` |

Example:

```prisma
model People {
  firstName String @map("first_name")
  userId    String @map("user_id") @db.Uuid

  @@map("people")
}
```

**Why:** The Prisma schema stays readable in TypeScript; the database keeps column names from the Supabase-era migration so existing rows and raw SQL need no renames.

**Enum vs `String`:** Use a Prisma `enum` for small, stable, app-controlled sets (e.g. `ColorScheme`, `SupportedLocale`). Use `String` for user-generated labels, provider statuses, or values that change often without a migration.

## Primary keys

Existing entity models generally use:

```prisma
id String @id @default(uuid()) @db.Uuid
```

That Prisma default is application-generated UUIDv4. Keep existing IDs intact, but use UUIDv7 for new ID generation. See [uuidv7-strategy.md](./uuidv7-strategy.md).

Legitimate non-UUID keys already exist:

- Composite join keys such as `@@id([interactionId, personId])`
- Protocol sequences such as `SyncChangeLog.serverSequence BigInt @id`
- Provider-owned natural keys such as `PendingSubscription.stripeSubscriptionId`

Do not force UUIDs onto protocol sequences, join-table composite keys, or externally owned identifiers.

## Relations and deletion

The dominant ownership pattern is `onDelete: Cascade`:

- User → tenant-owned data
- People → phones, emails, addresses, socials, dates
- Interaction → participants

Use `SetNull` only when the child remains meaningful without its former parent, such as optional OAuth token/session links.

For every new relation, decide explicitly:

| Behavior | Use when |
|----------|----------|
| `Cascade` | Child is owned by and meaningless without parent |
| `SetNull` | Child remains valid independently |
| `Restrict` | Deleting parent would violate a business invariant |

Do not rely on Prisma defaults for important ownership edges; state `onDelete` explicitly.

## Types

- IDs and foreign keys: `String @db.Uuid`
- Instants: `DateTime @db.Timestamptz(6)` where schema already follows that convention
- Arbitrary user text: Postgres `text` via Prisma `String`
- Money: integer minor units or explicit decimal/numeric semantics; never float
- Geographic points: `Unsupported("geography(Point,4326)")?`

PostGIS fields are not available through Prisma's typed field API. See [raw-sql-and-postgis.md](./raw-sql-and-postgis.md).

## Indexes and uniqueness

Add indexes based on actual query shapes:

- Foreign keys used for joins or cascades
- Tenant filters (`userId`) combined with frequent equality/range predicates
- Composite unique constraints for join tables (`personId`, `groupId`)
- Sort columns when paired with a selective filter

Composite index order: equality predicates first, then range/sort columns. Use the upstream `supabase-postgres-best-practices` `query-*` and `schema-*` references for generic index design and `EXPLAIN (ANALYZE, BUFFERS)` interpretation.

Do not copy every legacy `apps/supabase-db` index blindly. Validate against current Prisma/API query paths.

## Schema and migration must agree

Known drift:

- `People.lastInteractionActivity` has no explicit `onDelete` in Prisma (therefore Prisma assumes Restrict)
- `prisma/migrations/0_init/migration.sql` uses `ON DELETE SET NULL`

Review generated SQL before applying a migration:

1. Compare changed Prisma relations/defaults with SQL constraints
2. Verify `ON DELETE` and `ON UPDATE`
3. Check index names and column order
4. Confirm raw SQL functions still match table/column names

## Schema checklist

- [ ] Model lives in the correct `prisma/models/*.prisma` file
- [ ] `prisma.config.ts` uses `schema: "prisma"` (directory, not single file)
- [ ] Naming follows PascalCase models / camelCase fields / `@@map` tables / `@map` columns
- [ ] Primary-key strategy chosen intentionally (UUIDv7 for new entity IDs)
- [ ] Relation has explicit, justified `onDelete`
- [ ] Foreign-key type exactly matches referenced primary key
- [ ] Common filter/join path has a justified index
- [ ] Prisma schema and migration SQL agree
- [ ] PostGIS fields remain behind raw SQL helpers
