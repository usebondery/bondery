---
name: Chrome Extension OAuth Setup
description: Resolve the "redirect URI exact match" error when running the extension locally. Covers registering or updating the Supabase OAuth client after a DB reset or on a new machine.
triggers:
  - "Authorization page could not be loaded … redirect URI exact match"
  - DB reset wipes the OAuth client
  - New developer machine gets a different extension ID
related: []
---

# Chrome Extension OAuth Setup

## When does this happen?

- You reset the local Supabase database (`npx supabase db reset`) — this wipes all OAuth clients.
- A new developer (or new machine) gets a different Chrome extension ID, so the redirect URI no longer matches.

The error looks like:

```
Authorization page could not be loaded. Verify Supabase OAuth app settings:
client_id, OAuth server enabled, and redirect URI exact match
(https://<extension-id>.chromiumapp.org/).
```

---

## Step 1 — Find your extension ID

In `chrome://extensions`, copy the ID shown under the Bondery extension.

Your redirect URI will be:

```
https://<your-extension-id>.chromiumapp.org/
```

---

## Step 2 — Get the Supabase service role key

```powershell
cd apps/supabase-db
npx supabase status
```

Copy the **Secret** key (`sb_secret_...`).

---

## Step 3 — Check if an OAuth client already exists

```powershell
$base   = 'http://127.0.0.1:54321'
$secret = '<sb_secret_from_supabase_status>'
$headers = @{ Authorization = "Bearer $secret"; apikey = $secret }
Invoke-RestMethod -Method GET -Uri "$base/auth/v1/admin/oauth/clients" -Headers $headers | ConvertTo-Json -Depth 8
```

---

## Step 4a — No client exists → create one

> `token_endpoint_auth_method='none'` is **required**. Omitting it creates a confidential client that rejects PKCE token exchanges with `invalid_credentials`.

```powershell
$base   = 'http://127.0.0.1:54321'
$secret = '<sb_secret_from_supabase_status>'
$headers = @{ Authorization = "Bearer $secret"; apikey = $secret; 'Content-Type' = 'application/json' }
$body = @{
  redirect_uris              = @('https://<your-extension-id>.chromiumapp.org/')
  token_endpoint_auth_method = 'none'
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri "$base/auth/v1/admin/oauth/clients" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

Copy the returned `client_id` into `apps/chrome-extension/.env.development.local`:

```env
WXT_SUPABASE_OAUTH_CLIENT_ID="<client_id>"
```

---

## Step 4b — Client exists → add your redirect URI

List the existing `redirect_uris` from the GET response in Step 3, then PUT with all URIs included (the PUT replaces the list entirely):

```powershell
$base     = 'http://127.0.0.1:54321'
$secret   = '<sb_secret_from_supabase_status>'
$clientId = '<WXT_SUPABASE_OAUTH_CLIENT_ID>'
$headers  = @{ Authorization = "Bearer $secret"; apikey = $secret; 'Content-Type' = 'application/json' }
$body = @{
  redirect_uris = @(
    'https://<existing-extension-id>.chromiumapp.org/',
    'https://<your-extension-id>.chromiumapp.org/'
  )
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method PUT -Uri "$base/auth/v1/admin/oauth/clients/$clientId" -Headers $headers -Body $body | ConvertTo-Json -Depth 8
```

> **Confidential client?** A `client_type: "confidential"` client cannot be converted to public via PUT. Delete it and repeat Step 4a:
> ```powershell
> Invoke-RestMethod -Method DELETE -Uri "$base/auth/v1/admin/oauth/clients/<client-id>" -Headers $headers
> ```

---

## Step 5 — Reload and retry

Reload the extension in `chrome://extensions` (click the refresh icon) and retry login.
