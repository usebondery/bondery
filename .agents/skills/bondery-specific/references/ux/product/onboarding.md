# Onboarding (product)

Bondery-specific first-run and setup flows — not generic empty-state patterns.

---

## Surfaces

| Surface | Location | Purpose |
|---------|----------|---------|
| **Setup wizard** | Web onboarding steps | Org profile, team, first actions |
| **Getting Started rail** | `AppShell` sidebar | Persistent checklist until dismissed |
| **Mobile** | Post-auth home | Parity TBD — see [platform-parity.md](./platform-parity.md) |

---

## Setup wizard

- Gated in `app/(app)/app/layout.tsx` until complete (unless bypass — below).
- **Progressive disclosure:** one primary objective per step; back navigation allowed.
- **Copy:** [../common/ux-writing.md](../common/ux-writing.md) — “Set up your workspace”, not “Welcome!!!”.
- **Completion:** clear “You’re ready” + single CTA to main app area.

---

## Getting Started rail

- Collapsible checklist in sidebar (`GettingStartedRail`).
- Items map to real routes (import people, connect email, etc.).
- Dismiss persists per user — don’t re-show after dismiss unless product resets checklist version.
- **Empty checklist:** hide rail, don’t show “nothing to do”.

---

## Deep-link bypass (return intent)

When user arrives via OAuth with `redirect` to a **specific app path** (not `/app` home):

1. `auth/callback` sets `bondery_bypass_onboarding_once` cookie
2. Layout skips onboarding gate **once**
3. Cookie cleared after read

**Do not bypass** for:

- `/app` (home)
- `/oauth/consent`
- Invalid paths

Rationale: shared links and session recovery should land on intent, not wizard.

Full spec: [page-navigation-resume.md](./page-navigation-resume.md).

---

## Mobile

Onboarding parity with web is **not** complete — document gaps in [platform-parity.md](./platform-parity.md).

When implementing mobile onboarding:

- Prefer **native stack** screens over web modal in WebView
- Reuse checklist **concepts**, not necessarily same component tree

---

## Metrics (product)

- Time to first value (first person created, first email sent)
- Wizard completion rate vs skip/bypass rate
- Getting Started item completion funnel

---

## Related

- [page-navigation-resume.md](./page-navigation-resume.md)
- [../common/progressive-disclosure.md](../common/progressive-disclosure.md)
- [../common/empty-states.md](../common/empty-states.md)
