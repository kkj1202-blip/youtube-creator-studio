'use client';

/**
 * 브라우저 기반 비디오 생성 (Canvas + MediaRecorder)
 * 50~100씬 대량 처리 최적화
 * 
 * 지원 효과:
 * - Ken Burns (줌인, 줌아웃, 패닝, 랜덤)
 * - 페이드 인/아웃
 * - 품질 설정 (해상도, fps, 비트레이트)
 */

export type KenBurnsEffect = 'none' | 'random' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
export type TransitionType = 'none' | 'fade' | 'slide';

export interface RenderOptions {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  onProgress?: (progress: number, message: string) => void;
  
  // 효과 설정
  kenBurns?: KenBurnsEffect;
  kenBurnsIntensity?: number; // 효과 강도 5~50% (기본 15%)
  transition?: TransitionType;
  
  // 품질 설정
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  bitrate?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface RenderResult {
  videoUrl: string;
  videoBlob: Blob;
  duration: number;
}

// 전역 리소스 관리
let globalAudioContext: AudioContext | null = null;

/**
 * 이미지 로드
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}

/**
 * 오디오 길이 가져오기
 */
function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      audio.src = ''; // 리소스 해제
      resolve(dur);
    };
    audio.onerror = () => resolve(10);
    audio.src = url;
  });
}

/**
 * URL을 ArrayBuffer로 변환 (더 효율적)
 */
async function urlToArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return await res.arrayBuffer();
}

/**
 * 해상도 값 가져오기
 */
function getResolution(resolution: string, aspectRatio: '16:9' | '9:16'): [number, number] {
  const resolutions: Record<string, Record<string, [number, number]>> = {
    '720p': { '16:9': [1280, 720], '9:16': [720, 1280] },
    '1080p': { '16:9': [1920, 1080], '9:16': [1080, 1920] },
    '4k': { '16:9': [3840, 2160], '9:16': [2160, 3840] },
  };
  return resolutions[resolution]?.[aspectRatio] || resolutions['1080p'][aspectRatio];
}

/**
 * 비트레이트 값 가져오기 (bps)
 */
function getBitrate(bitrate: string): number {
  const bitrates: Record<string, number> = {
    'low': 2_000_000,
    'medium': 4_000_000,
    'high': 8_000_000,
    'ultra': 12_000_000,
  };
  return bitrates[bitrate] || bitrates['high'];
}

/**
 * 랜덤 Ken Burns 효과 선택
 */
function getRandomKenBurnsEffect(): Exclude<KenBurnsEffect, 'none' | 'random'> {
  const effects: Exclude<KenBurnsEffect, 'none' | 'random'>[] = [
    'zoom-in',
    'zoom-out', 
    'pan-left',
    'pan-right',
    'pan-up',
    'pan-down',
  ];
  return effects[Math.floor(Math.random() * effects.length)];
}

/**
 * Ken Burns 효과 계산
 */
function calculateKenBurnsTransform(
  effect: KenBurnsEffect,
  progress: number,
  width: number,
  height: number,
  intensity: number = 15
): { scale: number; offsetX: number; offsetY: number } {
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  
  const intensityRatio = intensity / 100;
  const easeProgress = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  switch (effect) {
    case 'zoom-in':
      scale = 1 + easeProgress * intensityRatio;
      break;
    case 'zoom-out':
      scale = (1 + intensityRatio) - easeProgress * intensityRatio;
      break;
    case 'pan-left':
      scale = 1 + intensityRatio * 0.5;
      offsetX = (1 - easeProgress) * width * (intensityRatio * 0.7);
      break;
    case 'pan-right':
      scale = 1 + intensityRatio * 0.5;
      offsetX = -(1 - easeProgress) * width * (intensityRatio * 0.7);
      break;
    case 'pan-up':
      scale = 1 + intensityRatio * 0.5;
      offsetY = (1 - easeProgress) * height * (intensityRatio * 0.7);
      break;
    case 'pan-down':
      scale = 1 + intensityRatio * 0.5;
      offsetY = -(1 - easeProgress) * height * (intensityRatio * 0.7);
      break;
  }
  
  return { scale, offsetX, offsetY };
}

/**
 * 리소스 정리
 */
