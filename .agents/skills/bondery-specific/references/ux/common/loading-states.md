# Loading states

Users should never wonder whether the app is working. Match loading UI to **how much layout is known**.

---

## Decision table

| Situation | Pattern | Example |
|-----------|---------|---------|
| **Initial route / page** | **Layout skeleton** — shape matches final UI | Web `loading.tsx` + `*Skeletons.tsx` (People, Home, Chat) |
| **Inline fetch** (search, row refresh, preview block) | **Spinner or inline cue** in the affected region only | `DataTable` `searchLoading`; spotlight loader |
| **Button / modal submit** | **Loading on the control** | `loading` on primary button; `isBlocking` on modal |
| **Background duplicate / import commit** | **Morphing notification** | See [feedback-and-confirmations.md](./feedback-and-confirmations.md) |
| **Mobile local-first read** | **No loading** for synced SQLite data | `useSyncQuery` — data is already there |
| **Mobile settings preview fetch** | Spinner in preview only | `SettingsAsyncState` |

**Reference:** Airbnb skeletons mirror the card/grid layout. Inline fetches should not replace the whole page.

---

## Skeleton rules (web)

- One skeleton per route — co-locate `*Skeletons.tsx` with the page.
- Match header, table columns, or card grid geometry — not a generic full-page spinner.
- `PageHeaderSkeleton` for shared chrome.

---

## Inline loader rules

- Search: loader in search field or table header — keep prior results visible when refining query.
- Do not block unrelated UI (sidebar, nav) for a partial fetch.

---

## Errors beat infinite loading

| Bad | Good |
|-----|------|
| Spinner forever when entity missing | `ErrorPageHeader` + back action |
| Spinner forever on fetch failure | Retry affordance (`LoadErrorCard` on mobile; web equivalent) |

If `data === null` after fetch settles, show an error or empty state — never an indefinite loader.

---

## What to avoid

- Full-page spinner on client-side filter (use debounced local filter, no loader).
- Skeleton on mobile contact list for local-first data.
- Hiding the entire settings screen when only a preview section is loading.
