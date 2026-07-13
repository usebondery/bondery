# Theme (color scheme)

Account theme is an **account preference**, not client UI state.

## Data flow

```
user_settings.color_scheme (Postgres)
  → GET /api/me/session (getAppSession)
  → UserSessionProvider.colorScheme
  → ColorSchemeSync → Mantine (render only)
```

SSR first paint: `resolveSsrColorScheme()` in root layout sets `data-mantine-color-scheme` and `ColorSchemeScript`.

## Rules

- **Never** call `setColorScheme` outside [`ColorSchemeSync.tsx`](../components/shell/ColorSchemeSync.tsx).
- **Never** persist theme in Mantine localStorage (`sessionColorSchemeManager` is a noop).
- After settings mutations that change theme: `refreshAppShell({ colorScheme })`.
- Optimistic UI in settings: `applyUserSession({ colorScheme })` only.

## Stale tabs

Background tabs resync on focus via [`SessionResyncOnFocus.tsx`](../components/shell/SessionResyncOnFocus.tsx) (`router.refresh()`).

## Unauthenticated routes

Login and marketing use Mantine `auto` default; no `UserSessionProvider` or `ColorSchemeSync`.
