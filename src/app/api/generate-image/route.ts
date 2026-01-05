import { NextRequest, NextResponse } from 'next/server';

/**
 * KIE 이미지 생성 API 엔드포인트
 * KIE API를 통한 이미지 생성 프록시
 * 
 * API 구조:
 * - Create Task: POST https://api.kie.ai/api/v1/jobs/createTask
 * - Query Task: GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=xxx
 * - Authorization: Bearer YOUR_API_KEY
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';

// 작업 생성 후 결과를 폴링하는 최대 대기 시간 (ms)
const MAX_POLLING_TIME = 120000; // 2분
const POLLING_INTERVAL = 2000; // 2초

interface KieTaskResponse {
  code?: number;
  data?: {
    taskId?: string;
    status?: string;
    output?: {
      imageUrl?: string;
      images?: string[];
      url?: string;
    };
    result?: {
      imageUrl?: string;
      images?: string[];
    };
  };
  message?: string;
  taskId?: string;
  status?: string;
}

// 작업 상태 조회
async function pollTaskResult(taskId: string, apiKey: string): Promise<string | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_POLLING_TIME) {
    try {
      const response = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (!response.ok) {
        console.error('KIE Query Task error:', await response.text());
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        continue;
      }
      
      const data: KieTaskResponse = await response.json();
      console.log('KIE Task Status:', JSON.stringify(data, null, 2));
      
      const status = data.data?.status || data.status;
      
      // 완료 상태 확인
      if (status === 'completed' || status === 'success' || status === 'COMPLETED' || status === 'SUCCESS') {
        // 다양한 응답 형식 처리
        const imageUrl = 
          data.data?.output?.imageUrl ||
          data.data?.output?.images?.[0] ||
          data.data?.output?.url ||
          data.data?.result?.imageUrl ||
          data.data?.result?.images?.[0];
        
        if (imageUrl) {
          return imageUrl;
        }
      }
      
      // 실패 상태 확인
      if (status === 'failed' || status === 'error' || status === 'FAILED' || status === 'ERROR') {
        console.error('KIE Task failed:', data.message || data.data);
        return null;
      }
      
      // 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
  
  console.error('KIE Task polling timeout');
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, prompt, style, aspectRatio, negativePrompt, model } = body;

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

    // KIE API 작업 생성 요청
    const createTaskPayload = {
      model: model || 'flux-schnell', // 기본 모델
      callBackUrl: '', // 콜백 URL (옵션)
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt || 'low quality, blurry, distorted, ugly, bad anatomy',
        width: dimensions.width,
        height: dimensions.height,
        num_images: 1,
        aspect_ratio: aspectRatio || '16:9',
        style: style,
      },
    };

    console.log('KIE Create Task request:', JSON.stringify(createTaskPayload, null, 2));

    // 작업 생성 요청
    const createResponse = await fetch(`${KIE_API_BASE}/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTaskPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('KIE Create Task error:', errorText);
      
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
        { error: `작업 생성 실패: ${errorText}` },
        { status: createResponse.status }
      );
    }

    const createData: KieTaskResponse = await createResponse.json();
    console.log('KIE Create Task response:', JSON.stringify(createData, null, 2));

    // taskId 추출 (다양한 응답 형식 처리)
    const taskId = createData.data?.taskId || createData.taskId;
    
    if (!taskId) {
      console.error('No taskId in response:', createData);
      
      // 직접 이미지 URL이 반환된 경우
      const directImageUrl = 
        createData.data?.output?.imageUrl ||
        createData.data?.output?.images?.[0] ||
        createData.data?.result?.imageUrl;
      
      if (directImageUrl) {
        return NextResponse.json({ imageUrl: directImageUrl });
      }
      
      // 데모 모드
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ 
          imageUrl: `https://via.placeholder.com/${dimensions.width}x${dimensions.height}/1a1a2e/8b5cf6?text=Demo+Image`,
          demo: true,
        });
      }
      
      return NextResponse.json(
        { error: 'taskId를 받지 못했습니다.' },
        { status: 500 }
      );
    }

    // 작업 결과 폴링
    const imageUrl = await pollTaskResult(taskId, apiKey);
    
    if (!imageUrl) {
      // 데모 모드
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ 
          imageUrl: `https://via.placeholder.com/${dimensions.width}x${dimensions.height}/1a1a2e/8b5cf6?text=Timeout`,
          demo: true,
          message: '이미지 생성 시간이 초과되어 데모 이미지가 반환되었습니다.'
        });
      }
      
      return NextResponse.json(
        { error: '이미지 생성 시간이 초과되었습니다.' },
        { status: 504 }
      );
    }

    return NextResponse.json({ imageUrl, taskId });
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

// GET 메서드: 작업 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!taskId || !apiKey) {
      return NextResponse.json(
        { error: 'taskId와 API 키가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: '작업 상태 조회 실패' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Task query error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
