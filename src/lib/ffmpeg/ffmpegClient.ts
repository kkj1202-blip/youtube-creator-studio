'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

/**
 * FFmpeg WASM 인스턴스 로드
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (loaded && ffmpeg) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  // 진행 상황 콜백
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  ffmpeg.on('progress', ({ progress, time }) => {
    const percent = Math.round(progress * 100);
    onProgress?.(percent, `인코딩 중... ${percent}%`);
  });

  onProgress?.(0, 'FFmpeg 로딩 중...');

  // WASM 파일 로드 (CDN에서)
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  onProgress?.(100, 'FFmpeg 로드 완료');
  
  return ffmpeg;
}

/**
 * 이미지 + 오디오 → 비디오 렌더링
 */
export async function renderVideo(options: {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  kenBurns?: string;
  kenBurnsSpeed?: number;
  kenBurnsZoom?: number;
  subtitleText?: string;
  subtitleEnabled?: boolean;
  onProgress?: (progress: number, message: string) => void;
}): Promise<{ videoUrl: string; duration: number }> {
  const {
    imageUrl,
    audioUrl,
    aspectRatio,
    kenBurns = 'none',
    kenBurnsSpeed = 1.0,
    kenBurnsZoom = 20,
    subtitleText,
    subtitleEnabled,
    onProgress,
  } = options;

  // FFmpeg 로드
  const ffmpegInstance = await loadFFmpeg(onProgress);

  onProgress?.(5, '파일 준비 중...');

  // 이미지 파일 가져오기
  const imageData = await fetchFile(imageUrl);
  await ffmpegInstance.writeFile('input.png', imageData);

  // 오디오 파일 가져오기
  const audioData = await fetchFile(audioUrl);
  await ffmpegInstance.writeFile('input.mp3', audioData);

  onProgress?.(15, '렌더링 시작...');

  // 해상도 설정
  const resolution = aspectRatio === '9:16' ? '720:1280' : '1280:720';
  const [width, height] = resolution.split(':');

  // 비디오 필터 구성
  let videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  // Ken Burns 효과 (간단한 줌)
  if (kenBurns === 'zoom-in') {
    const zoomAmount = 1 + (kenBurnsZoom / 100);
    videoFilter = `scale=${Number(width) * 1.5}:${Number(height) * 1.5},zoompan=z='min(zoom+0.001*${kenBurnsSpeed},${zoomAmount})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=24`;
  } else if (kenBurns === 'zoom-out') {
    const zoomAmount = 1 + (kenBurnsZoom / 100);
    videoFilter = `scale=${Number(width) * 1.5}:${Number(height) * 1.5},zoompan=z='if(lte(zoom,1.0),${zoomAmount},max(1.001,zoom-0.001*${kenBurnsSpeed}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=24`;
  }

  // 자막 추가
  if (subtitleEnabled && subtitleText) {
    const safeText = subtitleText.replace(/'/g, "\\'").substring(0, 100);
    videoFilter += `,drawtext=text='${safeText}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-60:box=1:boxcolor=black@0.6:boxborderw=8`;
  }

  // FFmpeg 실행
  await ffmpegInstance.exec([
    '-loop', '1',
    '-i', 'input.png',
    '-i', 'input.mp3',
    '-vf', videoFilter,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'output.mp4',
  ]);

  onProgress?.(90, '비디오 생성 중...');

  // 출력 파일 읽기
  const outputData = await ffmpegInstance.readFile('output.mp4');
  
  // Blob URL 생성 (Uint8Array를 ArrayBuffer로 변환)
  const blob = new Blob([new Uint8Array(outputData as Uint8Array).buffer], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(blob);

  // 임시 파일 정리
  await ffmpegInstance.deleteFile('input.png');
  await ffmpegInstance.deleteFile('input.mp3');
  await ffmpegInstance.deleteFile('output.mp4');

  onProgress?.(100, '렌더링 완료!');

  // 오디오 길이 계산 (대략적)
  const duration = await getAudioDuration(audioUrl);

  return { videoUrl, duration };
}

/**
 * 오디오 길이 가져오기
 */
async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(10); // 기본값
    });
  });
}

/**
 * FFmpeg 지원 여부 확인
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * FFmpeg 메모리 정리
 */
export async function cleanupFFmpeg(): Promise<void> {
  if (ffmpeg) {
    // 메모리 정리
    ffmpeg = null;
    loaded = false;
  }
}
