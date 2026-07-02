# API route ordering — published documentation

GitBook renders the API reference from `apps/api/openapi.yaml`, which is generated from **Fastify route registration order**. There is no post-generation sort. Registration order is the contract.

## Rationale

Stripe-style API docs order endpoints by **integrator journey**: list and retrieve before create, update, and delete; core CRUD before specialized workflows. Bondery encodes that journey in registration order so every PR review can see doc order changes explicitly.

## Path tiers

Register routes in this tier order within each tag (e.g. Contacts, Groups):

| Tier | Name | Path pattern | Examples |
|------|------|--------------|---------|
| 1 | Collection | `/{resource}` | `GET/POST/DELETE /api/contacts` |
| 2 | Static siblings | `/{resource}/{literal}` (non-auxiliary) | `/map-pins`, `/by-social`, `/important-dates/upcoming` |
| 3 | Single resource | `/{resource}/{id}` | `GET/PATCH/DELETE /api/contacts/{id}` |
| 4 | Sub-resources | `/{resource}/{id}/{sub}` | `/api/contacts/{id}/groups`, `/api/groups/{id}/contacts` |
| 5 | Auxiliary | workflow / batch tooling | merge, enrich-queue, `POST /merge` |

Among paths at the **same tier**, prefer alphabetical order by path segment.

### Static vs auxiliary

Auxiliary paths use an explicit allowlist in `@bondery/schemas/openapi/route-order` (`AUXILIARY_FIRST_SEGMENTS`). The first path segment after the resource root matching that list → tier 5. All other literal segments at resource depth → tier 2.

Current auxiliary segments: `merge`, `merge-recommendations`, `enrich-queue`.

## HTTP methods (same path)

When multiple methods share one path, register in this order:

```
GET → POST → PUT → PATCH → DELETE
```

## Sidebar tag order

Section order in GitBook follows the `tags` array in `apps/api/src/index.ts`. Order by **integrator dependency**, not alphabet:

```
Health → Contacts → Groups → Tags → Interactions → Import → Share → Geocode
→ Me → Sync → Extension → Chat → Subscriptions → Stats → Webhooks → Internal
```

- **Integration tier** (API keys): Contacts through Geocode
- **Session tier**: Me, Sync (mobile offline), Extension, Chat, Subscriptions
- **Admin / internal**: Stats, Webhooks, Internal (hidden)

## Examples

### Groups (good CRUD reference)

`apps/api/src/routes/groups/index.ts`:

1. `GET /` → `POST /` → bulk `DELETE /`
2. `GET /:id` → `PATCH /:id` → `DELETE /:id`
3. `/:id/contacts` sub-routes

### Contacts (largest resource)

1. Tier 1: list, create, bulk delete on `/`
2. Tier 2: `map-address-pins`, `map-pins`, `by-social`, `important-dates/upcoming`
3. Tier 3: get, patch, delete on `/:id`
4. Tier 4: tags, photo, relationships, important-dates on `/:id`, groups, vcard, linkedin-data, enrich on `/:id`
5. Tier 5: merge-recommendations, merge, enrich-queue

## Sub-plugins

In parent plugins (e.g. `contacts/index.ts`), call `register*Routes` at the tier where their routes belong — not at file top by default.

## Checklist (new routes and PR review)

- [ ] Route registered in the correct tier (not appended at file bottom by default)
- [ ] Same-path methods follow GET → POST → PUT → PATCH → DELETE
- [ ] New auxiliary workflow paths added to `AUXILIARY_FIRST_SEGMENTS` if tier 5
- [ ] `npm run generate-openapi -w apps/api` — confirm doc order in the diff
- [ ] `npm run check-openapi` passes (includes route-order CI check)

## Enforcement

`apps/api/scripts/check-api-route-order.ts` validates tier and HTTP method order in the generated OpenAPI spec (tier must not decrease within a tag; same path must follow GET → POST → PUT → PATCH → DELETE). See also `docs/contributing/api-routes.md`.
