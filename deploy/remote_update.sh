#!/usr/bin/env bash
set -euo pipefail

echo "[+] Updating HXMS application on cloud server"

# Navigate to project directory
cd ~/apps/hxms_new

# Pull latest code
echo "[+] Pulling latest code from GitHub..."
git pull origin main

# Show recent commits
echo "[+] Recent commits:"
git log --oneline -3

# Check environment files
echo "[+] Checking environment configuration..."
echo "Backend .env:"
cat server/.env | grep PORT || echo "PORT not found in server/.env"

echo "Frontend .env.development:"
cat .env.development | head -5

# Ensure backend port is 3001
echo "[+] Ensuring backend port is 3001..."
if ! grep -q "PORT=3001" server/.env; then
    echo "Updating PORT to 3001 in server/.env"
    sed -i 's/PORT=.*/PORT=3001/' server/.env
    echo "Updated server/.env PORT to 3001"
fi

# Check Docker containers
echo "[+] Checking Docker containers..."
docker ps | grep hxms || echo "No hxms containers found"

# Restart API container if exists
if docker ps -a --format '{{.Names}}' | grep -qx "hxms_api"; then
    echo "[+] Restarting hxms_api container..."
    docker restart hxms_api
    sleep 2
    docker logs --since=10s hxms_api | tail -10
else
    echo "[!] hxms_api container not found"
fi

# Test API endpoints
echo "[+] Testing API endpoints..."

# Simple health check via debug route (GET)
echo "[*] Checking GET /api/auth/debug-di..."
curl -i -m 5 http://localhost:3001/api/auth/debug-di || echo "Debug-di test failed"

# Login route requires POST; empty body should return 400/401, proving route exists
echo "[*] Checking POST /api/auth/login..."
status=$(curl -s -m 5 -o /tmp/login_test.out -w "%{http_code}" \
  -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{}')
if [[ "$status" == "200" || "$status" == "400" || "$status" == "401" ]]; then
  echo "Login endpoint reachable, HTTP $status"
else
  echo "Login endpoint unexpected status: $status"
  cat /tmp/login_test.out || true
fi

echo "[OK] Update completed"