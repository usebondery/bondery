# Feedback and confirmations

Do not add success notifications (toasts, banners, snackbars, modals) when the user can already see that the action worked. The visible result **is** the confirmation.

---

## Skip success feedback when

| Pattern | Confirmation the user already sees | Bondery examples |
|--------|-------------------------------------|------------------|
| **Navigation after create** | The new screen opens | Mobile: create contact sheet → `/contact/[id]` |
| **Outage / session resume** | Same page reappears (filters intact) | Webapp: unavailable → auto-return |
| **Inline control update** | Selected value, toggle, or theme updates | Mobile: theme / language / timezone |
| **Optimistic local preference** | Control reflects new value instantly | Mobile: group sort order (local only) |
| **Sheet closes into updated context** | Parent list or detail shows new state | Social link saved on contact detail |
| **Settings preview updated** | Preview component changed | Mobile `SettingsPreviewSection` |

**Rule:** If the user can answer "did it work?" by looking at the screen they are already on, do **not** also show "Saved", "Success", or "Updated".

---

## Still show feedback when

| Situation | What to show |
|-----------|----------------|
| **The action failed** | Error toast or inline error (always) |
| **Success is invisible** | Background sync, **copy to clipboard**, email sent, export downloaded |
| **Success is easy to miss** | Subtle off-screen change, no navigation |
| **Destructive or irreversible** | Optional brief confirmation before; error if it fails |
| **Create more is on** | Success toast required even if the off path navigates. See [create-more.md](../desktop/create-more.md) |

**Copy buttons:** Clipboard has no visible UI change — always show brief success toast. Error toast if copy fails.

---

## Implementation

- **Mobile:** `notifications` from `apps/mobile/src/lib/toast/notifications` for errors and invisible successes only.
- **Webapp:** Mantine `notifications` — same rule.
- **Settings:** Changing a select/toggle is self-confirming. Revert control + error on API failure.
- **Avoid double confirmation:** Do not combine "navigate to result" **and** "success toast". Create more **on** is not double confirmation (no navigate; an empty form is not proof). Create more **off** keeps skip-toast-when-navigate. Do not add toasts to an off path that already navigates just because the on path needs one.

### Quick check before adding a success toast

1. Does the screen or control already show the outcome?
2. Did we navigate the user to the result?
3. Would the toast only repeat what they already know?
4. Is Create more on? If yes, always show a success notification.

If yes to any of 1–3 — skip the success notification. Step 4 overrides that skip.

---

## Async duplication — loading notification, then success or error

Duplicating an entity (group, interaction, etc.) has no immediate on-screen change. Show **loading notification immediately**, then **update the same notification** to success or error.

| Phase | What to show |
|-------|----------------|
| **Request starts** | Loading toast — `common.feedback.duplicating` + description |
| **Success** | Update same toast to success |
| **Failure** | Update same toast to error |

**Webapp:** `notifications.show` + `notifications.update` with returned `id` and `@bondery/mantine-next` templates.

**Mobile:** same `show` + `update` API on `notifications` from `apps/mobile/src/lib/toast/notifications`. Loading toasts are available; group duplicate on mobile does not use them yet.

**Reference:** `GroupsClient.tsx`, `useGroupDetailActions.tsx`, `InteractionsClient.tsx`, `PersonInteractionsSection.tsx`, `HomeClient.tsx`.
