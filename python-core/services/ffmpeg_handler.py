
import os
import subprocess
import ffmpeg

class FFmpegHandler:
    def __init__(self):
        # Determine FFmpeg path (npm static or system)
        self.ffmpeg_path = self._find_ffmpeg()

    def _find_ffmpeg(self):
        # Look for npm ffmpeg-static binary first
        npm_path = os.path.join(os.getcwd(), '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
        if os.path.exists(npm_path):
            return npm_path
        return "ffmpeg" # Fallback to system path

    def get_metadata(self, input_path):
        try:
            probe = ffmpeg.probe(input_path, cmd=self.ffmpeg_path.replace('ffmpeg.exe', 'ffprobe.exe'))
            return probe
        except ffmpeg.Error as e:
            print(f"Error reading metadata: {e.stderr}")
            return None

    def extract_audio(self, input_path, output_path):
        """Extract audio to WAV (16kHz, mono)"""
        cmd = [
            self.ffmpeg_path, '-y',
            '-i', input_path,
            '-ar', '16000',
            '-ac', '1',
            '-map', '0:a:0',
            output_path
        ]
        subprocess.run(cmd, check=True)

ffmpeg_handler = FFmpegHandler()
