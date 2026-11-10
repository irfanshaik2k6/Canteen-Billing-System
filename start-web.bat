@echo off
title Canteen POS Full-Stack Web Application (Port 3000)
echo ===================================================
echo   Starting Canteen Billing & Ordering System...
echo ===================================================

set PATH=C:\Users\irfan\AppData\Local\OpenAI\Codex\runtimes\cua_node\9c26d707817e90a7\bin;%PATH%
set COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo Launching browser at http://localhost:3000/ ...
start http://localhost:3000/

node backend\server.js
pause

