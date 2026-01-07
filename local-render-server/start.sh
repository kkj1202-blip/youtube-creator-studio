#!/bin/bash
echo "============================================"
echo "  YouTube Creator Studio - 로컬 렌더링 서버"
echo "============================================"
echo ""

# Python 확인
if ! command -v python3 &> /dev/null; then
    echo "[오류] Python3이 설치되지 않았습니다."
    exit 1
fi

# 패키지 설치
echo "[1/2] 필요한 패키지 설치 중..."
pip3 install -q flask flask-cors

# 서버 실행
echo "[2/2] 서버 시작 중..."
echo ""
python3 server.py
