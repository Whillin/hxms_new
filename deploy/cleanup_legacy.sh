#!/usr/bin/env bash
set -euo pipefail

# 清理目标说明：
# - 删除旧的前端工作目录 /root/apps/hxms_new（不再使用）
# - 删除宿主机上的 dist（改为容器内构建，不再需要）
# - 清理未使用的镜像与构建缓存（保留正在使用的，保留数据库卷）
# - 可选：将 /root/apps/hxms_new 软链到 /var/www/hxms_new，避免旧路径误用

APP_DIR="/var/www/hxms_new"
LEGACY_DIR="/root/apps/hxms_new"

echo "[+] 检查目录占用情况"
df -h || true
echo "[+] Docker 镜像与磁盘占用："
docker system df || true

echo "[+] 清理宿主机构建产物 dist (若存在)"
if [[ -d "$APP_DIR/dist" ]]; then
  rm -rf "$APP_DIR/dist"
  echo "    已删除: $APP_DIR/dist"
else
  echo "    未发现: $APP_DIR/dist"
fi

echo "[+] 删除旧工作目录 $LEGACY_DIR (若存在)"
if [[ -d "$LEGACY_DIR" || -L "$LEGACY_DIR" ]]; then
  rm -rf "$LEGACY_DIR"
  echo "    已删除: $LEGACY_DIR"
else
  echo "    未发现: $LEGACY_DIR"
fi

echo "[+] 可选：创建软链 $LEGACY_DIR -> $APP_DIR"
ln -s "$APP_DIR" "$LEGACY_DIR" 2>/dev/null || true

echo "[+] 清理未使用的镜像、构建缓存（保留卷）"
docker image prune -f || true
docker builder prune -f || true
docker system prune -f || true

echo "[!] 跳过卷清理以保护数据库数据（Compose 卷：mysql-data）"
echo "    如需查看卷占用： docker volume ls && docker system df --volumes"

echo "[+] 列出当前容器与镜像摘要"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Size}}' || true
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}' | head -n 50 || true

echo "[OK] 清理完成"