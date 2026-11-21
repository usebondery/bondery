#!/bin/sh
# S3 readiness on both listeners: HTTPS 8443 (the API and Traefik, verified against the storage
# CA) and HTTP 8333 (local development). Unsigned ListBuckets: HTTP 200 + ListAllMyBucketsResult
# or HTTP 403 + Error XML. Empty GET /status 200 is process liveness, not S3 readiness.
set -eu

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

speaks_s3 --cacert /run/bondery-storage/tls/ca.crt https://localhost:8443/
speaks_s3 http://127.0.0.1:8333/
