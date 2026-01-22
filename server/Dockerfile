# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app

# 安装 pnpm
RUN npm i -g pnpm \
 && pnpm config set registry https://registry.npmmirror.com

# 复制包管理文件并安装依赖（尽量利用缓存）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --prefer-offline

# 复制源码并构建
COPY . .
RUN pnpm build

# 生产镜像
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 仅复制运行所需文件
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/scripts ./scripts


EXPOSE 3001
CMD ["node", "dist/main.js"]