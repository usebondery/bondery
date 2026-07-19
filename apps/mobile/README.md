# Bondery Mobile (Expo)

Mobile MVP app for Bondery built with Expo Router and React Native.

## Scope (current)

- Authentication
  - Single login screen with Supabase OAuth (GitHub, LinkedIn OIDC)
  - Session guard uses Expo Router `Stack.Protected` with `(auth)` and `(app)` route groups
  - Auth state is centralized in `AuthProvider` (single Supabase session read)
  - OAuth callback route exchanges code for Supabase session
- Contact Book view
  - Search by name/email/phone
  - Sort by name/surname
  - Left/right swipe quick actions (call/message/email)
  - Long-press multi-select with bulk delete confirmation
  - Alphabet smart scrollbar with active letter indicator
- Floating root-tab navigation
  - Contacts (left bubble, active = primary filled + white icon)
  - Add (center plus bubble with action menu)
  - Settings (right bubble, active = primary filled + white icon)
  - Visible only on tab root screens (`/contacts`, `/settings`)
  - Hidden on deep pushed routes (for example `/contact/[id]`, `/contact/new`)
- Create person flow
  - Dedicated pushed route: `/contact/new`
  - Uses `POST /api/contacts` through mobile API client helper
  - On success, routes back to contacts root and triggers list refresh
- Settings view
  - Configure left/right swipe actions
  - Switch app language (EN/CZ)

## Environment variables

Prefer root `.env.local` + `npm run env` (see [Environment configuration](../../docs/contributing/environment.md)). Mobile reads `BONDERY_PUBLIC_*` via `app.config.ts` → `extra`.

## Development

```bash
npm install
npm run dev --workspace=mobile
```

Then run on emulator/device from Expo CLI.

## Theming

- Shared mobile colors are centralized in `src/theme/colors.ts`.
- Tamagui theme keys for primary buttons are defined in `src/theme/tamagui.config.ts`.
- Keep `PRIMARY_BUTTON_BACKGROUND` aligned with webapp brand color for cross-platform consistency.

## QA checklist

- Root tabs
  - Confirm floating bubble menu is visible on `/contacts` and `/settings`.
  - Confirm active route bubble has primary filled background + white icon.
- Deep routes
  - Confirm floating bubble menu is hidden on `/contact/[id]`, `/contact/new`, and `/group/[id]`.
- Plus menu
  - Confirm center plus toggles menu open/close.
  - Confirm tap outside closes the menu.
  - Confirm Android back closes the menu before leaving screen.
- Create person
  - Confirm first name validation blocks empty submit.
  - Confirm successful submit returns to contacts root and refreshes list.
  - Confirm error path keeps form values and shows error alert.
- Accessibility
  - Confirm tab and plus controls have readable accessibility labels.
