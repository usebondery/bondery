# Sync architecture (mobile)

Bondery mobile is **local-first** with a **server-authoritative** sync engine: Postgres is source of truth, mobile keeps tier-1 data in SQLite, writes go through an outbox (`POST /api/sync/push`), reads through bootstrap + pull (`GET /api/sync/bootstrap`, `GET /api/sync/pull`).

See `.agents/skills/bondery-specific/references/sync-architecture.md` for the full checklist and protocol details.

## Stack overview

| Component | Role |
|---|---|
| **Postgres (Supabase)** | Source of truth |
| **sync_change_log** | Per-user batched changelog (domain emission) |
| **Fastify API** | Push mutations + pull/bootstrap |
| **expo-sqlite** | On-device store for tier-1 domain data |
| **pending_mutations** | Outbox drained by push |

Electric is **not** used.

## Protocol

- `X-Bondery-Sync-Protocol: 2`
- `X-Bondery-SQLite-Schema: 3`

## Adding a replicated table

1. Postgres migration + SQLite DDL (`SQLITE_SCHEMA_VERSION` bump if needed).
2. Domain `emitSyncBatch` after writes.
3. Mobile materializer + bootstrap table list.
4. Push mutation type + optimistic writer.
