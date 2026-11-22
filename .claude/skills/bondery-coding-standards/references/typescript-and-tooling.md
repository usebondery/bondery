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
- `function` expressions and `export default function()` must have a name (`useNamedFunction`). Arrow functions and object methods are out of scope. Prefer a named declaration or an arrow, not an anonymous `function()`.
- Prefer destructuring when a local copies a same-named property or a fixed array index (`useDestructuring`). Write `const { foo } = obj` and `const [first] = arr`, not `const foo = obj.foo` or `const first = arr[0]`. Regex groups: `const [block] = match` and `const [, name] = match`.
- Do not compare with `== null` or `!= null` (`noEqualsToNull`). Write `=== null` / `!== null`. If undefined is also in the domain, write `value === null || value === undefined` or `value !== null && value !== undefined`.
- `Array#sort` and `toSorted` take a compare function (`useArraySortCompare`). Strings: `(left, right) => left.localeCompare(right)`. Numbers: `(left, right) => left - right`.
- Put every non-export declaration above the first export (`useExportsLast`). Directives and imports stay at the top. If a later helper is a dependency of an earlier export, declare it first, then `export { … }` at the end. Do not duplicate a declaration to satisfy the rule.
- Hoist a `/.../` inside a function to a module-level `const NAME = /.../` after imports (`useTopLevelRegex`). Skip `g` and `y` flags. Do not hoist a regex that must be new each call. Keep `new RegExp` when the pattern is interpolated.
- Keep import statements first after directives and file comments (`useImportsFirst`).
- Do not use the `void` operator (`noVoid`). For a promise the caller cannot await, call `detachPromise` from `@bondery/helpers/async`. Pass `onRejected` when the caller has a logger. A `.mjs` or plain `.js` file that cannot import helpers uses `.then(() => undefined, onRejected)`.
- `Number#toFixed()` always takes a digit count (`useNumberToFixedDigitsArgument`). Write `.toFixed(0)`, not `.toFixed()`.
- CSS must be Baseline newly available (`useBaseline`, `available: "newly"`). Gate other properties with `@supports`. `::selection` is allowlisted because Biome 2.6.8 still reports it.
- Group digits in long numbers (`useNumericSeparators`). Prefer object spread over `Object.assign` (`useObjectSpread`). Scripts that are not ESM modules keep `"use strict"` (`useStrictMode`). JSDoc block lines use one asterisk (`useSingleJsDocAsterisk`).
- Write array types as `T[]` and `readonly T[]`, not `Array<T>` or `ReadonlyArray<T>` (`useConsistentArrayType`, `syntax: "shorthand"`). Wrap unions and function types: `(string | number)[]`.
- Arrow functions that only `return` a value omit the braces (`useConsistentArrowReturn`, `style: "asNeeded"`). Keep a block when the body has a directive, a comment, or a bare `return`.
- Do not write `public` on class members (`useConsistentMemberAccessibility`, `accessibility: "noPublic"`). Default accessibility is public. Keep `private` and `protected`.
- Interface and type-alias call members use property syntax (`useConsistentMethodSignatures`, `style: "property"`): `fn: (arg: T) => R`, not `fn(arg: T): R`. Property form is contravariant under `strictFunctionTypes`. One exception: `packages/translations/src/i18n-types.ts` keeps a method-form `bivarianceHack` so `t as LooseTranslateFn` still overlaps i18next overloads. That file turns the rule off in `biome.json`.
- `var` is an error (`noVar`). `useVarsOnTop` stays on so a `var` that slips through must still sit at the top of its scope.
- `for-in` is an error (`noForIn`). Prefer `for...of` or `Object.keys` / `Object.entries`. `useGuardForIn` stays on so a `for-in` that exists must still wrap the body in `if (Object.hasOwn(obj, key))`.
- Do not call `process.exit()`; set `process.exitCode` and return, or throw
- Do not use TypeScript `enum`, `namespace`, or constructor parameter properties (`erasableSyntaxOnly` already forbids them)
- Object literals use shorthand (`{ foo }` not `{ foo: foo }`)
- One class per file; split implementations when a file grows a second class
- Prefer ESM; Expo `metro.config.js` and `babel.config.js` stay CommonJS because Metro loads them that way
- Biome domains `next`, `react`, `tailwind`, `test`, `tanstackQuery`, `project`, and `types` are `"all"` (nursery included). `noPrivateImports`, `noUntrustedLicenses`, `useArraySortCompare`, and `useConsistentEnumValueType` are on. Also on: `noUndeclaredVariables`, `noUselessCall`, `noUselessSplice`, `noVar`, `useVarsOnTop`, `noForIn`, `useGuardForIn`, `noEqualsToNull`, `noAlert`, `noBitwiseOperators`, `useNamedFunction`, `useConsistentArrayType`, `useConsistentArrowReturn`, `useConsistentMemberAccessibility`, `useConsistentMethodSignatures`. Drizzle stays off (Prisma is the data layer). The `types` domain turns on Biome’s type inference. `useDisposables`, `useRegexpExec`, and `useStrictBooleanExpressions` stay off.
  - `javascript.globals` lists `__DEV__` for Expo. Do not add `chrome` there; the extension uses `browser` from `wxt/browser`.
  - `noUnsafeTypeAssertion` stays **off**. It bans every `as T` except `as const`. This tree has over a thousand of those at JSON.parse, Prisma rows, OpenAPI YAML, DOM scrape, and `as unknown as` bridges. Replacing them needs a guard or a schema at each boundary, not a bulk rewrite. `noUselessTypeAssertion` already rejects assertions that do no work.
