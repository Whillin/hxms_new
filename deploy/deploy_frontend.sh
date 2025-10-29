#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/apps/hxms_new"
SRC_DIR="$APP_DIR/dist"
DEST_DIR="/var/www/hxms_new"

usage() {
  echo "Usage: deploy_frontend.sh [build]";
  echo "- build: run 'npm run build' before syncing";
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage; exit 0;
fi

if [[ "${1:-}" == "build" ]]; then
  echo "[+] Building frontend in $APP_DIR";
  cd "$APP_DIR";
  npm run build;
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "[!] Dist directory not found: $SRC_DIR";
  exit 1;
fi

echo "[+] Syncing dist -> $DEST_DIR";
rsync -av --delete "$SRC_DIR/" "$DEST_DIR/";
chown -R www-data:www-data "$DEST_DIR";

echo "[+] Validating and reloading nginx";
nginx -t;
systemctl reload nginx;

echo "[OK] Frontend deployed to $DEST_DIR";