/**
 * 일괄 처리 서비스 (최적화 버전)
 * 이미지/음성/렌더링 일괄 처리 관리
 * - 병렬 처리 지원
 * - 큐 시스템
 * - 재시도 로직
 * - 일시정지/재개 기능
 */

import { generateImage, generateImagePrompt } from './imageGeneration';
import { generateVoice } from './voiceGeneration';
import { buildFinalPrompt } from '@/lib/imageStyles';
import type { Scene, Project, Settings } from '@/types';
// 브라우저 렌더링은 동적 import로 사용 (서버 사이드 호환성)

// ==================== 타입 정의 ====================

export interface BatchProcessingProgress {
  type: 'image' | 'voice' | 'render';
  total: number;
  completed: number;
  failed: number;
  current: string;
  errors: string[];
  eta?: number; // 예상 남은 시간 (초)
  speed?: number; // 처리 속도 (개/분)
}

export interface BatchProcessingResult {
  success: boolean;
  completed: number;
  failed: number;
  errors: string[];
  duration: number; // 총 소요 시간 (ms)
}

export interface BatchOptions {
  concurrency: number; // 동시 처리 수 (1~5)
  retryCount: number; // 재시도 횟수
  retryDelay: number; // 재시도 간격 (ms)
  delayBetweenItems: number; // 항목 간 딜레이 (ms)
  stopOnError: boolean; // 에러 시 중지 여부
}

export type ProgressCallback = (progress: BatchProcessingProgress) => void;

// 기본 옵션
const defaultOptions: BatchOptions = {
  concurrency: 2, // 동시 2개 처리
  retryCount: 2,
  retryDelay: 2000,
  delayBetweenItems: 500,
  stopOnError: false,
};

// ==================== 유틸리티 함수 ====================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 청크로 나누기
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 재시도 래퍼
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries) {
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

// ==================== 큐 시스템 ====================

interface QueueItem<T> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retries: number;
}

class ProcessingQueue<T, R> {
  private items: QueueItem<T>[] = [];
  private isRunning = false;
  private isPaused = false;
  private processor: (item: T) => Promise<R>;
  private onItemComplete?: (item: T, result: R | null, error?: string) => void;
  private onProgress?: ProgressCallback;
  private options: BatchOptions;
  private startTime: number = 0;
  private type: 'image' | 'voice' | 'render';

  constructor(
    processor: (item: T) => Promise<R>,
    type: 'image' | 'voice' | 'render',
    options: Partial<BatchOptions> = {},
    onProgress?: ProgressCallback,
    onItemComplete?: (item: T, result: R | null, error?: string) => void
  ) {
    this.processor = processor;
    this.type = type;
    this.options = { ...defaultOptions, ...options };
    this.onProgress = onProgress;
    this.onItemComplete = onItemComplete;
  }

