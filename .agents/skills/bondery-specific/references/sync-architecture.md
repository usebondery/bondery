# Mobile offline sync architecture

Bondery mobile uses **Supabase Postgres** as source of truth (server authoritative), **custom pull/bootstrap** for reads into **expo-sqlite**, and a unified **mutation outbox** drained via `POST /api/sync/push`.

## Local-first rule

Screens **never** choose between “online API” and “offline cache” for tier-1 domain data:

| Layer | Responsibility |
|-------|----------------|
| **Repositories** (`lib/sync/repositories/`) | Read SQLite (joins, search, pagination) |
| **MutationService** (`submitSyncMutation`) | Optimistic SQLite + enqueue outbox + schedule drain |
| **PullManager** (`pull-manager.ts`) | `GET /api/sync/bootstrap` + long-poll `GET /api/sync/pull` → materializers |
| **SyncDrainer** (`outbox/sync-worker`) | Push pending mutations; reconcile with server |

Tier-2 (settings) and tier-3 (photos, geocode, share, account delete) stay in `lib/api/online-only.ts`.

## Read path — pull + bootstrap

1. First sync (or `last_server_sequence === 0`): `GET /api/sync/bootstrap` loads all tier-1 tables for the user.
2. Steady state: `GET /api/sync/pull?since=N` returns batched changelog entries from `sync_change_log`.
3. Mobile applies each batch in one SQLite transaction (server always wins — no client skip of incoming rows).
4. Cursor `last_server_sequence` advances only after successful local apply.

## Write path — unified outbox

All tier-1 mutations go through `submitSyncMutation`:

1. Apply optimistic writer (`mutations/optimistic.ts`) to SQLite (`is_pending = 1`).
2. Insert into `pending_mutations` with monotonic `clientSequence`.
3. `scheduleSyncDrain()` pushes to `POST /api/sync/push`.

On push response:

| Status | Action |
|--------|--------|
| `applied` / `duplicate` | Apply server payload; delete outbox row |
| `conflict` | Apply server snapshot from `result.server`; mark conflict |
| `rejected` | Mark rejected; `pullOnce()` to reconcile; toast |

Domain writes (REST + push) emit one **batch** per logical change into `sync_change_log` via `emitSyncBatch()`.

## Server changelog

- Table: `sync_change_log` — `(user_id, server_sequence, change_index)` PK.
- One `server_sequence` per batch; multiple row changes inside a batch.
- Allocator: `allocate_sync_server_sequence` (per user).

## Adding a new replicated entity

1. Add Postgres table + mobile SQLite DDL; bump `SQLITE_SCHEMA_VERSION` if needed.
2. Add materializer in `materializer/`.
3. Add domain `emitSyncBatch` after writes in `apps/api/src/domains/`.
4. Include table in `SYNC_TABLE_KEYS` (`packages/schemas/src/sync/tables.ts`) and bootstrap query.
5. Add optimistic writer + push mutation type on API.
6. Add repository read API + domain wrapper on mobile.

## Ordering

| Field | Owner | Purpose |
|-------|-------|---------|
| `clientSequence` | Mobile | Monotonic per device (`sync_meta`) |
| `serverSequence` | API | Monotonic per user (`sync_user_sequence` / changelog) |

## Protocol versioning

| Header | Purpose |
|--------|---------|
| `X-Bondery-Sync-Protocol: 2` | Push + pull contract |
| `X-Bondery-SQLite-Schema: 3` | Local DDL version |

Mismatch → **426** — force resync / app update.

## UI hooks

- `useSyncQuery` — re-runs when `revision` changes.
- `SyncProvider` — `isInitialSync`, `pendingCount`, `conflictCount`, `revision`.

## Background sync

`expo-background-task` drains outbox and runs `pullOnce()` when the OS permits.

## Guardrails

Run `npm run check-sync-patterns --workspace=mobile` — blocks tier-1 REST imports in feature code.

## Naming note

`POST /api/subscriptions/sync` is Polar billing sync — unrelated to mobile data sync.
