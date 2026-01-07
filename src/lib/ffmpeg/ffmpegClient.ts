'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;
let loadingPromise: Promise<FFmpeg> | null = null;

/**
 * FFmpeg WASM 인스턴스 로드
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (loaded && ffmpeg) {
    return ffmpeg;
  }

  // 이미 로딩 중이면 그 Promise 반환
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      ffmpeg = new FFmpeg();

      // 진행 상황 콜백
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        onProgress?.(15 + percent * 0.75, `인코딩 중... ${percent}%`);
      });

      onProgress?.(0, 'FFmpeg 로딩 중...');

      // WASM 파일 로드 (CDN에서)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      loaded = true;
      onProgress?.(10, 'FFmpeg 로드 완료');
      
      return ffmpeg;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * URL에서 파일 데이터 가져오기 (CORS 우회)
 */
async function fetchFileData(url: string): Promise<Uint8Array> {
  // Data URL인 경우
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Blob URL인 경우
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  // HTTP URL인 경우 - 직접 fetch
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Failed to fetch file:', url, error);
    throw new Error(`파일을 가져올 수 없습니다: ${url}`);
  }
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
    onProgress,
  } = options;

  try {
    // FFmpeg 로드
    const ffmpegInstance = await loadFFmpeg(onProgress);

    onProgress?.(12, '파일 준비 중...');

    // 이미지 파일 가져오기
    console.log('[Render] Fetching image:', imageUrl.substring(0, 100));
    const imageData = await fetchFileData(imageUrl);
    await ffmpegInstance.writeFile('input.png', imageData);
    console.log('[Render] Image loaded, size:', imageData.length);

    // 오디오 파일 가져오기
    console.log('[Render] Fetching audio:', audioUrl.substring(0, 100));
    const audioData = await fetchFileData(audioUrl);
    await ffmpegInstance.writeFile('input.mp3', audioData);
    console.log('[Render] Audio loaded, size:', audioData.length);

    onProgress?.(15, '렌더링 시작...');

    // 해상도 설정
    const resolution = aspectRatio === '9:16' ? '720:1280' : '1280:720';
    const [width, height] = resolution.split(':');

    // 간단한 비디오 필터 (Ken Burns 없이 먼저 테스트)
    let videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

    // Ken Burns 효과는 일단 비활성화 (안정성을 위해)
    // TODO: 나중에 추가

    console.log('[Render] Video filter:', videoFilter);

    // FFmpeg 실행 - 단순화된 명령어
    await ffmpegInstance.exec([
      '-loop', '1',
      '-i', 'input.png',
      '-i', 'input.mp3',
      '-vf', videoFilter,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'stillimage',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      '-y',
      'output.mp4',
    ]);

    onProgress?.(90, '비디오 생성 중...');

    // 출력 파일 읽기
    const outputData = await ffmpegInstance.readFile('output.mp4');
    console.log('[Render] Output size:', (outputData as Uint8Array).length);
    
    // Blob URL 생성
    const uint8Array = new Uint8Array(outputData as Uint8Array);
    const blob = new Blob([uint8Array], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(blob);

    // 임시 파일 정리
    try {
      await ffmpegInstance.deleteFile('input.png');
      await ffmpegInstance.deleteFile('input.mp3');
      await ffmpegInstance.deleteFile('output.mp4');
    } catch (e) {
      console.warn('[Render] Cleanup warning:', e);
    }

    onProgress?.(100, '렌더링 완료!');

    // 오디오 길이 계산
    const duration = await getAudioDuration(audioUrl);

    return { videoUrl, duration };

  } catch (error) {
    console.error('[Render] Error:', error);
    throw error;
  }
}

/**
 * 오디오 길이 가져오기
 */
async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(10); // 기본값
    });
    audio.src = audioUrl;
  });
}

/**
 * FFmpeg 지원 여부 확인
 */
export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * FFmpeg 메모리 정리
 */
export async function cleanupFFmpeg(): Promise<void> {
  if (ffmpeg) {
    ffmpeg = null;
    loaded = false;
    loadingPromise = null;
  }
}
