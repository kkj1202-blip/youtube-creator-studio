'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type,
  Image as ImageIcon,
  Volume2,
  Video,
  Settings2,
  Upload,
  Wand2,
  Play,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Select, Slider, Toggle, Input, Tabs, Card, Modal } from '@/components/ui';
import AudioPlayer from './AudioPlayer';
import ScenePreview from './ScenePreview';
import ImageUploader from './ImageUploader';
import { generateImagePrompt, stylePresets } from '@/lib/api/imageGeneration';
import { estimateAudioDuration } from '@/lib/api/voiceGeneration';
import type { Scene, EmotionTag, TransitionType, KenBurnsEffect, MotionEffect, TTSEngine } from '@/types';
import MotionEffects from './MotionEffects';
import { useBrowserTTS } from '@/hooks/useBrowserTTS';

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
  { value: 'pan-up', label: '위로 패닝' },
  { value: 'pan-down', label: '아래로 패닝' },
];

// 새로운 모션 효과 옵션
const motionEffectOptions = [
  { value: 'none', label: '없음' },
  { value: 'breathing', label: '🫁 호흡 효과 (부드러운 확대/축소)' },
  { value: 'pulse', label: '💓 펄스 효과 (심장 박동)' },
  { value: 'float', label: '🎈 떠다니기 (상하 움직임)' },
  { value: 'shake', label: '📳 미세 흔들림' },
  { value: 'parallax-soft', label: '🎭 3D 효과 (약하게)' },
  { value: 'parallax-medium', label: '🎭 3D 효과 (보통)' },
  { value: 'parallax-strong', label: '🎭 3D 효과 (강하게)' },
];

// TTS 엔진 옵션
const ttsEngineOptions = [
  { value: 'edge-tts', label: '🆓 Edge TTS (무료, 한국어)' },
  { value: 'elevenlabs', label: '💎 ElevenLabs (유료, 고품질)' },
  { value: 'browser', label: '🌐 브라우저 TTS (무료, 즉시)' },
];

// 무료 한국어 보이스 옵션 (Edge TTS)
const freeKoreanVoices = [
  { value: 'ko-KR-SunHiNeural', label: '선희 (여성, 밝은)' },
  { value: 'ko-KR-InJoonNeural', label: '인준 (남성, 전문적)' },
  { value: 'ko-KR-BongJinNeural', label: '봉진 (남성, 따뜻한)' },
  { value: 'ko-KR-GookMinNeural', label: '국민 (남성, 차분한)' },
  { value: 'ko-KR-JiMinNeural', label: '지민 (여성, 활발한)' },
  { value: 'ko-KR-SeoHyeonNeural', label: '서현 (여성, 차분한)' },
  { value: 'ko-KR-YuJinNeural', label: '유진 (여성, 젊은)' },
];

