import { NextRequest, NextResponse } from 'next/server';

/**
 * 씬 렌더링 API 엔드포인트
 * 
 * 참고: 실제 렌더링은 클라이언트 사이드(브라우저)에서 FFmpeg WASM을 사용합니다.
 * 이 API는 하위 호환성을 위해 유지됩니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId } = body;

    // 클라이언트 사이드 렌더링 안내
    return NextResponse.json({ 
      message: '렌더링은 브라우저에서 직접 수행됩니다.',
      sceneId,
      clientSideRender: true,
      instructions: '클라이언트에서 FFmpeg WASM을 사용하여 렌더링하세요.',
    });

  } catch (error) {
    console.error('Render API error:', error);
    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