  addItems(items: { id: string; data: T }[]) {
    this.items = items.map((item) => ({
      ...item,
      status: 'pending' as const,
      retries: 0,
    }));
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  async process(): Promise<BatchProcessingResult> {
    this.isRunning = true;
    this.startTime = Date.now();
    const errors: string[] = [];

    // 병렬 처리를 위한 청크 생성
    const pendingItems = this.items.filter((i) => i.status === 'pending');
    const chunks = chunkArray(pendingItems, this.options.concurrency);

    for (const chunk of chunks) {
      // 일시정지 체크
      while (this.isPaused) {
        await delay(100);
      }

      // 병렬 처리
      await Promise.allSettled(
        chunk.map(async (item) => {
          item.status = 'processing';
          this.reportProgress();

          try {
            const result = await withRetry(
              () => this.processor(item.data),
              this.options.retryCount,
              this.options.retryDelay
            );
            
            item.status = 'completed';
            this.onItemComplete?.(item.data, result);
            return { success: true, id: item.id };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
            item.status = 'failed';
            item.error = errorMsg;
            errors.push(`${item.id}: ${errorMsg}`);
            this.onItemComplete?.(item.data, null, errorMsg);
            
            if (this.options.stopOnError) {
              throw error;
            }
            return { success: false, id: item.id, error: errorMsg };
          }
        })
      );

      this.reportProgress();

      // 항목 간 딜레이
      await delay(this.options.delayBetweenItems);
    }

    this.isRunning = false;

    const completed = this.items.filter((i) => i.status === 'completed').length;
    const failed = this.items.filter((i) => i.status === 'failed').length;

    return {
      success: failed === 0,
      completed,
      failed,
      errors,
      duration: Date.now() - this.startTime,
    };
  }

  private reportProgress() {
    const total = this.items.length;
    const completed = this.items.filter((i) => i.status === 'completed').length;
    const failed = this.items.filter((i) => i.status === 'failed').length;
    const processing = this.items.filter((i) => i.status === 'processing');
    
    const elapsed = Date.now() - this.startTime;
    const itemsProcessed = completed + failed;
    const speed = itemsProcessed > 0 ? (itemsProcessed / elapsed) * 60000 : 0; // 개/분
    const remaining = total - itemsProcessed;
    const eta = speed > 0 ? Math.round((remaining / speed) * 60) : 0; // 초

    this.onProgress?.({
      type: this.type,
      total,
      completed,
      failed,
      current: processing.length > 0 
        ? `처리 중: ${processing.map((p) => p.id).join(', ')}` 
        : completed === total ? '완료' : '대기 중',
      errors: this.items.filter((i) => i.error).map((i) => i.error!),
      eta,
      speed: Math.round(speed * 10) / 10,
    });
  }
}

// ==================== 일괄 처리 함수 ====================

// 모든 씬의 이미지 프롬프트만 일괄 생성 (이미지 생성 X)
export async function generateAllPrompts(
  project: Project,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>
): Promise<BatchProcessingResult> {
  // 프롬프트 없는 씬만 필터링하거나, 옵션에 따라 전체 재생성
  const scenesToProcess = project.scenes.map(s => ({ id: s.id, data: s }));

  // 1. 큐 생성
  const queue = new ProcessingQueue<Scene, { prompt: string }>(
    async (scene) => {
      // 프롬프트 생성 로직
      // 기존 generateImage 내부 로직과 유사하지만 프롬프트만 생성
      let prompt = scene.imagePrompt;
      
      // 프롬프트가 없으면 생성 (LLM or Rule-based)
      if (!prompt) {
        // 여기서는 간단히 스타일 기반 생성 호출
        // 실제로는 generate-scene-prompt API를 호출해야 함 (LLM 사용 시)
        // 일단은 기본 로직 사용
         prompt = await generateImagePrompt(scene.script, project.imageStyle || 'realistic');
      }

      // API 호출 시뮬레이션 (너무 빠르면 UI 업데이트가 안 보일 수 있음)
      await delay(100);

      return { prompt };
    },
    'image', // UI 진행바는 이미지 단계 사용
    { ...defaultOptions, ...options, concurrency: 5 }, // 프롬프트 생성은 빠르므로 병렬 5
    onProgress,
    (scene, result) => {
      if (result && updateScene) {
        updateScene(scene.id, {
          imagePrompt: result.prompt,
        });
      }
    }
  );

  // 2. 데이터 추가 및 실행
  queue.addItems(scenesToProcess);
  return queue.process();
}

/**
 * 모든 씬의 이미지 일괄 생성 (최적화)
 */
export async function generateAllImages(
  project: Project,
  apiKey: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>,
  whiskCookie?: string,
  imageSource: 'kie' | 'dalle' | 'whisk' | 'pollinations' = 'kie',
  whiskMode: 'api' | 'dom' = 'api',
  referenceImageUrls?: string[]
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter((s) => !s.imageUrl || s.imageSource === 'none');
  
  if (scenes.length === 0) {
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0 };
  }

  const processor = async (scene: Scene) => {
    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    // 마스터 스타일 프롬프트 확인
    const masterStylePrompt = project.masterImageStylePrompt || '';
    const consistencySettings = project.imageConsistency;
    
    let prompt: string;
    
    if (masterStylePrompt) {
      // 2026 마스터 스타일 라이브러리 사용
      // [!] scene.script를 직접 쓰지 않고, 분석된 imagePrompt만 사용 (없으면 빈값 전달하여 기본 키워드 생성 유도)
      const sceneDescription = scene.imagePrompt || ''; 
      prompt = buildFinalPrompt(
        sceneDescription,
        masterStylePrompt,
        consistencySettings,
        !!(referenceImageUrls && referenceImageUrls.length > 0)
      );
    } else {
      // 레거시 방식 (최소한의 안전장치)
      prompt = scene.imagePrompt || generateImagePrompt(
        scene.script,
        project.imageStyle,
        project.customStylePrompt
      );
    }

    console.log(`[BatchProcessor] Scene ${scene.order + 1} prompt:`, prompt.slice(0, 100) + '...');

    let result: { success: boolean; imageUrl?: string; error?: string; prompt: string };

    if (imageSource === 'whisk') {
       // Whisk Automation Call
       if (!whiskCookie) throw new Error('Whisk 쿠키가 필요합니다.');
       
       try {
           const response = await fetch('/api/generate-image/whisk', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                   prompt, 
                   cookies: whiskCookie,
                   mode: whiskMode,
                   referenceImageUrls: referenceImageUrls
               }),
           });
           const data = await response.json();
           
