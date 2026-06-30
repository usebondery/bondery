# supabase-db

Supabase project for Bondery: migrations, local CLI config, setup scripts, and SQL snippets.

## Common commands

Run from this directory (`apps/supabase-db`):

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Supabase if not already running |
| `npm run start` | `supabase start` |
| `npm run stop` | `supabase stop` |
| `npm run reset` | `supabase db reset` |
| `npm run setup:local` | Validate `.env.local` and seed vault secrets |
| `npm run gen-types` | Regenerate TypeScript types in `packages/schemas` |

## Local development

1. Copy and fill env: `.env.local.example` → `.env.local`
2. `npm run setup:local`
3. `npm run dev`

API URL: `http://127.0.0.1:54321`  
DB port: `54322` (see `supabase/config.toml`)

Mobile sync uses the API pull/bootstrap endpoints backed by `sync_change_log` — see [docs/contributing/local-setup.md](../../docs/contributing/local-setup.md).

## SQL snippets

Ad-hoc and environment-specific SQL lives in `supabase/snippets/`:

- `Setup/` — one-time environment configuration (vault URLs, etc.)
- `Testing/` — sample data and test helpers

Snippets are not applied automatically; run them manually in the SQL editor or via `psql`.

## Migrations

New migration:

```bash
npm run migration:new -- my_change_name
```

Apply locally:

```bash
npm run reset    # replay all migrations
```

Push to remote:

```bash
npm run push
```
