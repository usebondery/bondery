# Locale profiles

One variant per language. Do not mix regions in one file.

`Languages.json` exonyms are already filled for these codes. Do not invent a second name.

## French `fr` / `fr-FR` / flag `fr`

Sentences use `vous`. Buttons use the infinitive. No Quebec wording (`courriel`, `fin de semaine`).

`_one` covers 0 and 1. Use « » and the French spaces before double punctuation. Months stay lowercase.

Glossary: contact, groupe, interaction, personne, étiquette, réseau. Keep in touch: `Rester en contact`. AI assistant: `Assistant IA`.

## Slovak `sk` / `sk-SK` / flag `sk`

Sentences use `vy`. Buttons use the infinitive. Add `_few` for 2–4. `22` is `_other`, as in Czech.

Translate from English. Do not paste Czech. Czech `slovenština` means Slovene. The language is `slovenčina`. Do not use `ě`, `ř`, or `ů`.

False friends: `tlačidlo` (not `tlačítko`), `teraz` (not `nyní`), `vyhľadávanie` (not `vyhledávání`), `len` (not `pouze`), `riadok` (not `řádek`), `štítok` (not `štítek`).

Glossary: kontakt, skupina, interakcia, osoba, štítok, sieť. Keep in touch: `Udržiavať kontakt`.

## Spanish `es` / `es-ES` / flag `es`

Spain only. Sentences use `tú`. Buttons use the infinitive. No voseo. No Latin American nouns (`computadora`, `platicar`). `0` uses `_other`. Use `¿` and `¡` when the sentence is a question or an exclamation.

Glossary: contacto, grupo, interacción, persona, etiqueta, red. Keep in touch: `Mantener el contacto`.

## Portuguese `pt` / `pt-PT` / flag `pt`

Portugal only. Buttons use the infinitive. Use `o seu`, `contacto`, `ecrã`, `utilizador`, `guardar`, `registo`. Do not use Brazilian `contato`, `tela`, `usuário`, `você`, or the gerund (`estou a fazer`, not `estou fazendo`).

Every `Intl` and speech call uses `pt-PT`. The dayjs import is `pt`.

Glossary: contacto, grupo, interação, pessoa, etiqueta, rede. Keep in touch: `Manter o contacto`.

## Polish `pl` / `pl-PL` / flag `pl`

Buttons use the infinitive so the label has no gender. Sentences use `ty`. Do not use a gendered past tense (`zrobiłeś`).

Add `_few` and `_many`. `0`, `5`, and `12` are `many`. `2`, `4`, and `22` are `few`. A noun inside a sentence takes the case that sentence needs. Quotes are „…”.

Glossary: kontakt, grupa, interakcja, osoba, etykieta, sieć. Keep in touch: `Utrzymuj kontakt`.

## Hungarian `hu` / `hu-HU` / flag `hu`

No grammatical gender. Buttons may be a noun (`Mentés`). Sentences use `te`.

After a number, the noun stays singular. Never glue a case ending onto `{name}` or `{city}`. `ő` and `ű` are not `ö` and `ü`. Dates stay year-month-day through `Intl`.

Glossary: kapcsolat, csoport, interakció, személy, címke, hálózat. Keep in touch: `Maradj kapcsolatban`.

## Russian `ru` / `ru-RU` / flag `ru`

Sentences use `вы`. Buttons use the infinitive. Do not use a masculine past tense for the user (`добавили` is fine, `добавил` is not).

Plurals match Polish: `22` is `few`, `12` and `0` are `many`. Quotes are „…”.

Glossary: контакт, группа, взаимодействие, человек, тег, сеть. Keep in touch: `Оставаться на связи`.

## Ukrainian `uk` / `uk-UA` / flag `ua`

Sentences use `ви`. Buttons use the infinitive. Do not copy Russian.

Use `і`, `ї`, `є`, `ґ`. Do not use Russian `ы`, `э`, `ъ`, or `ё`. Use the apostrophe in words that need it (`зв’язок`).

