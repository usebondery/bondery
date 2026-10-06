# API design — URLs, response shapes, lists, and pagination

Bondery list APIs use three response tiers. Choose the tier that matches dataset size and client needs.

## Resource and URL naming

Canonical path constants: `API_ROUTES` in `packages/helpers/src/globals/paths.ts`. Mount order: `apps/api/src/routes/register-all.ts`.

### Rules

| Pattern | Convention | Examples |
|---------|------------|----------|
| Resource roots | Plural nouns | `/contacts`, `/groups`, `/tags`, `/interactions` |
| Current user | Singular `/me` | `/me/settings`, `/me/api-keys` |
| Multi-word segments | kebab-case | `/map-pins`, `/merge-recommendations`, `/important-dates` |
| Path params | `:id` (UUID) | `/contacts/:id`, `/groups/:id/contacts` |
| Static before dynamic | Static siblings before `/:id` | `/contacts/select`, `/contacts/by-social` before `/contacts/:id` |
| Nested sub-resources | `/{resource}/{id}/{sub}` | `/contacts/:id/relationships`, `/tags/:id/contacts` |
| Actions | Verb-like static segments where CRUD does not fit | `/contacts/merge`, `/subscriptions/checkout` |

### Fastify vs BFF paths

- **Fastify** mounts routes **without** `/api` prefix (`/contacts`, not `/api/contacts`)
- **Webapp BFF** prepends `/api` via `toBffApiPath()` on the webapp origin
- Route file comments may say `/api/contacts` — that reflects the BFF path, not the Fastify mount

### Registration order

Path tiers and HTTP method order affect published GitBook docs. See [api-route-ordering.md](./api-route-ordering.md).

### Naming anti-patterns

```
# GOOD
/contacts                    # plural resource
/contacts/map-pins           # kebab-case
/contacts/:id/groups         # nested ownership

# BAD
/getContacts                 # verb in URL
/contact                     # singular collection
/team_members                # snake_case in URLs
/contacts/:id/getOrders      # verb in nested resource
```

## Response shapes (resource-keyed)

Bondery success responses use **resource-keyed** top-level keys — not a generic `{ data }` envelope. Only errors use a wrapper.

| Pattern | Shape | When |
|---------|-------|------|
| Single resource | `{ contact: {...} }` | GET/PATCH single resource, 201 create |
| Paginated list | `{ contacts: [...], pagination: {...} }` | People-style lists |
| Collection | `{ groups: [...], totalCount: N }` | Small bounded catalogs |
| Collection (no count) | `{ relationships: [...] }` | Unbounded sub-resource lists |
| Message | `{ message: "..." }` | Bulk deletes, confirmations |
| Action result | `{ addedCount: N }` | Membership adds |
| Error | `{ error: { code, type, message, doc_url, ... } }` | All 4xx/5xx |

### Why not `{ data }`?

- Clients deserialize by resource key (`contact`, `contacts`, `group`)
- OpenAPI schemas use `makePaginatedListResponseSchema("contacts", itemSchema)` and `makeListResponseSchema("groups", itemSchema)` in `packages/schemas/src/entities/_shared/schema.ts`
- TypeScript types map directly to response keys — no extra unwrap layer
- Industry `{ data }` envelopes are common for public APIs; Bondery is a owned monorepo where explicit keys improve client ergonomics

### Examples

**Single contact:**

```json
{ "contact": { "id": "...", "firstName": "...", "avatar": null } }
```

**Paginated contacts:**

```json
{
  "contacts": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "totalCount": 142,
    "hasMore": true,
    "sort": "nameAsc",
    "search": null
  }
}
```

**Groups list (collection tier):**

```json
{ "groups": [], "totalCount": 3 }
```

## Response tiers

### Paginated (large datasets)

Use for contacts, group members, interactions, tag members, chat sessions/messages, merge recommendations, and any list that can grow without bound.

**Query parameters** (full words — no abbreviations):

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | integer | `50` | Clamped to `1`–`200`; echoed in `pagination.limit` |
| `offset` | integer | `0` | Non-negative; echoed in `pagination.offset` |
| `search` | string | — | Trimmed; whitespace-only treated as absent (`null` in meta) |
| `sort` | string | route default | Effective sort echoed in `pagination.sort` |

**No cursor pagination.** Bondery does not use `cursor`, `page_token`, `after_id`, or keyset pagination. Use offset only.

**Response shape:**

```json
{
  "contacts": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "totalCount": 0,
    "hasMore": false,
    "sort": "nameAsc",
    "search": null
  }
}
```

The collection key varies (`contacts`, `interactions`, `sessions`, `messages`, `recommendations`, etc.). `pagination` is always present, including empty results.

**Rules:**

