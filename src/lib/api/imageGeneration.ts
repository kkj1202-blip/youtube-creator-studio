/**
 * 이미지 생성 API 서비스
 * KIE 이미지 생성 API 연동
 */

export interface ImageGenerationParams {
  prompt: string;
  style?: string;
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// 스타일별 프롬프트 프리셋
export const stylePresets: Record<string, string> = {
  '2d-anime': 'anime style, 2d animation, vibrant colors, clean lines, studio ghibli inspired',
  '3d-anime': '3d rendered anime style, pixar style, smooth shading, detailed textures',
  'realistic': 'photorealistic, 8k uhd, highly detailed, professional photography, cinematic lighting',
  'cartoon': 'cartoon style, bold outlines, bright colors, exaggerated features, fun and playful',
  'watercolor': 'watercolor painting style, soft edges, artistic, delicate brush strokes, pastel colors',
  'custom': '',
};

/**
 * 대본에서 이미지 프롬프트 자동 생성
 */
export function generateImagePrompt(script: string, style: string, customStylePrompt?: string): string {
  // 대본에서 핵심 키워드/장면 추출 (간단한 버전)
  const cleanScript = script
    .replace(/[^\w\s가-힣]/g, ' ')
    .trim();
  
  // 스타일 프롬프트 가져오기
  const stylePrompt = style === 'custom' && customStylePrompt 
    ? customStylePrompt 
    : stylePresets[style] || stylePresets['realistic'];
  
  // 기본 품질 프롬프트
  const qualityPrompt = 'masterpiece, best quality, highly detailed';
  
  // 최종 프롬프트 조합
  return `${cleanScript}, ${stylePrompt}, ${qualityPrompt}`;
}

/**
 * 이미지 생성 API 호출
 */
export async function generateImage(
  apiKey: string,
  params: ImageGenerationParams
): Promise<ImageGenerationResponse> {
  if (!apiKey) {
    return { success: false, error: 'API 키가 설정되지 않았습니다.' };
  }

  try {
    // KIE 이미지 생성 API 호출
    // 실제 API 엔드포인트와 형식에 맞게 수정 필요
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        prompt: params.prompt,
        style: params.style,
        aspectRatio: params.aspectRatio,
        negativePrompt: params.negativePrompt || 'text, watermark, signature, logo, words, letters, blurry, low quality, distorted, deformed, ugly, bad anatomy, cropped',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `API 오류: ${error}` };
    }

    const data = await response.json();
    return { success: true, imageUrl: data.imageUrl };
  } catch (error) {
    console.error('Image generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 이미지 URL 유효성 검사
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 로컬 이미지를 Base64로 변환
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 파일 검증
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 가능)' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: '이미지 크기는 10MB 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 파일명에서 씬 번호 추출 (1.png, scene_2.jpg 등)
 */
export function extractSceneNumber(filename: string): number | null {
  // 숫자만 있는 파일명: 1.png, 2.jpg
  const simpleMatch = filename.match(/^(\d+)\./);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }
  
  // scene_1.png, 씬1.jpg 등
  const prefixMatch = filename.match(/[_\-]?(\d+)\./);
  if (prefixMatch) {
    return parseInt(prefixMatch[1], 10);
  }
  
  return null;
}
