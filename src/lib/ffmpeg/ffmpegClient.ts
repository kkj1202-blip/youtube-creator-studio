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
export type MotionEffect = 'none' | 'breathing' | 'pulse' | 'float' | 'shake' | 'eye-blink' | 'head-bob' | 'subtle-life' | 'parallax-soft' | 'parallax-medium' | 'parallax-strong';

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
  // 모션 효과
  motionEffect?: MotionEffect;
  motionIntensity?: number;
  duration?: number; // 명시적 영상 길이 (초)
  padding?: number; // 오디오 후 추가 여백 (초) - duration이 없을 때 사용
  text?: string; // 자막 텍스트
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

// ============ 오디오 로딩 (볼륨 정규화 포함) ============

/**
 * 오디오 피크 볼륨 분석
 * 가장 큰 샘플값을 찾아 반환 (0.0 ~ 1.0)
 */
function analyzePeakVolume(audioBuffer: AudioBuffer): number {
  let peak = 0;
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const absValue = Math.abs(data[i]);
      if (absValue > peak) {
        peak = absValue;
      }
    }
  }
  
  return peak;
}

/**
 * 목표 볼륨까지 정규화할 gain 값 계산
 * targetPeak: 목표 피크 (기본 0.9 = -0.9dB, 클리핑 방지)
 */
function calculateNormalizationGain(currentPeak: number, targetPeak: number = 0.9): number {
  if (currentPeak <= 0) return 1.0;
  
  const gain = targetPeak / currentPeak;
  
  // 너무 과도한 증폭 방지 (최대 3배)
  return Math.min(gain, 3.0);
}

async function loadAudioSafe(url: string): Promise<{ 
  duration: number; 
  arrayBuffer: ArrayBuffer;
  normalizationGain: number;
}> {
  console.log('[Audio] 로딩 시작:', url.substring(0, 100));
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('[Audio] 다운로드 완료:', (arrayBuffer.byteLength / 1024).toFixed(1), 'KB');
    
    // 임시 AudioContext로 분석
    const tempCtx = new AudioContext();
    try {
      // 복사본으로 디코딩 (원본 보존)
      const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      const duration = decoded.duration;
      
      // 피크 볼륨 분석
      const peak = analyzePeakVolume(decoded);
      const normalizationGain = calculateNormalizationGain(peak, 0.92); // 목표 92% (일관성 향상)
      
      console.log('[Audio] 디코딩 완료:', duration.toFixed(2), '초');
      console.log('[Audio] 피크 볼륨:', (peak * 100).toFixed(1) + '%');
      console.log('[Audio] 정규화 Gain:', normalizationGain.toFixed(2) + 'x');
      
      await tempCtx.close();
      return { duration, arrayBuffer, normalizationGain };
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
    'low': 5_000_000,      // 5Mbps (상향)
    'medium': 10_000_000,  // 10Mbps (상향)
    'high': 15_000_000,    // 15Mbps (상향)
    'ultra': 25_000_000,   // 25Mbps (고품질)
  };
  return map[br] || 15_000_000;  // 기본값도 high로 상향
}

// ============ Ken Burns 효과 ============

function getRandomKenBurns(): KenBurnsEffect {
  const effects: KenBurnsEffect[] = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down'];
  return effects[Math.floor(Math.random() * effects.length)];
}

/**
 * Ken Burns 효과 계산
 * @param effect - 효과 종류
 * @param progress - 진행률 (0 ~ 1)
 * @param intensity - 기본 강도 (5 ~ 50)
 * @param duration - 영상 길이 (초) - 자동 스케일링용
 */
