# Voice Chat Application

一个基于 Next.js 和 WebRTC 的实时语音聊天应用。

## 功能特性

- 实时语音通话
- 好友系统
- 聊天室管理
- 音频可视化
- 用户认证系统
- 响应式设计

## 技术栈

- 前端：Next.js, React, TypeScript, TailwindCSS
- 后端：Node.js, Express, Socket.IO
- 数据库：MongoDB
- 容器化：Docker

## 快速开始

1. 克隆仓库：
```bash
git clone [your-repository-url]
cd voice-chat
```

2. 使用 Docker 部署：
```bash
docker-compose up -d
```

3. 访问应用：
打开浏览器访问 http://localhost:3500

## 环境要求

- Docker
- Docker Compose

## 开发环境设置

1. 安装依赖：
```bash
pnpm install
cd behind && npm install
```

2. 运行开发服务器：
```bash
# 前端
pnpm dev

# 后端
cd behind && npm run dev
```