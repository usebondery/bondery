# Lists and selection

Most CRM work happens in lists. Long lists must be **findable**, **selectable**, and **paginated** without custom one-offs.

Platform-specific mechanics: [mobile/lists-selection.md](../mobile/lists-selection.md), web `DataTable` below.

---

## When to use which primitive

| Primitive | Use when |
|-----------|----------|
| **`DataTable`** (web) | Sortable, searchable, selectable tabular data — People, Interactions, import previews |
| **Card grid** (web) | Visual browse — Groups |
| **`FlashList`** (mobile) | Sectioned contact lists, large local-first datasets |
| **Simple stack** | Short fixed lists (< ~10 items), settings rows |

---

## Search on long lists

**Rule:** If the list can grow beyond what a user can scan (~20+ items), add search.

| Scope | Pattern |
|-------|---------|
| **Server-side** | Debounce with `DEBOUNCE_MS.search` (600ms); pass `search` to API |
| **Client-side** | `DEBOUNCE_MS.localFilter` (200ms); filter in memory |
| **URL persistence** | Encode sort/filter/search in query params when state should survive refresh (pairs with [page-navigation-resume](../product/page-navigation-resume.md)) |

Search fields are **not** submit forms — do not wire Done/Enter to mutate on mobile settings search.

---

## Selection model

When rows are selectable:

| Capability | Web (`DataTable`) | Mobile |
|------------|-------------------|--------|
| Enter selection | Checkbox column | Long-press row |
| Range select | Shift+click | Drag across rows ([mobile/lists-selection.md](../mobile/lists-selection.md)) |
| Select page | Header checkbox | Header control in selection mode |
| Select all matching | `IconChecks` / select-all-total | `ContactsSelectionHeader` select-all-total |
| Bulk actions | Bulk bar above table | `FloatingActionBar` |
| Exit selection | Clear selection control | Done / back |

**Gmail rule:** drag-to-select and shift-range should feel continuous — no per-row tap marathon.

---

## Bulk actions

- Show **selected count** in the bulk bar.
- **Destructive bulk** (delete) → always confirm — see [destructive-actions.md](./destructive-actions.md).
- Disable bulk actions while any selected row cannot perform the action.
- Web reference: `PeopleClient.tsx`, `ContactsTableV2.tsx`, `contactActionBuilders.ts`.
- Mobile reference: `ContactsSelectionActionBar.tsx`, `ContactsSelectionDialogs.tsx`.

---

## Pagination

- **Paginated API** (`hasMore` from server — see [../../api/api-design.md](../../api/api-design.md)): use **Load more** in `DataTable`, not fake pagination.
- Server `hasMore` is the single source of truth — do not infer from client page size.
- Infinite query pattern: `useContactsInfiniteQuery` on People.

---

## What to avoid

- Custom selection state per page — extend `DataTable` or mobile selection store.
- Select-all that only selects the current page without indicating total scope.
- Bulk delete without confirmation.
- Search that fires on every keystroke without debounce (server routes).
