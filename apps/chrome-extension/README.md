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
WXT_OAUTH_CLIENT_ID="<oauth-client-id>"
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

Update redirect URIs for the client in `WXT_OAUTH_CLIENT_ID`:

```powershell
$base='http://127.0.0.1:54321'
$secret='<sb_secret_from_supabase_status>'
$clientId='<WXT_OAUTH_CLIENT_ID>'
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

