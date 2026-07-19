# Local development setup

This guide walks you through setting up the full Bondery development environment on your machine. The recommended order follows the dependency chain: database first, then API, then the apps (including mobile pull sync).

**Environment variables:** edit root `.env.local` once, then sync — see [Environment configuration](environment.md).

```bash
npm install
npm run setup:dev
# edit .env.local (OAuth / optional integrations)
cd apps/supabase-db && npm run dev
npm run env
npm run dev
```

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
npm run setup:dev
```

This installs dependencies for all apps and packages in the monorepo in a single pass, then creates root `.env.local` from the example.

---

## 2. Supabase database (`apps/supabase-db`)

The local Supabase instance is the foundation everything else connects to. Start it before running any other app.

### Environment variables

OAuth client ids/secrets for local Auth live in root `.env.local` (keys `BONDERY_SUPABASE_AUTH_EXTERNAL_*`). After editing, run `npm run env` so `apps/supabase-db/.env.local` is updated. See [Environment configuration](environment.md).

> **No OAuth credentials yet?** The app will still start and run — email/password login will work. Social login buttons will fail until the provider credentials are filled in.

### Start

```bash
cd apps/supabase-db
npm run start
# or: npx supabase start
```

This starts a local Supabase stack via Docker (PostgreSQL, GoTrue auth, Storage, etc.) and applies all migrations automatically.

Then from the repo root:

```bash
npm run env   # pull Supabase keys (if up) → sync apps → check root
```

You can also retrieve status at any time with:

```bash
npx supabase status --output json
```

For API keys locally, you also need ES256 JWT signing keys configured — see [API server → API keys](#api-keys-long-lived-integration-tokens) (generate with `npx supabase gen signing-key`, not the legacy `JWT_SECRET` field). Put `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` in root `.env.local` (compact single-line JSON), then `npm run env`.

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

Prefer root `.env.local` + `npm run env` (see [Environment configuration](environment.md)). That writes `apps/api/.env.development.local`.

Also set `BONDERY_PRIVATE_API_KEY_PEPPER` and `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` in root `.env.local` — see [API keys (long-lived integration tokens)](#api-keys-long-lived-integration-tokens) below.

For mobile sync, set CORS for Expo web if needed:

```text
BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS=http://localhost:26634
```

See [Mobile sync (Postgres changelog)](#mobile-sync-postgres-changelog). `BONDERY_PUBLIC_EXTRA_ALLOWED_ORIGINS` allows Expo web dev server CORS when testing mobile web.

#### Redis

Redis powers **rate limiting**, **mobile sync wake** (pub/sub), and **WebSocket ticket** storage in the API. Local Docker Redis is the **default** for development (same Docker prerequisite as Supabase).

| Mode | `BONDERY_PRIVATE_REDIS_URL` | When to use |
|------|---------------------|-------------|
| **Local Docker (default)** | `redis://127.0.0.1:26636` | Normal local API work — matches production behavior |
| **In-memory** | empty / unset | Quick feature work without starting Redis |

In **production** (Hetzner), `BONDERY_PRIVATE_REDIS_URL` is **required**. The health probe at `GET /health` reports Redis status when configured.

##### Quick start — local Docker Redis

From the repo root (Docker must be running — same as Supabase):

```bash
npm run start -w redis
```

Verify:

```bash
npm run status -w redis
# PING → PONG
docker exec bondery-redis redis-cli ping
```

Wire the API in `apps/api/.env.development.local` (also the default in `.env.development.example`):

```text
BONDERY_PRIVATE_REDIS_URL="redis://127.0.0.1:26636"
```

Port **26636** is `DEV_PORTS.REDIS` / `DEV_REDIS_URL` in [`packages/schemas/src/constants/dev-ports.ts`](../../packages/schemas/src/constants/dev-ports.ts). Stop with `npm run stop -w redis`.

##### In-memory mode (no Redis)

Set `BONDERY_PRIVATE_REDIS_URL=""` (or remove the line). The API uses in-memory rate-limit and sync-wake stores — fine for single-process webapp work when you skip starting Redis.

> **Do not** leave a dead cloud URL (e.g. deleted Upstash) in `.env.development.local`. The API will try to connect on startup and fail with `ENOTFOUND` / `Connection is closed`.

##### Production / self-host

Use the canonical stack in [`deploy/bondery/`](../../deploy/bondery/) (webapp + API + bundled Redis). Default:

```text
BONDERY_PRIVATE_REDIS_URL="redis://redis:6379"
```

External Redis and Dokploy cutover: [docs/deploy/dokploy.md](../deploy/dokploy.md) · [docs/deploy/api-container.md](../deploy/api-container.md).

#### API keys (long-lived integration tokens)

These variables are **required** for the API server to start. They power [long-lived API keys](../../api/authentication.md) (Settings → API keys in the webapp). Session login does not use them; they apply when a request sends `Authorization: Bearer bondery_key_…`.

