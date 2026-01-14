import { NextRequest, NextResponse } from 'next/server';

/**
 * 음성 생성 API 엔드포인트
 * ElevenLabs TTS API 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, voiceId, text, speed, stability, similarityBoost, style } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { error: '보이스 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // ElevenLabs TTS API 호출 (고품질 설정)
    // output_format: mp3_44100_192 (44.1kHz, 192kbps - 고품질)
    const outputFormat = 'mp3_44100_192';
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // 한국어 지원 모델
          voice_settings: {
            stability: stability ?? 0.65, // 높은 안정성 (뭉개짐 방지)
            similarity_boost: similarityBoost ?? 0.75,
            style: style ?? 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
      // 데모 모드
      if (process.env.NODE_ENV === 'development' || apiKey === 'demo') {
        // 데모용 무음 오디오 반환 (실제로는 TTS 사운드 URL 필요)
        return NextResponse.json({ 
          audioUrl: '/demo-audio.mp3',
          duration: Math.ceil(text.length / 5.8), // 예상 길이
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

    // 오디오 길이 계산 (192kbps 기준)
    const estimatedDuration = (audioBuffer.byteLength * 8) / (192 * 1000);

    return NextResponse.json({ 
      audioUrl,
      duration: Math.round(estimatedDuration * 10) / 10,
    });
  } catch (error) {
    console.error('Voice generation error:', error);
    
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
