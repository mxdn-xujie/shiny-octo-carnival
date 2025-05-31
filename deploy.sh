#!/bin/bash

# 检查是否有root权限
if [ "$EUID" -ne 0 ]; then 
    echo "请使用root权限运行此脚本 (sudo ./deploy.sh)"
    exit 1
fi

echo "开始部署语音对讲应用..."

# 配置Docker镜像源
setup_docker_mirrors() {
    echo "配置Docker镜像源..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "max-concurrent-downloads": 10,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF
    systemctl daemon-reload
    systemctl restart docker
    echo "Docker镜像源配置完成"
}

# 检查并安装依赖
install_dependencies() {
    echo "检查依赖..."
    if ! command -v docker >/dev/null 2>&1; then
        echo "正在安装Docker..."
        apt-get update
        apt-get install -y docker.io
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo "正在安装Docker Compose..."
        apt-get install -y docker-compose
    fi
}

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p logs data/db

# 配置Docker镜像源（如果配置文件不存在）
if [ ! -f "/etc/docker/daemon.json" ]; then
    setup_docker_mirrors
fi

# 安装所需依赖
install_dependencies

# 下载必要的文件
if [ ! -f "docker-compose.yml" ]; then
    curl -o docker-compose.yml https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/docker-compose.standalone.yml
fi

if [ ! -f "Dockerfile" ]; then
    curl -o Dockerfile https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/Dockerfile
fi

if [ ! -f "docker-entrypoint.sh" ]; then
    curl -o docker-entrypoint.sh https://raw.githubusercontent.com/mxdn-xujie/gxujiie/master/docker-entrypoint.sh
    chmod +x docker-entrypoint.sh
fi

# 设置随机JWT密钥
export JWT_SECRET=$(openssl rand -base64 32)

# 启动服务
echo "启动服务..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo "=================================="
    echo "部署成功！"
    echo "服务已启动，访问地址: http://localhost:3500"
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
    echo "=================================="
else
    echo "服务启动失败，请检查日志: docker-compose logs"
    exit 1
fi