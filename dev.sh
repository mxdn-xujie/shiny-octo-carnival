#!/bin/bash

# 检查docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "Docker未运行，请先启动Docker"
    exit 1
fi

# 停止现有容器
docker-compose -f docker-compose.dev.yml down

# 启动开发环境
docker-compose -f docker-compose.dev.yml up --build -d

# 显示日志
docker-compose -f docker-compose.dev.yml logs -f