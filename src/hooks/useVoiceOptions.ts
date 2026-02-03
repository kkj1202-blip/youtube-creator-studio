/**
 * 보이스 옵션 관리 훅
 * ElevenLabs + FishAudio 통합 관리
 */

'use client';

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { TTSEngine } from '@/types';

export interface VoiceOption {
  value: string;
  label: string;
  type: 'favorite' | 'account' | 'fishaudio';
  engine: TTSEngine;
}

export function useVoiceOptions() {
  const { settings, currentProject } = useStore();

  // ElevenLabs 즐겨찾기 보이스 옵션
  const favoriteVoiceOptions = useMemo<VoiceOption[]>(() => {
    return (settings.favoriteVoices || []).map((voice) => ({
      value: voice.id,
      label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
      type: 'favorite' as const,
      engine: 'elevenlabs' as TTSEngine,
    }));
  }, [settings.favoriteVoices]);

  // ElevenLabs 계정별 보이스 옵션
  const accountVoiceOptions = useMemo<VoiceOption[]>(() => {
    return settings.elevenLabsAccounts.flatMap((account, idx) =>
      account.voices.map((voice) => ({
        value: voice.id,
        label: `${voice.name} (계정 ${idx + 1})`,
        type: 'account' as const,
        engine: 'elevenlabs' as TTSEngine,
      }))
    );
  }, [settings.elevenLabsAccounts]);

  // FishAudio 보이스 옵션
  const fishAudioVoiceOptions = useMemo<VoiceOption[]>(() => {
    return (settings.fishAudioVoices || []).map((voice) => ({
      value: voice.id,
      label: `🐟 ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
      type: 'fishaudio' as const,
      engine: 'fishaudio' as TTSEngine,
    }));
  }, [settings.fishAudioVoices]);

  // ElevenLabs 전체 보이스 옵션
  const elevenLabsVoiceOptions = useMemo<VoiceOption[]>(() => {
    return [...favoriteVoiceOptions, ...accountVoiceOptions];
  }, [favoriteVoiceOptions, accountVoiceOptions]);

  // 전체 보이스 옵션 (ElevenLabs + FishAudio)
  const allVoiceOptions = useMemo<VoiceOption[]>(() => {
    return [...favoriteVoiceOptions, ...accountVoiceOptions, ...fishAudioVoiceOptions];
  }, [favoriteVoiceOptions, accountVoiceOptions, fishAudioVoiceOptions]);

  // ElevenLabs 활성 계정 정보
  const activeAccountInfo = useMemo(() => {
    const index = settings.elevenLabsAccounts.findIndex(
      (acc) => acc.isActive && acc.apiKey
    );
    if (index === -1) return null;
    return {
      index,
      account: settings.elevenLabsAccounts[index],
    };
  }, [settings.elevenLabsAccounts]);

  // FishAudio API 키 유무
  const hasFishAudioApiKey = useMemo(() => {
    return !!settings.fishAudioApiKey;
  }, [settings.fishAudioApiKey]);

  // 기본 보이스 ID (현재 프로젝트 또는 첫 번째 보이스)
  const defaultVoiceId = useMemo(() => {
    if (currentProject?.defaultVoiceId) {
      return currentProject.defaultVoiceId;
    }
    // 첫 번째 사용 가능한 보이스
    if (allVoiceOptions.length > 0) {
      return allVoiceOptions[0].value;
    }
    return undefined;
  }, [currentProject?.defaultVoiceId, allVoiceOptions]);

  // TTS 엔진별 보이스 옵션 가져오기
  const getVoiceOptionsByEngine = (engine: TTSEngine): VoiceOption[] => {
    if (engine === 'fishaudio') {
      return fishAudioVoiceOptions;
    }
    return elevenLabsVoiceOptions;
  };

  // TTS 엔진별 API 키 가져오기
  const getApiKeyByEngine = (engine: TTSEngine): string | undefined => {
    if (engine === 'fishaudio') {
      return settings.fishAudioApiKey;
    }
    return activeAccountInfo?.account.apiKey;
  };

  return {
    // 옵션 목록
    favoriteVoiceOptions,
    accountVoiceOptions,
    fishAudioVoiceOptions,
    elevenLabsVoiceOptions,
    allVoiceOptions,
    
    // 유틸리티 함수
    getVoiceOptionsByEngine,
    getApiKeyByEngine,
    
    // 계정 정보
    activeAccountInfo,
    hasVoiceApiKey: activeAccountInfo !== null,
    hasFishAudioApiKey,
    
    // 기본값
    defaultVoiceId,
  };
}

