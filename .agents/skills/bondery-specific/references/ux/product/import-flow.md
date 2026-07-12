# Import flow (product)

LinkedIn, Instagram, and vCard imports — shared between **onboarding step 3** and **Settings → Data management**.

---

## Entry points

| Surface | Opener | Notes |
|---------|--------|-------|
| Onboarding | `StepImport` → `openLinkedInImportModal` / `openInstagramImportModal` | `showNavigationProgress: false`; `onAwaitingExport` completes onboarding with follow-up state |
| Settings | Data management cards | Same modals; default navigation progress in modal |
| Getting Started rail | Import task → Settings `#data-management` | User finishes import outside onboarding |

vCard: `openVCardImportModal` — Settings only (not onboarding cards).

---

## LinkedIn / Instagram modal pattern

Imperative openers in `settings/components/modals/open*ImportModal.tsx`. Body components:

- `LinkedInImportModal.tsx` / `InstagramImportModal.tsx`
- Shared steps: `ImportModalProcessingSteps`, preview + selection hooks

**Typical LinkedIn steps:** intro → instructions → upload → parse preview (select rows) → commit → success.

**Blocking:** While parsing or committing — `useModalBlocking`, hide X, disable fields ([modals.md](../desktop/modals.md)).

**Selection:** `useImportContactSelection` — searchable preview table, select all / deselect, load-more if paginated parse results.

**Commit:** Batched via `SOCIAL_IMPORT_COMMIT_BATCH_SIZE`; progress step during commit.

**Success:** Stats `{ imported, updated, skipped }` — onboarding shows inline success; Settings may toast + navigate.

---

## Awaiting export follow-up

When user starts import but has not uploaded an export file yet:

1. Modal calls `onAwaitingExport` → onboarding sets `importFollowupPlatform` + `importFollowupStatus: "awaiting_export"` via `finishOnboardingMutation`
2. Getting Started rail shows expanded hint on import task until `importCompletedAt` is set
3. Settings path: `useUpdateImportFollowupMutation` for same fields

Platforms: `linkedin` | `instagram` (`ImportFollowupPlatform` in `@bondery/schemas`).

---

## API / data

- Parse endpoints return preview rows (not DB mutations until commit)
- Commit returns counts; full contacts available via list sync / query invalidation on web
- Mobile: imports are **online-only** — not tier-1 sync ([../../api/sync-architecture.md](../../api/sync-architecture.md))

---

## UX rules

| Rule | Rationale |
|------|-----------|
| Opportunity framing on empty preview | [empty-states.md](../common/empty-states.md) — explain duplicates / no selectable rows |
| No success toast when navigation shows result | [feedback-and-confirmations.md](../common/feedback-and-confirmations.md) |
| Destructive bulk skip in preview | Confirm when discarding large selections |
| Sentence case, second person | [ux-writing.md](../common/ux-writing.md) |

---

## Key files

| Area | Path |
|------|------|
| Onboarding import step | `apps/webapp/src/app/(app)/app/onboarding/components/StepImport.tsx` |
| LinkedIn modal | `apps/webapp/src/app/(app)/app/settings/components/modals/LinkedInImportModal.tsx` |
| Instagram modal | `apps/webapp/src/app/(app)/app/settings/components/modals/InstagramImportModal.tsx` |
| Getting Started state | `apps/webapp/src/lib/home/gettingStartedItems.ts` |
| Query hooks | `lib/query/hooks/useImports.ts`, `useSettings.ts` |

---

## Related

- [onboarding.md](./onboarding.md)
- [../common/lists-and-selection.md](../common/lists-and-selection.md) — preview table selection
- [../desktop/modals.md](../desktop/modals.md)
