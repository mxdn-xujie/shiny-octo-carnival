#!/bin/sh
set -e

# 配置 Docker 镜像源（如果是 Linux 系统）
setup_docker_mirrors() {
    if [ -f "/etc/docker/daemon.json" ]; then
        echo "Docker配置文件已存在，跳过配置..."
        return
    fi

    echo "配置Docker镜像源..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ]
}
EOF

    # 如果systemd可用，重启Docker服务
    if command -v systemctl >/dev/null 2>&1; then
        systemctl daemon-reload
        systemctl restart docker
    fi
}

# 等待MongoDB就绪
wait_for_mongodb() {
    echo "等待 MongoDB 就绪..."
    until wget -q --spider http://mongodb:27017 2>/dev/null; do
        echo "MongoDB 未就绪 - 等待..."
        sleep 2
    done
    echo "MongoDB 已就绪"
}

# 启动后端服务
start_backend() {
    echo "启动后端服务..."
    cd /app/behind
    node dist/index.js 2>&1 | tee -a /app/logs/backend.log &
    echo $! > /app/backend.pid
}

# 启动前端服务
start_frontend() {
    echo "启动前端服务..."
    cd /app
    npm start 2>&1 | tee -a /app/logs/frontend.log
}

# 主程序
main() {
    # 创建日志目录
    mkdir -p /app/logs

    # 设置随机JWT密钥（如果未指定）
    if [ -z "$JWT_SECRET" ]; then
        export JWT_SECRET=$(openssl rand -base64 32)
    fi

    # 如果是Linux系统且有root权限，配置Docker镜像源
    if [ "$(id -u)" = "0" ]; then
        setup_docker_mirrors
    fi
    
    wait_for_mongodb
    start_backend
    start_frontend
}

# 退出时清理
cleanup() {
    echo "正在清理进程..."
    if [ -f /app/backend.pid ]; then
        kill $(cat /app/backend.pid) 2>/dev/null || true
    fi
    pkill -P $$ 2>/dev/null || true
    exit 0
}

# 设置退出处理
trap cleanup SIGTERM SIGINT

# 运行主程序
main