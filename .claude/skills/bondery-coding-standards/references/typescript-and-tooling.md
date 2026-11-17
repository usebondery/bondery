# TypeScript and tooling

## Type safety

- Keep public boundaries explicit: component props, exported functions, API payloads, and shared package exports need stable types.
- Prefer inference for obvious local values; add annotations when they document a contract or prevent widening.
- Use `unknown` for untrusted input and narrow it with Zod, type guards, or control flow.
- Do not use `any` unless the boundary cannot be modeled reasonably; explain the constraint at the use site.
- Avoid non-null and type assertions when validation or a better state model can prove the value.
- Reuse generated Prisma types and shared `@bondery/schemas` contracts instead of recreating lookalike interfaces.

## Biome is authoritative

Root [`biome.json`](../../../../biome.json) enforces:

- Spaces with width 2, LF endings, and a 100-character line width
- Double quotes, semicolons, trailing commas, and parenthesized arrow parameters
- Block statements for control flow
- Organized imports and sorted attributes, enum members, interface members, and object keys
- No `console` in application code; narrow script/config overrides are declared in `biome.json`
- No undeclared environment variables; allowed patterns are declared centrally
- A 500-line file limit, with explicit narrow overrides only

Do not restate formatter choices in reviews or hand-format around them. Change `biome.json` only when the repository-wide policy itself is intentionally changing.

## Imports and environment access

- Import public package subpaths, not another workspace's `src/` internals.
- Follow the compiled-package and `.js` internal-import rules in [`bondery-core`](../../bondery-core/SKILL.md).
- Do not add barrel files merely for shorter imports; use existing package exports.
- Read environment values through established config/env helpers. New variables must be added to the canonical environment manifest and examples, not only to `process.env` access.
- Keep secrets server-side and never expose them through public-prefixed variables or client bundles.

## Verification

Use a non-mutating changed-file check first:

```bash
pnpm exec biome check --no-errors-on-unmatched --files-ignore-unknown=true <changed-files>
```

For full CI parity:

```bash
pnpm exec biome ci .
```

Do not use root `pnpm run lint` for verification; it runs `biome check --write .` and mutates files. Route type checks, package consumers, tests, and boundary checks through [`bondery-verification-loop`](../../bondery-verification-loop/SKILL.md).

## Tooling checklist

- [ ] Untrusted values are validated or narrowed from `unknown`
- [ ] Shared/generated types are reused instead of duplicated
- [ ] Assertions and `any` are absent or justified at the boundary
- [ ] Imports respect package exports and compiled-package rules
- [ ] Environment variables use canonical helpers/manifests and do not expose secrets
- [ ] Non-mutating Biome checks pass for changed files
- [ ] Workspace type checks and consumer checks follow `bondery-verification-loop`
