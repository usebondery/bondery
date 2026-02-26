# Bondery Mobile (Expo)

Mobile MVP app for Bondery built with Expo Router and React Native.

## Scope (current)

- Authentication
  - Single login screen with Supabase OAuth (GitHub, LinkedIn OIDC)
  - Session guard redirects unauthenticated users to login
  - OAuth callback route exchanges code for Supabase session
- Contact Book view
  - Search by name/email/phone
  - Sort by name/surname
  - Left/right swipe quick actions (call/message)
  - Long-press multi-select with bulk delete confirmation
  - Alphabet smart scrollbar with active letter indicator
- Settings view
  - Configure left/right swipe actions
  - Switch app language (EN/CZ)

## Environment variables

Create an `.env` file in this folder:

```bash
EXPO_PUBLIC_API_URL=https://api.usebondery.com
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
EXPO_PUBLIC_WEBSITE_URL=https://usebondery.com
```

## Development

```bash
npm install
npm run dev --workspace=mobile
```

Then run on emulator/device from Expo CLI.
