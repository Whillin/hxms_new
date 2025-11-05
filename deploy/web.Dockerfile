# syntax=docker/dockerfile:1
## 前端多阶段构建：在容器内完成构建并使用 Nginx 提供静态资源

### 构建阶段：使用 Node 20 + pnpm 构建 Vite 前端
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm（也可用 corepack，但统一为 npm 全局安装）
RUN npm i -g pnpm

# 复制包管理文件并安装依赖（利用缓存）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

# 复制全部源码并构建
COPY . .
RUN pnpm build

### 运行阶段：Nginx 提供静态资源
FROM nginx:stable-alpine AS runner

# 拷贝 Nginx 配置
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到站点根目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]