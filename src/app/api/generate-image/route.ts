import { NextRequest, NextResponse } from 'next/server';

/**
 * 이미지 생성 API 엔드포인트
 * Genspark 이미지 생성 API 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, prompt, style, aspectRatio, negativePrompt } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 화면 비율에 따른 해상도 설정
    const dimensions = aspectRatio === '9:16' 
      ? { width: 720, height: 1280 }
      : { width: 1280, height: 720 };

    // Genspark 이미지 생성 API 호출
    // 실제 Genspark API 엔드포인트와 형식에 맞게 수정 필요
    const response = await fetch('https://api.genspark.ai/v1/images/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt || 'low quality, blurry, distorted',
        width: dimensions.width,
        height: dimensions.height,
        num_images: 1,
        style: style,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Genspark API error:', errorText);
      
      // 데모 모드: API 실패 시 placeholder 이미지 반환
      if (process.env.NODE_ENV === 'development' || !apiKey.startsWith('sk-')) {
        const placeholderUrl = `https://via.placeholder.com/${dimensions.width}x${dimensions.height}/1a1a2e/8b5cf6?text=${encodeURIComponent(prompt.slice(0, 30))}`;
        return NextResponse.json({ 
          imageUrl: placeholderUrl,
          demo: true,
          message: 'API 키가 유효하지 않아 데모 이미지가 반환되었습니다.'
        });
      }
      
      return NextResponse.json(
        { error: `이미지 생성 실패: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 응답 형식에 맞게 수정 필요
    const imageUrl = data.images?.[0]?.url || data.image_url || data.url;
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL을 받지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    
    // 데모 모드: 에러 시에도 placeholder 반환
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        imageUrl: 'https://via.placeholder.com/1280x720/1a1a2e/8b5cf6?text=Demo+Image',
        demo: true,
      });
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
