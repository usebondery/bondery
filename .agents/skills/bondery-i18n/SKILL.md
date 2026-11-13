---
name: bondery-i18n
description: >
  Add or review a Bondery UI locale. Use when adding a language, translating
  packages/translations, choosing copy for a supported locale, fixing plurals,
  exonyms, region tags,
  or the supported_locale enum.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery i18n

## When to use

- Adding a UI language
- Translating `packages/translations`
- Fixing plurals, exonyms, dates, or speech for a locale
- Reviewing a language pull request

`bondery-ux` owns the rule that UI strings go through translations. This skill owns how a new locale ships. `bondery-legal` owns Privacy and Terms. Do not translate those here.

## Non-negotiables

- English (`en`) is the source. Copy keys from `en`. Do not rename keys.
- One language per branch. Do not edit another locale's folder.
- Register the code in `packages/schemas/locale/supported-locales.json` with `code`, `flag`, `intl`, and `nativeName`. `intl` is the BCP 47 tag. `pt` alone is not enough, because `Intl` treats bare `pt` as Brazilian Portuguese.
- Add the same code to the Prisma enum `SupportedLocale` and ship a migration.
- Placeholders stay `{token}` in product JSON. Do not convert them to `{{token}}`.
- Keep `Bondery`, `PRM`, GitHub, LinkedIn, Instagram, WhatsApp, Signal, and Stripe.
- Do not translate the marketing site, docs, or legal pages.
- Do not edit `packages/helpers/src/locale/world-languages.ts` for a UI locale. That list is the contact's spoken language.
- Do not edit the root `i18next.config.ts`. The package config reads the catalog.
- `Languages.json` in every shipped locale needs an exonym for the new code. `check:i18n:structure` fails without it.
- Extra plural keys `_few`, `_many`, and `_zero` are allowed. Every English key is still required.
- One form of address per language. Do not mix formal and informal the way German `du` and `Sie` are mixed.
- Lexend ships `latin` and `latin-ext`. It has no Cyrillic and no Greek. Russian, Ukrainian, Bulgarian, and Greek fall back to `sans-serif` for those glyphs. Do not add a second font in a translation change.

## Decision tree

| Task | Read |
|------|------|
| Register a locale and touch the shared files | [references/add-language.md](references/add-language.md) |
| Voice, placeholders, glossary, what to leave in English | [references/translation-quality.md](references/translation-quality.md) |
| Plurals, gender, case, Hungarian suffixes | [references/grammar.md](references/grammar.md) |
| Dates, numbers, quotes, dayjs, speech, sort | [references/formatting.md](references/formatting.md) |
| Any shipped locale's voice, plurals, and glossary | [references/locale-profiles.md](references/locale-profiles.md) |

Full index: [references/README.md](references/README.md).

## Pre-ship checklist

- [ ] Catalog entry has `intl`. Dates, speech, and email use that tag.
- [ ] Prisma enum and migration include the code.
- [ ] Locale tree matches `en`. No extra files.
- [ ] `Languages.json` in every locale has the new code.
- [ ] Language-specific plural keys exist. Counts 0, 1, 2, 4, 5, 12, and 22 were checked.
- [ ] Placeholders and HTML tags match English.
- [ ] Glossary uses one noun per entity.
- [ ] `pnpm run build -w @bondery/translations` was run.
- [ ] `pnpm run i18n:inlang -w @bondery/translations` was run.
- [ ] `pnpm run check:i18n` passes.
- [ ] `pnpm run check:api-errors:translations` passes.
- [ ] Changelog notes the language and, for a new enum value, the self-host migration.
