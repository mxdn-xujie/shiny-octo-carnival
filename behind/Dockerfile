FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制项目文件
COPY package.json pnpm-lock.yaml ./
COPY . .

# 安装依赖
RUN pnpm install

# 构建应用
RUN pnpm build

# 创建必要的目录
RUN mkdir -p /app/files

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3500

# 暴露端口
EXPOSE 3500

# 启动应用
CMD ["pnpm", "start"]