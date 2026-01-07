@echo off
title YouTube Creator Studio - Local Render Server
echo ============================================
echo   YouTube Creator Studio - 로컬 렌더링 서버
echo ============================================
echo.

REM Python 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되지 않았습니다.
    echo        https://www.python.org/downloads/ 에서 설치하세요.
    pause
    exit /b 1
)

REM 패키지 설치
echo [1/2] 필요한 패키지 설치 중...
pip install -q flask flask-cors

REM 서버 실행
echo [2/2] 서버 시작 중...
echo.
python server.py

pause
