# Search and discovery

Help users **find the right person or action** with minimal context switching.

---

## Three layers

| Layer | Purpose | Desktop webapp | Webapp phone / PWA | Expo native |
|-------|---------|----------------|--------------------|-------------|
| **Global find** | Jump anywhere — person, action, nav | [global-find.md](../desktop/global-find.md) | Search row inside the nav overlay — [mobile-pwa-shell.md](../desktop/mobile-pwa-shell.md). Not a FAB. | FAB speed dial (create actions, not search) |
| **In-page search** | Filter the current list | `DataTable` search, People URL `?search=` | Same as desktop | Contacts search bar |
| **Picker search** | Choose entities in a modal | `PeopleMultiPickerInput`, debounced server search | Same as desktop | Sheet pickers |

Do not duplicate global find inside every page — use in-page search for **local context**. Do not add a second command palette or a native-like FAB on the PWA.

---

## Principles

1. **Debounce server search** — `DEBOUNCE_MS.search` (600ms) for API calls; `DEBOUNCE_MS.localFilter` (200ms) for client-only.
2. **Minimum query length** when API cost matters — People spotlight uses 3+ characters before fetch.
3. **"See all" deep links** — spotlight → People with `?search=` pre-filled.
4. **Preserve query in URL** when the user would expect refresh to keep filters (return intent captures `pathname + search`).
5. **Empty search results** — see [empty-states.md](./empty-states.md) search tier.

---

## Desktop global find

Keyboard-driven global find is **required** on webapp — see [desktop/global-find.md](../desktop/global-find.md):

- `mod+k` — command palette (nav + actions)
- `f` — find person spotlight
- Shortcuts for add person, log interaction, sidebar toggle

Always display shortcuts with `Kbd` + `HOTKEYS` from `@/lib/platform/config` — never hardcode ⌘/Ctrl.

---

## What to avoid

- Multiple competing search UIs on the same page without clear roles.
- Full-page navigation for every spotlight result — prefer in-app routes.
- Translating OS shortcut labels via i18n.
