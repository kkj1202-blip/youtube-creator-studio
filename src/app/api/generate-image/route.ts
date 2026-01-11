import { NextRequest, NextResponse } from 'next/server';

/**
 * KIE Z-Image API 엔드포인트
 * 
 * API 구조:
 * - Create Task: POST https://api.kie.ai/api/v1/jobs/createTask
 * - Query Task: GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=xxx
 * - Authorization: Bearer YOUR_API_KEY
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';

// 작업 결과 폴링 최대 대기 시간
const MAX_POLLING_TIME = 120000; // 2분
const POLLING_INTERVAL = 2000; // 2초

interface KieTaskResponse {
  code?: number;
  msg?: string;
  taskId?: string;
  status?: string;
  progress?: number;
  output?: {
    imageUrl?: string;
    images?: string[];
    url?: string;
  };
  result?: {
    imageUrl?: string;
    images?: string[];
    url?: string;
  };
  data?: {
    taskId?: string;
    status?: string;
    progress?: number;
    output?: {
      imageUrl?: string;
      images?: string[];
      url?: string;
    };
    result?: {
      imageUrl?: string;
      images?: string[];
      url?: string;
    };
  };
}

// 이미지 URL 추출 헬퍼
function extractImageUrl(data: KieTaskResponse): string | null {
  return (
    data.output?.imageUrl ||
    data.output?.images?.[0] ||
    data.output?.url ||
    data.result?.imageUrl ||
    data.result?.images?.[0] ||
    data.result?.url ||
    data.data?.output?.imageUrl ||
    data.data?.output?.images?.[0] ||
    data.data?.output?.url ||
    data.data?.result?.imageUrl ||
    data.data?.result?.images?.[0] ||
    data.data?.result?.url ||
    null
  );
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
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('[KIE] Query Task error:', response.status, await response.text());
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        continue;
      }
      
      const data: KieTaskResponse = await response.json();
      console.log('[KIE] Task Status:', JSON.stringify(data, null, 2));
      
      // 성공 응답 확인
      const code = data.code ?? 200;
      if (code === 200 || code === 0) {
        const status = (data.status || data.data?.status || '').toLowerCase();
        
        // 완료 상태
        if (status === 'completed' || status === 'success' || status === 'done' || status === 'finished') {
          const imageUrl = extractImageUrl(data);
          if (imageUrl) {
            console.log('[KIE] Image generated:', imageUrl);
            return imageUrl;
          }
        }
        
        // 실패 상태
        if (status === 'failed' || status === 'error') {
          console.error('[KIE] Task failed:', data.msg || data);
          return null;
        }
        
        // 진행 중 - 계속 폴링
        const progress = data.progress || data.data?.progress || 'unknown';
        console.log(`[KIE] Task progress: ${progress}%`);
      } else {
        console.error('[KIE] Error code:', code, data.msg);
      }
      
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    } catch (error) {
      console.error('[KIE] Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
  
  console.error('[KIE] Task polling timeout');
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, prompt, aspectRatio, style } = body;

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

    // 해상도 계산 (Z-Image는 width/height 사용)
    let width = 1280;
    let height = 720;
    
    if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
    }

    // KIE Z-Image API 요청 페이로드
    const createTaskPayload = {
      model: 'z-image',  // Z-Image 모델 사용
      input: {
        prompt: prompt,
        negative_prompt: 'low quality, blurry, distorted, ugly, bad anatomy, watermark, text, logo',
        width: width,
        height: height,
        num_images: 1,
        aspect_ratio: aspectRatio || '16:9',
        ...(style && { style: style }),
      },
    };

    console.log('[KIE] Create Task request:', JSON.stringify(createTaskPayload, null, 2));

    // 작업 생성 요청
    const createResponse = await fetch(`${KIE_API_BASE}/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTaskPayload),
    });

    const responseText = await createResponse.text();
    console.log('[KIE] Create Task raw response:', responseText);

    let createData: KieTaskResponse;
    try {
      createData = JSON.parse(responseText);
    } catch {
      console.error('[KIE] Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'API 응답 파싱 실패' },
        { status: 500 }
      );
    }

    console.log('[KIE] Create Task response:', JSON.stringify(createData, null, 2));

    // 에러 응답 처리
    const responseCode = createData.code ?? (createResponse.ok ? 200 : createResponse.status);
    if (responseCode !== 200 && responseCode !== 0) {
      const errorMsg = createData.msg || '알 수 없는 오류';
      console.error('[KIE] Create Task error:', errorMsg);
      
      // 에러 코드별 메시지
      const errorMessages: Record<number, string> = {
        401: '인증 실패: API 키가 유효하지 않습니다.',
        402: '크레딧 부족: 계정에 크레딧이 부족합니다.',
        404: '엔드포인트를 찾을 수 없습니다.',
        422: '요청 파라미터가 올바르지 않습니다.',
        429: '요청 한도 초과: 잠시 후 다시 시도하세요.',
        455: '컨텐츠 정책 위반',
        500: '서버 오류가 발생했습니다.',
        501: '지원하지 않는 기능입니다.',
        505: '모델이 일시적으로 사용 불가능합니다.',
      };
      
      return NextResponse.json(
        { error: errorMessages[responseCode] || errorMsg },
        { status: responseCode }
      );
    }

    // taskId 추출 (다양한 응답 구조 지원)
    const taskId = createData.taskId || createData.data?.taskId;
    
    if (!taskId) {
      // 즉시 이미지가 반환된 경우
      const directImageUrl = extractImageUrl(createData);
      
      if (directImageUrl) {
        console.log('[KIE] Direct image URL:', directImageUrl);
        return NextResponse.json({ imageUrl: directImageUrl, success: true });
      }
      
      console.error('[KIE] No taskId in response:', createData);
      return NextResponse.json(
        { error: 'taskId를 받지 못했습니다. API 응답: ' + JSON.stringify(createData) },
        { status: 500 }
      );
    }

    console.log('[KIE] Task created:', taskId);

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
    console.error('[KIE] Image generation error:', error);
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
    
    const response = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
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
    console.error('[KIE] Task query error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
