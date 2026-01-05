/**
 * 씬 렌더링 서비스
 * 클라이언트에서 사용하는 렌더링 관련 유틸리티
 */

// File System Access API 타입 선언
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

/**
 * 파일 저장 위치를 사용자가 선택할 수 있는지 확인
 */
export function isFileSavePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * 디렉토리 선택이 가능한지 확인
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * 사용자가 선택한 위치에 파일 저장 (File System Access API)
 */
async function saveFileWithPicker(
  blob: Blob,
  suggestedName: string,
  fileType: { description: string; accept: Record<string, string[]> }
): Promise<{ success: boolean; savedPath?: string; error?: string }> {
  try {
    if (!window.showSaveFilePicker) {
      return { success: false, error: 'File System Access API not supported' };
    }

    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [fileType],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    return { success: true, savedPath: handle.name };
  } catch (error) {
    // 사용자가 취소한 경우
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'cancelled' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '파일 저장 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 기존 방식으로 파일 다운로드 (폴백)
 */
function downloadFallback(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
 * 비디오 다운로드 (사용자가 저장 위치 선택 가능)
 * @param allowPickLocation - true면 저장 위치 선택 다이얼로그 표시
 */
export async function downloadVideo(
  videoUrl: string,
  filename: string,
  allowPickLocation: boolean = false
): Promise<{ success: boolean; savedPath?: string; error?: string }> {
  try {
    let blob: Blob;

    // Data URL인 경우
    if (videoUrl.startsWith('data:')) {
      const response = await fetch(videoUrl);
      blob = await response.blob();
    }
    // Blob URL인 경우
    else if (videoUrl.startsWith('blob:')) {
      const response = await fetch(videoUrl);
      blob = await response.blob();
    }
    // HTTP URL인 경우
    else {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error('비디오를 가져올 수 없습니다.');
      }
      blob = await response.blob();
    }

    // 사용자가 위치 선택 원하고, API 지원되면 파일 피커 사용
    if (allowPickLocation && isFileSavePickerSupported()) {
      const result = await saveFileWithPicker(blob, filename, {
        description: '비디오 파일',
        accept: { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'] },
      });
      
      if (result.error === 'cancelled') {
        return { success: false, error: '다운로드가 취소되었습니다.' };
      }
      if (result.success) {
        return { success: true, savedPath: result.savedPath };
      }
      // 실패 시 폴백
    }

    // 기존 방식으로 다운로드
    downloadFallback(blob, filename);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 오디오 파일 다운로드 (사용자가 저장 위치 선택 가능)
 * @param allowPickLocation - true면 저장 위치 선택 다이얼로그 표시
 */
export async function downloadAudio(
  audioUrl: string,
  filename: string,
  allowPickLocation: boolean = false
): Promise<{ success: boolean; savedPath?: string; error?: string }> {
  try {
    let blob: Blob;

    // Data URL인 경우
    if (audioUrl.startsWith('data:')) {
      const response = await fetch(audioUrl);
      blob = await response.blob();
    }
    // HTTP URL인 경우
    else {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error('오디오를 가져올 수 없습니다.');
      }
      blob = await response.blob();
    }

    // 사용자가 위치 선택 원하고, API 지원되면 파일 피커 사용
    if (allowPickLocation && isFileSavePickerSupported()) {
      const result = await saveFileWithPicker(blob, filename, {
        description: '오디오 파일',
        accept: { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'] },
      });
      
      if (result.error === 'cancelled') {
        return { success: false, error: '다운로드가 취소되었습니다.' };
      }
      if (result.success) {
        return { success: true, savedPath: result.savedPath };
      }
    }

    // 기존 방식으로 다운로드
    downloadFallback(blob, filename);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 이미지 다운로드 (사용자가 저장 위치 선택 가능)
 * @param allowPickLocation - true면 저장 위치 선택 다이얼로그 표시
 */
export async function downloadImage(
  imageUrl: string,
  filename: string,
  allowPickLocation: boolean = false
): Promise<{ success: boolean; savedPath?: string; error?: string }> {
  try {
    let blob: Blob;

    // Data URL인 경우
    if (imageUrl.startsWith('data:')) {
      const response = await fetch(imageUrl);
      blob = await response.blob();
    }
    // HTTP URL인 경우
    else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('이미지를 가져올 수 없습니다.');
      }
      blob = await response.blob();
    }

    // 사용자가 위치 선택 원하고, API 지원되면 파일 피커 사용
    if (allowPickLocation && isFileSavePickerSupported()) {
      const result = await saveFileWithPicker(blob, filename, {
        description: '이미지 파일',
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
      });
      
      if (result.error === 'cancelled') {
        return { success: false, error: '다운로드가 취소되었습니다.' };
      }
      if (result.success) {
        return { success: true, savedPath: result.savedPath };
      }
    }

    // 기존 방식으로 다운로드
    downloadFallback(blob, filename);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '다운로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 사용자가 선택한 디렉토리에 여러 파일 저장
 */
export async function downloadAllToDirectory(
  files: Array<{ url: string; filename: string }>,
  onProgress?: (completed: number, total: number, filename: string) => void
): Promise<{ success: boolean; savedPath?: string; savedCount: number; error?: string }> {
  try {
    if (!window.showDirectoryPicker) {
      return { success: false, savedCount: 0, error: 'Directory picker not supported' };
    }

    // 사용자에게 저장할 폴더 선택 요청
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    let savedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const response = await fetch(file.url);
        if (!response.ok) continue;
        
        const blob = await response.blob();
        const fileHandle = await dirHandle.getFileHandle(file.filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        savedCount++;
        
        onProgress?.(savedCount, files.length, file.filename);
        
        // 약간의 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Failed to save ${file.filename}:`, err);
      }
    }

    return { 
      success: true, 
      savedPath: dirHandle.name,
      savedCount,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, savedCount: 0, error: 'cancelled' };
    }
    return {
      success: false,
      savedCount: 0,
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
