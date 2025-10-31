# 部署说明（Ubuntu + Docker Compose）

本指南帮助你在无域名场景下，使用 Docker Compose 在腾讯云 Ubuntu 服务器上线本项目（前端 Vite + 后端 Node/Nest）。

## 前提条件

- 服务器系统：Ubuntu（已开放入站 `80` 端口）
- 公网 IP：例如 `106.52.174.194`
- 服务器具备 `git`、`docker`、`docker compose`（见下文安装）

## 一、在服务器安装依赖

```bash
# 基础工具
sudo apt update && sudo apt install -y git curl

# 安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# 安装 compose 插件（或单独安装 docker-compose）
sudo apt install -y docker-compose-plugin

# 验证
docker version
docker compose version
```

## 二、拉取代码

```bash
cd /var/www
sudo git clone https://github.com/Whillin/hxms_new.git
cd hxms_new
```

## 三、准备前后端生产配置

- 前端：复制 `env.production.example` 为 `.env.production` 并按需修改

```
VITE_USE_MOCK=false
VITE_API_PROXY_URL=/api
```

- 后端：进入 `server` 目录，复制 `.env.production.example` 为 `.env.production` 并填入真实参数

```
NODE_ENV=production
PORT=3001
# 数据库或其它敏感配置...
JWT_SECRET=your-secret
```

> 注意：`.env.production` 文件不要提交到仓库，只放在服务器上。

## 四、构建前端产物（dist）

```bash
# 服务器上安装 Node 环境仅用于前端构建（也可在 CI 中构建）
# 若不想在服务器装 Node，可在本地/CI 构建后把 dist 上传到服务器
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm

# 在项目根构建前端
pnpm install
pnpm build
# 生成 dist 目录（Compose 将挂载该目录给 Nginx 容器）
```

## 五、启动容器

```bash
docker compose up -d --build
```

- `api`：构建并运行后端容器，读取 `server/.env.production`
- `web`：Nginx 容器，挂载 `./dist` 与 `./deploy/nginx.conf`

## 六、验证访问

- 打开浏览器访问：`http://<你的公网IP>/`（如 `http://106.52.174.194/`）
- 接口走 `/api`，由 Nginx 反向代理到 `api:3001`

## 七、更新上线流程

- 日常开发在 `develop`；发布时合并到 `main`
- 服务器更新代码：

```bash
cd /var/www/hxms_new
sudo git pull origin main

# 如前端有改动，重新构建 dist
pnpm install
pnpm build

# 重新构建并滚动更新容器
docker compose up -d --build
```

- 若仅后端逻辑变更：也建议 `docker compose up -d --build`，确保镜像更新

## 八、日志与排错

```bash
# 观察容器日志
docker compose logs -f api
docker compose logs -f web

# 查看容器状态
docker ps
```

## 九、将来绑定域名与 HTTPS（可选）

- 域名解析到服务器公网 IP
- 将 `deploy/nginx.conf` 中 `server_name _;` 改为你的域名
- 使用 `certbot` 为 Nginx 容器配置证书（或直接在宿主机跑 Nginx + 证书，web 容器仅做静态服务）

## 十、安全建议

- 仅开放 `80/443/22` 端口；后端端口对外不暴露也可（Compose 中移除 `3001:3001` 映射）
- 使用强随机的 `JWT_SECRET` / 数据库凭据
- 定期备份数据库与镜像

## 文件说明

- `docker-compose.yml`：定义 `api` 与 `web` 服务
- `server/Dockerfile`：多阶段构建后端镜像
- `deploy/nginx.conf`：Nginx 站点配置（SPA 回退 + `/api` 反代）
- `env.production.example`：前端生产环境示例，复制为 `.env.production`
- `server/.env.production.example`：后端生产环境示例，复制为 `.env.production`

若需要，我可以为你再补一个 GitHub Actions 工作流，将 `main` 分支的变更自动构建并通过 SSH 发布到服务器，并执行 `docker compose up -d --build` 完成自动更新。

## 十一、无需在服务器维护 Git 仓库的替代流程（推荐给仅产物部署场景）

- 场景：不希望在云主机保留完整源码仓库，仅部署产物与配置。
- 做法：
  - 在本地或 CI 构建前端，生成 `dist/`。
  - 将 `docker-compose.yml`、`deploy/nginx.conf`、`server/.env.production`、`dist/` 通过 `rsync/scp` 上传到服务器（例如 `/home/ubuntu/hxms_new/`）。
  - 在服务器执行 `docker compose up -d --build` 构建并启动容器。
- 更新上线：本地改动统一提交并推送到远程；在服务器只同步产物与配置（无需 `git pull`）。
- 优点：
  - 运行环境更干净，避免误改源码影响线上。
  - CI/CD 可只产出制品（镜像/静态资源），部署更可控。

## 十二、数据库唯一索引调整（允许同门店同手机号不同姓名）

为满足“门店+手机号+客户姓名”三项查重，并允许同门店下相同手机号被不同姓名使用，需要在数据库中调整 `customers` 表的唯一索引。

执行步骤：

1. 进入数据库容器或通过宿主机端口连接到 MySQL（根据 `docker-compose.yml` 中端口映射，通常为 `13306 -> 3306`）。
2. 在目标库（如 `hxms_new`）执行以下 SQL：
   - 方式 A：通过容器执行

     `docker exec -i <mysql_container_name> mysql -uroot -p<ROOT_PASSWORD> hxms_new < /root/apps/hxms_new/deploy/sql/2025-10-31-alter-customers-unique-index.sql`

   - 方式 B：直接执行语句

     `ALTER TABLE customers DROP INDEX uniq_store_phone;` `ALTER TABLE customers ADD UNIQUE KEY uniq_store_phone_name (storeId, phone, name);` `CREATE INDEX idx_store_phone ON customers(storeId, phone);`

3. 重启 API 服务：`docker compose restart api`

验证：

- 在“线索管理”页新增线索，使用同一门店相同手机号但不同姓名，期望可以正常保存；如与已有客户三项完全一致，仍会提示重复。

回滚：见 `deploy/sql/2025-10-31-alter-customers-unique-index.sql` 文件底部注释。
