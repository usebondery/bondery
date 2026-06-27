# PowerSync local development (Supabase + ngrok)

Connect [PowerSync Cloud](https://docs.powersync.com/) to a local Supabase Postgres instance through an ngrok TCP tunnel. This is useful for end-to-end mobile sync testing without deploying Postgres.

Based on [PowerSync's Supabase local development guide](https://docs.powersync.com/integrations/supabase/local-development#self-hosted-supabase-%26-powersync-via-docker).

## Prerequisites

- Docker Desktop running
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works via this package)
- [ngrok](https://ngrok.com/) with a TCP tunnel on your plan
- A PowerSync Cloud project

## Quick start

From `apps/supabase-db`:

```bash
npm run start              # or: npm run dev
npm run powersync:ssl      # enable SSL + export certs/server.cert
```

Then configure replication SQL (once per database), start ngrok, and connect PowerSync (see below).

## Why SSL setup is required

Local Supabase Postgres starts with **SSL disabled** and **no** `server.cert` file. PowerSync Cloud connecting through ngrok expects `verify-ca` SSL. The certificate is not pre-installed — you must generate it inside the `supabase_db_*` container.

If you see:

```text
Could not find the file /etc/postgresql-custom/server.cert in container supabase_db_...
```

Run `npm run powersync:ssl` before copying or uploading the certificate.

## 1. Enable PostgreSQL SSL

```bash
npm run powersync:ssl
```

This script:

1. Finds the local DB container (`supabase_db_<project_id>` — currently `supabase_db_supabase-db`)
2. Generates a self-signed cert in `/etc/postgresql-custom/`
3. Appends SSL settings to `supautils.conf`
4. Restarts the DB container
5. Copies `server.cert` to `certs/server.cert`

Options:

```powershell
./scripts/enable-powersync-ssl.ps1 -Force   # regenerate certs even if SSL is already on
```

Verify manually:

```bash
docker exec supabase_db_supabase-db psql -U postgres -d postgres -c "SHOW ssl;"
# should return: on
```

### Ephemeral container config

SSL certs and `supautils.conf` changes live **inside the Docker container**. They are removed when you run:

- `npm run stop` then `npm run start`
- `npm run reset`

Re-run `npm run powersync:ssl` after any of those commands.

## 2. Configure Postgres replication for PowerSync

Run once in the local database (Supabase Studio SQL editor or `psql`):

```bash
# File: supabase/snippets/Setup/powersync_publication.sql
```

Set a real password on `powersync_role` before connecting PowerSync. The snippet uses a placeholder.

## 3. Expose Postgres with ngrok

Local DB port is **54322** (see `[db] port` in `supabase/config.toml`).

```bash
ngrok tcp 54322
```

Example output:

```text
Forwarding  tcp://4.tcp.us-cal-1.ngrok.io:19263 -> localhost:54322
```

Note the **hostname** (`4.tcp.us-cal-1.ngrok.io`) and **port** (`19263`). Yours will differ.

## 4. Connect PowerSync Cloud

### GUI

1. Add a Postgres source with:
   - **Host**: ngrok hostname only — **no** `tcp://` prefix
   - **Port**: ngrok port
   - **User**: `postgres` (or `powersync_role` if you created it)
   - **Password**: `postgres` (default local Supabase password)
   - **Database**: `postgres`
   - **SSL mode**: `verify-ca`
   - **Certificate**: upload `certs/server.cert`, or use **Download certificate** after a successful test
2. **Test connection** → **Save**

### CLI

See [PowerSync CLI docs](https://docs.powersync.com/self-hosting/cli).

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `server.cert` not found in container | Run `npm run powersync:ssl` — cert is created by the script, not shipped with Supabase |
| Wrong container name | List containers: `docker ps -f name=supabase_db --format "{{.Names}}"` |
| `SHOW ssl` returns `off` | Re-run `npm run powersync:ssl`; check `docker logs supabase_db_supabase-db` |
| PowerSync connection fails | Confirm ngrok is running, host has no `tcp://`, port matches ngrok, SSL is `verify-ca` |
| Config lost after reset | Expected — re-run `npm run powersync:ssl` |
| Certificate download fails in PowerSync UI | SSL must be `on` in Postgres first; test with `npm run powersync:ssl` then retry |

## Files

| Path | Purpose |
|------|---------|
| `scripts/enable-powersync-ssl.ps1` | Idempotent SSL setup script |
| `certs/server.cert` | Exported CA cert for PowerSync (gitignored, generated locally) |
| `supabase/snippets/Setup/powersync_publication.sql` | Replication role + publication SQL |

## References

- [PowerSync — Local development with Supabase](https://docs.powersync.com/integrations/supabase/local-development)
- [PowerSync self-host demo (Supabase)](https://github.com/powersync-ja/self-host-demo/tree/main/demos/supabase)
