/**
 * 보이스 옵션 관리 훅
 * ElevenLabs (유료) + Browser TTS (무료) 통합 관리
 */

'use client';

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';

export interface VoiceOption {
  value: string;
  label: string;
  type: 'favorite' | 'account';
}

export function useVoiceOptions() {
  const { settings, currentProject } = useStore();

  // 즐겨찾기 보이스 옵션 (ElevenLabs 직접 등록)
  const favoriteVoiceOptions = useMemo<VoiceOption[]>(() => {
    return (settings.favoriteVoices || []).map((voice) => ({
      value: voice.id,
      label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
      type: 'favorite' as const,
    }));
  }, [settings.favoriteVoices]);

  // 계정별 보이스 옵션 (ElevenLabs)
  const accountVoiceOptions = useMemo<VoiceOption[]>(() => {
    return settings.elevenLabsAccounts.flatMap((account, idx) =>
      account.voices.map((voice) => ({
        value: voice.id,
        label: `${voice.name} (계정 ${idx + 1})`,
        type: 'account' as const,
      }))
    );
  }, [settings.elevenLabsAccounts]);

  // 전체 보이스 옵션 (즐겨찾기 → 계정)
  const allVoiceOptions = useMemo<VoiceOption[]>(() => {
    return [...favoriteVoiceOptions, ...accountVoiceOptions];
  }, [favoriteVoiceOptions, accountVoiceOptions]);

  // ElevenLabs 보이스만 (유료)
  const elevenLabsVoiceOptions = useMemo<VoiceOption[]>(() => {
    return [...favoriteVoiceOptions, ...accountVoiceOptions];
  }, [favoriteVoiceOptions, accountVoiceOptions]);

  // 활성 계정 정보
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

  return {
    // 옵션 목록
    favoriteVoiceOptions,
    accountVoiceOptions,
    allVoiceOptions,
    elevenLabsVoiceOptions,
    
    // 계정 정보
    activeAccountInfo,
    hasVoiceApiKey: activeAccountInfo !== null,
    
    // 기본값
    defaultVoiceId,
  };
}
