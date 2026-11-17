# Lists and selection

Most CRM work happens in lists. Long lists must be **findable**, **selectable**, and **paginated** without custom one-offs.

Platform-specific mechanics: [mobile/lists-selection.md](../mobile/lists-selection.md), web `DataTable` below.

---

## When to use which primitive

| Primitive | Use when |
|-----------|----------|
| **`DataTable`** (web) | Sortable, searchable, selectable tabular data — People, import previews |
| **Timeline cards** (web) | Interaction history on the Interactions page, a person tab, and the home preview |
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

- A paginated API uses server `pagination.hasMore`. See [api-design.md](../../../bondery-api/references/api-design.md). A shell `DataTable` list loads the next page with the shell intersection sentinel. Do not render a Load more button in `DataTable`. Do not use fake page numbers.
- Server `hasMore` is the source of truth. Do not infer the next page from the client page size.
- People uses `useContactsInfiniteQuery`. Group members use `useGroupMembersInfiniteQuery`.
- The interactions timeline is not a `DataTable`. It uses the same sentinel.

---

## Load more

Use one rule for the scroller that owns the list.

- A dropdown scroller calls `onBottomReached` on `ScrollArea.Autosize`.
- A shell page list uses one intersection sentinel. The observer root is the shell viewport. The root is not `window`. People, group members, the interactions timeline, and the person interactions tab use this sentinel.
- When the shell viewport is missing, show one explicit button. When the next page fails, show an explicit retry link. The observer does not retry by itself.
- A short preview stays a fixed first page. The home preview stays that first page.
- Virtualize a list only when the mounted row count is the problem. Do not add a second page scroller.

---

## What to avoid

- Custom selection state per page — extend `DataTable` or mobile selection store.
- Select-all that only selects the current page without indicating total scope.
- Bulk delete without confirmation.
- Search that fires on every keystroke without debounce (server routes).
