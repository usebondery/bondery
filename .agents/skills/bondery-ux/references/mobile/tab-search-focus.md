# Tab tap → in-page search (Expo native)

When the user is already on a **root tab** whose screen exposes **in-page search**, a **tap** on that tab’s bubble focuses the search field so they can type immediately.

Not the webapp PWA — see [search-and-discovery.md](../common/search-and-discovery.md).

---

## When it applies

- `apps/mobile` root tab bar (`apps/mobile/src/features/navigation/FloatingBubbleTabBar.tsx`).
- The tab is **already selected**.
- The visible tab-root screen registered a search focus handler (today: **Contacts**).

Out of scope: stack routes without the tab bar (`group/[id]`, `settings/tags`, contact detail); sheet picker search in `apps/mobile/src/components/ui/Sheet.tsx`.

---

## Behavior

| Gesture | Tab not selected | Tab already selected |
|--------|------------------|----------------------|
| Single tap | Switch to that tab | Focus registered in-page search; keyboard opens (Contacts only) |
| Long press | Tab long-press event | Tab long-press event |

Tab bubbles use `ActionButton` with `onPress` / `onLongPress` (RNGH `Pressable`).

---

## Rules

1. **Opt-in** — screens call `useRegisterTabSearchFocus`. No handler → focused tap is a no-op for search.
2. **Respect blocking UI** — unregister or set `enabled: false` during full-screen loader, error-only state, or when tab chrome is replaced (e.g. contacts bulk selection bar).
3. **Not stack peer guards** — unrelated to [navigation.md](./navigation.md) list double-tap / in-flight `push` rules.
4. **Accessibility** — when a tab supports this on the focused tab, set `accessibilityHint` (e.g. `MobileNavigation.TabTapSearchHint` on Contacts).

---

## Implementation

- **Coordinator** — `apps/mobile/src/features/navigation/tabSearchFocusContext.tsx`: `TabSearchFocusProvider`, `useRegisterTabSearchFocus`, `focusActiveTabSearch`.
- **Tab chrome** — `apps/mobile/src/features/navigation/FloatingTabPill.tsx`: `ActionButton` with focus-dependent `onPress` in `FloatingBubbleTabBar`.
- **First consumer** — `apps/mobile/src/features/contacts/ContactsScreen.tsx`: search `TextInput` ref + registration.

New tab-root screens with search: add ref + `useRegisterTabSearchFocus` with appropriate `enabled` guards.

---

## Review checklist

- [ ] Tap Contacts tab while on Contacts → search focused, keyboard visible
- [ ] Tap Contacts tab from Settings → switches to Contacts
- [ ] Tap Settings tab while on Settings → no search side effect
- [ ] Selection mode / loader / error → no focus
- [ ] Manual or Maestro: tap Contacts bubble on iOS and Android

---

## Related

- [search-and-discovery.md](../common/search-and-discovery.md) — in-page vs global find
- [navigation.md](./navigation.md) — stack and peer route guards
