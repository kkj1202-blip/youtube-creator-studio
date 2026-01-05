'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Palette,
  Volume2,
  Video,
  Music,
  Type,
  Settings2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Select, Slider, Toggle, Input, Card } from '@/components/ui';
import type { AspectRatio, ImageStyle, TransitionType, KenBurnsEffect, EmotionTag } from '@/types';

const aspectRatioOptions = [
  { value: '16:9', label: '16:9 (롱폼 - 가로)' },
  { value: '9:16', label: '9:16 (쇼츠 - 세로)' },
];

const imageStyleOptions = [
  { value: '2d-anime', label: '2D 애니메이션' },
  { value: '3d-anime', label: '3D 애니메이션' },
  { value: 'realistic', label: '실사/사실적' },
  { value: 'cartoon', label: '카툰' },
  { value: 'watercolor', label: '수채화' },
  { value: 'custom', label: '커스텀 (직접 입력)' },
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

const emotionOptions = [
  { value: 'normal', label: '일반' },
  { value: 'emphasis', label: '강조' },
  { value: 'whisper', label: '속삭임' },
  { value: 'excited', label: '흥분' },
];

const ProjectSettings: React.FC = () => {
  const { currentProject, updateProject, settings, applyToAllScenes } = useStore();

  if (!currentProject) return null;

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

      {/* 이미지 설정 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          이미지 스타일
        </h3>
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
              step={0.1}
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

      {/* 렌더링 품질 */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          렌더링 품질
        </h3>
        <Select
          options={[
            { value: 'preview', label: '미리보기 (480p, 빠름)' },
            { value: 'high', label: '고화질 (1080p)' },
          ]}
          value={currentProject.renderQuality}
          onChange={(value) => updateProject({ renderQuality: value as 'preview' | 'high' })}
        />
      </Card>
    </motion.div>
  );
};

export default ProjectSettings;
