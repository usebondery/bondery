# Bondery Chrome Extension

A Chrome extension built with **React** and **TypeScript** to enhance the Bondery experience.

## Local development

Run from this folder:

```bash
npx wxt prepare
npx wxt
```

Load `dist/chrome-mv3-dev` as unpacked extension in Chrome.

## OAuth setup for new extension IDs

When a developer installs the extension unpacked, Chrome assigns a unique extension ID.
That changes the redirect URL used by `chrome.identity.getRedirectURL()`:

`https://<extension-id>.chromiumapp.org/`

If this URL is not registered for your OAuth client, login fails with:

`Authorization page could not be loaded ... redirect URI exact match (...)`

### 1) Find your current extension ID

In `chrome://extensions`, copy the extension ID.

### 2) Build your redirect URI

```text
https://<your-extension-id>.chromiumapp.org/
```

### 3) Check your extension OAuth client ID

In `apps/chrome-extension/.env.development.local`:

```env
WXT_SUPABASE_OAUTH_CLIENT_ID="<oauth-client-id>"
```

### 4) Update Supabase OAuth client redirect URIs (local Supabase)

From `apps/supabase-db`:

```bash
npx supabase status
```

Copy:

- Project URL (usually `http://127.0.0.1:54321`)
- Secret key (`sb_secret_...`)

List current OAuth clients:

```powershell
$base='http://127.0.0.1:54321'
$secret='<sb_secret_from_supabase_status>'
$headers=@{Authorization="Bearer $secret";apikey=$secret}
Invoke-RestMethod -Method GET -Uri "$base/auth/v1/admin/oauth/clients" -Headers $headers | ConvertTo-Json -Depth 8
```

**If no client exists yet**, create a public client (PKCE, no secret). The `token_endpoint_auth_method='none'` flag is required — omitting it creates a confidential client that will reject PKCE token exchanges with `invalid_credentials`:

```powershell
$base='http://127.0.0.1:54321'
$secret='<sb_secret_from_supabase_status>'
$headers=@{Authorization="Bearer $secret";apikey=$secret;'Content-Type'='application/json'}
$body=@{
	redirect_uris=@('https://<extension-id>.chromiumapp.org/')
	token_endpoint_auth_method='none'
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri "$base/auth/v1/admin/oauth/clients" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

Copy the returned `client_id` into `WXT_SUPABASE_OAUTH_CLIENT_ID` in `.env.development.local`.

> **Note:** A confidential client (`client_type: "confidential"`) cannot be converted to public via `PUT`. If you accidentally created one, delete it and recreate:
> ```powershell
> Invoke-RestMethod -Method DELETE -Uri "$base/auth/v1/admin/oauth/clients/<client-id>" -Headers $headers
> ```

**If a client already exists** (check `client_type: "public"`), just update its redirect URIs to add your new extension ID alongside the existing ones:

```powershell
$base='http://127.0.0.1:54321'
$secret='<sb_secret_from_supabase_status>'
$clientId='<WXT_SUPABASE_OAUTH_CLIENT_ID>'
$body=@{
	redirect_uris=@(
		'https://<old-extension-id>.chromiumapp.org/',
		'https://<new-extension-id>.chromiumapp.org/'
	)
} | ConvertTo-Json -Depth 5
$headers=@{Authorization="Bearer $secret";apikey=$secret;'Content-Type'='application/json'}
Invoke-RestMethod -Method PUT -Uri "$base/auth/v1/admin/oauth/clients/$clientId" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

### 5) Reload extension and retry login

After updating redirect URIs, reload the unpacked extension and retry login.

## Hosted Supabase projects

If you are using a hosted Supabase project (not local Docker), perform the same redirect URI update in that environment's Auth OAuth clients as well.

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

