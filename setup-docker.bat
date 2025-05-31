@echo off
echo 正在配置Docker...

:: 创建Docker配置目录
if not exist "%USERPROFILE%\.docker" mkdir "%USERPROFILE%\.docker"

:: 复制配置文件
copy /Y docker-config.json "%USERPROFILE%\.docker\config.json"

:: 重启Docker服务
net stop docker
net start docker

echo Docker配置完成！
echo 请重新运行 docker-compose up -d