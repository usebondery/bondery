---
name: Package Upgrade Workflow
description: Safe, incremental process for upgrading npm dependencies across the Bondery monorepo.
triggers:
  - monthly dependency maintenance
  - security advisory requiring a bump
  - major framework upgrade (Next.js, Expo, Mantine, etc.)
related:
  - ../../skills/upgrading-expo/SKILL.md
  - ../../skills/next-best-practices/SKILL.md
  - ../../skills/mantine-best-practices/SKILL.md
  - ../../../.github/instructions/changelog.instructions.md
---

# Package Upgrade Workflow

Upgrade dependencies in small steps. One ecosystem per PR. Every touched workspace must **build** before merge.

**Choose a path:**

| Path | When | Go to |
|------|------|-------|
| Bulk | Patch/minor within existing ranges | Step 1 |
| Major | Range edit or breaking release | Step 2 |
| Security | Advisory / `npm audit` | Step 2 (one fix per PR) |

**Workspaces:** `apps/api`, `apps/webapp`, `apps/mobile`, `apps/website`, `apps/chrome-extension`, `apps/supabase-db`, and `packages/*`. Package manager: npm workspaces + Turborepo.

---

## 0. Baseline

```bash
npm outdated --workspaces
npm outdated --workspaces --json   # for agents
```

Classify each entry: **patch/minor** → Step 1, **major** → Step 2. Framework minors (Next.js, Expo, Mantine, TypeScript) still go through Steps 2–5.

**React / react-dom** — must be one version across the monorepo. Mixed versions cause duplicate React and broken hooks.

```bash
npm ls react react-dom --workspaces
```

Align `react` and `react-dom` to the **same exact version** in every workspace that lists them (`apps/webapp`, `apps/website`, `apps/mobile`, `apps/chrome-extension`, `packages/emails`, etc.). Mobile may use a pin (`19.2.3`) while webapp uses a caret — after any React bump, set them to match.

Also check:

- `npm ls <pkg>` for duplicate transitive versions (`esbuild`, `zod`, …)
- Expo packages (`~`) — never bulk-update; use Step 2 Expo batch
- Root `allowScripts` — add entries for new native/postinstall packages
- `patches/` — remove obsolete patches

Save the outdated list for Step 6.

---

## 1. Bulk patch and minor

```bash
npm update --workspaces
npm install                        # if lockfile looks wrong
```

Skip Expo SDK packages. If a package needs a `package.json` range edit, that is a major upgrade (Step 2). `npm update` only moves within declared ranges — use `npm install <pkg>@<version> -w <workspace>` when you need a specific target.

Build every workspace you touched, then commit:

```
deps: bump patch and minor dependencies
```

---

## 2. Major upgrades (one ecosystem per PR)

Upgrade shared foundations first, then apps:

1. Root tooling (`turbo`, `@biomejs/biome`)
2. **TypeScript** — all workspaces at once
3. **React / react-dom** — all workspaces at once
4. Shared packages (`packages/schemas`, `packages/helpers`, `packages/mantine-next`, …)
5. `apps/api` → `apps/webapp` → `apps/website` → `apps/chrome-extension` → `apps/mobile`

### Batch together

| Ecosystem | Workspaces | Notes |
|-----------|------------|-------|
| **TypeScript** | Every workspace with `typescript` in `devDependencies` | Bump all to the same version. Run `check-types` everywhere, then build all touched workspaces. |
| **React / react-dom** | All apps + `packages/emails` | Same exact version everywhere. Run `npm ls react` after install. |
| **Zod** | `packages/schemas`, `apps/api`, `apps/webapp` | Run `npm run test:contracts -w packages/schemas`. |
| **Mantine** | `apps/webapp`, `apps/website`, `packages/mantine-next` | Same version on every `@mantine/*`. See [mantine-best-practices](../../skills/mantine-best-practices/SKILL.md). |
| **Next.js** | `apps/webapp`, `apps/website` | `npx @next/codemod@latest upgrade`. See [next-best-practices](../../skills/next-best-practices/SKILL.md). |
| **Expo SDK** | `apps/mobile` | `npx expo install expo@<target>` then `npx expo install --fix`. See [upgrading-expo](../../skills/upgrading-expo/SKILL.md). |
| **Tamagui** | `apps/mobile` | All `@tamagui/*` at the same version. |
| **TanStack Query** | `apps/webapp` | Query + devtools together. |
| **TipTap** | `apps/webapp` | All `@tiptap/*` aligned. |
| **Supabase** | `apps/api`, `apps/webapp`, `apps/supabase-db` CLI | Regenerate types: `npm run generate-types`. |
| **Fastify** | `apps/api` | `fastify` + `@fastify/*` together. |

Per ecosystem: edit ranges → `npm install` → Steps 3–6 → merge before starting the next.

---

## 3. Read migration notes

Before editing code, fetch official release notes and migration guides for each major bump.

```
Web search: "<package> <from> to <to> migration"
Web search: "<package> <to> breaking changes"
```

Grep the repo for APIs the guide says were removed. List config files that may need updates (`next.config.ts`, `app.json`, `metro.config.js`). Run codemods before hand-editing.

Repo checks:

| Trigger | Command / file |
|---------|----------------|
| API schema change | `npm run generate-openapi` |
| Supabase client bump | `npm run generate-types` (needs `npm run dev:supabase`) |
| Env renames | `.env.*.example` per app |
| Extension API break | `packages/helpers/src/constants.ts` (`MIN_EXTENSION_VERSION`) |

