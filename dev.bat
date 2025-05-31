@echo off
echo 正在检查Docker状态...
docker info > nul 2>&1
if errorlevel 1 (
    echo Docker未运行，请先启动Docker Desktop
    pause
    exit /b 1
)

echo 停止现有开发容器...
docker-compose -f docker-compose.dev.yml down

echo 启动开发环境...
docker-compose -f docker-compose.dev.yml up --build -d

echo 显示容器日志...
docker-compose -f docker-compose.dev.yml logs -f