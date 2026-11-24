#!/bin/sh
# Healthcheck for a SeaweedFS node that serves HTTPS with client certificates (security.toml).
# Usage: tls-health.sh <https-url>
set -eu

TLS=/run/bondery-storage/tls

curl -fsS -o /dev/null --max-time 4 \
  --cacert "$TLS/ca.crt" --cert "$TLS/tls.crt" --key "$TLS/tls.key" \
  "$1"
