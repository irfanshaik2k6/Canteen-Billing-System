@echo off
title Canteen Billing System - Console Mode
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
echo Starting Console Application...
echo.
java CanteenSystem
pause

