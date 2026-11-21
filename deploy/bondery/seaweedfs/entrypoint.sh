#!/bin/sh
# S3 gateway: renders SeaweedFS S3 credentials from BONDERY_PRIVATE_S3_* (single source: compose
# env), then starts the gateway as the seaweed user. Runs after tls-entrypoint.sh.
#
# Listeners:
# - 8443 HTTPS with the cluster certificate: the API (BONDERY_PRIVATE_S3_ENDPOINT) and Traefik,
#   which serves the public storage domain and verifies the storage CA (traefik-transport job).
# - 8333 HTTP: the healthcheck and local development (public reads on 127.0.0.1).
# The Iceberg REST catalog is off: Bondery does not use it, and it would listen in plaintext.
set -eu

if [ -z "${BONDERY_PRIVATE_S3_ACCESS_KEY_ID:-}" ] || [ -z "${BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY:-}" ]; then
  echo "seaweedfs-s3: set BONDERY_PRIVATE_S3_ACCESS_KEY_ID and BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY" >&2
  exit 1
fi

escape_json() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

ACCESS_KEY=$(escape_json "$BONDERY_PRIVATE_S3_ACCESS_KEY_ID")
SECRET_KEY=$(escape_json "$BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY")
CONFIG=/run/bondery-storage/s3.json

umask 077
cat > "$CONFIG" <<EOF
{
  "identities": [
    {
      "name": "bondery",
      "credentials": [
        {
          "accessKey": "${ACCESS_KEY}",
          "secretKey": "${SECRET_KEY}"
        }
      ],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ],
  "anonymous_actions": ["Read"]
}
EOF
chown seaweed:seaweed "$CONFIG"

exec su-exec seaweed weed s3 \
  -filer=seaweedfs-filer:8888 \
  -ip.bind=0.0.0.0 \
  -port=8333 \
  -port.https=8443 \
  -cert.file=/run/bondery-storage/tls/tls.crt \
  -key.file=/run/bondery-storage/tls/tls.key \
  -port.iceberg=0 \
  -config="$CONFIG"
