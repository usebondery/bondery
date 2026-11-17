# Raw SQL and PostGIS

Prisma is the default data-access layer. Raw SQL is reserved for Postgres capabilities Prisma cannot express well: PostGIS geography, pg_trgm ranking, atomic sync helpers, and reusable database functions.

## Canonical SQL location and lifecycle

`packages/db/prisma/sql/functions.sql` contains:

- Extensions
- Immutable helper functions
- Idempotent indexes
- Search, map, sync, quota, enrichment, and reporting RPCs

`packages/db/scripts/apply-sql-functions.ts` applies the file. `release-migrate.ts` runs:

1. `prisma migrate deploy`
2. SQL functions/indexes
3. OAuth client provisioning

Reusable database behavior belongs in `functions.sql`, not scattered application `$executeRaw` calls.

## Extension placement

Canonical rule lives in `bondery-core`: create extensions with `WITH SCHEMA extensions`, then schema-qualify their functions/operators.

Known gap: current `functions.sql` still creates `uuid-ossp` and `postgis` without `WITH SCHEMA extensions`. `pg_trgm` and `unaccent` are installed in `extensions` by the Prisma relocate migration and `apply-sql-functions.ts`. Treat remaining public-schema creates as existing drift, not a pattern to copy.

New extension work must:

- Use the `extensions` schema
- Confirm the extension supports relocation
- Qualify calls/operator classes as required
- Update existing SQL functions and indexes consistently

## Parameterized application calls

Use Prisma tagged templates:

```typescript
const rows = await client.$queryRaw<Row[]>`
  SELECT id, rank
  FROM search_people_ids(
    ${userId}::uuid,
    ${query},
    ${limit},
    ${offset}
  )
`;
```

Never interpolate user input into `$queryRawUnsafe` or `$executeRawUnsafe`.

Dynamic identifiers cannot be parameterized like values. Prefer a fixed allowlist mapped to static SQL branches.

## pg_trgm contact search

Current search path:

- SQL: `search_people_ids` in `functions.sql`
- Wrapper: `apps/api/src/lib/data/search-prisma.ts`
- Consumer: contact page query service, pickers, Find person spotlight

The function filters by `user_id`, excludes `myself`, and matches when `extensions.word_similarity` of the unaccented/lowercased query against first, middle, or last name exceeds 0.3. Rank is `GREATEST` of those per-token scores plus concatenated first-middle-last and last-middle-first. There is no minimum query length.

GIN indexes are per-column (`idx_people_first_name_trgm`, `idx_people_last_name_trgm`, `idx_people_middle_name_trgm`) on `immutable_unaccent(lower(coalesce(<col>, '')))` using `extensions.gin_trgm_ops`. The index expression must match the function expression exactly. If normalization or the per-column expression changes, update both function and indexes and verify with `EXPLAIN (ANALYZE, BUFFERS)`.

`pg_trgm` and `unaccent` live in schema `extensions`. Call `extensions.word_similarity`, `extensions.unaccent`, and `extensions.gin_trgm_ops` with that qualifier.

Do not replace this with generic full-text search guidance: Bondery uses pg_trgm `word_similarity`, not `to_tsvector`, for names.

## PostGIS

Prisma models geography as:

```prisma
gisPoint Unsupported("geography(Point,4326)")?
```

Patterns:

- Writes through parameterized SQL helpers such as `ST_GeogFromText`
- Reads through bbox RPCs (`get_map_pins_in_bbox`, `get_map_address_pins_in_bbox`)
- Coordinates originate from Mapy geocoding

Rules:

- Use SRID 4326 consistently
- Validate longitude/latitude ranges before SQL
- Keep coordinate construction and bbox semantics in named helpers/RPCs
- Add/verify a GiST index for high-volume geography predicates
- Never attempt Prisma `select: { gisPoint: true }`; unsupported fields require raw SQL

## Raw SQL checklist

- [ ] Prisma cannot express the operation cleanly; raw SQL is justified
- [ ] Reusable SQL lives in `functions.sql`
- [ ] Application values use tagged-template parameters
- [ ] Extension objects follow `bondery-core` schema placement
- [ ] SQL function includes tenant/user filtering where required
- [ ] Search/index expressions stay identical
- [ ] PostGIS uses SRID 4326 and validated coordinate ranges
- [ ] `db:functions` and relevant API tests pass
