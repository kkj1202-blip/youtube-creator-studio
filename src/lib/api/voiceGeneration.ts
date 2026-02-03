/**
 * 음성 생성 API 서비스
 * ElevenLabs & FishAudio TTS API 연동
 */

import type { TTSEngine } from '@/types';

export interface VoiceGenerationParams {
  text: string;
  voiceId: string;
  speed?: number; // 0.8 ~ 1.3
  emotion?: 'normal' | 'emphasis' | 'whisper' | 'excited';
  // 고급 설정 추가 (ElevenLabs 전용)
  stability?: number;
  similarity?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  // TTS 엔진 선택
  ttsEngine?: TTSEngine;
}

export interface VoiceGenerationResponse {
  success: boolean;
  audioUrl?: string;
  audioDuration?: number;
  error?: string;
}

const emotionSettings: Record<string, { stability: number; similarityBoost: number; style: number }> = {
  normal: { stability: 0.5, similarityBoost: 0.75, style: 0.0 },
  emphasis: { stability: 0.4, similarityBoost: 0.8, style: 0.5 },
  whisper: { stability: 0.8, similarityBoost: 0.5, style: 0.0 },
  excited: { stability: 0.3, similarityBoost: 0.8, style: 0.8 },
};

/**
 * ElevenLabs TTS 음성 생성
 */
export async function generateVoiceElevenLabs(
  apiKey: string,
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  try {
    const emotion = params.emotion || 'normal';
    const settings = emotionSettings[emotion];

    const stability = params.stability ?? settings.stability;
    const similarityBoost = params.similarity ?? settings.similarityBoost;
    const style = params.style ?? settings.style;
    const useSpeakerBoost = params.useSpeakerBoost ?? true;

    const response = await fetch('/api/generate-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        voiceId: params.voiceId,
        text: params.text,
        speed: params.speed || 1.0,
        stability,
        similarityBoost,
        style,
        useSpeakerBoost,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `ElevenLabs API 오류: ${error}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      audioUrl: data.audioUrl,
      audioDuration: data.duration,
    };
  } catch (error) {
    console.error('ElevenLabs voice generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * FishAudio TTS 음성 생성
 */
export async function generateVoiceFishAudio(
  apiKey: string,
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  try {
    const response = await fetch('/api/generate-voice-fish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        referenceId: params.voiceId, // FishAudio는 reference_id 사용
        text: params.text,
        speed: params.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `FishAudio API 오류: ${error}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      audioUrl: data.audioUrl,
      audioDuration: data.duration,
    };
  } catch (error) {
    console.error('FishAudio voice generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * Kokoro TTS (Local) 음성 생성
 */
export async function generateVoiceKokoro(
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  try {
    const response = await fetch('/api/generate-voice-kokoro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voiceId: params.voiceId, // Kokoro voice style
        speed: params.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Kokoro TTS 오류: ${error}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      audioUrl: data.audioUrl,
      audioDuration: data.duration,
    };
  } catch (error) {
    console.error('Kokoro voice generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * Google Cloud TTS 음성 생성 (API Key 사용)
 */
export async function generateVoiceGoogle(
  apiKey: string,
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  try {
    // 1. Voice Selection (Basic mapping)
    // Google TTS voices: ko-KR-Neural2-A (Female), ko-KR-Neural2-B (Female), ko-KR-Neural2-C (Male)
    const voiceId = params.voiceId || 'ko-KR-Neural2-A'; 

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: params.text },
        voice: { languageCode: 'ko-KR', name: voiceId },
        audioConfig: { 
            audioEncoding: 'MP3',
            speakingRate: params.speed || 1.0,
            pitch: 0.0 // Pitch control could be mapped to emotion ideally
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Google TTS 오류: ${error}` };
    }

    const data = await response.json();
    
    // Google returns base64 audioContent
    const audioContent = data.audioContent;
    if (!audioContent) {
         throw new Error('오디오 데이터가 없습니다.');
    }

    // Convert base64 to Blob URL (Client side) or Data URL
    // Since this runs on client usually, or we return data URL
    const audioUrl = `data:audio/mp3;base64,${audioContent}`;

    // Calculate duration roughly since API doesn't return it
    const duration = estimateAudioDuration(params.text, params.speed);

    return { 
      success: true, 
      audioUrl: audioUrl, // Data URL
      audioDuration: duration,
    };
  } catch (error) {
    console.error('Google voice generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * Google Gemini TTS 음성 생성
 */
export async function generateVoiceGoogleGemini(
  apiKey: string,
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  try {
    const response = await fetch('/api/generate-voice-google-gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        text: params.text,
        voiceId: params.voiceId,
        speed: params.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      // Try to parse JSON error if possible
      try {
        const errorJson = JSON.parse(error);
        return { success: false, error: errorJson.error || `Gemini TTS 오류: ${error}` };
      } catch {
        return { success: false, error: `Gemini TTS 오류: ${error}` };
      }
    }

    const data = await response.json();
    return {
      success: true,
      audioUrl: data.audioUrl,
      audioDuration: data.duration || estimateAudioDuration(params.text, params.speed),
    };
  } catch (error) {
    console.error('Gemini TTS generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 통합 음성 생성 함수 (TTS 엔진 자동 선택)
 */
export async function generateVoice(
  apiKey: string,
  params: VoiceGenerationParams,
  ttsEngine: TTSEngine = 'elevenlabs'
): Promise<VoiceGenerationResponse> {
  const engine = params.ttsEngine || ttsEngine;
  
  if (engine === 'fishaudio') {
    return generateVoiceFishAudio(apiKey, params);
  }
  if (engine === 'kokoro') {
    return generateVoiceKokoro(params);
  }
  if (engine === 'google') {
    return generateVoiceGoogle(apiKey, params);
  }
  if (engine === 'google-gemini') {
    return generateVoiceGoogleGemini(apiKey, params);
  }
  return generateVoiceElevenLabs(apiKey, params);
}

/**
 * ElevenLabs에서 사용 가능한 보이스 목록 가져오기
 */
export async function fetchVoices(apiKey: string): Promise<{ 
  success: boolean; 
  voices?: Array<{ id: string; name: string; description?: string }>;
  error?: string;
}> {
  if (!apiKey) {
    return { success: false, error: 'API 키가 설정되지 않았습니다.' };
  }

  try {
    const response = await fetch('/api/fetch-voices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `API 오류: ${error}` };
    }

    const data = await response.json();
    return { success: true, voices: data.voices };
  } catch (error) {
    console.error('Fetch voices error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '보이스 목록을 가져오는 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 텍스트 길이로 예상 음성 길이 계산 (초)
 * 한국어 평균: 분당 약 350자 (약 5.8자/초)
 */
export function estimateAudioDuration(text: string, speed: number = 1.0): number {
  const charsPerSecond = 5.8 * speed;
  const charCount = text.replace(/\s/g, '').length;
  return Math.ceil(charCount / charsPerSecond);
}

/**
 * 오디오 파일 길이 가져오기
 */
export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      reject(new Error('오디오 파일을 로드할 수 없습니다.'));
    });
  });
}

/**
 * 오디오 URL 유효성 검사
 */
export function isValidAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

