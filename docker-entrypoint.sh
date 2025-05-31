#!/bin/sh
set -e

# 安装必要的工具
apk add --no-cache wget

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

    # 启动服务
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