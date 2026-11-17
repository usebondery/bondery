# Webapp phone / PWA shell

Phone-viewport and installed-PWA chrome for **`apps/webapp`**. Same product as desktop webapp; not the Expo app.

**When to read:** adding or changing how users open the sidebar below Mantine `sm`, standalone `display: standalone` (`apps/webapp/src/app/manifest.ts`), or Chat vs nav overlap on a phone.

Expo tabs/FAB live in [../mobile/](../mobile/README.md) — do not copy them here.

---

## Default (do not hybridize)

**Thin `AppShellHeader`: logotype on the left, menu button on the right, overlay from the right.** Page title stays in in-page `PageHeader`. No bottom tabs, no nav FAB, no marketing `Drawer`.

The header exists because it is the only slot that stays reachable after scroll, does not sit next to `PageHeader` back, and does not cover Chat’s mobile session list.

---

## Rules

1. **Shell owns the menu; pages do not.** Put the control in `AppShellWrapper` (`AppShellHeader`), not in `PageHeader`, `ErrorPageHeader`, or route clients. Every `(shell)` route gets it for free (Home, lists, Chat, Settings, Map, person/group detail, `ErrorPageHeader`, `loading.tsx` skeletons).

2. **Visible only below `sm`.** Desktop keeps the persistent sidebar (expanded or ~80px rail). Do not show a burger when the desktop sidebar is collapsed — the rail is the nav.

3. **Menu top-right; overlay from the right.** Logotype stays left (home). Desktop navbar stays a left rail. Do not use the marketing-site `Drawer` — toggle the existing `AppShellNavbar`, positioned from the right below `sm`. Mantine `AppShellNavbar` draws `border-inline-end` (outer edge of a left rail). On the right overlay, flip it to `border-inline-start` so the line sits between overlay and content, not against the screen edge.

4. **Open the existing navbar — do not add a second drawer.** Toggle Mantine `navbar.collapsed.mobile`. Overlay dims the main region; the header stays visible so the same control can close.

5. **Header content is chrome, not a page toolbar.** `justify="space-between"`:
   - Left: compact logotype (home link), flex-centered in the header row — standalone PWA has no browser chrome to name the app
   - Right: menu `ActionIconButton` `size="xl"` `variant="default"` (same family as `PageHeader` back) — `IconMenu2` closed, `IconX` open
   - No page title, no Import/Add/session actions, no search field

6. **Page title stays in `PageHeader`.** Do not move or duplicate `Title order={1}` into the sticky header. `PageHeader` remains in-flow and may scroll away.

7. **Never stack menu and back in the same row.** App-level: menu in `AppShellHeader`. Page-level: back in `PageHeader` on person/group (and other detail) routes. Do not hide the menu on detail — jumping to Chat/Settings from a person is a real job in standalone PWA. Do not replace menu with back.

8. **Mobile overlay is always Browse IA — never Chat mode.** Desktop sidebar Chat mode (`SegmentedControl` + `SidebarChatPanel`) is a density feature. On `< sm`, Chat sessions already render in `chat/layout.tsx` (`hiddenFrom="sm"`, max 40% height). If the overlay also showed `SidebarChatPanel`, the user would open “menu” and see sessions twice, with People/Home gone.
   - Hide Browse/Chat `SegmentedControl` in the overlay
   - Force **expanded** labels (never the collapsed icon rail; ignore width cookies for overlay width)
   - Treat Chat as a destination in the overlay list (Search, then Chat, then current primary links, secondary, user card)
   - Keep `chat/layout.tsx` session list as-is

9. **Close the overlay after a navigation choice.** Nav link, Chat, Settings, user card, logotype-home, Search (then open command palette). Also close on: tap overlay/outside, Escape, route change. Lock the main `AppShellMainScrollArea` viewport (`overflow: hidden`) while the overlay is open — do not use `html { scrollbar-gutter: stable }` or body `paddingRight` / `--mobile-nav-scroll-lock-gutter`. The document is already overflow-hidden for the shell, so there is no classic scrollbar to reserve; the header menu does not move. Return focus to the menu button on close.

10. **Do not ship edge-swipe-to-open in v1.** iOS back-swipe, browser back, and Chat already own the left edge.

