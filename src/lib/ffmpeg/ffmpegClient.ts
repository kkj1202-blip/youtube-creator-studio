'use client';

// FFmpeg WASM 인스턴스 및 상태
let ffmpegInstance: any = null;
let isLoaded = false;
let loadingPromise: Promise<any> | null = null;

// CDN URL (WASM 파일은 CDN에서 직접 - 더 빠름)
const CDN_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

/**
 * 프록시 URL (JS 파일만)
 */
function getProxyURL(file: string): string {
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
 * Blob URL 생성 (CORS 우회)
 */
async function toBlobURL(url: string, mimeType: string): Promise<string> {
  console.log('[FFmpeg] Fetching for blob:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
  console.log('[FFmpeg] Blob URL created for:', url);
  return blobUrl;
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

      // 1. FFmpeg 스크립트 로드 (프록시)
      await loadScript(getProxyURL('ffmpeg.js'));
      onProgress?.(3, 'FFmpeg 스크립트 로드 완료');

      // 2. FFmpeg 모듈 확인
      const FFmpegModule = (window as any).FFmpegWASM;
      
      if (!FFmpegModule) {
        throw new Error('FFmpeg 모듈을 찾을 수 없습니다.');
      }

      console.log('[FFmpeg] FFmpegModule found');
      onProgress?.(5, 'FFmpeg 인스턴스 생성 중...');

      const FFmpegClass = FFmpegModule.FFmpeg;
      if (!FFmpegClass) {
        throw new Error('FFmpeg 클래스를 찾을 수 없습니다.');
      }
      
      ffmpegInstance = new FFmpegClass();

      // 이벤트 핸들러
      ffmpegInstance.on('log', ({ message }: { message: string }) => {
        console.log('[FFmpeg Log]', message);
      });

      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        const percent = Math.round(progress * 100);
        onProgress?.(15 + percent * 0.75, `인코딩 중... ${percent}%`);
      });

      onProgress?.(6, 'WASM 코어 다운로드 중...');
      console.log('[FFmpeg] Creating blob URLs for WASM core...');

      // 3. WASM 코어 파일을 Blob URL로 변환 (CORS 우회)
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      ]);

      onProgress?.(8, 'FFmpeg 초기화 중...');
      console.log('[FFmpeg] Loading FFmpeg with blob URLs...');

      // 4. FFmpeg 로드
      await ffmpegInstance.load({
        coreURL,
        wasmURL,
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
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('[FFmpeg] fetchFileData error:', error);
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
  const { imageUrl, audioUrl, aspectRatio, onProgress } = options;

  try {
    const ff = await loadFFmpeg(onProgress);

    onProgress?.(12, '파일 준비 중...');

    const imageData = await fetchFileData(imageUrl);
    console.log('[FFmpeg] Image size:', imageData.length);
    await ff.writeFile('input.png', imageData);

    const audioData = await fetchFileData(audioUrl);
    console.log('[FFmpeg] Audio size:', audioData.length);
    await ff.writeFile('input.mp3', audioData);

    onProgress?.(15, '렌더링 시작...');

    const [width, height] = aspectRatio === '9:16' ? ['720', '1280'] : ['1280', '720'];
    const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

    console.log('[FFmpeg] Running FFmpeg...');
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

    const outputData = await ff.readFile('output.mp4');
    const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(blob);
    console.log('[FFmpeg] Video created, size:', blob.size);

    try {
      await ff.deleteFile('input.png');
      await ff.deleteFile('input.mp3');
      await ff.deleteFile('output.mp4');
    } catch {}

    onProgress?.(100, '렌더링 완료!');

    const duration = await getAudioDuration(audioUrl);
    return { videoUrl, duration };
  } catch (error) {
    console.error('[FFmpeg] Render error:', error);
    throw new Error(`렌더링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(10);
    audio.src = audioUrl;
  });
}

export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof SharedArrayBuffer !== 'undefined';
}

export async function cleanupFFmpeg(): Promise<void> {
  if (ffmpegInstance?.terminate) {
    try { await ffmpegInstance.terminate(); } catch {}
  }
  ffmpegInstance = null;
  isLoaded = false;
  loadingPromise = null;
}
