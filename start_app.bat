@echo off
cd /d "%~dp0"
title Creator Studio Launcher

echo ========================================================
echo   Creator Studio Launcher
echo ========================================================
echo.
echo 1. Starting Backend & Frontend Servers...
echo 2. Browser will open automatically in 10 seconds...
echo.
echo [NOTE] Do not close this window while using the app.
echo        To stop, press Ctrl+C or close this window.
echo.

:: Start browser in parallel after 10 seconds
start /b cmd /c "timeout /t 10 >nul && start http://localhost:3000"

:: Start the development server (blocks this window)
call npm run dev

pause
