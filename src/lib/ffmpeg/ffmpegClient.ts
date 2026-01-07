'use client';

// FFmpeg WASM 인스턴스 및 상태
let ffmpegInstance: any = null;
let isLoaded = false;
let loadingPromise: Promise<any> | null = null;

/**
 * 프록시 URL 생성 (same-origin Worker 문제 해결)
 */
function getProxyURL(file: string): string {
  // 현재 호스트 기반으로 프록시 URL 생성
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/ffmpeg-proxy?file=${file}`;
  }
  return `/api/ffmpeg-proxy?file=${file}`;
}

/**
 * 스크립트 로드 헬퍼
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => {
      console.log('[FFmpeg] Script loaded:', src);
      resolve();
    };
    
    script.onerror = (e) => {
      console.error('[FFmpeg] Script load error:', src, e);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * FFmpeg WASM 인스턴스 로드
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<any> {
  if (isLoaded && ffmpegInstance) {
    return ffmpegInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      onProgress?.(0, 'FFmpeg 스크립트 로딩 중...');
      console.log('[FFmpeg] Starting load process...');

      // 1. FFmpeg 스크립트 로드 (프록시 사용)
      await loadScript(getProxyURL('ffmpeg.js'));
      onProgress?.(3, 'FFmpeg 스크립트 로드 완료');

      // 2. FFmpeg 모듈 확인
      const FFmpegModule = (window as any).FFmpeg;
      
      if (!FFmpegModule) {
        const availableGlobals = Object.keys(window).filter(k => 
          k.toLowerCase().includes('ffmpeg')
        );
        console.log('[FFmpeg] Available globals:', availableGlobals);
        throw new Error('FFmpeg 모듈을 찾을 수 없습니다.');
      }

      onProgress?.(5, 'FFmpeg 인스턴스 생성 중...');
      console.log('[FFmpeg] Creating FFmpeg instance...');

      const FFmpegClass = FFmpegModule.FFmpeg || FFmpegModule;
      ffmpegInstance = new FFmpegClass();

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
      console.log('[FFmpeg] Loading WASM core via proxy...');

      // WASM 코어 로드 (프록시 URL 사용 - same-origin)
      await ffmpegInstance.load({
        coreURL: getProxyURL('ffmpeg-core.js'),
        wasmURL: getProxyURL('ffmpeg-core.wasm'),
        workerURL: getProxyURL('ffmpeg-core.worker.js'),
      });

      isLoaded = true;
      onProgress?.(10, 'FFmpeg 준비 완료');
      console.log('[FFmpeg] FFmpeg loaded successfully!');
      
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
    
    // 비디오 필터
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
    
    // Blob 생성
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
}
