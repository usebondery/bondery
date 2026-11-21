#!/bin/sh
# Lets Traefik reach this stack's API and storage gateway over verified HTTPS
# (docs/deploy/configuration.mdx#internal-api-tls, docs/adr/0031-internal-api-tls.mdx).
#
# Traefik terminates the public HTTPS and forwards each request to a container. To forward over
# HTTPS and check the container's certificate, it needs a serversTransport that holds the
# private CA. Docker labels can only reference a serversTransport, so this one-shot job writes
# them into the folder that Traefik's file provider watches: one file per service,
# <prefix>-<service>-transport.yml, with the CA inline. It reads nothing else in that folder.
#
# The files go into the folder itself, not a subfolder: Traefik reads subfolders but only
# watches the top folder, so a file in a subfolder would not be picked up on the first deploy.
#
# Usage: publish-transports.sh [folder] [service=ca-file ...]
#   Defaults: /traefik-dynamic api=/bondery-api/client/ca.crt storage=/bondery-storage/client/ca.crt
set -eu

PREFIX="${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}"
DYNAMIC_DIR="${1:-/traefik-dynamic}"
if [ "$#" -gt 0 ]; then
  shift
fi
if [ "$#" -eq 0 ]; then
  set -- api=/bondery-api/client/ca.crt storage=/bondery-storage/client/ca.crt
fi

fail() {
  echo "traefik-transport: $1" >&2
  exit 1
}

case "$PREFIX" in
  '' | -* | *[!a-z0-9-]*)
    fail "BONDERY_INFRA_TRAEFIK_PREFIX must be lowercase letters, digits, and dashes (got '$PREFIX')"
    ;;
esac
if [ ! -d "$DYNAMIC_DIR" ]; then
  fail "$DYNAMIC_DIR does not exist. Mount Traefik's dynamic folder (BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR, default /etc/dokploy/traefik/dynamic); on a host without Traefik, use docker-compose.override.yml.example."
fi

publish() { # service ca-file
  service=$1
  ca_file=$2
  case "$service" in
    api | storage) ;;
    *) fail "unknown service '$service' (expected api or storage)" ;;
  esac
  if ! grep -q -- "-----BEGIN CERTIFICATE-----" "$ca_file" 2>/dev/null; then
    fail "$ca_file has no certificate. The stack-secrets job creates it."
  fi

  name="$PREFIX-$service"
  target="$DYNAMIC_DIR/$name-transport.yml"
  # Traefik skips files with an unknown extension, so it never reads a half-written file.
  staging="$DYNAMIC_DIR/.$name-transport.tmp"
  {
    echo "# Written by the Bondery stack \"$PREFIX\" (traefik-transport job) on every deploy. Do not edit."
    echo "# Traefik forwards to $name over HTTPS and verifies its certificate against this CA."
    echo "http:"
    echo "  serversTransports:"
    echo "    $name:"
    echo "      serverName: $name"
    echo "      rootCAs:"
    echo "        - |"
    sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' "$ca_file" | sed 's/^/          /'
  } > "$staging"

  if [ -f "$target" ] && cmp -s "$staging" "$target"; then
    rm -f "$staging"
    echo "traefik-transport: $target is up to date"
    return
  fi
  chmod 0644 "$staging"
  mv -f "$staging" "$target"
  echo "traefik-transport: wrote $target"
}

for pair in "$@"; do
  publish "${pair%%=*}" "${pair#*=}"
done
