#!/bin/bash

# 检查是否具有root权限
if [ "$EUID" -ne 0 ]; then 
  echo "请使用root权限运行此脚本"
  exit 1
fi

echo "正在配置Docker镜像源..."

# 创建Docker配置目录
mkdir -p /etc/docker

# 创建或更新daemon.json配置文件
cat > /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://mirror.ccs.tencentyun.com",
        "https://registry.cn-hangzhou.aliyuncs.com",
        "https://hub-mirror.c.163.com"
    ],
    "max-concurrent-downloads": 10,
    "max-concurrent-uploads": 5,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    }
}
EOF

# 重启Docker服务
systemctl daemon-reload
systemctl restart docker

echo "Docker镜像源配置完成！"
echo "配置已经生效，现在可以继续运行 docker-compose up -d"