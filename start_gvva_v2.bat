@echo off
title GVVA Media Workstation v2.0
echo ========================================================
echo   GVVA Media Workstation v2.0 - One-Click Launcher
echo ========================================================
echo.
echo [1/2] Checking Environment...
echo.

:: Ensure we are in the right directory
cd /d "%~dp0"

echo [2/2] Starting System (Frontend + Backend)...
echo.
echo Please wait... The browser will open automatically when ready.
echo (Do not close this window while using the program)
echo.

:: Run the concurrent script
call npm run dev

pause
