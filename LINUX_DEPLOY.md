# Linux 一键部署指南

## 准备工作
1. 安装 Docker 和 Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose -y

# CentOS
sudo yum install docker docker-compose -y
```

2. 启动 Docker 服务
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

## 快速部署步骤

1. 创建部署目录并进入：
```bash
mkdir voice-chat
cd voice-chat
```

2. 下载配置文件：
```bash
wget https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/docker-compose.yml
```

3. 启动服务：
```bash
sudo docker-compose up -d
```

## 常用命令

- 查看服务状态：`sudo docker-compose ps`
- 查看日志：`sudo docker-compose logs -f`
- 停止服务：`sudo docker-compose down`
- 重启服务：`sudo docker-compose restart`

## 注意事项

- 确保端口 3500 未被占用
- 首次启动可能需要几分钟时间下载镜像
- 日志文件保存在容器的 /app/logs 目录下