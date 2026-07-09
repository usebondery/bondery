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

**Webapp**

```typescript
useWebTranslations("SettingsPage", "Profile"); // t("Title") → SettingsPage.Profile.Title
useCommonTranslations(); // t("actions.cancel")
useValidationTranslations("fields"); // prefer useWebTranslations("validation", "fields") for static analysis
```

**Mobile**

```typescript
useMobileTranslations("MobileContacts"); // t("Title")
t("actions.cancel", { ns: "common" });
```

## Supported locales

Defined in [`packages/schemas/locale/supported-locales.json`](https://github.com/usebondery/bondery/blob/main/packages/schemas/locale/supported-locales.json) and exported as `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, and `APP_LOCALE_METADATA` from `@bondery/schemas/locale` (re-exported by `@bondery/translations`).

| Code | Language |
|------|----------|
| `en` | English (reference / `DEFAULT_LOCALE`) |
| `cs` | Czech |
| `de` | German |

## i18next-cli (lint, types, status)

Nested locale files stay canonical; [`i18next.config.ts`](./i18next.config.ts) points `extract.output` at a gitignored flat mirror (`.i18next-cli-mirror/`) built by `scripts/sync-locale-mirror.mjs` so `i18next-cli status` can resolve namespaces.

From the repo root:

```bash
npm run i18n:lint          # hardcoded strings (webapp + mobile; website excluded until localized)
npm run i18n:status        # translation completeness vs code usage
npm run i18n:types         # regenerate src/generated/i18next-cli/*.d.ts
npm run check-translations # Bondery manifest / Languages exonym / forbidden-pattern rules
```

CI also runs `i18n:types:check`, `i18n:status:check`, hook-extraction parity (`scripts/verify-i18next-hook-extraction.mjs`), and strict `i18n:lint`.

Suppress intentional literals with `i18next-instrument-ignore` or `i18next-instrument-ignore-next-line` in source.

## Build

```bash
npm run build --workspace=@bondery/translations
```

Generates `src/generated/resources.ts`, compiles TypeScript, copies `src/locales` to `dist/locales`, and validates `manifest.json`.
