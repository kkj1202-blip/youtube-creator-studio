'use client';

// FFmpeg 인스턴스
let ffmpegInstance: any = null;
let isLoaded = false;
let loadingPromise: Promise<any> | null = null;

// Single-threaded 버전 (더 작고 빠름, Worker 불필요)
const FFMPEG_CORE_ST = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/umd';

/**
 * 프록시 URL
 */
function getProxyURL(file: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/ffmpeg-proxy?file=${file}`;
  }
  return `/api/ffmpeg-proxy?file=${file}`;
}

/**
 * 스크립트 로드
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script load failed: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * FFmpeg 로드 (Single-threaded 버전)
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
      onProgress?.(0, 'FFmpeg 로딩 중...');
      console.log('[FFmpeg] Starting load (single-threaded version)...');

      // 1. FFmpeg 스크립트 로드
      await loadScript(getProxyURL('ffmpeg.js'));
      onProgress?.(5, 'FFmpeg 스크립트 로드 완료');

      const FFmpegModule = (window as any).FFmpegWASM;
      if (!FFmpegModule?.FFmpeg) {
        throw new Error('FFmpeg 모듈을 찾을 수 없습니다.');
      }

      console.log('[FFmpeg] Creating instance...');
      ffmpegInstance = new FFmpegModule.FFmpeg();

      ffmpegInstance.on('log', ({ message }: { message: string }) => {
        console.log('[FFmpeg]', message);
      });

      ffmpegInstance.on('progress', ({ progress }: { progress: number }) => {
        const percent = Math.round(progress * 100);
        onProgress?.(15 + percent * 0.75, `인코딩 중... ${percent}%`);
      });

      onProgress?.(8, 'WASM 코어 로딩 중...');
      console.log('[FFmpeg] Loading single-threaded WASM core...');

      // 2. Single-threaded 코어 로드 (SharedArrayBuffer 불필요!)
      await ffmpegInstance.load({
        coreURL: `${FFMPEG_CORE_ST}/ffmpeg-core.js`,
        wasmURL: `${FFMPEG_CORE_ST}/ffmpeg-core.wasm`,
      });

      isLoaded = true;
      onProgress?.(12, 'FFmpeg 준비 완료');
      console.log('[FFmpeg] Loaded successfully!');
      
      return ffmpegInstance;
    } catch (error) {
      console.error('[FFmpeg] Load error:', error);
      loadingPromise = null;
      isLoaded = false;
      throw new Error(`FFmpeg 로드 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  })();

  return loadingPromise;
}

/**
 * 파일 데이터 가져오기
 */
async function fetchFileData(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * 렌더링
 */
export async function renderVideo(options: {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  onProgress?: (progress: number, message: string) => void;
}): Promise<{ videoUrl: string; duration: number }> {
  const { imageUrl, audioUrl, aspectRatio, onProgress } = options;

  const ff = await loadFFmpeg(onProgress);

  onProgress?.(13, '파일 준비 중...');

  const imageData = await fetchFileData(imageUrl);
  await ff.writeFile('input.png', imageData);
  console.log('[FFmpeg] Image loaded:', imageData.length);

  const audioData = await fetchFileData(audioUrl);
  await ff.writeFile('input.mp3', audioData);
  console.log('[FFmpeg] Audio loaded:', audioData.length);

  onProgress?.(15, '렌더링 시작...');

  const [w, h] = aspectRatio === '9:16' ? ['720', '1280'] : ['1280', '720'];
  const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

  console.log('[FFmpeg] Encoding...');
  await ff.exec([
    '-loop', '1', '-i', 'input.png',
    '-i', 'input.mp3',
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart', '-y', 'output.mp4',
  ]);

  onProgress?.(92, '비디오 생성 중...');

  const output = await ff.readFile('output.mp4');
  const blob = new Blob([output as BlobPart], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(blob);
  console.log('[FFmpeg] Done! Size:', blob.size);

  try {
    await ff.deleteFile('input.png');
    await ff.deleteFile('input.mp3');
    await ff.deleteFile('output.mp4');
  } catch {}

  onProgress?.(100, '렌더링 완료!');

  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio(audioUrl);
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(10);
  });

  return { videoUrl, duration };
}

export function isFFmpegSupported(): boolean {
  return typeof window !== 'undefined';
}

export async function cleanupFFmpeg(): Promise<void> {
  try { await ffmpegInstance?.terminate?.(); } catch {}
  ffmpegInstance = null;
  isLoaded = false;
  loadingPromise = null;
}
