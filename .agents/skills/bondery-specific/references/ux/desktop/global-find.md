# Global find (desktop / webapp)

Keyboard-driven discovery for laptop and PC. Principles: [search-and-discovery.md](../common/search-and-discovery.md).

---

## Components

| Surface | Shortcut | Role |
|---------|----------|------|
| **Command palette** | `mod+k` (`HOTKEYS.COMMAND_PALETTE`) | Nav, create actions, jump to Find person |
| **Find person spotlight** | `f` (`HOTKEYS.FIND_PERSON`) | Server search contacts; min 3 chars |
| **Add person** | `c` | Opens add contact modal |
| **Log interaction** | `n` | Opens log interaction modal |
| **Sidebar toggle** | `mod+b` | Collapse/expand nav |

**Config:** `HOTKEYS` in `@/lib/platform/config`. **Display:** `Kbd` + `parseShortcutKeys` from `@bondery/mantine-next` — see `SKILL.md` § Keyboard shortcuts.

**Mount:** `AppShellWrapper` renders `CommandPalette` + `PeopleSearchSpotlight`.

---

## Command palette

- Mantine Spotlight via `CommandPalette.tsx`.
- Show `Kbd` hints on actions that have hotkeys.
- Include link to Find person action (opens people spotlight).

---

## Find person spotlight

- `PeopleSearchSpotlight.tsx` — debounced server search (`DEBOUNCE_MS.search`).
- **"See all"** → navigate to People with `?search=` query param.
- Optimistic document title while navigating — `optimisticTitles.ts`.

---

## Hotkey rules

- `mod` = Ctrl (Windows/Linux) / ⌘ (macOS) — never hardcode in JSX.
- Bare single-key shortcuts (`c`, `f`, `n`) fire only when focus is **outside** text inputs (`useHotkeys` in shell).
- Do not translate shortcut labels via i18n.

---

## What to avoid

- Ad-hoc `useHotkeys` per page for global actions — extend `HOTKEYS` + palette.
- Second command palette pattern.
- Hardcoded "Ctrl+K" strings in UI.