Plurals match Polish and Russian. Quotes are „…”.

Glossary: контакт, група, взаємодія, особа, мітка, мережа. Keep in touch: `Підтримувати зв’язок`.

These are not Russian: налаштування, зберегти, скасувати, видалити, пошук, користувач.

## Dutch `nl` / `nl-NL` / flag `nl`

Sentences use `je`. Buttons use the infinitive. Netherlands only. Do not use Flemish `gij`.

`0` uses `_other`.

Glossary: contact, groep, interactie, persoon, label, netwerk. Keep in touch: `Houd contact`.

## Swedish `sv` / `sv-SE` / flag `se`

Sentences use `du`. Buttons use the infinitive. Sweden only. Do not use Finland Swedish.

Glossary: kontakt, grupp, interaktion, person, etikett, nätverk. Keep in touch: `Håll kontakten`.

## Finnish `fi` / `fi-FI` / flag `fi`

No grammatical gender. Sentences use `sinä`. Buttons use the imperative (`Tallenna`).

After a number other than 1, the noun is partitive singular. Do not glue a case ending onto `{name}` or `{city}`.

Glossary: yhteystieto, ryhmä, vuorovaikutus, henkilö, tunniste, verkosto. Keep in touch: `Pidä yhteyttä`.

## Danish `da` / `da-DK` / flag `dk`

Sentences use `du`. Buttons use the infinitive. Denmark only. Do not copy Norwegian.

Glossary: kontakt, gruppe, interaktion, person, etiket, netværk. Keep in touch: `Hold kontakten`.

## Norwegian `nb` / `nb-NO` / flag `no`

Bokmål only. Sentences use `du`. Buttons use the infinitive. Do not use Nynorsk (`ikkje`, `eg`).

The code is `nb`. The dayjs import is `nb`.

Glossary: kontakt, gruppe, interaksjon, person, etikett, nettverk. Keep in touch: `Hold kontakten`.

## Italian `it` / `it-IT` / flag `it`

Italy only. Sentences use `tu`. Buttons use the infinitive. Do not use `Lei`.

Glossary: contatto, gruppo, interazione, persona, etichetta, rete. Keep in touch: `Resta in contatto`.

## Romanian `ro` / `ro-RO` / flag `ro`

Sentences use `tu`. Buttons use the infinitive.

`0` and `2`–`19` are `_few`. `1` is `_one`. `20` and `22` are `_other`. `_few` must be valid for zero.

Glossary: contact, grup, interacțiune, persoană, etichetă, rețea. Keep in touch: `Păstrează legătura`.

## Bulgarian `bg` / `bg-BG` / flag `bg`

Sentences use `ти`. Buttons use the infinitive. Do not use a masculine past tense for the user.

`0` uses `_other`. Quotes are „…“. Lexend has no Cyrillic.

Glossary: контакт, група, взаимодействие, човек, етикет, мрежа. Keep in touch: `Поддържай връзка`.

## Serbian `sr` / `sr-Latn-RS` / flag `rs`

Latin ekavian only. Do not use Cyrillic. Do not copy Croatian (`mlijeko`, `njemački`, `talijanski`).

Sentences use `ti`. Buttons use the infinitive. Add `_few`. `2`, `4`, and `22` are `few`. `0`, `5`, and `12` are `other`. `21` is `one`.

The dayjs import is `sr`.

Glossary: kontakt, grupa, interakcija, osoba, oznaka, mreža. Keep in touch: `Ostani u kontaktu`.

## Croatian `hr` / `hr-HR` / flag `hr`

Ijekavian. Do not copy Serbian (`mleko`, `nemački`, `italijanski`).

Sentences use `ti`. Buttons use the infinitive. Plurals match Serbian.

Glossary: kontakt, grupa, interakcija, osoba, oznaka, mreža. Keep in touch: `Ostani u kontaktu`.

