#!/usr/bin/env bash
# Pulls the api/webapp images that docker-compose.yml names (the version of its release) and recreates the stack. When the API
# image changes, api pre_start runs release-migrate + bucket bootstrap before
# the main API container starts.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

docker compose pull api webapp
docker compose up -d
