#!/usr/bin/env bash
set -euo pipefail

# HXMS 一键更新脚本（前端 + 后端）
# 功能：
# 1) 在更新前校验关键文案：src/locales/langs/zh.json -> menus.clue.leads == "到店客流表"
# 2) 运行后端更新脚本（包含 git pull、DB 迁移、构建并滚动更新 api 容器、基本健康检查）
# 3) 构建前端并部署到 Nginx（自动识别容器 hxms_web 或宿主机 /var/www/hxms_new）
#
# 用法：
#   bash deploy/update_all.sh [--auto-fix] [--skip-check] [--frontend-only] [--backend-only]
#
# 选项说明：
#   --auto-fix     当关键文案值不符时，自动修正为 "到店客流表" 后继续更新
#   --skip-check   跳过关键文案值校验（不推荐）
#   --frontend-only 仅更新前端
#   --backend-only   仅更新后端

APP_DIR="${APP_DIR:-$HOME/apps/hxms_new}"
cd "$APP_DIR"

EXPECTED_VALUE="到店客流表"
I18N_FILE="src/locales/langs/zh.json"
AUTO_FIX=0
SKIP_CHECK=0
ONLY_FRONTEND=0
ONLY_BACKEND=0

for arg in "$@"; do
  case "$arg" in
    --auto-fix) AUTO_FIX=1 ;;
    --skip-check) SKIP_CHECK=1 ;;
    --frontend-only) ONLY_FRONTEND=1 ;;
    --backend-only) ONLY_BACKEND=1 ;;
    -h|--help)
      echo "Usage: bash deploy/update_all.sh [--auto-fix] [--skip-check] [--frontend-only] [--backend-only]";
      exit 0;
      ;;
    *) ;;
  esac
done

echo "[+] Project directory: $APP_DIR"

########################################
# 预检：校验关键文案值
########################################
function get_i18n_value() {
  local value=""
  if command -v jq >/dev/null 2>&1; then
    value=$(jq -r '.menus.clue.leads // empty' "$I18N_FILE" 2>/dev/null || echo "")
  elif command -v node >/dev/null 2>&1; then
    value=$(node --input-type=module -e "import fs from 'fs'; const p='$I18N_FILE'; const zh=JSON.parse(fs.readFileSync(p,'utf8')); console.log(zh?.menus?.clue?.leads||'');" 2>/dev/null || echo "")
  else
    # 最后兜底用 grep 提取
    value=$(grep -Po '"leads"\s*:\s*"[^"]+"' "$I18N_FILE" | head -n 1 | sed -E 's/.*"leads"\s*:\s*"([^"]+)".*/\1/' || true)
  fi
  echo "$value"
}

function set_i18n_value() {
  if command -v node >/dev/null 2>&1; then
    node --input-type=module -e "import fs from 'fs'; const p='$I18N_FILE'; const zh=JSON.parse(fs.readFileSync(p,'utf8')); zh.menus=zh.menus||{}; zh.menus.clue=zh.menus.clue||{}; zh.menus.clue.leads='$EXPECTED_VALUE'; fs.writeFileSync(p, JSON.stringify(zh, null, 2));"
  elif command -v jq >/dev/null 2>&1; then
    tmp="$I18N_FILE.tmp"
    jq ".menus.clue.leads=\"$EXPECTED_VALUE\"" "$I18N_FILE" > "$tmp" && mv "$tmp" "$I18N_FILE"
  else
    # 兜底替换（风险：若结构变化可能失败）
    sed -i "s/\"leads\": \"[^\"]*\"/\"leads\": \"$EXPECTED_VALUE\"/" "$I18N_FILE" || true
  fi
}

if [ "$SKIP_CHECK" -eq 0 ]; then
  echo "[+] Checking i18n key: menus.clue.leads"
  if [ ! -f "$I18N_FILE" ]; then
    echo "[!] i18n file not found: $I18N_FILE"; exit 1;
  fi
  current=$(get_i18n_value)
  if [ "$current" != "$EXPECTED_VALUE" ]; then
    echo "[!] i18n mismatch: current='$current' expected='$EXPECTED_VALUE'"
    if [ "$AUTO_FIX" -eq 1 ]; then
      echo "[+] Auto-fixing i18n value to '$EXPECTED_VALUE'"
      set_i18n_value
      # 重新读取确认
      current=$(get_i18n_value)
      if [ "$current" != "$EXPECTED_VALUE" ]; then
        echo "[!] Auto-fix failed, still '$current'"; exit 1;
      fi
      echo "[OK] i18n fixed"
    else
      echo "[!] Abort update. Use --auto-fix to correct and continue, or --skip-check to bypass."
      exit 1
    fi
  else
    echo "[OK] i18n verified: '$current'"
  fi
