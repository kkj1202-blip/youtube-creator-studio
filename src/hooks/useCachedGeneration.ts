'use client';

import useSWRMutation from 'swr/mutation';

/**
 * 이미지 생성 API 캐싱 훅
 * - 동일 프롬프트로 중복 요청 방지
 * - 생성 결과 캐싱
 */
interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio?: '16:9' | '9:16';
}

interface ImageGenerationResult {
  imageUrl: string;
  cached: boolean;
}

// 프롬프트 기반 캐시 키 생성
function generateCacheKey(params: ImageGenerationParams): string {
  return `image:${params.prompt.slice(0, 100)}:${params.aspectRatio || '16:9'}`;
}

// 메모리 캐시 (세션 동안 유지)
const imageCache = new Map<string, string>();

export function useCachedImageGeneration() {
  const { trigger, isMutating, error, data } = useSWRMutation(
    'image-generation',
    async (_key: string, { arg }: { arg: ImageGenerationParams }): Promise<ImageGenerationResult> => {
      const cacheKey = generateCacheKey(arg);
      
      // 캐시 확인
      const cached = imageCache.get(cacheKey);
      if (cached) {
        console.log('[Cache] 이미지 캐시 히트:', cacheKey.slice(0, 50));
        return { imageUrl: cached, cached: true };
      }
      
      console.log('[Cache] 이미지 캐시 미스, 생성 시작');
      
      // API 호출
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      
      if (!response.ok) {
        throw new Error(`이미지 생성 실패: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 캐시 저장
      if (result.imageUrl) {
        imageCache.set(cacheKey, result.imageUrl);
        console.log('[Cache] 이미지 캐시 저장:', cacheKey.slice(0, 50));
      }
      
      return { imageUrl: result.imageUrl, cached: false };
    }
  );

  return {
    generate: trigger,
    isGenerating: isMutating,
    error,
    result: data,
    clearCache: () => imageCache.clear(),
    cacheSize: imageCache.size,
  };
}

/**
 * 음성 생성 캐싱 훅
 * - 동일 텍스트+목소리로 중복 요청 방지
 */
interface VoiceGenerationParams {
  text: string;
  voiceId?: string;
  speed?: number;
  engine?: string;
}

const voiceCache = new Map<string, string>();

function generateVoiceCacheKey(params: VoiceGenerationParams): string {
  return `voice:${params.text.slice(0, 50)}:${params.voiceId || 'default'}:${params.speed || 1}`;
}

export function useCachedVoiceGeneration() {
  const { trigger, isMutating, error, data } = useSWRMutation(
    'voice-generation',
    async (_key: string, { arg }: { arg: VoiceGenerationParams }): Promise<{ audioUrl: string; cached: boolean }> => {
      const cacheKey = generateVoiceCacheKey(arg);
      
      // 캐시 확인
      const cached = voiceCache.get(cacheKey);
      if (cached) {
        console.log('[Cache] 음성 캐시 히트:', cacheKey.slice(0, 50));
        return { audioUrl: cached, cached: true };
      }
      
      console.log('[Cache] 음성 캐시 미스, 생성 시작');
      
      // API 호출
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      
      if (!response.ok) {
        throw new Error(`음성 생성 실패: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 캐시 저장
      if (result.audioUrl) {
        voiceCache.set(cacheKey, result.audioUrl);
        console.log('[Cache] 음성 캐시 저장:', cacheKey.slice(0, 50));
      }
      
      return { audioUrl: result.audioUrl, cached: false };
    }
  );

  return {
    generate: trigger,
    isGenerating: isMutating,
    error,
    result: data,
    clearCache: () => voiceCache.clear(),
    cacheSize: voiceCache.size,
  };
}

/**
 * 전체 캐시 통계
 */
export function useCacheStats() {
  return {
    imageCount: imageCache.size,
    voiceCount: voiceCache.size,
    clearAll: () => {
      imageCache.clear();
      voiceCache.clear();
      console.log('[Cache] 전체 캐시 클리어');
    },
  };
}
