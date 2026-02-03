
import subprocess

class Resizer:
    def __init__(self):
        pass

    def resize_to_shorts(self, input_path, output_path, ffmpeg_path="ffmpeg"):
        """
        Convert 16:9 to 9:16 with blurred background.
        Process:
        1. Split input into [main] and [bg]
        2. [bg] scale to fill 1080x1920, boxblur
        3. [main] scale width to 1080, keep aspect ratio
        4. Overlay [main] on center of [bg]
        """
        # split[a][b];[a]scale=1080:1920,boxblur=20:10[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2
        filter_complex = "split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        
        cmd = [
            ffmpeg_path, '-y',
            '-i', input_path,
            '-filter_complex', filter_complex,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-c:a', 'copy',
            output_path
        ]
        
        # subprocess.run(cmd, check=True)
        return cmd

resizer = Resizer()
