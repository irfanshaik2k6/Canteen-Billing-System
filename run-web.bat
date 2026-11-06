@echo off
title Canteen Web Server (Port 8080)
echo ===================================================
echo   Compiling Canteen System Source Files...
echo ===================================================
javac *.java
if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed!
    pause
    exit /b %errorlevel%
)
echo.
echo [OK] Compilation successful!
echo Starting WebServer at http://localhost:8080/ ...
start http://localhost:8080/
java WebServer
pause

