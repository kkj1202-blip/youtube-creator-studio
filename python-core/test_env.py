
import sys
import os
from dotenv import load_dotenv

# Add python-core to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

from services.ffmpeg_handler import FFmpegHandler
from services.ai_handler import AIHandler

print("[-] Testing Environment...")

# 1. Test FFmpeg
handler = FFmpegHandler()
print(f"[*] FFmpeg Path: {handler.ffmpeg_path}")
if os.path.exists(handler.ffmpeg_path) or handler.ffmpeg_path == "ffmpeg":
    print("[+] FFmpeg detected.")
else:
    print("[!] FFmpeg binary NOT found.")

# 2. Test Imports
print("[+] Services imported successfully.")
print("[-] Environment Check Complete.")
