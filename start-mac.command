#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。请安装 Node.js 18 或更高版本：https://nodejs.org/"
  echo "按回车关闭。"
  read -r _
  exit 1
fi

echo "正在启动复盘 300 本地文件模式…"
echo "数据目录：$(pwd)/data"
echo "关闭这个终端窗口即可停止服务。"
echo
node server/server.js
