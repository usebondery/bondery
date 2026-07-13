# API Mutation Responses

**Rule: Every create and update endpoint must return the full domain object in the response body. No separate GET request should ever be needed to hydrate state after a mutation.**

This is the same convention Stripe uses: `POST /customers` returns the full `Customer` object; `PATCH /customers/:id` returns the updated `Customer`. The client always has the authoritative server state immediately after the write.

---

## Why

1. **Eliminates request waterfalls.** Without this rule, a create becomes two round trips: `POST → { id }` then `GET /:id`. On mobile over a cellular connection, each round trip adds 100–400 ms of latency.

2. **The server already has the object.** After an `INSERT` or `UPDATE`, the row is in memory. Returning it costs a few extra bytes of serialization — essentially free.

3. **Server-computed fields are accurate.** `id`, `createdAt`, `updatedAt`, computed scores, normalizations, and auto-assigned defaults are only known after the DB write. Returning them removes any need for the client to guess or re-fetch.

4. **Optimistic UI reconciliation is clean.** When the mutation returns the real server state, the client can swap the optimistic placeholder for the confirmed object in one step.

5. **Reduces over-fetching.** Clients that refetch a list after every create or update download far more data than necessary.

---

## Status codes

| Operation | Status | Body |
|-----------|--------|------|
| Create | `201 Created` | `{ <resource> }` — full object |
| Update (PATCH / PUT) | `200 OK` | `{ <resource> }` — full updated object |
| Side-effect only (no object) | `204 No Content` | empty |
| Bulk op (counts matter more than object) | `200 OK` | `{ count, ... }` |

---

## When this rule does NOT apply

The rule applies to primary domain-object mutations. The following cases are appropriately different:

| Endpoint category | Correct response | Reason |
|---|---|---|
| **Bulk / membership operations** (`POST /groups/:id/contacts`, `POST /tags/:id/contacts`) | `{ addedCount, skippedCount }` | No single object is created; counts are the meaningful output |
| **Async triggers** (`POST /contacts/:id/enrich`) | `{ success: true }` | Work happens in the background; no object is ready at response time |
| **Photo upload** (`POST /contacts/:id/photo`) | `{ avatarUrl }` | A derived URL is the meaningful output, not the full contact |
| **Internal / side-effect ops** (enrich-queue, recommendations) | `{ success: true }` | No client-facing entity to return |
| **Parse previews** (import parse endpoints) | parsed preview data | These are not DB mutations |
| **Streaming responses** (chat) | SSE stream | Response is hijacked; object is meaningless |
| **Delete** | `{ message }` or `204` | Object is gone; nothing to return |

---

## Bondery API — current state

These endpoints already follow the rule:

- `PATCH /api/contacts/:id` → `{ contact }`
- `POST /api/contacts` → `{ contact }`
- `POST /api/tags`, `PATCH /api/tags/:id` → `{ tag }`
- `POST /api/groups`, `PATCH /api/groups/:id` → `{ group }`
- `POST /api/interactions`, `PATCH /api/interactions/:id` → `{ interaction }`
- `POST /api/contacts/:id/relationships`, `PATCH .../relationships/:id` → `{ relationship }`
- `PUT /api/contacts/:id/important-dates` → `{ dates }`
- `POST /api/contacts/:id/tags` → `{ tag }`
- `POST /api/contacts/merge` → `{ personId, mergedIntoPersonId, ..., contact }`
- `PATCH /api/me/settings` → `{ data: settings }`

---

## Client-side rule by platform

After a mutation, use the response body — **no follow-up GET** unless the endpoint is bulk/async (see table above).

### Webapp

Invalidate TanStack Query keys after domain mutations. Use returned objects for **navigation** (e.g. new contact id → person page), not to patch cache by hand.

```typescript
// ✅ correct — invalidate; UI refetches via query hooks
const { contact } = await createContactMutation.mutateAsync(input);
router.push(`${WEBAPP_ROUTES.PEOPLE}/${contact.id}`);

// ❌ wrong — unnecessary GET after create
const { contact } = await createContactMutation.mutateAsync(input);
await fetchContact(contact.id);
```

See `apps/webapp/src/lib/query/invalidation.ts` and `lib/api/README.md`.

### Mobile (tier-1 sync data)

Writes go through `submitSyncMutation` — optimistic SQLite + outbox, not REST create/update. For **online-only** endpoints (settings, imports, photos), reconcile from mutation response or invalidate sync query.

```typescript
// ✅ correct — mobile tier-1 domain write
await submitSyncMutation({ type: "contact.create", payload });

// ✅ correct — online-only REST mutation uses returned object
const { tag } = await addTagToContact(contactId, tagId);
setContactTags((prev) => [...prev, tag]);

// ❌ wrong — extra GET after online-only create
await addTagToContact(contactId, tagId);
await loadContactTags(contactId);
```

---

## Reference

Stripe API design: https://docs.stripe.com/api/customers/create — every create and update returns the full resource.