function calculateKenBurns(
  effect: KenBurnsEffect,
  progress: number,  // 0 ~ 1
  intensity: number = 10,  // 5 ~ 50, 기본값 더 느리게
  duration: number = 5  // 영상 길이 (초)
): { scale: number; translateX: number; translateY: number } {
  // ============ 영상 길이 기반 자동 스케일링 ============
  // 기준: 5초 영상에서 기본 intensity가 적용됨
  // - 짧은 영상(2초): 효과량 증가 (더 빠르게 움직여야 체감 동일)
  // - 긴 영상(10초): 효과량 감소 (느리게 움직여야 체감 동일)
  
  const baseDuration = 5;  // 기준 영상 길이 (초)
  
  // 스케일 팩터: 영상 길이에 반비례 (더 긴 영상 = 느린 체감 속도)
  // 예: 10초 영상 = 0.5배 효과 (느리게), 2.5초 영상 = 2배 효과 (빠르게)
  // 단, 너무 극단적이지 않게 0.3 ~ 2.0 범위로 제한
  const durationScale = Math.max(0.3, Math.min(2.0, baseDuration / duration));
  
  // 최종 intensity 계산 (영상 길이에 반비례)
  const scaledIntensity = intensity * durationScale;
  
  // intensity를 0.1 ~ 2.0 범위로 변환 (더 강한 효과)
  // 기존 /100 → /50으로 변경하여 사용자 설정값이 더 직관적으로 반영
  const power = Math.max(0.1, Math.min(2.0, scaledIntensity / 50));
  
  // 선형 보간 (linear) - 영상 전체에 걸쳐 균일하게 움직임
  // 기존 ease-in-out은 끝부분에서 멈춘 것처럼 보이는 문제 있음
  const t = progress;
  
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  
  // 검은 테두리 방지: 패닝 시 최소 scale 보장
  const minScaleForPan = 1.0 + power * 2;
  
  switch (effect) {
    case 'zoom-in':
      // 1.0 -> 1.0 + power*1.5
      scale = 1.02 + t * power * 1.5;
      break;
      
    case 'zoom-out':
      // 1.0 + power*1.5 -> 1.02
      scale = (1.02 + power * 1.5) - t * power * 1.5;
      break;
      
    case 'pan-left':
      scale = minScaleForPan;
      const maxTranslateX = (scale - 1) / 2 * 80;
      translateX = (0.5 - t) * maxTranslateX * 2;
      break;
      
    case 'pan-right':
      scale = minScaleForPan;
      const maxTranslateXR = (scale - 1) / 2 * 80;
      translateX = (t - 0.5) * maxTranslateXR * 2;
      break;
      
    case 'pan-up':
      scale = minScaleForPan;
      const maxTranslateY = (scale - 1) / 2 * 80;
      translateY = (0.5 - t) * maxTranslateY * 2;
      break;
      
    case 'pan-down':
      scale = minScaleForPan;
      const maxTranslateYD = (scale - 1) / 2 * 80;
      translateY = (t - 0.5) * maxTranslateYD * 2;
      break;
      
    case 'none':
    default:
      scale = 1.0;
      translateX = 0;
      translateY = 0;
  }
  
  return { scale, translateX, translateY };
}

// ============ 모션 효과 계산 ============

