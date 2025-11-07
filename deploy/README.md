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

## 蓝绿/灰度发布

- 叠加启动两个后端实例：
  - `docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml up -d api_blue api_green`
- 切换后端上游（宿主机 Nginx）：
  - 切至 blue：`bash deploy/switch_api.sh host blue`
  - 切至 green：`bash deploy/switch_api.sh host green`
- 切换容器内 Nginx（如使用内置 web 容器）：
  - 切至 blue：`bash deploy/switch_api.sh inside blue`
  - 切至 green：`bash deploy/switch_api.sh inside green`

## 功能开关（后端）

- 通过环境变量控制运行时功能：
  - `FEATURE_FLAGS="QUEUE_SAVE_CLUE"` 或 `FEATURE_ENABLE_QUEUE_SAVE_CLUE=true`
- 线索保存队列开关：
  - 在 `server/src/routes/clue.controller.ts` 中，`QUEUE_SAVE_CLUE` 为开时，提交到 `clue-processing` 队列进行后台重任务处理；关闭时直接返回。

## 数据库迁移

- 本地/云端更新流程已集成幂等迁移：
  - 本地：`deploy/update_all.sh` 在后端启动后执行 `node server/scripts/migrate.mjs`
  - 云端：`deploy/remote_update.sh` 优先执行 `node server/scripts/migrate.mjs`，若 Node 不可用则回退为 SQL 迁移（安全幂等）。
- 手动执行（需要 Node）：
  - `cd server && npm run migrate` 或 `node ../server/scripts/migrate.mjs`
- 目前迁移内容：
  - `customers` 普通索引 `(storeId, phone)` 与唯一索引 `(storeId, phone, name)`
  - `channels` 唯一索引 `compoundKey` 与常规索引 `category`、`businessSource`
  - `clues` 字段重命名：`isReserved -> isAddWeChat`

## 慢查询与读副本

- 慢查询阈值：设置 `DB_SLOW_MS`（默认 `200` 毫秒）用于输出慢查询日志。
- 读写分离：在 `.env` 配置只读副本：
  - 主库：`MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DB`
  - 只读副本：`MYSQL_RO_HOST`、`MYSQL_RO_PORT`（可多个副本，多副本按当前代码配置添加）
- 应用层已启用 TypeORM `replication`，读操作可分流至只读副本，有利于报表流量隔离。

## 队列化重任务、接口防抖与分页规范

- 队列：Bull 队列 `clue-processing` 已启用，`ClueProcessor` 完成保存线索的重任务，包含数据范围校验、门店/客户规范化、渠道处理与车型解析等。
- 接口防抖：后端 `DebounceMiddleware` 针对 `GET` 响应进行 10 秒缓存（成功响应），减少重复请求压力。
- 分页规范（前端/后端约定）：
  - 请求参数：`current`（页码，从 1 开始）、`size`（每页数量）
  - 响应结构：`{ records, current, size, total }`

## 分布式追踪（OpenTelemetry + Jaeger）

- 依赖：已在 `server/package.json` 添加所需 OTel 包，构建时自动安装。
- 配置：设置 `JAEGER_ENDPOINT`，默认 `http://jaeger:14268/api/traces`。
- 启用：后端启动时自动初始化 OTel SDK（若依赖可用），可通过 Jaeger UI 查看链路信息。
