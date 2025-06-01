#!/bin/bash

# 设置镜像名称和标签
IMAGE_NAME="voice-chat-app"
IMAGE_TAG="latest"

# 支持的平台
PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"

# 创建buildx构建器
docker buildx create --use --name multiarch-builder || true

# 启动构建器
docker buildx inspect multiarch-builder --bootstrap

# 多架构构建并推送
echo "开始多架构构建..."
docker buildx build \
  --platform ${PLATFORMS} \
  --tag ${IMAGE_NAME}:${IMAGE_TAG} \
  --build-arg BUILDPLATFORM=${PLATFORMS} \
  --file Dockerfile \
  --push \
  .