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

## Client-side rule (mobile / web)

After calling a mutation, **use the returned object to update local state directly**. Do not make a follow-up GET or trigger a list reload unless the mutation genuinely cannot return the object (bulk ops, async triggers).

```typescript
// ✅ correct — use the returned contact
const { contact } = await createContact({ firstName, lastName });
setContacts(prev => [contact, ...prev]);
router.push({ pathname: "/contact/[id]", params: { id: contact.id } });

// ❌ wrong — unnecessary double round trip
const { id } = await createContact({ firstName, lastName });
const { contact } = await fetchContact(id);   // never do this
setContacts(prev => [contact, ...prev]);
```

```typescript
// ✅ correct — use the returned group
const { group } = await createGroup({ label, emoji, color });
setGroups(prev => [...prev, group]);

// ❌ wrong — extra GET after create
const { id } = await createGroup({ ... });
const { group } = await fetchGroup(id);       // never do this
```

For **tag membership** (`addTagToContact` returns `{ tag }`), append the tag to local state rather than calling `fetchContactTags`:

```typescript
// ✅ correct
const { tag } = await addTagToContact(contactId, tagId);
setContactTags(prev => [...prev, tag]);

// ❌ wrong
await addTagToContact(contactId, tagId);
await loadContactTags(contactId);             // unnecessary GET
```

---

## Reference

Stripe API design: https://docs.stripe.com/api/customers/create — every create and update returns the full resource.
