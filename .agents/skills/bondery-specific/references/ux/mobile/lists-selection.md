# Lists and selection (mobile)

Shared list rules: [lists-and-selection.md](../common/lists-and-selection.md). This file covers touch-specific mechanics.

---

## Enter selection mode

- **Long-press** row → selection mode (`ContactRow.tsx`, `contactsSelectionStore.ts`).
- Show selection header with count.

---

## Range and drag select

- **Drag across rows** while in selection mode — `useContactsDragSelection.ts` (Gmail-style).
- Do not require tap-per-row for large ranges.

---

## Select all

- **Select all on screen** vs **select all matching** (total count) — `ContactsSelectionHeader.tsx`.
- Mirror web `DataTable` select-all-total semantics.

---

## Bulk actions

- **`FloatingActionBar`** at bottom when selection active.
- Destructive bulk → confirm sheet (`ContactsSelectionDialogs.tsx`).
- Register slot via `floatingChromeContext` (`contacts-selection`).

---

## Contacts list UX

- **FlashList** with section headers + `AlphabetScroller` (iOS-style).
- **Search** — debounced filter on local SQLite data (no server spinner for synced data).
- **Swipe actions** — configurable in settings; preview in [settings-previews.md](./settings-previews.md).

---

## What to avoid

- Bulk delete without confirmation sheet.
- Selection mode without visible exit (Done / back).
- Server loading spinner for local-first contact reads.
