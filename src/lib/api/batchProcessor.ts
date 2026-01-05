/**
 * 일괄 처리 서비스
 * 이미지/음성/렌더링 일괄 처리 관리
 */

import type { Scene, Project } from '@/types';
import { generateImage, generateImagePrompt } from './imageGeneration';
import { generateVoice } from './voiceGeneration';
import { renderScene } from './renderService';

export interface BatchProcessingProgress {
  type: 'image' | 'voice' | 'render';
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

export interface BatchProcessingResult {
  success: boolean;
  completed: number;
  failed: number;
  errors: string[];
}

export type ProgressCallback = (progress: BatchProcessingProgress) => void;

/**
 * 모든 씬의 이미지 일괄 생성
 */
export async function generateAllImages(
  project: Project,
  apiKey: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter(s => !s.imageUrl || s.imageSource === 'none');
  const errors: string[] = [];
  let completed = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    onProgress?.({
      type: 'image',
      total: scenes.length,
      completed,
      current: `씬 ${scene.order + 1} 이미지 생성 중...`,
      errors,
    });

    // 처리 중 상태 업데이트
    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    try {
      // 프롬프트 생성
      const prompt = scene.imagePrompt || generateImagePrompt(
        scene.script,
        project.imageStyle,
        project.customStylePrompt
      );

      // 이미지 생성
      const result = await generateImage(apiKey, {
        prompt,
        style: project.imageStyle,
        aspectRatio: project.aspectRatio,
      });

      if (result.success && result.imageUrl) {
        updateScene?.(scene.id, {
          imageUrl: result.imageUrl,
          imageSource: 'generated',
          imagePrompt: prompt,
          isProcessing: false,
          error: undefined,
        });
        completed++;
      } else {
        const errorMsg = `씬 ${scene.order + 1}: ${result.error || '알 수 없는 오류'}`;
        errors.push(errorMsg);
        updateScene?.(scene.id, {
          isProcessing: false,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMsg = `씬 ${scene.order + 1}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      errors.push(errorMsg);
      updateScene?.(scene.id, {
        isProcessing: false,
        error: errorMsg,
      });
    }

    // API 호출 간격 (rate limiting 방지)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  onProgress?.({
    type: 'image',
    total: scenes.length,
    completed,
    current: '완료',
    errors,
  });

  return {
    success: errors.length === 0,
    completed,
    failed: scenes.length - completed,
    errors,
  };
}

/**
 * 모든 씬의 음성 일괄 생성
 */
export async function generateAllVoices(
  project: Project,
  apiKey: string,
  defaultVoiceId: string,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter(s => !s.audioGenerated && s.script.trim());
  const errors: string[] = [];
  let completed = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    onProgress?.({
      type: 'voice',
      total: scenes.length,
      completed,
      current: `씬 ${scene.order + 1} 음성 생성 중...`,
      errors,
    });

    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    try {
      const result = await generateVoice(apiKey, {
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
      } else {
        const errorMsg = `씬 ${scene.order + 1}: ${result.error || '알 수 없는 오류'}`;
        errors.push(errorMsg);
        updateScene?.(scene.id, {
          isProcessing: false,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMsg = `씬 ${scene.order + 1}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      errors.push(errorMsg);
      updateScene?.(scene.id, {
        isProcessing: false,
        error: errorMsg,
      });
    }

    // API 호출 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  onProgress?.({
    type: 'voice',
    total: scenes.length,
    completed,
    current: '완료',
    errors,
  });

  return {
    success: errors.length === 0,
    completed,
    failed: scenes.length - completed,
    errors,
  };
}

/**
 * 모든 씬 일괄 렌더링
 */
export async function renderAllScenes(
  project: Project,
  onProgress?: ProgressCallback,
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<BatchProcessingResult> {
  const scenes = project.scenes.filter(s => s.imageUrl && s.audioGenerated && !s.rendered);
  const errors: string[] = [];
  let completed = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    onProgress?.({
      type: 'render',
      total: scenes.length,
      completed,
      current: `씬 ${scene.order + 1} 렌더링 중...`,
      errors,
    });

    updateScene?.(scene.id, { isProcessing: true, error: undefined });

    try {
      const result = await renderScene({
        sceneId: scene.id,
        imageUrl: scene.imageUrl!,
        audioUrl: scene.audioUrl!,
        aspectRatio: project.aspectRatio,
        transition: scene.transition,
        kenBurns: scene.kenBurns,
        subtitle: {
          enabled: scene.subtitleEnabled,
          text: scene.script,
          style: project.subtitleStyle,
        },
      });

      if (result.success && result.videoUrl) {
        updateScene?.(scene.id, {
          videoUrl: result.videoUrl,
          rendered: true,
          isProcessing: false,
          error: undefined,
        });
        completed++;
      } else {
        const errorMsg = `씬 ${scene.order + 1}: ${result.error || '알 수 없는 오류'}`;
        errors.push(errorMsg);
        updateScene?.(scene.id, {
          isProcessing: false,
          error: result.error,
        });
      }
    } catch (error) {
      const errorMsg = `씬 ${scene.order + 1}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      errors.push(errorMsg);
      updateScene?.(scene.id, {
        isProcessing: false,
        error: errorMsg,
      });
    }

    // 렌더링 간격
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  onProgress?.({
    type: 'render',
    total: scenes.length,
    completed,
    current: '완료',
    errors,
  });

  return {
    success: errors.length === 0,
    completed,
    failed: scenes.length - completed,
    errors,
  };
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
  updateScene?: (sceneId: string, updates: Partial<Scene>) => void
): Promise<{
  imageResult: BatchProcessingResult;
  voiceResult: BatchProcessingResult;
  renderResult: BatchProcessingResult;
}> {
  // 1. 이미지 생성
  onProgress?.('image', {
    type: 'image',
    total: project.scenes.length,
    completed: 0,
    current: '이미지 생성 시작...',
    errors: [],
  });

  const imageResult = await generateAllImages(
    project,
    imageApiKey,
    (p) => onProgress?.('image', p),
    updateScene
  );

  // 2. 음성 생성
  onProgress?.('voice', {
    type: 'voice',
    total: project.scenes.length,
    completed: 0,
    current: '음성 생성 시작...',
    errors: [],
  });

  const voiceResult = await generateAllVoices(
    project,
    voiceApiKey,
    defaultVoiceId,
    (p) => onProgress?.('voice', p),
    updateScene
  );

  // 3. 렌더링
  onProgress?.('render', {
    type: 'render',
    total: project.scenes.length,
    completed: 0,
    current: '렌더링 시작...',
    errors: [],
  });

  const renderResult = await renderAllScenes(
    project,
    (p) => onProgress?.('render', p),
    updateScene
  );

  return { imageResult, voiceResult, renderResult };
}
