# Platform parity (web vs mobile)

Track **feature and UX parity** between webapp and mobile app. Update when shipping either side.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Parity |
| 🟡 | Partial |
| ❌ | Web only / mobile only |
| — | N/A on platform |

---

## Core patterns

| Capability | Web | Mobile | Notes |
|------------|-----|--------|-------|
| Empty states (P0 spec) | 🟡 | 🟡 | Follow [../common/empty-states.md](../common/empty-states.md) |
| Layout skeletons | 🟡 | 🟡 | [../common/loading-states.md](../common/loading-states.md) |
| Long list search | ✅ People | 🟡 | Mobile: screen-level search |
| Drag / shift selection | ✅ People table | ❌ | [../mobile/lists-selection.md](../mobile/lists-selection.md) |
| Global find (⌘K) | ✅ Command palette | ❌ | [../desktop/global-find.md](../desktop/global-find.md) |
| Return intent / redirect | ✅ | — | [page-navigation-resume.md](./page-navigation-resume.md) |
| Onboarding wizard | ✅ | ❌ | [onboarding.md](./onboarding.md) |
| Getting Started rail | ✅ | ❌ | Sidebar only |
| Bottom sheets / action sheets | — | ✅ | [../mobile/action-sheets-and-keyboard.md](../mobile/action-sheets-and-keyboard.md) |
| Settings live previews | — | ✅ | [../mobile/settings-previews.md](../mobile/settings-previews.md) |
| Modal focus trap | ✅ | — | [../desktop/modals.md](../desktop/modals.md) |

---

## When to diverge

**Intentional mobile differences:**

- No keyboard shortcuts → no Command palette
- Touch selection → long-press + batch toolbar, not drag rectangle
- Sheets instead of centered modals for secondary actions

**Unintentional gaps** (prioritize backlog):

- Mobile onboarding
- Mobile global search across entities
- Shared empty-state component library

---

## Adding a row

When shipping a feature on one platform:

1. Add or update row here
2. Link to `common/`, `mobile/`, `desktop/`, or `product/` doc
3. If mobile needs a unique pattern, document under `ux/mobile/`

---

## Related

- [onboarding.md](./onboarding.md)
- [../README.md](../README.md)
