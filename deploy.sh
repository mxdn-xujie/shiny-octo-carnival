#!/bin/bash

# 创建必要的目录
mkdir -p logs data/db

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
docker-compose up -d

echo "服务已启动！"
echo "访问地址: http://localhost:3500"
echo "查看日志: docker-compose logs -f"