## Greek `el` / `el-GR` / flag `gr`

Sentences use `εσύ`. Buttons use the imperative or a noun. Do not mix `εσείς`.

Use the Greek script. The Greek question mark is the character that looks like a semicolon. `0` uses `_other`. Quotes are «…». Lexend has no Greek.

Glossary: επαφή, ομάδα, αλληλεπίδραση, άτομο, ετικέτα, δίκτυο. Keep in touch: `Μείνε σε επαφή`.

## Slovenian `sl` / `sl-SI` / flag `si`

This is Slovene, not Slovak. Slovak is `slovenčina`. This language is `slovenščina`.

Sentences use `ti`. Buttons use the infinitive. Add `_two` and `_few`. `2` is `two`. `3` and `4` are `few`. `0`, `5`, and `22` are `other`.

Do not copy Slovak or Czech.

Glossary: stik, skupina, interakcija, oseba, oznaka, omrežje. Keep in touch: `Ostani v stiku`.

## Estonian `et` / `et-EE` / flag `ee`

No grammatical gender. Sentences use `sina`. Buttons use the da-infinitive (`Salvesta`). Do not use `teie`.

After a number, the noun is partitive singular. Do not glue a case ending onto `{name}` or `{city}`.

Glossary: kontakt, grupp, suhtlus, inimene, silt, võrgustik. Keep in touch: `Hoia ühendust`.

## Latvian `lv` / `lv-LV` / flag `lv`

Sentences use `tu`. Buttons use the infinitive.

Add `_zero`. `0`, `11`, and `12` are `zero`. `1` and `21` are `one`. `2` and `22` are `other`.

Glossary: kontakts, grupa, mijiedarbība, persona, etiķete, tīkls. Keep in touch: `Uzturi kontaktu`.

## Lithuanian `lt` / `lt-LT` / flag `lt`

Sentences use `tu`. Buttons use the infinitive.

Add `_few`. `2`, `5`, and `22` are `few`. `0`, `11`, and `12` are `other`. `1` and `21` are `one`.

Glossary: kontaktas, grupa, sąveika, asmuo, žyma, tinklas. Keep in touch: `Palaikyk ryšį`.

## Turkish `tr` / `tr-TR` / flag `tr`

No grammatical gender. Sentences use `sen`. Buttons use the infinitive. Do not use `siz`.

After a number, the noun stays singular. `ı` and `i` are different letters.

Contact and person are both `kişi`. Group is `grup`. Interaction is `etkileşim`. Tag is `etiket`. Network is `ağ`. Keep in touch: `İletişimde kal`.

## Text direction and future RTL locales

`supported-locales.json` carries `dir` for every catalog locale. All shipped codes are `ltr` today.

When Hebrew or Arabic ship, set `dir` to `rtl`. Hebrew and Arabic are RTL. Chinese (zh-Hans), Japanese, and Thai are still LTR for document direction.

Plurals for future locales:

- Arabic — six plural forms (`zero`, `one`, `two`, `few`, `many`, `other`).
- Hebrew — four forms (`one`, `two`, `many`, `other`).
- Chinese, Japanese, and Thai — use `other` only.

Do not infer a Buddhist calendar from Thai language alone. Intl date formatting still uses `ca-gregory`.

## Checklist

- [ ] The profile's address form is the only one in the file
- [ ] The glossary nouns match this page
- [ ] Slovak text contains no Czech-only letters
- [ ] Ukrainian text contains no Russian-only letters
- [ ] Portuguese text uses Portugal spelling
- [ ] Norwegian text is Bokmål
- [ ] Serbian text is Latin ekavian
- [ ] Croatian text is ijekavian
- [ ] Slovenian text is not Slovak
- [ ] Romanian `_few` is valid for 0
- [ ] Slovenian `_two` exists where the count can be 2
- [ ] Latvian `_zero` exists where the count can be 0 or 11
