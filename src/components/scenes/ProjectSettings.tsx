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
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);

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

  const handleApplyToAll = (field: string, value: any) => {
    const updates: any = {};
    updates[field] = value;
    applyToAllScenes(updates);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
            ⚠️ 위의 "마스터 이미지 스타일"을 사용하시는 것을 권장합니다.
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

      {/* 음성 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          음성 설정
        </h3>
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="기본 감정"
              options={emotionOptions}
              value={currentProject.defaultEmotion}
              onChange={(value) => updateProject({ defaultEmotion: value as EmotionTag })}
            />
            <Slider
              label="기본 속도"
              value={currentProject.defaultVoiceSpeed}
              onChange={(value) => updateProject({ defaultVoiceSpeed: value })}
              min={0.8}
              max={1.3}
              step={0.05}
              unit="x"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleApplyToAll('voiceId', currentProject.defaultVoiceId);
              handleApplyToAll('voiceSpeed', currentProject.defaultVoiceSpeed);
              handleApplyToAll('emotion', currentProject.defaultEmotion);
            }}
          >
            모든 씬에 적용
          </Button>

          {/* Advanced Voice Settings Toggle */}
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
