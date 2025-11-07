#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[+] Starting monitoring stack (Prometheus/Grafana/node-exporter/cadvisor/blackbox)"
docker compose -f docker-compose.monitoring.yml up -d
echo "[OK] Monitoring running"
echo "Prometheus: http://<server_ip>:9090"
echo "Grafana:    http://<server_ip>:3000  (admin/admin, please change immediately)"