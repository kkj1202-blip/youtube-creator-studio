
import subprocess
import os
import math

class SyncLogic:
    def __init__(self):
        pass

    def generate_sync_command(self, video_path: str, audio_path: str, output_path: str, ffmpeg_path: str = "ffmpeg"):
        """
        Generates the FFmpeg command to sync video duration to audio duration.
        """
        # 1. Get Durations
        t_video = self._get_duration(video_path, ffmpeg_path)
        t_audio = self._get_duration(audio_path, ffmpeg_path)
        
        print(f"[Sync] Video: {t_video}s, Audio: {t_audio}s")
        
        diff = t_audio - t_video
        
        # Threshold for sync (e.g., 0.1s is negligible)
        if abs(diff) < 0.1:
            # Case 0: Almost match, just mux
            cmd = [
                ffmpeg_path, '-y',
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                output_path
            ]
            return cmd

        # Case 1: Audio is longer -> Freeze last frame of video (tpad)
        if diff > 0:
            print(f"[Sync] Audio is longer (+{diff:.2f}s). Applying tpad (freeze).")
            # tpad=stop_mode=clone:stop_duration={diff}
            filter_complex = f"tpad=stop_mode=clone:stop_duration={diff}"
            cmd = [
                ffmpeg_path, '-y',
                '-i', video_path,
                '-i', audio_path,
                '-filter_complex', filter_complex,
                '-c:v', 'libx264',  # Must re-encode for tpad
                '-c:a', 'aac',
                '-map', '0:v:0',    # Will map filtered video automatically? No, need to map output
                '-map', '1:a:0',
                output_path # Simplified, might need explicit mapping if filter chain gets complex
            ]
            # Wait, tpad is a video filter. 
            # Correct explicit cmd: 
            cmd = [
                ffmpeg_path, '-y',
                '-i', video_path,
                '-i', audio_path,
                '-filter_complex', f"[0:v]tpad=stop_mode=clone:stop_duration={diff}[v_out]",
                '-map', '[v_out]',
                '-map', '1:a:0',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-c:a', 'aac',
                output_path
            ]
            return cmd

        # Case 2: Audio is shorter -> Speed up video (setpts) or Pad Audio
        # PRD suggests: Speed Up (setpts) or Silence Padding (apad).
        # Let's use slight Speed Up for video if diff is small, otherwise generic approach.
        # Impl: Speed up video to match audio duration.
        # Speed factor = T_video / T_audio (e.g. 10s / 8s = 1.25x speed)
        
        speed_factor = t_video / t_audio
        print(f"[Sync] Audio is shorter. Speeding up video by {speed_factor:.2f}x.")
        
        # Limit max speedup to avoid unnatural look (e.g., max 1.5x)
        # If speedup is too high, better to cut video? Or pad audio?
        # PRD: "video speed up (max 1.1x) OR silence padding"
        
        if speed_factor > 1.1:
             # Too fast, pad audio instead
             pad_duration = abs(diff)
             print(f"[Sync] Speedup too high. Padding audio with {pad_duration}s silence.")
             cmd = [
                 ffmpeg_path, '-y',
                 '-i', video_path,
                 '-i', audio_path,
                 '-filter_complex', f"[1:a]apad=pad_dur={pad_duration}[a_out]",
                 '-map', '0:v:0',
                 '-map', '[a_out]',
                 '-c:v', 'copy', # Video untouched
                 '-c:a', 'aac',
                 '-shortest', # Cut at shortest stream (video likely)
                 output_path
             ]
             return cmd
        
        # Apply Video Speed Up
        # setpts = (1/speed_factor) * PTS
        setpts_val = 1.0 / speed_factor
        
        cmd = [
            ffmpeg_path, '-y',
            '-i', video_path,
            '-i', audio_path,
            '-filter_complex', f"[0:v]setpts={setpts_val}*PTS[v_out]",
            '-map', '[v_out]',
            '-map', '1:a:0',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-c:a', 'aac',
            output_path
        ]
        return cmd

    def _get_duration(self, path, ffmpeg_path):
        ffprobe = ffmpeg_path.replace('ffmpeg.exe', 'ffprobe.exe').replace('ffmpeg', 'ffprobe')
        try:
            cmd = [ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            return float(result.stdout.strip())
        except Exception as e:
            print(f"[Sync] Error getting duration for {path}: {e}")
            return 0.0

sync_logic = SyncLogic()