           if (!response.ok) throw new Error(data.error || 'Whisk Error');
           
           // Return the first image (Whisk usually generates 2-4)
           const finalImageUrl = data.images && data.images.length > 0 ? data.images[0] : null;
           if (!finalImageUrl) throw new Error('No images returned from Whisk');
           
           result = { success: true, imageUrl: finalImageUrl, prompt };
        } catch(e) {
             const errorMessage = e instanceof Error ? e.message : String(e);
             result = { success: false, error: errorMessage, prompt };
       }

    } else if (imageSource === 'pollinations') {
        // Pollinations AI Call
        const { generateImagePollinations } = await import('./imageGeneration');
        const pollResult = await generateImagePollinations(prompt, project.aspectRatio);
        if (pollResult.success && pollResult.imageUrl) {
             result = { ...pollResult, prompt };
        } else {
             result = { success: false, error: pollResult.error, prompt };
        }

    } else {
        // Default KIE
        const kieResult = await generateImage(apiKey, {
        prompt,
        style: project.imageStyle,
        aspectRatio: project.aspectRatio,
        });
        result = { ...kieResult, prompt };
    }

    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || '이미지 생성 실패');
    }

    return { imageUrl: result.imageUrl, prompt };
  };

  const queue = new ProcessingQueue(
    processor,
    'image',
    { 
        ...options, 
        // Whisk needs longer delay to avoid flooding/detection and longer timeout
        delayBetweenItems: imageSource === 'whisk' ? 5000 : 1000,
        concurrency: imageSource === 'whisk' ? 1 : (options?.concurrency || 3) 
    },
    onProgress,
    (scene, result, error) => {
      if (result) {
        // CORS/COEP 문제 해결을 위해 프록시 URL로 변환
        // Pollinations 포함 모든 외부 이미지는 프록시를 거쳐야 COEP 정책(require-corp)을 만족함
        const isLocal = result.imageUrl.startsWith('/uploads');
        const finalUrl = isLocal ? result.imageUrl : `/api/proxy-image?url=${encodeURIComponent(result.imageUrl)}`;
        
        updateScene?.(scene.id, {
          imageUrl: finalUrl,
          imageSource: 'uploaded', // Always mark Whisk as 'uploaded' for compatibility
          imagePrompt: result.prompt,
          isProcessing: false,
          error: undefined,
        });
      } else {
        updateScene?.(scene.id, {
          isProcessing: false,
          error: error || '알 수 없는 오류',
        });
      }
    }
  );

  queue.addItems(scenes.map((s) => ({ id: `씬 ${s.order + 1}`, data: s })));
  return queue.process();
}

/**
 * ElevenLabs 계정 정보 타입
 */
interface ElevenLabsAccountInfo {
  apiKey: string;
  isActive: boolean;
  remainingQuota?: number;
  voices: { id: string; name: string }[];
}

/**
 * 모든 씬의 음성 일괄 생성 (최적화)
 */
