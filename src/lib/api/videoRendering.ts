/**
 * 비디오 렌더링 서비스
 * FFmpeg를 사용한 이미지 + 음성 합성
 */

export interface RenderParams {
  sceneId: string;
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  duration?: number; // 음성 길이 + 여백
  transition?: 'none' | 'fade' | 'slide';
  kenBurns?: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
  subtitle?: {
    enabled: boolean;
    text: string;
    style: SubtitleStyle;
  };
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'top' | 'center' | 'bottom';
  bold: boolean;
  outline: boolean;
  outlineColor: string;
}

export interface RenderResponse {
  success: boolean;
  videoUrl?: string;
  videoDuration?: number;
  error?: string;
}

export interface RenderProgress {
  sceneId: string;
  progress: number; // 0 ~ 100
  status: 'queued' | 'processing' | 'completed' | 'error';
  message?: string;
}

/**
 * 단일 씬 렌더링
 */
export async function renderScene(params: RenderParams): Promise<RenderResponse> {
  if (!params.imageUrl) {
    return { success: false, error: '이미지가 없습니다.' };
  }

  if (!params.audioUrl) {
    return { success: false, error: '음성이 없습니다.' };
  }

  try {
    const response = await fetch('/api/render-scene', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `렌더링 오류: ${error}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      videoUrl: data.videoUrl,
      videoDuration: data.duration,
    };
  } catch (error) {
    console.error('Render error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '렌더링 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 여러 씬 일괄 렌더링 (큐 방식)
 */
export async function renderScenesBatch(
  scenes: RenderParams[],
  onProgress?: (progress: RenderProgress) => void
): Promise<Map<string, RenderResponse>> {
  const results = new Map<string, RenderResponse>();
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    // 진행 상태 업데이트
    onProgress?.({
      sceneId: scene.sceneId,
      progress: (i / scenes.length) * 100,
      status: 'processing',
      message: `씬 ${i + 1}/${scenes.length} 렌더링 중...`,
    });

    const result = await renderScene(scene);
    results.set(scene.sceneId, result);

    // 완료/오류 상태 업데이트
    onProgress?.({
      sceneId: scene.sceneId,
      progress: ((i + 1) / scenes.length) * 100,
      status: result.success ? 'completed' : 'error',
      message: result.success ? '완료' : result.error,
    });

    // API 레이트 리밋 방지를 위한 딜레이
    if (i < scenes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Ken Burns 효과 CSS 생성
 */
export function getKenBurnsAnimation(effect: string, duration: number): string {
  const animations: Record<string, string> = {
    'zoom-in': `
      @keyframes kenburns-zoom-in {
        0% { transform: scale(1); }
        100% { transform: scale(1.2); }
      }
      animation: kenburns-zoom-in ${duration}s ease-out forwards;
    `,
    'zoom-out': `
      @keyframes kenburns-zoom-out {
        0% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      animation: kenburns-zoom-out ${duration}s ease-out forwards;
    `,
    'pan-left': `
      @keyframes kenburns-pan-left {
        0% { transform: translateX(0) scale(1.1); }
        100% { transform: translateX(-10%) scale(1.1); }
      }
      animation: kenburns-pan-left ${duration}s ease-out forwards;
    `,
    'pan-right': `
      @keyframes kenburns-pan-right {
        0% { transform: translateX(-10%) scale(1.1); }
        100% { transform: translateX(0) scale(1.1); }
      }
      animation: kenburns-pan-right ${duration}s ease-out forwards;
    `,
    'pan-up': `
      @keyframes kenburns-pan-up {
        0% { transform: translateY(0) scale(1.1); }
        100% { transform: translateY(-10%) scale(1.1); }
      }
      animation: kenburns-pan-up ${duration}s ease-out forwards;
    `,
    'pan-down': `
      @keyframes kenburns-pan-down {
        0% { transform: translateY(-10%) scale(1.1); }
        100% { transform: translateY(0) scale(1.1); }
      }
      animation: kenburns-pan-down ${duration}s ease-out forwards;
    `,
  };

  return animations[effect] || '';
}

/**
 * 비디오 다운로드
 */
export async function downloadVideo(videoUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('다운로드 중 오류가 발생했습니다.');
  }
}

/**
 * 모든 렌더링된 씬 다운로드 (ZIP)
 */
export async function downloadAllScenes(
  scenes: Array<{ id: string; videoUrl: string; order: number }>
): Promise<void> {
  // 개별 파일로 순차 다운로드
  for (const scene of scenes) {
    await downloadVideo(scene.videoUrl, `scene_${scene.order + 1}.mp4`);
    // 브라우저 다운로드 제한 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
