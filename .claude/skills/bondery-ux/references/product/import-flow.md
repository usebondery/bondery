# Import flow (product)

LinkedIn, Instagram, vCard, and Bondery JSON imports — shared between **onboarding step 3** (LinkedIn/Instagram) and **Settings → Data management**.

---

## Entry points

| Surface | Opener | Notes |
|---------|--------|-------|
| Onboarding | `StepImport` → `openLinkedInImportModal` / `openInstagramImportModal` | `showNavigationProgress: false`; `onAwaitingExport` completes onboarding with follow-up state |
| Settings | Data management cards | Same modals; default navigation progress in modal |
| Getting Started rail | Import task → Settings `#data-management` | User finishes import outside onboarding |

vCard: `openVCardImportModal` — Settings **Import** only (not onboarding cards).

Bondery JSON: `openBonderyImportModal` — Settings **Import → Bondery JSON** and command palette only (not onboarding). Archive-level restore (no row picker).

---

## LinkedIn / Instagram modal pattern

Imperative openers in `settings/components/modals/open*ImportModal.tsx`. Body components:

- `LinkedInImportModal.tsx` / `InstagramImportModal.tsx`
- Shared steps: `ImportIntroStep`, `ImportZipUploadStep`, `ImportModalProcessingSteps`, preview + selection hooks

**Typical LinkedIn steps:** intro → instructions → upload → parse preview (select rows) → commit → success.

**Blocking:** While parsing or committing — `useModalBlocking`, hide X, disable fields ([modals.md](../desktop/modals.md)).

**Selection:** `useImportContactSelection` — searchable preview table, select all / deselect, load-more if paginated parse results.

**Commit:** Batched via `SOCIAL_IMPORT_COMMIT_BATCH_SIZE`; progress step during commit.

**Success:** Stats `{ imported, updated, skipped }` — onboarding shows inline success; Settings may toast + navigate.

---

## Bondery JSON modal

Imperative opener: `openBonderyImportModal({ entryPoint })`. Size `lg` (same as Instagram/vCard).

**Steps:** intro (“How Bondery JSON import works”) → upload ZIP → client peek (`fflate`) → review file counts → `POST /me/import` → finished in the modal.

**Not used:** row picker, type checkboxes, `useImportContactSelection`, `ContactsTable` preview, LinkedIn/Instagram instructions, success toast, navigate to People.

**Blocking:** While checking or importing — `useModalBlocking`. Cancel remains available during check/import (abort).

**Copy:** additive only; contact avatars included when present; keep the current profile (profile photo is not replaced). Upload up to 100 MB; client abort 180s. Review/finished people chips exclude the exporter profile and do not show a separate avatar count.

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
- Mobile: imports are **online-only** — not tier-1 sync ([sync-architecture.md](../../../bondery-api/references/sync-architecture.md))

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
| Onboarding import step | `apps/webapp/src/app/(app)/app/(shell)/onboarding/components/StepImport.tsx` |
| LinkedIn modal | `apps/webapp/src/app/(app)/app/(shell)/settings/components/modals/LinkedInImportModal.tsx` |
| Instagram modal | `apps/webapp/src/app/(app)/app/(shell)/settings/components/modals/InstagramImportModal.tsx` |
| Getting Started state | `apps/webapp/src/lib/home/gettingStartedItems.ts` |
| Query hooks | `lib/query/hooks/useImports.ts`, `useSettings.ts` |
| Bondery JSON modal | `apps/webapp/src/app/(app)/app/(shell)/settings/components/modals/BonderyImportModal.tsx` |

---

## Related

- [onboarding.md](./onboarding.md)
- [../common/lists-and-selection.md](../common/lists-and-selection.md) — preview table selection
- [../desktop/modals.md](../desktop/modals.md)
