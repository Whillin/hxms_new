# 部署指南 (Deployment Guide)

本文档详细说明如何将 HXMS 系统部署到 Linux 服务器（推荐 Ubuntu/CentOS）。

## 1. 环境准备 (Prerequisites)

服务器需要安装以下软件：

- **Node.js** (v18+ recommended)
- **MySQL** (v8.0 recommended)
- **Redis**
- **Nginx** (用于反向代理和静态文件服务)
- **PM2** (用于进程守护)

### 安装 PM2

```bash
npm install -g pm2
```

## 2. 代码获取 (Get Code)

将代码克隆到服务器目录，例如 `/var/www/hxms_new`：

```bash
git clone <your-repo-url> /var/www/hxms_new
cd /var/www/hxms_new
```

## 3. 后端部署 (Backend Setup)

### 3.1 安装依赖与构建

```bash
cd server
npm install
npm run build
```

### 3.2 环境变量配置

复制环境变量示例文件并修改配置（数据库、Redis 连接信息等）：

```bash
cp .env.example .env
vim .env
```

**注意**：确保 `.env` 中的数据库和 Redis 配置正确。

### 3.3 数据库初始化

如果数据库是空的，请导入初始化 SQL 脚本：

```bash
# 假设你已经创建了数据库 hxms_db
mysql -u root -p hxms_db < exports/insert_all.sql
```

### 3.4 启动服务

回到项目根目录，使用 PM2 启动后端服务：

```bash
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

后端服务默认运行在 `3001` 端口。

## 4. 前端部署 (Frontend Setup)

### 4.1 安装依赖与构建

```bash
# 在项目根目录
npm install
npm run build
```

构建完成后，会生成 `dist` 目录，包含所有静态文件。

### 4.2 配置 Nginx

创建一个 Nginx 配置文件，例如 `/etc/nginx/sites-available/hxms.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换为你的域名或 IP

    # 前端静态文件
    location / {
        root /var/www/hxms_new/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置并重启 Nginx：

```bash
ln -s /etc/nginx/sites-available/hxms.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 5. 验证 (Verification)

访问 `http://your-domain.com` (或服务器 IP)，检查系统是否正常加载。

- 如果页面加载成功，说明前端部署成功。
- 尝试登录，如果能成功请求接口，说明后端和数据库连接正常。

---

## 常用命令

- 查看后端日志: `pm2 logs hxms-server`
- 重启后端: `pm2 restart hxms-server`
- 停止后端: `pm2 stop hxms-server`
