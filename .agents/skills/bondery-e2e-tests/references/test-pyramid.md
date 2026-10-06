# Test pyramid

Bondery follows a classic test pyramid. E2E is the smallest, slowest layer — reserve it for paths that cross multiple systems (browser + API + auth + cookies).

## Layers

### Unit tests

**What:** Pure logic with no I/O.

**Where:**

- Colocated `*.test.ts` / `*.spec.ts` next to source
- Package-level tests in `packages/*/`

**Examples:** Zod schema validation, formatters in `@bondery/helpers`, route helpers, form normalizers.

**Run:** workspace `test` script (e.g. `pnpm run test -w api`).

### Integration tests

**What:** One boundary at a time — HTTP handler + DB, BFF route + session mock, repository + SQLite.

**Where:**

- `apps/api` route tests (Fastify inject or supertest-style)
- `apps/webapp` server action / route handler tests
- `apps/mobile` sync repository tests

**Examples:** `POST /api/contacts` returns `201` with correct shape; auth middleware rejects missing session.

### E2E tests

**What:** Full stack through a real browser (webapp today).

**Where:** `apps/webapp/e2e/*.spec.ts`

**Examples:** Unauthenticated `/app` redirects to `/login`; OAuth callback with invalid state shows `?error=oauth`; in-app session via email `storageState` survives reload. GitHub is not required for in-app paths.

## Decision guide

| Question | If yes → |
|----------|----------|
| Can this be tested with a pure function input/output? | Unit test |
| Does it need DB or HTTP but not a browser? | Integration test |
| Does it need cookies, OAuth redirect, or multi-page navigation? | E2E test (in-app paths use email `storageState`; GitHub only for IdP login) |
| Is it a regression in API response shape? | Integration + OpenAPI CI checks (`check:openapi`) |
| Is it a UI loading state or empty state? | Component test or manual QA — not E2E unless critical path |

## Anti-patterns

- E2E test for every form field validation — use unit tests on Zod schemas
- E2E test duplicating OpenAPI contract checks — use `check:openapi` and route tests
- Multiple E2E specs for the same auth path — extend existing `login.*.spec.ts` projects
- Requiring GitHub OAuth for every in-app E2E path — use `email-setup` + `.auth/email-user.json`
- Testing implementation details (internal state, fetch call order) in E2E

## Pyramid checklist

- [ ] New logic has unit test coverage where pure
- [ ] API contract covered by integration test or OpenAPI CI
- [ ] E2E reserved for cross-system user paths
- [ ] No duplicate coverage across layers without justification
