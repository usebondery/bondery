# Local development setup

This guide walks you through setting up the full Bondery development environment on your machine. The recommended order follows the dependency chain: database first, then API, then the apps.

## Prerequisites

Make sure the following tools are installed before you begin:

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 20 | LTS recommended |
| [npm](https://www.npmjs.com/) | ≥ 11 | Bundled with Node.js |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | latest | `npm install -g supabase` |
| [Docker](https://www.docker.com/) | latest | Required by Supabase CLI for local development |

## 1. Clone and install

```bash
git clone https://github.com/usebondery/bondery.git
cd bondery
npm install
```

This installs dependencies for all apps and packages in the monorepo in a single pass.

---

## 2. Supabase database (`apps/supabase-db`)

The local Supabase instance is the foundation everything else connects to. Start it before running any other app.

### Environment variables

Copy the example file and fill in your GitHub and LinkedIn OAuth credentials. These are required for social login to work:

**macOS / Linux:**
```bash
cp apps/supabase-db/.env.local.example apps/supabase-db/.env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item apps/supabase-db/.env.local.example apps/supabase-db/.env.local
```

The example file is at [apps/supabase-db/.env.local.example](../../apps/supabase-db/.env.local.example). Fill in `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`, `SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID`, and `SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET` with credentials from your GitHub and LinkedIn OAuth apps.

> **No OAuth credentials yet?** The app will still start and run — email/password login will work. Social login buttons will fail until the provider credentials are filled in.

### Start

```bash
cd apps/supabase-db
npm run dev
# or: npx supabase start
```

This starts a local Supabase stack via Docker (PostgreSQL, GoTrue auth, Storage, etc.) and applies all migrations automatically.

Once running, note the output values — you will need them for the other apps:

```
API URL:      http://127.0.0.1:54321
anon key:     <SUPABASE_PUBLISHABLE_KEY>
service_role: <SUPABASE_SECRET_KEY>
```

You can also retrieve these at any time with:

```bash
npx supabase status
```

### Useful commands

| Command | Description |
|---|---|
| `npm run reset` | Reset database and re-run all migrations and seed |
| `npm run migration:new -- <name>` | Create a new migration file |
| `npm run gen-types` | Regenerate `packages/types/src/supabase.types.ts` from the local schema |

---

## 3. API server (`apps/api`)

### Environment variables

Copy the example file and fill in your Supabase keys from step 2:

**macOS / Linux:**
```bash
cp apps/api/.env.development.example apps/api/.env.development.local
```

**Windows (PowerShell):**
```powershell
Copy-Item apps/api/.env.development.example apps/api/.env.development.local
```

The example file is at [apps/api/.env.development.example](../../apps/api/.env.development.example). Replace the Supabase `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `PRIVATE_SUPABASE_SECRET_KEY` values with the output from `npx supabase status`.

### Start

```bash
cd apps/api
npm run dev
```

The API server starts on **port 3001** with hot reload enabled.

---

## 4. Web application (`apps/webapp`)

### Environment variables

Copy the example file and fill in your Supabase keys from step 2:

**macOS / Linux:**
```bash
cp apps/webapp/.env.development.example apps/webapp/.env.development.local
```

**Windows (PowerShell):**
```powershell
Copy-Item apps/webapp/.env.development.example apps/webapp/.env.development.local
```

The example file is at [apps/webapp/.env.development.example](../../apps/webapp/.env.development.example). Replace `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the values from `npx supabase status`.

### Start

```bash
cd apps/webapp
npm run dev
```

The webapp starts on **port 3002**. Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## 5. Marketing website (`apps/website`)

The website has no env example file — no variables are needed for local development beyond the defaults already in `next.config.ts`.

### Start

```bash
cd apps/website
npm run dev
```

The website starts on **port 3000**. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Chrome extension (`apps/chrome-extension`)

### Environment variables

Copy the example file:

**macOS / Linux:**
```bash
cp apps/chrome-extension/.env.development.example apps/chrome-extension/.env.development.local
```

**Windows (PowerShell):**
```powershell
Copy-Item apps/chrome-extension/.env.development.example apps/chrome-extension/.env.development.local
```

The example file is at [apps/chrome-extension/.env.development.example](../../apps/chrome-extension/.env.development.example). You will need to fill in `WXT_SUPABASE_OAUTH_CLIENT_ID` — see below.

#### Getting the OAuth client ID

The local Supabase instance runs an OAuth server (`[auth.oauth_server]` in `config.toml`) that the extension uses to authenticate users. An OAuth client must be registered before the extension can log in.

First, check if a client already exists (e.g. created by a previous developer or via seed):

```powershell
$base = 'http://127.0.0.1:54321'
$secret = '<service_role key from npx supabase status>'
$headers = @{ Authorization = "Bearer $secret"; apikey = $secret }
Invoke-RestMethod -Method GET -Uri "$base/auth/v1/admin/oauth/clients" -Headers $headers | ConvertTo-Json -Depth 8
```

If the list is empty, register a new public client. The `token_endpoint_auth_method='none'` flag is required — omitting it creates a confidential client that rejects PKCE token exchanges with `invalid_credentials`:

```powershell
$body = @{
  redirect_uris              = @('https://<your-extension-id>.chromiumapp.org/')
  token_endpoint_auth_method = 'none'
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$base/auth/v1/admin/oauth/clients" -Headers ($headers + @{'Content-Type'='application/json'}) -Body $body | ConvertTo-Json -Depth 8
```

Copy the returned `client_id` into `WXT_SUPABASE_OAUTH_CLIENT_ID` in your `.env.development.local`.

### Start

```bash
cd apps/chrome-extension
npx wxt prepare   # only needed once after install
npx wxt            # or: npm run dev
```

Open `chrome://extensions` in Chrome, enable **Developer mode**, click **Load unpacked**, and select the generated `dist/chrome-mv3-dev` folder.

> **New extension ID?** Every developer machine gets a unique Chrome extension ID, which changes the OAuth redirect URI. See the [Chrome Extension README](../../apps/chrome-extension/README.md) for how to update the OAuth client's allowed redirect URIs in your local Supabase instance.

---

## Running everything at once

> **Before using these commands**, make sure you have completed the environment variable setup for each app in steps 2–6 above. The apps will fail to start with cryptic errors if the `.env.development.local` files are missing.

From the root of the repository you can start all apps simultaneously using Turborepo:

```bash
# Start supabase-db + api + webapp
npm run dev:core

# Start supabase-db + api + webapp + website + chrome-extension
npm run dev:extension

# Start only supabase-db
npm run dev:supabase
```

These scripts are defined in the root `package.json` and orchestrated by Turborepo, which also handles caching and parallel execution.

---

## Quick reference

| App | Dev port | Start command (from app folder) |
|---|---|---|
| `supabase-db` | — | `npm run dev` |
| `api` | 3001 | `npm run dev` |
| `webapp` | 3002 | `npm run dev` |
| `website` | 3000 | `npm run dev` |
| `chrome-extension` | — | `npx wxt` |
