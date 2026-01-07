# 🎬 로컬 렌더링 서버

YouTube Creator Studio에서 **고품질 영상 렌더링**을 위한 로컬 서버입니다.

## 📋 요구사항

- **Python 3.8+**
- **FFmpeg** (필수)

---

## 🚀 빠른 시작

### Windows

1. **FFmpeg 설치**
   ```
   # Chocolatey 사용 (권장)
   choco install ffmpeg
   
   # 또는 직접 다운로드
   https://ffmpeg.org/download.html
   ```

2. **서버 실행**
   ```
   start.bat 더블클릭
   ```
   또는
   ```cmd
   pip install flask flask-cors
   python server.py
   ```

### Mac

1. **FFmpeg 설치**
   ```bash
   brew install ffmpeg
   ```

2. **서버 실행**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   또는
   ```bash
   pip3 install flask flask-cors
   python3 server.py
   ```

### Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg python3-pip
pip3 install flask flask-cors
python3 server.py
```

---

## ✅ 실행 확인

서버가 정상 실행되면:

```
==================================================
🎬 YouTube Creator Studio - 로컬 렌더링 서버
==================================================
✅ FFmpeg 확인됨
📁 출력 폴더: /Users/사용자/YouTube-Creator-Studio-Renders
🌐 서버: http://localhost:5555
==================================================
```

웹앱에서 "**로컬 렌더링 서버 연결됨**" 메시지가 표시됩니다.

---

## 🎥 품질 설정

| 옵션 | CRF | 프리셋 | 오디오 | 용도 |
|------|-----|--------|--------|------|
| **fast** | 20 | medium | 256kbps | 미리보기, 테스트 |
| **high** | 18 | slow | 320kbps | 일반 업로드 (권장) |
| **ultra** | 15 | veryslow | 320kbps | 최고 품질 |

### 출력 사양

- **해상도**: 1920x1080 (16:9) 또는 1080x1920 (9:16)
- **코덱**: H.264 High Profile
- **오디오**: AAC 48kHz 스테레오
- **컨테이너**: MP4 (faststart)

---

## 📁 출력 폴더

렌더링된 영상은 자동으로 저장됩니다:

- **Windows**: `C:\Users\사용자\YouTube-Creator-Studio-Renders\`
- **Mac/Linux**: `~/YouTube-Creator-Studio-Renders/`

---

## 🔧 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/render` | 단일 씬 렌더링 |
| POST | `/render-batch` | 여러 씬 일괄 렌더링 |
| POST | `/merge` | 영상 병합 |
| GET | `/files` | 렌더링된 파일 목록 |
| GET | `/download/<filename>` | 파일 다운로드 |

---

## ❓ 문제 해결

### FFmpeg를 찾을 수 없음

```bash
# PATH 확인
ffmpeg -version

# Windows: 시스템 환경 변수에 FFmpeg 경로 추가
# Mac: brew reinstall ffmpeg
```

### 포트 충돌

```python
# server.py 마지막 줄 수정
app.run(host="0.0.0.0", port=5556)  # 다른 포트
```

### CORS 오류

웹앱 URL이 허용 목록에 있는지 확인:
```python
CORS(app, origins=["http://localhost:3000", "https://your-app.vercel.app"])
```

---

## 📞 지원

문제가 있으면 GitHub Issues에 등록해주세요.
