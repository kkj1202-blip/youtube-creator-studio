'use client';

/**
 * 브라우저 기반 비디오 렌더링 (Canvas + MediaRecorder)
 * 완전 재작성 - 안정성 최우선
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

// ============ 유틸리티 함수 ============

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('이미지 로드 타임아웃 (30초)'));
    }, 30000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = url;
  });
}

async function loadAudioAsBuffer(url: string): Promise<{ buffer: AudioBuffer; arrayBuffer: ArrayBuffer }> {
  console.log('[Audio] 로드 시작:', url.substring(0, 80));
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`오디오 로드 실패: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log('[Audio] 다운로드 완료:', (arrayBuffer.byteLength / 1024).toFixed(1), 'KB');
  
  // AudioContext 생성 (48kHz로 고정하여 품질 보장)
  const audioContext = new AudioContext({ sampleRate: 48000 });
  
  try {
    // suspended 상태면 resume
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    console.log('[Audio] 디코딩 완료:', buffer.duration.toFixed(2), '초,', buffer.numberOfChannels, '채널,', buffer.sampleRate, 'Hz');
    
    await audioContext.close();
    return { buffer, arrayBuffer };
  } catch (error) {
    await audioContext.close();
    throw error;
  }
}

function getResolution(resolution: string, aspectRatio: '16:9' | '9:16'): [number, number] {
  const map: Record<string, Record<string, [number, number]>> = {
    '720p': { '16:9': [1280, 720], '9:16': [720, 1280] },
    '1080p': { '16:9': [1920, 1080], '9:16': [1080, 1920] },
    '4k': { '16:9': [3840, 2160], '9:16': [2160, 3840] },
  };
  return map[resolution]?.[aspectRatio] || map['1080p'][aspectRatio];
}

function getBitrate(bitrate: string): number {
  const map: Record<string, number> = {
    'low': 2_000_000,
    'medium': 4_000_000,
    'high': 8_000_000,
    'ultra': 12_000_000,
  };
  return map[bitrate] || map['high'];
}

function getRandomKenBurns(): Exclude<KenBurnsEffect, 'none' | 'random'> {
  const effects: Exclude<KenBurnsEffect, 'none' | 'random'>[] = [
    'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down',
  ];
  return effects[Math.floor(Math.random() * effects.length)];
}

function calcKenBurns(
  effect: KenBurnsEffect,
  progress: number,
  width: number,
  height: number,
  intensity: number = 15
): { scale: number; offsetX: number; offsetY: number } {
  const ratio = intensity / 100;
  // Smooth ease-in-out
  const t = progress < 0.5 
    ? 2 * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  
  let scale = 1, offsetX = 0, offsetY = 0;
  
  switch (effect) {
    case 'zoom-in':
      scale = 1 + t * ratio;
      break;
    case 'zoom-out':
      scale = (1 + ratio) - t * ratio;
      break;
    case 'pan-left':
      scale = 1 + ratio * 0.5;
      offsetX = (1 - t) * width * ratio * 0.7;
      break;
    case 'pan-right':
      scale = 1 + ratio * 0.5;
      offsetX = -(1 - t) * width * ratio * 0.7;
      break;
    case 'pan-up':
      scale = 1 + ratio * 0.5;
      offsetY = (1 - t) * height * ratio * 0.7;
      break;
    case 'pan-down':
      scale = 1 + ratio * 0.5;
      offsetY = -(1 - t) * height * ratio * 0.7;
      break;
  }
  
  return { scale, offsetX, offsetY };
}

// ============ 메인 렌더링 함수 ============

export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const {
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

  // 랜덤 효과 선택
  const actualKenBurns = kenBurns === 'random' ? getRandomKenBurns() : kenBurns;
  if (kenBurns === 'random') {
    console.log('[Render] 랜덤 효과:', actualKenBurns);
  }

  const [width, height] = getResolution(resolution, aspectRatio);
  const videoBitrate = getBitrate(bitrate);

  console.log('[Render] 시작:', { width, height, fps, bitrate: videoBitrate });
  onProgress?.(5, '리소스 로딩...');

  // 1. 리소스 로드 (병렬)
  let img: HTMLImageElement;
  let audioBuffer: AudioBuffer;
  let audioArrayBuffer: ArrayBuffer;

  try {
    const [imgResult, audioResult] = await Promise.all([
      loadImage(imageUrl),
      loadAudioAsBuffer(audioUrl),
    ]);
    img = imgResult;
    audioBuffer = audioResult.buffer;
    audioArrayBuffer = audioResult.arrayBuffer;
  } catch (error) {
    console.error('[Render] 리소스 로드 실패:', error);
    throw error;
  }

  const duration = audioBuffer.duration;
  console.log('[Render] 리소스 로드 완료. 이미지:', img.width, 'x', img.height, ', 오디오:', duration.toFixed(2), '초');
  
  onProgress?.(15, '캔버스 준비...');

  // 2. Canvas 설정
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // 이미지 비율 계산 (cover 방식)
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  let baseW: number, baseH: number;
  if (imgRatio > canvasRatio) {
    baseH = height;
    baseW = height * imgRatio;
  } else {
    baseW = width;
    baseH = width / imgRatio;
  }

  // 프레임 그리기 함수
  function drawFrame(progress: number, alpha: number = 1) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalAlpha = Math.max(0.02, Math.min(1, alpha));
    
    const { scale, offsetX, offsetY } = calcKenBurns(actualKenBurns, progress, width, height, kenBurnsIntensity);
    
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const drawX = (width - drawW) / 2 + offsetX;
    const drawY = (height - drawH) / 2 + offsetY;
    
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  onProgress?.(20, '오디오 컨텍스트 생성...');

  // 3. AudioContext 생성 (렌더링용, 48kHz)
  const audioContext = new AudioContext({ sampleRate: 48000 });
  
  // suspended 상태 해제
  if (audioContext.state === 'suspended') {
    console.log('[Render] AudioContext resume 시도');
    await audioContext.resume();
  }

  // 오디오 버퍼 재디코딩 (새 AudioContext에서)
  const renderAudioBuffer = await audioContext.decodeAudioData(audioArrayBuffer.slice(0));
  
  // 오디오 소스 생성
  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = renderAudioBuffer;
  
  // GainNode로 볼륨 조절 (음성 뭉개짐 방지)
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 1.0;
  
  // MediaStreamDestination (오디오를 스트림으로 변환)
  const audioDestination = audioContext.createMediaStreamDestination();
  
  // 연결: source -> gain -> destination
  audioSource.connect(gainNode);
  gainNode.connect(audioDestination);

  onProgress?.(25, '스트림 생성...');

  // 4. 비디오 스트림 생성
  const videoStream = canvas.captureStream(fps);
  
  // 5. 스트림 합치기
  const combinedStream = new MediaStream();
  
  // 비디오 트랙 추가
  videoStream.getVideoTracks().forEach(track => {
    combinedStream.addTrack(track);
    console.log('[Render] 비디오 트랙 추가:', track.label);
  });
  
  // 오디오 트랙 추가
  audioDestination.stream.getAudioTracks().forEach(track => {
    combinedStream.addTrack(track);
    console.log('[Render] 오디오 트랙 추가:', track.label);
  });

  const videoTrackCount = combinedStream.getVideoTracks().length;
  const audioTrackCount = combinedStream.getAudioTracks().length;
  console.log('[Render] 합쳐진 스트림:', videoTrackCount, '비디오,', audioTrackCount, '오디오');

  if (audioTrackCount === 0) {
    console.error('[Render] 오디오 트랙이 없습니다!');
  }

  // 6. MediaRecorder 설정
  const mimeTypes = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus', 
    'video/webm',
  ];
  
  let mimeType = 'video/webm';
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }
  console.log('[Render] 코덱:', mimeType);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: 320_000,
  });

  onProgress?.(30, '녹화 준비...');

  // 7. 녹화 실행
  return new Promise<RenderResult>((resolve, reject) => {
    const chunks: Blob[] = [];
    let rafId: number = 0;
    let intervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;
    let startTime = 0;
    let isActive = true;
    let hasStopped = false;

    // 정리 함수
    const cleanup = () => {
      if (!isActive) return;
      isActive = false;
      
      if (rafId) cancelAnimationFrame(rafId);
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      
      try { audioSource.stop(); } catch {}
      try { audioSource.disconnect(); } catch {}
      try { gainNode.disconnect(); } catch {}
      try { combinedStream.getTracks().forEach(t => t.stop()); } catch {}
      try { 
        if (audioContext.state !== 'closed') {
          audioContext.close(); 
        }
      } catch {}
      
      console.log('[Render] 정리 완료');
    };

    // 녹화 중지 안전하게
    const safeStop = () => {
      if (hasStopped) return;
      hasStopped = true;
      
      try {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      } catch (e) {
        console.error('[Render] 녹화 중지 오류:', e);
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      console.log('[Render] 녹화 완료, 청크:', chunks.length);
      cleanup();
      
      if (chunks.length === 0) {
        reject(new Error('녹화 데이터가 없습니다'));
        return;
      }

      const videoBlob = new Blob(chunks, { type: mimeType });
      const sizeMB = videoBlob.size / 1024 / 1024;
      console.log('[Render] 비디오 크기:', sizeMB.toFixed(2), 'MB');

      if (videoBlob.size < 30 * 1024) {
        reject(new Error(`비디오가 너무 작습니다 (${(videoBlob.size / 1024).toFixed(1)}KB)`));
        return;
      }

      const videoUrl = URL.createObjectURL(videoBlob);
      onProgress?.(100, '완료!');
      
      resolve({ videoUrl, videoBlob, duration });
    };

    recorder.onerror = (e) => {
      console.error('[Render] 녹화 오류:', e);
      cleanup();
      reject(new Error('녹화 중 오류 발생'));
    };

    // 프레임 애니메이션
    const animate = () => {
      if (!isActive) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);
      
      // 페이드 효과
      let alpha = 1;
      if (transition === 'fade') {
        const fadeTime = 0.6;
        if (elapsed < fadeTime) {
          alpha = elapsed / fadeTime;
        } else if (elapsed > duration - fadeTime) {
          alpha = Math.max(0, (duration - elapsed) / fadeTime);
        }
        // smoothstep
        alpha = alpha * alpha * (3 - 2 * alpha);
      }
      
      drawFrame(progress, alpha);
      rafId = requestAnimationFrame(animate);
    };

    // 오디오 종료 이벤트
    audioSource.onended = () => {
      console.log('[Render] 오디오 재생 종료');
      setTimeout(safeStop, 200);
    };

    // 진행률 업데이트
    intervalId = setInterval(() => {
      if (!isActive) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(95, 30 + (elapsed / duration) * 65);
      onProgress?.(pct, `녹화 중... ${Math.round(elapsed)}/${Math.round(duration)}초`);
    }, 500);

    // 타임아웃 (오디오 길이 + 10초, 최대 5분)
    const maxDuration = Math.min((duration + 10) * 1000, 300000);
    timeoutId = setTimeout(() => {
      console.log('[Render] 타임아웃');
      safeStop();
    }, maxDuration);

    // ========== 녹화 시작 ==========
    console.log('[Render] 녹화 시작...');
    
    // 1) 오디오 먼저 시작
    audioSource.start(0);
    
    // 2) 약간 지연 후 녹화 시작 (오디오 동기화)
    setTimeout(() => {
      if (!isActive) return;
      
      try {
        recorder.start(200); // 200ms마다 데이터 수집
        startTime = Date.now();
        animate();
        console.log('[Render] 녹화 진행 중');
        onProgress?.(35, '녹화 중...');
      } catch (e) {
        console.error('[Render] 녹화 시작 실패:', e);
        cleanup();
        reject(e);
      }
    }, 100);
  });
}

// ============ 다운로드 함수 ============

export async function downloadVideoWithPicker(
  blob: Blob,
  suggestedName: string = 'video.webm'
): Promise<{ success: boolean; filename?: string }> {
  // File System Access API 시도
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
      // fallback to download
    }
  }

  // Fallback: 다운로드 링크
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

// ============ 지원 체크 ============

export function isFFmpegSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof AudioContext !== 'undefined'
  );
}

export async function cleanupFFmpeg(): Promise<void> {
  // 브라우저 렌더링은 별도 정리 불필요
}