function cleanup(
  audioContext: AudioContext | null,
  audioSource: AudioBufferSourceNode | null,
  stream: MediaStream | null,
  canvas: HTMLCanvasElement | null
) {
  try {
    if (audioSource) {
      try { audioSource.stop(); } catch {}
      try { audioSource.disconnect(); } catch {}
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  } catch (e) {
    console.warn('[Renderer] 정리 중 경고:', e);
  }
}

/**
 * Canvas + MediaRecorder로 비디오 생성
 * 메모리 관리 및 타임아웃 최적화
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  let {
    imageUrl,
    audioUrl,
    aspectRatio,
    onProgress,
    kenBurns = 'none',
    kenBurnsIntensity = 15,
    transition = 'none',
    resolution = '1080p',
    fps = 30,
    bitrate = 'high',
  } = options;

  // 랜덤 효과 처리
  let actualKenBurns = kenBurns;
  if (kenBurns === 'random') {
    actualKenBurns = getRandomKenBurnsEffect();
    console.log(`[Renderer] 랜덤 효과: ${actualKenBurns}`);
  }

  onProgress?.(5, '리소스 로딩 중...');

  const [width, height] = getResolution(resolution, aspectRatio);
  const videoBitrate = getBitrate(bitrate);

  // 리소스 로드
  const [img, duration, audioArrayBuffer] = await Promise.all([
    loadImage(imageUrl),
    getAudioDuration(audioUrl),
    urlToArrayBuffer(audioUrl),
  ]);

  console.log(`[Renderer] 로드 완료: ${width}x${height}, ${duration.toFixed(1)}초`);
  onProgress?.(15, '비디오 준비 중...');

  // Canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 이미지 비율 계산
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  
  let baseWidth: number, baseHeight: number;
  if (imgRatio > canvasRatio) {
    baseHeight = height;
    baseWidth = height * imgRatio;
  } else {
    baseWidth = width;
    baseHeight = width / imgRatio;
  }

  // 프레임 그리기 함수
  function drawFrame(progress: number, alpha: number = 1) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0.05, alpha);
    
    const { scale, offsetX, offsetY } = calculateKenBurnsTransform(
      actualKenBurns, progress, width, height, kenBurnsIntensity
    );
    
    const drawWidth = baseWidth * scale;
    const drawHeight = baseHeight * scale;
    const drawX = (width - drawWidth) / 2 + offsetX;
    const drawY = (height - drawHeight) / 2 + offsetY;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.globalAlpha = 1;
  }

  onProgress?.(25, '비디오 인코딩 시작...');

  // 비디오 스트림
  const videoStream = canvas.captureStream(fps);

  // 오디오 컨텍스트 (새로 생성)
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer.slice(0));
  
  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  
  const destination = audioContext.createMediaStreamDestination();
  audioSource.connect(destination);

  // 스트림 합치기
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  // MediaRecorder 설정
  const mimeTypes = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  
  let selectedMimeType = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: 320_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let animationFrameId: number = 0;
    let progressIntervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;
    let isRecording = true;
    let startTime = 0;

    const cleanupAll = () => {
      isRecording = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (progressIntervalId) clearInterval(progressIntervalId);
      if (timeoutId) clearTimeout(timeoutId);
      cleanup(audioContext, audioSource, combinedStream, canvas);
    };

    recorder.onstop = () => {
      console.log(`[Renderer] 녹화 중지, ${chunks.length}개 청크`);
      onProgress?.(95, '비디오 생성 중...');

      cleanupAll();

      if (chunks.length === 0) {
        reject(new Error('녹화 데이터 없음'));
        return;
      }

      const videoBlob = new Blob(chunks, { type: selectedMimeType });
      console.log(`[Renderer] Blob: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);

      if (videoBlob.size < 50 * 1024) {
        reject(new Error(`비디오 손상 (${(videoBlob.size / 1024).toFixed(1)}KB)`));
        return;
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      onProgress?.(100, '완료!');
      console.log('[Renderer] 완료!');

      resolve({ videoUrl, videoBlob, duration });
    };

    recorder.onerror = (e) => {
      console.error('[Renderer] 오류:', e);
      cleanupAll();
      reject(new Error('녹화 오류'));
    };

    function animateFrame() {
      if (!isRecording) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);
      
      let alpha = 1;
      if (transition === 'fade') {
        const fadeDuration = 0.8;
        if (elapsed < fadeDuration) {
          alpha = elapsed / fadeDuration;
        } else if (elapsed > duration - fadeDuration) {
          alpha = Math.max(0, (duration - elapsed) / fadeDuration);
        }
        alpha = alpha * alpha * (3 - 2 * alpha);
      }
      
      drawFrame(progress, alpha);
      animationFrameId = requestAnimationFrame(animateFrame);
    }

    // 녹화 시작
    console.log('[Renderer] 녹화 시작...');
    recorder.start(200); // 200ms마다 데이터 수집
    audioSource.start();
    startTime = Date.now();
    animateFrame();

    // 진행률
    progressIntervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const percent = Math.min(90, 25 + (elapsed / duration) * 65);
      onProgress?.(percent, `인코딩 중... ${Math.round(elapsed)}/${Math.round(duration)}초`);
    }, 500);

    // 오디오 종료 시 녹화 중지
    audioSource.onended = () => {
      console.log('[Renderer] 오디오 완료');
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 300);
    };

    // 타임아웃 (오디오 길이 + 5초, 최대 2분)
    const maxTime = Math.min(duration * 1000 + 5000, 120000);
    timeoutId = setTimeout(() => {
      if (recorder.state === 'recording') {
        console.log('[Renderer] 타임아웃');
        recorder.stop();
      }
    }, maxTime);
  });
}

/**
 * 비디오 다운로드
 */
export async function downloadVideoWithPicker(
  blob: Blob,
  suggestedName: string = 'video.webm'
): Promise<{ success: boolean; filename?: string }> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{
          description: '비디오 파일',
          accept: { 'video/webm': ['.webm'] },
        }],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { success: true, filename: handle.name };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);

  return { success: true, filename: suggestedName };
}

/**
 * 지원 여부 확인
 */
export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof MediaRecorder !== 'undefined' &&
         typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

/**
 * 정리
 */
export async function cleanupFFmpeg(): Promise<void> {
  if (globalAudioContext && globalAudioContext.state !== 'closed') {
    await globalAudioContext.close();
    globalAudioContext = null;
  }
}