| Variable | Purpose |
|---|---|
| `BONDERY_PRIVATE_API_KEY_PEPPER` | Server secret mixed into API key hashes before storage. Use a random value **at least 32 characters** (e.g. `openssl rand -hex 32`). Not the key itself. |
| `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` | ES256 **private** JWK (full JSON, one line). Used internally to mint short-lived user JWTs after an API key is validated so Postgres RLS still applies. Never exposed to clients. |

**Do not confuse** `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` with `BONDERY_PRIVATE_SUPABASE_SECRET_KEY` (`sb_secret_…`). The secret key bypasses RLS; the signing JWK only lets the API act as a specific user for that request.

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
npm run start
```

Without this step, the API can mint JWTs but **local Auth will reject them** — API key requests return `401 Invalid API key` even for keys you just created.

##### 3. Set API env vars

In `apps/api/.env.development.local`:

```text
# Random secret, at least 32 characters — run: openssl rand -hex 32
BONDERY_PRIVATE_API_KEY_PEPPER=<your-pepper>

# Same private JWK as signing_keys.json — minified to one line (single object, not the array)
BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK={"kty":"EC","kid":"<kid>","use":"sig","alg":"ES256","crv":"P-256","d":"<d>","x":"<x>","y":"<y>"}
```

**Two shapes, same key:**

| Location | JSON shape |
|---|---|
| `supabase/signing_keys.json` | **Array:** `[{ … }]` |
| `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` | **Single object:** `{ … }` (first element of the array) |

Copy the first object from `signing_keys.json` and minify it to a single line for the env value.

Keep `BONDERY_PRIVATE_API_KEY_PEPPER` stable. If you change it after creating keys, existing keys stop working — create new keys after rotating the pepper.

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
| No extra log; key was just created | Hash mismatch — `BONDERY_PRIVATE_API_KEY_PEPPER` changed since the key was created, or API was not restarted after env edits | Keep pepper stable, restart API, create a **new** key |
| `API key hash valid but session could not be established` | JWT signing mismatch — `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` does not match `signing_keys.json`, or local Auth does not trust the key | Confirm `kid` in env JWK appears in `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`; restart Supabase after editing `signing_keys.json` |
| `No suitable key or wrong key type` (often `PGRST301`) | API key hash passed, but minted JWT `kid` does not match Supabase JWKS — PostgREST cannot verify the token | Re-copy the **first object** from `apps/supabase-db/supabase/signing_keys.json` into `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` (one line). JWKS `kid` and `x` must match. Restart API after env change. |
| API fails to start with JWKS kid message | Same mismatch caught at startup | Update env JWK from current `signing_keys.json`; do not use an old `supabase gen signing-key` output if you regenerated the file |
| `getUser error` with issuer complaint | `BONDERY_PUBLIC_SUPABASE_URL` uses `localhost` but local Auth issues tokens for `127.0.0.1` | Set `BONDERY_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` in `apps/api/.env.development.local` (the API normalizes this for minted JWTs, but matching the example avoids surprises) |
| After `db reset` | Stale Supabase keys in `.env` | Re-copy `API_URL`, `PUBLISHABLE_KEY`, and `SECRET_KEY` from `npx supabase status --output json` into **both** `apps/api` and `apps/webapp` env files, restart services |

Diagnostic script (from `apps/api`, uses `.api-key-test.local` from `scripts/bootstrap-local-api-key.ts` or pass a key as the first argument):

```bash
tsx --env-file=.env.development.local scripts/diagnose-api-key.ts
```

##### Hosted (production / staging)

Use the **same private JWK** in your deployment secrets, and **import** that key in the Supabase dashboard under **JWT Signing Keys** (standby → rotate when ready). Local `signing_keys.json` is only for the Docker stack on your machine.

Do not commit `signing_keys.json`, the JWK env value, or `BONDERY_PRIVATE_API_KEY_PEPPER` to git.

### Start

```bash
cd apps/api
npm run dev
```

The API server starts on **port 26631** with hot reload enabled.

---

## 4. Web application (`apps/webapp`)

### Environment variables

Filled by `npm run env` into `apps/webapp/.env.development.local` — see [Environment configuration](environment.md).

### Start

```bash
cd apps/webapp
npm run dev
```

The webapp starts on **port 26632**. Open [http://localhost:26632](http://localhost:26632) in your browser.

---

## 5. Marketing website (`apps/website`)

Uses `BONDERY_PUBLIC_WEBAPP_URL` / `BONDERY_PUBLIC_WEBSITE_URL` from env sync (client-bundled via `next.config.ts`).

### Start

```bash
cd apps/website
npm run dev
```

The website starts on **port 26630**. Open [http://localhost:26630](http://localhost:26630) in your browser.

---

## 6. Chrome extension (`apps/chrome-extension`)

### Environment variables

Filled by `npm run env`. Set `BONDERY_PUBLIC_SUPABASE_OAUTH_CLIENT_ID` in root `.env.local` — see below and [Environment configuration](environment.md).

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

Copy the returned `client_id` into `BONDERY_PUBLIC_SUPABASE_OAUTH_CLIENT_ID` in your `.env.development.local`.

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

Filled by `npm run env` into `apps/mobile/.env.local` (`BONDERY_PUBLIC_*`). See [Environment configuration](environment.md). Expo loads those into `app.config.ts` `extra`.

#### Physical device on the same Wi‑Fi

In root `.env.local`, replace `127.0.0.1` / `localhost` with your machine's LAN IP (e.g. `192.168.1.42`) for API and Supabase URLs, then `npm run env`. The phone cannot reach your laptop's loopback interface.

Also ensure Supabase and the API are reachable on the LAN and your firewall allows inbound connections on ports `26631` and `54321`.

#### Android emulator note

On Android emulators, `127.0.0.1` and `localhost` in env vars are **automatically rewritten** to `10.0.2.2` (the host loopback from the emulator). You can keep `127.0.0.1` in `.env.local`.

iOS Simulator can use `127.0.0.1` directly. Physical iOS devices need the LAN IP like Android hardware.

### Start

**Option A — API + mobile from repo root** (Supabase must already be running):

```bash
npm run mobile
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

