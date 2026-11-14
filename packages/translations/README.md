# @bondery/translations

Namespace-based i18n resources for Bondery (web, mobile, website).

## Layout

```
manifest.json          # namespace registry + preload groups
src/locales/
  en/
    common.json
    validation.json
    glossary.json
    features/pages/…
    features/sections/…
    platform/web/…
    platform/mobile/…
  cs/…
  de/…
  es/…
  fr/…
  hu/…
  pl/…
  pt/…
  ru/…
  sk/…
  uk/…
```

A **namespace** is the JSON filename without `.json` (folders are organizational only).

## Runtime API

```typescript
import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  i18nConfig,
  loadNamespace,
  namespacesForPlatform,
  preloadGroup,
  resourceLoader,
} from "@bondery/translations";
```

Locale codes and `DEFAULT_LOCALE` are defined in `@bondery/schemas` (`supportedLocaleSchema`, `packages/schemas/locale/supported-locales.json`).

- `defaultNS` is `"common"`.
- `resourceLoader(locale, namespace)` loads one namespace.
- `preloadGroup("web.shell")` returns namespace names for route/layout preloading.

## Direct JSON imports

```typescript
import about from "@bondery/translations/locales/en/features/pages/AboutPage.json";
```

## App hooks

Generated per namespace from `manifest.json` (run `pnpm run build -w @bondery/translations`).

**Webapp**

```typescript
import { useGroupsPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { getGroupsPageTranslations } from "@/lib/i18n/generated/hooks.server";

const t = useGroupsPageTranslations("AddGroupModal");
const tCommon = useCommonTranslations();
```

**Mobile**

```typescript
import { useMobileSettingsTranslations } from "@/lib/i18n/generated/hooks";

const t = useMobileSettingsTranslations();
```

**Chrome extension**

```typescript
import { useExtensionPopupTranslations } from "../lib/i18n/generated/hooks";

const t = useExtensionPopupTranslations("LoggedOut");
```

Legacy generic hooks (`useWebTranslations`, `useMobileTranslations`, `getWebTranslations`) and per-call `{ ns: }` overrides are removed — use generated namespace hooks instead. See [`docs/contributing/i18n.mdx`](../../docs/contributing/i18n.mdx).

## Supported locales

Defined in [`packages/schemas/locale/supported-locales.json`](https://github.com/usebondery/bondery/blob/main/packages/schemas/locale/supported-locales.json) and exported as `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, and `APP_LOCALE_METADATA` from `@bondery/schemas/locale` (re-exported by `@bondery/translations`).

| Code | Language |
|------|----------|
| `en` | English (reference / `DEFAULT_LOCALE`, `en-US`) |
| `bg` | Bulgarian (`bg-BG`) |
| `cs` | Czech (`cs-CZ`) |
| `da` | Danish (`da-DK`) |
| `de` | German (`de-DE`) |
| `el` | Greek (`el-GR`) |
| `es` | Spanish, Spain (`es-ES`) |
| `et` | Estonian (`et-EE`) |
| `fi` | Finnish (`fi-FI`) |
| `fr` | French (`fr-FR`) |
| `hr` | Croatian (`hr-HR`) |
| `hu` | Hungarian (`hu-HU`) |
| `it` | Italian (`it-IT`) |
| `lt` | Lithuanian (`lt-LT`) |
| `lv` | Latvian (`lv-LV`) |
| `nb` | Norwegian, Bokmål (`nb-NO`) |
| `nl` | Dutch, Netherlands (`nl-NL`) |
| `pl` | Polish (`pl-PL`) |
| `pt` | Portuguese, Portugal (`pt-PT`) |
| `ro` | Romanian (`ro-RO`) |
| `ru` | Russian (`ru-RU`) |
| `sk` | Slovak (`sk-SK`) |
| `sl` | Slovenian (`sl-SI`) |
| `sr` | Serbian, Latin (`sr-Latn-RS`) |
| `sv` | Swedish (`sv-SE`) |
| `tr` | Turkish (`tr-TR`) |
| `uk` | Ukrainian (`uk-UA`) |

## i18next-cli (lint, types, status)

Nested locale files stay canonical; [`i18next.config.ts`](./i18next.config.ts) points `extract.output` at a gitignored flat mirror (`.temp/i18next-cli-mirror/`, at the repo root) built by `scripts/sync-locale-mirror.mjs` so `i18next-cli status` can resolve namespaces.

The mirror must stay **outside** this package. It is build-time input only and never reaches `dist`, but this package is a workspace dependency injected into the pnpm store (`injectWorkspacePackages: true`). pnpm hardlinks the package files, so writing generated files inside the package directory breaks those hardlinks and aborts install with `ERR_PNPM_INJECTED_DEPS_SYNC_LINK`.

From the repo root:

```bash
pnpm run check:i18n:lint       # hardcoded strings (webapp + mobile; website excluded until localized)
pnpm run i18n:status           # local i18next-cli completeness (not authoritative for namespace hooks)
pnpm run i18n:types            # regenerate src/generated/i18next-cli/*.d.ts
pnpm run check:i18n:structure  # Bondery manifest / Languages exonym / forbidden-pattern rules
```

CI runs `pnpm run check:i18n` (structure, types, usage, lint). API error translations are validated by `pnpm run check:api-errors`. Use `pnpm run i18n:status` locally only — it runs i18next-cli against the flat mirror and is not authoritative for namespace-scoped hooks.

Suppress intentional literals with `i18next-instrument-ignore` or `i18next-instrument-ignore-next-line` in source.

## Build

```bash
pnpm run build -w @bondery/translations
```

Generates `src/generated/resources.ts`, compiles TypeScript, copies `src/locales` to `dist/locales`, and validates `manifest.json`.

During `pnpm run dev:webapp-api`, `dev` copies locale JSON into `dist/` when files change. Refresh the app to see new strings. Run `build` after adding keys or namespaces that need typed hooks.
