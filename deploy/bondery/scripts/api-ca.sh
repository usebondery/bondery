#!/bin/sh
# Print the CA certificate of the API's HTTPS listener (port 26642), for a reverse proxy that is
# not Dokploy's Traefik. See docs/deploy/reverse-proxy.mdx.
#
#   deploy/bondery/scripts/api-ca.sh > /etc/caddy/bondery-api-ca.crt
#
# The proxy verifies the API as "<BONDERY_INFRA_TRAEFIK_PREFIX>-api" (default bondery-api).
# Run it on the host that runs the stack. It reads the certificate from the webapp container,
# which mounts only the public CA certificate (never a private key).
set -eu

cd "$(dirname "$0")/.."
docker compose exec -T webapp cat /bondery-api/client/ca.crt
