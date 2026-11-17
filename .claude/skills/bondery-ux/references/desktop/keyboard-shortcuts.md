# Keyboard shortcuts (display)

Do not use Mantine's `Kbd` from `@mantine/core` for shortcut hints in the UI. Use **`Kbd` from `@bondery/mantine-next`** — it wraps Mantine's chip with platform-aware labels via `useOs` (Ctrl vs ⌘, Shift vs ⇧, etc.).

## Import

```typescript
import { Kbd, parseShortcutKeys } from "@bondery/mantine-next";
```

## API

```tsx
<Kbd keys={["mod", "k"]} size="xs" />
```

Pass shortcut **tokens**, not pre-formatted strings. Use `"mod"` for the primary modifier (Ctrl on Windows/Linux, ⌘ on macOS/iOS).

## With HOTKEYS

```tsx
<Kbd keys={parseShortcutKeys(HOTKEYS.COMMAND_PALETTE)} size="xs" />
```

Keeps display in sync with `useHotkeys` / Spotlight bindings in `@/lib/platform/config`.

## Rules

- Do **not** hardcode `Ctrl`, `Cmd`, or `⌘` in JSX
- Do **not** translate shortcut labels via i18n — they are OS conventions, not locale strings
- **Binding vs display:** `HOTKEYS` + `useHotkeys` define behavior; `Kbd` + `parseShortcutKeys` define what the user sees. Keep both pointed at the same constant.

See also [global-find.md](../desktop/global-find.md) for command palette shortcuts.

## Checklist

- [ ] `Kbd` imported from `@bondery/mantine-next`, not `@mantine/core`
- [ ] `keys` uses tokens (`mod`, `shift`) — not pre-formatted strings
- [ ] Display keys match `HOTKEYS` constant used for binding
- [ ] No hardcoded platform-specific modifier text in JSX
