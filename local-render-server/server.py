#!/usr/bin/env python3
"""
YouTube Creator Studio - 로컬 렌더링 서버
고품질 영상 렌더링을 위한 FFmpeg 기반 로컬 서버

사용법:
1. FFmpeg 설치: https://ffmpeg.org/download.html
2. Python 3.8+ 설치
3. pip install flask flask-cors
4. python server.py
5. 웹앱에서 렌더링 실행
"""

import os
import sys
import json
import uuid
import base64
import subprocess
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001", 
                   "https://youtube-creator-studio-five.vercel.app",
                   "https://*.vercel.app"])

# 렌더링 출력 폴더
OUTPUT_DIR = Path.home() / "YouTube-Creator-Studio-Renders"
OUTPUT_DIR.mkdir(exist_ok=True)

# FFmpeg 품질 설정 (고품질)
QUALITY_PRESETS = {
    "high": {
        "video_codec": "libx264",
        "video_preset": "slow",  # 느리지만 고품질
        "video_crf": "18",       # 18-23 권장 (낮을수록 고품질)
        "video_profile": "high",
        "video_level": "4.1",
        "pixel_format": "yuv420p",
        "audio_codec": "aac",
        "audio_bitrate": "320k",  # 고품질 오디오
        "audio_sample_rate": "48000",
    },
    "ultra": {
        "video_codec": "libx264",
        "video_preset": "veryslow",  # 최고 품질
        "video_crf": "15",           # 거의 무손실
        "video_profile": "high",
        "video_level": "5.1",
        "pixel_format": "yuv420p",
        "audio_codec": "aac",
        "audio_bitrate": "320k",
        "audio_sample_rate": "48000",
    },
    "fast": {
        "video_codec": "libx264",
        "video_preset": "medium",
        "video_crf": "20",
        "video_profile": "high",
        "video_level": "4.1",
        "pixel_format": "yuv420p",
        "audio_codec": "aac",
        "audio_bitrate": "256k",
        "audio_sample_rate": "44100",
    }
}

