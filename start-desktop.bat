@echo off
title Canteen POS Desktop Application
echo ===================================================
echo   Starting Canteen POS Electron Desktop App...
echo ===================================================

set PATH=C:\Users\irfan\AppData\Local\OpenAI\Codex\runtimes\cua_node\9c26d707817e90a7\bin;%PATH%
set COREPACK_ENABLE_DOWNLOAD_PROMPT=0

node_modules\electron\dist\electron.exe .
pause

