import { NextRequest, NextResponse } from 'next/server';

/**
 * ElevenLabs 보이스 목록 가져오기 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    // ElevenLabs API에서 보이스 목록 가져오기
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
      // 데모 모드: API 실패 시 샘플 보이스 반환
      if (process.env.NODE_ENV === 'development' || apiKey === 'demo') {
        return NextResponse.json({ 
          voices: [
            { id: 'demo-voice-1', name: '서연 (여성, 차분한)', description: '데모 보이스' },
            { id: 'demo-voice-2', name: '민준 (남성, 전문적)', description: '데모 보이스' },
            { id: 'demo-voice-3', name: '지우 (여성, 활발한)', description: '데모 보이스' },
            { id: 'demo-voice-4', name: '현우 (남성, 따뜻한)', description: '데모 보이스' },
          ],
          demo: true,
          message: 'API 키가 유효하지 않아 데모 보이스가 반환되었습니다.'
        });
      }
      
      return NextResponse.json(
        { error: `보이스 목록 가져오기 실패: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 보이스 목록 정제
    const voices = data.voices?.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      description: voice.description || voice.labels?.description || '',
      previewUrl: voice.preview_url,
      category: voice.category,
    })) || [];

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Fetch voices error:', error);
    
    // 데모 모드
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        voices: [
          { id: 'demo-voice-1', name: '서연 (여성, 차분한)' },
          { id: 'demo-voice-2', name: '민준 (남성, 전문적)' },
          { id: 'demo-voice-3', name: '지우 (여성, 활발한)' },
          { id: 'demo-voice-4', name: '현우 (남성, 따뜻한)' },
        ],
        demo: true,
      });
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
