#!/usr/bin/env bash
set -euo pipefail

# Switch Nginx upstream between BLUE (host:3001/api_blue) and GREEN (host:3002/api_green)
# Usage:
#   bash deploy/switch_api.sh blue
#   bash deploy/switch_api.sh green

if [[ $# -ne 1 || ( "$1" != "blue" && "$1" != "green" ) ]]; then
  echo "Usage: bash deploy/switch_api.sh [blue|green]";
  exit 1;
fi

TARGET="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[+] Switching upstream to $TARGET"

# Prefer container hxms_web if present, else host nginx.
if docker ps -a --format '{{.Names}}' | grep -qx "hxms_web"; then
  echo "[+] Detected container hxms_web"
  if [[ "$TARGET" == "blue" ]]; then
    docker cp deploy/nginx.blue.conf hxms_web:/etc/nginx/conf.d/default.conf
  else
    docker cp deploy/nginx.green.conf hxms_web:/etc/nginx/conf.d/default.conf
  fi
  docker exec hxms_web nginx -t || true
  docker exec hxms_web nginx -s reload || true
  echo "[OK] Container nginx reloaded to $TARGET"
  exit 0
fi

echo "[+] Container hxms_web not found; switching host nginx"
if [[ "$TARGET" == "blue" ]]; then
  cp deploy/nginx.host.blue.conf /etc/nginx/conf.d/hxms_new.conf
else
  cp deploy/nginx.host.green.conf /etc/nginx/conf.d/hxms_new.conf
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -t && (command -v systemctl >/dev/null 2>&1 && systemctl reload nginx || nginx -s reload)
  echo "[OK] Host nginx reloaded to $TARGET"
else
  echo "[!] nginx command not found on host"
fi

echo "[i] Tip: ensure services are running:"
echo "    docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml up -d --build api_blue api_green web"