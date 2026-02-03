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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Select, Slider, Tabs, Card, Modal, Toggle } from '@/components/ui';
import AudioPlayer from './AudioPlayer';
import ScenePreview from './ScenePreview';
import ImageUploader from './ImageUploader';
import { generateImagePrompt } from '@/lib/api/imageGeneration';
import { estimateAudioDuration } from '@/lib/api/voiceGeneration';
import { buildFinalPrompt, NEGATIVE_PROMPT, imageStyleLibrary } from '@/lib/imageStyles';
import type { Scene, MotionEffect, EmotionTag, TTSEngine } from '@/types';

import {
  motionEffectOptions,
  emotionOptions,
} from '@/constants/options';

// TTS 엔진 옵션
const ttsEngineOptions = [
  { value: 'elevenlabs', label: '🎙️ ElevenLabs' },
  { value: 'fishaudio', label: '🐟 FishAudio' },
  { value: 'google', label: '🔊 Google TTS' },
];

// 구글 성우 옵션 (한국어) - 초기값 (API 호출 실패 시 폴백)
const initialGoogleVoices = [
  { value: 'ko-KR-Neural2-A', label: '구글 여성 1 (Neural2-A)' },
  { value: 'ko-KR-Neural2-B', label: '구글 여성 2 (Neural2-B)' },
  { value: 'ko-KR-Neural2-C', label: '구글 남성 1 (Neural2-C)' },
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
  const [renderProgress, setRenderProgress] = useState<{ percent: number; message: string } | null>(null);
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(true);

  // 동적 성우 목록 상태
  const [googleVoices, setGoogleVoices] = useState<{value: string, label: string}[]>(initialGoogleVoices);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  const activeScene = currentProject?.scenes.find((s) => s.id === activeSceneId);

  // 구글 보이스 가져오기
  const fetchGoogleVoices = async () => {
    const apiKey = settings.googleTtsApiKey || settings.geminiApiKey;
    if (!apiKey) return;

    setIsLoadingVoices(true);
    try {
      const res = await fetch(`/api/generate-voice-google?apiKey=${apiKey}`);
      const data = await res.json();
      
      if (res.ok && data.voices) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted = data.voices.map((v: any) => ({
          value: v.name,
          label: `${v.name.replace('ko-KR-', '')} (${v.ssmlGender})`
        })).sort((a: { value: string }, b: { value: string }) => a.value.localeCompare(b.value));
        
        setGoogleVoices(formatted);
        console.log('[SceneEditor] Google Voices Fetched:', formatted.length);
      }
    } catch (e) {
      console.error('Failed to fetch google voices', e);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // TTS 엔진 변경 시 보이스 목록 로드
  useEffect(() => {
    if (activeScene?.ttsEngine === 'google') {
      fetchGoogleVoices();
    }
  }, [activeScene?.ttsEngine, settings.googleTtsApiKey, settings.geminiApiKey]);

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

  // 현재 선택된 TTS 엔진
  const currentTTSEngine: TTSEngine = activeScene.ttsEngine || 'elevenlabs';

  // ElevenLabs 즐겨찾기 보이스
  const elevenLabsVoiceOptions = (settings.favoriteVoices || []).map((voice) => ({
    value: voice.id,
    label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
  }));

  // FishAudio 보이스
  const fishAudioVoiceOptions = (settings.fishAudioVoices || []).map((voice) => ({
    value: voice.id,
    label: `🐟 ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
  }));

  // 현재 TTS 엔진에 따른 보이스 옵션
  let currentVoiceOptions = elevenLabsVoiceOptions;
  if (currentTTSEngine === 'fishaudio') {
    currentVoiceOptions = fishAudioVoiceOptions;
  } else if (currentTTSEngine === 'google') {
    // 구글은 즐겨찾기가 있으면 그것만 표시, 없으면 전체 목록 표시
    if (settings.googleVoices && settings.googleVoices.length > 0) {
      currentVoiceOptions = settings.googleVoices.map(v => ({
        value: v.id,
        label: `⭐ ${v.name} (${v.id})`
      }));
    } else {
      currentVoiceOptions = googleVoices;
    }
  }

  // 이미지 프롬프트 자동 생성 (LLM 사용)
  const handleGeneratePrompt = async () => {
    if (!currentProject) return;
    
    const hasLLM = !!settings.geminiApiKey || !!settings.openaiApiKey;
    // 🔥 핵심 수정: DB에 저장된 구버전 프롬프트 대신, 라이브러리 최신 값 사용
    const styleId = currentProject.masterImageStyleId || 'default';
    const foundStyle = imageStyleLibrary.flatMap(c => c.styles).find(s => s.id === styleId);
    const stylePrompt = foundStyle ? foundStyle.prompt : (currentProject.masterImageStylePrompt || 'high quality, detailed, professional illustration');
    
    console.log('[SceneEditor] handleGeneratePrompt - hasLLM:', hasLLM);
    
    if (hasLLM) {
      // LLM으로 프롬프트 생성
      try {
        console.log('[SceneEditor] LLM으로 프롬프트 생성 시작...');
        const llmResponse = await fetch('/api/generate-scene-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: activeScene.script,
            stylePrompt: stylePrompt,
            styleName: styleId,
            characterDescription: currentProject.imageConsistency?.characterDescription,
            backgroundDescription: currentProject.imageConsistency?.backgroundDescription,
            geminiApiKey: settings.geminiApiKey,
            openaiApiKey: settings.openaiApiKey,
          }),
        });
        
        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          console.log('[SceneEditor] ✅ LLM 프롬프트:', llmData.prompt.slice(0, 100) + '...');
          handleUpdate({ imagePrompt: llmData.prompt });
          return;
        }
      } catch (error) {
        console.warn('[SceneEditor] LLM 실패, 폴백 사용:', error);
      }
    }
    
    // 폴백: 기존 방식
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
    
    // API 키 확인 (Pollinations, Whisk 제외)
    if (settings.imageSource !== 'pollinations' && settings.imageSource !== 'whisk' && !settings.kieApiKey) {
      console.error('[SceneEditor] API 키 없음');
      setGenerationError('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    setIsGeneratingImage(true);
    setGenerationError(null);

    try {
      // 마스터 스타일 프롬프트 가져오기
      const masterStylePrompt = currentProject.masterImageStylePrompt || '';
      
      // 일관성 설정 가져오기
      const consistencySettings = currentProject.imageConsistency;
      const referenceImageUrls = consistencySettings?.referenceImageUrls || [];
      const hasReference = referenceImageUrls.length > 0;
      
      const width = currentProject.aspectRatio === '9:16' ? 768 : 1344;
      const height = currentProject.aspectRatio === '9:16' ? 1344 : 768;
      
      // 🔥 핵심 수정: DB에 저장된 구버전 프롬프트 대신, 라이브러리 최신 값 사용
      const styleId = currentProject.masterImageStyleId || 'default';
      const foundStyle = imageStyleLibrary.flatMap(c => c.styles).find(s => s.id === styleId);
      const stylePrompt = foundStyle ? foundStyle.prompt : (masterStylePrompt || 'high quality, professional illustration');
      
      let intermediatePrompt: string = activeScene.imagePrompt || activeScene.script;
      
      // 1. LLM을 통한 시각적 묘사 생성 (있는 경우)
      if (!!settings.geminiApiKey || !!settings.openaiApiKey) {
        try {
          const llmResponse = await fetch('/api/generate-scene-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: activeScene.script,
              stylePrompt: stylePrompt,
              styleName: styleId,
              characterDescription: consistencySettings?.characterDescription,
              backgroundDescription: consistencySettings?.backgroundDescription,
              geminiApiKey: settings.geminiApiKey,
              openaiApiKey: settings.openaiApiKey,
            }),
          });
          
          if (llmResponse.ok) {
            const llmData = await llmResponse.json();
            intermediatePrompt = llmData.prompt;
          } else {
            const errorData = await llmResponse.json().catch(() => ({}));
            console.warn('[SceneEditor] LLM Prompt Generation Failed:', errorData.error || llmResponse.status);
            // Fallback
            intermediatePrompt = buildFinalPrompt(activeScene.script, stylePrompt, consistencySettings, hasReference);
          }
        } catch (llmError) {
          console.warn('[SceneEditor] LLM 오류, 폴백 사용:', llmError);
          // Fallback
          intermediatePrompt = buildFinalPrompt(activeScene.script, stylePrompt, consistencySettings, hasReference);
        }
      }

      // 2. 최종 프롬프트 빌드 (Style, Consistency, NO TEXT 필터 적용)
      // LLM 결과물이라도 buildFinalPrompt를 통과시켜 일관된 필터링 적용
      const finalPrompt = buildFinalPrompt(
        intermediatePrompt,
        stylePrompt,
        consistencySettings,
        hasReference
      );

      console.log('[SceneEditor] 최종 프롬프트:', finalPrompt);
      console.log('[SceneEditor] 소스:', settings.imageSource);

      let imageUrl = '';
      let isDemo = false;

      // 소스별 분기 처리
      if (settings.imageSource === 'pollinations') {
         const seed = Math.floor(Math.random() * 1000000);
         const finalPollinationsPrompt = `${finalPrompt} --no ${NEGATIVE_PROMPT}`;
         const encodedPrompt = encodeURIComponent(finalPollinationsPrompt);
         imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
         
      } else if (settings.imageSource === 'whisk') {
          // Whisk (Unified)
          const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: finalPrompt, 
                imageSource: 'whisk',
                cookies: settings.whiskCookie,
                whiskMode: settings.whiskMode || 'api', // Default to API mode for speed
                referenceImageUrls: referenceImageUrls,
                referenceImages: {
                  subject: referenceImageUrls[0], // Primary subject
                  style: consistencySettings?.styleReferenceUrl, // If exists
                  composition: consistencySettings?.compositionReferenceUrl // If exists
                }
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Whisk Error');
          imageUrl = data.imageUrl || data.images?.[0];
          
      } else {
          // KIE (Default)
          const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: settings.kieApiKey,
              prompt: finalPrompt,
              aspectRatio: currentProject.aspectRatio,
            }),
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'API Error');
          imageUrl = data.imageUrl;
          isDemo = data.demo;
      }

      if (!imageUrl) {
        throw new Error('이미지 생성에 실패했습니다 (URL 없음)');
      }

      // CORS/COEP 문제 해결을 위해 모든 외부 이미지는 프록시 사용 (특히 Pollinations)
      // Pollinations URL은 쿼리 파라미터가 길지만 proxy-image가 처리
      
      const finalImageUrl = imageUrl.startsWith('/uploads') 
        ? imageUrl 
        : `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

      handleUpdate({
        imageUrl: finalImageUrl,
        imageSource: settings.imageSource === 'whisk' ? 'uploaded' : 'generated',
        imagePrompt: finalPrompt,
        error: undefined,
      });

      if (isDemo) {
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

  // 음성 생성 (ElevenLabs / FishAudio / Google 지원)
  const handleGenerateAudio = async () => {
    if (!activeScene.script.trim()) {
      setGenerationError('대본을 입력하세요.');
      return;
    }

    const engine = currentTTSEngine;
    
    // API 키 확인
    let apiKey: string | undefined;
    if (engine === 'fishaudio') {
      apiKey = settings.fishAudioApiKey;
      if (!apiKey) {
        setGenerationError('설정에서 FishAudio API 키를 입력하세요.');
        return;
      }
    } else if (engine === 'google') {
      // Google TTS는 사용자가 입력한 Google 키 또는 Gemini 키를 다 사용 가능
      apiKey = settings.googleTtsApiKey || settings.geminiApiKey;
      if (!apiKey) {
        setGenerationError('설정에서 Google TTS 키 또는 Gemini API 키를 입력하세요.');
        return;
      }
    } else {
      const accountIndex = currentProject?.elevenLabsAccountIndex || 0;
      apiKey = settings.elevenLabsAccounts[accountIndex]?.apiKey;
      if (!apiKey) {
        setGenerationError('설정에서 ElevenLabs API 키를 입력하세요.');
        return;
      }
    }

    // 보이스 확인
    const voiceId = activeScene.voiceId || currentProject?.defaultVoiceId;
    // Google은 voiceId가 없어도 기본값(Neural2)이 있으므로 필수는 아님, 하지만 선택 유도
    if (engine !== 'google' && !voiceId) {
       setGenerationError('보이스를 선택하세요.');
       return;
    }

    setIsGeneratingAudio(true);
    setGenerationError(null);

    try {
      let response: Response;
      
      if (engine === 'fishaudio') {
        // FishAudio API 호출
        response = await fetch('/api/generate-voice-fish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            referenceId: voiceId,
            text: activeScene.script,
            speed: activeScene.voiceSpeed || 1.0,
          }),
        });
      } else if (engine === 'google') {
        // Google TTS API 호출
        response = await fetch('/api/generate-voice-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            voiceId, // e.g. 'ko-KR-Neural2-A'
            text: activeScene.script,
          }),
        });
      } else {
        // ElevenLabs API 호출
        if (!voiceId) throw new Error('ElevenLabs 보이스를 선택하세요.');
        response = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            voiceId,
            text: activeScene.script,
            speed: activeScene.voiceSpeed,
            emotion: activeScene.emotion,
            stability: activeScene.voiceStability,
            similarity: activeScene.voiceSimilarity,
            style: activeScene.voiceStyle,
            useSpeakerBoost: activeScene.voiceSpeakerBoost,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok || !data.audioUrl) {
        throw new Error(data.error || '음성 생성에 실패했습니다.');
      }

      handleUpdate({
        audioUrl: data.audioUrl,
        audioGenerated: true,
        imageDuration: (data.duration || 0) + (activeScene.postAudioGap || 0.5),
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
          // duration: activeScene.imageDuration, // 제거 (Gap 변경 시 반영 안 됨)
          padding: activeScene.postAudioGap || 0.5, // 항상 실시간 Gap 반영
          aspectRatio: currentProject?.aspectRatio || '16:9',
          onProgress: (percent, message) => {
            setRenderProgress({ percent, message });
          },
        // 효과 설정 (씬 → 프로젝트 기본값 → 'none')
        kenBurns: activeScene.kenBurns || currentProject?.defaultKenBurns || 'none',
        kenBurnsIntensity: activeScene.kenBurnsZoom || currentProject?.defaultKenBurnsZoom || 15,
        transition: activeScene.transition || currentProject?.defaultTransition || 'none',
        // 모션 효과 (캐릭터 애니메이션)
        motionEffect: activeScene.motionEffect || currentProject?.defaultMotionEffect || 'none',
        motionIntensity: activeScene.motionIntensity || 1.0,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                {!settings.kieApiKey && settings.imageSource !== 'pollinations' && settings.imageSource !== 'whisk' && (
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
                    disabled={isGeneratingImage || (!settings.kieApiKey && settings.imageSource !== 'pollinations' && settings.imageSource !== 'whisk')}
                    isLoading={isGeneratingImage}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    {isGeneratingImage ? '생성 중...' : 
                     settings.imageSource === 'pollinations' ? 'AI 생성 (Pollinations)' :
                     settings.imageSource === 'whisk' ? 'AI 생성 (Whisk)' :
                     settings.kieApiKey ? 'AI 생성' : 'API 키 필요'}
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
                </div>
                {/* 전체 생성 버튼 (Whisk 모드일 때만) */}
                {settings.imageSource === 'whisk' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 border-dashed border-primary/30 hover:bg-primary/5"
                    onClick={async () => {
                      if (!currentProject) return;
                      if (!settings.whiskCookie) {
                        setGenerationError('설정에서 Whisk 쿠키를 먼저 등록하세요.');
                        return;
                      }
                      if (confirm('모든 씬의 이미지를 자동으로 생성하시겠습니까? (Whisk 사용)')) {
                        const { generateAllImages } = await import('@/lib/api/batchProcessor');
                        try {
                          setIsGeneratingImage(true);
                          await generateAllImages(
                            currentProject,
                            '', // API key not used for whisk
                            undefined,
                            updateScene,
                            { concurrency: 1 }, // Whisk is sequential
                            settings.whiskCookie,
                            'whisk',
                            settings.whiskMode,
                            currentProject.imageConsistency?.referenceImageUrls
                          );
                          alert('모든 이미지 생성이 완료되었습니다!');
                        } catch (e: any) {
                          setGenerationError('일괄 생성 실패: ' + e.message);
                        } finally {
                          setIsGeneratingImage(false);
                        }
                      }
                    }}
                    disabled={isGeneratingImage}
                    isLoading={isGeneratingImage}
                    icon={<Sparkles className="w-4 h-4 text-primary" />}
                  >
                    전체 AI 이미지 생성 (Whisk)
                  </Button>
                )}
                {activeScene.imageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || (!settings.kieApiKey && settings.imageSource !== 'pollinations' && settings.imageSource !== 'whisk')}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    재생성
                  </Button>
                )}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    음성 미리듣기
                  </h3>
                   {/* Reset to Defaults Button */}
                   <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-muted hover:text-primary"
                    onClick={() => {
                        if(confirm('현재 씬의 음성 설정을 프로젝트 기본값으로 초기화하시겠습니까?')) {
                            handleUpdate({
                                voiceId: currentProject?.defaultVoiceId,
                                voiceSpeed: currentProject?.defaultVoiceSpeed,
                                emotion: currentProject?.defaultEmotion,
                                voiceStability: currentProject?.defaultVoiceStability,
                                voiceSimilarity: currentProject?.defaultVoiceSimilarity,
                                voiceStyle: currentProject?.defaultVoiceStyle,
                                voiceSpeakerBoost: currentProject?.defaultVoiceSpeakerBoost,
                            });
                        }
                    }}
                    icon={<RefreshCw className="w-3 h-3" />}
                  >
                    프로젝트 기본값 불러오기
                  </Button>
                </div>
                
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

              {/* Voice Settings - TTS 엔진 및 목소리 선택 */}
              <Card>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🎙️ TTS 엔진 선택
                </h3>
                <div className="space-y-4">
                  {/* TTS 엔진 선택 버튼 */}
                  <div className="flex gap-2">
                    {ttsEngineOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleUpdate({ 
                          ttsEngine: option.value as TTSEngine,
                          voiceId: undefined // 엔진 변경 시 보이스 초기화
                        })}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentTTSEngine === option.value
                            ? 'bg-primary text-white'
                            : 'bg-muted/20 text-muted hover:bg-muted/30'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* API 키 상태 */}
                  <div className={`text-xs px-3 py-2 rounded-lg ${
                    (currentTTSEngine === 'fishaudio' && settings.fishAudioApiKey) ||
                    (currentTTSEngine === 'elevenlabs' && settings.elevenLabsAccounts.some(acc => acc.apiKey && acc.isActive)) ||
                    (currentTTSEngine === 'google' && (settings.googleTtsApiKey || settings.geminiApiKey))
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {currentTTSEngine === 'fishaudio' 
                      ? (settings.fishAudioApiKey ? '✅ FishAudio API 키 설정됨' : '⚠️ 설정에서 FishAudio API 키를 입력하세요')
                      : currentTTSEngine === 'google'
                        ? (settings.googleTtsApiKey || settings.geminiApiKey ? '✅ Google Cloud/Gemini API 키 설정됨' : '⚠️ 설정에서 Google TTS API 키를 입력하세요')
                        : (settings.elevenLabsAccounts.some(acc => acc.apiKey && acc.isActive) ? '✅ ElevenLabs API 키 설정됨' : '⚠️ 설정에서 ElevenLabs API 키를 입력하세요')
                    }
                  </div>

                  {/* 보이스 선택 */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      {currentTTSEngine === 'fishaudio' ? '🐟 FishAudio 보이스' : 
                       currentTTSEngine === 'google' ? '🔊 Google Cloud 보이스' : '⭐ ElevenLabs 보이스'}
                    </label>
                    {currentTTSEngine === 'google' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchGoogleVoices}
                          disabled={isLoadingVoices}
                          className="h-6 text-xs p-1"
                          icon={<RefreshCw className={`w-3 h-3 ${isLoadingVoices ? 'animate-spin' : ''}`} />}
                        >
                          갱신
                        </Button>
                    )}
                  </div>
                  <Select
                    options={
                      currentVoiceOptions.length > 0 
                        ? currentVoiceOptions 
                        : [{ value: '', label: currentTTSEngine === 'fishaudio' ? '설정에서 FishAudio 보이스를 추가하세요' : currentTTSEngine === 'google' ? '설정에서 즐겨찾기를 추가하거나 갱신하세요' : '설정에서 즐겨찾기 보이스를 추가하세요' }]
                    }
                    value={activeScene.voiceId || currentProject?.defaultVoiceId || ''}
                    onChange={(value) => handleUpdate({ voiceId: value })}
                  />
                  <p className="text-xs text-muted mt-1">
                    {currentTTSEngine === 'fishaudio' 
                      ? 'FishAudio에서 참조한 커스텀 보이스입니다.'
                      : currentTTSEngine === 'google' 
                        ? 'Google Cloud의 Neural2/WaveNet(한국어) 보이스입니다.'
                        : 'ElevenLabs의 프리미엄 보이스입니다.'}
                  </p> 
                  <p className="text-xs text-muted">
                    {currentTTSEngine === 'google'
                      ? `🔊 Google Cloud 보이스 ${currentVoiceOptions.length}개 사용 가능`
                      : currentTTSEngine === 'fishaudio' 
                      ? `🐟 FishAudio 보이스 ${fishAudioVoiceOptions.length}개 사용 가능`
                      : `⭐ ElevenLabs 즐겨찾기 ${elevenLabsVoiceOptions.length}개 사용 가능`
                    }
                  </p>
                </div>
              </Card>

              {/* Advanced Voice Settings */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    🎚️ 음성 세부 설정
                    </h3>
                    <span className="text-[10px] text-muted bg-muted/20 px-2 py-1 rounded">
                        이 씬에만 적용됨
                    </span>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="감정"
                      options={emotionOptions}
                      value={activeScene.emotion || 'normal'}
                      onChange={(value) => handleUpdate({ emotion: value as EmotionTag })}
                    />
                    <Slider
                      label={`속도 (${(activeScene.voiceSpeed || 1.0).toFixed(2)}x)`}
                      value={activeScene.voiceSpeed}
                      onChange={(value) => handleUpdate({ voiceSpeed: value })}
                      min={0.5}
                      max={2.0}
                      step={0.05}
                    />
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="border-t border-border/50 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedVoice(!showAdvancedVoice)}
                      className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors w-full mb-3"
                    >
                      {showAdvancedVoice ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      고급 설정 (Stability, Similarity, Style)
                    </button>

                    <AnimatePresence>
                      {showAdvancedVoice && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <Slider
                            label={`Stability (안정성): ${activeScene.voiceStability ?? 0.50}`}
                            // description="낮을수록 감정 표현이 풍부하지만 불안정할 수 있습니다."
                            value={activeScene.voiceStability ?? 0.50}
                            onChange={(value) => handleUpdate({ voiceStability: value })}
                            min={0.0}
                            max={1.0}
                            step={0.01}
                          />
                          <Slider
                            label={`Similarity (유사도): ${activeScene.voiceSimilarity ?? 0.75}`}
                            // description="원래 목소리와의 유사도를 조절합니다."
                            value={activeScene.voiceSimilarity ?? 0.75}
                            onChange={(value) => handleUpdate({ voiceSimilarity: value })}
                            min={0.0}
                            max={1.0}
                            step={0.01}
                          />
                          <Slider
                            label={`Style Exaggeration (스타일): ${activeScene.voiceStyle ?? 0.0}`}
                            // description="목소리의 스타일을 과장합니다."
                            value={activeScene.voiceStyle ?? 0.0}
                            onChange={(value) => handleUpdate({ voiceStyle: value })}
                            min={0.0}
                            max={1.0}
                            step={0.01}
                          />
                          <div className="flex items-center justify-between p-2 bg-card-hover rounded">
                            <span className="text-xs font-medium text-muted-foreground">Speaker Boost (부스트)</span>
                            <Toggle
                              checked={activeScene.voiceSpeakerBoost ?? true}
                              onChange={(checked) => handleUpdate({ voiceSpeakerBoost: checked })}
                              label=""
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
