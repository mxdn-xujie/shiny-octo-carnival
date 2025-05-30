#!/bin/sh

# 启动后端服务
cd /app/behind
node dist/index.js &

# 启动前端服务
cd /app
npm start