'use client';

/**
 * 브라우저 기반 비디오 생성 (Canvas + MediaRecorder)
 * 설치 없이 브라우저에서 직접 비디오 생성
 * 
 * 지원 효과:
 * - Ken Burns (줌인, 줌아웃, 패닝)
 * - 페이드 인/아웃
 * - 품질 설정 (해상도, fps, 비트레이트)
 */

export type KenBurnsEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
export type TransitionType = 'none' | 'fade' | 'slide';

export interface RenderOptions {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  onProgress?: (progress: number, message: string) => void;
  
  // 효과 설정
  kenBurns?: KenBurnsEffect;
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
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(10);
    audio.src = url;
  });
}

/**
 * URL을 Blob으로 변환
 */
async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return await res.blob();
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
 * Ken Burns 효과 계산
 */
function calculateKenBurnsTransform(
  effect: KenBurnsEffect,
  progress: number, // 0 ~ 1
  width: number,
  height: number
): { scale: number; offsetX: number; offsetY: number } {
  // 기본값
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  
  // 부드러운 easing (ease-in-out)
  const easeProgress = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  switch (effect) {
    case 'zoom-in':
      // 1.0 -> 1.2 (20% 확대)
      scale = 1 + easeProgress * 0.2;
      break;
      
    case 'zoom-out':
      // 1.2 -> 1.0 (축소)
      scale = 1.2 - easeProgress * 0.2;
      break;
      
    case 'pan-left':
      // 오른쪽에서 왼쪽으로
      scale = 1.15;
      offsetX = (1 - easeProgress) * width * 0.1;
      break;
      
    case 'pan-right':
      // 왼쪽에서 오른쪽으로
      scale = 1.15;
      offsetX = -(1 - easeProgress) * width * 0.1;
      break;
      
    case 'pan-up':
      // 아래에서 위로
      scale = 1.15;
      offsetY = (1 - easeProgress) * height * 0.1;
      break;
      
    case 'pan-down':
      // 위에서 아래로
      scale = 1.15;
      offsetY = -(1 - easeProgress) * height * 0.1;
      break;
  }
  
  return { scale, offsetX, offsetY };
}

/**
 * Canvas + MediaRecorder로 비디오 생성 (효과 포함)
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const {
    imageUrl,
    audioUrl,
    aspectRatio,
    onProgress,
    kenBurns = 'none',
    transition = 'none',
    resolution = '1080p',
    fps = 30,
    bitrate = 'high',
  } = options;

  onProgress?.(5, '리소스 로딩 중...');
  console.log('[Renderer] 시작:', { kenBurns, transition, resolution, fps, bitrate });

  // 해상도 설정
  const [width, height] = getResolution(resolution, aspectRatio);
  const videoBitrate = getBitrate(bitrate);
  
  console.log(`[Renderer] 해상도: ${width}x${height}, FPS: ${fps}, 비트레이트: ${videoBitrate / 1_000_000}Mbps`);

  // 이미지 및 오디오 로드
  const [img, duration] = await Promise.all([
    loadImage(imageUrl),
    getAudioDuration(audioUrl),
  ]);

  console.log(`[Renderer] 로드 완료: 이미지 ${img.width}x${img.height}, 오디오 ${duration.toFixed(1)}초`);
  onProgress?.(15, '비디오 준비 중...');

  // Canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 이미지 비율 계산
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  
  // 기본 이미지 그리기 위치 (cover 방식)
  let baseWidth: number, baseHeight: number;
  if (imgRatio > canvasRatio) {
    baseHeight = height;
    baseWidth = height * imgRatio;
  } else {
    baseWidth = width;
    baseHeight = width / imgRatio;
  }

  /**
   * 캔버스에 프레임 그리기 (효과 포함)
   */
  function drawFrame(progress: number, alpha: number = 1) {
    // 배경
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // 투명도 (페이드 효과)
    ctx.globalAlpha = alpha;
    
    // Ken Burns 효과 계산
    const { scale, offsetX, offsetY } = calculateKenBurnsTransform(kenBurns, progress, width, height);
    
    // 변환 적용
    const drawWidth = baseWidth * scale;
    const drawHeight = baseHeight * scale;
    const drawX = (width - drawWidth) / 2 + offsetX;
    const drawY = (height - drawHeight) / 2 + offsetY;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    // 투명도 복원
    ctx.globalAlpha = 1;
  }

  onProgress?.(25, '비디오 인코딩 시작...');

  // 비디오 스트림 캡처
  const videoStream = canvas.captureStream(fps);
  console.log('[Renderer] 비디오 스트림 생성 완료');

  // 오디오 처리
  const audioContext = new AudioContext();
  const audioBlob = await urlToBlob(audioUrl);
  const audioArrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
  console.log(`[Renderer] 오디오 디코딩 완료: ${audioBuffer.duration.toFixed(1)}초`);

  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;

  const destination = audioContext.createMediaStreamDestination();
  audioSource.connect(destination);

  // 비디오 + 오디오 스트림 합치기
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  // MediaRecorder 설정
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  
  let selectedMimeType = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }
  console.log(`[Renderer] 코덱: ${selectedMimeType}`);

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
    let animationFrameId: number;
    let progressIntervalId: NodeJS.Timeout;
    let isRecording = true;
    let startTime = 0;

    recorder.onstop = async () => {
      console.log(`[Renderer] 녹화 중지, ${chunks.length}개 청크`);
      onProgress?.(95, '비디오 생성 중...');

      isRecording = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (progressIntervalId) clearInterval(progressIntervalId);

      if (chunks.length === 0) {
        reject(new Error('녹화 데이터가 없습니다.'));
        return;
      }

      const videoBlob = new Blob(chunks, { type: selectedMimeType });
      console.log(`[Renderer] Blob 생성: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);

      if (videoBlob.size < 100 * 1024) {
        reject(new Error(`비디오 파일 손상 (${(videoBlob.size / 1024).toFixed(1)}KB)`));
        return;
      }

      const videoUrl = URL.createObjectURL(videoBlob);

      try {
        audioSource.stop();
        audioContext.close();
      } catch {}

      onProgress?.(100, '완료!');
      console.log('[Renderer] 완료!');

      resolve({ videoUrl, videoBlob, duration });
    };

    recorder.onerror = () => {
      isRecording = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (progressIntervalId) clearInterval(progressIntervalId);
      reject(new Error('녹화 오류'));
    };

    /**
     * 애니메이션 프레임 렌더링
     */
    function animateFrame() {
      if (!isRecording) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);
      
      // 페이드 효과
      let alpha = 1;
      if (transition === 'fade') {
        const fadeDuration = 0.5; // 0.5초 페이드
        if (elapsed < fadeDuration) {
          // 페이드 인
          alpha = elapsed / fadeDuration;
        } else if (elapsed > duration - fadeDuration) {
          // 페이드 아웃
          alpha = (duration - elapsed) / fadeDuration;
        }
      }
      
      drawFrame(progress, alpha);
      animationFrameId = requestAnimationFrame(animateFrame);
    }

    // 녹화 시작
    console.log('[Renderer] 녹화 시작...');
    recorder.start(100);
    audioSource.start();
    startTime = Date.now();
    animateFrame();

    // 진행률 업데이트
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
      }, 500);
    };

    // 안전장치
    setTimeout(() => {
      if (recorder.state === 'recording') {
        console.log('[Renderer] 시간 초과');
        recorder.stop();
      }
    }, Math.max(duration * 1000 + 2000, 30000));
  });
}

/**
 * 비디오 다운로드 (저장 위치 직접 선택)
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
export async function cleanupFFmpeg(): Promise<void> {}
