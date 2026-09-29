# Bondery UX patterns

Bondery-specific UX principles for agents and humans. Organized by scope:

```
references/
  README.md           ← you are here
  common/             Cross-platform rules (empty states, lists, writing, …)
  mobile/             Expo native app (touch sheets, FAB, offline) — not webapp PWA
  desktop/            Webapp (`apps/webapp`) — laptop/PC and phone/PWA
  product/            Bondery-only features (onboarding, imports, resume intent, …)
```

Also see [mobile/forms.md](./mobile/forms.md) (technical RHF patterns for mobile sheets).

## Common

| File | Topic |
|------|--------|
| [i18n.md](./common/i18n.md) | Translations, locales, hooks, CI |
| [api-errors-display.md](./common/api-errors-display.md) | Client error notifications |
| [avatars.md](./common/avatars.md) | Contact photos, initials fallback |
| [empty-states.md](./common/empty-states.md) | Zero data, no results — what happened + what to do |
| [loading-states.md](./common/loading-states.md) | Skeletons vs inline loaders |
| [lists-and-selection.md](./common/lists-and-selection.md) | Searchable lists, selection, bulk actions, pagination |
| [search-and-discovery.md](./common/search-and-discovery.md) | Find principles (in-page vs global) |
| [ux-writing.md](./common/ux-writing.md) | Voice, errors, empty copy, destructive confirms |
| [feedback-and-confirmations.md](./common/feedback-and-confirmations.md) | Toasts, when to skip success feedback |
| [destructive-actions.md](./common/destructive-actions.md) | Friction calibrated to reversibility |
| [progressive-disclosure.md](./common/progressive-disclosure.md) | Start minimal, reveal on demand |
| [forms-validation.md](./common/forms-validation.md) | Disable submit until valid (shared rules) |

## Mobile (Expo native)

| File | Topic |
|------|--------|
| [action-sheets-and-keyboard.md](./mobile/action-sheets-and-keyboard.md) | Autofocus, Done key, blocking sheets |
| [settings-previews.md](./mobile/settings-previews.md) | Live preview sections in settings |
| [lists-selection.md](./mobile/lists-selection.md) | Long-press, drag-select, FAB bulk bar |

Webapp on a phone is **not** this folder — see [desktop/mobile-pwa-shell.md](./desktop/mobile-pwa-shell.md).

## Desktop (webapp, all viewports)

| File | Topic |
|------|--------|
| [global-find.md](./desktop/global-find.md) | Command palette, people spotlight, `HOTKEYS` |
| [keyboard-shortcuts.md](./desktop/keyboard-shortcuts.md) | `Kbd` display, `parseShortcutKeys` |
| [modals.md](./desktop/modals.md) | Web modals, loading jobs, `ModalFooter`, blocking dismiss |
| [create-more.md](./desktop/create-more.md) | Repeatable create modals, Create more switch |
| [tooltips.md](./desktop/tooltips.md) | Mantine Tooltip: theme `multiline`, `withArrow`, `w: 300` |
| [mobile-pwa-shell.md](./desktop/mobile-pwa-shell.md) | Phone/PWA: thin header menu → existing navbar overlay |

## Product

| File | Topic |
|------|--------|
| [page-navigation-resume.md](./product/page-navigation-resume.md) | Return intent after outage / session expiry |
| [onboarding.md](./product/onboarding.md) | Wizard, Getting Started rail |
| [import-flow.md](./product/import-flow.md) | Social + vCard import modals |
