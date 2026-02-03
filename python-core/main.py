
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import shutil
import uuid
import json
from typing import Optional, Dict
from dotenv import load_dotenv

import sys
import io

# Force UTF-8 for stdout/stderr to handle Korean characters on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Services
from services.ffmpeg_handler import ffmpeg_handler
from services.ai_handler import ai_handler
from services.filters import filters
from services.sync_logic import sync_logic
from services.resizer import resizer

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

app = FastAPI(
    title="GVVA Core API", 
    description="High-Performance Global Viral Video Automation Engine",
    version="2.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount outputs for static serving
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# Global Task Store (In-memory for prototype)
# Structure: {task_id: {"status": "processing", "progress": 0, "message": "...", "result_url": ""}}
task_store: Dict[str, dict] = {}

class ProcessResponse(BaseModel):
    task_id: str
    status: str
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    message: str
    result_url: Optional[str] = None

@app.get("/")
def health_check():
    return {
        "status": "operational", 
        "engine": "GVVA Core v2.0", 
        "gpu_accel": "auto",
        "ffmpeg": ffmpeg_handler.ffmpeg_path
    }

@app.get("/api/task-status/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

def update_task(task_id: str, status: str, progress: int, message: str, result_url: str = None):
    task_store[task_id] = {
        "task_id": task_id,
        "status": status,
        "progress": progress,
        "message": message,
        "result_url": result_url
    }

async def _process_video_task(task_id: str, file_path: str, target_lang: str, openai_key: str = None, eleven_key: str = None):
    """
    Background Task: Encapsulates the entire GVVA pipeline.
    """
    try:
        update_task(task_id, "processing", 0, "Starting pipeline...")
        print(f"[{task_id}] === Starting GVVA Pipeline ({target_lang}) ===")
        
        # 1. Video Analysis & Audio Extraction
        update_task(task_id, "processing", 10, "Extracting audio...")
        audio_path = os.path.join(UPLOAD_DIR, f"{task_id}.wav")
        ffmpeg_handler.extract_audio(file_path, audio_path)
        print(f"[{task_id}] [1/6] Audio extracted: {audio_path}")

        # 2. STT (Whisper) -> Translate (GPT) -> TTS (ElevenLabs)
        # Pass keys dynamically
        update_task(task_id, "processing", 20, "Transcribing audio (Whisper)...")
        transcript = ai_handler.transcribe(audio_path, api_key=openai_key)
        original_text = transcript.text
        print(f"[{task_id}] [2/6] STT Complete: {original_text[:50]}...")
        
        update_task(task_id, "processing", 40, "Translating text (GPT-4o)...")
        translated_text = ai_handler.translate(original_text, target_lang, api_key=openai_key)
        print(f"[{task_id}] [3/6] Translation Complete (Trendy Vibe): {translated_text[:50]}...")
        
        update_task(task_id, "processing", 60, "Generating voice (ElevenLabs)...")
        tts_audio_data = ai_handler.generate_voice(translated_text, api_key=eleven_key)
        tts_audio_path = os.path.join(UPLOAD_DIR, f"{task_id}_tts.mp3")
        with open(tts_audio_path, "wb") as f:
            f.write(tts_audio_data)
        print(f"[{task_id}] [4/6] TTS Audio Generated: {tts_audio_path}")
        
        # 3. Audio-Video Sync (Module B)
        update_task(task_id, "processing", 80, "Synchronizing audio and video...")
        synced_video_path = os.path.join(UPLOAD_DIR, f"{task_id}_synced.mp4")
        sync_cmd = sync_logic.generate_sync_command(
            video_path=file_path,
            audio_path=tts_audio_path,
            output_path=synced_video_path,
            ffmpeg_path=ffmpeg_handler.ffmpeg_path
        )
        if sync_cmd:
            import subprocess
            subprocess.run(sync_cmd, check=True)
            print(f"[{task_id}] [5/6] AV Sync Completed")
        else:
            print(f"[{task_id}] [5/6] AV Sync Skipped (No cmd generated)")
            synced_video_path = file_path # Fallback

        # 4. Anti-Fingerprinting (Module C) & Resizing (Module D) - Merged for efficiency
        update_task(task_id, "processing", 90, "Applying anti-fingerprinting filters...")
        final_output_path = os.path.join(OUTPUT_DIR, f"gvva_final_{task_id}.mp4")
        
        filter_data = filters.get_filter_chain()
        
        fp_cmd = [
            ffmpeg_handler.ffmpeg_path, '-y',
            '-i', synced_video_path,
            '-filter_complex', filter_data['noise_filter_complex'],
            '-map', '[outv]', # output from filters.py
            '-map', '0:a',    # keep audio from synced video
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-c:a', 'copy',
            final_output_path
        ]
        
        subprocess.run(fp_cmd, check=True)
        print(f"[{task_id}] [6/6] Final Render & Fingerprint Evasion: {final_output_path}")
        print(f"[{task_id}] === Pipeline Success ===")
        
        # Generate result URL
        result_url = f"http://localhost:8000/outputs/gvva_final_{task_id}.mp4"
        update_task(task_id, "completed", 100, "Processing complete!", result_url)

    except Exception as e:
        print(f"[{task_id}] CRITICAL ERROR: {str(e)}")
        update_task(task_id, "failed", 0, f"Error: {str(e)}")

@app.post("/api/process-video", response_model=ProcessResponse)
async def process_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    target_lang: str = Form("ja"),
    openai_key: Optional[str] = Header(None, alias="x-openai-key"),
    eleven_key: Optional[str] = Header(None, alias="x-eleven-key")
):
    try:
        task_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        file_path = os.path.join(UPLOAD_DIR, f"{task_id}{file_ext}")
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Initialize task status
        update_task(task_id, "queued", 0, "Queued for processing...")

        # Start background processing with injected keys
        background_tasks.add_task(_process_video_task, task_id, file_path, target_lang, openai_key, eleven_key)
        
        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Video accepted for processing. Check status endpoint."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import subprocess
import asyncio

# Whisk Generation Lock (Ensure 1 browser instance at a time)
whisk_lock = asyncio.Lock()

# ... imports ...

# Utility to open folder dialog (PowerShell based for Windows)
def _open_folder_dialog():
    try:
        ps_script = """
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.FolderBrowserDialog
        $result = $f.ShowDialog()
        if ($result -eq 'OK') {
            Write-Output $f.SelectedPath
        }
        """
        # Run powershell command
        result = subprocess.run(
            ["powershell", "-Command", ps_script], 
            capture_output=True, 
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Error opening dialog: {e}")
        return None

@app.get("/api/utils/select-folder")
async def select_folder_dialog():
    loop = asyncio.get_running_loop()
    path = await loop.run_in_executor(None, _open_folder_dialog)
    return {"path": path or ""}

# Utility to open file dialog (PowerShell based for Windows)
def _open_file_dialog():
    try:
        ps_script = """
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.OpenFileDialog
        $f.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|All Files (*.*)|*.*"
        $result = $f.ShowDialog()
        if ($result -eq 'OK') {
            Write-Output $f.FileName
        }
        """
        result = subprocess.run(
            ["powershell", "-Command", ps_script], 
            capture_output=True, 
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Error opening file dialog: {e}")
        return None

@app.get("/api/utils/select-file")
async def select_file_dialog():
    loop = asyncio.get_running_loop()
    path = await loop.run_in_executor(None, _open_file_dialog)
    return {"path": path or ""}

class GenerateRequest(BaseModel):
    prompt: str
    output_dir: str
    filename: Optional[str] = None
    mode: str = "dom" # 'dom' or 'api'
    cookies_path: Optional[str] = None
    subject_path: Optional[str] = None
    style_path: Optional[str] = None
    composition_path: Optional[str] = None

@app.post("/api/generate-image-queued")
async def generate_image_queued(req: GenerateRequest):
    """
    Serialized Whisk Generation with Auto Token Refresh.
    - API mode: Fast, uses cached credentials
    - If credentials expired: Auto-runs DOM to refresh, then retries API
    """
    if whisk_lock.locked():
        print(f"[Whisk Queue] Warning: System busy. Waiting for lock... (Prompt: {req.prompt[:20]}...)")
    
    async with whisk_lock:
        print(f"[Whisk Queue] Processing ({req.mode}): {req.prompt[:50]}...")
        
        run_dom = False
        retry_api_after_refresh = False  # Flag to retry API after DOM refresh
        
        # Helper function to run API script
        def run_api_script():
            script_path = os.path.join(os.path.dirname(__file__), "services", "generate_whisk_api.py")
            cmd = [
                sys.executable, script_path,
                "--prompt", req.prompt,
                "--output", req.output_dir
            ]
            
            # Use cookies path from request or fallback to root cookies.json
            cookies_for_api = req.cookies_path
            if not cookies_for_api:
                cookies_for_api = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cookies.json")
            
            if cookies_for_api and os.path.exists(cookies_for_api):
                cmd.extend(["--cookies", cookies_for_api])
                cmd.extend(["--filename", req.filename])
            
            # Pass reference images - API script will signal fallback to DOM if these are present
            if req.subject_path:
                cmd.extend(["--subject", req.subject_path])
            if req.style_path:
                cmd.extend(["--style", req.style_path])
            if req.composition_path:
                cmd.extend(["--composition", req.composition_path])
            
            print(f"[Whisk Queue] Executing API: {' '.join(cmd)}")
            return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
        
        # 1. API Mode Execution
        if req.mode == "api":
            try:
                result = run_api_script()
                
                # Check for success
                try:
                    data = json.loads(result.stdout)
                    if data.get("success"):
                        # image_path is like "c:\autokim\public\uploads\whisk_api_xxx.jpg"
                        # We need to return "/uploads/filename.jpg"
                        img_filename = os.path.basename(data['image_path'])
                        return {
                            "success": True, 
                            "image_url": f"/uploads/{img_filename}",
                            "full_path": data['image_path'],
                            "mode_used": "API"
                        }
                    
                    # Check for auth failure -> Need to refresh token via DOM
                    err_msg = str(data.get("error", ""))
                    if "CREDENTIALS_EXPIRED" in err_msg or "LOGIN_REQUIRED" in err_msg:
                        print(f"[Whisk Queue] Token Expired. Running DOM to auto-refresh credentials...")
                        run_dom = True
                        retry_api_after_refresh = True  # Will retry API after DOM succeeds
                    else:
                        # Return genuine API error (not auth related)
                        return {"success": False, "error": err_msg, "details": data.get("details")}
                except:
                     if result.returncode != 0:
                         print(f"[Whisk Queue] API Crash (RC: {result.returncode}). Falling back to DOM...")
                         run_dom = True
                         retry_api_after_refresh = True

            except Exception as e:
                print(f"[Whisk Queue] API Exception: {e}. Falling back to DOM...")
                run_dom = True
                retry_api_after_refresh = True

        # 2. DOM Mode Execution (Default or Fallback for Token Refresh)
        if req.mode == "dom" or run_dom:
            script_path = os.path.join(os.path.dirname(__file__), "services", "generate_whisk.py")
            
            # Determine cookies path (Critical for fallback)
            cookies_to_use = req.cookies_path
            if not cookies_to_use:
                # Default to project root cookies.json
                cookies_to_use = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cookies.json")
            
            # Build command
            cmd = [
                sys.executable, script_path,
                "--prompt", req.prompt,
                "--output", req.output_dir,
                "--count", "1",
                "--cookies", cookies_to_use
            ]
            
            # Optional args
            if req.filename:
                cmd.extend(["--filename", req.filename])
            if req.subject_path:
                cmd.extend(["--subject", req.subject_path])
            if req.style_path:
                cmd.extend(["--style", req.style_path])
            if req.composition_path:
                cmd.extend(["--composition", req.composition_path])
        
            print(f"[Whisk Queue] Executing DOM: {' '.join(cmd)}")
            
            try:
                env = os.environ.copy()
                env["PYTHONUNBUFFERED"] = "1"
                env["PYTHONIOENCODING"] = "utf-8"
                result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
                
                stdout = result.stdout
                stderr = result.stderr
                
                if result.returncode != 0:
                    print(f"[Whisk Queue] DOM Failed. RC: {result.returncode}")
                    # Try to parse JSON error from stdout first
                    try:
                        err_json = json.loads(stdout)
                        if "error" in err_json:
                            return {"success": False, "error": err_json["error"], "details": err_json.get("details"), "mode_used": "DOM"}
                    except:
                        pass
                        
                    # Fallback to stderr
                    return {"success": False, "error": stderr if stderr else f"Process failed with code {result.returncode}", "raw_output": stdout, "mode_used": "DOM"}

                # Parse specialized output marker
                import re
                stdout = stdout or ""  # Ensure stdout is never None
                
                # Debug: Log the raw output for troubleshooting
                print(f"[Whisk Queue] DOM stdout length: {len(stdout)}")
                if "RESULT_START" in stdout:
                    print(f"[Whisk Queue] RESULT_START marker found!")
                else:
                    print(f"[Whisk Queue] RESULT_START marker NOT found. Last 500 chars: {stdout[-500:]}")
                
                match = re.search(r"---RESULT_START---([\s\S]*?)---RESULT_END---", stdout)
                
                dom_success = False
                dom_result = None
                
                if match:
                    try:
                        files = json.loads(match.group(1).strip())
                        print(f"[Whisk Queue] Parsed files: {files}")
                        if files:
                            dom_success = True
                            # files[0] is already in format "/uploads/filename.jpg"
                            dom_result = {
                                "success": True, 
                                "image_url": files[0],  # Already contains /uploads/ prefix
                                "full_path": files[0],
                                "mode_used": "DOM"
                            }
                    except Exception as parse_err:
                        print(f"[Whisk Queue] JSON parse error: {parse_err}")
                
                # DOM succeeded and we should retry API (for token refresh scenarios)
                if dom_success and retry_api_after_refresh:
                    print(f"[Whisk Queue] DOM succeeded! New API token should be captured. Retrying API for NEXT requests...")
                    # Return DOM result for current request (already generated)
                    return dom_result
                
                if dom_success:
                    return dom_result
                
                # Fallback parsing
                print(f"[Whisk Queue] Could not parse standard result. Output: {stdout[:500]}")
                return {"success": False, "error": "No image returned from DOM", "raw_output": stdout, "mode_used": "DOM"}

            except Exception as e:
                print(f"[Whisk Queue] DOM Exception: {e}")
                return {"success": False, "error": str(e), "mode_used": "DOM"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