- React domain rules that stay **on**: `noDuplicatedSpreadProps`, `noJsxLeakedDollar`, `noLeakedRender`, `noUnknownAttribute`, `useReactCompiler`, `useUniqueElementIds`.
- Rules that stay **off** (do not enable them later without a new decision):
  - `noJsxPropsBind` flags inline arrow functions, function expressions, and `.bind()` in JSX props. That is a legacy re-render concern. It produces noise in modern React, and more so with the React Compiler.
  - `useReactNamingConvention` only enforces names for `createContext`, `useId`, and `useRef` results. That is cosmetic. It costs churn and does not catch bugs.
  - `useComponentExportOnlyModules` forbids helper and constant co-exports from a component file. That is a file-layout preference. It costs churn and does not catch bugs.
  - `noUnresolvedImports`: `tsc` already fails on unresolved imports, and it understands exports maps, paths, and custom conditions. Biome's resolver is a second implementation that tends to disagree in monorepos, and it adds a project scan to every lint run.
  - `useImportExtensions` forces `.js` or `.ts` extensions on relative imports. That only makes sense for packages resolved with NodeNext, and there `tsc` already enforces it. For everything on the bundler preset it would add noise and fight framework tooling. Leave it off globally. Enable it only in a Node preset override if you want a lint-time autofix for those packages.
  - `useStrictBooleanExpressions` is the Biome counterpart of typescript-eslint's `strict-boolean-expressions`. It outlaws truthiness checks on strings, numbers, and nullable values, which produces a flood of churn. `noUncheckedIndexedAccess`, `noLeakedRender`, and the floating-promise rules already cover its main bug classes.
  - `useRegexpExec` is a stylistic preference for `exec` over `match`, with negligible bug-catching value.
  - `useDisposables` flags disposable objects assigned to variables without `using` or `await using`. That only helps once the code actually uses explicit resource management, and the mobile and extension runtimes would need to support it. Leave it off until `using` is adopted deliberately.
- `noUnknownAttribute` is off under `apps/website/src/components/landing/features/lock3d/**`. Those files use React Three Fiber host elements (`mesh`, `group`, `directionalLight`), whose props are Three.js fields, not DOM attributes.
- `noBitwiseOperators` is off in the files that encode bits on purpose: Unix modes, x509 key usage, Chrome Web Store key id, djb2/RGB hashes, and vCard base64. `noAccidentalBitwiseOperators` still runs on those files.
- Next.js apps load images with `next/image` and scripts with `next/script`
- Put Tailwind utilities on native hosts (`div`, React Native `View`/`Text`/`Pressable`, React Email `Section`/`Text`), or inside the component that owns the look
- Callers change a design-system component through props, not extra utility classes
- Named `@theme` tokens replace arbitrary Tailwind values (`w-[320px]`) and raw palette classes (`text-gray-700`)
- Node tests use `it()`; Playwright specs use `test()`; titles start in lowercase; `expect()` stays outside `if` / `?:` / `&&`
- CSS colors use `rgb()` / `hsl()` / `oklch()` / named colors, not hex
- Do not spread inside `map()` / `flatMap()` callbacks (`noMapSpread`). `Object.assign` is also an error (`useObjectSpread`). Build a new array with `for...of` and `push({ ...item, extra })`, or `item.concat(...)` for arrays, so originals stay unchanged
- Await the value first, then update shared state (`const delta = await get(); total += delta`)
- Empty blocks must contain a comment that states why they are empty, or be replaced with real handling
- `className` joins go through `cn()` from the `cn` package. Biome plugin
  [`use-cn-for-classname.grit`](../../../../biome/plugins/use-cn-for-classname.grit) rejects a
  template literal, a `+`, a `.join()`, `clsx`, `cx`, `classnames`, and `joinClassNames` in
  `className`. `cn()` also resolves Tailwind conflicts, so a caller's class overrides the
  component's default instead of depending on CSS order.

