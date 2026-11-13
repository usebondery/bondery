# Grammar

i18next 26 selects the plural with `Intl.PluralRules`. The suffix must be the category that engine returns. Read these counts out loud for every count string: 0, 1, 2, 4, 5, 12, 22.

`check:i18n:usage` allows extra `_few`, `_many`, and `_zero` keys. It still requires every English key.

## Categories

| Locale | 0 | 1 | 2–4 | 5 | 12 | 22 |
|--------|---|---|-----|---|----|----|
| `en`, `es`, `pt`, `hu`, `nl`, `sv`, `fi`, `da`, `nb`, `it`, `bg`, `el`, `tr`, `et` | other | one | other | other | other | other |
| `fr` | one | one | other | other | other | other |
| `cs`, `sk` | other | one | few | other | other | other |
| `pl`, `ru`, `uk` | many | one | few | many | many | few |
| `ro` | few | one | few | few | few | other |
| `hr`, `sr` | other | one | few | other | other | few |
| `sl` | other | one | two for 2, few for 3–4 | other | other | other |
| `lv` | zero | one | other | other | zero | other |
| `lt` | other | one | few | few | other | few |

French `_one` must be true for zero and for one. Do not write "un contact" if the same string appears for 0. Prefer a form that works for both, such as "{count} contact".

Slovak and Czech `22` is `other`. Polish, Russian, and Ukrainian `22` is `few`. Do not copy a Czech plural suffix onto Polish.

Romanian `_few` covers 0 and 2–19. The same string must work for zero and for 2. `20` and `22` are `_other`.

Serbian and Croatian have no `_many`. `5` and `12` are `_other`. `21` is `_one`. `22` is `_few`.

Slovenian `2` is `_two`. `3` and `4` are `_few`. Do not put 2 in `_few`.

Latvian `0` and `11`–`19` are `_zero`. `21` is `_one`. `22` is `_other`.

Lithuanian `2`–`9` are `_few`. `11`–`19` are `_other`, not `_few`. `21` is `_one`. `22` is `_few`.

Hungarian, Turkish, Finnish, and Estonian have no paucal. After a number, the noun stays singular or partitive singular. `_other` must not use a nominative plural. `5 kapcsolat`, not `5 kapcsolatok`. `5 kişi`, not `5 kişiler`.

## Gender and case

- French, Spanish, Portuguese, Italian, Romanian, Slovak, Polish, Russian, Ukrainian, Bulgarian, Serbian, Croatian, Slovenian, Greek, Latvian, and Lithuanian mark gender on adjectives and past verbs. Do not address the user with a masculine past tense (`zrobiłeś`, `добавил`). Use an infinitive, a present, or a form that does not mark the user's gender.
- Polish, Russian, Ukrainian, and the Baltic languages change case inside a sentence. Do not paste a button label into a sentence when the case is different.
- Hungarian, Finnish, and Estonian case endings depend on the last vowel of the word. Never glue a case ending onto `{name}` or `{city}`. Use a postposition or rewrite the sentence.

## Checklist

- [ ] `_one` / `_other` match English keys
- [ ] `_few` exists for `cs`, `sk`, `pl`, `ru`, `uk`, `ro`, `hr`, `sr`, `sl`, and `lt` where that category is used
- [ ] `_many` exists for `pl`, `ru`, and `uk` where the count can be 0, 5, or 12
- [ ] `_two` exists for `sl` where the count can be 2
- [ ] `_zero` exists for `lv` where the count can be 0 or 11
- [ ] French `_one` is valid for 0
- [ ] Romanian `_few` is valid for 0
- [ ] Hungarian and Turkish nouns after numbers are singular
- [ ] No suffix is attached to an interpolated Hungarian, Finnish, or Estonian value
- [ ] No gendered past tense addresses the user