def check_ffmpeg():
    """FFmpeg 설치 확인"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True
        )
        return "ffmpeg version" in result.stdout
    except FileNotFoundError:
        return False

def get_audio_duration(audio_path):
    """오디오 길이 가져오기"""
    try:
        result = subprocess.run([
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json", str(audio_path)
        ], capture_output=True, text=True)
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except:
        return 10.0

def save_base64_file(data_url, output_path):
    """Base64 데이터를 파일로 저장"""
    if data_url.startswith("data:"):
        # data:image/png;base64,xxxxx 형식
        header, base64_data = data_url.split(",", 1)
        file_data = base64.b64decode(base64_data)
    else:
        # 순수 base64
        file_data = base64.b64decode(data_url)
    
    with open(output_path, "wb") as f:
        f.write(file_data)
    return output_path

@app.route("/health", methods=["GET"])
def health():
    """서버 상태 및 FFmpeg 확인"""
    ffmpeg_ok = check_ffmpeg()
    return jsonify({
        "status": "ok",
        "ffmpeg": ffmpeg_ok,
        "output_dir": str(OUTPUT_DIR),
        "message": "로컬 렌더링 서버 실행 중" if ffmpeg_ok else "FFmpeg를 설치해주세요"
    })

@app.route("/render", methods=["POST"])
def render():
    """영상 렌더링 (고품질)"""
    if not check_ffmpeg():
        return jsonify({"error": "FFmpeg가 설치되지 않았습니다."}), 500
    
    data = request.json
    
    # 필수 파라미터
    image_data = data.get("imageData")  # base64
    audio_data = data.get("audioData")  # base64
    
    if not image_data or not audio_data:
        return jsonify({"error": "이미지와 오디오 데이터가 필요합니다."}), 400
    
    # 옵션
    aspect_ratio = data.get("aspectRatio", "16:9")
    quality = data.get("quality", "high")  # high, ultra, fast
    filename = data.get("filename", f"scene_{uuid.uuid4().hex[:8]}.mp4")
    ken_burns = data.get("kenBurns", "none")
    subtitle_text = data.get("subtitleText", "")
    subtitle_enabled = data.get("subtitleEnabled", False)
    
    preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["high"])
    
    # 임시 디렉토리
    temp_dir = tempfile.mkdtemp()
    
    try:
        # 입력 파일 저장
        image_path = Path(temp_dir) / "input.png"
        audio_path = Path(temp_dir) / "input.mp3"
        output_path = OUTPUT_DIR / filename
        
        save_base64_file(image_data, image_path)
        save_base64_file(audio_data, audio_path)
        
        # 해상도 설정
        if aspect_ratio == "9:16":
            width, height = 1080, 1920  # Full HD 세로
        else:
            width, height = 1920, 1080  # Full HD 가로
        
        # 오디오 길이
        duration = get_audio_duration(audio_path)
        
        # 비디오 필터 구성
        video_filters = [
            f"scale={width}:{height}:force_original_aspect_ratio=decrease",
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "format=yuv420p"
        ]
        
        # Ken Burns 효과
        if ken_burns == "zoom-in":
            video_filters.insert(0, f"zoompan=z='min(zoom+0.001,1.2)':d={int(duration*30)}:s={width}x{height}")
        elif ken_burns == "zoom-out":
            video_filters.insert(0, f"zoompan=z='if(lte(zoom,1.0),1.2,max(1.001,zoom-0.001))':d={int(duration*30)}:s={width}x{height}")
        
        # 자막 (선택적)
        if subtitle_enabled and subtitle_text:
            # 자막 파일 생성
            srt_path = Path(temp_dir) / "subtitle.srt"
            with open(srt_path, "w", encoding="utf-8") as f:
                f.write(f"1\n00:00:00,000 --> {int(duration//60):02d}:{int(duration%60):02d},{int((duration%1)*1000):03d}\n{subtitle_text}\n")
            video_filters.append(f"subtitles='{srt_path}':force_style='FontSize=24,FontName=Malgun Gothic,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3'")
        
        vf = ",".join(video_filters)
        
        # FFmpeg 명령어 (고품질 설정)
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(image_path),
            "-i", str(audio_path),
            "-vf", vf,
            "-c:v", preset["video_codec"],
            "-preset", preset["video_preset"],
            "-crf", preset["video_crf"],
            "-profile:v", preset["video_profile"],
            "-level:v", preset["video_level"],
            "-pix_fmt", preset["pixel_format"],
            "-c:a", preset["audio_codec"],
            "-b:a", preset["audio_bitrate"],
            "-ar", preset["audio_sample_rate"],
            "-shortest",
            "-movflags", "+faststart",
            str(output_path)
        ]
        
        print(f"[렌더링] 시작: {filename}")
        print(f"[렌더링] 품질: {quality}, 해상도: {width}x{height}")
        
        # FFmpeg 실행
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"[에러] FFmpeg: {result.stderr}")
            return jsonify({"error": f"렌더링 실패: {result.stderr[:500]}"}), 500
        
        # 결과
        file_size = output_path.stat().st_size
        print(f"[렌더링] 완료: {filename} ({file_size / 1024 / 1024:.1f} MB)")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "path": str(output_path),
            "size": file_size,
            "duration": duration,
            "resolution": f"{width}x{height}",
            "quality": quality
        })
        
    except Exception as e:
        print(f"[에러] {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        # 임시 파일 정리
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.route("/render-batch", methods=["POST"])
def render_batch():
    """여러 씬 일괄 렌더링"""
    if not check_ffmpeg():
        return jsonify({"error": "FFmpeg가 설치되지 않았습니다."}), 500
    
    data = request.json
    scenes = data.get("scenes", [])
    quality = data.get("quality", "high")
    
    results = []
    for i, scene in enumerate(scenes):
        print(f"[일괄 렌더링] {i+1}/{len(scenes)}")
        
        # 개별 렌더링 요청 생성
        scene["quality"] = quality
        scene["filename"] = scene.get("filename", f"scene_{i+1:03d}.mp4")
        
        # render 함수 재사용
        with app.test_request_context(json=scene):
            response = render()
            if hasattr(response, 'get_json'):
                results.append(response.get_json())
            else:
                results.append(response[0].get_json())
    
    return jsonify({
        "success": True,
        "total": len(scenes),
        "completed": len([r for r in results if r.get("success")]),
        "results": results
    })

@app.route("/merge", methods=["POST"])
def merge():
    """여러 영상 병합"""
    if not check_ffmpeg():
        return jsonify({"error": "FFmpeg가 설치되지 않았습니다."}), 500
    
    data = request.json
    video_files = data.get("files", [])  # 파일 경로 목록
    output_name = data.get("outputName", f"merged_{uuid.uuid4().hex[:8]}.mp4")
    quality = data.get("quality", "high")
    
    if len(video_files) < 2:
        return jsonify({"error": "2개 이상의 영상이 필요합니다."}), 400
    
    preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["high"])
    temp_dir = tempfile.mkdtemp()
    
    try:
        # 파일 목록 생성
        list_path = Path(temp_dir) / "files.txt"
        with open(list_path, "w") as f:
            for vf in video_files:
                f.write(f"file '{vf}'\n")
        
        output_path = OUTPUT_DIR / output_name
        
        # FFmpeg concat
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_path),
            "-c:v", preset["video_codec"],
            "-preset", preset["video_preset"],
            "-crf", preset["video_crf"],
            "-c:a", preset["audio_codec"],
            "-b:a", preset["audio_bitrate"],
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            return jsonify({"error": f"병합 실패: {result.stderr[:500]}"}), 500
        
        return jsonify({
            "success": True,
            "filename": output_name,
            "path": str(output_path),
            "size": output_path.stat().st_size
        })
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.route("/download/<filename>", methods=["GET"])
def download(filename):
    """렌더링된 파일 다운로드"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
    return send_file(file_path, as_attachment=True)

@app.route("/files", methods=["GET"])
def list_files():
    """렌더링된 파일 목록"""
    files = []
    for f in OUTPUT_DIR.glob("*.mp4"):
        files.append({
            "name": f.name,
            "size": f.stat().st_size,
            "created": f.stat().st_ctime
        })
    return jsonify({"files": sorted(files, key=lambda x: x["created"], reverse=True)})

if __name__ == "__main__":
    print("=" * 50)
    print("🎬 YouTube Creator Studio - 로컬 렌더링 서버")
    print("=" * 50)
    
    if not check_ffmpeg():
        print("❌ FFmpeg가 설치되지 않았습니다!")
        print("   설치: https://ffmpeg.org/download.html")
        print("   Windows: choco install ffmpeg")
        print("   Mac: brew install ffmpeg")
        sys.exit(1)
    
    print(f"✅ FFmpeg 확인됨")
    print(f"📁 출력 폴더: {OUTPUT_DIR}")
    print(f"🌐 서버: http://localhost:5555")
    print("=" * 50)
    
    app.run(host="0.0.0.0", port=5555, debug=True)