- `totalCount` = full match count across all pages (not current page length).
- `hasMore` = server-computed: `offset + items.length < totalCount`.
- Clients must use `pagination.hasMore` for “load more” UI — do not re-derive from `items.length` vs `totalCount` (breaks during search).
- Use `buildPaginatedResponse` / `buildPaginationMeta` in `apps/api/src/lib/data/pagination.ts`.
- Filter bodies use `search`, not `q` (`contactsFilter.search`, `memberFilter.search`, `contactFilter.search`).

### Search

- Query param: **`search`** (not `q`)
- Webapp product URLs use **`next_action`** for pending UI actions — see [url-query-params.md](./url-query-params.md)
- Trimmed on input; whitespace-only → no filter, `pagination.search: null`
- People lists use fuzzy `search_people_ids` RPC via `countSearchPeopleIds()` in `apps/api/src/lib/data/search.ts`
- Geocode suggest uses `search` (required, min 3 chars) — separate from people list search

**Endpoints with `search`:** `GET /contacts`, `GET /contacts/select`, `GET /groups/:id/contacts`, `GET /tags/:id/contacts` (via `peopleListQuerySchema`).

### Sort

Sort values from `contactSortOrderSchema` in `packages/schemas/src/entities/contact/schema.ts`:

```
nameAsc | nameDesc | surnameAsc | surnameDesc
interactionAsc | interactionDesc | createdAtAsc | createdAtDesc
```

- Default when omitted: `nameAsc` (via `resolveSort()`)
- Effective sort echoed in `pagination.sort`
- Chat messages: optional `sort: "createdAtAsc"` only
- Merge recommendations: fixed `sort: "scoreDesc"` server-side

**Endpoints with `sort`:** same people-list routes as `search`.

### Endpoints without search/sort

| Endpoint | Query schema | Notes |
|----------|-------------|-------|
| `GET /groups` | `previewListQuerySchema` | `previewLimit` only |
| `GET /tags` | `previewListQuerySchema` | `previewLimit` only |
| `GET /interactions` | `interactionsListQuerySchema` | `contactId` filter; pagination only |
| `GET /chat/sessions` | `paginationQuerySchema` | Server sorts `updatedAt desc` |
| `GET /sync/pull` | `syncPullQuerySchema` | `since`, `limit`, `waitMs` |

### Collection (small per-user catalogs)

Use for `GET /api/groups`, `GET /api/tags` — bounded per-user lists.

```json
{
  "groups": [],
  "totalCount": 3
}
```

No `pagination` block. No `limit`/`offset` query params. Both routes accept optional `previewLimit` and avatar transform params via `previewListQuerySchema` (`previewLimit`, `avatarSize`, `avatarQuality`).

### Capped (map pins, suggest)

Use when returning a bounded slice with optional truncation flag (e.g. map pins). `limit` only; no offset pagination envelope unless the route is promoted to Paginated tier.

## Breaking changes

Bondery owns API + webapp + mobile. Ship contract changes in one coordinated deploy:

- No silent aliases (`q` → use `search` only).
- No top-level `totalCount`/`limit`/`offset` on paginated responses — nest under `pagination`.
- Update all clients and OpenAPI path docs together.

See [versioning.md](./versioning.md) for non-breaking vs breaking classification.

## Edge cases

| Case | Expected |
|------|----------|
| `search` whitespace only | No search filter; `pagination.search: null` |
| `offset` beyond `totalCount` | `items: []`, `hasMore: false`, `totalCount` unchanged |
| `limit` > 200 or < 1 | Clamped; echoed in `pagination.limit` |
| Last partial page | `hasMore: false` even if `items.length < limit` |
| Sort omitted | Server default applied; echoed in `pagination.sort` |
| Search + scoped filter | Count RPC respects same scope (group, tag, keep-in-touch) |

## Implementation references

- Shared Zod: `paginationMetaSchema`, `makePaginatedListResponseSchema` in `packages/schemas`
- API helpers: `apps/api/src/lib/data/pagination.ts`
- Search count: `count_search_people_ids` RPC via `countSearchPeopleIds()` in `apps/api/src/lib/data/search.ts`
- Client normalizer: `normalizePaginatedList` in webapp/mobile fetchers

## Documentation order

GitBook API reference order follows Fastify route registration order. Path tiers, HTTP method order, sidebar tag order, and CI checks are documented in [api-route-ordering.md](./api-route-ordering.md).

## Checklist

- [ ] Correct response tier chosen (Paginated / Collection / Capped)
- [ ] Resource URL follows naming conventions (plural, kebab-case, static-before-dynamic)
- [ ] Paginated responses use nested `pagination` with server `hasMore`
- [ ] Offset pagination only — no cursor params
- [ ] `search` param (not `q`); sort enum from `contactSortOrderSchema` where applicable
- [ ] Product deep-link actions use `next_action` from `NEXT_ACTIONS` — see [url-query-params.md](./url-query-params.md)
- [ ] Zod response schema uses resource-keyed factory (`makePaginatedListResponseSchema`, etc.)
- [ ] Breaking changes coordinated across API + all clients + OpenAPI
