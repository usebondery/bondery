#!/bin/sh
# Print the CA certificate of the SeaweedFS S3 gateway's HTTPS listener (port 8443), for a
# reverse proxy that is not Dokploy's Traefik, or for S3 tools (backups).
# See docs/deploy/reverse-proxy.mdx.
#
#   deploy/bondery/scripts/storage-ca.sh > /etc/caddy/bondery-storage-ca.crt
#
# The proxy verifies the gateway as "<BONDERY_INFRA_TRAEFIK_PREFIX>-storage" (default
# bondery-storage). Run it on the host that runs the stack. It reads the certificate from the api
# container, which mounts only the public CA certificate (never a private key).
set -eu

cd "$(dirname "$0")/.."
docker compose exec -T api cat /bondery-storage/client/ca.crt
