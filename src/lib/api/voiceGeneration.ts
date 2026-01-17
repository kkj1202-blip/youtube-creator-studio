/**
 * 음성 생성 API 서비스
 * ElevenLabs TTS API 연동
 */

// ... imports

export interface VoiceGenerationParams {
  text: string;
  voiceId: string;
  speed?: number; // 0.8 ~ 1.3
  emotion?: 'normal' | 'emphasis' | 'whisper' | 'excited';
  // 고급 설정 추가
  stability?: number;
  similarity?: number;
  style?: number;
  useSpeakerBoost?: boolean;
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

export async function generateVoice(
  apiKey: string,
  params: VoiceGenerationParams
): Promise<VoiceGenerationResponse> {
  // ... checks

  try {
    const emotion = params.emotion || 'normal';
    const settings = emotionSettings[emotion];

    // 고급 설정이 있으면 우선 사용, 없으면 감정 프리셋 사용
    const stability = params.stability ?? settings.stability;
    const similarityBoost = params.similarity ?? settings.similarityBoost;
    const style = params.style ?? settings.style;
    // useSpeakerBoost는 기본값 true
    const useSpeakerBoost = params.useSpeakerBoost ?? true;

    // ElevenLabs API 호출
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
// ... rest of file

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `API 오류: ${error}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      audioUrl: data.audioUrl,
      audioDuration: data.duration,
    };
  } catch (error) {
    console.error('Voice generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '음성 생성 중 오류가 발생했습니다.' 
    };
  }
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
    audio.addEventListener('error', (e) => {
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
