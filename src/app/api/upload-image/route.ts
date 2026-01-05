import { NextRequest, NextResponse } from 'next/server';

/**
 * 이미지 업로드 API 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sceneNumber = formData.get('sceneNumber') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 가능)' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '이미지 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 파일을 Base64로 변환 (클라이언트에서 바로 사용 가능)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const imageUrl = `data:${mimeType};base64,${base64}`;

    // 파일명에서 씬 번호 추출 (자동 매칭용)
    let extractedSceneNumber: number | null = null;
    const filename = file.name;
    
    // 숫자만 있는 파일명: 1.png, 2.jpg
    const simpleMatch = filename.match(/^(\d+)\./);
    if (simpleMatch) {
      extractedSceneNumber = parseInt(simpleMatch[1], 10);
    } else {
      // scene_1.png, 씬1.jpg 등
      const prefixMatch = filename.match(/[_\-]?(\d+)\./);
      if (prefixMatch) {
        extractedSceneNumber = parseInt(prefixMatch[1], 10);
      }
    }

    // 요청에서 씬 번호가 제공되면 그것 사용
    const finalSceneNumber = sceneNumber 
      ? parseInt(sceneNumber, 10) 
      : extractedSceneNumber;

    return NextResponse.json({ 
      imageUrl,
      filename: file.name,
      size: file.size,
      mimeType,
      sceneNumber: finalSceneNumber,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Next.js 13+ App Router에서는 config export가 필요하지 않음
// FormData는 자동으로 처리됨
