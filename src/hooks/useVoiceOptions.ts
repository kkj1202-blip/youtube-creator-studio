/**
 * 보이스 옵션 관리 훅
 * 즐겨찾기 보이스 + 계정 보이스 통합 관리
 */

'use client';

import { useMemo, useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

export interface VoiceOption {
  value: string;
  label: string;
  type: 'favorite' | 'account' | 'free';
}

export interface FreeVoice {
  id: string;
  name: string;
  gender: string;
  description: string;
}

export function useVoiceOptions() {
  const { settings, currentProject } = useStore();
  const [freeVoices, setFreeVoices] = useState<FreeVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 무료 보이스 목록 로드
  useEffect(() => {
    const loadFreeVoices = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/generate-voice-free');
        const data = await response.json();
        if (data.voices) {
          setFreeVoices(data.voices);
        }
      } catch (error) {
        console.error('[useVoiceOptions] Failed to load free voices:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFreeVoices();
  }, []);

  // 즐겨찾기 보이스 옵션
  const favoriteVoiceOptions = useMemo<VoiceOption[]>(() => {
    return (settings.favoriteVoices || []).map((voice) => ({
      value: voice.id,
      label: `⭐ ${voice.name}${voice.description ? ` - ${voice.description}` : ''}`,
      type: 'favorite' as const,
    }));
  }, [settings.favoriteVoices]);

  // 계정별 보이스 옵션
  const accountVoiceOptions = useMemo<VoiceOption[]>(() => {
    return settings.elevenLabsAccounts.flatMap((account, idx) =>
      account.voices.map((voice) => ({
        value: voice.id,
        label: `${voice.name} (계정 ${idx + 1})`,
        type: 'account' as const,
      }))
    );
  }, [settings.elevenLabsAccounts]);

  // 무료 보이스 옵션
  const freeVoiceOptions = useMemo<VoiceOption[]>(() => {
    return freeVoices.map((voice) => ({
      value: voice.id,
      label: `🆓 ${voice.name} (${voice.gender})`,
      type: 'free' as const,
    }));
  }, [freeVoices]);

  // 전체 보이스 옵션 (즐겨찾기 우선)
  const allVoiceOptions = useMemo<VoiceOption[]>(() => {
    return [...favoriteVoiceOptions, ...accountVoiceOptions, ...freeVoiceOptions];
  }, [favoriteVoiceOptions, accountVoiceOptions, freeVoiceOptions]);

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
    // 즐겨찾기 첫 번째
    if (favoriteVoiceOptions.length > 0) {
      return favoriteVoiceOptions[0].value;
    }
    // 활성 계정의 첫 번째 보이스
    if (activeAccountInfo) {
      const accountVoices = activeAccountInfo.account.voices;
      if (accountVoices.length > 0) {
        return accountVoices[0].id;
      }
    }
    return undefined;
  }, [currentProject?.defaultVoiceId, favoriteVoiceOptions, activeAccountInfo]);

  return {
    // 옵션 목록
    favoriteVoiceOptions,
    accountVoiceOptions,
    freeVoiceOptions,
    allVoiceOptions,
    elevenLabsVoiceOptions,
    
    // 상태
    isLoading,
    freeVoices,
    
    // 계정 정보
    activeAccountInfo,
    hasVoiceApiKey: activeAccountInfo !== null,
    
    // 기본값
    defaultVoiceId,
  };
}
