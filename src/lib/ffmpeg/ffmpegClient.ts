'use client';

/**
 * 브라우저 기반 비디오 렌더링 v3.0
 * - 안정성 최우선
 * - CORS 처리 개선
 * - Ken Burns 효과 정상화
 * - 영상 품질 개선
 */

export type KenBurnsEffect = 'none' | 'random' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
export type TransitionType = 'none' | 'fade' | 'slide';

export interface RenderOptions {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  onProgress?: (progress: number, message: string) => void;
  kenBurns?: KenBurnsEffect;
  kenBurnsIntensity?: number;
  transition?: TransitionType;
  resolution?: '720p' | '1080p' | '4k';
  fps?: 24 | 30 | 60;
  bitrate?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface RenderResult {
  videoUrl: string;
  videoBlob: Blob;
  duration: number;
}

// ============ 이미지 로딩 (CORS 처리 강화) ============

async function loadImageSafe(url: string): Promise<HTMLImageElement> {
  console.log('[Image] 로딩 시작:', url.substring(0, 100));
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 타임아웃
    const timeout = setTimeout(() => {
      console.error('[Image] 타임아웃');
      reject(new Error('이미지 로드 타임아웃'));
    }, 60000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log('[Image] 로딩 완료:', img.width, 'x', img.height);
      
      if (img.width === 0 || img.height === 0) {
        reject(new Error('이미지 크기가 0입니다'));
        return;
      }
      
      resolve(img);
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error('[Image] 로딩 실패:', e);
      reject(new Error('이미지 로드 실패 - CORS 또는 URL 문제'));
    };
    
    // CORS 설정
    img.crossOrigin = 'anonymous';
    
    // data: URL은 그대로, 아니면 프록시 고려
    if (url.startsWith('data:')) {
      img.src = url;
    } else {
      // 외부 URL
      img.src = url;
    }
  });
}

// ============ 오디오 로딩 ============

