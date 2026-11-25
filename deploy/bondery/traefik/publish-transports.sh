#!/bin/sh
# Lets Traefik reach this stack's API and storage gateway over verified HTTPS
# (docs/deploy/configuration.mdx#internal-api-tls, docs/adr/0031-internal-api-tls.mdx).
#
# Traefik terminates the public HTTPS and forwards each request to a container. To forward over
# HTTPS and check the container's certificate, it needs a serversTransport that holds the
# private CA. The storage gateway also requires a client certificate, so the storage transport
# carries one too. Docker labels can only reference a serversTransport, so this one-shot job
# writes them into the folder that Traefik's file provider watches: one file per service,
# <prefix>-<service>-transport.yml.
#
# The files go into the folder itself, not a subfolder: Traefik reads subfolders but only
# watches the top folder, so a file in a subfolder would not be picked up on the first deploy.
#
# Certificates: the CA is inlined, the client pair is referenced by path.
#
# A `serversTransport` accepts `rootCAs` inline, and a CA never holds a private key, so keeping it
# in the file means one fewer path Traefik must resolve. Traefik fails SILENTLY when a `rootCAs`
# path is unreadable: no error line, and the transport simply disappears from the loaded config,
# so every route using it answers 500. Inline avoids that class of failure.
#
# The client certificate and key are paths, because a `serversTransport` has no inline `cert`
# field: inlining the pair makes Traefik reject the whole file with "field not found, node: cert".
# The job copies those two into the dynamic folder, which Traefik does mount, and points at them.
#
# Usage: publish-transports.sh [folder] [service=ca-file ...]
#   Defaults: /traefik-dynamic, with api=/bondery-api/client/ca.crt and
#   storage=/bondery-storage/traefik/ca.crt. The storage transport also carries the client
#   certificate and key from /bondery-storage/traefik, which only this job mounts.
set -eu

PREFIX="${BONDERY_INFRA_TRAEFIK_PREFIX:-bondery}"
DYNAMIC_DIR="${1:-/traefik-dynamic}"
# Where TRAEFIK sees the same folder. The job mounts it at /traefik-dynamic, but Traefik mounts the
# host folder at /etc/dokploy/traefik/dynamic, so a path written from the job's point of view
# points at nothing inside Traefik's container. Every certFile/keyFile below must use this prefix.
TRAEFIK_VIEW_DIR="${BONDERY_INFRA_TRAEFIK_VIEW_DIR:-/etc/dokploy/traefik/dynamic}"
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

# Copies one PEM block of `kind` (CERTIFICATE or PRIVATE KEY) out of `file` into the dynamic
# folder as `target`, so Traefik can reference it by path. Only the block is written: Traefik
# rejects a file that holds extra bytes around the PEM. An unchanged target is left alone, so a
# no-op deploy does not make Traefik reload.
copy_pem() { # file kind target
  tmp="$3.tmp"
  sed -n "/-----BEGIN $2-----/,/-----END $2-----/p" "$1" > "$tmp"
  if [ ! -s "$tmp" ]; then
    rm -f "$tmp"
    fail "could not read a $2 block from $1. The stack-secrets job creates it."
  fi
  if [ -f "$3" ] && cmp -s "$tmp" "$3"; then
    rm -f "$tmp"
    return
  fi
  mv -f "$tmp" "$3"
}

# Prints one PEM block of `kind` (CERTIFICATE) as a YAML block scalar body, indented for rootCAs.
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
  # The client pair must exist before the transport names it, so a missing file stops the deploy
  # instead of publishing a transport Traefik would quietly drop.
  if [ -n "$cert_file" ]; then
    copy_pem "$cert_file" CERTIFICATE "$DYNAMIC_DIR/$name-client.crt"
    copy_pem "$key_file" "PRIVATE KEY" "$DYNAMIC_DIR/$name-client.key"
    chmod 0644 "$DYNAMIC_DIR/$name-client.crt"
    chmod 0600 "$DYNAMIC_DIR/$name-client.key"
  fi
  {
    echo "# Written by the Bondery stack \"$PREFIX\" (traefik-transport job) on every deploy. Do not edit."
    echo "# Traefik forwards to $name over HTTPS and verifies its certificate against this CA."
    echo "# rootCAs is inline: Traefik fails silently when a rootCAs path is unreadable, and the"
    echo "# transport then disappears from the loaded config. The client pair below is a path,"
    echo "# because a serversTransport has no inline \`cert\` field."
    echo "http:"
    echo "  serversTransports:"
    echo "    $name:"
    echo "      serverName: $name"
    if [ -n "$cert_file" ]; then
      echo "      # The gateway requires a client certificate (mutual TLS)."
      echo "      certificates:"
      echo "        - certFile: $TRAEFIK_VIEW_DIR/$name-client.crt"
      echo "          keyFile: $TRAEFIK_VIEW_DIR/$name-client.key"
    fi
    echo "      rootCAs:"
    echo "        - |"
    inline_pem "$ca_file" CERTIFICATE "          "
  } > "$staging"

  # The transport file does not hold a key, but it names one; keep it owner-only anyway.
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
