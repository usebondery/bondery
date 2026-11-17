# Query patterns

Bondery-specific Prisma ORM 7 patterns (`@prisma/client`). For generic index, N+1, pooling, and `EXPLAIN` guidance, read `supabase-postgres-best-practices`. For Prisma Next query APIs (`db.orm`, `db.sql`), see [prisma-skills.md](./prisma-skills.md) — not used in this repo today.

## Select only required fields

List/detail queries generally use shared selects such as `apps/api/src/lib/data/prisma-mappers.ts`.

Prefer:

```typescript
client.people.findMany({
  select: contactListSelect,
  where: { userId: user.id },
});
```

Define shared selects with `satisfies Prisma.PeopleSelect` (or the relevant model select type) and derive row types via `Prisma.PeopleGetPayload<{ select: typeof contactListSelect }>`.

Use `include` only when the complete relation is genuinely required. Wide nested includes increase transfer, serialization, and accidental data exposure.

## Omitting sensitive fields

Prisma supports `omit` to exclude fields from query results. Bondery's default is **narrow `select`** — it is explicit, composable, and already used across API mappers.

Use `omit` when:

- You need most scalar fields on a model and only want to hide a few (e.g. `password`, `accessToken`, `refreshToken`, `key` on `Apikey`)
- A shared client or repeated query shape would otherwise duplicate a long field list

```typescript
// Per-query omit — good when you need almost the full Account row
const account = await client.account.findUnique({
  where: { id },
  omit: { accessToken: true, refreshToken: true, password: true },
});

// Global omit on the client — use sparingly; affects every query for that model
const prisma = new PrismaClient({
  adapter,
  omit: { account: { password: true } },
});
```

**Prefer `select` over `omit` when:**

- Building list/detail API responses (Bondery's usual case)
- You need fewer than half the model's fields
- The query lives in a hot path

**Never combine `select` and `omit` in the same query.** Prisma rejects it.

Sensitive fields to always exclude from API responses: `Account.accessToken`, `Account.refreshToken`, `Account.password`, `Account.idToken`, `Apikey.key`, `Jwks.privateKey`, `OauthClient.clientSecret`.

## Batch reads and writes

Established patterns:

- `createMany({ skipDuplicates: true })` for group/tag membership
- `deleteMany` + `createMany` for replace-all child collections
- `where: { id: { in: ids } }` then in-memory maps
- `get_contact_extras(userId, uuid[])` RPC for batched contact enrichment

Avoid `Promise.all(ids.map(id => prisma...))`: parallel N+1 is still N+1.

### Bulk write-and-return (`createManyAndReturn`, `updateManyAndReturn`)

Use when you insert or update multiple rows and need the resulting records (e.g. generated IDs, defaults, or `updatedAt`) without a per-row `create` loop.

```typescript
// Insert many, get rows back (runs in a transaction)
const rows = await client.peoplePhone.createManyAndReturn({
  data: phoneRows,
  select: { id: true, value: true, sortOrder: true },
});

// Update many, get updated rows back
const updated = await client.tag.updateManyAndReturn({
  where: { userId, id: { in: tagIds } },
  data: { color: newColor },
  select: { id: true, label: true, color: true },
});
```

**When to use:**

- Bulk insert where callers need assigned IDs (especially with UUIDv7 from the client extension)
- Replace-all flows that must emit sync changes for each new row
- Batch updates where the response must reflect DB defaults/triggers

**When not to use:**

- `createMany` / `updateMany` suffice when callers do not need returned rows
- A single row — use `create` / `update` directly
- You only need a count — use `createMany` / `updateMany` (lighter)

Bulk methods (`createMany`, `createManyAndReturn`, `updateMany`, `updateManyAndReturn`, `deleteMany`) run as transactions automatically.

## Transactions

Use `$transaction` when multiple writes must commit together. Existing replace-all pattern:

```typescript
await client.$transaction(async (tx) => {
  await tx.peopleAddress.deleteMany({ where: { personId, userId } });
  await tx.peopleAddress.createMany({ data: rows });
});
```

Rules:

- Scope every operation by the authenticated user where applicable (`bondery-security`)
- Validate external data before opening the transaction
- Perform external side effects after commit, with retry/idempotency where needed
- Prefer one batch operation over many per-row writes

## Pagination

Bondery public API contract is **offset pagination only** (`limit`, `offset`) and is owned by `bondery-api`.

Prisma implementation:

```typescript
findMany({ skip: offset, take: limit, orderBy, where })
```

Do not introduce cursor parameters into API endpoints. For internal high-volume maintenance jobs, keyset iteration may be used without changing the public contract; document it as an internal implementation detail.

Always include deterministic ordering with a stable tie-breaker.

## Parallel independent queries

Page rows and counts are independent and may run together:

```typescript
const [rows, count] = await Promise.all([
  client.people.findMany(...),
  client.people.count(...),
]);
```

Do not parallelize dependent writes or operations that must share one transaction.

## Raw SQL boundaries

Raw SQL wrappers should return narrow typed rows and live near the domain/data layer:

- `lib/data/search.ts`
- `services/contacts/queries-map.ts`
- `lib/sync/*`

See [raw-sql-and-postgis.md](./raw-sql-and-postgis.md).

## Performance review

For a changed hot query:

1. Capture representative parameters and data volume
2. Run `EXPLAIN (ANALYZE, BUFFERS)` in a non-production environment
3. Check row-estimate errors, sequential scans, sorts, and buffer reads
4. Add the smallest index that serves the real predicate/order
5. Re-run and record evidence

Do not add speculative indexes. Every index costs write I/O and storage.

## Query checklist

- [ ] Query uses a narrow `select` (or justified `omit` for sensitive fields)
- [ ] Tenant filter follows `bondery-security`
- [ ] No per-row query loop; batch read/write used
- [ ] Bulk insert/update uses `*AndReturn` when callers need resulting rows
- [ ] Pagination follows `bondery-api` offset contract
- [ ] Ordering is deterministic
- [ ] Transaction is necessary and short
- [ ] Hot query/index change has `EXPLAIN` evidence
