'use client';

/**
 * 브라우저 기반 비디오 생성 (Canvas + MediaRecorder)
 * 설치 없이 브라우저에서 직접 비디오 생성
 */

export interface RenderOptions {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  onProgress?: (progress: number, message: string) => void;
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
 * Canvas + MediaRecorder로 비디오 생성 (고품질)
 * 
 * 핵심 수정사항:
 * 1. requestAnimationFrame으로 캔버스를 지속적으로 다시 그려 프레임 생성
 * 2. timeslice로 데이터 주기적 수집
 * 3. 오디오 종료 이벤트 기반 녹화 중지
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const { imageUrl, audioUrl, aspectRatio, onProgress } = options;

  onProgress?.(5, '리소스 로딩 중...');
  console.log('[Renderer] 시작: 이미지와 오디오 로딩');

  // 고품질 해상도 (1080p)
  const [width, height] = aspectRatio === '9:16' ? [1080, 1920] : [1920, 1080];
  const FPS = 30;

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

  // 이미지를 캔버스에 그리기 (비율 유지하며 채우기)
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  
  let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
  if (imgRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imgRatio;
    drawX = (width - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = width;
    drawHeight = width / imgRatio;
    drawX = 0;
    drawY = (height - drawHeight) / 2;
  }

  /**
   * 캔버스에 이미지 그리기 함수
   * MediaRecorder가 새 프레임을 캡처하도록 매 프레임 호출 필요
   */
  function drawFrame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }

  // 초기 프레임 그리기
  drawFrame();

  onProgress?.(25, '비디오 인코딩 시작...');

  // 비디오 스트림 캡처 (30fps)
  const videoStream = canvas.captureStream(FPS);
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

  // MediaRecorder 설정 (최고 품질)
  // WebM VP9가 가장 품질이 좋음
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
  console.log(`[Renderer] 선택된 코덱: ${selectedMimeType}`);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 10_000_000, // 10Mbps 고품질
    audioBitsPerSecond: 320_000,   // 320kbps 오디오
  });

  const chunks: Blob[] = [];
  
  // 데이터 수집 이벤트
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
      console.log(`[Renderer] 데이터 청크 수집: ${(e.data.size / 1024).toFixed(1)}KB`);
    }
  };

  // 녹화 시작
  return new Promise((resolve, reject) => {
    let animationFrameId: number;
    let progressIntervalId: NodeJS.Timeout;
    let isRecording = true;

    // MediaRecorder 정지 핸들러
    recorder.onstop = async () => {
      console.log(`[Renderer] 녹화 중지, 총 ${chunks.length}개 청크 수집`);
      onProgress?.(95, '비디오 생성 중...');

      // 애니메이션 프레임 정지
      isRecording = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }

      // 청크가 없으면 에러
      if (chunks.length === 0) {
        reject(new Error('녹화 데이터가 없습니다. 다시 시도해주세요.'));
        return;
      }

      // Blob 생성
      const videoBlob = new Blob(chunks, { type: selectedMimeType });
      console.log(`[Renderer] 비디오 Blob 생성: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);

      // Blob이 너무 작으면 에러 (최소 100KB 이상이어야 함)
      if (videoBlob.size < 100 * 1024) {
        console.error('[Renderer] 비디오 파일이 너무 작음:', videoBlob.size);
        reject(new Error(`비디오 파일이 손상되었습니다 (${(videoBlob.size / 1024).toFixed(1)}KB). 다시 시도해주세요.`));
        return;
      }

      const videoUrl = URL.createObjectURL(videoBlob);

      // 리소스 정리
      try {
        audioSource.stop();
        audioContext.close();
      } catch (e) {
        console.warn('[Renderer] 오디오 정리 중 경고:', e);
      }

      onProgress?.(100, '완료!');
      console.log('[Renderer] 렌더링 완료!');

      resolve({
        videoUrl,
        videoBlob,
        duration,
      });
    };

    recorder.onerror = (event) => {
      console.error('[Renderer] MediaRecorder 오류:', event);
      isRecording = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (progressIntervalId) clearInterval(progressIntervalId);
      reject(new Error('녹화 중 오류가 발생했습니다. 다시 시도해주세요.'));
    };

    // requestAnimationFrame으로 캔버스 지속 업데이트
    // 이것이 없으면 MediaRecorder가 정적 프레임만 캡처해서 손상된 파일이 생성됨
    function animateFrame() {
      if (!isRecording) return;
      drawFrame();
      animationFrameId = requestAnimationFrame(animateFrame);
    }

    // 녹화 시작 (100ms마다 데이터 수집)
    console.log('[Renderer] 녹화 시작...');
    recorder.start(100); // 100ms timeslice
    audioSource.start();
    animateFrame();

    // 진행률 업데이트
    const startTime = Date.now();
    progressIntervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(90, 25 + (elapsed / duration) * 65);
      onProgress?.(progress, `인코딩 중... ${Math.round(elapsed)}/${Math.round(duration)}초`);
    }, 500);

    // 오디오 종료 시 녹화 중지
    audioSource.onended = () => {
      console.log('[Renderer] 오디오 재생 완료, 녹화 중지 예약');
      // 약간의 지연 후 중지 (마지막 프레임이 기록되도록)
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 500);
    };

    // 안전장치: 최대 시간 초과 시 강제 중지
    const maxDuration = Math.max(duration * 1000 + 2000, 30000); // 오디오 길이 + 2초 또는 최소 30초
    setTimeout(() => {
      if (recorder.state === 'recording') {
        console.log('[Renderer] 시간 초과로 녹화 강제 중지');
        recorder.stop();
      }
    }, maxDuration);
  });
}

/**
 * 비디오 다운로드 (저장 위치 직접 선택)
 */
export async function downloadVideoWithPicker(
  blob: Blob,
  suggestedName: string = 'video.webm'
): Promise<{ success: boolean; filename?: string }> {
  // File System Access API 지원 시 (Chrome/Edge)
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
        return { success: false }; // 사용자 취소
      }
    }
  }

  // 폴백: 기본 다운로드 (다운로드 폴더로)
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
 * 정리 (미사용)
 */
export async function cleanupFFmpeg(): Promise<void> {}