If bootstrap or pull return **401**, confirm the mobile session token and API `BONDERY_PUBLIC_SUPABASE_*` keys match your local Supabase instance.

### Mobile useful commands

| Command | Description |
|---|---|
| `npm run mobile` | Start API + Metro from repo root |
| `npm run check-env --workspace=mobile` | Validate required env vars |
| `npm run check-sync-patterns --workspace=mobile` | Lint tier-1 data access patterns |
| `npm run check-types --workspace=mobile` | TypeScript check |
| `adb pair` / `adb connect` | Pair wireless Android debugging (`android:pair` script) |

### Mobile troubleshooting

| Issue | Fix |
|---|---|
| `Missing BONDERY_PUBLIC_*` on start | Run `npm run env` from the repo root (or `npm run setup:dev`) |
| Network request failed on device | Use LAN IP, not `127.0.0.1`; check firewall |
| Empty contacts after login | API not running, or bootstrap failed — check API logs and mobile sync headers |
| OAuth redirect fails | Supabase OAuth redirect URLs must include the Expo/dev client scheme |
| Metro `EMFILE` | Set `METRO_MAX_WORKERS=4` in `.env.local` |

See also [Sync architecture (mobile)](sync-architecture.md) and [apps/mobile/README.md](../../apps/mobile/README.md).

---

## Running everything at once

> **Before using these commands**, complete environment setup for each app in steps 2–7 above.

From the repo root, start infrastructure first (separate workspaces — run sequentially or in separate terminals):

```bash
# 1. Infrastructure
npm run start -w supabase-db
npm run start -w redis

# 2. App dev
npm run dev:webapp-api

# Or: api + webapp + website + chrome-extension
npm run dev:extension

# Or: api + mobile
npm run mobile
```

These scripts are defined in the root `package.json` and orchestrated by Turborepo (`turbo watch`).

### Production builds

From the **repo root**, use Turborepo to build apps (caching, correct workspace context, same as CI):

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
npm run dev                    # turbo watch dev — all apps with a dev script
npm run dev:webapp-api         # webapp + api (usual local stack)
npm run dev:emails             # React Email preview only (port 26639)
npm run dev:webapp-api-emails  # webapp + api + React Email preview
npm run compile:packages       # one-shot package compile without starting dev servers
```

`dev:webapp-api` cold-starts packages via `compile` (`tsc` to `dist/`, no `rimraf`), then runs app dev servers with package `tsc --watch` companions (`with` in `apps/webapp/turbo.json` and `apps/api/turbo.json`). Production `build` + `^build` is unchanged.

Lint the whole repo from the root: `npm run lint` (Biome format, write fixes). CI runs `biome ci .` read-only.

---

## Quick reference

Port registry: [architecture.md](architecture.md#apps) (`npm run check-dev-ports` in CI).

| App | Source | Dev port | Start command (from app folder) |
|---|---|---|---|
| `supabase-db` | [`apps/supabase-db`](https://github.com/usebondery/bondery/tree/main/apps/supabase-db) | — (API `54321`, Studio `54323`) | `npm run start` |
| `api` | [`apps/api`](https://github.com/usebondery/bondery/tree/main/apps/api) | 26631 | `npm run dev` |
| `webapp` | [`apps/webapp`](https://github.com/usebondery/bondery/tree/main/apps/webapp) | 26632 | `npm run dev` |
| `website` | [`apps/website`](https://github.com/usebondery/bondery/tree/main/apps/website) | 26630 | `npm run dev` |
| `mobile` | [`apps/mobile`](https://github.com/usebondery/bondery/tree/main/apps/mobile) | 26634 (Expo Metro) | `npm run dev` |
| `chrome-extension` | [`apps/chrome-extension`](https://github.com/usebondery/bondery/tree/main/apps/chrome-extension) | 26633 (WXT HMR) | `npx wxt` |
| `@bondery/emails` preview | [`packages/emails`](https://github.com/usebondery/bondery/tree/main/packages/emails) | 26639 | `npm run preview` |