export async function generateAllVoices(
  project: Project,
  settings: Settings,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter((s) => !s.audioGenerated && s.script.trim());
  
  if (scenes.length === 0) {
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0 };
  }

  const processor = async (scene: Scene) => {
    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    // TTS 엔진 및 API 키 결정
    const ttsEngine = scene.ttsEngine || project.defaultTTSEngine || 'elevenlabs';
    
    let apiKey = '';
    let voiceId = scene.voiceId || project.defaultVoiceId;

    if (ttsEngine === 'elevenlabs') {
      const activeAccount = settings.elevenLabsAccounts.find(acc => acc.isActive && acc.apiKey);
      apiKey = activeAccount?.apiKey || '';
      // If voiceId is still empty, try to get from active account
      if (!voiceId && activeAccount && activeAccount.voices && activeAccount.voices.length > 0) {
        voiceId = activeAccount.voices[0].id;
      }
    } else if (ttsEngine === 'fishaudio') {
      apiKey = settings.fishAudioApiKey;
      // If voiceId is empty, try to get from settings 
      if (!voiceId && settings.fishAudioVoices?.length > 0) {
        voiceId = settings.fishAudioVoices[0].id;
      }
    } else if (ttsEngine === 'google') {
      apiKey = settings.googleTtsApiKey || '';
      if (!voiceId && settings.googleVoices?.length > 0) {
        voiceId = settings.googleVoices[0].id;
      }
    } else if (ttsEngine === 'kokoro') {
      // Kokoro doesn't use API key usually, but standardized
      apiKey = ''; 
    }

    if (!apiKey && ttsEngine !== 'kokoro') {
       throw new Error(`API Key missing for ${ttsEngine}`);
    }

    if (!voiceId) {
        throw new Error('Voice ID is missing');
    }

    const result = await generateVoice(apiKey, {
      text: scene.script,
      voiceId: voiceId,
      speed: scene.voiceSpeed,
      emotion: scene.emotion,
      stability: scene.voiceStability,
      similarity: scene.voiceSimilarity,
      style: scene.voiceStyle,
      useSpeakerBoost: scene.voiceSpeakerBoost,
      ttsEngine: ttsEngine
    }, ttsEngine);

    if (!result.success || !result.audioUrl) {
      throw new Error(result.error || '음성 생성 실패');
    }

    return { audioUrl: result.audioUrl, duration: result.audioDuration };
  };

  const queue = new ProcessingQueue(
    processor,
    'voice',
    { ...options, concurrency: 3, delayBetweenItems: 500 }, // 음성 API는 더 빠름
    onProgress,
    (scene, result, error) => {
      if (result) {
        updateScene?.(scene.id, {
          audioUrl: result.audioUrl,
          audioDuration: result.duration,
          audioGenerated: true,
          isProcessing: false,
          error: undefined,
        });
      } else {
        updateScene?.(scene.id, {
          isProcessing: false,
          error: error || '알 수 없는 오류',
        });
      }
    }
  );

  queue.addItems(scenes.map((s) => ({ id: `씬 ${s.order + 1}`, data: s })));
  return queue.process();
}

/**
 * 다중 계정 지원 음성 일괄 생성 (계정 자동 전환)
 * 할당량 소진 시 다음 활성화된 계정으로 자동 전환
 */
