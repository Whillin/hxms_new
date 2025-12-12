#!/usr/bin/env bash
set -Eeuo pipefail

TS() { date '+%F %T'; }
log() { echo "$(TS) $*"; }

cd ~/hxms_new

log '[1/5] 构建并重启 API 容器'
export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1
log 'docker compose build api'
docker compose build api
log 'docker compose up -d api'
docker compose up -d api
log '查看最近日志'
docker logs --since=20s hxms_api | tail -n 60 || true

log '[2/5] 等待 API 健康检查'
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3001/healthz >/dev/null 2>&1; then
    log 'API 健康检查通过'
    break
  fi
  sleep 2
done

log '[3/5] 构建前端'
if ! command -v pnpm >/dev/null 2>&1; then
  log '安装 pnpm'
  npm i -g pnpm
fi
pnpm config set registry https://registry.npmmirror.com
log 'pnpm build'
pnpm build

log '[4/5] 部署前端到 /var/www/hxms_new'
TARGET_DIR="/var/www/hxms_new"
mkdir -p "$TARGET_DIR"
if command -v rsync >/dev/null 2>&1; then
  # 保留旧版哈希静态资源，避免用户仍在使用旧 index/chunk 时发生 404
  rsync -a dist/ "$TARGET_DIR/"
else
  log 'rsync 不存在，使用 cp -r 替代'
  find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} + || true
  cp -r dist/* "$TARGET_DIR/"
fi

log '[5/5] 重载 Nginx 并探测首页'
nginx -t
nginx -s reload || true
curl -fsS http://127.0.0.1/ | head -n 1 || true
log '部署完成'