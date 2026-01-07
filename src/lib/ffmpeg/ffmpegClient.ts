'use client';

// FFmpeg WASM 인스턴스 및 상태
let ffmpegInstance: any = null;
let isLoaded = false;
let loadingPromise: Promise<any> | null = null;

/**
 * FFmpeg WASM 인스턴스 로드 (Script 태그 방식)
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<any> {
  // 이미 로드된 경우
  if (isLoaded && ffmpegInstance) {
    return ffmpegInstance;
  }

  // 로딩 중인 경우 기존 Promise 반환
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      onProgress?.(0, 'FFmpeg 초기화 중...');
      console.log('[FFmpeg] Loading FFmpeg WASM...');

      // CDN에서 FFmpeg 스크립트 로드
      const FFmpegModule = await loadFFmpegFromCDN();
      
      if (!FFmpegModule || !FFmpegModule.FFmpeg) {
        throw new Error('FFmpeg 모듈 로드 실패');
      }

      onProgress?.(5, 'FFmpeg 인스턴스 생성 중...');
      
      const { FFmpeg } = FFmpegModule;
      ffmpegInstance = new FFmpeg();

      // 로그 이벤트
      ffmpegInstance.on('log', ({ message }: { message: string }) => {
        console.log('[FFmpeg Log]', message);
      });

      // 진행률 이벤트
      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        const percent = Math.round(progress * 100);
        onProgress?.(15 + percent * 0.75, `인코딩 중... ${percent}%`);
      });

      onProgress?.(8, 'WASM 코어 로딩 중...');

      // WASM 코어 로드 - 0.12.6 버전 사용
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await ffmpegInstance.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });

      isLoaded = true;
      onProgress?.(10, 'FFmpeg 준비 완료');
      console.log('[FFmpeg] FFmpeg loaded successfully');
      
      return ffmpegInstance;
    } catch (error) {
      console.error('[FFmpeg] Load error:', error);
      loadingPromise = null;
      isLoaded = false;
      throw new Error(`FFmpeg 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  })();

  return loadingPromise;
}

/**
 * CDN에서 FFmpeg 스크립트 로드
 */
async function loadFFmpegFromCDN(): Promise<any> {
  // 먼저 npm 패키지에서 로드 시도
  try {
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    console.log('[FFmpeg] Loaded from npm package');
    return ffmpegModule;
  } catch (npmError) {
    console.warn('[FFmpeg] npm package load failed, trying CDN...', npmError);
  }

  // CDN 폴백
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if ((window as any).FFmpegWASM) {
      resolve((window as any).FFmpegWASM);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
    script.async = true;
    
    script.onload = () => {
      // UMD 빌드에서는 window.FFmpegWASM 또는 window.FFmpeg에 노출
      const FFmpegGlobal = (window as any).FFmpegWASM || (window as any).FFmpeg;
      if (FFmpegGlobal) {
        resolve(FFmpegGlobal);
      } else {
        reject(new Error('FFmpeg global not found after script load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load FFmpeg script from CDN'));
    };

    document.head.appendChild(script);
  });
}

/**
 * URL에서 파일 데이터 가져오기
 */
async function fetchFileData(url: string): Promise<Uint8Array> {
  try {
    // Data URL
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    // Blob URL
    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }

    // HTTP URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('[FFmpeg] fetchFileData error:', error, 'URL:', url.substring(0, 100));
    throw error;
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
    onProgress,
  } = options;

  try {
    // FFmpeg 로드
    const ff = await loadFFmpeg(onProgress);

    onProgress?.(12, '파일 준비 중...');
    console.log('[FFmpeg] Preparing files...');

    // 이미지 로드
    const imageData = await fetchFileData(imageUrl);
    console.log('[FFmpeg] Image data size:', imageData.length);
    await ff.writeFile('input.png', imageData);

    // 오디오 로드
    const audioData = await fetchFileData(audioUrl);
    console.log('[FFmpeg] Audio data size:', audioData.length);
    await ff.writeFile('input.mp3', audioData);

    onProgress?.(15, '렌더링 시작...');
    console.log('[FFmpeg] Starting render...');

    // 해상도 설정
    const [width, height] = aspectRatio === '9:16' ? ['720', '1280'] : ['1280', '720'];
    
    // 비디오 필터 (단순화)
    const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

    // FFmpeg 실행
    console.log('[FFmpeg] Running FFmpeg command...');
    await ff.exec([
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
    console.log('[FFmpeg] Reading output...');

    // 출력 파일 읽기
    const outputData = await ff.readFile('output.mp4');
    
    // Blob 생성 - any 타입으로 TypeScript 오류 우회
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(blob);
    console.log('[FFmpeg] Video created, blob size:', blob.size);

    // 임시 파일 정리
    try {
      await ff.deleteFile('input.png');
      await ff.deleteFile('input.mp3');
      await ff.deleteFile('output.mp4');
    } catch (cleanupError) {
      console.warn('[FFmpeg] Cleanup error:', cleanupError);
    }

    onProgress?.(100, '렌더링 완료!');

    // 오디오 길이 가져오기
    const duration = await getAudioDuration(audioUrl);
    
    return { videoUrl, duration };
  } catch (error) {
    console.error('[FFmpeg] Render error:', error);
    throw new Error(`렌더링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 오디오 길이 가져오기
 */
async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        console.warn('[FFmpeg] Failed to get audio duration, using default');
        resolve(10);
      };
      audio.src = audioUrl;
    } catch {
      resolve(10);
    }
  });
}

/**
 * FFmpeg 지원 여부 확인
 */
export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // SharedArrayBuffer 지원 확인
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  
  if (!hasSharedArrayBuffer) {
    console.warn('[FFmpeg] SharedArrayBuffer not available');
  }
  
  return hasSharedArrayBuffer;
}

/**
 * FFmpeg 메모리 정리
 */
export async function cleanupFFmpeg(): Promise<void> {
  if (ffmpegInstance) {
    try {
      // FFmpeg 인스턴스 종료 시도
      if (typeof ffmpegInstance.terminate === 'function') {
        await ffmpegInstance.terminate();
      }
    } catch (error) {
      console.warn('[FFmpeg] Cleanup error:', error);
    }
  }
  ffmpegInstance = null;
  isLoaded = false;
  loadingPromise = null;
  console.log('[FFmpeg] Cleanup complete');
}
