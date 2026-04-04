# Bondery Chrome Extension

A Chrome extension built with **React** and **TypeScript** to enhance the Bondery experience.

## Local development

Run from this folder:

```bash
npx wxt prepare
npx wxt
```

Load `dist/chrome-mv3-dev` as unpacked extension in Chrome.

For full setup instructions see [docs/contributing/local-setup.md](../../docs/contributing/local-setup.md).

## OAuth login error (redirect URI mismatch)

If you see:

```
Authorization page could not be loaded … redirect URI exact match (https://<extension-id>.chromiumapp.org/)
```

This means the OAuth client in your local Supabase does not have your extension's redirect URI registered (common after a DB reset or on a new machine). Follow the [Chrome Extension OAuth Setup workflow](../../.agents/workflows/CHROME-EXTENSION-OAUTH.md) to fix it.

## Testing the "extension update required" flow locally

Because the local extension is always the current version, the update gate (`MIN_EXTENSION_VERSION`) never triggers. To simulate it:

1. In `packages/helpers/src/globals/paths.ts`, temporarily bump `MIN_EXTENSION_VERSION` above the installed version:

```ts
// Current extension version is 1.3.0 — set min higher to simulate outdated client
export const MIN_EXTENSION_VERSION = "99.0.0";
```

2. Restart the API server (or let it hot-reload). The API will now reject all extension requests with `426 Upgrade Required`.

3. The extension background worker detects the 426, sets `updateRequired: true` in storage, and the popup shows the update-required screen.

4. Revert `MIN_EXTENSION_VERSION` back to `"0.0.0"` when done testing.

