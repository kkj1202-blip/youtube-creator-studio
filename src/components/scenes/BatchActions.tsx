'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Image as ImageIcon,
  Volume2,
  Video,
  Download,
  Settings2,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Upload,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Card, Select, Toggle, Slider, Modal } from '@/components/ui';
import ImageUploader from './ImageUploader';
import CharacterAnalyzer from './CharacterAnalyzer';
import type { Scene, EmotionTag, TransitionType, KenBurnsEffect } from '@/types';
import {
  generateAllImages,
  generateAllVoices,
  renderAllScenes,
  runFullPipeline,
  type BatchProcessingProgress,
} from '@/lib/api/batchProcessor';
import { 
  downloadVideo, 
  downloadAudio, 
  downloadImage,
  downloadAllToDirectory,
  isDirectoryPickerSupported,
  isFileSavePickerSupported,
} from '@/lib/api/renderService';

const emotionOptions = [
  { value: 'normal', label: '일반' },
  { value: 'emphasis', label: '강조' },
  { value: 'whisper', label: '속삭임' },
  { value: 'excited', label: '흥분' },
];

const transitionOptions = [
  { value: 'none', label: '없음' },
  { value: 'fade', label: '페이드' },
  { value: 'slide', label: '슬라이드' },
];

const kenBurnsOptions = [
  { value: 'none', label: '없음' },
  { value: 'random', label: '🎲 랜덤 (매번 다른 효과)' },
  { value: 'zoom-in', label: '🔍 줌 인' },
  { value: 'zoom-out', label: '🔎 줌 아웃' },
  { value: 'pan-left', label: '⬅️ 왼쪽 패닝' },
  { value: 'pan-right', label: '➡️ 오른쪽 패닝' },
  { value: 'pan-up', label: '⬆️ 위로 패닝' },
  { value: 'pan-down', label: '⬇️ 아래로 패닝' },
];

interface ProgressState {
  isRunning: boolean;
  currentStage: 'idle' | 'image' | 'voice' | 'render';
  progress: BatchProcessingProgress | null;
  errors: string[];
  completed: {
    image: number;
    voice: number;
    render: number;
  };
  startTime: number | null;
  currentSceneNumber: number;
}

// 시간 포맷 함수
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}초`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}분 ${secs}초`;
};

// 예상 시간 계산
const estimateRemainingTime = (
  completed: number,
  total: number,
  elapsedMs: number,
  type: 'image' | 'voice' | 'render'
): string => {
  if (completed === 0 || elapsedMs === 0) {
    // 기본 예상 시간 (타입별)
    const baseTimePerScene = { image: 15, voice: 5, render: 10 }[type];
    return formatTime(total * baseTimePerScene);
  }
  
  const avgTimePerScene = elapsedMs / 1000 / completed;
  const remaining = (total - completed) * avgTimePerScene;
  return formatTime(remaining);
};

