'use client';

import React, { useState, useCallback } from 'react';
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
  Pause,
  FolderDown,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Card, Select, Toggle, Slider, Modal } from '@/components/ui';
import type { Scene, EmotionTag, TransitionType, KenBurnsEffect } from '@/types';
import {
  generateAllImages,
  generateAllVoices,
  renderAllScenes,
  runFullPipeline,
  type BatchProcessingProgress,
} from '@/lib/api/batchProcessor';
import { downloadVideo, downloadAudio, downloadImage } from '@/lib/api/renderService';

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
  { value: 'zoom-in', label: '줌 인' },
  { value: 'zoom-out', label: '줌 아웃' },
  { value: 'pan-left', label: '왼쪽 패닝' },
  { value: 'pan-right', label: '오른쪽 패닝' },
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
}

const BatchActions: React.FC = () => {
  const {
    currentProject,
    settings,
    updateScene,
    applyToAllScenes,
  } = useStore();

  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [processingState, setProcessingState] = useState<ProgressState>({
    isRunning: false,
    currentStage: 'idle',
    progress: null,
    errors: [],
    completed: { image: 0, voice: 0, render: 0 },
  });
  const [bulkSettings, setBulkSettings] = useState({
    voiceSpeed: 1.0,
    emotion: 'normal' as EmotionTag,
    transition: 'fade' as TransitionType,
    kenBurns: 'zoom-in' as KenBurnsEffect,
    postAudioGap: 0.5,
    subtitleEnabled: true,
  });

  if (!currentProject) return null;

  const scenes = currentProject.scenes;
  const stats = {
    total: scenes.length,
    withImage: scenes.filter((s) => s.imageUrl).length,
    withAudio: scenes.filter((s) => s.audioGenerated).length,
    rendered: scenes.filter((s) => s.rendered).length,
    processing: scenes.filter((s) => s.isProcessing).length,
    errors: scenes.filter((s) => s.error).length,
  };

  // 진행률 계산
  const progressPercent = processingState.progress
    ? Math.round((processingState.progress.completed / processingState.progress.total) * 100)
    : 0;

  // API 키 확인
  const hasImageApiKey = !!settings.kieApiKey;
  const accountIndex = currentProject.elevenLabsAccountIndex || 0;
  const hasVoiceApiKey = !!settings.elevenLabsAccounts[accountIndex]?.apiKey;
  const hasDefaultVoice = !!(currentProject.defaultVoiceId || settings.elevenLabsAccounts[accountIndex]?.voices?.[0]?.id);

  // 일괄 이미지 생성
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
      }));
    }
  }, [currentProject, settings.kieApiKey, hasImageApiKey, updateScene]);

  // 일괄 음성 생성
  const handleGenerateAllAudio = useCallback(async () => {
    if (!hasVoiceApiKey) {
      alert('설정에서 ElevenLabs API 키를 입력하세요.');
      return;
    }

    if (!hasDefaultVoice) {
      alert('기본 보이스를 선택하세요.');
      return;
    }

    const apiKey = settings.elevenLabsAccounts[accountIndex].apiKey;
    const defaultVoiceId = currentProject.defaultVoiceId || 
      settings.elevenLabsAccounts[accountIndex].voices[0]?.id;

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'voice',
      progress: null,
      errors: [],
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
      }));
    }
  }, [currentProject, settings.elevenLabsAccounts, accountIndex, hasVoiceApiKey, hasDefaultVoice, updateScene]);

  // 일괄 렌더링
  const handleRenderAllScenes = useCallback(async () => {
    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'render',
      progress: null,
      errors: [],
    }));

    try {
      const result = await renderAllScenes(
        currentProject,
        (progress) => {
          setProcessingState(prev => ({
            ...prev,
            progress,
            errors: progress.errors,
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
      }));
    }
  }, [currentProject, updateScene]);

  // 전체 파이프라인 실행
  const handleRunFullPipeline = useCallback(async () => {
    if (!hasImageApiKey || !hasVoiceApiKey || !hasDefaultVoice) {
      alert('모든 API 키와 기본 보이스 설정이 필요합니다.');
      return;
    }

    const voiceApiKey = settings.elevenLabsAccounts[accountIndex].apiKey;
    const defaultVoiceId = currentProject.defaultVoiceId ||
      settings.elevenLabsAccounts[accountIndex].voices[0]?.id;

    setProcessingState(prev => ({
      ...prev,
      isRunning: true,
      currentStage: 'image',
      progress: null,
      errors: [],
    }));

    try {
      const result = await runFullPipeline(
        currentProject,
        settings.kieApiKey,
        voiceApiKey,
        defaultVoiceId,
        (stage, progress) => {
          setProcessingState(prev => ({
            ...prev,
            currentStage: stage as 'image' | 'voice' | 'render',
            progress,
            errors: progress.errors,
          }));
        },
        updateScene
      );

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
      }));

      const totalErrors = result.imageResult.errors.length + 
        result.voiceResult.errors.length + 
        result.renderResult.errors.length;

      if (totalErrors > 0) {
        alert(`처리 완료 - 이미지: ${result.imageResult.completed}, 음성: ${result.voiceResult.completed}, 렌더링: ${result.renderResult.completed}\n오류: ${totalErrors}건`);
      } else {
        alert('모든 처리가 완료되었습니다!');
      }
    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isRunning: false,
        currentStage: 'idle',
        errors: [error instanceof Error ? error.message : '알 수 없는 오류'],
      }));
    }
  }, [currentProject, settings, accountIndex, hasImageApiKey, hasVoiceApiKey, hasDefaultVoice, updateScene]);

  // 일괄 설정 적용
  const handleApplyBulkSettings = () => {
    applyToAllScenes(bulkSettings);
    alert('모든 씬에 설정이 적용되었습니다.');
  };

  // 오류 초기화
  const handleClearErrors = () => {
    scenes.forEach((scene) => {
      if (scene.error) {
        updateScene(scene.id, { error: undefined });
      }
    });
    setProcessingState(prev => ({ ...prev, errors: [] }));
  };

  // 다운로드 핸들러
  const handleDownloadAll = async (type: 'video' | 'audio' | 'image') => {
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

    for (const scene of targets) {
      const ext = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png';
      const filename = `scene_${scene.order + 1}.${ext}`;
      const url = type === 'video' ? scene.videoUrl! : type === 'audio' ? scene.audioUrl! : scene.imageUrl!;

      try {
        if (type === 'video') {
          await downloadVideo(url, filename);
        } else if (type === 'audio') {
          await downloadAudio(url, filename);
        } else {
          await downloadImage(url, filename);
        }
        // 다운로드 간 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error);
      }
    }

    alert(`${targets.length}개의 ${type === 'video' ? '영상' : type === 'audio' ? '음성' : '이미지'}을 다운로드했습니다.`);
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

        {/* Error Count */}
        {stats.errors > 0 && (
          <div className="flex items-center justify-between mt-3 p-2 bg-error/10 rounded-lg">
            <div className="flex items-center gap-2 text-error text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.errors}개의 오류</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearErrors}
              className="text-xs"
            >
              초기화
            </Button>
          </div>
        )}
      </Card>

      {/* Processing Progress */}
      {processingState.isRunning && (
        <Card className="border-primary/50">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">
                {processingState.currentStage === 'image' && '이미지 생성 중'}
                {processingState.currentStage === 'voice' && '음성 생성 중'}
                {processingState.currentStage === 'render' && '렌더링 중'}
              </h4>
              {processingState.progress && (
                <p className="text-sm text-muted">{processingState.progress.current}</p>
              )}
            </div>
            <span className="text-lg font-bold text-primary">{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-card-hover rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Errors during processing */}
          {processingState.errors.length > 0 && (
            <div className="mt-3 max-h-24 overflow-y-auto">
              {processingState.errors.slice(-3).map((err, idx) => (
                <div key={idx} className="text-xs text-error py-1 border-t border-border first:border-0">
                  {err}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          빠른 실행
        </h3>

        <div className="space-y-2">
          {/* Full Pipeline */}
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

          {/* Individual Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAllImages}
              disabled={processingState.isRunning || !hasImageApiKey}
              isLoading={processingState.currentStage === 'image'}
              icon={<ImageIcon className="w-4 h-4" />}
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

          {/* API Key Warnings */}
          {(!hasImageApiKey || !hasVoiceApiKey) && (
            <div className="text-xs text-warning bg-warning/10 p-2 rounded">
              {!hasImageApiKey && '⚠️ 이미지 API 키 필요 '}
              {!hasVoiceApiKey && '⚠️ 음성 API 키 필요'}
            </div>
          )}
        </div>
      </Card>

      {/* Download Section */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          다운로드
        </h3>

        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => handleDownloadAll('video')}
            disabled={stats.rendered === 0}
          >
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              영상 파일 다운로드
            </span>
            <span className="text-sm text-muted">{stats.rendered}개</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => handleDownloadAll('audio')}
            disabled={stats.withAudio === 0}
          >
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              음성 파일 다운로드
            </span>
            <span className="text-sm text-muted">{stats.withAudio}개</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => handleDownloadAll('image')}
            disabled={stats.withImage === 0}
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              이미지 파일 다운로드
            </span>
            <span className="text-sm text-muted">{stats.withImage}개</span>
          </Button>
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
                  label="카메라 모션"
                  options={kenBurnsOptions}
                  value={bulkSettings.kenBurns}
                  onChange={(value) =>
                    setBulkSettings((prev) => ({
                      ...prev,
                      kenBurns: value as KenBurnsEffect,
                    }))
                  }
                />

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
                applyToAllScenes({ imageUrl: undefined, imageSource: 'none' });
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
                applyToAllScenes({ audioUrl: undefined, audioGenerated: false });
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
                applyToAllScenes({ videoUrl: undefined, rendered: false });
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
    </div>
  );
};

export default BatchActions;
