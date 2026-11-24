#!/bin/sh
# S3 readiness on both listeners: HTTPS 8443 (the API and Traefik, verified against the storage
# CA, with a client certificate the gateway requires) and HTTP 8333 (the healthcheck and local
# development). Unsigned ListBuckets: HTTP 200 + ListAllMyBucketsResult or HTTP 403 + Error XML.
# Empty GET /status 200 is process liveness, not S3 readiness.
set -eu

TLS=/run/bondery-storage/tls
body=$(mktemp)
trap 'rm -f "$body"' EXIT

speaks_s3() {
  http_code=$(curl -sS -o "$body" -w '%{http_code}' --max-time 4 "$@") || return 1
  if [ "$http_code" != "200" ] && [ "$http_code" != "403" ]; then
    return 1
  fi
  # Busybox grep has no `\s`; match the element names, not a full XML schema.
  grep -qE 'ListAllMyBucketsResult|<Error' "$body"
}

# The gateway requires a client certificate on 8443, so the probe presents the cluster
# certificate, which is issued for client authentication.
speaks_s3 --cacert "$TLS/ca.crt" --cert "$TLS/tls.crt" --key "$TLS/tls.key" https://localhost:8443/
speaks_s3 http://127.0.0.1:8333/
