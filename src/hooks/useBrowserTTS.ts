'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface BrowserTTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: string;
}

export interface UseBrowserTTSResult {
  voices: BrowserTTSVoice[];
  koreanVoices: BrowserTTSVoice[];
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string, voiceId?: string, rate?: number, pitch?: number) => Promise<Blob | null>;
  speakAndRecord: (text: string, voiceId?: string, rate?: number, pitch?: number) => Promise<string | null>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * 브라우저 기반 무료 TTS 훅
 * Web Speech API 사용 - 완전 무료, API 키 불필요
 */
export function useBrowserTTS(): UseBrowserTTSResult {
  const [voices, setVoices] = useState<BrowserTTSVoice[]>([]);
  const [koreanVoices, setKoreanVoices] = useState<BrowserTTSVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 보이스 목록 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    if (!synth) {
      setIsSupported(false);
      return;
    }

    synthRef.current = synth;
    setIsSupported(true);

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      const mappedVoices: BrowserTTSVoice[] = availableVoices.map((v) => ({
        id: v.voiceURI,
        name: v.name,
        lang: v.lang,
        gender: v.name.toLowerCase().includes('female') ? 'female' : 
                v.name.toLowerCase().includes('male') ? 'male' : undefined,
      }));

      setVoices(mappedVoices);

      // 한국어 보이스 필터링
      const korean = mappedVoices.filter(
        (v) => v.lang.startsWith('ko') || v.lang.includes('KR')
      );
      setKoreanVoices(korean);
    };

    // 보이스 로드 (비동기)
    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // TTS 말하기
  const speak = useCallback(
    async (
      text: string,
      voiceId?: string,
      rate: number = 1.0,
      pitch: number = 1.0
    ): Promise<Blob | null> => {
      if (!synthRef.current || !isSupported) {
        console.error('Speech synthesis not supported');
        return null;
      }

      return new Promise((resolve) => {
        const synth = synthRef.current!;
        const utterance = new SpeechSynthesisUtterance(text);

        // 보이스 설정
        if (voiceId) {
          const voice = synth.getVoices().find((v) => v.voiceURI === voiceId);
          if (voice) utterance.voice = voice;
        } else {
          // 기본: 한국어 보이스 찾기
          const koreanVoice = synth.getVoices().find(
            (v) => v.lang.startsWith('ko') || v.lang.includes('KR')
          );
          if (koreanVoice) utterance.voice = koreanVoice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.lang = 'ko-KR';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve(null); // Web Speech API는 직접 Blob을 반환하지 않음
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve(null);
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
      });
    },
    [isSupported]
  );

  // TTS + 녹음 (MediaRecorder 사용)
  const speakAndRecord = useCallback(
    async (
      text: string,
      voiceId?: string,
      rate: number = 1.0,
      pitch: number = 1.0
    ): Promise<string | null> => {
      if (!synthRef.current || !isSupported) {
        console.error('Speech synthesis not supported');
        return null;
      }

      // 오디오 컨텍스트와 MediaRecorder 설정
      try {
        // 시스템 오디오 캡처 시도 (대부분의 브라우저에서 제한됨)
        // 대안: 서버 사이드 TTS 사용 권장
        
        const synth = synthRef.current;
        const utterance = new SpeechSynthesisUtterance(text);

        if (voiceId) {
          const voice = synth.getVoices().find((v) => v.voiceURI === voiceId);
          if (voice) utterance.voice = voice;
        } else {
          const koreanVoice = synth.getVoices().find(
            (v) => v.lang.startsWith('ko') || v.lang.includes('KR')
          );
          if (koreanVoice) utterance.voice = koreanVoice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.lang = 'ko-KR';

        return new Promise((resolve) => {
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => {
            setIsSpeaking(false);
            // Web Speech API는 오디오 파일을 직접 생성할 수 없음
            // 서버 사이드 TTS 또는 edge-tts 사용 권장
            resolve('BROWSER_TTS_COMPLETED');
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
            resolve(null);
          };

          utteranceRef.current = utterance;
          synth.speak(utterance);
        });
      } catch (error) {
        console.error('Recording error:', error);
        return null;
      }
    },
    [isSupported]
  );

  // 중지
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // 일시정지
  const pause = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.pause();
    }
  }, []);

  // 재개
  const resume = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.resume();
    }
  }, []);

  return {
    voices,
    koreanVoices,
    isSupported,
    isSpeaking,
    speak,
    speakAndRecord,
    stop,
    pause,
    resume,
  };
}

export default useBrowserTTS;
