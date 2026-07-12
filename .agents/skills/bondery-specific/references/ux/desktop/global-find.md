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

**Mount:** `AppShellWrapper` renders `CommandPalette` + `PeopleSearchSpotlight` + registers `mod+b` (sidebar).

**Per-page hotkeys:** `c`, `f`, `n` register on relevant route clients (`PeopleHeaderClient`, `HomeClient`, `InteractionsClient`) — not all in the shell. `mod+k` comes from Mantine Spotlight default on `CommandPalette`.

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
- Bare single-key shortcuts (`c`, `f`, `n`) register on the pages that own those actions; `useHotkeys` should skip when focus is inside text inputs.
- Do not translate shortcut labels via i18n.

---

## What to avoid

- Duplicate global shortcuts on every page — register on the owning route or extend `HOTKEYS` + palette once.
- Second command palette pattern.
- Hardcoded "Ctrl+K" strings in UI.