const SceneEditor: React.FC = () => {
  const {
    currentProject,
    activeSceneId,
    updateScene,
    settings,
  } = useStore();

  const [activeTab, setActiveTab] = useState('script');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [freeVoices, setFreeVoices] = useState<Array<{id: string; name: string; gender: string; description: string}>>([]);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);

  // 브라우저 TTS 훅
  const browserTTS = useBrowserTTS();

  const activeScene = currentProject?.scenes.find((s) => s.id === activeSceneId);

  const tabs = [
    { id: 'script', label: '대본', icon: <Type className="w-4 h-4" /> },
    { id: 'image', label: '이미지', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'voice', label: '음성', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'video', label: '영상', icon: <Video className="w-4 h-4" /> },
  ];

  // 에러 초기화
  useEffect(() => {
    setGenerationError(null);
  }, [activeSceneId, activeTab]);

  // 무료 보이스 목록 로드
  useEffect(() => {
    const loadFreeVoices = async () => {
      try {
        const response = await fetch('/api/generate-voice-free');
        const data = await response.json();
        if (data.voices) {
          setFreeVoices(data.voices);
        }
      } catch (error) {
        console.error('Failed to load free voices:', error);
      }
    };
    loadFreeVoices();
  }, []);

  if (!activeScene) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-card-hover flex items-center justify-center mx-auto mb-4">
            <Settings2 className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            씬을 선택하세요
          </h3>
          <p className="text-muted">
            편집할 씬을 왼쪽 목록에서 선택하세요
          </p>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Scene>) => {
    updateScene(activeScene.id, updates);
  };

  // Voice options from settings
  const voiceOptions = settings.elevenLabsAccounts
    .flatMap((account) => account.voices)
    .map((voice) => ({ value: voice.id, label: voice.name }));

  // 즐겨찾기 보이스 (커스텀 등록 + 계정 보이스)
  const favoriteVoiceOptions = (settings.favoriteVoices || []).map((voice) => ({
    value: voice.id,
    label: `⭐ ${voice.name}${voice.description ? ` (${voice.description})` : ''}`,
  }));

  // ElevenLabs 보이스 통합 (즐겨찾기 상단, 그 다음 계정 보이스)
  const allElevenLabsVoices = [
    ...favoriteVoiceOptions,
    ...(voiceOptions.length > 0 ? [{ value: '', label: '── 계정 보이스 ──', disabled: true }] : []),
    ...voiceOptions.filter(v => !favoriteVoiceOptions.some(f => f.value === v.value)),
  ].filter(v => v.value !== '' || v.label.includes('──'));

  // 이미지 프롬프트 자동 생성
  const handleGeneratePrompt = () => {
    if (!currentProject) return;
    const prompt = generateImagePrompt(
      activeScene.script,
      currentProject.imageStyle,
      currentProject.customStylePrompt
    );
    handleUpdate({ imagePrompt: prompt });
  };

  // 이미지 생성
  const handleGenerateImage = async () => {
    if (!currentProject || !settings.kieApiKey) {
      setGenerationError('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    setIsGeneratingImage(true);
    setGenerationError(null);

    try {
      const prompt = activeScene.imagePrompt || generateImagePrompt(
        activeScene.script,
        currentProject.imageStyle,
        currentProject.customStylePrompt
      );

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.kieApiKey,
          prompt,
          aspectRatio: currentProject.aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || '이미지 생성에 실패했습니다.');
      }

      handleUpdate({
        imageUrl: data.imageUrl,
        imageSource: 'generated',
        imagePrompt: prompt,
        error: undefined,
      });

      if (data.demo) {
        setGenerationError('데모 모드: 실제 API 키를 입력하면 실제 이미지가 생성됩니다.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.';
      setGenerationError(message);
      handleUpdate({ error: message });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 음성 생성
  const handleGenerateAudio = async () => {
    const ttsEngine = activeScene.ttsEngine || 'edge-tts';
    
    if (!activeScene.script.trim()) {
      setGenerationError('대본을 입력하세요.');
      return;
    }

    setIsGeneratingAudio(true);
    setGenerationError(null);

    try {
      if (ttsEngine === 'elevenlabs') {
        // ElevenLabs (유료)
        const accountIndex = currentProject?.elevenLabsAccountIndex || 0;
        const apiKey = settings.elevenLabsAccounts[accountIndex]?.apiKey;
        
        if (!apiKey) {
          setGenerationError('설정에서 ElevenLabs API 키를 입력하세요.');
          setIsGeneratingAudio(false);
          return;
        }

        if (!activeScene.voiceId && !currentProject?.defaultVoiceId) {
          setGenerationError('보이스를 선택하세요.');
          setIsGeneratingAudio(false);
          return;
        }

        const response = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            voiceId: activeScene.voiceId || currentProject?.defaultVoiceId,
            text: activeScene.script,
            speed: activeScene.voiceSpeed,
            emotion: activeScene.emotion,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.audioUrl) {
          throw new Error(data.error || '음성 생성에 실패했습니다.');
        }

        handleUpdate({
          audioUrl: data.audioUrl,
          audioGenerated: true,
          error: undefined,
        });

        if (data.demo) {
          setGenerationError('데모 모드: 실제 API 키를 입력하면 실제 음성이 생성됩니다.');
        }
      } else if (ttsEngine === 'edge-tts') {
        // Edge TTS (무료)
        const response = await fetch('/api/generate-voice-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceId: activeScene.voiceId || 'ko-KR-SunHiNeural',
            text: activeScene.script,
            speed: activeScene.voiceSpeed,
            emotion: activeScene.emotion,
          }),
        });

        const data = await response.json();

        if (data.useBrowserTTS) {
          // 브라우저 TTS 폴백
          setGenerationError('서버 TTS 사용 불가. 브라우저 TTS로 미리듣기만 가능합니다.');
          handleUpdate({
            audioUrl: undefined,
            audioGenerated: false,
          });
        } else if (data.audioUrl) {
          handleUpdate({
            audioUrl: data.audioUrl,
            audioGenerated: true,
            error: undefined,
          });
        } else {
          throw new Error(data.error || '음성 생성에 실패했습니다.');
        }
      } else {
        // 브라우저 TTS
        if (!browserTTS.isSupported) {
          setGenerationError('이 브라우저는 TTS를 지원하지 않습니다.');
          setIsGeneratingAudio(false);
          return;
        }

        // 브라우저 TTS는 오디오 파일을 생성하지 않음
        setGenerationError('브라우저 TTS는 미리듣기만 가능합니다. 렌더링을 위해 Edge TTS 또는 ElevenLabs를 사용하세요.');
        handleUpdate({
          audioGenerated: false,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.';
      setGenerationError(message);
      handleUpdate({ error: message });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // 음성 미리듣기 (브라우저 TTS)
  const handlePreviewVoice = async () => {
    if (!activeScene.script.trim()) {
      setGenerationError('대본을 입력하세요.');
      return;
    }

    if (!browserTTS.isSupported) {
      setGenerationError('이 브라우저는 TTS를 지원하지 않습니다.');
      return;
    }

    setIsPreviewingVoice(true);
    try {
      // 처음 100자만 미리듣기
      const previewText = activeScene.script.slice(0, 100) + (activeScene.script.length > 100 ? '...' : '');
      await browserTTS.speak(previewText, undefined, activeScene.voiceSpeed);
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  // 브라우저 TTS 중지
  const handleStopPreview = () => {
    browserTTS.stop();
    setIsPreviewingVoice(false);
  };

  // 렌더링
  const handleRender = async () => {
    if (!activeScene.imageUrl) {
      setGenerationError('이미지가 필요합니다.');
      return;
    }

    if (!activeScene.audioUrl) {
      setGenerationError('음성이 필요합니다.');
      return;
    }

    setIsRendering(true);
    setGenerationError(null);

    try {
      const response = await fetch('/api/render-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: activeScene.id,
          imageUrl: activeScene.imageUrl,
          audioUrl: activeScene.audioUrl,
          aspectRatio: currentProject?.aspectRatio,
          transition: activeScene.transition,
          kenBurns: activeScene.kenBurns,
          subtitle: {
            enabled: activeScene.subtitleEnabled,
            text: activeScene.script,
            style: currentProject?.subtitleStyle,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '렌더링에 실패했습니다.');
      }

      handleUpdate({
        videoUrl: data.videoUrl,
        rendered: true,
        error: undefined,
      });

      if (data.demo) {
        setGenerationError('데모 모드: FFmpeg 서버 구성 후 실제 렌더링이 가능합니다.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '렌더링 중 오류가 발생했습니다.';
      setGenerationError(message);
      handleUpdate({ error: message });
    } finally {
      setIsRendering(false);
    }
  };

  // 다운로드
  const handleDownload = async () => {
    if (!activeScene.videoUrl) return;

    try {
      // 데모 모드에서는 알림만 표시
      if (activeScene.videoUrl.startsWith('/api/demo-video')) {
        alert('데모 모드에서는 다운로드할 수 없습니다. 실제 렌더링 후 다운로드 가능합니다.');
        return;
      }

      const response = await fetch(activeScene.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_${activeScene.order + 1}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setGenerationError('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 이미지 업로드 처리 (모든 이미지를 각 씬에 적용)
  const handleImageUpload = (images: Array<{ imageUrl: string; sceneNumber: number | null }>) => {
    if (images.length === 0) {
      setShowImageUploader(false);
      return;
    }

    // 모든 이미지를 해당 씬에 적용
    let appliedCount = 0;
    images.forEach(({ imageUrl, sceneNumber }) => {
      if (sceneNumber !== null && currentProject) {
        // sceneNumber는 1부터 시작, order는 0부터 시작
        const targetScene = currentProject.scenes.find(s => s.order === sceneNumber - 1);
        if (targetScene) {
          updateScene(targetScene.id, {
            imageUrl,
            imageSource: 'uploaded',
            error: undefined,
          });
          appliedCount++;
        }
      }
    });

    // 씬 번호가 없는 이미지는 현재 씬에 적용 (첫 번째만)
    const unmatchedImage = images.find(img => img.sceneNumber === null);
    if (unmatchedImage && appliedCount === 0) {
      handleUpdate({
        imageUrl: unmatchedImage.imageUrl,
        imageSource: 'uploaded',
      });
      appliedCount = 1;
    }

    setShowImageUploader(false);
    
    if (appliedCount > 0) {
      console.log(`${appliedCount}개의 이미지가 씬에 적용되었습니다.`);
    }
  };

  const estimatedDuration = estimateAudioDuration(activeScene.script, activeScene.voiceSpeed);

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex-shrink-0 mb-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Error Message */}
      {generationError && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'script' && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  씬 대본
                </h3>
                <TextArea
                  value={activeScene.script}
                  onChange={(e) => handleUpdate({ script: e.target.value })}
                  placeholder="이 씬의 대본을 입력하세요..."
                  rows={6}
                />
                <p className="mt-2 text-xs text-muted">
                  {activeScene.script.length}자 | 예상 음성 길이: ~{estimatedDuration}초
                </p>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  이미지 프롬프트
                </h3>
                <TextArea
                  value={activeScene.imagePrompt || ''}
                  onChange={(e) => handleUpdate({ imagePrompt: e.target.value })}
                  placeholder="이미지 생성용 프롬프트 (비워두면 대본에서 자동 생성)"
                  rows={3}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={handleGeneratePrompt}
                  icon={<Wand2 className="w-4 h-4" />}
                >
                  대본에서 프롬프트 생성
                </Button>
              </Card>
            </motion.div>
          )}

          {activeTab === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Image Preview */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  이미지 미리보기
                </h3>
                <div 
                  className={`${currentProject?.aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[200px] mx-auto' : 'aspect-video'} bg-card-hover rounded-lg overflow-hidden flex items-center justify-center`}
                >
                  {activeScene.imageUrl ? (
                    <img
                      src={activeScene.imageUrl}
                      alt="씬 이미지"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <ImageIcon className="w-12 h-12 text-muted mx-auto mb-2" />
                      <p className="text-muted">이미지가 없습니다</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    isLoading={isGeneratingImage}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    AI 생성
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowImageUploader(true)}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    업로드
                  </Button>
                  {activeScene.imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      재생성
                    </Button>
                  )}
                </div>
              </Card>

              {/* Ken Burns Effect - 세부 설정 추가 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🎥 카메라 모션 (Ken Burns)
                </h3>
                
                <Select
                  label="효과 종류"
                  options={kenBurnsOptions}
                  value={activeScene.kenBurns}
                  onChange={(value) => handleUpdate({ kenBurns: value as KenBurnsEffect })}
                />

                {activeScene.kenBurns !== 'none' && (
                  <div className="mt-4 space-y-4">
                    <Slider
                      label="속도"
                      value={activeScene.kenBurnsSpeed || 1.0}
                      onChange={(value) => handleUpdate({ kenBurnsSpeed: value })}
                      min={0.3}
                      max={3.0}
                      step={0.1}
                      unit="x"
                    />
                    
                    {(activeScene.kenBurns === 'zoom-in' || activeScene.kenBurns === 'zoom-out') && (
                      <Slider
                        label="줌 비율"
                        value={activeScene.kenBurnsZoom || 20}
                        onChange={(value) => handleUpdate({ kenBurnsZoom: value })}
                        min={5}
                        max={50}
                        step={5}
                        unit="%"
                      />
                    )}
                  </div>
                )}
              </Card>

              {/* 새로운 모션 효과 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  ✨ 모션 효과 (무료)
                  <span className="text-xs font-normal text-muted bg-success/20 text-success px-2 py-0.5 rounded">NEW</span>
                </h3>
                <p className="text-xs text-muted mb-3">
                  정적인 이미지에 생동감 있는 움직임을 추가합니다
                </p>
                
                <Select
                  label="효과 종류"
                  options={motionEffectOptions}
                  value={activeScene.motionEffect || 'none'}
                  onChange={(value) => handleUpdate({ motionEffect: value as MotionEffect })}
                />

                {activeScene.motionEffect && activeScene.motionEffect !== 'none' && (
                  <div className="mt-4 space-y-4">
                    <Slider
                      label="효과 강도"
                      value={activeScene.motionIntensity || 1.0}
                      onChange={(value) => handleUpdate({ motionIntensity: value })}
                      min={0.2}
                      max={2.0}
                      step={0.1}
                      unit="x"
                    />
                  </div>
                )}
              </Card>

              {/* 효과 조합 설정 */}
              {(activeScene.kenBurns !== 'none' || (activeScene.motionEffect && activeScene.motionEffect !== 'none')) && (
                <Card className="bg-primary/5 border-primary/20">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    🔀 효과 조합
                  </h3>
                  
                  <Toggle
                    label="Ken Burns + 모션 효과 동시 사용"
                    checked={activeScene.combineEffects !== false}
                    onChange={(checked) => handleUpdate({ combineEffects: checked })}
                  />
                  
                  <p className="text-xs text-muted mt-2">
                    {activeScene.combineEffects !== false 
                      ? '✅ 두 효과가 함께 적용됩니다' 
                      : '⚠️ Ken Burns만 적용됩니다'}
                  </p>

                  {/* 통합 미리보기 */}
                  {activeScene.imageUrl && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        효과 미리보기
                      </label>
                      <div className="rounded-lg overflow-hidden border border-border">
                        <MotionEffects
                          imageUrl={activeScene.imageUrl}
                          effect={activeScene.combineEffects !== false ? (activeScene.motionEffect || 'none') : 'none'}
                          intensity={activeScene.motionIntensity || 1.0}
                          isPlaying={true}
                          duration={5}
                          aspectRatio={currentProject?.aspectRatio}
                          className="max-h-[200px]"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Audio Preview */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  음성 미리듣기
                </h3>
                
                {activeScene.audioUrl ? (
                  <AudioPlayer src={activeScene.audioUrl} />
                ) : (
                  <div className="bg-card-hover rounded-lg p-4 text-center">
                    <Volume2 className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-muted text-sm">음성이 생성되지 않았습니다</p>
                  </div>
                )}
                
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-3"
                  onClick={handleGenerateAudio}
                  disabled={!activeScene.script || isGeneratingAudio}
                  isLoading={isGeneratingAudio}
                  icon={<Wand2 className="w-4 h-4" />}
                >
                  {activeScene.audioGenerated ? '음성 재생성' : '음성 생성'}
                </Button>
              </Card>

              {/* TTS Engine Selection */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🎤 TTS 엔진 선택
                </h3>
                <Select
                  label=""
                  options={ttsEngineOptions}
                  value={activeScene.ttsEngine || 'edge-tts'}
                  onChange={(value) => handleUpdate({ ttsEngine: value as TTSEngine })}
                />
                <p className="text-xs text-muted mt-2">
                  {activeScene.ttsEngine === 'elevenlabs' 
                    ? '💎 고품질 음성 (API 키 필요)' 
                    : activeScene.ttsEngine === 'browser'
                    ? '🌐 브라우저 내장 TTS (미리듣기만)'
                    : '🆓 무료 한국어 음성 (API 키 불필요)'}
                </p>
              </Card>

              {/* Voice Settings */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  음성 설정
                </h3>
                <div className="space-y-4">
                  {/* 무료 TTS 보이스 선택 */}
                  {(activeScene.ttsEngine === 'edge-tts' || !activeScene.ttsEngine) && (
                    <Select
                      label="무료 한국어 목소리"
                      options={freeVoices.map(v => ({ 
                        value: v.id, 
                        label: `${v.name} - ${v.description}` 
                      }))}
                      value={activeScene.voiceId || 'ko-KR-SunHiNeural'}
                      onChange={(value) => handleUpdate({ voiceId: value })}
                    />
                  )}

                  {/* ElevenLabs 보이스 선택 (즐겨찾기 포함) */}
                  {activeScene.ttsEngine === 'elevenlabs' && (
                    <div className="space-y-2">
                      <Select
                        label="ElevenLabs 목소리"
                        options={
                          allElevenLabsVoices.length > 0 
                            ? allElevenLabsVoices 
                            : [{ value: '', label: '설정에서 보이스를 등록하세요' }]
                        }
                        value={activeScene.voiceId || currentProject?.defaultVoiceId || ''}
                        onChange={(value) => handleUpdate({ voiceId: value })}
                      />
                      {favoriteVoiceOptions.length > 0 && (
                        <p className="text-xs text-muted">
                          ⭐ 즐겨찾기 {favoriteVoiceOptions.length}개 | 설정에서 보이스 ID 직접 추가 가능
                        </p>
                      )}
                    </div>
                  )}

                  {/* 브라우저 TTS 보이스 */}
                  {activeScene.ttsEngine === 'browser' && (
                    <Select
                      label="브라우저 한국어 목소리"
                      options={browserTTS.koreanVoices.length > 0 
                        ? browserTTS.koreanVoices.map(v => ({ value: v.id, label: v.name })) 
                        : [{ value: '', label: '한국어 보이스 없음' }]}
                      value={activeScene.voiceId || ''}
                      onChange={(value) => handleUpdate({ voiceId: value })}
                    />
                  )}

                  <Select
                    label="감정"
                    options={emotionOptions}
                    value={activeScene.emotion}
                    onChange={(value) => handleUpdate({ emotion: value as EmotionTag })}
                  />

                  <Slider
                    label="속도"
                    value={activeScene.voiceSpeed}
                    onChange={(value) => handleUpdate({ voiceSpeed: value })}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    unit="x"
                  />
                </div>
              </Card>

              {/* 미리듣기 (브라우저 TTS) */}
              {browserTTS.isSupported && (
                <Card className="bg-card-hover">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    👂 즉시 미리듣기
                    <span className="text-xs font-normal text-success">무료</span>
                  </h3>
                  <p className="text-xs text-muted mb-3">
                    브라우저 TTS로 대본을 바로 들어볼 수 있습니다 (처음 100자)
                  </p>
                  <div className="flex gap-2">
                    {!isPreviewingVoice && !browserTTS.isSpeaking ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreviewVoice}
                        disabled={!activeScene.script}
                        icon={<Play className="w-4 h-4" />}
                      >
                        미리듣기
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleStopPreview}
                        icon={<AlertCircle className="w-4 h-4" />}
                      >
                        중지
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'video' && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Preview Button */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    씬 미리보기
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                    disabled={!activeScene.imageUrl}
                    icon={<Play className="w-4 h-4" />}
                  >
                    미리보기
                  </Button>
                </div>
                
                {/* Mini Preview */}
                <div 
                  className={`${currentProject?.aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[150px] mx-auto' : 'aspect-video'} bg-card-hover rounded-lg overflow-hidden`}
                >
                  {activeScene.imageUrl ? (
                    <img
                      src={activeScene.imageUrl}
                      alt="미리보기"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted" />
                    </div>
                  )}
                </div>
              </Card>

              {/* Render & Download */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  렌더링
                </h3>
                
                {/* Status */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${activeScene.imageUrl ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-sm text-muted">이미지</span>
                  <div className={`w-3 h-3 rounded-full ${activeScene.audioGenerated ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-sm text-muted">음성</span>
                  <div className={`w-3 h-3 rounded-full ${activeScene.rendered ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-sm text-muted">렌더링</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={handleRender}
                    disabled={!activeScene.imageUrl || !activeScene.audioGenerated || isRendering}
                    isLoading={isRendering}
                    icon={<Video className="w-4 h-4" />}
                  >
                    {activeScene.rendered ? '다시 렌더링' : '렌더링'}
                  </Button>
                  {activeScene.rendered && activeScene.videoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      icon={<Download className="w-4 h-4" />}
                    >
                      다운로드
                    </Button>
                  )}
                </div>
              </Card>

              {/* Video Settings */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  영상 설정
                </h3>
                <div className="space-y-4">
                  <Select
                    label="씬 전환 효과"
                    options={transitionOptions}
                    value={activeScene.transition}
                    onChange={(value) => handleUpdate({ transition: value as TransitionType })}
                  />

                  <Slider
                    label="이미지 추가 지속시간"
                    value={activeScene.imageDuration || 0}
                    onChange={(value) => handleUpdate({ imageDuration: value })}
                    min={0}
                    max={10}
                    step={0.5}
                    unit="초"
                  />

                  <Slider
                    label="음성 후 여백"
                    value={activeScene.postAudioGap}
                    onChange={(value) => handleUpdate({ postAudioGap: value })}
                    min={0}
                    max={3}
                    step={0.1}
                    unit="초"
                  />

                  <Toggle
                    label="자막 표시"
                    checked={activeScene.subtitleEnabled}
                    onChange={(checked) => handleUpdate({ subtitleEnabled: checked })}
                  />
                </div>
              </Card>

              {/* 렌더링 품질 설정 */}
              <Card className="bg-gradient-to-br from-warning/5 to-transparent border-warning/20">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  ⚙️ 렌더링 품질 설정
                  <span className="text-xs font-normal text-warning bg-warning/10 px-2 py-0.5 rounded">PRO</span>
                </h3>
                <div className="space-y-4">
                  <Select
                    label="해상도"
                    options={[
                      { value: '720p', label: '720p HD (빠름)' },
                      { value: '1080p', label: '1080p Full HD (권장)' },
                      { value: '4k', label: '4K Ultra HD (느림)' },
                    ]}
                    value={currentProject?.renderSettings?.resolution || '1080p'}
                    onChange={(value) => {
                      if (currentProject) {
                        const { updateProject } = useStore.getState();
                        updateProject({
                          renderSettings: {
                            ...currentProject.renderSettings,
                            resolution: value as '720p' | '1080p' | '4k',
                          },
                        });
                      }
                    }}
                  />

                  <Select
                    label="프레임레이트"
                    options={[
                      { value: '24', label: '24 FPS (영화)' },
                      { value: '30', label: '30 FPS (표준)' },
                      { value: '60', label: '60 FPS (부드러움)' },
                    ]}
                    value={String(currentProject?.renderSettings?.fps || 30)}
                    onChange={(value) => {
                      if (currentProject) {
                        const { updateProject } = useStore.getState();
                        updateProject({
                          renderSettings: {
                            ...currentProject.renderSettings,
                            fps: Number(value) as 24 | 30 | 60,
                          },
                        });
                      }
                    }}
                  />

                  <Select
                    label="비트레이트 (화질)"
                    options={[
                      { value: 'low', label: '낮음 (2Mbps) - 파일 작음' },
                      { value: 'medium', label: '중간 (4Mbps)' },
                      { value: 'high', label: '높음 (8Mbps) - 권장' },
                      { value: 'ultra', label: '최고 (12Mbps) - 파일 큼' },
                    ]}
                    value={currentProject?.renderSettings?.bitrate || 'high'}
                    onChange={(value) => {
                      if (currentProject) {
                        const { updateProject } = useStore.getState();
                        updateProject({
                          renderSettings: {
                            ...currentProject.renderSettings,
                            bitrate: value as 'low' | 'medium' | 'high' | 'ultra',
                          },
                        });
                      }
                    }}
                  />

                  <div className="pt-2 border-t border-border">
                    <h4 className="text-xs font-medium text-muted mb-3">품질 향상 옵션</h4>
                    
                    <Toggle
                      label="🎯 화면 안정화 (떨림 제거)"
                      checked={currentProject?.renderSettings?.stabilization ?? true}
                      onChange={(checked) => {
                        if (currentProject) {
                          const { updateProject } = useStore.getState();
                          updateProject({
                            renderSettings: {
                              ...currentProject.renderSettings,
                              stabilization: checked,
                            },
                          });
                        }
                      }}
                    />

                    <Toggle
                      label="🔇 오디오 잡음 제거"
                      checked={currentProject?.renderSettings?.denoiseAudio ?? true}
                      onChange={(checked) => {
                        if (currentProject) {
                          const { updateProject } = useStore.getState();
                          updateProject({
                            renderSettings: {
                              ...currentProject.renderSettings,
                              denoiseAudio: checked,
                            },
                          });
                        }
                      }}
                    />

                    <Toggle
                      label="🖼️ 비디오 노이즈 제거"
                      checked={currentProject?.renderSettings?.denoiseVideo ?? false}
                      onChange={(checked) => {
                        if (currentProject) {
                          const { updateProject } = useStore.getState();
                          updateProject({
                            renderSettings: {
                              ...currentProject.renderSettings,
                              denoiseVideo: checked,
                            },
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="pt-2">
                    <Slider
                      label="선명도"
                      value={currentProject?.renderSettings?.sharpness ?? 50}
                      onChange={(value) => {
                        if (currentProject) {
                          const { updateProject } = useStore.getState();
                          updateProject({
                            renderSettings: {
                              ...currentProject.renderSettings,
                              sharpness: value,
                            },
                          });
                        }
                      }}
                      min={0}
                      max={100}
                      step={10}
                      unit="%"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Upload Modal */}
      <Modal
        isOpen={showImageUploader}
        onClose={() => setShowImageUploader(false)}
        title="이미지 업로드"
        size="lg"
      >
        <ImageUploader
          onUpload={handleImageUpload}
          onClose={() => setShowImageUploader(false)}
          totalScenes={currentProject?.scenes.length || 0}
          existingSceneImages={new Map(
            (currentProject?.scenes || [])
              .filter(s => s.imageUrl)
              .map(s => [s.order + 1, true])
          )}
        />
      </Modal>

      {/* Scene Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`씬 ${activeScene.order + 1} 미리보기`}
        size="xl"
      >
        <ScenePreview
          scene={activeScene}
          aspectRatio={currentProject?.aspectRatio || '16:9'}
          subtitleStyle={currentProject?.subtitleStyle || {
            fontFamily: 'Noto Sans KR',
            fontSize: 24,
            fontColor: '#ffffff',
            backgroundColor: '#000000',
            backgroundOpacity: 0.7,
            position: 'bottom',
            bold: true,
            italic: false,
            outline: true,
            outlineColor: '#000000',
          }}
        />
      </Modal>
    </div>
  );
};

export default SceneEditor;
