#!/bin/sh

# 等待MongoDB就绪
wait_for_mongodb() {
    echo "等待 MongoDB 就绪..."
    until wget -q --spider http://mongodb:27017; do
        echo "MongoDB 未就绪 - 等待..."
        sleep 2
    done
    echo "MongoDB 已就绪"
}

# 启动后端服务
start_backend() {
    echo "启动后端服务..."
    cd /app/behind
    if node dist/index.js; then
        echo "后端服务启动成功"
    else
        echo "后端服务启动失败"
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    echo "启动前端服务..."
    cd /app
    if npm start; then
        echo "前端服务启动成功"
    else
        echo "前端服务启动失败"
        exit 1
    fi
}

# 主程序
main() {
    wait_for_mongodb
    start_backend &
    start_frontend
}

# 退出时清理
cleanup() {
    echo "正在清理..."
    pkill -P $$
    exit 0
}

# 设置退出处理
trap cleanup SIGTERM SIGINT

# 运行主程序
main