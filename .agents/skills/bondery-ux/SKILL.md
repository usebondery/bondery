---
name: bondery-ux
description: >
  Bondery UX patterns — empty states, loading, lists, forms, modals, i18n, keyboard shortcuts,
  tooltips, avatars, product flows (onboarding, import, navigation resume), webapp phone/PWA shell nav,
  and agent-facing interfaces (MCP tool errors, docs links, agent bug reports).
  Use when building or reviewing UI in webapp or mobile, writing user-facing copy, or choosing
  interaction patterns, including create more, repeatable create, stay open after create, PWA sidebar menu,
  or when designing how an AI agent recovers from a tool error or reports a defect.
metadata:
  version: "1.1.0"
  namespace: bondery
---

# Bondery UX

## When to use

- Building or reviewing UI components and flows (webapp or mobile)
- Choosing empty states, loading patterns, lists, modals, or forms
- Writing user-facing copy or adding translations
- Displaying keyboard shortcuts, tooltips, avatars, or API error messages
- Product flows: onboarding, imports, outage/session recovery
- Designing errors and recovery for tools that an AI agent calls (MCP, in-app chat)

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
- Paginated lists use server `pagination.hasMore`. A shell table loads the next page with the shell sentinel — see [lists-and-selection.md](references/common/lists-and-selection.md)
- Keyboard shortcut display uses `Kbd` from `@bondery/mantine-next` — not `@mantine/core`
- `avatar: null` means show initials — no phantom image requests
- Repetitive web create modals include Create more (or pass `repeatable: false` for nested pickers) — see [create-more.md](references/desktop/create-more.md)
- Webapp phone/PWA opens the existing sidebar via a thin `AppShellHeader` menu — never Expo tabs/FAB, never a `PageHeader` burger — see [mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md)
- Expo native: do not stack sibling routes on rapid taps; block navigation while a transition or destination load is in flight — see [navigation.md](references/mobile/navigation.md)
- Agent tools (MCP, chat) return a structured error with WHAT, WHY, and HOW, plus `doc_url` — never a bare failure string. See [agent-interfaces.md](references/common/agent-interfaces.md)

## Decision tree

| Task | Read |
|------|------|
| Translations / i18n | [references/common/i18n.md](references/common/i18n.md) |
| Empty / loading states | [references/common/empty-states.md](references/common/empty-states.md), [loading-states.md](references/common/loading-states.md) |
| Lists and selection | [references/common/lists-and-selection.md](references/common/lists-and-selection.md) |
| UX writing voice | [references/common/ux-writing.md](references/common/ux-writing.md) |
| API error display | [references/common/api-errors-display.md](references/common/api-errors-display.md) |
| Agent / MCP tool errors, docs link, bug reports | [references/common/agent-interfaces.md](references/common/agent-interfaces.md) |
| Avatars | [references/common/avatars.md](references/common/avatars.md) |
| Web modals / command palette | [references/desktop/modals.md](references/desktop/modals.md), [global-find.md](references/desktop/global-find.md) |
| Webapp phone / PWA shell nav | [references/desktop/mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md) |
| Create more / stay-open after create | [references/desktop/create-more.md](references/desktop/create-more.md) |
| Keyboard shortcut chips | [references/desktop/keyboard-shortcuts.md](references/desktop/keyboard-shortcuts.md) |
| Tooltips (Mantine, web) | [references/desktop/tooltips.md](references/desktop/tooltips.md) |
| Start and end date inputs | [references/desktop/date-inputs.md](references/desktop/date-inputs.md) |
| Filter menus | [references/desktop/filter-menus.md](references/desktop/filter-menus.md) |
| Drag cursor (`grab` / `grabbing`) | [references/desktop/pointer.md](references/desktop/pointer.md) |
| Mobile forms / sheets | [references/mobile/forms.md](references/mobile/forms.md) |
| Mobile stack / rapid taps | [references/mobile/navigation.md](references/mobile/navigation.md) |
| Mobile tab tap → search focus | [references/mobile/tab-search-focus.md](references/mobile/tab-search-focus.md) |
| Onboarding / import | [references/product/onboarding.md](references/product/onboarding.md), [import-flow.md](references/product/import-flow.md) |
| Outage / session recovery | [references/product/page-navigation-resume.md](references/product/page-navigation-resume.md) |

## UX checklist (before merge)

- [ ] All new user-visible strings in every locale in `supported-locales.json`
- [ ] No hardcoded English literals in components (exceptions: logs, test IDs, brand names)
- [ ] API errors shown via `getUserFacingError` — not server `message`
- [ ] New API error code has a `/docs/api/errors/{code}` page with an imperative recovery step
- [ ] Agent-facing tool failures return WHAT, WHY, HOW, and `doc_url` — not a plain string
- [ ] Empty, loading, and error states handled (not just happy path)
- [ ] Platform-appropriate pattern (Expo sheet vs web modal; webapp phone uses [mobile-pwa-shell.md](references/desktop/mobile-pwa-shell.md), not Expo tabs)
- [ ] A shell `DataTable` list uses the shell sentinel and server `pagination.hasMore`. Do not render a Load more button in `DataTable`. Do not derive the next page from the client page size.
- [ ] Keyboard shortcuts use `Kbd` + `parseShortcutKeys` from `@bondery/mantine-next`
- [ ] Mantine Tooltip (webapp/website): do not pass `multiline`, `withArrow`, `w`, or `maw` unless overriding theme defaults — see [tooltips.md](references/desktop/tooltips.md)
- [ ] Mobile `ui/Button` / sheet actions: `loading` includes `loadingText` (progressive label)
- [ ] Destructive actions have confirmation per [destructive-actions.md](references/common/destructive-actions.md)
- [ ] Repetitive create modals: Create more switch per create-more.md (or explicit `repeatable: false`)
- [ ] Create more ON shows a success toast even when the OFF path navigates and skips one
- [ ] Mobile hub/list navigation uses shared in-flight guard — no raw `router.push` on settings rows; see [navigation.md](references/mobile/navigation.md)
- [ ] Web modal inputs are full width on `base`. Side-by-side fields start at `sm` only — see [modals.md](references/desktop/modals.md)
- [ ] Start and end date fields cannot cross. The other field disables days outside the bound, and the input shows the selected day. See [date-inputs.md](references/desktop/date-inputs.md)
- [ ] A filter menu has Reset at the top. Reset clears every filter in that menu. See [filter-menus.md](references/desktop/filter-menus.md)
