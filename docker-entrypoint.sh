#!/bin/bash
set -e

# 配置Docker镜像源
setup_docker() {
    echo "配置Docker镜像源..."
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF
}

# 等待MongoDB就绪
wait_for_mongodb() {
    echo "等待MongoDB就绪..."
    until nc -z mongodb 27017; do
        echo "MongoDB未就绪 - 等待..."
        sleep 2
    done
    echo "MongoDB已就绪"
}

# 初始化应用
init_application() {
    echo "初始化应用..."
    
    # 创建必要的目录
    mkdir -p /app/logs
    mkdir -p /app/data/db
    
    # 设置权限
    chown -R node:node /app/logs
    chown -R node:node /app/data/db
    
    # 生成随机JWT密钥（如果未设置）
    if [ -z "$JWT_SECRET" ]; then
        export JWT_SECRET=$(openssl rand -base64 32)
    fi
}

# 启动应用
start_application() {
    echo "启动应用..."
    cd /app
    
    # 启动后端服务
    cd behind
    npm start &
    
    # 启动前端服务
    cd ..
    npm start
}

# 主函数
main() {
    echo "启动容器..."
    
    # 执行Docker配置
    setup_docker
    
    # 初始化应用
    init_application
    
    # 等待MongoDB
    wait_for_mongodb
    
    # 启动应用
    start_application
}

# 设置退出处理
trap 'kill $(jobs -p)' EXIT

# 运行主程序
main