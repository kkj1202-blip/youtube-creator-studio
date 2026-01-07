/**
 * 일괄 처리 서비스 (최적화 버전)
 * 이미지/음성/렌더링 일괄 처리 관리
 * - 병렬 처리 지원
 * - 큐 시스템
 * - 재시도 로직
 * - 일시정지/재개 기능
 */

import type { Scene, Project } from '@/types';
import { generateImage, generateImagePrompt } from './imageGeneration';
import { generateVoice } from './voiceGeneration';
// 브라우저 렌더링 사용 (서버 API 대신)
import { renderVideo } from '@/lib/ffmpeg/ffmpegClient';

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
      const results = await Promise.allSettled(
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

/**
 * 모든 씬의 이미지 일괄 생성 (최적화)
 */
export async function generateAllImages(
  project: Project,
  apiKey: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter((s) => !s.imageUrl || s.imageSource === 'none');
  
  if (scenes.length === 0) {
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0 };
  }

  const processor = async (scene: Scene) => {
    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    const prompt = scene.imagePrompt || generateImagePrompt(
      scene.script,
      project.imageStyle,
      project.customStylePrompt
    );

    const result = await generateImage(apiKey, {
      prompt,
      style: project.imageStyle,
      aspectRatio: project.aspectRatio,
    });

    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || '이미지 생성 실패');
    }

    return { imageUrl: result.imageUrl, prompt };
  };

  const queue = new ProcessingQueue(
    processor,
    'image',
    { ...options, delayBetweenItems: 1000 }, // 이미지 API rate limit
    onProgress,
    (scene, result, error) => {
      if (result) {
        updateScene?.(scene.id, {
          imageUrl: result.imageUrl,
          imageSource: 'generated',
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
  apiKey: string,
  defaultVoiceId: string,
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

    const result = await generateVoice(apiKey, {
      text: scene.script,
      voiceId: scene.voiceId || defaultVoiceId,
      speed: scene.voiceSpeed,
      emotion: scene.emotion,
    });

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
 */
export async function renderAllScenes(
  project: Project,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter((s) => s.imageUrl && s.audioGenerated && !s.rendered);
  
  if (scenes.length === 0) {
    return { success: true, completed: 0, failed: 0, errors: [], duration: 0 };
  }

  const renderSettings = project.renderSettings;

  const processor = async (scene: Scene) => {
    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    // 메모리 정리를 위한 약간의 지연
    await delay(300);

    // 브라우저 기반 렌더링 사용
    const result = await renderVideo({
      imageUrl: scene.imageUrl!,
      audioUrl: scene.audioUrl!,
      aspectRatio: project.aspectRatio,
      // 효과 설정
      kenBurns: scene.kenBurns || 'none',
      kenBurnsIntensity: scene.kenBurnsZoom || 15, // 강도 (기본 15%)
      transition: scene.transition || 'fade',
      // 품질 설정
      resolution: renderSettings?.resolution || '1080p',
      fps: renderSettings?.fps || 30,
      bitrate: renderSettings?.bitrate || 'high',
    });

    // 렌더링 후 메모리 정리 대기
    await delay(200);

    return { 
      videoUrl: result.videoUrl, 
      videoBlob: result.videoBlob,
      duration: result.duration 
    };
  };

  const queue = new ProcessingQueue(
    processor,
    'render',
    { ...options, concurrency: 1, delayBetweenItems: 1000 }, // 순차 처리 + 1초 딜레이
    onProgress,
    (scene, result, error) => {
      if (result) {
        updateScene?.(scene.id, {
          videoUrl: result.videoUrl,
          rendered: true,
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
 * 특정 범위의 씬만 처리 (대용량 지원)
 */
export async function processSceneRange(
  project: Project,
  startIndex: number,
  endIndex: number,
  type: 'image' | 'voice' | 'render',
  apiKey: string,
  defaultVoiceId: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<BatchProcessingResult> {
  const scenesToProcess = project.scenes.slice(startIndex, endIndex + 1);
  const tempProject = { ...project, scenes: scenesToProcess };

  switch (type) {
    case 'image':
      return generateAllImages(tempProject, apiKey, onProgress, updateScene);
    case 'voice':
      return generateAllVoices(tempProject, apiKey, defaultVoiceId, onProgress, updateScene);
    case 'render':
      return renderAllScenes(tempProject, onProgress, updateScene);
  }
}

/**
 * 전체 파이프라인 실행 (이미지 → 음성 → 렌더링)
 */
export async function runFullPipeline(
  project: Project,
  imageApiKey: string,
  voiceApiKey: string,
  defaultVoiceId: string,
  onProgress?: (stage: string, progress: BatchProcessingProgress) => void,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void,
  options?: Partial<BatchOptions>
): Promise<{
  imageResult: BatchProcessingResult;
  voiceResult: BatchProcessingResult;
  renderResult: BatchProcessingResult;
  totalDuration: number;
}> {
  const startTime = Date.now();

  // 1. 이미지 생성
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
    imageApiKey,
    (p) => onProgress?.('image', p),
    updateScene,
    options
  );

  // 2. 음성 생성
  onProgress?.('voice', {
    type: 'voice',
    total: project.scenes.length,
    completed: 0,
    failed: 0,
    current: '음성 생성 시작...',
    errors: [],
  });

  const voiceResult = await generateAllVoices(
    project,
    voiceApiKey,
    defaultVoiceId,
    (p) => onProgress?.('voice', p),
    updateScene,
    options
  );

  // 3. 렌더링
  onProgress?.('render', {
    type: 'render',
    total: project.scenes.length,
    completed: 0,
    failed: 0,
    current: '렌더링 시작...',
    errors: [],
  });

  const renderResult = await renderAllScenes(
    project,
    (p) => onProgress?.('render', p),
    updateScene,
    options
  );

  return {
    imageResult,
    voiceResult,
    renderResult,
    totalDuration: Date.now() - startTime,
  };
}

// ==================== 유틸리티 내보내기 ====================

export { delay, chunkArray, withRetry };
// Types already exported above
