# API design — list endpoints and pagination

Bondery list APIs use three response tiers. Choose the tier that matches dataset size and client needs.

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
- Use `buildPaginatedResponse` / `buildPaginationMeta` in `apps/api/src/lib/pagination.ts`.
- Filter bodies use `search`, not `q` (`contactsFilter.search`, `memberFilter.search`, `contactFilter.search`).

### Collection (small per-user catalogs)

Use for `GET /api/groups`, `GET /api/tags` — bounded per-user lists.

```json
{
  "groups": [],
  "totalCount": 3
}
```

No `pagination` block. No `limit`/`offset` query params.

### Capped (map pins, suggest)

Use when returning a bounded slice with optional truncation flag (e.g. map pins). `limit` only; no offset pagination envelope unless the route is promoted to Paginated tier.

## Breaking changes

Bondery owns API + webapp + mobile. Ship contract changes in one coordinated deploy:

- No silent aliases (`q` → use `search` only).
- No top-level `totalCount`/`limit`/`offset` on paginated responses — nest under `pagination`.
- Update all clients and OpenAPI path docs together.

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
- API helpers: `apps/api/src/lib/pagination.ts`
- Search count: `count_search_people_ids` RPC via `countSearchPeopleIds()` in `apps/api/src/lib/search.ts`
- Client normalizer: `normalizePaginatedList` in webapp/mobile fetchers
