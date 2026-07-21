#!/bin/sh
# Load jwt-derived.env at container start (not only at create time).
set -e

if [ ! -f /runtime/jwt-derived.env ]; then
  echo "auth: missing /runtime/jwt-derived.env — jwt-derive did not run" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. /runtime/jwt-derived.env
set +a

case "$GOTRUE_JWT_KEYS" in
  ""|"[]"|'[]')
    echo "auth: GOTRUE_JWT_KEYS is empty — check jwt-derive logs and signing JWK env" >&2
    exit 1
    ;;
esac

exec gotrue