export async function generateAllVoicesWithAutoSwitch(
  project: Project,
  accounts: ElevenLabsAccountInfo[],
  defaultVoiceId: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  onAccountSwitch?: (fromIndex: number, toIndex: number, reason: string) => void,
  options?: Partial<BatchOptions>
): Promise<BatchProcessingResult & { accountsUsed: number[] }> {
  const scenes = project.scenes.filter((s) => !s.audioGenerated && s.script.trim());
  
  if (scenes.length === 0) {
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0, accountsUsed: [] };
  }

  // 활성화된 계정만 필터링
  const activeAccounts = accounts
    .map((acc, idx) => ({ ...acc, index: idx }))
    .filter((acc) => acc.isActive && acc.apiKey);

  if (activeAccounts.length === 0) {
    return {
      success: false,
      completed: 0,
      failed: scenes.length,
      errors: ['활성화된 ElevenLabs 계정이 없습니다.'],
      duration: 0,
      accountsUsed: [],
    };
  }

  let currentAccountIndex = 0;
  const accountsUsed: Set<number> = new Set();
  const errors: string[] = [];
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();

  // 할당량 관련 에러 감지
  const isQuotaError = (error: string): boolean => {
    const quotaPatterns = [
      'quota', 'limit', 'exceeded', 'rate',
      '할당량', '한도', 'insufficient', 'balance',
      '429', 'too many requests'
    ];
    const lowerError = error.toLowerCase();
    return quotaPatterns.some(pattern => lowerError.includes(pattern));
  };

  // 다음 사용 가능한 계정 찾기
  const findNextAccount = (currentIdx: number): number | null => {
    for (let i = 1; i <= activeAccounts.length; i++) {
      const nextIdx = (currentIdx + i) % activeAccounts.length;
      if (nextIdx !== currentIdx && !accountsUsed.has(nextIdx)) {
        return nextIdx;
      }
    }
    // 모든 계정 시도해봄, 다시 첫 번째부터
    return currentIdx < activeAccounts.length - 1 ? currentIdx + 1 : null;
  };

  // 씬 하나씩 처리 (계정 전환 가능)
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let success = false;
    let lastError = '';

    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    // 현재 계정으로 시도
    while (!success && currentAccountIndex !== null) {
      const account = activeAccounts[currentAccountIndex];
      accountsUsed.add(account.index);

      try {
        const result = await generateVoice(account.apiKey, {
          text: scene.script,
          voiceId: scene.voiceId || defaultVoiceId,
          speed: scene.voiceSpeed,
          emotion: scene.emotion,
          stability: scene.voiceStability,
          similarity: scene.voiceSimilarity,
          style: scene.voiceStyle,
          useSpeakerBoost: scene.voiceSpeakerBoost,
        });

        if (result.success && result.audioUrl) {
          updateScene?.(scene.id, {
            audioUrl: result.audioUrl,
            audioGenerated: true,
            isProcessing: false,
            error: undefined,
          });
          completed++;
          success = true;
        } else {
          lastError = result.error || '음성 생성 실패';
          
          // 할당량 오류인지 확인
          if (isQuotaError(lastError)) {
            const nextAccount = findNextAccount(currentAccountIndex);
            if (nextAccount !== null) {
              onAccountSwitch?.(currentAccountIndex, nextAccount, `할당량 소진: ${lastError}`);
              currentAccountIndex = nextAccount;
              continue; // 다음 계정으로 재시도
            }
          }
          throw new Error(lastError);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        // 할당량 오류면 계정 전환 시도
        if (isQuotaError(lastError)) {
          const nextAccount = findNextAccount(currentAccountIndex);
          if (nextAccount !== null) {
            onAccountSwitch?.(currentAccountIndex, nextAccount, `오류 발생: ${lastError}`);
            currentAccountIndex = nextAccount;
            await delay(1000); // 계정 전환 후 잠시 대기
            continue;
          }
        }
        
        // 더 이상 전환할 계정 없음
        break;
      }
    }

    if (!success) {
      updateScene?.(scene.id, {
        isProcessing: false,
        error: lastError || '모든 계정 할당량 소진',
      });
      errors.push(`씬 ${scene.order + 1}: ${lastError}`);
      failed++;
    }

    // 진행 상황 보고
    onProgress?.({
      type: 'voice',
      total: scenes.length,
      completed,
      failed,
      current: `씬 ${scene.order + 1} 처리 완료 (계정 ${currentAccountIndex + 1} 사용 중)`,
      errors,
    });

    // 항목 간 딜레이
    if (i < scenes.length - 1) {
      await delay(options?.delayBetweenItems || 500);
    }
  }

  return {
    success: failed === 0,
    completed,
    failed,
    errors,
    duration: Date.now() - startTime,
    accountsUsed: Array.from(accountsUsed),
  };
}

/**
 * 모든 씬 일괄 렌더링 (브라우저 기반)
 * - 50~100씬 대량 처리 최적화
 * - 메모리 관리를 위해 순차 처리 (concurrency: 1)
 * - 동적 import로 브라우저 전용 코드 분리
 */
