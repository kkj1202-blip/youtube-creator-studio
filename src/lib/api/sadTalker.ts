/**
 * SadTalker API 서비스
 * 
 * 이미지 + 오디오 → 립싱크 영상 생성
 * 
 * 사용 방법:
 * 1. 로컬 SadTalker 서버 실행 (Python)
 * 2. 또는 Replicate/Hugging Face API 사용
 */

export interface SadTalkerConfig {
  mode: 'local' | 'replicate' | 'huggingface';
  localUrl?: string;  // 로컬 서버 URL (예: http://localhost:7860)
  replicateApiKey?: string;
  huggingfaceApiKey?: string;
}

export interface SadTalkerRequest {
  imageUrl: string;   // 캐릭터 이미지 URL
  audioUrl: string;   // 오디오 URL (TTS 결과)
  preprocess: 'crop' | 'resize' | 'full';  // 이미지 전처리 방식
  stillMode: boolean; // true면 신체 움직임 없이 얼굴만
  enhancer: boolean;  // GFPGAN 얼굴 향상
}

export interface SadTalkerResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

// 로컬 SadTalker 서버 호출
async function callLocalSadTalker(
  config: SadTalkerConfig,
  request: SadTalkerRequest
): Promise<SadTalkerResponse> {
  const url = config.localUrl || 'http://localhost:7860';
  
  try {
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_image: request.imageUrl,
        driven_audio: request.audioUrl,
        preprocess: request.preprocess,
        still: request.stillMode,
        enhancer: request.enhancer ? 'gfpgan' : null,
      }),
    });

    if (!response.ok) {
      throw new Error(`SadTalker 서버 오류: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      videoUrl: data.video_url || data.result,
    };
  } catch (error) {
    console.error('[SadTalker] Local error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SadTalker 로컬 서버 연결 실패',
    };
  }
}

// Replicate API 호출 (클라우드)
async function callReplicateSadTalker(
  config: SadTalkerConfig,
  request: SadTalkerRequest
): Promise<SadTalkerResponse> {
  if (!config.replicateApiKey) {
    return { success: false, error: 'Replicate API 키가 없습니다.' };
  }

  try {
    // Replicate SadTalker 모델 호출
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'cdb0aec87b979a86b8b7f6a217ca0e38b7a7e18c2f77d3b7e5f4e1b77c1b80e2', // SadTalker 모델 버전
        input: {
          source_image: request.imageUrl,
          driven_audio: request.audioUrl,
          preprocess: request.preprocess,
          still: request.stillMode,
          enhancer: request.enhancer ? 'gfpgan' : null,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Replicate API 오류: ${response.status}`);
    }

    const data = await response.json();
    
    // Replicate는 비동기 처리 - 결과 폴링 필요
    const predictionId = data.id;
    const result = await pollReplicateResult(config.replicateApiKey, predictionId);
    
    return result;
  } catch (error) {
    console.error('[SadTalker] Replicate error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Replicate API 호출 실패',
    };
  }
}

// Replicate 결과 폴링
async function pollReplicateResult(
  apiKey: string,
  predictionId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<SadTalkerResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${apiKey}` },
    });
    
    const data = await response.json();
    
    if (data.status === 'succeeded') {
      return {
        success: true,
        videoUrl: data.output,
      };
    }
    
    if (data.status === 'failed') {
      return {
        success: false,
        error: data.error || '생성 실패',
      };
    }
    
    // 아직 처리 중 - 대기
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return {
    success: false,
    error: '시간 초과 (2분)',
  };
}

/**
 * SadTalker 메인 함수
 * 설정에 따라 로컬 또는 클라우드 서비스 호출
 */
export async function generateTalkingHead(
  config: SadTalkerConfig,
  request: SadTalkerRequest
): Promise<SadTalkerResponse> {
  console.log('[SadTalker] 시작:', config.mode);
  console.log('[SadTalker] 이미지:', request.imageUrl);
  console.log('[SadTalker] 오디오:', request.audioUrl);

  switch (config.mode) {
    case 'local':
      return callLocalSadTalker(config, request);
    case 'replicate':
      return callReplicateSadTalker(config, request);
    case 'huggingface':
      // TODO: Hugging Face Spaces API 구현
      return { success: false, error: 'Hugging Face 모드는 아직 미구현' };
    default:
      return { success: false, error: '알 수 없는 모드' };
  }
}

/**
 * SadTalker 서버 상태 확인
 */
export async function checkSadTalkerStatus(config: SadTalkerConfig): Promise<boolean> {
  if (config.mode !== 'local') return true;
  
  try {
    const url = config.localUrl || 'http://localhost:7860';
    const response = await fetch(`${url}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
