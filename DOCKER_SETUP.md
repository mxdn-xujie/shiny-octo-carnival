# Docker 部署说明

## 1. 环境准备
1. 安装 Docker
   - Windows: 下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux: 按照 [Docker Engine 安装指南](https://docs.docker.com/engine/install/) 安装

2. 获取代码
```bash
git clone https://github.com/mxdn-xujie/gxujiie.git
cd gxujiie
```

## 2. 运行应用
1. 使用 Docker Compose 运行（推荐）：
```bash
docker-compose up -d
```

2. 或者使用 Docker 命令运行：
```bash
# 构建镜像
docker build -t voice-chat-app .

# 运行容器
docker run -d -p 3500:3500 voice-chat-app
```

## 3. 访问应用
- 打开浏览器访问: http://localhost:3500

## 4. 常用命令
- 查看运行状态：`docker ps`
- 查看日志：`docker logs voice-chat-app`
- 停止应用：`docker-compose down` 或 `docker stop voice-chat-app`
- 重启应用：`docker-compose restart` 或 `docker restart voice-chat-app`

## 注意事项
- 确保端口 3500 未被其他应用占用
- 首次运行可能需要几分钟时间来下载依赖和构建应用
- 如果遇到问题，可以查看 Docker 日志来排查
