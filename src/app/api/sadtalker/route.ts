import { NextResponse } from 'next/server';
import { generateTalkingHead, SadTalkerConfig, SadTalkerRequest } from '@/lib/api/sadTalker';

export const maxDuration = 120; // 최대 2분 (긴 영상 처리용)

interface RequestBody {
  imageUrl: string;
  audioUrl: string;
  mode?: 'local' | 'replicate';
  localUrl?: string;
  replicateApiKey?: string;
  preprocess?: 'crop' | 'resize' | 'full';
  stillMode?: boolean;
  enhancer?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    
    if (!body.imageUrl || !body.audioUrl) {
      return NextResponse.json(
        { success: false, error: '이미지 URL과 오디오 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 설정 구성
    const config: SadTalkerConfig = {
      mode: body.mode || 'local',
      localUrl: body.localUrl || 'http://localhost:7860',
      replicateApiKey: body.replicateApiKey,
    };

    // 요청 구성
    const sadTalkerRequest: SadTalkerRequest = {
      imageUrl: body.imageUrl,
      audioUrl: body.audioUrl,
      preprocess: body.preprocess || 'crop',
      stillMode: body.stillMode ?? true,  // 기본값: 신체 고정
      enhancer: body.enhancer ?? true,    // 기본값: 얼굴 향상
    };

    console.log('[API/sadtalker] 요청:', {
      mode: config.mode,
      preprocess: sadTalkerRequest.preprocess,
      stillMode: sadTalkerRequest.stillMode,
    });

    const result = await generateTalkingHead(config, sadTalkerRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
    });

  } catch (error) {
    console.error('[API/sadtalker] 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'SadTalker 처리 중 오류 발생' 
      },
      { status: 500 }
    );
  }
}

// SadTalker 서버 상태 확인
export async function GET() {
  try {
    const localUrl = 'http://localhost:7860';
    const response = await fetch(`${localUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });
    
    return NextResponse.json({
      available: response.ok,
      mode: 'local',
      url: localUrl,
    });
  } catch {
    return NextResponse.json({
      available: false,
      mode: 'local',
      url: 'http://localhost:7860',
      message: 'SadTalker 로컬 서버가 실행되지 않았습니다. python webui.py로 시작하세요.',
    });
  }
}
