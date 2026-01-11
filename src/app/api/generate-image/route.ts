import { NextRequest, NextResponse } from 'next/server';

/**
 * KIE 이미지 생성 API 엔드포인트
 * 공식 문서: https://docs.kie.ai/flux-kontext-api/generate-or-edit-image
 * 
 * API 구조:
 * - Create Task: POST https://api.kie.ai/api/v1/flux-kontext/generate-or-edit-image
 * - Query Task: GET https://api.kie.ai/api/v1/flux-kontext/get-image-details?taskId=xxx
 * - Authorization: Bearer YOUR_API_KEY
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1/flux-kontext';

// 작업 결과 폴링 최대 대기 시간
const MAX_POLLING_TIME = 120000; // 2분
const POLLING_INTERVAL = 2000; // 2초

interface KieTaskResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    status?: string;
    progress?: number;
    output?: {
      imageUrl?: string;
      images?: string[];
    };
    result?: {
      imageUrl?: string;
      images?: string[];
    };
  };
}

// 작업 상태 조회
async function pollTaskResult(taskId: string, apiKey: string): Promise<string | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_POLLING_TIME) {
    try {
      const response = await fetch(`${KIE_API_BASE}/get-image-details?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('KIE Query Task error:', response.status, await response.text());
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        continue;
      }
      
      const data: KieTaskResponse = await response.json();
      console.log('KIE Task Status:', JSON.stringify(data, null, 2));
      
      // 성공 응답 확인 (code: 200)
      if (data.code === 200) {
        const status = data.data?.status?.toLowerCase();
        
        // 완료 상태
        if (status === 'completed' || status === 'success' || status === 'done') {
          const imageUrl = 
            data.data?.output?.imageUrl ||
            data.data?.output?.images?.[0] ||
            data.data?.result?.imageUrl ||
            data.data?.result?.images?.[0];
          
          if (imageUrl) {
            return imageUrl;
          }
        }
        
        // 실패 상태
        if (status === 'failed' || status === 'error') {
          console.error('KIE Task failed:', data.msg || data.data);
          return null;
        }
        
        // 진행 중 - 계속 폴링
        console.log(`KIE Task progress: ${data.data?.progress || 'unknown'}%`);
      }
      
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
    const { apiKey, prompt, aspectRatio, negativePrompt, model, inputImage } = body;

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

    // KIE API 요청 페이로드 (공식 문서 기준)
    const createTaskPayload: Record<string, unknown> = {
      prompt: prompt,
      aspectRatio: aspectRatio || '16:9',
      model: model || 'flux-kontext-pro',
      outputFormat: 'jpeg',
      enableTranslation: true, // 비영어 프롬프트 자동 번역
      safetyTolerance: 2,
    };

    // 이미지 편집 모드 (inputImage가 있는 경우)
    if (inputImage) {
      createTaskPayload.inputImage = inputImage;
    }

    console.log('KIE Create Task request:', JSON.stringify(createTaskPayload, null, 2));

    // 작업 생성 요청
    const createResponse = await fetch(`${KIE_API_BASE}/generate-or-edit-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTaskPayload),
    });

    const createData: KieTaskResponse = await createResponse.json();
    console.log('KIE Create Task response:', JSON.stringify(createData, null, 2));

    // 에러 응답 처리
    if (createData.code !== 200) {
      const errorMsg = createData.msg || '알 수 없는 오류';
      console.error('KIE Create Task error:', errorMsg);
      
      // 에러 코드별 메시지
      const errorMessages: Record<number, string> = {
        401: '인증 실패: API 키가 유효하지 않습니다.',
        402: '크레딧 부족: 계정에 크레딧이 부족합니다.',
        404: '엔드포인트를 찾을 수 없습니다.',
        422: '요청 파라미터가 올바르지 않습니다.',
        429: '요청 한도 초과: 잠시 후 다시 시도하세요.',
        500: '서버 오류가 발생했습니다.',
      };
      
      return NextResponse.json(
        { error: errorMessages[createData.code || 500] || errorMsg },
        { status: createData.code || 500 }
      );
    }

    // taskId 추출
    const taskId = createData.data?.taskId;
    
    if (!taskId) {
      // 즉시 이미지가 반환된 경우
      const directImageUrl = 
        createData.data?.output?.imageUrl ||
        createData.data?.output?.images?.[0] ||
        createData.data?.result?.imageUrl;
      
      if (directImageUrl) {
        return NextResponse.json({ imageUrl: directImageUrl });
      }
      
      console.error('No taskId in response:', createData);
      return NextResponse.json(
        { error: 'taskId를 받지 못했습니다.' },
        { status: 500 }
      );
    }

    console.log('KIE Task created:', taskId);

    // 작업 결과 폴링
    const imageUrl = await pollTaskResult(taskId, apiKey);
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 생성 시간이 초과되었거나 실패했습니다.' },
        { status: 504 }
      );
    }

    return NextResponse.json({ 
      imageUrl, 
      taskId,
      success: true,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)) },
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
    
    const response = await fetch(`${KIE_API_BASE}/get-image-details?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
