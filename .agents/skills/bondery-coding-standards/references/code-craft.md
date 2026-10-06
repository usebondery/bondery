# Code craft

## Readability first

- Prefer explicit code that a contributor can understand without reconstructing hidden assumptions.
- Keep the happy path visible. Use guard clauses when they reduce nesting.
- Give each function and module one clear responsibility; split when distinct concepts or reasons to change appear.
- Match the local workspace pattern unless it conflicts with an explicit Bondery owner skill.

## Simplicity, reuse, and scope

- **KISS:** choose the simplest design that fully meets the current requirement.
- **YAGNI:** do not add extension points, flags, generic factories, or configuration for hypothetical needs.
- **DRY:** remove duplicated knowledge, not merely similar-looking lines. Extract only when the shared concept and ownership are clear.
- Keep the diff surgical. Do not bundle unrelated renames, formatting, or cleanup with feature work.
- When your change makes an import, helper, or branch unused, remove that orphan. Do not broaden cleanup to pre-existing dead code.

## Naming

- Use domain language and describe intent: `searchQuery`, `isLoading`, `hasPermission`, `contactId`.
- Boolean names normally start with `is` or `has`.
- Functions start with an action. Follow established Bondery forms such as `get…`, `set…`, `is…`, and `has…` where they fit.
- Avoid vague names such as `data`, `item`, `value`, `handle`, or `process` when a specific domain name is available.
- Preserve established API and database vocabulary; do not invent synonyms at layer boundaries.

## Data and control flow

- Treat props, React state, query results, and shared inputs as immutable. Return new arrays/objects instead of mutating callers' data.
- Local mutation inside a contained algorithm is acceptable when it is clearer or materially faster and cannot escape the function.
- Start independent asynchronous work together and await it together; preserve sequencing where operations genuinely depend on prior results.
- Do not catch an error merely to hide it. Recover deliberately, map it to the owning layer's error contract, or rethrow with useful context.
- Never expose secrets, tokens, personal data, or raw internal errors through logs or user-facing messages.

## Comments and documentation

- Prefer code that explains what it does through types and names.
- Add comments for the **why**: compatibility constraints, non-obvious invariants, security boundaries, or intentional deviations.
- Write comments and JSDoc in ASD-100 ([`bondery-writing`](../../bondery-writing/references/asd-100.md)). This file still decides *when* a comment exists.
- Add JSDoc to shared or public functions when callers need behavior, parameter, return, side-effect, or failure guarantees that types do not express.
- Update the nearest README or architecture documentation when a public workflow, package contract, environment variable, or contributor procedure changes.
- Do not leave commented-out code or TODOs without an owner and actionable context.

## Code smells

Challenge the change when you see:

- Deep nesting that hides the successful path
- A function coordinating unrelated responsibilities
- Repeated domain rules implemented separately in multiple apps
- Boolean parameters that make behavior difficult to infer at call sites
- Unsafe assertions used to silence a type-modeling problem
- Magic values without a domain name or central owner
- A new abstraction with only one speculative consumer
- Framework or transport details leaking into shared contract code

## Review checklist

- [ ] A reader can identify the purpose and happy path quickly
- [ ] Names use Bondery domain vocabulary and established prefixes
- [ ] Abstractions represent proven shared knowledge rather than speculative reuse
- [ ] Inputs owned by callers are not mutated
- [ ] Async dependencies are explicit and independent work is not serialized
- [ ] Errors are recovered, mapped, or rethrown intentionally
- [ ] Comments and JSDoc explain contracts or reasons, not syntax
