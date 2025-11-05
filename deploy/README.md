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

## 一键更新（前端 + 后端）

- 脚本：`bash /root/apps/hxms_new/deploy/update_all.sh`
- 功能：
  - 在更新前自动校验关键文案值：`src/locales/langs/zh.json` 的 `menus.clue.leads` 必须为“到店客流表”。
  - 运行后端更新（调用 `deploy/remote_update.sh`，包含 `git pull`、DB 迁移、构建并滚动更新 API）。
  - 构建并部署前端（自动识别 `hxms_web` 容器或宿主机 `/var/www/hxms_new`）。
  - 成功后进行基础的访问头校验。

- 可选参数：
  - `--auto-fix`：若文案不匹配，自动修正为“到店客流表”后继续更新。
  - `--skip-check`：跳过文案校验（不推荐）。
  - `--frontend-only`：仅更新前端。
  - `--backend-only`：仅更新后端。

示例：

```bash
# 标准一键更新（前后端）
bash deploy/update_all.sh

# 仅前端（比如只改了 UI）
bash deploy/update_all.sh --frontend-only

# 文案校验失败时自动修复并继续
bash deploy/update_all.sh --auto-fix
```
