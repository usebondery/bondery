# Navigation (Expo native)

Stack and tab behavior for `apps/mobile` (Expo Router). Not the webapp PWA — see [mobile-pwa-shell.md](../desktop/mobile-pwa-shell.md).

---

## Problem

A user can tap two **peer** destinations in quick succession (for example **Groups** then **Tags** on Settings). Each tap calls `router.push`. React Navigation enqueues both transitions. The second screen opens on top of the first. **Back** then feels like Tags is a child of Group sort, even though they are siblings from the same hub.

The same class of bug appears anywhere a list or chip row fires `push` without a guard: settings rows, group chips, contact rows, and similar.

---

## Product principle: robust navigation

1. **One outgoing navigation per transition.** While a stack transition is in flight, ignore additional navigation from the same surface (settings list, contacts header, and similar). Do not queue a second peer destination on top of the first.

2. **Peers must not fake hierarchy.** Sibling routes from one hub (settings preferences, entity chips at the same level) must not stack because the user tapped twice. Either land on the **last intentional** destination with depth 1 above the hub, or honor only the **first** tap until the transition ends. Pick one policy per surface and enforce it centrally — do not mix ad hoc refs per screen.

3. **Loading is part of “in flight”.** If the destination screen is still mounting, hydrating sync data, or showing a full-screen loader, treat navigation as incomplete. Block or ignore new route changes from the **source** list until the user can interact with the destination or returns to the hub. Pair with [loading-states.md](../common/loading-states.md): the user should not open another page and believe they drilled down.

4. **Match intent to API.**

   | User intent | Typical API | Notes |
   |-------------|-------------|--------|
   | Hub → settings leaf | `push` (through gate) | At most one leaf above tabs |
   | Open contact / group by id | `navigate` | Prefer focus over duplicate stack entries |
   | True child (contact → notes) | `push` (through gate) | Back returns to parent |
   | Auth success | `replace` | No return to login |

5. **Disable affordances while blocked.** When navigation is in flight, set `NavLink` `disabled`, or set `pointerEvents="none"` on the hub scroll content until `transitionEnd`. Visual press feedback can stay; the second tap must not enqueue another route.

---

## Implementation (code)

**Shared coordinator** — `apps/mobile/src/lib/navigation/`:

- `navigationCoordinator.ts` — `runAppNavigation`: in-flight lock, normalized `href` dedupe (`NAVIGATION_DEDUPE_MS`), modes `push` / `navigate` / `replace`.
- `navigationGateState.ts` — transition flag + last key/time; `armTransitionSafetyFallback` (500 ms) if `transitionEnd` is missed.
- `NavigationProvider.tsx` — listens to stack `transitionStart` / `transitionEnd`; exposes `useIsNavigationLocked`.
- `useAppNavigation.ts` — `push`, `navigateTo`, `replace`, `openContact`, `openGroup`, notes helpers; all forward routes through `runAppNavigation`.

**UI and features:**

- `NavLink` with `href` calls `useAppNavigation` (`push` or `navigate` via `navigationMode`); disables while `isNavigationLocked`.
- Settings hub rows use `NavLink` (not bare `router.push`).
- Group chips and lists use `useNavigateToGroup` → `openGroup` (`navigate`).

**Stack identity** — `(app)/_layout.tsx`: `dangerouslySingular` on `group/[id]` and `contact/[id]` so the same entity does not stack twice.

**Not in the gate yet (principle 3):** destination mount, sync hydration, or full-screen loader on the **target** screen. The lock covers stack transition + coordinator dedupe only. Extend the gate if peer double-tap still wins during slow first paint.

**Optional later:** nested `settings` stack so all `/settings/*` leaves share one navigator.

Do not add one-off `useRef` guards per feature; use `useAppNavigation` or entity helpers (`openGroup`, `openContact`).

**Allowed raw `router` exceptions:** auth `replace` in login/callback flows; `goBackOrReplace` for stack back; external URLs via `onPress`.

---

## Review checklist

- [ ] Hub and list rows do not call `router.push` / `router.navigate` directly without the shared gate
- [ ] Rapid double-tap on two sibling rows yields **one** back step to the hub (not two)
- [ ] Same entity opened twice does not deepen the stack (`navigate` + `dangerouslySingular`)
- [ ] Navigation is blocked or ignored while the previous transition has not finished
- [ ] Full-screen loaders on the destination do not leave the source list accepting taps that stack another route
- [ ] Maestro or manual test: slow animations + double-tap on Settings preferences rows

---

## Anti-patterns

- Multiple `router.push` calls from one scroll view with no in-flight guard
- Per-screen `navigatingToXRef` that only dedupes one id or one route family
- Letting the stack grow for “sibling swap” (user meant to open Tags, not Tags on Groups)

---

## Related

- [loading-states.md](../common/loading-states.md) — when the screen is not ready
- [feedback-and-confirmations.md](../common/feedback-and-confirmations.md) — errors after navigation
- [product/page-navigation-resume.md](../product/page-navigation-resume.md) — return after outage (different concern)
