# Add a language

Do this once per language. Another open language branch will conflict on the shared files in the list below. Add only your code. Do not delete another locale's keys.

## 1. Catalog

Edit `packages/schemas/locale/supported-locales.json`.

```json
{ "code": "fr", "flag": "fr", "intl": "fr-FR", "nativeName": "français" }
```

- `code` is the UI locale and the Postgres enum label.
- `flag` is a flag-icons country code. Czech is `cz`. Ukrainian is `ua`.
- `intl` is the region tag. Read [formatting.md](./formatting.md) before you invent one.
- `nativeName` is the name in that language, in the script users expect.
- Leave `default` as `en`.

`intlTagForLocale()` in `@bondery/schemas/locale` reads `intl`. Email dates, dictation, the mobile date wheel, and `useDateFormatter` call it. Do not add a new `locale === "cs"` branch.

## 2. Database

Add the code to `enum SupportedLocale` in `packages/db/prisma/models/settings.prisma`.

Add a migration. `ALTER TYPE ... ADD VALUE` cannot run inside a transaction on PostgreSQL. The shipped migration rebuilds the enum. Follow that file if you add another value. Then run `pnpm run db:generate -w @bondery/db`.

## 3. Locale files

Copy `packages/translations/src/locales/en` to `packages/translations/src/locales/<code>`.

Translate values in place. Do not rename keys or files.

`Languages.json` in **every** locale, including `en`, `cs`, and `de`, needs a key for the new code. The value is the language name in that locale. Slovak in Czech is `slovenčina`. `slovenština` means Slovene.

## 4. Shared files that do not read the catalog

These already read the catalog. Confirm a new code does not need a manual list:

- `packages/translations/scripts/generate-api-error-translations.mjs`
- `scripts/check/check-api-errors-translations.mjs`
- `apps/webapp/src/lib/i18n/loadDayjsLocales.ts` — add `import "dayjs/locale/<code>"`. Portugal is `pt`, not `pt-br`. Norwegian is `nb`, not `nn`. Serbian is `sr`, not `sr-cyrl`.
- `apps/webapp/src/lib/speech/dictation/dictationLanguage.test.ts` — the unknown-locale fixture must stay a code that is not supported. It was `ja` after French shipped.

Do not edit the root `i18next.config.ts`.

## 5. API errors

`common.json` `errors.api` is user-visible. Translate it with the rest of the file.

The generator overwrites a key when that key has a curated sentence for the locale. Otherwise it keeps an existing translation. Put a hand-written sentence in the generator only for the same codes that `cs` and `de` already override. Run the generator after those sentences exist, not before the rest of the file is translated.

## 6. Generate and check

```bash
pnpm run build -w @bondery/schemas
pnpm run build -w @bondery/translations
pnpm run i18n:inlang -w @bondery/translations
pnpm run check:i18n
pnpm run check:api-errors:translations
```

Update the locale table in `docs/contributing/i18n.mdx` and `packages/translations/README.md`. Add a changelog line. A new enum value needs a self-host breaking note.

## Checklist

- [ ] Catalog `intl` is a region tag, not a bare language code
- [ ] Enum and migration include the code
- [ ] File tree matches `en`
- [ ] Exonyms exist in every `Languages.json`
- [ ] dayjs locale is imported
- [ ] Checks above pass
