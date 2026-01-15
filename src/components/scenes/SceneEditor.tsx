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
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Select, Slider, Tabs, Card, Modal } from '@/components/ui';
import AudioPlayer from './AudioPlayer';
import ScenePreview from './ScenePreview';
import ImageUploader from './ImageUploader';
import { generateImagePrompt } from '@/lib/api/imageGeneration';
import { estimateAudioDuration } from '@/lib/api/voiceGeneration';
import { buildFinalPrompt } from '@/lib/imageStyles';
import type { Scene, MotionEffect } from '@/types';

import {
  motionEffectOptions,
} from '@/constants/options';

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
  const [renderProgress, setRenderProgress] = useState<{ percent: number; message: string } | null>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);

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

  // 즐겨찾기 보이스만 표시 (설정에서 직접 등록한 보이스)
  const favoriteVoiceOptions = (settings.favoriteVoices || []).map((voice) => ({
    value: voice.id,
    label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
  }));

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
    console.log('[SceneEditor] handleGenerateImage 시작');
    
    if (!currentProject) {
      console.error('[SceneEditor] currentProject 없음');
      setGenerationError('프로젝트를 먼저 선택하세요.');
      return;
    }
    
    if (!settings.kieApiKey) {
      console.error('[SceneEditor] API 키 없음');
      setGenerationError('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    setIsGeneratingImage(true);
    setGenerationError(null);

    try {
      // 마스터 스타일 프롬프트 가져오기
      const masterStylePrompt = currentProject.masterImageStylePrompt || '';
      console.log('[SceneEditor] masterStylePrompt:', masterStylePrompt ? masterStylePrompt.slice(0, 50) + '...' : '(없음)');
      
      // 일관성 설정 가져오기
      const consistencySettings = currentProject.imageConsistency;
      console.log('[SceneEditor] consistencySettings:', consistencySettings);
      
      // 씬 설명 (사용자가 입력한 프롬프트 또는 대본 기반 생성)
      const sceneDescription = activeScene.imagePrompt || activeScene.script;
      console.log('[SceneEditor] sceneDescription:', sceneDescription?.slice(0, 50));
      
      // 최종 프롬프트 조합: 스타일 + 일관성 + 씬 설명
      let finalPrompt: string;
      
      if (masterStylePrompt) {
        // 마스터 스타일이 설정된 경우 새 방식 사용
        finalPrompt = buildFinalPrompt(
          sceneDescription,
          masterStylePrompt,
          consistencySettings
        );
        console.log('[SceneEditor] 마스터 스타일 적용된 최종 프롬프트:', finalPrompt.slice(0, 200) + '...');
      } else {
        // 레거시 방식 (기존 스타일 프리셋)
        finalPrompt = activeScene.imagePrompt || generateImagePrompt(
          activeScene.script,
          currentProject.imageStyle,
          currentProject.customStylePrompt
        );
        console.log('[SceneEditor] 레거시 방식 프롬프트:', finalPrompt.slice(0, 200) + '...');
      }

      console.log('[SceneEditor] API 요청 시작...');
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.kieApiKey,
          prompt: finalPrompt,
          aspectRatio: currentProject.aspectRatio,
        }),
      });

      console.log('[SceneEditor] API 응답 상태:', response.status);
      const data = await response.json();
      console.log('[SceneEditor] API 응답 데이터:', data);

      if (!response.ok || !data.imageUrl) {
        const errorMsg = data.error || data.originalMsg || '이미지 생성에 실패했습니다.';
        console.error('[SceneEditor] API 에러:', errorMsg);
        throw new Error(errorMsg);
      }

      // CORS 문제 해결을 위해 프록시 URL로 변환
      const proxyImageUrl = `/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
      console.log('[SceneEditor] ✅ 이미지 생성 성공:', data.imageUrl?.slice(0, 50));
      console.log('[SceneEditor] 프록시 URL:', proxyImageUrl);
      handleUpdate({
        imageUrl: proxyImageUrl,
        imageSource: 'generated',
        imagePrompt: finalPrompt,
        error: undefined,
      });

      if (data.demo) {
        setGenerationError('데모 모드: 실제 API 키를 입력하면 실제 이미지가 생성됩니다.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.';
      console.error('[SceneEditor] ❌ 이미지 생성 실패:', message);
      setGenerationError(message);
      handleUpdate({ error: message });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 음성 생성 (ElevenLabs만 지원)
  const handleGenerateAudio = async () => {
    if (!activeScene.script.trim()) {
      setGenerationError('대본을 입력하세요.');
      return;
    }

    // ElevenLabs API 키 확인
    const accountIndex = currentProject?.elevenLabsAccountIndex || 0;
    const apiKey = settings.elevenLabsAccounts[accountIndex]?.apiKey;
    
    if (!apiKey) {
      setGenerationError('설정에서 ElevenLabs API 키를 입력하세요.');
      return;
    }

    if (!activeScene.voiceId && !currentProject?.defaultVoiceId) {
      setGenerationError('보이스를 선택하세요.');
      return;
    }

    setIsGeneratingAudio(true);
    setGenerationError(null);

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.';
      setGenerationError(message);
      handleUpdate({ error: message });
    } finally {
      setIsGeneratingAudio(false);
    }
  };


  // 렌더링 (브라우저에서 직접 - 설치 필요 없음)
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
    setRenderProgress({ percent: 0, message: '렌더링 준비 중...' });

    try {
      const { renderVideo, isFFmpegSupported } = await import('@/lib/ffmpeg/ffmpegClient');
      
      if (!isFFmpegSupported()) {
        throw new Error('이 브라우저는 비디오 생성을 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.');
      }

      // 렌더링 설정 가져오기
      const renderSettings = currentProject?.renderSettings;
      
      const result = await renderVideo({
        imageUrl: activeScene.imageUrl,
        audioUrl: activeScene.audioUrl,
        aspectRatio: currentProject?.aspectRatio || '16:9',
        onProgress: (percent, message) => {
          setRenderProgress({ percent, message });
        },
        // 효과 설정 (씬 → 프로젝트 기본값 → 'none')
        kenBurns: activeScene.kenBurns || currentProject?.defaultKenBurns || 'none',
        kenBurnsIntensity: activeScene.kenBurnsZoom || currentProject?.defaultKenBurnsZoom || 15,
        transition: activeScene.transition || 'fade',
        // 품질 설정
        resolution: renderSettings?.resolution || '1080p',
        fps: renderSettings?.fps || 30,
        bitrate: renderSettings?.bitrate || 'high',
      });

      // Blob 저장 (다운로드용)
      setLastVideoBlob(result.videoBlob);

      handleUpdate({
        videoUrl: result.videoUrl,
        rendered: true,
        error: undefined,
      });

      setRenderProgress(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '렌더링 중 오류가 발생했습니다.';
      setGenerationError(message);
      handleUpdate({ error: message });
      setRenderProgress(null);
    } finally {
      setIsRendering(false);
    }
  };

  // 다운로드 (저장 위치 직접 선택)
  const handleDownload = async () => {
    if (!activeScene.videoUrl && !lastVideoBlob) return;

    try {
      const filename = `scene_${activeScene.order + 1}.webm`;
      
      // Blob 가져오기
      let blob: Blob;
      if (lastVideoBlob) {
        blob = lastVideoBlob;
      } else if (activeScene.videoUrl) {
        const response = await fetch(activeScene.videoUrl);
        blob = await response.blob();
      } else {
        return;
      }

      // 저장 위치 선택 다이얼로그 (Chrome/Edge)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: '비디오 파일',
              accept: { 'video/webm': ['.webm'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          alert(`✅ 저장 완료!\n📁 ${handle.name}\n📊 ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }

      // 폴백: 기본 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
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
                {/* API 키 안내 */}
                {!settings.kieApiKey && (
                  <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      이미지 생성을 위해 설정에서 API 키를 입력하세요
                    </p>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !settings.kieApiKey}
                    isLoading={isGeneratingImage}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    {settings.kieApiKey ? 'AI 생성' : 'API 키 필요'}
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
                      disabled={isGeneratingImage || !settings.kieApiKey}
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      재생성
                    </Button>
                  )}
                </div>
              </Card>
              {/* 모션 효과 (무료) */}
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
                
                <p className="text-xs text-muted mt-3">
                  💡 카메라 모션(Ken Burns)은 프로젝트 설정에서 변경
                </p>
              </Card>
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

              {/* Voice Settings - 목소리 선택만 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🎤 목소리 선택
                </h3>
                <div className="space-y-3">
                  <Select
                    label="이 씬의 목소리"
                    options={
                      favoriteVoiceOptions.length > 0 
                        ? favoriteVoiceOptions 
                        : [{ value: '', label: '설정에서 즐겨찾기 보이스를 추가하세요' }]
                    }
                    value={activeScene.voiceId || currentProject?.defaultVoiceId || ''}
                    onChange={(value) => handleUpdate({ voiceId: value })}
                  />
                  <p className="text-xs text-muted">
                    ⭐ 즐겨찾기 {favoriteVoiceOptions.length}개 | 감정/속도는 프로젝트 설정에서 변경
                  </p>
                </div>
              </Card>
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

              {/* Motion Effects - 캐릭터 애니메이션 효과 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  모션 효과 <span className="text-xs text-success ml-1">NEW</span>
                </h3>
                <div className="space-y-3">
                  <Select
                    label="효과 선택"
                    options={motionEffectOptions}
                    value={activeScene.motionEffect || currentProject?.defaultMotionEffect || 'none'}
                    onChange={(value) => handleUpdate({ motionEffect: value as MotionEffect })}
                  />
                  
                  {activeScene.motionEffect && activeScene.motionEffect !== 'none' && (
                    <Slider
                      label="효과 강도"
                      value={activeScene.motionIntensity || 1}
                      onChange={(value) => handleUpdate({ motionIntensity: value })}
                      min={0.5}
                      max={2}
                      step={0.1}
                    />
                  )}
                  
                  <div className="text-xs text-muted p-2 bg-card-hover rounded">
                    <p>👁️ <b>눈 깜빡임</b>: 캐릭터 이미지에 자연스러운 눈 깜빡임</p>
                    <p>🙂 <b>고개 끄덕임</b>: 살짝 위아래로 끄덕이는 효과</p>
                    <p>✨ <b>미세 생동감</b>: 눈깜빡임 + 호흡 + 좌우 흔들림 조합</p>
                  </div>
                </div>
              </Card>

              {/* SadTalker - 립싱크 영상 생성 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🎤 SadTalker 립싱크 <span className="text-xs text-primary ml-1">AI</span>
                </h3>
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    캐릭터 이미지 + 음성 → 실제 말하는 영상 생성
                  </p>
                  
                  {!settings.replicateApiKey ? (
                    <div className="p-2 bg-warning/10 rounded text-xs text-warning">
                      ⚠️ 설정에서 Replicate API 키를 입력하세요
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!activeScene.imageUrl || !activeScene.audioUrl}
                      onClick={async () => {
                        if (!activeScene.imageUrl || !activeScene.audioUrl) {
                          alert('이미지와 음성이 모두 필요합니다.');
                          return;
                        }
                        handleUpdate({ isProcessing: true });
                        try {
                          const response = await fetch('/api/sadtalker', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              imageUrl: activeScene.imageUrl,
                              audioUrl: activeScene.audioUrl,
                              mode: 'replicate',
                              replicateApiKey: settings.replicateApiKey,
                              preprocess: 'crop',
                              stillMode: true,
                              enhancer: true,
                            }),
                          });
                          const result = await response.json();
                          if (result.success && result.videoUrl) {
                            handleUpdate({ 
                              videoUrl: result.videoUrl, 
                              rendered: true,
                              isProcessing: false 
                            });
                            alert('립싱크 영상 생성 완료!');
                          } else {
                            throw new Error(result.error || '생성 실패');
                          }
                        } catch (error) {
                          console.error('SadTalker error:', error);
                          handleUpdate({ isProcessing: false, error: String(error) });
                          alert('립싱크 생성 실패: ' + (error instanceof Error ? error.message : error));
                        }
                      }}
                      icon={<Video className="w-4 h-4" />}
                    >
                      {activeScene.isProcessing ? '생성 중... (약 1분)' : '🎤 립싱크 영상 생성'}
                    </Button>
                  )}
                  
                  <div className="text-xs text-muted">
                    💡 비용: 약 $0.01/생성 | 소요시간: ~60초
                  </div>
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

                {/* 렌더링 진행률 */}
                {renderProgress && (
                  <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{renderProgress.message}</span>
                      <span className="text-sm font-medium text-primary">{renderProgress.percent}%</span>
                    </div>
                    <div className="h-2 bg-card-hover rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${renderProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

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
                
                {/* 안내 메시지 */}
                <div className="mt-3 p-2 rounded bg-primary/10 text-xs text-muted">
                  <p>✨ 브라우저에서 바로 렌더링 (설치 필요 없음)</p>
                  <p>📁 다운로드 시 저장 위치 직접 선택 가능</p>
                  <p>🎬 1080p 고품질 / 10Mbps 비트레이트</p>
                </div>
              </Card>

              {/* Video Settings - 추가 지속시간만 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  ⏱️ 추가 지속시간
                </h3>
                <div className="space-y-3">
                  <Slider
                    label="이미지 추가 지속시간"
                    value={activeScene.imageDuration || 0}
                    onChange={(value) => handleUpdate({ imageDuration: value })}
                    min={0}
                    max={10}
                    step={0.5}
                    unit="초"
                  />
                  <p className="text-xs text-muted">
                    💡 씬 전환/음성 후 여백은 프로젝트 설정에서 변경
                  </p>
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
