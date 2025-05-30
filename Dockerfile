# 前端构建阶段
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder
WORKDIR /app/behind
COPY behind/package*.json ./
COPY behind/tsconfig.json ./
COPY behind/src ./src
RUN npm install
RUN npm run build

# 运行阶段
FROM node:18-alpine
WORKDIR /app

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

EXPOSE 3500

# 启动脚本
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]