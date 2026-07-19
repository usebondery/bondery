# Mobile offline sync architecture

Bondery mobile uses **Supabase Postgres** as source of truth (server authoritative), **custom pull/bootstrap** for reads into **expo-sqlite**, and a unified **mutation outbox** drained via `POST /api/sync/push`.

## Local-first rule

Screens **never** choose between “online API” and “offline cache” for tier-1 domain data:

| Layer | Responsibility |
|-------|----------------|
| **Resources** (`lib/resources/`) | List params, row mappers, SQL fragments — no React, no I/O |
| **Repositories** (`lib/sync/repositories/`) | Execute SQLite reads (imports `lib/resources`) |
| **Domains** (`lib/domains/`) | Public CRUD API; writes via `submitSyncMutation` |
| **Sync hooks** (`lib/sync/hooks/`) | UI subscription (`useSyncQuery` on `revision`) |
| **MutationService** | `submitSyncMutation` in `apps/mobile/src/lib/sync/mutation-service.ts` | Optimistic SQLite + enqueue outbox + schedule drain |
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
2. Add materializer in `apps/mobile/src/lib/sync/materializer/`.
3. Call `emitSyncBatch` from `apps/api/src/lib/sync/emit-change.ts` after API domain writes.
4. Include table in `SYNC_TABLE_KEYS` (`packages/schemas/src/sync/tables.ts`) and bootstrap query.
5. Add optimistic writer + push mutation type on API.
6. Add `lib/resources/` mappers/query builders, repository read API, `lib/domains/` wrapper, and `lib/sync/hooks/` on mobile.

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

`expo-background-task` drains outbox and runs `schedulePull({ reason: "background" })` when the OS permits.

## Realtime wake (WebSocket)

Cross-device freshness uses a **thin wake channel** — not a second sync protocol.

| Layer | Responsibility |
|-------|----------------|
| **`emitSyncBatch`** | Writes `sync_change_log` then async `notifySyncWake` |
| **`SyncWakeBus`** | In-memory (dev) or Redis pub/sub (prod) fanout across API instances |
| **`GET /api/sync/ws-ticket`** | Short-lived ticket (60s, single-use) — no JWT in WS URL |
| **`GET /api/sync/ws`** | WebSocket doorbell: `sync.hello`, `sync.batch`, `ping`/`pong` |
| **Mobile** | `sync-wake-client.ts` → `schedulePull` on wake; long-poll when WS down |
| **Web** | BFF ticket + direct WS to API → TanStack Query invalidation by `affectedTables` |

**Source of truth unchanged:** `sync_change_log` + pull (mobile) / REST refetch (web).

**Mobile pull modes:**

| Mode | When | Behavior |
|------|------|----------|
| `long_poll` | WS disconnected | `GET /api/sync/pull?waitMs=25000` loop |
| `websocket_wake` | WS connected | Event-driven `schedulePull` + 300s safety pull |

**Rollback:** set `SYNC_WAKE_ENABLED=false` on API to disable publish without client changes.

**Manual verification checklist:**

- Web edit → mobile UI updates within ~2s with WS healthy
- Mobile edit → web list/detail updates within ~2s without tab focus
- Kill WS → mobile resumes long-poll; web relies on staleTime/focus refetch
- `SYNC_WAKE_ENABLED=false` → behavior matches pre-wake (long-poll / focus only)
- Reconnect after deploy → `sync.hello` triggers catch-up pull without duplicate rows

**Web exception:** WS connects to `BONDERY_PUBLIC_API_URL` (not BFF) — browsers cannot upgrade WebSockets through Next.js proxy. Ticket is fetched via same-origin `/api/sync/ws-ticket` BFF route.

## Guardrails

Run `npm run check-sync-patterns --workspace=mobile` locally — blocks tier-1 REST imports in feature code. Not part of CI today.

## Not mobile-synced (online / web only)

These stay on REST or online-only paths — do not add to `SYNC_TABLE_KEYS`:

- Interactions, relationships, merge/enrich workflows
- Chat sessions and messages
- Import parse/commit, settings blobs, photos, geocode, share, account delete

See `apps/mobile/src/lib/api/online-only.ts`.

## Naming note

`POST /api/subscriptions/sync` is Polar billing sync — unrelated to mobile data sync.
