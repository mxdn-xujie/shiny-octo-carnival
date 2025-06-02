@echo off
setlocal EnableDelayedExpansion

:: 生成随机密钥
powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))" > temp.txt
set /p JWT_SECRET=<temp.txt

powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))" > temp.txt
set /p JWT_REFRESH_SECRET=<temp.txt

powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))" > temp.txt
set /p MONGODB_PASSWORD=<temp.txt

set MONGODB_URI=mongodb+srv://voicechat:%MONGODB_PASSWORD%@cluster0.mongodb.net/voicechat?retryWrites=true&w=majority

del temp.txt

:: 生成 .env.production 文件
(
echo # 在 Render.com 中设置的环境变量
echo PORT=3500
echo NODE_ENV=production
echo JWT_SECRET=%JWT_SECRET%
echo JWT_EXPIRES_IN=7d
echo JWT_REFRESH_SECRET=%JWT_REFRESH_SECRET%
echo JWT_REFRESH_EXPIRES_IN=30d
echo MONGODB_URI=%MONGODB_URI%
echo.
echo # 保存这些值，稍后在 Render.com Dashboard 中设置
echo # ----------------------------------------
echo # JWT_SECRET: %JWT_SECRET%
echo # JWT_REFRESH_SECRET: %JWT_REFRESH_SECRET%
echo # MONGODB_URI: %MONGODB_URI%
echo # ----------------------------------------
) > generated_secrets.txt

echo 环境变量已生成并保存到 generated_secrets.txt 文件。
echo 请查看该文件获取需要在 Render.com Dashboard 中设置的值。
pause