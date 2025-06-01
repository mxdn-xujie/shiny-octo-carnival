@echo off
echo 正在推送到所有远程仓库...

echo.
echo 推送到第一个仓库 (origin)...
git push origin master
if %errorlevel% neq 0 (
    echo 推送到 origin 失败！
    exit /b %errorlevel%
)

echo.
echo 推送到第二个仓库 (public)...
git push public master
if %errorlevel% neq 0 (
    echo 推送到 public 失败！
    exit /b %errorlevel%
)

echo.
echo 推送到第三个仓库 (third)...
git push third master
if %errorlevel% neq 0 (
    echo 推送到 third 失败！
    exit /b %errorlevel%
)

echo.
echo 所有仓库推送完成！
pause