const BatchActions: React.FC = () => {
  const {
    currentProject,
    settings,
    updateScene,
    applyToAllScenes,
  } = useStore();

  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [showBatchImageUploader, setShowBatchImageUploader] = useState(false);
  const [showCharacterAnalyzer, setShowCharacterAnalyzer] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [processingState, setProcessingState] = useState<ProgressState>({
    isRunning: false,
    currentStage: 'idle',
    progress: null,
    errors: [],
    completed: { image: 0, voice: 0, render: 0 },
    startTime: null,
    currentSceneNumber: 0,
  });
  const [bulkSettings, setBulkSettings] = useState({
    voiceSpeed: 1.0,
    emotion: 'normal' as EmotionTag,
    transition: 'fade' as TransitionType,
    kenBurns: 'random' as KenBurnsEffect,
    kenBurnsZoom: 15, // Ken Burns 강도 (기본 15%)
    postAudioGap: 0.5,
    subtitleEnabled: true,
  });

  if (!currentProject) return null;

  const scenes = currentProject.scenes;
  
  // 상세 통계
  const stats = useMemo(() => {
    const errorScenes = scenes.filter((s) => s.error);
    const errorDetails = {
      image: errorScenes.filter(s => !s.imageUrl).length,
      voice: errorScenes.filter(s => !s.audioGenerated && s.imageUrl).length,
      render: errorScenes.filter(s => !s.rendered && s.audioGenerated).length,
    };
    
    // 실패한 씬 목록
    const failedScenes = {
      image: scenes.filter(s => !s.imageUrl && s.script.trim()),
      voice: scenes.filter(s => !s.audioGenerated && s.script.trim()),
      render: scenes.filter(s => !s.rendered && s.imageUrl && s.audioGenerated),
    };
    
    return {
      total: scenes.length,
      withImage: scenes.filter((s) => s.imageUrl).length,
      withAudio: scenes.filter((s) => s.audioGenerated).length,
      rendered: scenes.filter((s) => s.rendered).length,
      processing: scenes.filter((s) => s.isProcessing).length,
      errors: errorScenes.length,
      errorDetails,
      failedScenes,
      errorMessages: errorScenes.map(s => ({
        sceneNumber: s.order + 1,
        error: s.error || '알 수 없는 오류',
      })),
    };
  }, [scenes]);

  // 기존 이미지가 있는 씬 맵
  const existingSceneImages = useMemo(() => {
    return new Map(
      scenes
        .filter(s => s.imageUrl)
        .map(s => [s.order + 1, true])
    );
  }, [scenes]);

  // 진행률 및 시간 계산
  const progressInfo = useMemo(() => {
    const { progress, startTime, currentStage } = processingState;
    const percent = progress
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;
    
    const elapsed = startTime ? Date.now() - startTime : 0;
    const remaining = progress && startTime
      ? estimateRemainingTime(progress.completed, progress.total, elapsed, currentStage as 'image' | 'voice' | 'render')
      : '';
    
    return { percent, elapsed, remaining };
  }, [processingState]);

  // API 키 확인
  const hasImageApiKey = !!settings.kieApiKey;
  
  // 활성화된 ElevenLabs 계정 찾기
  const activeAccountIndex = useMemo(() => {
    return settings.elevenLabsAccounts.findIndex(acc => acc.isActive && acc.apiKey);
  }, [settings.elevenLabsAccounts]);
  
  const hasVoiceApiKey = activeAccountIndex !== -1;
  const hasDefaultVoice = !!(
    currentProject.defaultVoiceId || 
    (activeAccountIndex !== -1 && settings.elevenLabsAccounts[activeAccountIndex]?.voices?.[0]?.id)
  );

  // 일괄 이미지 업로드 처리
  const handleBatchImageUpload = useCallback((images: Array<{ imageUrl: string; sceneNumber: number | null }>) => {
    images.forEach(({ imageUrl, sceneNumber }) => {
      if (sceneNumber !== null && sceneNumber >= 1 && sceneNumber <= scenes.length) {
        const targetScene = scenes.find(s => s.order === sceneNumber - 1);
        if (targetScene) {
          updateScene(targetScene.id, {
            imageUrl,
            imageSource: 'uploaded',
            error: undefined,
          });
        }
      }
    });
    setShowBatchImageUploader(false);
    alert(`${images.length}개의 이미지가 씬에 적용되었습니다.`);
  }, [scenes, updateScene]);

  // ========== 실패한 씬만 재시도 기능 ==========
  
  // 이미지 생성 실패한 씬만 재시도
  const handleRetryFailedImages = useCallback(async () => {
    if (!hasImageApiKey) {
      alert('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    const failedScenes = stats.failedScenes.image;
    if (failedScenes.length === 0) {
      alert('재시도할 이미지가 없습니다.');
      return;
    }

    // 에러 초기화
    failedScenes.forEach(scene => {
      updateScene(scene.id, { error: undefined });
    });

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'image',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      // 실패한 씬만 포함한 임시 프로젝트 생성
      const tempProject = {
        ...currentProject,
        scenes: failedScenes,
      };

      const result = await generateAllImages(
        tempProject,
        settings.kieApiKey,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, image: prev.completed.image + result.completed },
        errors: result.errors,
        startTime: null,
      }));

      alert(`이미지 재시도 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings.kieApiKey, hasImageApiKey, stats.failedScenes.image, updateScene]);

  // 음성 생성 실패한 씬만 재시도
  const handleRetryFailedVoices = useCallback(async () => {
    if (!hasVoiceApiKey) {
      alert('설정에서 ElevenLabs API 키를 입력하고 계정을 활성화하세요.');
      return;
    }

    const failedScenes = stats.failedScenes.voice;
    if (failedScenes.length === 0) {
      alert('재시도할 음성이 없습니다.');
      return;
    }

    // 에러 초기화
    failedScenes.forEach(scene => {
      updateScene(scene.id, { error: undefined });
    });

    const apiKey = settings.elevenLabsAccounts[activeAccountIndex].apiKey;
    const defaultVoiceId = currentProject.defaultVoiceId || 
      settings.elevenLabsAccounts[activeAccountIndex].voices[0]?.id;

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'voice',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const tempProject = {
        ...currentProject,
        scenes: failedScenes,
      };

      const result = await generateAllVoices(
        tempProject,
        apiKey,
        defaultVoiceId,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, voice: prev.completed.voice + result.completed },
        errors: result.errors,
        startTime: null,
      }));

      alert(`음성 재시도 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings.elevenLabsAccounts, activeAccountIndex, hasVoiceApiKey, stats.failedScenes.voice, updateScene]);

  // 렌더링 실패한 씬만 재시도
  const handleRetryFailedRenders = useCallback(async () => {
    const failedScenes = stats.failedScenes.render;
    if (failedScenes.length === 0) {
      alert('재시도할 렌더링이 없습니다.');
      return;
    }

    // 에러 초기화
    failedScenes.forEach(scene => {
      updateScene(scene.id, { error: undefined });
    });

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'render',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const tempProject = {
        ...currentProject,
        scenes: failedScenes,
      };

      const result = await renderAllScenes(
        tempProject,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, render: prev.completed.render + result.completed },
        errors: result.errors,
        startTime: null,
      }));

      alert(`렌더링 재시도 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, stats.failedScenes.render, updateScene]);

  // ========== 기존 일괄 처리 함수 (시간 추적 추가) ==========

  // 캐릭터 승인 후 전체 씬 이미지 생성
  const handleCharacterApproved = useCallback(async (
    characters: Array<{ name: string; appearance: string; description: string; imageUrl?: string }>
  ) => {
    setShowCharacterAnalyzer(false);
    
    if (!hasImageApiKey) {
      alert('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    // 승인된 캐릭터 정보 로그
    console.log('[BatchActions] Approved characters:', characters);
    console.log('[BatchActions] Starting scene image generation with character consistency');

    // 이미지 일괄 생성 시작
    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'image',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const result = await generateAllImages(
        currentProject,
        settings.kieApiKey,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, image: result.completed },
        errors: result.errors,
        startTime: null,
      }));

      if (result.errors.length > 0) {
        alert(`이미지 생성 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
      } else {
        alert(`✅ 모든 씬 이미지 생성 완료! (${result.completed}개)\n\n승인된 캐릭터: ${characters.map(c => c.name).join(', ')}`);
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings.kieApiKey, hasImageApiKey, updateScene]);

  const handleGenerateAllImages = useCallback(async () => {
    if (!hasImageApiKey) {
      alert('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'image',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const result = await generateAllImages(
        currentProject,
        settings.kieApiKey,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, image: result.completed },
        errors: result.errors,
        startTime: null,
      }));

      if (result.errors.length > 0) {
        alert(`이미지 생성 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings.kieApiKey, hasImageApiKey, updateScene]);

  const handleGenerateAllAudio = useCallback(async () => {
    if (!hasVoiceApiKey) {
      alert('설정에서 ElevenLabs API 키를 입력하고 계정을 활성화하세요.');
      return;
    }

    if (!hasDefaultVoice) {
      alert('기본 보이스를 선택하세요.');
      return;
    }

    const apiKey = settings.elevenLabsAccounts[activeAccountIndex].apiKey;
    const defaultVoiceId = currentProject.defaultVoiceId || 
      settings.elevenLabsAccounts[activeAccountIndex].voices[0]?.id;

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'voice',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const result = await generateAllVoices(
        currentProject,
        apiKey,
        defaultVoiceId,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, voice: result.completed },
        errors: result.errors,
        startTime: null,
      }));

      if (result.errors.length > 0) {
        alert(`음성 생성 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings.elevenLabsAccounts, activeAccountIndex, hasVoiceApiKey, hasDefaultVoice, updateScene]);

  const handleRenderAllScenes = useCallback(async () => {
    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'render',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      const result = await renderAllScenes(
        currentProject,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene
      );

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: { ...prev.completed, render: result.completed },
        errors: result.errors,
        startTime: null,
      }));

      if (result.errors.length > 0) {
        alert(`렌더링 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, updateScene]);

  const handleRunFullPipeline = useCallback(async () => {
    if (!hasImageApiKey || !hasVoiceApiKey || !hasDefaultVoice) {
      alert('모든 API 키와 기본 보이스 설정이 필요합니다.');
      return;
    }

    const voiceApiKey = settings.elevenLabsAccounts[activeAccountIndex].apiKey;
    const defaultVoiceId = currentProject.defaultVoiceId ||
      settings.elevenLabsAccounts[activeAccountIndex].voices[0]?.id;

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'image',
      progress: null,
      errors: [],
      startTime: Date.now(),
      currentSceneNumber: 0,
    }));

    try {
      // 최신 프로젝트 상태를 가져오는 콜백 (렌더링 시 최신 씬 데이터 사용)
      const getLatestProject = () => {
        const state = useStore.getState();
        return state.currentProject;
      };

      console.log('[BatchActions] 전체 자동처리 시작');
      console.log(`  - 씬 수: ${currentProject.scenes.length}`);
      console.log(`  - 이미지 없는 씬: ${currentProject.scenes.filter(s => !s.imageUrl).length}`);
      console.log(`  - 음성 없는 씬: ${currentProject.scenes.filter(s => !s.audioGenerated).length}`);
      console.log(`  - 렌더링 안된 씬: ${currentProject.scenes.filter(s => !s.rendered).length}`);

      const result = await runFullPipeline(
        currentProject,
        settings.kieApiKey,
        voiceApiKey,
        defaultVoiceId,
        (stage, progress) => {
          console.log(`[BatchActions] 단계: ${stage}, 완료: ${progress.completed}/${progress.total}`);
          setProcessingState(prev => ({
            ...prev,
            currentStage: stage as 'image' | 'voice' | 'render',
            progress,
            errors: progress.errors,
            currentSceneNumber: progress.completed + 1,
          }));
        },
        updateScene,
        undefined, // options
        getLatestProject // 최신 프로젝트 상태 콜백
      );

      console.log('[BatchActions] 전체 자동처리 완료');
      console.log(`  - 이미지: ${result.imageResult.completed}개`);
      console.log(`  - 음성: ${result.voiceResult.completed}개`);
      console.log(`  - 렌더링: ${result.renderResult.completed}개`);

      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        completed: {
          image: result.imageResult.completed,
          voice: result.voiceResult.completed,
          render: result.renderResult.completed,
        },
        errors: [
          ...result.imageResult.errors,
          ...result.voiceResult.errors,
          ...result.renderResult.errors,
        ],
        startTime: null,
      }));

      const totalErrors = result.imageResult.errors.length + 
        result.voiceResult.errors.length + 
        result.renderResult.errors.length;

      if (totalErrors > 0) {
        alert(`처리 완료\n이미지: ${result.imageResult.completed}개\n음성: ${result.voiceResult.completed}개\n렌더링: ${result.renderResult.completed}개\n오류: ${totalErrors}건`);
      } else {
        alert('모든 처리가 완료되었습니다!');
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
        startTime: null,
      }));
    }
  }, [currentProject, settings, activeAccountIndex, hasImageApiKey, hasVoiceApiKey, hasDefaultVoice, updateScene]);

  const handleApplyBulkSettings = () => {
    applyToAllScenes(bulkSettings);
    alert('모든 씬에 설정이 적용되었습니다.');
  };

  const handleClearErrors = () => {
    scenes.forEach((scene) => {
      if (scene.error) {
        updateScene(scene.id, { error: undefined });
      }
    });
    setProcessingState(prev => ({ ...prev, errors: [] }));
  };

  const handleDownloadAll = async (type: 'video' | 'audio' | 'image', pickLocation: boolean = false) => {
    const targets = scenes.filter(s => {
      if (type === 'video') return s.rendered && s.videoUrl;
      if (type === 'audio') return s.audioGenerated && s.audioUrl;
      if (type === 'image') return s.imageUrl;
      return false;
    });

    if (targets.length === 0) {
      alert(`다운로드할 ${type === 'video' ? '영상' : type === 'audio' ? '음성' : '이미지'}이 없습니다.`);
      return;
    }

    const typeLabel = type === 'video' ? '영상' : type === 'audio' ? '음성' : '이미지';
    const ext = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png';

    // 저장 위치 선택 (디렉토리 피커 지원 시)
    if (pickLocation && isDirectoryPickerSupported()) {
      const files = targets.map(scene => ({
        url: type === 'video' ? scene.videoUrl! : type === 'audio' ? scene.audioUrl! : scene.imageUrl!,
        filename: `scene_${scene.order + 1}.${ext}`,
      }));

      const result = await downloadAllToDirectory(files, (completed, total, filename) => {
        console.log(`Saving ${filename} (${completed}/${total})`);
      });

      if (result.error === 'cancelled') {
        return;
      }

      if (result.success) {
        alert(
          `✅ ${result.savedCount}개의 ${typeLabel} 저장 완료!\n\n` +
          `📁 저장 위치: ${result.savedPath}`
        );
        return;
      }
      // 실패 시 기본 방식으로 폴백
    }
    
    // 기본 다운로드 방식
    for (const scene of targets) {
      const filename = `scene_${scene.order + 1}.${ext}`;
      const url = type === 'video' ? scene.videoUrl! : type === 'audio' ? scene.audioUrl! : scene.imageUrl!;

      try {
        if (type === 'video') await downloadVideo(url, filename);
        else if (type === 'audio') await downloadAudio(url, filename);
        else await downloadImage(url, filename);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error);
      }
    }

    alert(`✅ ${targets.length}개의 ${typeLabel} 다운로드 완료!\n\n📁 저장 위치: 브라우저 다운로드 폴더`);
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          진행 상태
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card-hover rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.withImage}</div>
            <div className="text-xs text-muted">이미지</div>
          </div>
          <div className="bg-card-hover rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-secondary">{stats.withAudio}</div>
            <div className="text-xs text-muted">음성</div>
          </div>
          <div className="bg-card-hover rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-success">{stats.rendered}</div>
            <div className="text-xs text-muted">렌더링</div>
          </div>
          <div className="bg-card-hover rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted">전체 씬</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">전체 진행률</span>
            <span className="text-foreground">{stats.rendered}/{stats.total}</span>
          </div>
          <div className="h-2 bg-card-hover rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${(stats.rendered / stats.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Error Summary with Details Toggle */}
        {stats.errors > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="w-full flex items-center justify-between p-2 bg-error/10 rounded-lg hover:bg-error/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{stats.errors}개의 오류 발생</span>
              </div>
              <div className="flex items-center gap-2">
                {showErrorDetails ? (
                  <EyeOff className="w-4 h-4 text-muted" />
                ) : (
                  <Eye className="w-4 h-4 text-muted" />
                )}
              </div>
            </button>
            
            {/* Error Details */}
            <AnimatePresence>
              {showErrorDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 bg-card-hover rounded-lg space-y-2 max-h-40 overflow-y-auto">
                    {stats.errorMessages.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-error font-medium whitespace-nowrap">
                          씬 {item.sceneNumber}:
                        </span>
                        <span className="text-muted">{item.error}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearErrors}
                    className="mt-2 w-full text-xs"
                    icon={<Trash2 className="w-3 h-3" />}
                  >
                    오류 기록 초기화
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Processing Progress (Enhanced) */}
      {processingState.isRunning && (
        <Card className="border-primary/50 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">
                {processingState.currentStage === 'image' && '🖼️ 이미지 생성 중'}
                {processingState.currentStage === 'voice' && '🔊 음성 생성 중'}
                {processingState.currentStage === 'render' && '🎬 렌더링 중'}
              </h4>
              {processingState.progress && (
                <p className="text-sm text-muted">
                  씬 {processingState.currentSceneNumber}/{processingState.progress.total} 처리 중
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-primary">{progressInfo.percent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-card-hover rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${progressInfo.percent}%` }}
            />
          </div>

          {/* Time Info */}
          <div className="flex justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              경과: {formatTime(progressInfo.elapsed / 1000)}
            </span>
            {progressInfo.remaining && (
              <span>예상 남은 시간: {progressInfo.remaining}</span>
            )}
          </div>

          {/* Live Errors */}
          {processingState.errors.length > 0 && (
            <div className="mt-3 p-2 bg-error/10 rounded-lg max-h-20 overflow-y-auto">
              {processingState.errors.slice(-3).map((err, idx) => (
                <div key={idx} className="text-xs text-error py-0.5 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Retry Failed Section */}
      {(stats.failedScenes.image.length > 0 || 
        stats.failedScenes.voice.length > 0 || 
        stats.failedScenes.render.length > 0) && !processingState.isRunning && (
        <Card className="border-warning/50 bg-warning/5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-warning" />
            실패한 씬 재시도
          </h3>
          
          <div className="space-y-2">
            {stats.failedScenes.image.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between bg-card-hover"
                onClick={handleRetryFailedImages}
                disabled={!hasImageApiKey}
                icon={<ImageIcon className="w-4 h-4 text-error" />}
              >
                <span>이미지 없는 씬 재생성</span>
                <span className="text-xs text-error">{stats.failedScenes.image.length}개</span>
              </Button>
            )}
            
            {stats.failedScenes.voice.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between bg-card-hover"
                onClick={handleRetryFailedVoices}
                disabled={!hasVoiceApiKey}
                icon={<Volume2 className="w-4 h-4 text-error" />}
              >
                <span>음성 없는 씬 재생성</span>
                <span className="text-xs text-error">{stats.failedScenes.voice.length}개</span>
              </Button>
            )}
            
            {stats.failedScenes.render.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between bg-card-hover"
                onClick={handleRetryFailedRenders}
                icon={<Video className="w-4 h-4 text-error" />}
              >
                <span>렌더링 안된 씬 재시도</span>
                <span className="text-xs text-error">{stats.failedScenes.render.length}개</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          빠른 실행
        </h3>

        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleRunFullPipeline}
            disabled={processingState.isRunning || stats.total === 0}
            isLoading={processingState.isRunning && processingState.currentStage !== 'idle'}
            icon={<Wand2 className="w-4 h-4" />}
          >
            전체 자동 처리
          </Button>

          {/* 캐릭터 분석 후 이미지 생성 (권장) */}
          <Button
            variant="outline"
            className="w-full border-primary/50 hover:bg-primary/10"
            onClick={() => setShowCharacterAnalyzer(true)}
            disabled={processingState.isRunning || !hasImageApiKey || stats.total === 0}
            icon={<Users className="w-4 h-4" />}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              캐릭터 분석 후 이미지 생성
            </span>
          </Button>
          <p className="text-xs text-muted text-center mb-2">
            대본에서 캐릭터를 추출하고 일관된 스타일로 생성합니다
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAllImages}
              disabled={processingState.isRunning || !hasImageApiKey}
              isLoading={processingState.currentStage === 'image'}
              icon={<ImageIcon className="w-4 h-4" />}
              title="캐릭터 분석 없이 바로 생성"
            >
              이미지
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAllAudio}
              disabled={processingState.isRunning || !hasVoiceApiKey}
              isLoading={processingState.currentStage === 'voice'}
              icon={<Volume2 className="w-4 h-4" />}
            >
              음성
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRenderAllScenes}
              disabled={processingState.isRunning}
              isLoading={processingState.currentStage === 'render'}
              icon={<Video className="w-4 h-4" />}
            >
              렌더링
            </Button>
          </div>

          {(!hasImageApiKey || !hasVoiceApiKey) && (
            <div className="text-xs text-warning bg-warning/10 p-2 rounded">
              {!hasImageApiKey && '⚠️ 이미지 API 키 필요 '}
              {!hasVoiceApiKey && '⚠️ 음성 API 키 필요 (계정 활성화 필요)'}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowBatchImageUploader(true)}
              disabled={processingState.isRunning}
              icon={<Upload className="w-4 h-4" />}
            >
              이미지 일괄 업로드
            </Button>
            <p className="text-xs text-muted mt-1">
              파일명 번호순으로 자동 매칭됩니다
            </p>
          </div>
        </div>
      </Card>

      {/* Download Section */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          다운로드
        </h3>

        <div className="space-y-2">
          {/* 영상 다운로드 */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="flex-1 justify-between"
              onClick={() => handleDownloadAll('video', true)}
              disabled={stats.rendered === 0}
            >
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                영상 다운로드
              </span>
              <span className="text-sm text-muted">{stats.rendered}개</span>
            </Button>
          </div>

          {/* 음성 다운로드 */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="flex-1 justify-between"
              onClick={() => handleDownloadAll('audio', true)}
              disabled={stats.withAudio === 0}
            >
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                음성 다운로드
              </span>
              <span className="text-sm text-muted">{stats.withAudio}개</span>
            </Button>
          </div>

          {/* 이미지 다운로드 */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              className="flex-1 justify-between"
              onClick={() => handleDownloadAll('image', true)}
              disabled={stats.withImage === 0}
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                이미지 다운로드
              </span>
              <span className="text-sm text-muted">{stats.withImage}개</span>
            </Button>
          </div>

          {/* 안내 메시지 */}
          <p className="text-xs text-muted mt-2 p-2 bg-card-hover rounded">
            💡 다운로드 클릭 시 저장할 폴더를 선택할 수 있습니다
          </p>
        </div>
      </Card>

      {/* Bulk Settings */}
      <Card>
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setShowBulkSettings(!showBulkSettings)}
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            일괄 설정
          </h3>
          {showBulkSettings ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </button>

        <AnimatePresence>
          {showBulkSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                <Slider
                  label="음성 속도"
                  value={bulkSettings.voiceSpeed}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({ ...prev, voiceSpeed: value }))
                  }
                  min={0.8}
                  max={1.3}
                  step={0.1}
                  unit="x"
                />

                <Select
                  label="감정"
                  options={emotionOptions}
                  value={bulkSettings.emotion}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({
                      ...prev,
                      emotion: value as EmotionTag,
                    }))
                  }
                />

                <Select
                  label="씬 전환"
                  options={transitionOptions}
                  value={bulkSettings.transition}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({
                      ...prev,
                      transition: value as TransitionType,
                    }))
                  }
                />

                <Select
                  label="🎬 Ken Burns 효과"
                  options={kenBurnsOptions}
                  value={bulkSettings.kenBurns}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({
                      ...prev,
                      kenBurns: value as KenBurnsEffect,
                    }))
                  }
                />

                {/* Ken Burns 강도 (효과 선택 시에만 표시) */}
                {bulkSettings.kenBurns !== 'none' && (
                  <Slider
                    label="📐 Ken Burns 강도"
                    value={bulkSettings.kenBurnsZoom}
                    onChange={(value) =>
                      setBulkSettings((prev) => ({ ...prev, kenBurnsZoom: value }))
                    }
                    min={5}
                    max={50}
                    step={5}
                    unit="%"
                  />
                )}

                <Slider
                  label="음성 후 여백"
                  value={bulkSettings.postAudioGap}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({ ...prev, postAudioGap: value }))
                  }
                  min={0}
                  max={3}
                  step={0.1}
                  unit="초"
                />

                <Toggle
                  label="자막 표시"
                  checked={bulkSettings.subtitleEnabled}
                  onChange={(checked) =>
                    setBulkSettings((prev) => ({
                      ...prev,
                      subtitleEnabled: checked,
                    }))
                  }
                />

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleApplyBulkSettings}
                >
                  모든 씬에 적용
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Reset Actions */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-primary" />
          초기화
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('모든 씬의 이미지를 초기화하시겠습니까?')) {
                applyToAllScenes({ imageUrl: undefined, imageSource: 'none', error: undefined });
              }
            }}
            icon={<ImageIcon className="w-4 h-4" />}
          >
            이미지 초기화
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('모든 씬의 음성을 초기화하시겠습니까?')) {
                applyToAllScenes({ audioUrl: undefined, audioGenerated: false, error: undefined });
              }
            }}
            icon={<Volume2 className="w-4 h-4" />}
          >
            음성 초기화
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('모든 씬의 렌더링을 초기화하시겠습니까?')) {
                applyToAllScenes({ videoUrl: undefined, rendered: false, error: undefined });
              }
            }}
            icon={<Video className="w-4 h-4" />}
          >
            렌더링 초기화
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('모든 생성 데이터를 초기화하시겠습니까?')) {
                applyToAllScenes({
                  imageUrl: undefined,
                  imageSource: 'none',
                  audioUrl: undefined,
                  audioGenerated: false,
                  videoUrl: undefined,
                  rendered: false,
                  error: undefined,
                });
              }
            }}
            icon={<Trash2 className="w-4 h-4" />}
          >
            전체 초기화
          </Button>
        </div>
      </Card>

      {/* Batch Image Upload Modal */}
      <Modal
        isOpen={showBatchImageUploader}
        onClose={() => setShowBatchImageUploader(false)}
        title="이미지 일괄 업로드"
        size="lg"
      >
        <ImageUploader
          onUpload={handleBatchImageUpload}
          onClose={() => setShowBatchImageUploader(false)}
          totalScenes={stats.total}
          existingSceneImages={existingSceneImages}
        />
      </Modal>

      {/* Character Analyzer Modal */}
      <Modal
        isOpen={showCharacterAnalyzer}
        onClose={() => setShowCharacterAnalyzer(false)}
        title="캐릭터 분석 & 이미지 생성"
        size="lg"
      >
        <CharacterAnalyzer
          onApprove={handleCharacterApproved}
          onClose={() => setShowCharacterAnalyzer(false)}
        />
      </Modal>
    </div>
  );
};

export default BatchActions;
