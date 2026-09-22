#!/usr/bin/env bash
# Runs on the Oracle VM after CI syncs backend files + optional .env.new
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_CHANGED=0
CADDY_CHANGED=0

if [[ -f .env.new ]]; then
  if [[ ! -f .env ]] || ! cmp -s .env .env.new; then
    mv .env.new .env
    chmod 600 .env
    ENV_CHANGED=1
    echo "env: updated"
  else
    rm -f .env.new
    echo "env: unchanged"
  fi
else
  echo "env: no .env.new from CI (keeping existing .env)"
fi

if [[ ! -f .env ]]; then
  echo "error: missing .env — add GitHub secrets and re-run deploy" >&2
  exit 1
fi

CADDY_HASH_FILE=".caddyfile.sha256"
NEW_CADDY_HASH="$(sha256sum Caddyfile | awk '{print $1}')"
OLD_CADDY_HASH=""
if [[ -f "$CADDY_HASH_FILE" ]]; then
  OLD_CADDY_HASH="$(cat "$CADDY_HASH_FILE")"
fi
if [[ "$NEW_CADDY_HASH" != "$OLD_CADDY_HASH" ]]; then
  CADDY_CHANGED=1
  echo "caddy: Caddyfile changed"
else
  echo "caddy: Caddyfile unchanged"
fi

echo "compose: build + up"
docker compose up -d --build

if [[ "$ENV_CHANGED" -eq 1 ]]; then
  echo "compose: recreate api (env changed)"
  docker compose up -d --force-recreate --no-deps api
fi

if [[ "$CADDY_CHANGED" -eq 1 ]]; then
  echo "compose: recreate caddy (Caddyfile changed)"
  docker compose up -d --force-recreate --no-deps caddy
  echo "$NEW_CADDY_HASH" > "$CADDY_HASH_FILE"
elif [[ ! -f "$CADDY_HASH_FILE" ]]; then
  echo "$NEW_CADDY_HASH" > "$CADDY_HASH_FILE"
fi

docker compose ps
echo "deploy: ok"
