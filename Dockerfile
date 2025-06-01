# 设置构建参数
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# 前端构建阶段
FROM --platform=$BUILDPLATFORM registry.cn-hangzhou.aliyuncs.com/node/node:18-alpine AS frontend-builder

# 设置构建平台信息
LABEL build_platform=$BUILDPLATFORM
LABEL target_platform=$TARGETPLATFORM

WORKDIR /app

# 配置 npm 和 pnpm 镜像源
RUN npm config set registry https://registry.npmmirror.com \
    && npm install -g pnpm \
    && pnpm config set registry https://registry.npmmirror.com

# 分层复制以优化缓存
COPY package.json pnpm-lock.yaml ./
COPY behind/package.json behind/
RUN pnpm install --frozen-lockfile

# 复制源代码并构建
COPY . .
RUN pnpm run build

# 后端构建阶段
FROM --platform=$BUILDPLATFORM registry.cn-hangzhou.aliyuncs.com/node/node:18-alpine AS backend-builder
WORKDIR /app/behind

# 配置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

COPY behind/package*.json ./
COPY behind/tsconfig.json ./
COPY behind/src ./src
RUN npm install && npm run build

# 运行阶段 - 使用多架构基础镜像
FROM --platform=$TARGETPLATFORM registry.cn-hangzhou.aliyuncs.com/node/node:18-alpine
WORKDIR /app

# 安装基础工具
RUN apk add --no-cache \
    bash \
    curl \
    openssl \
    shadow \
    tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建非root用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 创建必要目录
RUN mkdir -p /app/logs /app/data && chown -R appuser:appgroup /app

# 复制构建产物
COPY --from=frontend-builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=frontend-builder --chown=appuser:appgroup /app/public ./public
COPY --from=frontend-builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=frontend-builder --chown=appuser:appgroup /app/next.config.mjs ./

COPY --from=backend-builder --chown=appuser:appgroup /app/behind/dist ./behind/dist
COPY --from=backend-builder --chown=appuser:appgroup /app/behind/package*.json ./behind/

# 复制配置文件和启动脚本
COPY --chown=appuser:appgroup docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3500 \
    TZ=Asia/Shanghai

# 切换到非root用户
USER appuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3500 || exit 1

EXPOSE 3500
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]