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
| `npm run powersync:ssl` | Enable Postgres SSL for PowerSync + ngrok (local only) |

## Local development

1. Copy and fill env: `.env.local.example` → `.env.local`
2. `npm run setup:local`
3. `npm run dev`

API URL: `http://127.0.0.1:54321`  
DB port: `54322` (see `supabase/config.toml`)

## PowerSync (local sync testing)

Local Supabase does not enable Postgres SSL by default. PowerSync Cloud needs SSL when connecting via ngrok.

```bash
npm run powersync:ssl
```

Then follow **[docs/powersync-local-development.md](./docs/powersync-local-development.md)** for ngrok and PowerSync connection settings.

Replication SQL: `supabase/snippets/Setup/powersync_publication.sql`

## SQL snippets

Ad-hoc and environment-specific SQL lives in `supabase/snippets/`:

- `Setup/` — one-time environment configuration (vault URLs, PowerSync, etc.)
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
