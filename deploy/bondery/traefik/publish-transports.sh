#!/bin/sh
# Lets Traefik reach this stack's API and storage gateway over verified HTTPS
# (docs/deploy/configuration.mdx#internal-api-tls, docs/adr/0031-internal-api-tls.mdx).
#
# Traefik terminates the public HTTPS and forwards each request to a container. To forward over
# HTTPS and check the container's certificate, it needs a serversTransport that holds the
# private CA. The storage gateway also requires a client certificate, so the storage transport
# carries one too. Docker labels can only reference a serversTransport, so this one-shot job
# writes them into the folder that Traefik's file provider watches: one file per service,
# <prefix>-<service>-transport.yml, with the CA and the client certificate inline. It reads
# nothing else in that folder.
#
# The files go into the folder itself, not a subfolder: Traefik reads subfolders but only
# watches the top folder, so a file in a subfolder would not be picked up on the first deploy.
#
# The key and certificate are written as data bytes, not file paths: Traefik runs as its own user
# and never mounts the Bondery volumes, so a path would not resolve for it.
#
# Usage: publish-transports.sh [folder] [service=ca-file ...]
#   Defaults: /traefik-dynamic, with api=/bondery-api/client/ca.crt and
#   storage=/bondery-storage/traefik/ca.crt. The storage transport also carries the client
#   certificate and key from /bondery-storage/traefik, which only this job mounts.
set -eu

PREFIX="${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}"
DYNAMIC_DIR="${1:-/traefik-dynamic}"
# The storage transport needs a client certificate next to its CA, because the gateway requires
# one. The CA and the client certificate therefore live in the same directory.
if [ "$#" -gt 0 ]; then
  shift
fi
if [ "$#" -eq 0 ]; then
  set -- api=/bondery-api/client/ca.crt storage=/bondery-storage/traefik/ca.crt
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

# Prints one PEM block of `kind` (CERTIFICATE or PRIVATE KEY) as YAML block scalar body, indented
# for its position in the transport file.
inline_pem() { # file kind indent
  sed -n "/-----BEGIN $2-----/,/-----END $2-----/p" "$1" | sed "s/^/$3/"
}

publish() { # service ca-file
  service=$1
  ca_file=$2
  case "$service" in
    api | storage) ;;
    *) fail "unknown service '$service' (expected api or storage)" ;;
  esac

  # Only the storage gateway requires a client certificate. It sits next to its CA.
  cert_file=""
  key_file=""
  if [ "$service" = "storage" ]; then
    cert_file="$(dirname "$ca_file")/tls.crt"
    key_file="$(dirname "$ca_file")/tls.key"
  fi

  if ! grep -q -- "-----BEGIN CERTIFICATE-----" "$ca_file" 2>/dev/null; then
    fail "$ca_file has no certificate. The stack-secrets job creates it."
  fi
  if [ -n "$cert_file" ]; then
    if ! grep -q -- "-----BEGIN CERTIFICATE-----" "$cert_file" 2>/dev/null; then
      fail "$cert_file has no certificate. The stack-secrets job creates it."
    fi
    if ! grep -q -- "-----BEGIN PRIVATE KEY-----" "$key_file" 2>/dev/null; then
      fail "$key_file has no private key. The stack-secrets job creates it."
    fi
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
    if [ -n "$cert_file" ]; then
      echo "      # The gateway requires a client certificate (mutual TLS)."
      echo "      certificates:"
      echo "        - cert: |"
      inline_pem "$cert_file" CERTIFICATE "            "
      echo "          key: |"
      inline_pem "$key_file" "PRIVATE KEY" "            "
    fi
    echo "      rootCAs:"
    echo "        - |"
    inline_pem "$ca_file" CERTIFICATE "          "
  } > "$staging"

  # The file holds a private key now, so it must not be world-readable.
  chmod 0600 "$staging"

  if [ -f "$target" ] && cmp -s "$staging" "$target"; then
    rm -f "$staging"
    echo "traefik-transport: $target is up to date"
    return
  fi
  mv -f "$staging" "$target"
  echo "traefik-transport: wrote $target"
}

for arg in "$@"; do
  publish "${arg%%=*}" "${arg#*=}"
done