async function loadAudioSafe(url: string): Promise<{ duration: number; arrayBuffer: ArrayBuffer }> {
  console.log('[Audio] 로딩 시작:', url.substring(0, 100));
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('[Audio] 다운로드 완료:', (arrayBuffer.byteLength / 1024).toFixed(1), 'KB');
    
    // 임시 AudioContext로 duration 확인
    const tempCtx = new AudioContext();
    try {
      const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      const duration = decoded.duration;
      console.log('[Audio] 디코딩 완료:', duration.toFixed(2), '초');
      await tempCtx.close();
      return { duration, arrayBuffer };
    } catch (e) {
      await tempCtx.close();
      throw e;
    }
  } catch (error) {
    console.error('[Audio] 로딩 실패:', error);
    throw new Error('오디오 로드 실패: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// ============ 해상도/비트레이트 ============

function getResolution(res: string, ar: '16:9' | '9:16'): [number, number] {
  const map: Record<string, Record<string, [number, number]>> = {
    '720p': { '16:9': [1280, 720], '9:16': [720, 1280] },
    '1080p': { '16:9': [1920, 1080], '9:16': [1080, 1920] },
    '4k': { '16:9': [3840, 2160], '9:16': [2160, 3840] },
  };
  return map[res]?.[ar] || [1920, 1080];
}

function getBitrate(br: string): number {
  const map: Record<string, number> = {
    'low': 3_000_000,
    'medium': 6_000_000,
    'high': 10_000_000,
    'ultra': 15_000_000,
  };
  return map[br] || 10_000_000;
}

// ============ Ken Burns 효과 ============

function getRandomKenBurns(): KenBurnsEffect {
  const effects: KenBurnsEffect[] = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];
  return effects[Math.floor(Math.random() * effects.length)];
}

function calculateKenBurns(
  effect: KenBurnsEffect,
  progress: number,  // 0 ~ 1
  intensity: number = 15  // 5 ~ 50
): { scale: number; translateX: number; translateY: number } {
  // 더 강한 효과를 위해 intensity 증폭
  const power = intensity / 100 * 1.5;
  
  // ease-in-out 곡선
  const t = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  
  switch (effect) {
    case 'zoom-in':
      // 1.0 -> 1.0 + power (예: 1.0 -> 1.225)
      scale = 1.0 + t * power;
      break;
      
    case 'zoom-out':
      // 1.0 + power -> 1.0 (예: 1.225 -> 1.0)
      scale = (1.0 + power) - t * power;
      break;
      
    case 'pan-left':
      // 오른쪽에서 왼쪽으로 이동
      scale = 1.0 + power * 0.5;
      translateX = (0.5 - t) * power * 100;  // 양수 -> 음수
      break;
      
    case 'pan-right':
      // 왼쪽에서 오른쪽으로 이동
      scale = 1.0 + power * 0.5;
      translateX = (t - 0.5) * power * 100;  // 음수 -> 양수
      break;
      
    case 'pan-up':
      // 아래에서 위로 이동
      scale = 1.0 + power * 0.5;
      translateY = (0.5 - t) * power * 100;
      break;
      
    case 'pan-down':
      // 위에서 아래로 이동
      scale = 1.0 + power * 0.5;
      translateY = (t - 0.5) * power * 100;
      break;
      
    default:
      scale = 1.0;
  }
  
  return { scale, translateX, translateY };
}

// ============ 메인 렌더링 함수 ============

export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const {
    imageUrl,
    audioUrl,
    aspectRatio = '16:9',
    onProgress,
    kenBurns = 'none',
    kenBurnsIntensity = 15,
    transition = 'none',
    resolution = '1080p',
    fps = 30,
    bitrate = 'high',
  } = options;

  console.log('========================================');
  console.log('[Render] 렌더링 시작');
  console.log('[Render] 설정:', { aspectRatio, kenBurns, kenBurnsIntensity, transition, resolution, fps, bitrate });
  
  // 실제 Ken Burns 효과 결정
  const actualKenBurns = kenBurns === 'random' ? getRandomKenBurns() : kenBurns;
  console.log('[Render] Ken Burns 효과:', actualKenBurns, '강도:', kenBurnsIntensity);

  onProgress?.(5, '리소스 로딩 중...');

  // 1. 리소스 로드
  let img: HTMLImageElement;
  let audioDuration: number;
  let audioArrayBuffer: ArrayBuffer;

  try {
    const [imgResult, audioResult] = await Promise.all([
      loadImageSafe(imageUrl),
      loadAudioSafe(audioUrl),
    ]);
    img = imgResult;
    audioDuration = audioResult.duration;
    audioArrayBuffer = audioResult.arrayBuffer;
  } catch (error) {
    console.error('[Render] 리소스 로드 실패:', error);
    throw error;
  }

  const duration = audioDuration;
  console.log('[Render] 리소스 준비 완료');
  console.log('[Render] 이미지:', img.width, 'x', img.height);
  console.log('[Render] 오디오:', duration.toFixed(2), '초');

  onProgress?.(15, '캔버스 설정 중...');

  // 2. Canvas 설정
  const [canvasWidth, canvasHeight] = getResolution(resolution, aspectRatio);
  const videoBitrate = getBitrate(bitrate);
  
  console.log('[Render] 캔버스:', canvasWidth, 'x', canvasHeight);
  console.log('[Render] 비트레이트:', (videoBitrate / 1_000_000).toFixed(1), 'Mbps');

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  const ctx = canvas.getContext('2d', { 
    alpha: false,
    desynchronized: true,  // 성능 향상
  });
  
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트 생성 실패');
  }

  // 이미지 렌더링 품질 설정
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 이미지 커버 방식 계산
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let baseWidth: number, baseHeight: number;
  if (imgRatio > canvasRatio) {
    baseHeight = canvasHeight;
    baseWidth = canvasHeight * imgRatio;
  } else {
    baseWidth = canvasWidth;
    baseHeight = canvasWidth / imgRatio;
  }

  // 프레임 그리기 함수
  function drawFrame(progress: number, alpha: number = 1.0) {
    // 배경 (검정)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 투명도 적용
    ctx.globalAlpha = Math.max(0.01, Math.min(1.0, alpha));
    
    // Ken Burns 변환 계산
    const { scale, translateX, translateY } = calculateKenBurns(actualKenBurns, progress, kenBurnsIntensity);
    
    // 최종 크기
    const drawW = baseWidth * scale;
    const drawH = baseHeight * scale;
    
    // 중앙 배치 + 이동
    const drawX = (canvasWidth - drawW) / 2 + (translateX * canvasWidth / 100);
    const drawY = (canvasHeight - drawH) / 2 + (translateY * canvasHeight / 100);
    
    // 이미지 그리기
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    
    // 투명도 복원
    ctx.globalAlpha = 1.0;
  }

  onProgress?.(20, '오디오 준비 중...');

  // 3. AudioContext 설정
  const audioContext = new AudioContext({ sampleRate: 48000 });
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // 오디오 버퍼 디코딩
  const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer.slice(0));
  
  // 오디오 소스
  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  
  // Gain 노드 (볼륨)
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0;
  
  // MediaStream 출력
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // 연결
  audioSource.connect(gainNode);
  gainNode.connect(audioDestination);

  onProgress?.(25, '스트림 생성 중...');

  // 4. 비디오 스트림
  const videoStream = canvas.captureStream(fps);
  
  // 5. 합성 스트림
  const combinedStream = new MediaStream();
  
  // 비디오 트랙
  const videoTracks = videoStream.getVideoTracks();
  videoTracks.forEach(track => combinedStream.addTrack(track));
  console.log('[Render] 비디오 트랙:', videoTracks.length);
  
  // 오디오 트랙
  const audioTracks = audioDestination.stream.getAudioTracks();
  audioTracks.forEach(track => combinedStream.addTrack(track));
  console.log('[Render] 오디오 트랙:', audioTracks.length);

  // 6. MediaRecorder
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  
  let selectedMime = 'video/webm';
  for (const mime of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMime = mime;
      break;
    }
  }
  console.log('[Render] 코덱:', selectedMime);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: 320000,
  });

  onProgress?.(30, '녹화 시작...');

  // 7. 녹화 실행
  return new Promise<RenderResult>((resolve, reject) => {
    const chunks: Blob[] = [];
    let animationId = 0;
    let progressInterval: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;
    let renderStartTime = 0;
    let isActive = true;
    let stopped = false;

    // 정리 함수
    const cleanup = () => {
      if (!isActive) return;
      isActive = false;
      
      cancelAnimationFrame(animationId);
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      
      try { audioSource.stop(); } catch {}
      try { audioSource.disconnect(); } catch {}
      try { gainNode.disconnect(); } catch {}
      try { combinedStream.getTracks().forEach(t => t.stop()); } catch {}
      try { if (audioContext.state !== 'closed') audioContext.close(); } catch {}
    };

    // 안전한 녹화 중지
    const stopRecording = () => {
      if (stopped) return;
      stopped = true;
      
      console.log('[Render] 녹화 중지 요청');
      
      try {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      } catch (e) {
        console.error('[Render] 중지 오류:', e);
        cleanup();
        reject(e);
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      console.log('[Render] 녹화 완료');
      console.log('[Render] 청크 수:', chunks.length);
      
      cleanup();

      if (chunks.length === 0) {
        reject(new Error('녹화 데이터가 없습니다'));
        return;
      }

      const videoBlob = new Blob(chunks, { type: selectedMime });
      const sizeMB = videoBlob.size / 1024 / 1024;
      console.log('[Render] 비디오 크기:', sizeMB.toFixed(2), 'MB');

      if (videoBlob.size < 10 * 1024) {
        reject(new Error('비디오 파일이 손상되었습니다'));
        return;
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      
      onProgress?.(100, '완료!');
      console.log('[Render] 렌더링 성공!');
      console.log('========================================');

      resolve({ videoUrl, videoBlob, duration });
    };

    recorder.onerror = (e) => {
      console.error('[Render] 녹화 오류:', e);
      cleanup();
      reject(new Error('녹화 중 오류가 발생했습니다'));
    };

    // 프레임 렌더링 루프
    const renderLoop = () => {
      if (!isActive) return;

      const elapsed = (Date.now() - renderStartTime) / 1000;
      const progress = Math.min(1.0, elapsed / duration);

      // 페이드 효과
      let alpha = 1.0;
      if (transition === 'fade') {
        const fadeTime = 0.5;
        if (elapsed < fadeTime) {
          alpha = elapsed / fadeTime;
        } else if (elapsed > duration - fadeTime) {
          alpha = (duration - elapsed) / fadeTime;
        }
        alpha = Math.max(0.01, alpha);
      }

      // 프레임 그리기
      drawFrame(progress, alpha);

      // 다음 프레임
      if (progress < 1.0) {
        animationId = requestAnimationFrame(renderLoop);
      }
    };

    // 오디오 종료 시 녹화 중지
    audioSource.onended = () => {
      console.log('[Render] 오디오 재생 종료');
      setTimeout(stopRecording, 300);
    };

    // 진행률 업데이트
    progressInterval = setInterval(() => {
      if (!isActive) return;
      const elapsed = (Date.now() - renderStartTime) / 1000;
      const pct = Math.min(95, 30 + (elapsed / duration) * 65);
      onProgress?.(Math.round(pct), `녹화 중... ${Math.round(elapsed)}/${Math.round(duration)}초`);
    }, 300);

    // 타임아웃 (오디오 길이 + 15초, 최대 10분)
    const maxTime = Math.min((duration + 15) * 1000, 600000);
    timeoutId = setTimeout(() => {
      console.log('[Render] 타임아웃 - 강제 종료');
      stopRecording();
    }, maxTime);

    // ===== 녹화 시작 =====
    console.log('[Render] 녹화 시작!');
    
    // 첫 프레임 그리기
    drawFrame(0, transition === 'fade' ? 0.01 : 1.0);
    
    // 오디오 시작
    audioSource.start(0);
    
    // 약간 지연 후 녹화 시작
    setTimeout(() => {
      if (!isActive) return;
      
      try {
        recorder.start(100);  // 100ms마다 데이터
        renderStartTime = Date.now();
        renderLoop();
        onProgress?.(35, '녹화 진행 중...');
      } catch (e) {
        console.error('[Render] 시작 실패:', e);
        cleanup();
        reject(e);
      }
    }, 50);
  });
}

// ============ 유틸리티 함수 ============

export async function downloadVideoWithPicker(
  blob: Blob,
  suggestedName: string = 'video.webm'
): Promise<{ success: boolean; filename?: string }> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{ description: '비디오', accept: { 'video/webm': ['.webm'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, filename: handle.name };
    } catch (err) {
      if ((err as Error).name === 'AbortError') return { success: false };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true, filename: suggestedName };
}

export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof AudioContext !== 'undefined'
  );
}

export async function cleanupFFmpeg(): Promise<void> {}
