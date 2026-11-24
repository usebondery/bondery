#!/bin/sh
# Entrypoint wrapper for every SeaweedFS node: installs the cluster TLS files from the
# stack-secrets job, then runs the given command.
#
# The files are copied into a tmpfs owned by the seaweed user, because the image drops to that
# user before it starts weed and the key must stay unreadable to anyone else. Copying also works
# for bind mounts that cannot carry Unix owners or modes (Docker Desktop on Windows).
set -eu

SOURCE=/bondery-storage/cluster
TARGET=/run/bondery-storage/tls

for file in ca.crt tls.crt tls.key; do
  if [ ! -s "$SOURCE/$file" ]; then
    echo "seaweedfs: $SOURCE/$file is missing. The stack-secrets job creates it; run: docker compose up stack-secrets" >&2
    exit 1
  fi
done

install -d -o seaweed -g seaweed -m 0700 "$TARGET"
install -o seaweed -g seaweed -m 0644 "$SOURCE/ca.crt" "$TARGET/ca.crt"
install -o seaweed -g seaweed -m 0644 "$SOURCE/tls.crt" "$TARGET/tls.crt"
install -o seaweed -g seaweed -m 0600 "$SOURCE/tls.key" "$TARGET/tls.key"

exec "$@"
