@echo off
echo ========================================================
echo [AutoKim] Stable Server Launcher
echo ========================================================
echo.
echo 1. Cleaning previous build...
if exist ".next" rmdir /s /q ".next"
echo.

echo 2. Building application (This may take a few minutes)...
echo    (This process optimizes the code for stability and speed)
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please check the errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 3. Starting server in PRODUCTION mode...
echo    (This mode is stable and will not crash easily)
echo.
echo    Server will be available at: http://localhost:3000
echo.
call npm start
pause
