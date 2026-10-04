# Schema drift and gaps

Scouting findings as of July 2026. These are documented follow-ups, **not resolved by this skill**.

## Status table

| Priority | Finding | Evidence | Status |
|----------|---------|----------|--------|
| P1 | Server defaults generate UUIDv4 while mobile generates UUIDv7 | `@bondery/helpers/ids`, `@bondery/db` client extension | Resolved — see [uuidv7-strategy.md](./uuidv7-strategy.md) |
| P1 | Extension creation omits `WITH SCHEMA extensions` | `prisma/sql/functions.sql` (`uuid-ossp`, `postgis`) | Partial — `pg_trgm` / `unaccent` now live in `extensions`; remaining public-schema drift is PostGIS and uuid-ossp |
| P1 | `People.lastInteractionActivity` delete behavior differs | Prisma relation has no `onDelete`; `0_init` SQL uses `SET NULL` | Schema/migration drift |
| P1 | Some API RPC calls are not visibly represented in current `functions.sql` | `get_contact_extras`, sync/funnel helpers found in API/legacy migrations | Verify before fresh-install release |
| P2 | Current Prisma indexes are sparser than legacy Supabase migrations | Missing some FK, partial, and spatial indexes | Needs query/EXPLAIN audit; do not copy blindly |
| P2 | No explicit pool/statement timeout configuration | `DATABASE_URL`; Prisma singleton | Capacity/operability gap |
| P3 | `packages/db/README.md` does not exist | Agent config previously referenced it | Documentation gap |
| P3 | `uuid-ossp` appears unused | `functions.sql`; IDs app-generated | Candidate removal after dependency audit |

## Extension drift

`pg_trgm` and `unaccent` are installed in schema `extensions` (Prisma migration `20261002120000_move_pg_trgm_unaccent_to_extensions` plus `apply-sql-functions.ts`). `release-migrate` relocates them from `public` when needed.

`functions.sql` still creates `uuid-ossp` and `postgis` in the default schema. `bondery-core` requires the `extensions` schema for those as well.

Fixing the remaining extensions is not a one-line edit:

1. Check whether each extension is relocatable
2. Move existing extensions safely on deployed databases
3. Schema-qualify PostGIS functions/operator classes
4. Test fresh install and upgrade paths
5. Remove unused `uuid-ossp` only after confirming no function depends on it

## Relation drift

`People.lastInteractionActivity` should explicitly match the database's intended `ON DELETE SET NULL`. Correct through a new Prisma migration; never rewrite `0_init` after release.

## RPC completeness

The API uses raw SQL helpers beyond the obvious functions in `functions.sql`. Before declaring a fresh Postgres install complete:

- Search application `$queryRaw` calls for function names
- Compare with `CREATE FUNCTION` definitions in `packages/db/prisma/sql/functions.sql`
- Distinguish built-in functions from Bondery RPCs
- Add missing definitions through the canonical SQL apply path
- Exercise them in CI against a clean database

## Index audit

Legacy Supabase migrations contain more indexes than the current Prisma baseline. Treat them as evidence, not source of truth.

Prioritize current query paths:

- Foreign-key cascades and joins
- `(user_id, server_sequence)` sync reads
- Contact list filters/sorts
- PostGIS bbox predicates (GiST)
- pg_trgm name search (per-column GIN on unaccented lowercased first/middle/last)

Use `supabase-postgres-best-practices` and `EXPLAIN (ANALYZE, BUFFERS)` for validation.

## Follow-up order

1. Verify fresh-install RPC completeness
2. Align explicit relation delete semantics
3. Relocate remaining `postgis` / `uuid-ossp` extensions to `extensions` (pg_trgm/unaccent done)
4. Audit indexes with representative data
5. Establish connection budgets/timeouts
6. Add `packages/db/README.md`

## Drift checklist

- [ ] Finding is labeled fact/gap, not described as already fixed
- [ ] Fix uses forward migration and clean-install coverage
- [ ] Performance changes have measurement evidence
- [ ] Extension migration includes existing-install and fresh-install paths
- [ ] UUIDv7 rollout preserves existing UUIDv4 values and mobile IDs — implemented via shared helper + Prisma extension; existing v4 rows untouched
