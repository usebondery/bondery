# Local development setup

This guide walks you through setting up the full Bondery development environment on your machine. The recommended order follows the dependency chain: database first, then API, then the apps (including mobile pull sync).

## Prerequisites

Make sure the following tools are installed before you begin:

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 20 | LTS recommended |
| [npm](https://www.npmjs.com/) | ≥ 11 | Bundled with Node.js |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | latest | `npm install -g supabase` |
| [Docker](https://www.docker.com/) | latest | Required by Supabase CLI |

For mobile development you also need Expo tooling (installed via root `npm install`) and a native toolchain: **iOS** — Xcode + Simulator or a physical device; **Android** — Android Studio + emulator or USB debugging.

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
npx supabase status --output json
```

For API keys locally, you also need ES256 JWT signing keys configured — see [API server → API keys](#api-keys-long-lived-integration-tokens) (generate with `npx supabase gen signing-key`, not the legacy `JWT_SECRET` field).

### Useful commands

| Command | Description |
|---|---|
| `npm run reset` | Reset database and re-run all migrations and seed |
| `npm run migration:new -- <name>` | Create a new migration file |
| `npm run gen-types` | Regenerate `packages/schemas/src/supabase.types.ts` from the local schema |

### Mobile sync (Postgres changelog)

Mobile offline sync uses **custom pull/bootstrap** endpoints on the API (`GET /api/sync/bootstrap`, `GET /api/sync/pull`) backed by `sync_change_log`. No separate sync service is required beyond Supabase + API.

Migration `20260628130000_electric_sync.sql` creates `sync_mutation_receipts`, `sync_user_sequence`, and sequence RPCs. Migration `20260630100000_sync_change_log.sql` creates the batched changelog. Migration `20260630110000_drop_electric_publication.sql` removes the legacy Electric publication.

For a fresh local DB: `npm run reset` in `apps/supabase-db`, then `npm run gen-types` from the repo root.

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

The example file is at [apps/api/.env.development.example](../../apps/api/.env.development.example). Replace the Supabase `NEXT_PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `PRIVATE_SUPABASE_SECRET_KEY` values with the output from `npx supabase status --output json` (`API_URL`, `PUBLISHABLE_KEY`, and `SECRET_KEY`).

Also set `PRIVATE_API_KEY_PEPPER` and `PRIVATE_SUPABASE_JWT_SIGNING_JWK` — see [API keys (long-lived integration tokens)](#api-keys-long-lived-integration-tokens) below.

For mobile sync, set CORS for Expo web if needed:

```text
EXTRA_ALLOWED_ORIGINS=http://localhost:26634
```

See [Mobile sync (Postgres changelog)](#mobile-sync-postgres-changelog). `EXTRA_ALLOWED_ORIGINS` allows Expo web dev server CORS when testing mobile web.

#### Redis (rate limiting)

`PRIVATE_REDIS_URL` is **optional in local development**. When empty, the API uses an in-memory rate-limit store.

In **production**, `PRIVATE_REDIS_URL` is **required** — serverless deployments need a shared store (e.g. [Upstash](https://upstash.com/)) so rate limits apply across instances. The health probe at `GET /health` reports Redis status when configured.

Example (Upstash):

```text
PRIVATE_REDIS_URL="rediss://:your-token@your-instance.upstash.io:6379"
```

#### API keys (long-lived integration tokens)

These variables are **required** for the API server to start. They power [long-lived API keys](../../api/authentication.md) (Settings → API keys in the webapp). Session login does not use them; they apply when a request sends `Authorization: Bearer bondery_key_…`.

| Variable | Purpose |
|---|---|
| `PRIVATE_API_KEY_PEPPER` | Server secret mixed into API key hashes before storage. Use a random value **at least 32 characters** (e.g. `openssl rand -hex 32`). Not the key itself. |
| `PRIVATE_SUPABASE_JWT_SIGNING_JWK` | ES256 **private** JWK (full JSON, one line). Used internally to mint short-lived user JWTs after an API key is validated so Postgres RLS still applies. Never exposed to clients. |

**Do not confuse** `PRIVATE_SUPABASE_JWT_SIGNING_JWK` with `PRIVATE_SUPABASE_SECRET_KEY` (`sb_secret_…`). The secret key bypasses RLS; the signing JWK only lets the API act as a specific user for that request.

##### 1. Generate an ES256 signing key

From `apps/supabase-db`:

```bash
npx supabase gen signing-key
```

Copy the JSON output. It includes a private field `d` — treat it as a secret.

The CLI prints a **single JWK object**. Do not save that output verbatim as `signing_keys.json` (see step 2).

##### 2. Enable JWT signing keys locally

Save the key to a file that is already gitignored: `apps/supabase-db/supabase/signing_keys.json`.

**Important — file format:** `signing_keys_path` expects a **JSON array** of JWK objects (`[{ … }]`), not a single object. If you save the raw CLI output (one `{ … }` object), Supabase will fail on start or `db reset` with:

```text
failed to decode signing keys: json: cannot unmarshal object into Go value of type []config.JWK
```

Wrap the generated key in square brackets:

```json
[
  {
    "kty": "EC",
    "kid": "<kid>",
    "use": "sig",
    "key_ops": ["sign", "verify"],
    "alg": "ES256",
    "ext": true,
    "crv": "P-256",
    "d": "<private-d>",
    "x": "<public-x>",
    "y": "<public-y>"
  }
]
```

Uncomment `signing_keys_path` in [apps/supabase-db/supabase/config.toml](../../apps/supabase-db/supabase/config.toml):

```toml
[auth]
signing_keys_path = "./signing_keys.json"
```

Restart local Supabase so Auth loads the key:

```bash
cd apps/supabase-db
npx supabase stop
npm run dev
```

Without this step, the API can mint JWTs but **local Auth will reject them** — API key requests return `401 Invalid API key` even for keys you just created.

##### 3. Set API env vars

In `apps/api/.env.development.local`:

```text
# Random secret, at least 32 characters — run: openssl rand -hex 32
PRIVATE_API_KEY_PEPPER=<your-pepper>

# Same private JWK as signing_keys.json — minified to one line (single object, not the array)
PRIVATE_SUPABASE_JWT_SIGNING_JWK={"kty":"EC","kid":"<kid>","use":"sig","alg":"ES256","crv":"P-256","d":"<d>","x":"<x>","y":"<y>"}
```

**Two shapes, same key:**

| Location | JSON shape |
|---|---|
| `supabase/signing_keys.json` | **Array:** `[{ … }]` |
| `PRIVATE_SUPABASE_JWT_SIGNING_JWK` | **Single object:** `{ … }` (first element of the array) |

Copy the first object from `signing_keys.json` and minify it to a single line for the env value.

Keep `PRIVATE_API_KEY_PEPPER` stable. If you change it after creating keys, existing keys stop working — create new keys after rotating the pepper.

Restart the API after changing either env var (`npm run dev` in `apps/api`).

##### 4. Verify

1. Start the API: `npm run dev` in `apps/api` (fails fast at startup if the JWK JSON is invalid).
2. Sign in to the webapp → **Settings** → **API keys** → create a key.
3. Call an integration route:

```bash
curl -H "Authorization: Bearer bondery_key_<keyId>_<secret>" \
  http://localhost:26631/api/contacts
```

You should get `200` with your contacts. A deleted or wrong key returns `401`.

##### Troubleshooting `401 Invalid API key`

The API returns the same message for two different failures. Check API logs while reproducing the request.

| Log / symptom | Likely cause | Fix |
|---|---|---|
| No extra log; key was just created | Hash mismatch — `PRIVATE_API_KEY_PEPPER` changed since the key was created, or API was not restarted after env edits | Keep pepper stable, restart API, create a **new** key |
| `API key hash valid but session could not be established` | JWT signing mismatch — `PRIVATE_SUPABASE_JWT_SIGNING_JWK` does not match `signing_keys.json`, or local Auth does not trust the key | Confirm `kid` in env JWK appears in `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`; restart Supabase after editing `signing_keys.json` |
| `No suitable key or wrong key type` (often `PGRST301`) | API key hash passed, but minted JWT `kid` does not match Supabase JWKS — PostgREST cannot verify the token | Re-copy the **first object** from `apps/supabase-db/supabase/signing_keys.json` into `PRIVATE_SUPABASE_JWT_SIGNING_JWK` (one line). JWKS `kid` and `x` must match. Restart API after env change. |
| API fails to start with JWKS kid message | Same mismatch caught at startup | Update env JWK from current `signing_keys.json`; do not use an old `supabase gen signing-key` output if you regenerated the file |
| `getUser error` with issuer complaint | `NEXT_PUBLIC_SUPABASE_URL` uses `localhost` but local Auth issues tokens for `127.0.0.1` | Set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` in `apps/api/.env.development.local` (the API normalizes this for minted JWTs, but matching the example avoids surprises) |
| After `db reset` | Stale Supabase keys in `.env` | Re-copy `API_URL`, `PUBLISHABLE_KEY`, and `SECRET_KEY` from `npx supabase status --output json` into **both** `apps/api` and `apps/webapp` env files, restart services |

Diagnostic script (from `apps/api`, uses `.api-key-test.local` from `scripts/bootstrap-local-api-key.ts` or pass a key as the first argument):

```bash
tsx --env-file=.env.development.local scripts/diagnose-api-key.ts
```

##### Hosted (production / staging)

Use the **same private JWK** in your deployment secrets, and **import** that key in the Supabase dashboard under **JWT Signing Keys** (standby → rotate when ready). Local `signing_keys.json` is only for the Docker stack on your machine.

Do not commit `signing_keys.json`, the JWK env value, or `PRIVATE_API_KEY_PEPPER` to git.

### Start

```bash
cd apps/api
npm run dev
```

The API server starts on **port 26631** with hot reload enabled.

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

The webapp starts on **port 26632**. Open [http://localhost:26632](http://localhost:26632) in your browser.

---

## 5. Marketing website (`apps/website`)

The website has no env example file — no variables are needed for local development beyond the defaults already in `next.config.ts`.

### Start

```bash
cd apps/website
npm run dev
```

The website starts on **port 26630**. Open [http://localhost:26630](http://localhost:26630) in your browser.

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

## 7. Mobile application (`apps/mobile`)

Run the mobile app against your local Supabase and API stack, including offline sync. Requires steps 2 (Supabase) and 3 (API) first.

### Environment variables

Copy the example file:

**macOS / Linux:**
```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
```

The example is at [apps/mobile/.env.example](../../apps/mobile/.env.example). `npm run dev` runs `check-env` and reads `.env.local` before starting Metro.

#### Required variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL **without** `/api` suffix (e.g. `http://127.0.0.1:26631`) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (local: `http://127.0.0.1:54321`) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key from `npx supabase status` |

#### Optional variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_WEBSITE_URL` | Legal links on the login screen (default `https://usebondery.com`) |
| `METRO_MAX_WORKERS` | Cap Metro workers if you hit `EMFILE` (try `4`, then `2`) |

#### Example — emulator / simulator

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:26631
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
EXPO_PUBLIC_WEBSITE_URL=http://localhost:26630
```

#### Example — physical device on the same Wi‑Fi

Replace `127.0.0.1` with your machine's LAN IP (e.g. `192.168.1.42`). The phone cannot reach your laptop's loopback interface.

```text
EXPO_PUBLIC_API_URL=http://192.168.1.42:26631
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.42:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

Also ensure Supabase and the API are reachable on the LAN and your firewall allows inbound connections on ports `26631` and `54321`.

#### Android emulator note

On Android emulators, `127.0.0.1` and `localhost` in env vars are **automatically rewritten** to `10.0.2.2` (the host loopback from the emulator). You can keep `127.0.0.1` in `.env.local`.

iOS Simulator can use `127.0.0.1` directly. Physical iOS devices need the LAN IP like Android hardware.

### Start

**Option A — sync stack from repo root** (Supabase must already be running):

```bash
npm run dev:sync
```

**Option B — mobile only** (with Supabase and API already running):

```bash
cd apps/mobile
npm run dev
```

Then press `i` for iOS Simulator, `a` for Android emulator, or scan the QR code with Expo Go / a dev client.

#### Native dev builds

For SQLite sync and background tasks, use a development build instead of Expo Go:

```bash
cd apps/mobile
npm run dev:prebuild    # regenerates android/ and ios/ — only when native deps change
npm run android:dev     # USB device or emulator
npm run ios             # iOS Simulator or device
```

### Verify sync

1. Sign in with GitHub or LinkedIn (same providers as the webapp).
2. Wait for the initial sync banner to clear — contacts should match your account.
3. Toggle airplane mode, edit a contact, then reconnect — changes should drain from the outbox and appear on web.

If sync requests return **426**, protocol or SQLite schema versions are mismatched — rebuild the app after pulling API/mobile changes.

If bootstrap or pull return **401**, confirm the mobile session token and API `PUBLIC_SUPABASE_*` keys match your local Supabase instance.

### Mobile useful commands

| Command | Description |
|---|---|
| `npm run dev --workspace=mobile` | Start Metro from repo root |
| `npm run check-env --workspace=mobile` | Validate required env vars |
| `npm run check-sync-patterns --workspace=mobile` | Lint tier-1 data access patterns |
| `npm run check-types --workspace=mobile` | TypeScript check |
| `adb pair` / `adb connect` | Pair wireless Android debugging (`android:pair` script) |

### Mobile troubleshooting

| Issue | Fix |
|---|---|
| `Missing EXPO_PUBLIC_*` on start | Create `apps/mobile/.env.local` from `.env.example` |
| Network request failed on device | Use LAN IP, not `127.0.0.1`; check firewall |
| Empty contacts after login | API not running, or bootstrap failed — check API logs and mobile sync headers |
| OAuth redirect fails | Supabase OAuth redirect URLs must include the Expo/dev client scheme |
| Metro `EMFILE` | Set `METRO_MAX_WORKERS=4` in `.env.local` |

See also [Sync architecture (mobile)](sync-architecture.md) and [apps/mobile/README.md](../../apps/mobile/README.md).

---

## Running everything at once

> **Before using these commands**, complete environment setup for each app in steps 2–7 above.

From the repo root:

```bash
# Start supabase-db + api + webapp
npm run dev:core

# Start supabase-db + api + webapp + website + chrome-extension
npm run dev:extension

# Start api + mobile (Supabase must be running separately)
npm run dev:sync

# Start only supabase-db
npm run dev:supabase
```

These scripts are defined in the root `package.json` and orchestrated by Turborepo.

### Production builds

From the **repo root**, use Turborepo to build apps (caching, correct workspace context, same as CI/Vercel):

```bash
npx turbo build --filter=api
npx turbo build --filter=webapp
npx turbo build --filter=website
npx turbo build --filter=chrome-extension

# Everything that defines a build script
npx turbo build
```

Shortcuts in root `package.json`: `npm run build` (all apps), `npm run build:api`, `build:webapp`, `build:website`.

`turbo build` runs `^build` first, so workspace packages compile to `packages/*/dist` automatically. Apps consume compiled `dist/` via `package.json` exports — no `transpilePackages` or src aliases required.

### Local dev watch

```bash
npm run dev              # turbo watch dev — package tsc --watch + app dev servers
npm run dev:core         # webapp + api + React Email preview
```

Cold start builds packages once (`dev` → `^build`); edits under `packages/*/src` rebuild `dist/` via each package's `dev` script (`tsc --watch`).

---

## Quick reference

Port registry: [architecture.md](architecture.md#apps) (`npm run check-dev-ports` in CI).

| App | Source | Dev port | Start command (from app folder) |
|---|---|---|---|
| `supabase-db` | [`apps/supabase-db`](https://github.com/usebondery/bondery/tree/main/apps/supabase-db) | — (API `54321`, Studio `54323`) | `npm run dev` |
| `api` | [`apps/api`](https://github.com/usebondery/bondery/tree/main/apps/api) | 26631 | `npm run dev` |
| `webapp` | [`apps/webapp`](https://github.com/usebondery/bondery/tree/main/apps/webapp) | 26632 | `npm run dev` |
| `website` | [`apps/website`](https://github.com/usebondery/bondery/tree/main/apps/website) | 26630 | `npm run dev` |
| `mobile` | [`apps/mobile`](https://github.com/usebondery/bondery/tree/main/apps/mobile) | 26634 (Expo Metro) | `npm run dev` |
| `chrome-extension` | [`apps/chrome-extension`](https://github.com/usebondery/bondery/tree/main/apps/chrome-extension) | 26633 (WXT HMR) | `npx wxt` |
| `@bondery/emails` preview | [`packages/emails`](https://github.com/usebondery/bondery/tree/main/packages/emails) | 26639 | `npm run preview` |
