#!/usr/bin/env bash
# Print the image *index* digest for IMAGE:TAG (first Digest: line from imagetools inspect).
set -euo pipefail

image="${1:-}"
if [ -z "$image" ]; then
  echo "usage: ghcr-manifest-digest.sh IMAGE:TAG" >&2
  exit 1
fi

if ! out=$(docker buildx imagetools inspect "$image" 2>&1); then
  echo "::error::Missing image ${image}" >&2
  echo "$out" >&2
  exit 1
fi

digest=$(printf '%s\n' "$out" | awk '/^Digest:/{print $2; exit}')
if [ -z "$digest" ]; then
  echo "::error::No manifest index digest for ${image}" >&2
  echo "$out" >&2
  exit 1
fi

printf '%s\n' "$digest"