Do not restate formatter choices in reviews or hand-format around them. Change `biome.json` only when the repository-wide policy itself is intentionally changing.

## Isolated declarations

Every app and package `tsconfig.json` extends a preset from `@bondery/typescript-config`: `base.json`, `nextjs.json`, or `react-library.json`. `nextjs.json` extends `base.json`.

Mobile and the Chrome extension use an `extends` array. The vendor config is first (`expo/tsconfig.base` or `./.wxt/tsconfig.json`). `@bondery/typescript-config/base.json` is last so overlapping keys use our flags.

`tsBuildInfoFile` lives only in `base.json` as `${configDir}/.cache/tsconfig.tsbuildinfo`. App and package tsconfigs do not set that path.

`base.json` targets `ES2022` and sets `allowJs` to false. App tsconfigs and `nextjs.json` do not turn `allowJs` on. Expo's preset sets `allowJs` true; mobile lists our base last so the flag stays false. TypeScript programs include `.ts` and `.tsx` only. Node scripts stay `.mjs` and are not part of `tsc`. `check:tsconfig-extends` fails a tsconfig that sets `allowJs` to true.

`base.json` enables `noUnusedLocals` and `noUnusedParameters`. App tsconfigs do not set a lower `target`. Unused locals are removed. Unused parameters may use a `_` prefix.

`base.json` enables `noPropertyAccessFromIndexSignature`. Dot access is only for known named keys. `NodeJS.ProcessEnv` and `Record<string, T>` are index signatures, so read them with `env["NAME"]`. When the key set is closed, give it a named type or `Record<Union, T>` instead of `Record<string, T>`. Do not add extra named keys to `ProcessEnv`.

Compiled workspace packages that emit `.d.ts` files enable `isolatedDeclarations` in `@bondery/typescript-config/base.json`. Every exported function, const, and class member needs an explicit type so declaration emit does not walk other files.

`@bondery/schemas` turns the flag off. Zod schemas are composed with `.extend()`, `.pick()`, and `.shape`. Annotating those exports as `z.ZodType<T>` would satisfy the compiler and break composition.

Apps that do not emit declarations (`noEmit`, or `declaration: false`) keep the flag off.

## Imports and environment access

- Import public package subpaths, not another workspace's `src/` internals.
- Follow the compiled-package and `.js` internal-import rules in [`bondery-core`](../../bondery-core/SKILL.md).
- Do not add barrel files merely for shorter imports; use existing package exports.
- Read environment values through established config/env helpers. New variables must be added to the canonical environment manifest and examples, not only to `process.env` access. `process.env.NAME` is a TS4111 error; use `process.env["NAME"]` or a typed config helper.
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

`pnpm run check:changed` runs `biome check` (errors fail; warnings do not). CI `pnpm exec biome ci .` fails on warnings too. `noExcessiveLinesPerFunction` is warn. Do not split large functions unless a task asks for it.

Do not use root `pnpm run lint` for verification; it runs `biome check --write .` and mutates files. Route type checks, package consumers, tests, and boundary checks through [`bondery-verification-loop`](../../bondery-verification-loop/SKILL.md).

## Tooling checklist

- [ ] Untrusted values are validated or narrowed from `unknown`
- [ ] Shared/generated types are reused instead of duplicated
- [ ] Assertions and `any` are absent or justified at the boundary
- [ ] Imports respect package exports and compiled-package rules
- [ ] Environment variables use canonical helpers/manifests and do not expose secrets
- [ ] Non-mutating Biome checks pass for changed files
- [ ] Workspace type checks and consumer checks follow `bondery-verification-loop`