---

## 4. Apply code changes

1. Run codemods (`npx @next/codemod@latest upgrade`, etc.)
2. Fix type errors: `npm run check-types -w <workspace>`
3. Lint: `npm run lint -w <workspace>`
4. Regenerate artifacts if needed (OpenAPI, Supabase types)
5. Update `packages/translations` (`en.json` + `cs.json`) when UI copy changes

One ecosystem per commit:

```
deps(webapp): upgrade Next.js 16.x → 17.x
```

---

## 5. Build every touched workspace

**Build is the gate.** Type-check and lint alone are not enough — production errors often appear only at build time.

Build each workspace you changed. If a shared package changed, also build its consumers.

```bash
# Apps (from repo root — prefer Turbo; matches CI/Vercel)
npx turbo build --filter=api
npx turbo build --filter=webapp
npx turbo build --filter=website
npx turbo build --filter=chrome-extension

# Or shortcuts: npm run build:api, build:webapp, build:website

# Packages — optional emit of dist/ for types only (not required for app builds)
npm run build -w @bondery/schemas
npm run build -w @bondery/helpers
npm run build -w @bondery/emails
npm run build -w @bondery/vcard
npm run build -w @bondery/branding

# Packages without build — verify via consumers
npm run check-types -w packages/mantine-next
npm run check-types -w packages/translations

# Mobile — no build script; use:
npm run check-types -w apps/mobile
npx expo-doctor                        # run inside apps/mobile

# Large PR — full check before merge
npm run build                          # turbo build (all apps)
```

| Workspace | Build command | Requires |
|-----------|---------------|----------|
| `apps/api` | `npx turbo build --filter=api` | `apps/api/.env.production.local` |
| `apps/webapp` | `npx turbo build --filter=webapp` | `.env.production.local`, runs icon generation |
| `apps/website` | `npx turbo build --filter=website` | `.env.production.local` |
| `apps/chrome-extension` | `npx turbo build --filter=chrome-extension` | extension env files |
| `apps/mobile` | `check-types` + `expo-doctor` | — |
| `packages/*` | `npm run build -w @bondery/<name>` if you need `dist/` | — |

**Webapp note:** `check-types` also runs `check-api-fetch:strict` and `check-query-patterns:strict` — run it even when build passes.

**On failure:** read the error, build dependencies first (turbo graph), fix the break — do not pin old versions without documenting why.

---

## 6. Summarize and propose manual testing

End with a summary in the PR or handoff. Commit `package-lock.json` with every `package.json` change.

### 6a. Summary template

```markdown
## Package upgrade summary

### Updated packages
| Package | From | To | Workspace(s) |
|---------|------|----|--------------|

### Breaking changes
| Package | Change | Fix applied |
|---------|--------|-------------|

### Code changes
- apps/webapp: …
- Generated artifacts: openapi / supabase.types (yes/no)

### Build verification
| Workspace | `npm run build` | Result |
|-----------|-----------------|--------|
| apps/webapp | pass / fail | |

### Deferred
| Package | Reason |
|---------|--------|
```

Changelog: **📦 Dependencies** section, `deps:` commit prefix ([changelog instructions](../../../.github/instructions/changelog.instructions.md)).

### 6b. Propose manual and UX testing

Build passing does not mean UX is fine. From the **git diff**, list every changed component, page, hook, and route. Map each to a user-facing flow and propose what a human should click through.

**How to build the test list:**

1. `git diff --name-only` on the upgrade branch
2. Group files by app and feature area
3. For each group, write: **screen → action → what to look for**

**Example output (include this in the PR summary):**

```markdown
### Manual / UX testing

| Area | Screen / flow | What to verify |
|------|---------------|----------------|
| Contacts | People list, person detail | Table sort, row selection, avatar initials |
| Chat | Session sidebar, message input | Streaming, person chips, quota badge |
| Modals | Add contact, delete contact | Open/close, focus trap, confirm destructive |
| Mobile | Contact detail sheet | Sheet animation, form save, keyboard |
| Extension | LinkedIn import popup | Content script injects, OAuth still works |
```

**Ecosystem → typical areas to test:**

| If you upgraded… | Test these areas |
|------------------|------------------|
| Mantine / `@bondery/mantine-next` | Modals, forms, tables, date pickers, notifications, spotlight |
| Next.js | Page navigation, loading states, server/client boundaries, metadata |
| TanStack Query | List pages, optimistic updates, error toasts, refetch on focus |
| TipTap | Rich text fields (notes, interactions) |
| Expo / Tamagui / RN | Navigation, sheets, image picker, secure store, tab bar |
| Supabase client | Auth session, realtime if used, storage uploads |
| Fastify / Zod / schemas | API routes touched by migration; extension + mobile API calls |
| React / TypeScript | Any screen using hooks, context, or refs — spot-check main flows |
| Chrome extension | Content scripts, side panel, API version handshake |

Mark each row **tested / not tested** in the PR. UI-facing upgrades should not merge with untested rows.

---

## Do not

- Upgrade multiple ecosystems in one PR
- Skip the Step 0 baseline
- Leave `react` / `react-dom` on different versions across workspaces
- Merge without building every touched workspace
- Skip manual testing on UI-facing changes
- Commit `package.json` without `package-lock.json`
