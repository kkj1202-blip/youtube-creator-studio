'use client';

/**
 * 로컬 렌더링 서버 클라이언트
 * 사용자 PC에서 실행되는 FFmpeg 서버와 통신
 */

const LOCAL_SERVER_URL = 'http://localhost:5555';

export interface RenderOptions {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  quality?: 'fast' | 'high' | 'ultra';
  filename?: string;
  kenBurns?: string;
  subtitleText?: string;
  subtitleEnabled?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface RenderResult {
  success: boolean;
  filename: string;
  path: string;
  size: number;
  duration: number;
  resolution: string;
  quality: string;
}

export interface ServerStatus {
  status: string;
  ffmpeg: boolean;
  output_dir: string;
  message: string;
}

/**
 * URL 또는 Blob을 Base64로 변환
 */
async function urlToBase64(url: string): Promise<string> {
  // 이미 data URL인 경우
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Blob URL 또는 HTTP URL
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 로컬 서버 상태 확인
 */
export async function checkLocalServer(): Promise<ServerStatus | null> {
  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 로컬 서버 사용 가능 여부
 */
export async function isLocalServerAvailable(): Promise<boolean> {
  const status = await checkLocalServer();
  return status?.ffmpeg === true;
}

/**
 * 로컬 서버로 렌더링 요청
 */
export async function renderVideoLocal(options: RenderOptions): Promise<RenderResult> {
  const {
    imageUrl,
    audioUrl,
    aspectRatio,
    quality = 'high',
    filename,
    kenBurns = 'none',
    subtitleText = '',
    subtitleEnabled = false,
    onProgress,
  } = options;

  try {
    onProgress?.(5, '로컬 서버 연결 중...');
    
    // 서버 상태 확인
    const serverStatus = await checkLocalServer();
    if (!serverStatus?.ffmpeg) {
      throw new Error('로컬 렌더링 서버가 실행되지 않았습니다. server.py를 실행해주세요.');
    }

    onProgress?.(10, '파일 변환 중...');
    
    // 이미지/오디오를 Base64로 변환
    const [imageData, audioData] = await Promise.all([
      urlToBase64(imageUrl),
      urlToBase64(audioUrl),
    ]);

    onProgress?.(20, '렌더링 요청 중...');
    
    // 렌더링 요청
    const response = await fetch(`${LOCAL_SERVER_URL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData,
        audioData,
        aspectRatio,
        quality,
        filename,
        kenBurns,
        subtitleText,
        subtitleEnabled,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '렌더링 실패');
    }

    onProgress?.(90, '렌더링 완료...');
    
    const result: RenderResult = await response.json();
    
    onProgress?.(100, '완료!');
    
    return result;
  } catch (error) {
    console.error('[LocalRender] Error:', error);
    throw error;
  }
}

/**
 * 여러 씬 일괄 렌더링
 */
export async function renderBatchLocal(
  scenes: Array<{
    imageUrl: string;
    audioUrl: string;
    filename?: string;
  }>,
  options: {
    aspectRatio: '16:9' | '9:16';
    quality?: 'fast' | 'high' | 'ultra';
    onProgress?: (current: number, total: number, message: string) => void;
  }
): Promise<RenderResult[]> {
  const { aspectRatio, quality = 'high', onProgress } = options;
  
  const results: RenderResult[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress?.(i + 1, scenes.length, `씬 ${i + 1}/${scenes.length} 렌더링 중...`);
    
    try {
      const result = await renderVideoLocal({
        imageUrl: scene.imageUrl,
        audioUrl: scene.audioUrl,
        aspectRatio,
        quality,
        filename: scene.filename || `scene_${String(i + 1).padStart(3, '0')}.mp4`,
      });
      results.push(result);
    } catch (error) {
      console.error(`[LocalRender] Scene ${i + 1} failed:`, error);
      // 실패해도 계속 진행
    }
  }
  
  return results;
}

/**
 * 렌더링된 파일 목록 조회
 */
export async function getRenderedFiles(): Promise<Array<{
  name: string;
  size: number;
  created: number;
}>> {
  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/files`);
    if (response.ok) {
      const data = await response.json();
      return data.files;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 렌더링된 파일 다운로드 URL
 */
export function getDownloadUrl(filename: string): string {
  return `${LOCAL_SERVER_URL}/download/${encodeURIComponent(filename)}`;
}
