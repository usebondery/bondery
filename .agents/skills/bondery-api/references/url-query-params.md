# URL query parameter names

Public query names are **snake_case**. Do not add aliases. Constants live in `packages/helpers`.

Pattern for pending UI actions: **`next_action=intended_action`**. The param name is always `next_action`. The value is the intended action, also snake_case (`add_interaction`, not `addInteraction`).

## Fastify API

| Param | Use |
|-------|-----|
| `search` | Free-text list filter. Never `q`. |
| `limit`, `offset` | Offset pagination only. Never cursor / `page_token` / `after_id`. |

List search rules: [api-design.md](./api-design.md).

## Webapp product URLs

| Param | Use |
|-------|-----|
| `next_action` | Pending UI action after the page loads. Read once, then strip it from the URL. |
| `redirect` | Login return path only. Never a product-page action. |

Constants: `NEXT_ACTION_PARAM`, `NEXT_ACTIONS`, `personPathWithNextAction` in `packages/helpers/src/globals/webapp-query.ts`.

| Value (`intended_action`) | Effect |
|---------------------------|--------|
| `add_interaction` | Open the add-interaction modal on a person page |

### Producers and consumers

| Producer | URL |
|----------|-----|
| Chrome extension popup (already-in-Bondery confirm → Add interaction) | `personPathWithNextAction(id, NEXT_ACTIONS.ADD_INTERACTION)` |
| Any new deep link | Same helper. Add the value to `NEXT_ACTIONS` first. |

| Consumer | Behavior |
|----------|----------|
| `PersonInteractionsSection` | If `next_action=add_interaction`, open the modal once, then `router.replace` without the param |

Do not invent one-off flags (`addInteraction=1`). Do not mix camelCase values.

Login resume (`redirect`) is documented in [page-navigation-resume.md](../../bondery-ux/references/product/page-navigation-resume.md). OAuth consent continuation uses Better Auth signed query (`oauth_query`). Do not replace either with `next_action`.

## Checklist

- [ ] New list filter uses `search`, not `q`
- [ ] Product deep-link actions use `next_action=<snake_case>` from `NEXT_ACTIONS`
- [ ] Login return uses `redirect` only
- [ ] No silent aliases for renamed query params
