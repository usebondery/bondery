# Onboarding (product)

Bondery-specific first-run flows on web. Generic empty-state patterns: [../common/empty-states.md](../common/empty-states.md).

---

## Surfaces

| Surface | Location | Purpose |
|---------|----------|---------|
| **Setup wizard** | `/app/onboarding` (`OnboardingClient.tsx`) | One-time modal flow until `onboardingCompletedAt` is set |
| **Getting Started rail** | Home (`HomeClient` → `GettingStartedProgressRail`) | Post-onboarding checklist until user dismisses |
| **Mobile** | — | No onboarding wizard yet |

---

## Setup wizard

**Gate:** `app/(app)/app/layout.tsx` redirects to `/app/onboarding` when `userSession.onboardingCompletedAt` is null (unless deep-link bypass — below).

**Shell:** `OnboardingClient` wraps `OnboardingFlowContent` in `OnboardingProvider` (intent context).

**Modal:** Non-dismissible — no X, no escape, no click-outside (`OnboardingFlowContent` in `OnboardingClient.tsx`).

**Progress:** `@mantine/nprogress` `NavigationProgress` — steps 0→3 map to 10% / 30% / 60% / 90%.

| Step | Component | Content |
|------|-----------|---------|
| 0 | `StepLoading` | Brief loading → auto-advance |
| 1 | `StepWelcome` | Greeting with first name when available |
| 2 | `StepIntent` | Personal / professional / both — stored in `OnboardingContext` |
| 3 | `StepImport` | LinkedIn or Instagram import cards, or skip |

**Finish:** `useFinishOnboardingMutation` sets `onboardingCompletedAt` (+ optional import follow-up fields) → `router.push(WEBAPP_ROUTES.HOME)`.

**Import step outcomes:**

- Success stats → Finish button → complete onboarding
- Skip import → `finishOnboarding({ status: "dismissed" })`
- Awaiting export (user started import but export not ready) → `finishOnboarding({ platform, status: "awaiting_export" })` — see [import-flow.md](./import-flow.md)

---

## Getting Started rail

**Not** in the sidebar. Rendered on **Home** via `GettingStartedRailSlot` → `GettingStartedProgressRail`.

**Visibility:** `showRail` when `gettingStartedDismissedAt` is null (`gettingStartedItems.ts`) — completion alone does **not** hide the rail.

**Dismiss:** X `ActionIcon` only (no separate “all done” button). Calls `useDismissGettingStartedMutation`.

**Tasks** (`GettingStartedTaskId`):

| Task | Complete when | Action |
|------|---------------|--------|
| `importContacts` | `importCompletedAt` set | Navigate to Settings → Data management (`#data-management`) |
| `addContacts` | `totalContacts > 0` | `openAddContactModal()` |
| `logInteraction` | user has any interaction | `openNewActivityModal()` |

**Import awaiting hint:** When `importFollowupStatus === "awaiting_export"`, import row expands with platform-specific copy (LinkedIn / Instagram).

**Skeleton:** `GettingStartedRailSkeleton` on Home while settings load.

---

## Deep-link bypass (return intent)

When OAuth returns to a **safe deep link** (not `/app` home, not `/oauth/consent`):

1. `auth/callback/route.ts` sets `BYPASS_ONBOARDING_ONCE_COOKIE` (`bondery:bypassOnboardingOnce`) — `maxAge: 60`, `path: /app`
2. Layout reads cookie → skips onboarding gate once → clears cookie
3. User lands on intended `redirect` path

Full spec: [page-navigation-resume.md](./page-navigation-resume.md).

---

## Mobile

No wizard or Getting Started rail on mobile today. When adding mobile onboarding, prefer native stack screens and reuse checklist **concepts** from web.

---

## Related

- [import-flow.md](./import-flow.md) — LinkedIn/Instagram modals shared with Settings
- [page-navigation-resume.md](./page-navigation-resume.md)
- [../desktop/modals.md](../desktop/modals.md) — blocking modal during onboarding
- [../common/progressive-disclosure.md](../common/progressive-disclosure.md)
