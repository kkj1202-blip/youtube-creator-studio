# 🖥️ 거실 PC AI 서버 설치 가이드

## 📋 사전 준비 (거실 PC에서)

### 1. Python 설치
1. https://www.python.org/downloads/ 접속
2. **Python 3.11** 다운로드 및 설치
3. ⚠️ 설치 시 **"Add Python to PATH"** 체크!

### 2. Git 설치
1. https://git-scm.com/download/win 접속
2. 다운로드 및 설치 (기본 옵션 OK)

### 3. CUDA 설치
1. https://developer.nvidia.com/cuda-downloads 접속
2. Windows > x64 > 12.x 선택
3. 다운로드 및 설치

---

## 🎤 Fish Speech (TTS) 설치

PowerShell을 **관리자 권한**으로 실행 후:

```powershell
# 1. 폴더 생성
mkdir C:\ai-server
cd C:\ai-server

# 2. Fish Speech 다운로드
git clone https://github.com/fishaudio/fish-speech.git
cd fish-speech

# 3. 가상환경 생성
python -m venv venv
.\venv\Scripts\activate

# 4. PyTorch 설치 (CUDA 12.1)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 5. Fish Speech 설치
pip install -e .

# 6. 서버 실행
python -m fish_speech.webui --host 0.0.0.0 --port 8080
```

접속 테스트: http://localhost:8080

---

## 🎨 Stable Diffusion (이미지) 설치

```powershell
cd C:\ai-server

# 1. WebUI 다운로드
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# 2. 실행 (자동 설치)
.\webui-user.bat --api --listen
```

접속 테스트: http://localhost:7860

---

## 📝 Whisper (자막) 설치

```powershell
cd C:\ai-server

# 1. faster-whisper 설치
pip install faster-whisper

# 2. API 서버 만들기 (별도 스크립트 필요)
```

---

## 🔥 방화벽 설정

1. Windows 검색 → "방화벽" → "고급 설정"
2. "인바운드 규칙" → "새 규칙"
3. 포트: 7860, 8080, 8082 각각 추가_

---

## ✅ 확인

거실 PC IP 확인:
```powershell
ipconfig
# IPv4 주소: 192.168.x.x 확인
```

현재 PC에서 테스트:
- http://192.168.x.x:8080 (TTS)
- http://192.168.x.x:7860 (이미지)
