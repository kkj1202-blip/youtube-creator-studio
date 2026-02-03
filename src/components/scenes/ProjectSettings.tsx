'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Palette,
  Volume2,
  Video,
  Music,
  Type,
  Settings2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Select, Slider, Toggle, Input, Card } from '@/components/ui';
import { ImageStyleSelector } from '@/components/ImageStyleSelector';
import { getStyleById, ImageStyle as MasterImageStyle, ConsistencySettings } from '@/lib/imageStyles';
import type { AspectRatio, ImageStyle, TransitionType, KenBurnsEffect, EmotionTag } from '@/types';

import {
  aspectRatioOptions,
  imageStyleOptions,
  transitionOptions,
  kenBurnsOptionsSimple as kenBurnsOptions,
  emotionOptions,
} from '@/constants/options';

const ProjectSettings: React.FC = () => {
  const { currentProject, updateProject, settings, applyToAllScenes } = useStore();
  const [showMasterStyle, setShowMasterStyle] = useState(false);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  if (!currentProject) return null;

  // 마스터 스타일 핸들러
  const handleMasterStyleSelect = (style: MasterImageStyle | null) => {
    updateProject({
      masterImageStyleId: style?.id,
      masterImageStylePrompt: style?.prompt,
    });
  };

  const handleConsistencyChange = (settings: ConsistencySettings) => {
    updateProject({
      imageConsistency: settings,
    });
  };

  const currentMasterStyle = currentProject.masterImageStyleId 
    ? getStyleById(currentProject.masterImageStyleId) 
    : null;

  // 즐겨찾기 보이스 (설정에서 직접 등록한 Voice ID)
  const favoriteVoiceOptions = (settings.favoriteVoices || []).map((voice) => ({
    value: voice.id,
    label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
  }));

  // 계정에서 가져온 보이스
  const accountVoiceOptions = settings.elevenLabsAccounts
    .flatMap((account, idx) => 
      account.voices.map((voice) => ({
        value: voice.id,
        label: `${voice.name} (계정 ${idx + 1})`,
      }))
    );

  // 즐겨찾기 보이스를 먼저 표시
  const voiceOptions = [...favoriteVoiceOptions, ...accountVoiceOptions];

  const accountOptions = settings.elevenLabsAccounts.map((account, idx) => ({
    value: String(idx),
    label: account.name || `계정 ${idx + 1}`,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleApplyToAll = (field: string, value: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};
    updates[field] = value;
    applyToAllScenes(updates);
  };
  


  const handlePreview = async (engine: string, voiceId: string, speed: number = 1.0) => {
    if (!voiceId) return alert('목소리를 먼저 선택해주세요.');
    setIsPreviewLoading(true);

    try {
      let endpoint = '';
      let payload = {
        text: '안녕하세요. 목소리 테스트입니다. 자연스럽게 들리시나요?',
        voiceId,
        speed, // Used by Gemini
        apiKey: '', // API keys are handled by backend or store settings
      };

      // Add API keys from settings if needed (mostly for client-side calls, but here strictly server-side routes are better)
      // Actually, my API routes read keys from body.
      
      if (engine === 'google-gemini') {
          endpoint = '/api/generate-voice-google-gemini';
          payload.apiKey = settings.geminiApiKey; // Ensure this is available
      } else if (engine === 'google') {
          endpoint = '/api/generate-voice-google';
          payload.apiKey = settings.googleTtsApiKey || settings.geminiApiKey; // Fallback or separate key
      } else if (engine === 'fishaudio') {
          endpoint = '/api/generate-voice-fish';
          payload.apiKey = settings.fishAudioApiKey;
      } else {
        // ElevenLabs or others not yet fully standard preview-supported here without existing logic
        // For ElevenLabs, we might need a dedicated preview route or use existing generation
        alert('이 엔진의 미리듣기는 아직 지원되지 않거나 기본 생성 기능을 사용해주세요.');
        setIsPreviewLoading(false);
        return;
      }

      if (['google-gemini', 'google', 'fishaudio'].includes(engine) && !payload.apiKey) {
         // Try to proceed, backend might have Env Var fallback
      }

      const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      
      if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.play();
      }
    } catch (e: any) {
        console.error(e);
        alert('미리듣기 실패: ' + e.message);
    } finally {
        setIsPreviewLoading(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 내보내기 설정 */}
      <Card>
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            내보내기 (Export)
            </h3>
            <Button
                variant="primary"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={async () => {
                   if (!currentProject) return;
                   if (confirm('프로젝트를 엑셀과 이미지로 내보내시겠습니까?')) {
                        try {
                            const res = await fetch('/api/export-project', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ project: currentProject })
                            });
                            const data = await res.json();
                            if (data.success) {
                                alert(`✅ 내보내기 완료!\n폴더가 열립니다: ${data.path}`);
                            } else {
                                alert('실패: ' + data.error);
                            }
                        } catch (e: any) {
                            alert('오류: ' + e.message);
                        }
                   }
                }}
            >
                Excel + 이미지 저장
            </Button>
        </div>
        <p className="text-xs text-muted mt-2">
            Vrew 등 외부 툴 연동을 위해 대본(Excel)과 이미지 파일을 폴더로 정리하여 내보냅니다.
        </p>
      </Card>

      {/* 기본 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          기본 설정
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="프로젝트 이름"
            value={currentProject.name}
            onChange={(e) => updateProject({ name: e.target.value })}
          />
          <Select
            label="화면 비율"
            options={aspectRatioOptions}
            value={currentProject.aspectRatio}
            onChange={(value) => updateProject({ aspectRatio: value as AspectRatio })}
          />
        </div>
      </Card>

      {/* 마스터 이미지 스타일 (2026 라이브러리) */}
      <Card>
        <button
          onClick={() => setShowMasterStyle(!showMasterStyle)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">마스터 이미지 스타일</h3>
              <p className="text-sm text-muted">
                {currentMasterStyle 
                  ? `적용 중: ${currentMasterStyle.name}` 
                  : '스타일 라이브러리에서 선택하세요 (권장)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentMasterStyle && (
              <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                적용됨
              </span>
            )}
            <ChevronDown className={`w-5 h-5 text-muted transition-transform ${showMasterStyle ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {showMasterStyle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border overflow-hidden"
            >
              <ImageStyleSelector
                selectedStyleId={currentProject.masterImageStyleId}
                onStyleSelect={handleMasterStyleSelect}
                consistencySettings={currentProject.imageConsistency}
                onConsistencyChange={handleConsistencyChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 레거시 이미지 설정 (마스터 스타일 미사용 시) */}
      {!currentMasterStyle && (
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            기본 이미지 스타일 (레거시)
          </h3>
          <p className="text-xs text-muted mb-4">
            ⚠️ 위의 &quot;마스터 이미지 스타일&quot;을 사용하시는 것을 권장합니다.
          </p>
          <div className="space-y-4">
            <Select
              label="기본 스타일"
              options={imageStyleOptions}
              value={currentProject.imageStyle}
              onChange={(value) => updateProject({ imageStyle: value as ImageStyle })}
            />
            {currentProject.imageStyle === 'custom' && (
              <Input
                label="커스텀 스타일 프롬프트"
                value={currentProject.customStylePrompt || ''}
                onChange={(e) => updateProject({ customStylePrompt: e.target.value })}
                placeholder="예: cyberpunk style, neon lights, futuristic city"
              />
            )}
          </div>
        </Card>
      )}

      {/* Whisk 전용 참조 이미지 설정 (NEW) */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">W</div>
            Whisk 전용 참조 이미지
        </h3>
        <p className="text-xs text-muted mb-4">
            Whisk 엔진 사용 시 적용되는 전역 참조 이미지입니다. 설정 시 <strong>DOM 모드로 강제 전환</strong>되어 생성 속도가 느려질 수 있습니다.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ReferenceImageInput
                label="피사체 (Subject)"
                description="캐릭터나 물체의 외형을 고정합니다."
                value={currentProject.imageConsistency?.referenceImageUrls?.[0] || ''}
                onChange={(url) => {
                    const newUrls = url ? [url] : [];
                    handleConsistencyChange({
                        ...currentProject.imageConsistency,
                        referenceImageUrls: newUrls
                    });
                }}
            />
            
            <ReferenceImageInput
                label="스타일 (Style)"
                description="화풍, 질감, 색감을 참고합니다."
                value={currentProject.imageConsistency?.styleReferenceUrl || ''}
                onChange={(url) => {
                    handleConsistencyChange({
                        ...currentProject.imageConsistency,
                        styleReferenceUrl: url || undefined
                    });
                }}
            />

            <ReferenceImageInput
                label="구도 (Composition)"
                description="화면 배치와 구도를 참고합니다."
                value={currentProject.imageConsistency?.compositionReferenceUrl || ''}
                onChange={(url) => {
                    handleConsistencyChange({
                        ...currentProject.imageConsistency,
                        compositionReferenceUrl: url || undefined
                    });
                }}
            />
        </div>
      </Card>

      {/* 음성 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          음성 설정
        </h3>
        <div className="space-y-4">
          {/* TTS 엔진 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="TTS 엔진"
              options={[
                { value: 'elevenlabs', label: 'ElevenLabs (일레븐랩스)' },
                { value: 'google-gemini', label: 'Google Gemini (구글 제미나이)' },
                { value: 'fishaudio', label: 'FishAudio (피쉬오디오)' },
                { value: 'google', label: 'Google TTS (구글 기본)' },
              ]}
              value={currentProject.defaultTTSEngine || 'elevenlabs'}
              onChange={(value) => updateProject({ defaultTTSEngine: value as any })}
            />
          </div>

          {(currentProject.defaultTTSEngine === 'elevenlabs' || !currentProject.defaultTTSEngine) && (
            <>
              <Select
                label="ElevenLabs 계정"
                options={accountOptions}
                value={String(currentProject.elevenLabsAccountIndex)}
                onChange={(value) => updateProject({ elevenLabsAccountIndex: Number(value) })}
              />
              <div className="space-y-2">
                <Select
                  label="ElevenLabs 목소리"
                  options={voiceOptions.length > 0 ? voiceOptions : [{ value: '', label: '설정에서 즐겨찾기 보이스를 추가하세요' }]}
                  value={currentProject.defaultVoiceId || ''}
                  onChange={(value) => updateProject({ defaultVoiceId: value })}
                />
                <p className="text-xs text-muted">
                  ⭐ 즐겨찾기 {favoriteVoiceOptions.length}개 | 설정 → API 키 설정에서 보이스 추가
                </p>
              </div>
            </>
          )}

            {currentProject.defaultTTSEngine === 'google-gemini' && (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <Select
                    label="Gemini 목소리"
                    options={[
                      { value: 'Puck', label: 'Puck (벅 - 쾌활/남성)' },
                      { value: 'Charon', label: 'Charon (카론 - 깊음/남성)' },
                      { value: 'Kore', label: 'Kore (코레 - 차분/여성)' },
                      { value: 'Fenrir', label: 'Fenrir (펜리르 - 거침/남성)' },
                      { value: 'Aoede', label: 'Aoede (아이데 - 부드러움/여성)' },
                      { value: 'Zephyr', label: 'Zephyr (제피르 - 맑음/여성)' },
                    ]}
                    value={currentProject.defaultVoiceId || 'Kore'}
                    onChange={(value) => updateProject({ defaultVoiceId: value })}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mb-[2px]"
                    onClick={() => handlePreview('google-gemini', currentProject.defaultVoiceId || 'Kore', currentProject.defaultGeminiSpeed)}
                    disabled={isPreviewLoading}
                    icon={isPreviewLoading ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Volume2 className="w-4 h-4" />}
                  >
                    미리듣기
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Gemini 2.5 Flash 모델의 고품질 음성을 사용합니다. (AI Studio API Key 필요)
                </p>
              </div>
            )}

            {currentProject.defaultTTSEngine === 'google' && (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <Select
                    label="Google Cloud 목소리"
                    options={[
                      { value: 'ko-KR-Neural2-A', label: 'Neural2-A (여성/자연스러움)' },
                      { value: 'ko-KR-Neural2-B', label: 'Neural2-B (여성/부드러움)' },
                      { value: 'ko-KR-Neural2-C', label: 'Neural2-C (남성/차분함)' },
                      { value: 'ko-KR-Standard-A', label: 'Standard-A (여성/기본)' },
                      { value: 'ko-KR-Standard-B', label: 'Standard-B (여성/뉴스)' },
                      { value: 'ko-KR-Standard-C', label: 'Standard-C (남성/기본)' },
                      { value: 'ko-KR-Standard-D', label: 'Standard-D (남성/뉴스)' },
                    ]}
                    value={currentProject.defaultVoiceId || 'ko-KR-Neural2-A'}
                    onChange={(value) => updateProject({ defaultVoiceId: value })}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mb-[2px]"
                    onClick={() => handlePreview('google', currentProject.defaultVoiceId || 'ko-KR-Neural2-A', currentProject.defaultVoiceSpeed)}
                    disabled={isPreviewLoading}
                    icon={isPreviewLoading ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Volume2 className="w-4 h-4" />}
                  >
                    미리듣기
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Google Cloud Neural2 (고품질) 및 Standard 음성입니다. (Google Cloud API Key 필요)
                </p>
              </div>
            )}

            {currentProject.defaultTTSEngine === 'fishaudio' && (
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <Select
                    label="FishAudio 목소리"
                    options={settings.fishAudioVoices?.length > 0 
                      ? settings.fishAudioVoices.map(v => ({ value: v.id, label: v.name }))
                      : [{ value: '', label: '설정된 보이스가 없습니다' }]
                    }
                    value={currentProject.defaultVoiceId || ''}
                    onChange={(value) => updateProject({ defaultVoiceId: value })}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mb-[2px]"
                    onClick={() => handlePreview('fishaudio', currentProject.defaultVoiceId || '', currentProject.defaultVoiceSpeed)}
                    disabled={isPreviewLoading}
                    icon={isPreviewLoading ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : <Volume2 className="w-4 h-4" />}
                  >
                    미리듣기
                  </Button>
                </div>
              </div>
            )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="기본 감정/톤"
              options={emotionOptions}
              value={currentProject.defaultEmotion}
              onChange={(value) => updateProject({ defaultEmotion: value as EmotionTag })}
            />
            {currentProject.defaultTTSEngine === 'google-gemini' ? (
              <Slider
                label={`Gemini 속도 (${(currentProject.defaultGeminiSpeed || 1.0).toFixed(1)}x)`}
                value={currentProject.defaultGeminiSpeed || 1.0}
                onChange={(value) => updateProject({ defaultGeminiSpeed: value })}
                min={0.5}
                max={2.0}
                step={0.1}
              />
            ) : (
              <Slider
                label={`기본 속도 (${currentProject.defaultVoiceSpeed.toFixed(2)}x)`}
                value={currentProject.defaultVoiceSpeed}
                onChange={(value) => updateProject({ defaultVoiceSpeed: value })}
                min={0.8}
                max={1.3}
                step={0.05}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleApplyToAll('ttsEngine', currentProject.defaultTTSEngine);
              handleApplyToAll('voiceId', currentProject.defaultVoiceId);
              handleApplyToAll('voiceSpeed', currentProject.defaultVoiceSpeed);
              handleApplyToAll('geminiSpeed', currentProject.defaultGeminiSpeed);
              handleApplyToAll('emotion', currentProject.defaultEmotion);
            }}
          >
            모든 씬에 적용
          </Button>

          {/* Advanced Voice Settings Toggle (ElevenLabs Only) */}
          {(currentProject.defaultTTSEngine === 'elevenlabs' || !currentProject.defaultTTSEngine) && (
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedVoice(!showAdvancedVoice)}
              className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors w-full mb-3"
            >
              {showAdvancedVoice ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              ElevenLabs 고급 설정 (Stability, Similarity)
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
                    label={`Stability (안정성): ${currentProject.defaultVoiceStability ?? 0.5}`}
                    value={currentProject.defaultVoiceStability ?? 0.5}
                    onChange={(value) => updateProject({ defaultVoiceStability: value })}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                  />
                  <Slider
                    label={`Similarity (유사도): ${currentProject.defaultVoiceSimilarity ?? 0.75}`}
                    value={currentProject.defaultVoiceSimilarity ?? 0.75}
                    onChange={(value) => updateProject({ defaultVoiceSimilarity: value })}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                  />
                  <Slider
                    label={`Style Exaggeration (스타일): ${currentProject.defaultVoiceStyle ?? 0.0}`}
                    value={currentProject.defaultVoiceStyle ?? 0.0}
                    onChange={(value) => updateProject({ defaultVoiceStyle: value })}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                  />
                  <div className="flex items-center justify-between p-2 bg-card-hover rounded">
                    <span className="text-xs font-medium text-muted-foreground">Speaker Boost (부스트)</span>
                    <Toggle
                      checked={currentProject.defaultVoiceSpeakerBoost ?? true}
                      onChange={(checked) => updateProject({ defaultVoiceSpeakerBoost: checked })}
                      label=""
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      handleApplyToAll('voiceStability', currentProject.defaultVoiceStability);
                      handleApplyToAll('voiceSimilarity', currentProject.defaultVoiceSimilarity);
                      handleApplyToAll('voiceStyle', currentProject.defaultVoiceStyle);
                      handleApplyToAll('voiceSpeakerBoost', currentProject.defaultVoiceSpeakerBoost);
                    }}
                  >
                    이 고급 설정을 모든 씬에 적용
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
        </div>
      </Card>

      {/* 영상 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          영상 설정
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="기본 씬 전환"
              options={transitionOptions}
              value={currentProject.defaultTransition}
              onChange={(value) => updateProject({ defaultTransition: value as TransitionType })}
            />
            <Select
              label="기본 카메라 모션"
              options={kenBurnsOptions}
              value={currentProject.defaultKenBurns}
              onChange={(value) => updateProject({ defaultKenBurns: value as KenBurnsEffect })}
            />
          </div>
          <Slider
            label="카메라 모션 강도"
            value={currentProject.defaultKenBurnsZoom || 15}
            onChange={(value) => updateProject({ defaultKenBurnsZoom: value })}
            min={5}
            max={40}
            step={5}
            unit="%"
          />
          <p className="text-xs text-muted -mt-2">
            낮을수록 느리고 부드럽게, 높을수록 빠르고 역동적으로
          </p>
          <Slider
            label="기본 음성 후 여백"
            value={currentProject.defaultPostAudioGap}
            onChange={(value) => updateProject({ defaultPostAudioGap: value })}
            min={0}
            max={3}
            step={0.1}
            unit="초"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleApplyToAll('transition', currentProject.defaultTransition);
              handleApplyToAll('kenBurns', currentProject.defaultKenBurns);
              handleApplyToAll('kenBurnsZoom', currentProject.defaultKenBurnsZoom);
              handleApplyToAll('postAudioGap', currentProject.defaultPostAudioGap);
            }}
          >
            모든 씬에 적용
          </Button>
        </div>
      </Card>

      {/* BGM 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          배경음악 (BGM)
        </h3>
        <div className="space-y-4">
          <Toggle
            label="BGM 사용"
            checked={currentProject.bgmEnabled}
            onChange={(checked) => updateProject({ bgmEnabled: checked })}
          />
          {currentProject.bgmEnabled && (
            <>
              <Input
                label="BGM URL"
                value={currentProject.bgmUrl || ''}
                onChange={(e) => updateProject({ bgmUrl: e.target.value })}
                placeholder="BGM 파일 URL 또는 업로드"
              />
              <Slider
                label="BGM 볼륨"
                value={currentProject.bgmVolume}
                onChange={(value) => updateProject({ bgmVolume: value })}
                min={0}
                max={1}
                step={0.1}
              />
              <Button variant="ghost" size="sm">
                무료 BGM 라이브러리에서 선택
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* 자막 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" />
          자막 설정
        </h3>
        <div className="space-y-4">
          <Toggle
            label="자막 표시"
            checked={currentProject.subtitleEnabled}
            onChange={(checked) => updateProject({ subtitleEnabled: checked })}
          />
          {currentProject.subtitleEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="폰트"
                value={currentProject.subtitleStyle.fontFamily}
                onChange={(e) => updateProject({
                  subtitleStyle: { ...currentProject.subtitleStyle, fontFamily: e.target.value }
                })}
              />
              <Slider
                label="글자 크기"
                value={currentProject.subtitleStyle.fontSize}
                onChange={(value) => updateProject({
                  subtitleStyle: { ...currentProject.subtitleStyle, fontSize: value }
                })}
                min={12}
                max={48}
                step={2}
                unit="px"
              />
              <Input
                label="글자 색상"
                type="color"
                value={currentProject.subtitleStyle.fontColor}
                onChange={(e) => updateProject({
                  subtitleStyle: { ...currentProject.subtitleStyle, fontColor: e.target.value }
                })}
              />
              <Input
                label="배경 색상"
                type="color"
                value={currentProject.subtitleStyle.backgroundColor}
                onChange={(e) => updateProject({
                  subtitleStyle: { ...currentProject.subtitleStyle, backgroundColor: e.target.value }
                })}
              />
            </div>
          )}
        </div>
      </Card>

      {/* 렌더링 품질 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          렌더링 품질 설정
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="해상도"
              options={[
                { value: '720p', label: '720p HD (빠름)' },
                { value: '1080p', label: '1080p Full HD (권장)' },
                { value: '4k', label: '4K Ultra HD (느림)' },
              ]}
              value={currentProject.renderSettings?.resolution || '1080p'}
              onChange={(value) => updateProject({
                renderSettings: {
                  ...currentProject.renderSettings,
                  resolution: value as '720p' | '1080p' | '4k',
                },
              })}
            />

            <Select
              label="프레임레이트"
              options={[
                { value: '24', label: '24 FPS (영화)' },
                { value: '30', label: '30 FPS (표준)' },
                { value: '60', label: '60 FPS (부드러움)' },
              ]}
              value={String(currentProject.renderSettings?.fps || 30)}
              onChange={(value) => updateProject({
                renderSettings: {
                  ...currentProject.renderSettings,
                  fps: Number(value) as 24 | 30 | 60,
                },
              })}
            />

            <Select
              label="비트레이트 (화질)"
              options={[
                { value: 'low', label: '낮음 (2Mbps)' },
                { value: 'medium', label: '중간 (4Mbps)' },
                { value: 'high', label: '높음 (8Mbps)' },
                { value: 'ultra', label: '최고 (12Mbps)' },
              ]}
              value={currentProject.renderSettings?.bitrate || 'high'}
              onChange={(value) => updateProject({
                renderSettings: {
                  ...currentProject.renderSettings,
                  bitrate: value as 'low' | 'medium' | 'high' | 'ultra',
                },
              })}
            />
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium text-muted mb-3">품질 향상 옵션</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle
                label="🎯 화면 안정화 (떨림 제거)"
                checked={currentProject.renderSettings?.stabilization ?? true}
                onChange={(checked) => updateProject({
                  renderSettings: {
                    ...currentProject.renderSettings,
                    stabilization: checked,
                  },
                })}
              />

              <Toggle
                label="🔇 오디오 잡음 제거"
                checked={currentProject.renderSettings?.denoiseAudio ?? true}
                onChange={(checked) => updateProject({
                  renderSettings: {
                    ...currentProject.renderSettings,
                    denoiseAudio: checked,
                  },
                })}
              />
            </div>
          </div>

          <Slider
            label="선명도"
            value={currentProject.renderSettings?.sharpness ?? 50}
            onChange={(value) => updateProject({
              renderSettings: {
                ...currentProject.renderSettings,
                sharpness: value,
              },
            })}
            min={0}
            max={100}
            step={10}
            unit="%"
          />
        </div>
      </Card>
    </motion.div>
  );
};

export default ProjectSettings;

interface ReferenceImageInputProps {
    label: string;
    description: string;
    value: string;
    onChange: (url: string | null) => void;
}

function ReferenceImageInput({ label, description, value, onChange }: ReferenceImageInputProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            onChange(data.imageUrl);
        } catch (err) {
            console.error(err);
            alert('이미지 업로드 실패');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-[10px] text-muted">{description}</span>
            </div>
            
            {value ? (
                <div className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-black/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt="Reference" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => onChange(null)}
                        >
                            삭제
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/20 flex flex-col items-center justify-center gap-2">
                    <input
                        type="file"
                        title="이미지 업로드"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                    {isUploading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">클릭하여 업로드</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
