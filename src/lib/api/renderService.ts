/**
 * 씬 렌더링 서비스
 * 클라이언트에서 사용하는 렌더링 관련 유틸리티
 */

export interface RenderParams {
  sceneId: string;
  imageUrl: string;
  audioUrl: string;
  aspectRatio: '16:9' | '9:16';
  duration?: number;
  transition?: string;
  kenBurns?: string;
  subtitle?: {
    enabled: boolean;
    text: string;
    style?: any;
  };
}

export interface RenderResponse {
  success: boolean;
  videoUrl?: string;
  duration?: number;
  error?: string;
  demo?: boolean;
}

/**
 * 씬 렌더링 요청
 */
export async function renderScene(params: RenderParams): Promise<RenderResponse> {
  try {
    const response = await fetch('/api/render-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '렌더링에 실패했습니다.' };
    }

    return {
      success: true,
      videoUrl: data.videoUrl,
      duration: data.duration,
      demo: data.demo,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '렌더링 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 비디오 다운로드
 */
export async function downloadVideo(
  videoUrl: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Data URL인 경우 직접 다운로드
    if (videoUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    }

    // Blob URL인 경우 직접 다운로드
    if (videoUrl.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    }

    // HTTP URL인 경우 fetch 후 다운로드
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error('비디오를 가져올 수 없습니다.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 오디오 파일 다운로드
 */
export async function downloadAudio(
  audioUrl: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Data URL인 경우 직접 다운로드
    if (audioUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    }

    // HTTP URL인 경우 fetch 후 다운로드
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error('오디오를 가져올 수 없습니다.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 이미지 다운로드
 */
export async function downloadImage(
  imageUrl: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Data URL인 경우 직접 다운로드
    if (imageUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true };
    }

    // HTTP URL인 경우 fetch 후 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('이미지를 가져올 수 없습니다.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 일괄 다운로드를 위한 ZIP 생성
 */
export async function downloadAllAsZip(
  files: Array<{ url: string; filename: string }>,
  zipFilename: string
): Promise<{ success: boolean; error?: string }> {
  // NOTE: 실제 구현에서는 JSZip 라이브러리 사용
  // 여기서는 개별 파일 다운로드로 대체
  try {
    for (const file of files) {
      const extension = file.filename.split('.').pop() || '';
      if (['mp4', 'webm', 'mov'].includes(extension)) {
        await downloadVideo(file.url, file.filename);
      } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
        await downloadAudio(file.url, file.filename);
      } else {
        await downloadImage(file.url, file.filename);
      }
      // 각 다운로드 사이에 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}
