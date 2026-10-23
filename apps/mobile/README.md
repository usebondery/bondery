# Bondery Mobile (Expo)

Mobile MVP app for Bondery built with Expo Router and React Native.

## Scope (current)

- Authentication
  - Single login screen with Better Auth OAuth (GitHub, LinkedIn OIDC) against the API
  - Session guard uses Expo Router `Stack.Protected` with `(auth)` and `(app)` route groups
  - Auth state is centralized in `AuthProvider`
  - OAuth callback route exchanges code for an API session
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

Prefer root `.env.local` + `pnpm run env` (see [Environment configuration](../../docs/contributing/environment.mdx)). Mobile reads `BONDERY_PUBLIC_*` via `app.config.ts` → `extra`.

## Development

```bash
pnpm install
pnpm --filter mobile run dev
```

Then run on emulator/device from Expo CLI.

## Theming

- Shared mobile colors are centralized in `src/theme/colors.ts`.
- Keep `PRIMARY_BUTTON_BACKGROUND` aligned with webapp brand color for cross-platform consistency.

## Mobile UI kit

Login and Settings compose Uniwind controls from `apps/mobile/src/components/ui/`. Import each file directly. There is no barrel `index.ts`.

```tsx
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Checkbox";
import { NavLink } from "../../components/ui/NavLink";
import { Paper } from "../../components/ui/Paper";
import { Select } from "../../components/ui/Select";
import { Sheet } from "../../components/ui/Sheet";
import { Text } from "../../components/ui/Text";
```

Props follow Mantine names: `c`, `fw`, `ta`, `size`, `variant`, `leftSection`, `rightSection`, `className`. Join class fragments with `joinClassNames`. Paint colors with `useMobileThemeColors` JS tokens. Do not call `Uniwind.setTheme`.

`Sheet` wraps Gorhom `BottomSheetModal` with shared chrome: title, close, busy lock, optional search row, and footer actions. Use `opened`, `onClose`, and `snapPoint` (`fit` or a key from `SHEET_SNAP_POINTS` in `src/lib/config.ts`). For scrollable lists inside a sheet, use `BottomSheetFlatList` or `useSheetScrollable()` from the same module. Press feedback lives inside `Button`, `NavLink`, `ActionIcon`, `SegmentedControl`, and `PersonAvatar` when `onPress` is set. Screens must not wrap those controls in an extra press primitive. `Checkbox` wraps `expo-checkbox`. `OverflowMenu` uses a React Native `Modal`.

## QA checklist

- Root tabs
  - Confirm floating bubble menu is visible on `/contacts` and `/settings`.
  - Confirm active route bubble has primary filled background + white icon.
- Deep routes
  - Confirm floating bubble menu is hidden on `/contact/[id]` and `/contact/new`.
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
