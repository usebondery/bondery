# Translation quality

Translate from English. Use `cs` and `de` only as examples of plural shape. Czech `glossary.json` still has English `contact`, `group`, and `tag`. Do not copy those gaps. German is the quality bar for those nouns.

## Voice

The brand voice is a warm friend. Map that onto the local habit for software. Do not translate English "you" into two different pronouns.

- Buttons use a short infinitive or a noun when that is normal in the language (`Enregistrer`, `Mentés`, `Zapisz`).
- Sentences use the one address form in the locale profile.
- Errors say what happened and what to do next.
- Empty states offer an action. They do not apologize.
- Destructive titles name the object. The confirm button is the verb.

Read `bondery-ux` `references/common/ux-writing.md` for the English structure. Apply the structure. Do not keep English word order when the language needs another order.

## Placeholders and markup

- Product JSON interpolates `{name}` and `{count}`. Leave the braces and the name unchanged.
- Email chrome may contain `{{support}}`. Leave that form when English uses it.
- Keep HTML tags such as `<b>` and component tags such as `<terms>`.
- Do not translate URLs, email addresses, or keyboard letters.

## Do not translate

- `Bondery`
- `PRM` — you may explain it once in the local language, then keep the letters
- GitHub, LinkedIn, Instagram, WhatsApp, Signal, Stripe, Google, MCP
- A string that is only a proper name

## Glossary

Lock one translation per entity for the whole locale. The lock is in [locale-profiles.md](./locale-profiles.md). Use it in buttons, headings, and sentences. Do not switch between two nouns for "contact".

## Length

French, Spanish, Portuguese, Polish, and Slovak strings often run 20 to 35 percent longer than English. Do not abbreviate a word to force it into a button. If a label will overflow, say so in the pull request. Do not change layout in the translation change.

## Out of scope

- `apps/website` marketing, docs, and `lang="en"`
- Privacy and Terms (`bondery-legal`)
- Chrome Web Store listing copy
- Contact language rows in `world-languages.ts`
- Untranslated English leftovers in `cs` or `de`
- Stored name order. Do not swap `firstName` and `lastName` for Hungarian.

## Checklist

- [ ] No English leftovers except the do-not-translate list
- [ ] One address form
- [ ] One glossary noun per entity
- [ ] Placeholders and tags match English
