#!/bin/sh
# Print the CA certificate of the bundled Postgres, for tools that connect over an SSH tunnel.
# See docs/deploy/configuration.mdx#postgres-tls.
#
#   deploy/bondery/scripts/postgres-ca.sh > bondery-postgres-ca.crt
#   psql "host=localhost dbname=bondery user=postgres sslmode=verify-full sslrootcert=bondery-postgres-ca.crt"
#
# Run it on the host that runs the stack, from deploy/bondery. It reads the certificate from the
# api container, which mounts only the public CA certificate (never a private key).
set -eu

cd "$(dirname "$0")/.."
docker compose exec -T api cat /bondery-postgres/client/ca.crt