11. **Safe area is the header’s job on standalone.** Pad the header with `env(safe-area-inset-top)` (and overlay bottom with `env(safe-area-inset-bottom)` so the user card is not under the Android gesture bar). Chat session threads grow in `AppShellMainScrollArea`. The session composer is a `AppShellMain` sibling below that scroller (`ShellMainFooter`), not `position: sticky` inside Radix `ScrollArea` (overflow ancestors make sticky drift). New-chat hero stays centered in the scroller. Do not cancel shell padding with negative margins. Header still owns `safe-area-inset-top`. `AppShell` `padding={0}` so Main only keeps header/navbar offsets and the page thumb is flush; content gutter is `padding: md` on the ScrollArea **content** (not a `flex: 1` wrapper — that locks height to the viewport and kills page scroll). Do not compensate by cloning Expo `SafeAreaProvider`.

12. **Loading/error must not hide the menu.** The header sits outside page `loading.tsx` / `PageHeaderSkeleton`. Do not add a fake burger to `PageHeaderSkeleton`. `ErrorPageHeader` stays a `PageHeader`; the shell menu remains the way out.

13. **i18n.** No hardcoded English. Add `common.a11y.openMenu` / `common.a11y.closeMenu` (sentence case, like `a11y.back`). Wire `aria-expanded` and `aria-controls` on the button. Do not reuse marketing aria literals.

14. **Do not clone Expo chrome.** No 2-tab bar, no FAB speed dial, no native-like IA. PWA is a compact webapp.

---

## Placement (component tree)

```
AppShellWrapper
  AppShell
    AppShellHeader          ← NEW, < sm only, sticky, safe-area top
      [Logotype → home] ………… [Menu button]
    AppShellNavbar          ← desktop = left rail; mobile = right overlay, expanded Browse IA
    AppShellMain
      AppShellMainScrollArea  ← sole page scroller (`type="auto"`), thumb on the edge
        content p="md"        ← former AppShell padding, grows with the page
          PageHeader / page   ← unchanged (back, icon, title, actions)
      ShellMainFooterHost     ← session chat composer; not inside the scroller
```

Resize handle stays `visibleFrom="sm"`.

---

## Interaction

| Event | Result |
|-------|--------|
| Tap menu | Toggle navbar overlay |
| Tap overlay / Escape / route change | Close |
| Tap nav item / user card / logo | Navigate and close |
| Tap Search in overlay | Close overlay, open existing command palette |
| After scroll on a long list | Header (menu) still on screen |
| Person/group detail | Menu still in header; back still in `PageHeader` |

Selected item: keep existing `NavLinkItem` `active` / `aria-current="page"`. Chat is active when `isChatRoute`.

---

## What to avoid

- `PageHeader` burger (scrolls away; stacks with back; sits **below** Chat sessions)
- Fixed floating control over the canvas (covers Chat session list and Map; fights `PageHeader` padding)
- Full sticky bar that duplicates the page title
- Bottom tabs / FAB as app nav
- Website `Burger` + `Drawer` (marketing header, not AppShell)
- Menu button or overlay on the left below `sm` (desktop rail stays left)
- Showing Chat `SegmentedControl` / `SidebarChatPanel` inside the mobile overlay
- Menu button at `sm` and up (including collapsed desktop rail)

---

## Checklist

- [ ] Control lives in `AppShellWrapper` header, `hiddenFrom="sm"` (or equivalent header collapse)
- [ ] Overlay is existing navbar, expanded Browse IA, Chat is a list row
- [ ] Chat layout still shows `SidebarChatPanel` in the top `hiddenFrom="sm"` block
- [ ] `PageHeader` back unchanged; not in the same row as menu
- [ ] `common.a11y.openMenu` / `closeMenu` in `en`/`cs`/`de`
- [ ] Touch target `ActionIconButton` `size="xl"`
- [ ] Safe-area top on header; overlay bottom not under gesture bar
- [ ] Overlay open locks `AppShellMainScrollArea` (not html scrollbar-gutter / body padding)
- [ ] Chat fills `AppShellMainScrollArea` (`height: 100%`), not a `100dvh` formula
- [ ] Menu visible while page skeleton/error renders
- [ ] No Expo tab/FAB patterns
