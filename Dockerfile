# 前端构建阶段
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package.json和lockfile
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制前端源代码
COPY . .
RUN pnpm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder
WORKDIR /app/behind
COPY behind/package*.json ./
COPY behind/tsconfig.json ./
COPY behind/src ./src

# 安装依赖并构建
RUN npm install
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /app

# 创建日志目录
RUN mkdir -p /app/logs

# 复制前端构建文件
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/next.config.mjs ./

# 复制后端构建文件
COPY --from=backend-builder /app/behind/dist ./behind/dist
COPY --from=backend-builder /app/behind/package*.json ./behind/

# 安装生产依赖
RUN cd behind && npm install --production
RUN npm install --production

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3500 || exit 1

# 设置启动脚本
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]