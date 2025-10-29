#!/usr/bin/env bash
set -euo pipefail

CONTAINER="hxms_api"

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[!] Container not found: $CONTAINER";
  docker ps -a; exit 1;
fi

echo "[+] Restarting $CONTAINER";
docker restart "$CONTAINER";

sleep 1;
docker ps -a | grep "$CONTAINER" || true;

# quick health check
if command -v curl >/dev/null 2>&1; then
  echo "[+] Checking http://127.0.0.1:3001/ (headers)";
  curl -sI -m 5 http://127.0.0.1:3001/ | sed -n '1,12p' || true;
fi

echo "[+] Recent logs:";
docker logs --since=20s "$CONTAINER" || true;

echo "[OK] $CONTAINER restarted"