# Formatting

## Region tag

`supported-locales.json` `intl` is the tag for `Intl`, speech, and email dates.

| Code | Tag | Note |
|------|-----|------|
| `en` | `en-US` | The flag is `gb`. Dates stay `en-US`. |
| `pt` | `pt-PT` | Bare `pt` formats as Brazilian Portuguese. |
| `es` | `es-ES` | Spain. Decimal comma. |
| `uk` | `uk-UA` | The flag code is `ua`. |
| `hu` | `hu-HU` | Dates are year-month-day. Do not hardcode day-month-year. |
| `nb` | `nb-NO` | Bokmål. The code is `nb`. The flag is `no`. |
| `sr` | `sr-Latn-RS` | Latin. Bare `sr` can format as Cyrillic. |
| `nl` | `nl-NL` | Netherlands. Do not use `nl-BE`. |
| `sv` | `sv-SE` | Sweden. Do not use `sv-FI`. |

`html lang` on the webapp stays the short code (`pt`). `Intl` calls use the region tag.

## Intl extension tag

Date and number formatters use `buildIntlLocaleTag(locale, timeFormat)` from `@bondery/schemas/locale`. The tag is one BCP 47 extension: `${intlTag}-u-ca-gregory-hc-h12-nu-latn` or `hc-h23`. Never append a second `-u-`.

Pins:

- `ca-gregory` — always Gregorian; do not infer a Buddhist calendar from Thai UI language.
- `nu-latn` — Latin digits in numeric dates.
- `hc-h12` or `hc-h23` — from the user’s clock preference, not the date-order preference.

Relative time and time-of-day still follow `timeFormat` only. Calendar date order follows `dateFormat` (`locale`, `mdy`, `dmy`, `ymd`).

Storage, API JSON, sync payloads, Mantine DatePicker values, and logs stay ISO. Do not reformat picker values for display.

## Date format preference

`dateFormat` is independent of UI language. `locale` means `Intl.DateTimeFormat` with the pins above. `mdy`, `dmy`, and `ymd` join numeric parts with `/` or `-` and keep month names from the UI locale when the pattern uses a month name.

## Dayjs

`@mantine/dates` prints month names with dayjs. `apps/webapp/src/lib/i18n/loadDayjsLocales.ts` imports each locale. A missing import leaves the calendar in English.

The dayjs file for Portugal is `dayjs/locale/pt`. Brazilian Portuguese is `dayjs/locale/pt-br`. Do not import `pt-br` for this product.

The dayjs file for Norwegian is `dayjs/locale/nb`. Do not import `nn`. The dayjs file for Serbian is `dayjs/locale/sr` (Latin). Do not import `sr-cyrl`. Do not import `nl-be` or `sv-fi`.

## Numbers and punctuation

Pass the region tag to `Intl.NumberFormat`. Do not type a thousands separator by hand.

- French uses a narrow no-break space before `! ? ;`, a no-break space before `:`, and « ».
- Polish, Russian, Ukrainian, Dutch, Romanian, Serbian, Croatian, Slovenian, Estonian, Latvian, and Lithuanian quotes are „…”.
- Bulgarian quotes are „…“.
- Italian and Greek quotes are «…».
- Swedish, Danish, Norwegian, and Finnish quotes are ”…”.
- Spanish questions and exclamations use `¿` and `¡` when the sentence needs them.
- Months and weekdays stay lowercase in French, Spanish, Portuguese, and the Slavic languages unless they start the sentence.

## Sort

Contact sections use `toLocaleUpperCase(locale)` and `localeCompare(locale)` with the UI code. Do not add a custom alphabet. Add a test only when English collation would fold a letter that must stay separate (`Ł`, `Ľ`, `ő`).

## Names

The data model is `firstName` and `lastName`. Hungarian family-name-first is a known limit. Do not add a name-order setting in a language change.

## Checklist

- [ ] `intl` is set and used by `intlTagForLocale`
- [ ] dayjs locale file is imported
- [ ] Hungarian dates are not day-month-year strings
- [ ] Portuguese format calls use `pt-PT`
