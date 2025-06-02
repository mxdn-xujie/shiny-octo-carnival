#!/bin/bash

# 生成随机密钥
generate_key() {
    openssl rand -base64 32
}

# 生成 MongoDB URI
MONGODB_URI="mongodb+srv://voicechat:$(generate_key)@cluster0.mongodb.net/voicechat?retryWrites=true&w=majority"

# 生成其他密钥
JWT_SECRET=$(generate_key)
JWT_REFRESH_SECRET=$(generate_key)
RENDER_API_KEY=$(generate_key)
RENDER_SERVICE_ID="srv-$(openssl rand -hex 8)"

# 创建 .env.production 文件
cat > .env.production << EOL
# 服务器配置
PORT=3500
NODE_ENV=production
API_TIMEOUT=30000
MAX_UPLOAD_SIZE=10mb

# MongoDB数据库配置
MONGODB_URI=${MONGODB_URI}

# JWT认证配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=30d

# CORS配置
CORS_ORIGIN=*
ALLOWED_ORIGINS=https://your-app.vercel.app

# WebSocket配置
WS_HEARTBEAT_INTERVAL=30000
WS_RECONNECT_ATTEMPTS=5
WS_PING_TIMEOUT=10000
WS_PING_INTERVAL=5000

# 音频配置
VOICE_QUALITY=high
MAX_VOICE_DURATION=300000
AUDIO_BITRATE=128000
MAX_ROOM_PARTICIPANTS=10

# 日志配置
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
LOG_FORMAT=combined

# 性能监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
PROMETHEUS_ENDPOINT=/metrics

# 安全配置
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_REQUEST_VALIDATION=true
XSS_PROTECTION=true
CONTENT_SECURITY_POLICY=true

# 文件上传配置
UPLOAD_DIR=/data/uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=audio/*

# 应用特定配置
DEFAULT_LANGUAGE=zh-CN
USER_AVATAR_PATH=/data/avatars
VOICE_STORAGE_PATH=/data/voice-messages
ENABLE_USER_PRESENCE=true
PRESENCE_UPDATE_INTERVAL=60000

# Render.com 配置
RENDER_API_KEY=${RENDER_API_KEY}
RENDER_SERVICE_ID=${RENDER_SERVICE_ID}

# 部署配置
DEPLOY_BRANCH=master
ENABLE_AUTO_DEPLOY=true
EOL

# 输出重要信息
echo "环境变量已生成并保存到 .env.production 文件"
echo ""
echo "请保存以下信息用于 GitHub Secrets 配置："
echo "----------------------------------------"
echo "RENDER_API_KEY: ${RENDER_API_KEY}"
echo "RENDER_SERVICE_ID: ${RENDER_SERVICE_ID}"
echo "JWT_SECRET: ${JWT_SECRET}"
echo "MONGODB_URI: ${MONGODB_URI}"
echo "----------------------------------------"