# 运维与发布指引（root）

## 前端发布

- 一键发布（含可选构建）
  - 仅同步：`bash /root/apps/hxms_new/deploy/deploy_frontend.sh`
  - 构建并同步：`bash /root/apps/hxms_new/deploy/deploy_frontend.sh build`
- 发布流程：
  1. 构建：`cd /root/apps/hxms_new && npm run build`
  2. 同步：`rsync -av --delete dist/ /var/www/hxms_new/`
  3. 权限：`chown -R www-data:www-data /var/www/hxms_new`
  4. 重载：`nginx -t && systemctl reload nginx`

## 后端容器

- 重启与健康检查：`bash /root/apps/hxms_new/deploy/restart_api.sh`
- 查看日志：`docker logs -f hxms_api`
- 进入容器：`docker exec -it hxms_api sh`

## 排障要点

- 端口监听：`ss -tulpn | grep :80`、`ss -tulpn | grep :3001`
- 本机访问：`curl -I http://127.0.0.1/`、`curl -I http://127.0.0.1:3001/`
- 外网无法访问（连接超时）时：
  - 多为云平台安全组未放行 80/443（或 3001）端口。
  - 请在云控制台的“安全组/防火墙”中添加入站规则：
    - TCP `80` `0.0.0.0/0`
    - 如需 HTTPS，开放 TCP `443` `0.0.0.0/0`
    - 如需对外测试后端，临时开放 TCP `3001`（建议仅白名单）。
- 服务器防火墙：
  - `ufw status`（通常为 inactive）
  - `nft list ruleset`（默认 INPUT 为 accept）

## 快速验证

- 前端：`curl -I http://106.52.174.194/`
- 后端：`curl -I http://106.52.174.194:3001/`
