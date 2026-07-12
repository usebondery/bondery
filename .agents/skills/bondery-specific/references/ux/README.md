# Bondery UX patterns

Bondery-specific UX principles for agents and humans. Organized by scope:

```
ux/
  README.md           ← you are here
  common/             Cross-platform rules (empty states, lists, writing, …)
  mobile/             Touch-first, sheets, offline sync surfacing
  desktop/            Keyboard + pointer (webapp on laptop/PC)
  product/            Bondery-only features (onboarding, imports, resume intent, …)
```

Also see `references/mobile-forms.md` (technical RHF patterns for mobile sheets).

## Common

| File | Topic |
|------|--------|
| [empty-states.md](./common/empty-states.md) | Zero data, no results — what happened + what to do |
| [loading-states.md](./common/loading-states.md) | Skeletons vs inline loaders |
| [lists-and-selection.md](./common/lists-and-selection.md) | Searchable lists, selection, bulk actions, pagination |
| [search-and-discovery.md](./common/search-and-discovery.md) | Find principles (in-page vs global) |
| [ux-writing.md](./common/ux-writing.md) | Voice, errors, empty copy, destructive confirms |
| [feedback-and-confirmations.md](./common/feedback-and-confirmations.md) | Toasts, when to skip success feedback |
| [destructive-actions.md](./common/destructive-actions.md) | Friction calibrated to reversibility |
| [progressive-disclosure.md](./common/progressive-disclosure.md) | Start minimal, reveal on demand |
| [forms-validation.md](./common/forms-validation.md) | Disable submit until valid (shared rules) |

## Mobile

| File | Topic |
|------|--------|
| [action-sheets-and-keyboard.md](./mobile/action-sheets-and-keyboard.md) | Autofocus, Done key, blocking sheets |
| [settings-previews.md](./mobile/settings-previews.md) | Live preview sections in settings |
| [lists-selection.md](./mobile/lists-selection.md) | Long-press, drag-select, FAB bulk bar |

## Desktop

| File | Topic |
|------|--------|
| [global-find.md](./desktop/global-find.md) | Command palette, people spotlight, `HOTKEYS` |
| [modals.md](./desktop/modals.md) | Web modals, `ModalFooter`, blocking dismiss |

## Product

| File | Topic |
|------|--------|
| [page-navigation-resume.md](./product/page-navigation-resume.md) | Return intent after outage / session expiry |
| [onboarding.md](./product/onboarding.md) | Wizard, Getting Started rail |
| [platform-parity.md](./product/platform-parity.md) | Web vs mobile feature matrix |
