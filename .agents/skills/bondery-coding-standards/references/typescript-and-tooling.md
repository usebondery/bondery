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
- Organized imports and sorted attributes, enum members, interface members, and object keys. Assist `useSortedKeys` is off under `apps/webapp/src/lib/query/**` so `queryFn` stays before `getNextPageParam` on infinite queries.
- No `console` in application code; narrow script/config overrides are declared in `biome.json`
- No undeclared environment variables; allowed patterns are declared centrally
- A 500-line file limit, with explicit narrow overrides only
- No more than 5 nested callbacks in one function; extract a helper instead of nesting deeper
- Do not reassign a parameter; copy it into a `const` or `let` when a new value is needed
- Collapse `else { if (…) … }` into `else if (…)`
- Named React components are function declarations, never class components except error boundaries that implement `componentDidCatch`
- Do not call `process.exit()`; set `process.exitCode` and return, or throw
- Do not use TypeScript `enum`, `namespace`, or constructor parameter properties (`erasableSyntaxOnly` already forbids them)
- Object literals use shorthand (`{ foo }` not `{ foo: foo }`)
- One class per file; split implementations when a file grows a second class
- Prefer ESM; Expo `metro.config.js` and `babel.config.js` stay CommonJS because Metro loads them that way
- Biome domains `next`, `tailwind`, `test`, `tanstackQuery`, and `project` are `"all"` (nursery included). `noPrivateImports` is on. Drizzle stays off (Prisma is the data layer). `noUntrustedLicenses`, `useImportExtensions`, and `noUnresolvedImports` stay off (`useImportExtensions` fights Next.js; the resolver does not understand WXT `#imports`, CSS modules, or package `#` paths).
- Next.js apps load images with `next/image` and scripts with `next/script`
- Put Tailwind utilities on native hosts (`div`, React Native `View`/`Text`/`Pressable`, React Email `Section`/`Text`), or inside the component that owns the look
- Callers change a design-system component through props, not extra utility classes
- Named `@theme` tokens replace arbitrary Tailwind values (`w-[320px]`) and raw palette classes (`text-gray-700`)
- Node tests use `it()`; Playwright specs use `test()`; titles start in lowercase; `expect()` stays outside `if` / `?:` / `&&`
- CSS colors use `rgb()` / `hsl()` / `oklch()` / named colors, not hex
- Do not spread inside `map()` / `flatMap()` callbacks; build a new object with `Object.assign({}, item, extra)` or `item.concat(...)` so originals stay unchanged
- Await the value first, then update shared state (`const delta = await get(); total += delta`)
- Empty blocks must contain a comment that states why they are empty, or be replaced with real handling
- `className` joins go through `cn()` from the `cn` package. Biome plugin
  [`use-cn-for-classname.grit`](../../../../biome/plugins/use-cn-for-classname.grit) rejects a
  template literal, a `+`, a `.join()`, `clsx`, `cx`, `classnames`, and `joinClassNames` in
  `className`. `cn()` also resolves Tailwind conflicts, so a caller's class overrides the
  component's default instead of depending on CSS order.

Do not restate formatter choices in reviews or hand-format around them. Change `biome.json` only when the repository-wide policy itself is intentionally changing.

## Isolated declarations

Compiled workspace packages that emit `.d.ts` files enable `isolatedDeclarations` in `@bondery/typescript-config/base.json`. Every exported function, const, and class member needs an explicit type so declaration emit does not walk other files.

`@bondery/schemas` turns the flag off. Zod schemas are composed with `.extend()`, `.pick()`, and `.shape`. Annotating those exports as `z.ZodType<T>` would satisfy the compiler and break composition.

Apps that do not emit declarations (`noEmit`, or `declaration: false`) keep the flag off.

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
