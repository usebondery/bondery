#!/bin/sh
# Start the bundled Postgres with TLS (see docs/deploy/configuration.mdx#postgres-tls).
#
# The `stack-secrets` job writes the server key and certificate into the volume mounted at
# /bondery-postgres/server. Postgres refuses a key that other users can read, and a bind mount
# from a Windows or macOS host cannot carry Unix modes. So this wrapper, running as root before
# the image entrypoint, copies both files into a tmpfs owned by the postgres user, then starts
# Postgres with TLS on and the hba file that rejects plaintext connections.
set -eu

SOURCE_DIR=/bondery-postgres/server
TLS_DIR=/run/bondery-postgres/tls

for file in tls.crt tls.key; do
  if [ ! -s "$SOURCE_DIR/$file" ]; then
    echo "postgres: $SOURCE_DIR/$file is missing. The stack-secrets job creates it; run: docker compose up -d stack-secrets" >&2
    exit 1
  fi
done

install -d -o postgres -g postgres -m 0700 "$TLS_DIR"
install -o postgres -g postgres -m 0644 "$SOURCE_DIR/tls.crt" "$TLS_DIR/server.crt"
install -o postgres -g postgres -m 0600 "$SOURCE_DIR/tls.key" "$TLS_DIR/server.key"

# TLS 1.2 is the floor, not 1.3: the Prisma schema engine on Windows (SChannel) cannot
# negotiate TLS 1.3, and it runs migrations from developer machines. Node and libpq negotiate
# TLS 1.3. TLS 1.2 is limited to forward-secret AEAD suites; TLS 1.3 suites are always AEAD.
exec docker-entrypoint.sh postgres \
  -c ssl=on \
  -c "ssl_cert_file=$TLS_DIR/server.crt" \
  -c "ssl_key_file=$TLS_DIR/server.key" \
  -c ssl_min_protocol_version=TLSv1.2 \
  -c "ssl_ciphers=ECDHE+AESGCM:ECDHE+CHACHA20" \
  -c hba_file=/etc/bondery/pg_hba.conf \
  "$@"