export async function renderAllScenes(
  project: Project,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  _options?: Partial<BatchOptions>
): Promise<BatchProcessingResult> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    console.error('[renderAllScenes] 서버 환경에서 호출됨 - 브라우저에서만 실행 가능');
    return { 
      success: false, 
      completed: 0, 
      failed: 0, 
      errors: ['렌더링은 브라우저에서만 가능합니다.'], 
      duration: 0 
    };
  }

  const scenes = project.scenes.filter((s) => s.imageUrl && s.audioGenerated && !s.rendered);
  
  if (scenes.length === 0) {
    console.log('[renderAllScenes] 렌더링할 씬이 없습니다.');
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0 };
  }

  console.log(`[renderAllScenes] 렌더링 시작: ${scenes.length}개 씬`);

  // 동적 import로 브라우저 전용 렌더러 로드
  let renderVideo: typeof import('@/lib/ffmpeg/ffmpegClient').renderVideo;
  try {
    const ffmpegModule = await import('@/lib/ffmpeg/ffmpegClient');
    renderVideo = ffmpegModule.renderVideo;
    console.log('[renderAllScenes] ffmpegClient 모듈 로드 완료');
  } catch (error) {
    console.error('[renderAllScenes] ffmpegClient 로드 실패:', error);
    return {
      success: false,
      completed: 0,
      failed: scenes.length,
      errors: ['렌더링 모듈 로드 실패'],
      duration: 0,
    };
  }

  const renderSettings = project.renderSettings;
  const errors: string[] = [];
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();

  // 순차 처리로 메모리 관리
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneLabel = `씬 ${scene.order + 1}`;

    try {
      updateScene?.(scene.id, { isProcessing: true, error: undefined });

      // 진행상황 보고
      onProgress?.({
        type: 'render',
        total: scenes.length,
        completed,
        failed,
        current: `${sceneLabel} 렌더링 중...`,
        errors,
      });

      console.log(`[renderAllScenes] ${sceneLabel} 렌더링 시작`);
      console.log(`  - 이미지: ${scene.imageUrl?.substring(0, 50)}...`);
      console.log(`  - 오디오: ${scene.audioUrl?.substring(0, 50)}...`);

      // 메모리 정리를 위한 지연
      await delay(500);

      // 브라우저 기반 렌더링 실행
      // 씬별 설정이 없으면 프로젝트 기본값 사용
      const result = await renderVideo({
        imageUrl: scene.imageUrl!,
        audioUrl: scene.audioUrl!,
        aspectRatio: project.aspectRatio,
        // 효과 설정 (씬 → 프로젝트 기본값 → 'none')
        kenBurns: scene.kenBurns || project.defaultKenBurns || 'none',
        kenBurnsIntensity: scene.kenBurnsZoom || project.defaultKenBurnsZoom || 15,
        transition: scene.transition || project.defaultTransition || 'none',
        // 모션 효과 (캐릭터 애니메이션)
        motionEffect: scene.motionEffect || project.defaultMotionEffect || 'none',
        motionIntensity: scene.motionIntensity || 1.0,
        // 품질 설정
        resolution: renderSettings?.resolution || '1080p',
        fps: renderSettings?.fps || 30,
        bitrate: renderSettings?.bitrate || 'high',
        // 자막 (스크립트 내용)
        text: (project.subtitleEnabled && (scene.subtitleEnabled ?? true)) ? scene.script : undefined, 
      });

      console.log(`[renderAllScenes] ${sceneLabel} 렌더링 완료`);
      console.log(`  - 비디오 URL 생성: ${!!result.videoUrl}`);
      console.log(`  - Blob 크기: ${result.videoBlob ? (result.videoBlob.size / 1024 / 1024).toFixed(2) : 0}MB`);

      // 씬 업데이트
      updateScene?.(scene.id, {
        videoUrl: result.videoUrl,
        rendered: true,
        isProcessing: false,
        error: undefined,
      });

      completed++;

      // 렌더링 후 메모리 정리 대기
      await delay(500);

      // 가비지 컬렉션 힌트 (브라우저가 참조 해제된 blob 정리하도록)
      if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
        (window as unknown as { gc?: () => void }).gc?.();
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[renderAllScenes] ${sceneLabel} 렌더링 실패:`, errorMsg);
      
      errors.push(`${sceneLabel}: ${errorMsg}`);
      failed++;

      updateScene?.(scene.id, {
        isProcessing: false,
        error: errorMsg,
      });

      // 오류 발생 후 잠시 대기
      await delay(1000);
    }

    // 진행상황 보고
    onProgress?.({
      type: 'render',
      total: scenes.length,
      completed,
      failed,
      current: i === scenes.length - 1 ? '완료' : `${sceneLabel} 완료`,
      errors,
    });
  }

  const duration = Date.now() - startTime;
  console.log(`[renderAllScenes] 전체 렌더링 완료: ${completed}개 성공, ${failed}개 실패, ${duration}ms 소요`);

  return {
    success: failed === 0,
    completed,
    failed,
    errors,
    duration,
  };
}

/**
 * 특정 범위의 씬만 처리 (대용량 지원)
 */
export async function processSceneRange(
  project: Project,
  startIndex: number,
  endIndex: number,
  type: 'image' | 'voice' | 'render',
  settings: Settings,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<BatchProcessingResult> {
  const scenesToProcess = project.scenes.slice(startIndex, endIndex + 1);
  const tempProject = { ...project, scenes: scenesToProcess };

  switch (type) {
    case 'image':
      return generateAllImages(tempProject, settings.kieApiKey, onProgress, updateScene);
    case 'voice':
      return generateAllVoices(tempProject, settings, onProgress, updateScene);
    case 'render':
      return renderAllScenes(tempProject, onProgress, updateScene);
  }
}

/**
 * 전체 파이프라인 실행 (이미지 → 음성 → 렌더링)
 * - 브라우저 환경에서만 렌더링 가능
 * - 각 단계는 최신 프로젝트 상태를 사용하도록 getLatestProject 콜백 지원
 */
export async function runFullPipeline(
  project: Project,
  settings: Settings,
  onProgress?: (stage: string, progress: BatchProcessingProgress) => void,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>,
  getLatestProject?: () => Project | null // 최신 프로젝트 상태 가져오기
): Promise<{
  imageResult: BatchProcessingResult;
  voiceResult: BatchProcessingResult;
  renderResult: BatchProcessingResult;
  totalDuration: number;
}> {
  const startTime = Date.now();
  console.log('[runFullPipeline] 전체 파이프라인 시작');
  console.log(`  - 브라우저 환경: ${typeof window !== 'undefined'}`);
  console.log(`  - 씬 수: ${project.scenes.length}`);

  // 1. 이미지 생성
  console.log('[runFullPipeline] 1단계: 이미지 생성');
  onProgress?.('image', {
    type: 'image',
    total: project.scenes.length,
    completed: 0,
    failed: 0,
    current: '이미지 생성 시작...',
    errors: [],
  });

  const imageResult = await generateAllImages(
    project,
    settings.kieApiKey,
    (p) => onProgress?.('image', p),
    updateScene,
    options
  );
  console.log(`[runFullPipeline] 이미지 생성 완료: ${imageResult.completed}개 성공, ${imageResult.failed}개 실패`);

  // 2. 음성 생성 (최신 프로젝트 상태 사용)
  const projectForVoice = getLatestProject?.() || project;
  console.log('[runFullPipeline] 2단계: 음성 생성');
  onProgress?.('voice', {
    type: 'voice',
    total: projectForVoice.scenes.length,
    completed: 0,
    failed: 0,
    current: '음성 생성 시작...',
    errors: [],
  });

  const voiceResult = await generateAllVoices(
    projectForVoice,
    settings,
    (p) => onProgress?.('voice', p),
    updateScene,
    options
  );
  console.log(`[runFullPipeline] 음성 생성 완료: ${voiceResult.completed}개 성공, ${voiceResult.failed}개 실패`);

  // 3. 렌더링 (브라우저 환경에서만 가능, 최신 프로젝트 상태 사용)
  const projectForRender = getLatestProject?.() || project;
  console.log('[runFullPipeline] 3단계: 렌더링');
  
  if (typeof window === 'undefined') {
    console.warn('[runFullPipeline] 서버 환경에서는 렌더링을 건너뜁니다.');
    return {
      imageResult,
      voiceResult,
      renderResult: {
        success: false,
        completed: 0,
        failed: 0,
        errors: ['렌더링은 브라우저에서만 가능합니다.'],
        duration: 0,
      },
      totalDuration: Date.now() - startTime,
    };
  }

  onProgress?.('render', {
    type: 'render',
    total: projectForRender.scenes.length,
    completed: 0,
    failed: 0,
    current: '렌더링 시작...',
    errors: [],
  });

  const renderResult = await renderAllScenes(
    projectForRender,
    (p) => onProgress?.('render', p),
    updateScene,
    options
  );
  console.log(`[runFullPipeline] 렌더링 완료: ${renderResult.completed}개 성공, ${renderResult.failed}개 실패`);

  const totalDuration = Date.now() - startTime;
  console.log(`[runFullPipeline] 전체 파이프라인 완료: ${totalDuration}ms 소요`);

  return {
    imageResult,
    voiceResult,
    renderResult,
    totalDuration,
  };
}

// ==================== 유틸리티 내보내기 ====================

export { delay, chunkArray, withRetry };
// Types already exported above
