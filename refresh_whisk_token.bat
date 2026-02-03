@echo off
chcp 65001 >nul
echo ================================================
echo   Whisk API Token Refresh Tool
echo ================================================
echo.
echo This script will open Google Labs Whisk
echo and capture a new API authentication token.
echo.
echo When the browser opens:
echo   1. Log in with your Google account
echo   2. Generate any image once in Whisk
echo   3. The browser will close automatically
echo.
echo Token will be saved to: public\uploads\api_debug.json
echo ================================================
pause

cd /d "%~dp0"
python python-core\services\generate_whisk.py --prompt "A simple test image" --cookies "cookies.json" --output "public\uploads\refresh_token" --count 1

echo.
echo ================================================
if exist "public\uploads\api_debug.json" (
    echo SUCCESS! API token has been refreshed.
    echo You can now use API mode for image generation.
) else (
    echo WARNING: api_debug.json was not created.
    echo Please make sure you completed image generation in the browser.
)
echo ================================================
pause
