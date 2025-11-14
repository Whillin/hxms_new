#!/usr/bin/env bash
set -euo pipefail

echo "[+] Updating HXMS application on cloud server"

# Navigate to project directory
cd ~/apps/hxms_new

# Pull latest code (preserve local server/.env)
echo "[+] Pulling latest code from GitHub..."
# Detect local modifications to server/.env and back up
if git status --porcelain | grep -q "^ M server/.env"; then
  echo "[!] Detected local changes in server/.env; backing up and stashing before pull"
  backup_path="/tmp/server.env.backup.$(date +%s)"
  cp server/.env "$backup_path" || true
  git stash push -m "auto stash server/.env before pull" -- server/.env || true
fi
# Temporarily disable exit-on-error for pull retry logic
set +e
git pull origin main
PULL_EXIT=$?
set -e
if [ "$PULL_EXIT" -ne 0 ]; then
  echo "[!] git pull failed; retrying after stashing server/.env"
  git stash push -m "auto stash server/.env for retry" -- server/.env || true
  git pull origin main
fi
# Restore local env and mark it ignored for future merges
if ls /tmp/server.env.backup.* 1> /dev/null 2>&1; then
  latest_backup=$(ls -t /tmp/server.env.backup.* | head -1)
  echo "[+] Restoring local server/.env from backup $latest_backup"
  cp "$latest_backup" server/.env || true
  git update-index --skip-worktree server/.env || true
fi

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

  # Ensure env_file for docker compose exists (fallback to server/.env)
  if [ ! -f server/.env.production ]; then
    echo "[+] server/.env.production missing; creating from server/.env"
    cp server/.env server/.env.production || true
  fi

# Check Docker containers
echo "[+] Checking Docker containers..."
docker ps | grep hxms || echo "No hxms containers found"

# 数据库迁移（幂等）：优先使用 Node 脚本，失败则回退到 SQL
echo "[+] Applying DB migrations (indexes, renames)"
MIGR_OK=0
if command -v node >/dev/null 2>&1 && [ -f server/scripts/migrate.mjs ]; then
  echo "[+] Using Node migration runner"
  if node server/scripts/migrate.mjs; then
    MIGR_OK=1
  else
    echo "[!] Node migration failed; will attempt fallback SQL via MySQL container"
  fi
else
  echo "[-] Node not available or script missing, attempting fallback SQL via MySQL container"
fi

if [ "$MIGR_OK" -ne 1 ]; then
  # Fallback: rename clues.isReserved -> isAddWeChat if column exists (idempotent)
  echo "[+] Fallback: checking MySQL column rename isReserved -> isAddWeChat"
  if docker ps --format '{{.Names}}' | grep -qx "hxms_new-mysql-1"; then
    EXISTS=$(docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -N -e \"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=\\\"hxms_dev\\\" AND table_name=\\\"clues\\\" AND column_name=\\\"isReserved\\\";\"" 2>/dev/null || echo 0)
    if [ "${EXISTS}" = "1" ]; then
      echo "[+] Column isReserved found; renaming to isAddWeChat..."
      docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -e \"ALTER TABLE hxms_dev.clues CHANGE COLUMN isReserved isAddWeChat TINYINT(1) NOT NULL DEFAULT 0;\""
    else
      echo "[-] Column isReserved not found; skip rename"
    fi

    # 新增缺失列：enterTime/leaveTime/receptionDuration/visitorCount（幂等）
    echo "[+] Fallback: ensuring visit time and counts columns exist on clues"
    for COL in enterTime leaveTime receptionDuration visitorCount; do
      COUNT=$(docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -N -e \"SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=\\\"hxms_dev\\\" AND table_name=\\\"clues\\\" AND column_name=\\\"${COL}\\\";\"" 2>/dev/null || echo 0)
      if [ "${COUNT}" = "0" ]; then
        echo "[+] Adding column ${COL} to hxms_dev.clues"
        case "$COL" in
          enterTime)
            docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -e \"ALTER TABLE hxms_dev.clues ADD COLUMN enterTime VARCHAR(10) NULL AFTER visitDate;\"" ;;
          leaveTime)
            docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -e \"ALTER TABLE hxms_dev.clues ADD COLUMN leaveTime VARCHAR(10) NULL AFTER enterTime;\"" ;;
          receptionDuration)
            docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -e \"ALTER TABLE hxms_dev.clues ADD COLUMN receptionDuration INT NOT NULL DEFAULT 0;\"" ;;
          visitorCount)
            docker exec hxms_new-mysql-1 sh -lc "mysql -uroot -p\$MYSQL_ROOT_PASSWORD -e \"ALTER TABLE hxms_dev.clues ADD COLUMN visitorCount INT NOT NULL DEFAULT 1;\"" ;;
        esac
      else
        echo "[-] Column ${COL} already exists; skip"
      fi
    done
  else
    echo "[!] MySQL container hxms_new-mysql-1 not running; skip DB migration fallback"
  fi
fi

# Build and restart API via docker compose to ensure latest code is running
  echo "[+] Building and restarting API via docker compose (with observability profile)..."
  docker compose --profile observability build api
  docker compose --profile observability up -d api

# Show recent logs quickly
echo "[+] Recent hxms_api logs (last 10s):"
docker logs --since=10s hxms_api | tail -20 || true

########################################
# Health probes
########################################
echo "[+] Probing health endpoints..."
if command -v curl >/dev/null 2>&1; then
  echo "[*] GET /api/health/live (expect 200)"
  live_status=$(curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3001/api/health/live || echo 000)
  echo "    live status: $live_status"
  echo "[*] Waiting for /api/health/ready to be 200 (up to 60s)"
  ready_status=000
  for i in $(seq 1 30); do
    ready_status=$(curl -s -m 2 -o /dev/null -w "%{http_code}" http://localhost:3001/api/health/ready || echo 000)
    if [ "$ready_status" = "200" ]; then
      echo "    ready after $((i*2))s"
      break
    fi
    sleep 2
  done
  if [ "$ready_status" != "200" ]; then
    echo "[!] readiness check not passed (HTTP $ready_status), continuing with warnings"
  fi
fi

# Test API endpoints (non-fatal)
echo "[+] Testing API endpoints (non-fatal)..."

# Simple health check via debug route (GET)
echo "[*] Checking GET /api/auth/debug-di..."
curl -i -m 5 http://localhost:3001/api/auth/debug-di || echo "Debug-di test failed"

# Customer list route should exist and require auth; expect 401 instead of 404
echo "[*] Checking GET /api/customer/list (expect 401)..."
cust_status=$(curl -s -m 5 -o /tmp/cust_list.out -w "%{http_code}" "http://localhost:3001/api/customer/list?current=1&size=10" || echo 000)
if [[ "$cust_status" == "401" || "$cust_status" == "200" ]]; then
  echo "Customer list endpoint reachable, HTTP $cust_status"
else
  echo "Customer list endpoint unexpected status: $cust_status"
  cat /tmp/cust_list.out || true
fi

# Login route requires POST; empty body should return 400/401, proving route exists
echo "[*] Checking POST /api/auth/login..."
status=$(curl -s -m 5 -o /tmp/login_test.out -w "%{http_code}" \
  -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{}' || echo 000)
if [[ "$status" == "200" || "$status" == "400" || "$status" == "401" ]]; then
  echo "Login endpoint reachable, HTTP $status"
else
  echo "Login endpoint unexpected status: $status"
  cat /tmp/login_test.out || true
fi

echo "[OK] Update completed"