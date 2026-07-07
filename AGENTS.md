# AGENTS.md

## Cursor Cloud specific instructions

Bondery is a Turborepo/npm-workspaces monorepo (a personal relationship manager). The
authoritative setup/run guide is [`docs/contributing/local-setup.md`](docs/contributing/local-setup.md)
and the per-app `package.json` scripts. This section only records non-obvious caveats for the
cloud VM. The dependency-refresh update script is just `npm install`.

### Services & ports
| Service | Dir | Port | Start (from repo root unless noted) |
|---|---|---|---|
| Supabase (Docker) | `apps/supabase-db` | 54321 API, 54323 Studio, 54322 DB | see Docker + Supabase below |
| API (Fastify) | `apps/api` | 3001 | `npm run dev -w apps/api` |
| Webapp (Next.js) | `apps/webapp` | 3002 | `npm run dev -w apps/webapp` |
| Website (Next.js) | `apps/website` | 3000 | `npm run dev -w apps/website` |

Dependency chain: Supabase → API → clients. Start them in that order. `mobile` and
`chrome-extension` need native toolchains / OAuth apps and are out of scope in the cloud VM.

### Docker (required by Supabase, not started automatically)
Docker is installed in the VM snapshot and pre-configured for this Firecracker VM
(`storage-driver: fuse-overlayfs`, `containerd-snapshotter: false`, legacy iptables). It is
NOT running at session start. Bring it up once per session:
```
sudo dockerd >/tmp/dockerd.log 2>&1 &   # run in a tmux/background shell
sudo chmod 666 /var/run/docker.sock      # so npx/supabase can use docker without sudo
```
Do not run `supabase`/`npx` under `sudo` — `sudo` drops the node/nvm PATH (`npx: command not found`).

### Supabase (non-obvious gotchas)
- On Linux use `npm run start` (`npx supabase start`) — `apps/supabase-db`'s `npm run dev`
  invokes a missing PowerShell script and will fail.
- The CLI needs env vars from `apps/supabase-db/.env.local` in the shell. Export before starting:
  `cd apps/supabase-db && set -a && . ./.env.local && set +a && npx supabase start`.
- The committed `supabase/config.toml` has `signing_keys_path = "./signing_keys.json"`
  UNCOMMENTED, so `apps/supabase-db/supabase/signing_keys.json` MUST exist (a JSON **array**
  of one ES256 JWK) or start fails with `open supabase/signing_keys.json: no such file`.
  These files are gitignored (present in the snapshot). If missing, regenerate the signing key
  with Node (the `supabase gen signing-key` CLI fails here because the OAuth env vars are empty):
  ```
  node -e 'const c=require("crypto"),{privateKey}=c.generateKeyPairSync("ec",{namedCurve:"P-256"}),j=privateKey.export({format:"jwk"}),k=c.randomUUID();require("fs").writeFileSync("apps/supabase-db/supabase/signing_keys.json",JSON.stringify([{kty:"EC",kid:k,use:"sig",key_ops:["sign","verify"],alg:"ES256",ext:true,crv:"P-256",d:j.d,x:j.x,y:j.y}],null,2))'
  ```
  Then set `PRIVATE_SUPABASE_JWT_SIGNING_JWK` in `apps/api/.env.development.local` to the SAME
  key as a single minified object `{...}` (the first array element). The API verifies the JWK
  against Supabase JWKS at startup and refuses to boot on mismatch. After changing the key,
  `npx supabase stop` then start again so Auth reloads it.
- Get keys anytime: `cd apps/supabase-db && npx supabase status --output json`.

### Env files (gitignored, live in the snapshot)
`apps/api/.env.development.local`, `apps/webapp/.env.development.local`,
`apps/website/.env.development.local`, `apps/supabase-db/.env.local`. Recreate from the
`*.example` files if absent and fill in Supabase `API_URL` / `PUBLISHABLE_KEY` / `SECRET_KEY`.
API required vars include `PRIVATE_API_KEY_PEPPER` (any 32+ char random) and the signing JWK;
the `PRIVATE_EMAIL_*` vars only need to be present (placeholders are fine — no live SMTP needed).
Redis/Anthropic/Polar/Maps/PostHog are optional locally.

### Auth for testing (login is OAuth-only)
The webapp only offers GitHub/LinkedIn OAuth — there is no email/password UI. Without OAuth
credentials, inject a Supabase session to test authenticated flows:
1. Create a user via the admin API (`POST {SUPABASE}/auth/v1/admin/users` with the secret key,
   `email_confirm: true`), then sign in (`POST /auth/v1/token?grant_type=password` with the
   publishable key) to get an `access_token`.
2. For API calls: send `Authorization: Bearer <access_token>` (or a long-lived API key).
3. For the webapp UI: set cookie `sb-127-auth-token` = `base64-` + base64url(JSON.stringify(session))
   on `localhost:3002` (chunk into `.0`,`.1` if the value exceeds 3180 bytes). The storage key is
   `sb-<hostname-first-label>-auth-token`, i.e. `sb-127-auth-token` for `http://127.0.0.1:54321`.

### Lint / type-check / build
- Lint/types/build run via Turbo: `npx turbo lint|check-types|build [--filter=<app>]` (or `npm run lint`).
- `webapp` currently has pre-existing Biome a11y errors in `SocialPopoverButton.tsx` (not a setup issue).
- `mobile#lint` fails with `eslint: not found` (mobile devDeps/toolchain not set up in cloud) — scope lint to `api`, `webapp`, `website` when validating core apps.
- App dev servers consume compiled `packages/*/dist`; Turbo's `dev`/`check-types` build packages first via `^build`.
