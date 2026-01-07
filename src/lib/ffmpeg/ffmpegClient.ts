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
 */
export async function renderVideo(options: RenderOptions): Promise<RenderResult> {
  const { imageUrl, audioUrl, aspectRatio, onProgress } = options;

  onProgress?.(5, '리소스 로딩 중...');

  // 고품질 해상도 (1080p)
  const [width, height] = aspectRatio === '9:16' ? [1080, 1920] : [1920, 1080];

  // 이미지 및 오디오 로드
  const [img, duration] = await Promise.all([
    loadImage(imageUrl),
    getAudioDuration(audioUrl),
  ]);

  onProgress?.(15, '비디오 준비 중...');

  // Canvas 생성
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 이미지를 캔버스에 그리기 (비율 유지하며 채우기)
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;
  
  let drawWidth, drawHeight, drawX, drawY;
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

  // 배경 검정 + 이미지 그리기
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  onProgress?.(25, '비디오 인코딩 시작...');

  // 비디오 스트림 캡처 (30fps)
  const videoStream = canvas.captureStream(30);
  
  // 오디오 처리
  const audioContext = new AudioContext();
  const audioBlob = await urlToBlob(audioUrl);
  const audioArrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
  
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
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 10000000, // 10Mbps 고품질
    audioBitsPerSecond: 320000,   // 320kbps 오디오
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // 녹화
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      onProgress?.(95, '비디오 생성 중...');
      
      const videoBlob = new Blob(chunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(videoBlob);
      
      // 정리
      try {
        audioSource.stop();
        audioContext.close();
      } catch {}
      
      onProgress?.(100, '완료!');
      
      resolve({
        videoUrl,
        videoBlob,
        duration,
      });
    };

    recorder.onerror = () => reject(new Error('녹화 중 오류 발생'));

    recorder.start();
    audioSource.start();

    // 진행률 업데이트
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(90, 25 + (elapsed / duration) * 65);
      onProgress?.(progress, `인코딩 중... ${Math.round(elapsed)}/${Math.round(duration)}초`);
    }, 500);

    // 오디오 길이만큼 녹화 후 중지
    setTimeout(() => {
      clearInterval(progressInterval);
      recorder.stop();
    }, duration * 1000 + 300);
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