else
  echo "[-] Skip i18n check by flag"
fi

########################################
# 后端更新
########################################
function update_backend() {
  echo "[+] Updating backend (API) ..."
  if [ -f "deploy/remote_update.sh" ]; then
    bash deploy/remote_update.sh
  else
    echo "[-] remote_update.sh not found, using fallback"
    git pull origin main
    # 保障后端端口为 3001
    if [ -f server/.env ]; then
      if ! grep -q "PORT=3001" server/.env; then
        sed -i 's/PORT=.*/PORT=3001/' server/.env || true
      fi
    fi
    docker compose build api
    docker compose up -d api
  fi
  echo "[+] Backend updated"
}

########################################
# 前端构建与部署
########################################
function build_frontend() {
  echo "[+] Building frontend ..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm build
  else
    npm run build
  fi
}

function deploy_frontend() {
  echo "[+] Deploying frontend ..."
  local dist_dir="$APP_DIR/dist"
  if [ ! -d "$dist_dir" ]; then
    echo "[!] dist directory not found: $dist_dir"; exit 1;
  fi

  # 优先使用容器 hxms_web
  if docker ps -a --format '{{.Names}}' | grep -qx "hxms_web"; then
    echo "[+] Detected container hxms_web, copying dist to /usr/share/nginx/html"
    docker cp "$dist_dir/." hxms_web:/usr/share/nginx/html/
    # 同步 Nginx 配置并重载，确保最新的缓存/安全/代理设置生效
    if [ -f "deploy/nginx.conf" ]; then
      echo "[+] Updating nginx config inside container"
      docker cp deploy/nginx.conf hxms_web:/etc/nginx/conf.d/default.conf
      docker exec hxms_web nginx -t || true
    fi
    docker exec hxms_web nginx -s reload || true
    docker exec hxms_web ls -lah /usr/share/nginx/html | sed -n '1,8p' || true
    echo "[OK] Frontend deployed to container hxms_web"
    return
  fi

  # 宿主机路径（适配 deploy/deploy_frontend.sh 的目标目录）
  local host_dest="/var/www/hxms_new"
  if [ -d "$host_dest" ]; then
    echo "[+] Detected host path $host_dest, syncing dist"
    rsync -av --delete "$dist_dir/" "$host_dest/"
    chown -R www-data:www-data "$host_dest" || true
    # 更新宿主机 Nginx 配置（如存在），并重载
    if [ -f "deploy/nginx.host.conf" ]; then
      echo "[+] Updating host nginx config"
      cp deploy/nginx.host.conf /etc/nginx/conf.d/hxms_new.conf || true
    fi
    if command -v nginx >/dev/null 2>&1 && command -v systemctl >/dev/null 2>&1; then
      nginx -t && systemctl reload nginx || true
    fi
    echo "[OK] Frontend deployed to $host_dest"
    return
  fi

  echo "[!] No frontend target detected (hxms_web container or $host_dest)."
  echo "    Please ensure web service is running. You can try: docker compose up -d web"
  exit 1
}

########################################
# 执行流程
########################################
if [ "$ONLY_FRONTEND" -eq 1 ] && [ "$ONLY_BACKEND" -eq 1 ]; then
  echo "[!] Conflicting flags: --frontend-only and --backend-only"; exit 1;
fi

if [ "$ONLY_BACKEND" -eq 1 ]; then
  update_backend
elif [ "$ONLY_FRONTEND" -eq 1 ]; then
  build_frontend
  deploy_frontend
else
  update_backend
  build_frontend
  deploy_frontend
fi

########################################
# 简单验证
########################################
echo "[+] Smoke test: HEAD /"
if command -v curl >/dev/null 2>&1; then
  curl -sI -m 5 http://127.0.0.1/ | sed -n '1,8p' || true
fi

echo "[OK] All done"