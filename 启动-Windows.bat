@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js。请安装 Node.js 18 或更高版本：https://nodejs.org/
  echo 安装后重新双击本文件。
  pause
  exit /b 1
)

echo 正在启动复盘 300 本地文件模式...
echo 数据目录：%cd%\data
echo 关闭这个窗口即可停止服务。
echo.
node server\server.js
pause
