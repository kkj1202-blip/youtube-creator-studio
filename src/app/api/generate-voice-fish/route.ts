import { NextRequest, NextResponse } from 'next/server';

/**
 * FishAudio TTS API 엔드포인트
 * https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, referenceId, text, speed = 1.0 } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'FishAudio API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!referenceId) {
      return NextResponse.json(
        { error: '보이스 Reference ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // FishAudio TTS API 호출
    // 고품질 설정: MP3, 192kbps, 44.1kHz
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': 's1', // FishAudio 최신 모델
      },
      body: JSON.stringify({
        text: text,
        reference_id: referenceId, // 보이스 모델 ID
        temperature: 0.7,
        top_p: 0.7,
        prosody: {
          speed: speed, // 0.5 ~ 2.0
          volume: 0, // 기본 볼륨
        },
        chunk_length: 300,
        normalize: true,
        format: 'mp3',
        sample_rate: 44100,
        mp3_bitrate: 192, // 고품질
        latency: 'normal',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FishAudio API error:', errorText);
      
      // 데모 모드
      if (process.env.NODE_ENV === 'development' || apiKey === 'demo') {
        return NextResponse.json({ 
          audioUrl: '/demo-audio.mp3',
          duration: Math.ceil(text.length / 5.8),
          demo: true,
          message: 'API 키가 유효하지 않아 데모 오디오가 반환되었습니다.'
        });
      }
      
      return NextResponse.json(
        { error: `음성 생성 실패: ${errorText}` },
        { status: response.status }
      );
    }

    // 오디오 데이터를 Base64로 변환
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // 오디오 길이 계산 (192kbps 기준 + 0.5초 안전 마진)
    const estimatedDuration = (audioBuffer.byteLength * 8) / (192 * 1000) + 0.5;

    return NextResponse.json({ 
      audioUrl,
      duration: Math.round(estimatedDuration * 10) / 10,
    });
  } catch (error) {
    console.error('FishAudio voice generation error:', error);
    
    // 데모 모드
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        audioUrl: '/demo-audio.mp3',
        duration: 5,
        demo: true,
      });
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