function calculateMotionEffect(
  effect: MotionEffect,
  time: number,  // 현재 시간 (초)
  intensity: number = 1.0
): { scale: number; translateX: number; translateY: number; rotate: number } {
  const i = intensity;
  const t = time;
  
  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;
  let rotate = 0;
  
  switch (effect) {
    case 'breathing':
      scale = 1 + Math.sin(t * 0.8) * 0.02 * i;
      break;
      
    case 'pulse':
      const pulsePhase = (t * 1.5) % (Math.PI * 2);
      scale = 1 + Math.pow(Math.sin(pulsePhase), 4) * 0.03 * i;
      break;
      
    case 'float':
      translateY = Math.sin(t * 0.6) * 8 * i;
      rotate = Math.sin(t * 0.4) * 1 * i;
      break;
      
    case 'shake':
      translateX = Math.sin(t * 50) * 2 * i;
      translateY = Math.cos(t * 47) * 2 * i;
      rotate = Math.sin(t * 43) * 0.5 * i;
      break;
      
    case 'eye-blink':
      // 눈 깜박임 효과: 미세한 스케일 변화로 표현 (화면 깜박임 없음)
      const blinkPhase = (t * 0.25) % 1;
      // 4초 주기로 살짝 줄어들었다 커지는 효과
      scale = blinkPhase > 0.95 || blinkPhase < 0.05 ? 0.995 : 1.0;
      break;
      
    case 'head-bob':
      translateY = Math.sin(t * 1.2) * 3 * i;
      rotate = Math.sin(t * 0.8) * 1.5 * i;
      break;
      
    case 'subtle-life':
      // 호흡 (미세한 스케일 변화)
      scale = 1 + Math.sin(t * 0.6) * 0.008 * i;
      // 미세한 좌우 흔들림
      translateX = Math.sin(t * 0.4) * 1.5 * i;
      // 미세한 위아래 흔들림 (호흡처럼)
      translateY = Math.sin(t * 0.5) * 0.5 * i;
      // brightness 제거 - 화면 깜박임 방지
      break;
      
    default:
      break;
  }
  
  return { scale, translateX, translateY, rotate };
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
    motionEffect = 'none',
    motionIntensity = 1.0,
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
  let audioNormalizationGain: number;

  try {
    const [imgResult, audioResult] = await Promise.all([
      loadImageSafe(imageUrl),
      loadAudioSafe(audioUrl),
    ]);
    img = imgResult;
    audioDuration = audioResult.duration;
    audioArrayBuffer = audioResult.arrayBuffer;
    audioNormalizationGain = audioResult.normalizationGain;
  } catch (error) {
    console.error('[Render] 리소스 로드 실패:', error);
    throw error;
  }

  // 명시적 duration 우선, 없으면 오디오 길이 + 패딩
  const duration = options.duration || (audioDuration + (options.padding || 0));
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
  })!;
  
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
  function drawFrame(progress: number, alpha: number = 1.0, currentTime: number = 0) {
    // 배경 (검정)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 투명도 적용
    ctx.globalAlpha = Math.max(0.01, Math.min(1.0, alpha));
    
    // Ken Burns 변환 계산 (영상 길이에 맞게 자동 조절)
    const kb = calculateKenBurns(actualKenBurns, progress, kenBurnsIntensity, duration);
    
    // 모션 효과 계산
    const me = calculateMotionEffect(motionEffect as MotionEffect, currentTime, motionIntensity);
    
    // Ken Burns + Motion Effect 결합
    const combinedScale = kb.scale * me.scale;
    const combinedTranslateX = kb.translateX + (me.translateX * 100 / canvasWidth);
    const combinedTranslateY = kb.translateY + (me.translateY * 100 / canvasHeight);
    
    // 최종 크기
    const drawW = baseWidth * combinedScale;
    const drawH = baseHeight * combinedScale;
    
    // 중앙 배치 + 이동
    const drawX = (canvasWidth - drawW) / 2 + (combinedTranslateX * canvasWidth / 100);
    const drawY = (canvasHeight - drawH) / 2 + (combinedTranslateY * canvasHeight / 100);
    
    // 회전 효과 적용
    if (me.rotate !== 0) {
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate(me.rotate * Math.PI / 180);
      ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // 이미지 그리기
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    
    // 투명도 복원
    ctx.globalAlpha = 1.0;

    // ============ 자막 그리기 (Subtitles) ============
    if (options.text) {
      const fontSize = Math.floor(canvasHeight * 0.05); // 높이의 5%
      ctx.font = `bold ${fontSize}px "Pretendard", "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // 자막 스타일
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = fontSize * 0.15;
      ctx.lineJoin = 'round';
      
      // 줄바꿈 처리 (Word Wrapping)
      const text = options.text;
      const maxWidth = canvasWidth * 0.9; // 화면 너비의 90%
      const lineHeight = fontSize * 1.3;
      const words = text.split(' ');
      let line = '';
      const lines = [];
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      // 자막 위치 (하단에서 10% 띄움)
      const bottomPadding = canvasHeight * 0.1;
      let y = canvasHeight - bottomPadding - ((lines.length - 1) * lineHeight);
      
      // 자막 그리기 Loop
      lines.forEach((lineText) => {
        // 외곽선 먼저
        ctx.strokeText(lineText, canvasWidth / 2, y);
        // 채우기 나중
        ctx.fillText(lineText, canvasWidth / 2, y);
        y += lineHeight;
      });
    }
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
  
  // Gain 노드 (볼륨 정규화 적용)
  const gainNode = audioContext.createGain();
  gainNode.gain.value = audioNormalizationGain; // 볼륨 정규화
  console.log('[Render] 오디오 Gain 적용:', audioNormalizationGain.toFixed(2) + 'x');
  
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

      // 프레임 그리기 (currentTime 전달로 모션 효과 작동)
      drawFrame(progress, alpha, elapsed);

      // 종료 조건 체크
      if (elapsed >= duration) {
        console.log('[Render] 설정된 시간 도달 - 녹화 종료');
        stopRecording();
        return;
      }

      // 다음 프레임
      if (isActive) {
        animationId = requestAnimationFrame(renderLoop);
      }
    };

    // 오디오 종료 시 로그만 출력 (녹화 중지는 시간 기반으로 변경)
    audioSource.onended = () => {
      console.log('[Render] 오디오 재생 종료 (영상은 계속 진행)');
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
