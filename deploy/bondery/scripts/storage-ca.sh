#!/bin/sh
# Export what a reverse proxy that is not Dokploy's Traefik needs to reach the SeaweedFS S3
# gateway on HTTPS 8443: the storage CA and a client certificate, because the gateway requires one.
# See docs/deploy/reverse-proxy.mdx.
#
#   deploy/bondery/scripts/storage-ca.sh            > storage-ca.crt      # the CA only
#   deploy/bondery/scripts/storage-ca.sh --client-dir /etc/caddy/storage # CA, cert, and key
#   deploy/bondery/scripts/storage-ca.sh --ca       > storage-ca.crt      # same as no argument
#
# With no argument (or `--ca`), it prints the CA certificate to stdout, which is all an S3 backup
# tool that does not need a client certificate needs to verify the gateway. That mode stays first
# so the existing pipelines keep working.
#
# With `--client-dir`, it writes `ca.crt`, `tls.crt`, and `tls.key` into that directory, mode 0600
# on the key. The client certificate is the API's own, read from the API container: that container
# mounts the storage client volume, and no other process on the host reads it. Run this on the host
# that runs the stack.
#
# The proxy verifies the gateway as "<BONDERY_INFRA_TRAEFIK_PREFIX>-storage" (default
# bondery-storage).
set -eu

cd "$(dirname "$0")/.."

mode="${1:---ca}"
case "$mode" in
  --ca)
    if [ "$#" -gt 0 ]; then
      shift
    fi
    docker compose exec -T api cat /bondery-storage/client/ca.crt
    ;;
  --client-dir)
    target="${2:-}"
    if [ -z "$target" ]; then
      echo "usage: $0 --client-dir <directory>" >&2
      exit 1
    fi
    umask 077
    mkdir -p "$target"
    docker compose exec -T api cat /bondery-storage/client/ca.crt > "$target/ca.crt"
    docker compose exec -T api cat /bondery-storage/client/tls.crt > "$target/tls.crt"
    docker compose exec -T api cat /bondery-storage/client/tls.key > "$target/tls.key"
    chmod 0644 "$target/ca.crt" "$target/tls.crt"
    chmod 0600 "$target/tls.key"
    echo "Wrote $target/ca.crt, $target/tls.crt, and $target/tls.key (0600)" >&2
    ;;
  *)
    echo "usage: $0 [--ca | --client-dir <directory>]" >&2
    exit 1
    ;;
esac
