---
name: Chrome Extension OAuth Setup
description: Resolve OAuth redirect URI mismatches when running the extension locally. Covers Better Auth client provisioning via provision-oauth-clients.ts.
triggers:
  - "Authorization page could not be loaded … redirect URI exact match"
  - New developer machine gets a different extension ID
related: []
---

# Chrome Extension OAuth Setup (Better Auth)

The extension authenticates against the **API** Better Auth OAuth provider (`/auth/oauth2/*`), not Supabase GoTrue.

## When does this happen?

- A new developer (or new machine) gets a different Chrome extension ID, so the redirect URI no longer matches the provisioned OAuth client.
- `BONDERY_INFRA_CHROME_EXTENSION_ID` in root `.env.local` does not match the unpacked extension ID.

The error looks like:

```text
Authorization page could not be loaded. Verify OAuth client settings:
client_id, redirect URI exact match (https://<extension-id>.chromiumapp.org/), and API reachability.
```

## Step 1 — Find your extension ID

In `chrome://extensions`, copy the ID shown under the Bondery extension.

Your redirect URI will be:

```text
https://<your-extension-id>.chromiumapp.org/
```

## Step 2 — Set env vars

In root `.env.local`:

```env
BONDERY_PUBLIC_OAUTH_CLIENT_ID="<from provision script or team vault>"
BONDERY_INFRA_CHROME_EXTENSION_ID="<your-extension-id>"
```

Run `pnpm run env` to sync into `apps/chrome-extension/.env.development.local`.

## Step 3 — Provision OAuth client

With API env + migrated Postgres:

```bash
cd apps/api
pnpm exec tsx --env-file=.env.development.local scripts/provision-oauth-clients.ts
```

This upserts the public PKCE client with redirect `https://<BONDERY_INFRA_CHROME_EXTENSION_ID>.chromiumapp.org/`.

## Step 4 — Reload extension and sign in

1. Reload the extension in `chrome://extensions`.
2. Open the popup and sign in — browser opens API OAuth authorize URL.
3. Complete login/consent on the API/webapp if prompted.

## Required extension env

```env
BONDERY_PUBLIC_API_URL=https://api.usebondery.test
BONDERY_PUBLIC_WEBAPP_URL=http://localhost:26632
BONDERY_PUBLIC_OAUTH_CLIENT_ID=...
```

OAuth scopes: `openid profile email offline_access api:access`. The RFC 8707 `resource` parameter must equal `BONDERY_PUBLIC_API_URL` (usually `https://api.usebondery.test`; the API serves HTTPS only). Authorize and token HTTP URLs may use `127.0.0.1` so Chrome does not hit IPv6 `::1`. Do not rewrite `resource` to `127.0.0.1` — the authorization server matches that identifier exactly. Provisioning also registers the loopback alias so a mismatched local build still authorizes.

Token exchange is a cross-origin `fetch` from `chrome-extension://<id>` to `127.0.0.1`. The API must reflect that origin in CORS (`BONDERY_INFRA_CHROME_EXTENSION_ID`), and the unpacked manifest must include `http://127.0.0.1:<api-port>/*` in `host_permissions`. WXT adds the loopback alias automatically. After pulling, restart the API and **Reload** the unpacked extension, then sign in again.

A 200 from `POST /auth/oauth2/token` with **Failed to exchange code for tokens** in the popup is this CORS/host-permission mismatch — the browser hid the body.
