---
name: bondery-ux
description: >
  Bondery UX patterns — empty states, loading, lists, forms, modals, i18n, keyboard shortcuts,
  tooltips, avatars, product flows (onboarding, import, navigation resume), webapp phone/PWA shell nav.
  Use when building or reviewing UI in webapp or mobile, writing user-facing copy, or choosing
  interaction patterns, including create more, repeatable create, stay open after create, or PWA sidebar menu.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery UX

## When to use

- Building or reviewing UI components and flows (webapp or mobile)
- Choosing empty states, loading patterns, lists, modals, or forms
- Writing user-facing copy or adding translations
- Displaying keyboard shortcuts, tooltips, avatars, or API error messages
- Product flows: onboarding, imports, outage/session recovery

## Reading order

1. **common/** — cross-platform patterns (empty states, loading, lists, writing, feedback)
2. **desktop/** or **mobile/** — platform-specific interaction patterns
   - **desktop/** = `apps/webapp` (laptop **and** phone/PWA)
   - **mobile/** = Expo native app only — not the webapp PWA
3. **product/** — Bondery-specific flows (onboarding, import, page navigation resume)

Full index: [references/README.md](references/README.md).

For API contracts (pagination `hasMore`, transport, sync), see the `bondery-api` skill.

## Non-negotiables

- All user-visible strings go through `packages/translations` — no hardcoded literals
- API error notifications use `getUserFacingError` — never server `message`
- Paginated lists use server `pagination.hasMore` for “load more” — see `bondery-api` → `api-design.md`
- Keyboard shortcut display uses `Kbd` from `@bondery/mantine-next` — not `@mantine/core`
- `avatar: null` means show initials — no phantom image requests
- Repetitive web create modals include Create more (or pass `repeatable: false` for nested pickers) — see [create-more.md](references/desktop/create-more.md)
- Webapp phone/PWA opens the existing sidebar via a thin `AppShellHeader` menu — never Expo tabs/FAB, never a `PageHeader` burger — see [mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md)

## Decision tree

| Task | Read |
|------|------|
| Translations / i18n | [references/common/i18n.md](references/common/i18n.md) |
| Empty / loading states | [references/common/empty-states.md](references/common/empty-states.md), [loading-states.md](references/common/loading-states.md) |
| Lists and selection | [references/common/lists-and-selection.md](references/common/lists-and-selection.md) |
| UX writing voice | [references/common/ux-writing.md](references/common/ux-writing.md) |
| API error display | [references/common/api-errors-display.md](references/common/api-errors-display.md) |
| Avatars | [references/common/avatars.md](references/common/avatars.md) |
| Web modals / command palette | [references/desktop/modals.md](references/desktop/modals.md), [global-find.md](references/desktop/global-find.md) |
| Webapp phone / PWA shell nav | [references/desktop/mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md) |
| Create more / stay-open after create | [references/desktop/create-more.md](references/desktop/create-more.md) |
| Keyboard shortcut chips | [references/desktop/keyboard-shortcuts.md](references/desktop/keyboard-shortcuts.md) |
| Tooltips (Mantine, web) | [references/desktop/tooltips.md](references/desktop/tooltips.md) |
| Mobile forms / sheets | [references/mobile/forms.md](references/mobile/forms.md) |
| Onboarding / import | [references/product/onboarding.md](references/product/onboarding.md), [import-flow.md](references/product/import-flow.md) |
| Outage / session recovery | [references/product/page-navigation-resume.md](references/product/page-navigation-resume.md) |

## UX checklist (before merge)

- [ ] All new user-visible strings in `en`, `cs`, `de` translation files
- [ ] No hardcoded English literals in components (exceptions: logs, test IDs, brand names)
- [ ] API errors shown via `getUserFacingError` — not server `message`
- [ ] Empty, loading, and error states handled (not just happy path)
- [ ] Platform-appropriate pattern (Expo sheet vs web modal; webapp phone uses [mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md), not Expo tabs)
- [ ] Paginated tables use server `hasMore` for load-more — not client-derived pagination
- [ ] Keyboard shortcuts use `Kbd` + `parseShortcutKeys` from `@bondery/mantine-next`
- [ ] Mantine Tooltip (webapp/website): do not pass `multiline`, `withArrow`, `w`, or `maw` unless overriding theme defaults — see [tooltips.md](references/desktop/tooltips.md)
- [ ] Destructive actions have confirmation per [destructive-actions.md](references/common/destructive-actions.md)
- [ ] Repetitive create modals: Create more switch per create-more.md (or explicit `repeatable: false`)
- [ ] Create more ON shows a success toast even when the OFF path navigates and skips one
