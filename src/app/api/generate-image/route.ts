import { NextRequest, NextResponse } from 'next/server';

/**
 * KIE Z-Image API 엔드포인트
 * 
 * API 구조 (공식 문서 기준):
 * - Create Task: POST https://api.kie.ai/api/v1/jobs/createTask
 * - Query Task: GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=xxx
 * - Authorization: Bearer YOUR_API_KEY
 * 
 * 응답 구조:
 * - state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail'
 * - resultJson: JSON 문자열 {"resultUrls": ["url1", "url2"]}
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1/jobs';

// 작업 결과 폴링 최대 대기 시간
const MAX_POLLING_TIME = 180000; // 3분
const POLLING_INTERVAL = 3000; // 3초

interface KieCreateResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
  };
  taskId?: string;
}

interface KieQueryResponse {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    model?: string;
    state?: string;
    param?: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    completeTime?: number;
    createTime?: number;
    updateTime?: number;
  };
}

// resultJson에서 이미지 URL 추출
function extractImageUrlFromResult(resultJson: string | undefined): string | null {
  if (!resultJson) return null;
  
  try {
    const parsed = JSON.parse(resultJson);
    console.log('[KIE] Parsed resultJson:', parsed);
    
    // resultUrls 배열에서 첫 번째 URL
    if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
      return parsed.resultUrls[0];
    }
    
    // 다른 가능한 형식들
    if (parsed.imageUrl) return parsed.imageUrl;
    if (parsed.url) return parsed.url;
    if (parsed.images && Array.isArray(parsed.images) && parsed.images.length > 0) {
      return parsed.images[0];
    }
    
    return null;
  } catch (error) {
    console.error('[KIE] Failed to parse resultJson:', error, resultJson);
    return null;
  }
}

// 작업 상태 조회
async function pollTaskResult(taskId: string, apiKey: string): Promise<string | null> {
  const startTime = Date.now();
  let lastState = '';
  
  while (Date.now() - startTime < MAX_POLLING_TIME) {
    try {
      const url = `${KIE_API_BASE}/recordInfo?taskId=${taskId}`;
      console.log('[KIE] Polling:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KIE] Query Task error:', response.status, errorText);
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        continue;
      }
      
      const data: KieQueryResponse = await response.json();
      
      // 상태가 변경될 때만 로그
      const currentState = data.data?.state || 'unknown';
      if (currentState !== lastState) {
        console.log('[KIE] Task state changed:', lastState, '->', currentState);
        console.log('[KIE] Full response:', JSON.stringify(data, null, 2));
        lastState = currentState;
      }
      
      // 성공 응답 확인 (code: 200)
      if (data.code === 200 && data.data) {
        const state = data.data.state?.toLowerCase();
        
        // 완료 상태
        if (state === 'success') {
          const imageUrl = extractImageUrlFromResult(data.data.resultJson);
          if (imageUrl) {
            console.log('[KIE] ✅ Image generated successfully:', imageUrl);
            return imageUrl;
          } else {
            console.error('[KIE] Success but no image URL found in resultJson:', data.data.resultJson);
          }
        }
        
        // 실패 상태
        if (state === 'fail') {
          console.error('[KIE] ❌ Task failed:', data.data.failCode, data.data.failMsg);
          return null;
        }
        
        // 진행 중 상태들
        if (state === 'waiting' || state === 'queuing' || state === 'generating') {
          // 계속 폴링
        }
      } else {
        console.error('[KIE] Unexpected response code:', data.code, data.msg);
      }
      
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    } catch (error) {
      console.error('[KIE] Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
  
  console.error('[KIE] Task polling timeout after', MAX_POLLING_TIME / 1000, 'seconds');
  return null;
}

export async function POST(request: NextRequest) {
  console.log('[KIE API] ========================================');
  console.log('[KIE API] POST 요청 수신 시각:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { apiKey, prompt, aspectRatio, style } = body;
    
    console.log('[KIE API] 요청 파라미터:');
    console.log('[KIE API]   - API Key:', apiKey ? `${apiKey.slice(0, 8)}... (길이: ${apiKey.length})` : 'MISSING');
    console.log('[KIE API]   - Prompt 길이:', prompt?.length || 0);
    console.log('[KIE API]   - Aspect Ratio:', aspectRatio);
    console.log('[KIE API]   - Style:', style);

    if (!apiKey) {
      console.error('[KIE API] 오류: API 키 누락');
      return NextResponse.json(
        { error: 'API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      console.error('[KIE API] 오류: 프롬프트 누락');
      return NextResponse.json(
        { error: '프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 해상도 계산 (Z-Image)
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
      model: 'z-image',
      input: {
        prompt: prompt,
        negative_prompt: 'low quality, blurry, distorted, ugly, bad anatomy, watermark, text, logo',
        width: width,
        height: height,
        num_images: 1,
        ...(style && { style: style }),
      },
    };

    console.log('[KIE API] ========== Create Task ==========');
    console.log('[KIE API] 대상 URL:', `${KIE_API_BASE}/createTask`);
    console.log('[KIE API] Payload:', JSON.stringify(createTaskPayload, null, 2));
    console.log('[KIE API] Authorization:', `Bearer ${apiKey.slice(0, 8)}...`);

    // 작업 생성 요청
    let createResponse;
    try {
      console.log('[KIE API] fetch 시작...');
      createResponse = await fetch(`${KIE_API_BASE}/createTask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createTaskPayload),
      });
      console.log('[KIE API] fetch 완료. Status:', createResponse.status);
    } catch (fetchError) {
      console.error('[KIE API] fetch 실패:', fetchError);
      return NextResponse.json(
        { error: 'KIE 서버 연결 실패: ' + (fetchError instanceof Error ? fetchError.message : String(fetchError)) },
        { status: 503 }
      );
    }

    const responseText = await createResponse.text();
    console.log('[KIE API] Response Status:', createResponse.status);
    console.log('[KIE API] Response Headers:', Object.fromEntries(createResponse.headers.entries()));
    console.log('[KIE API] Raw response:', responseText.slice(0, 500));

    let createData: KieCreateResponse;
    try {
      createData = JSON.parse(responseText);
    } catch {
      console.error('[KIE] Failed to parse response');
      return NextResponse.json(
        { error: 'API 응답 파싱 실패: ' + responseText.slice(0, 200) },
        { status: 500 }
      );
    }

    console.log('[KIE] Parsed response:', JSON.stringify(createData, null, 2));

    // 에러 응답 처리
    if (createData.code !== 200 && createData.code !== 0 && createData.code !== undefined) {
      const errorMsg = createData.msg || '알 수 없는 오류';
      console.error('[KIE] Create Task error:', createData.code, errorMsg);
      
      const errorMessages: Record<number, string> = {
        401: '인증 실패: API 키가 유효하지 않습니다.',
        402: '크레딧 부족: 계정에 크레딧이 부족합니다.',
        404: '엔드포인트를 찾을 수 없습니다.',
        422: '요청 파라미터가 올바르지 않습니다.',
        429: '요청 한도 초과: 잠시 후 다시 시도하세요.',
        455: '컨텐츠 정책 위반',
        500: '서버 오류가 발생했습니다.',
        501: '생성 실패',
        505: '모델이 일시적으로 사용 불가능합니다.',
      };
      
      return NextResponse.json(
        { error: errorMessages[createData.code] || errorMsg },
        { status: createData.code || 500 }
      );
    }

    // taskId 추출
    const taskId = createData.data?.taskId || createData.taskId;
    
    if (!taskId) {
      console.error('[KIE] No taskId in response');
      return NextResponse.json(
        { error: 'taskId를 받지 못했습니다. 응답: ' + JSON.stringify(createData).slice(0, 500) },
        { status: 500 }
      );
    }

    console.log('[KIE] Task created with ID:', taskId);
    console.log('[KIE] ========== Start Polling ==========');

    // 작업 결과 폴링
    const imageUrl = await pollTaskResult(taskId, apiKey);
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 생성 시간이 초과되었거나 실패했습니다. taskId: ' + taskId },
        { status: 504 }
      );
    }

    console.log('[KIE] ========== Success ==========');
    console.log('[KIE] Final image URL:', imageUrl);

    return NextResponse.json({ 
      imageUrl, 
      taskId,
      success: true,
    });
  } catch (error) {
    console.error('[KIE API] ========== 에러 발생 ==========');
    console.error('[KIE API] Error Type:', error?.constructor?.name);
    console.error('[KIE API] Error Message:', error instanceof Error ? error.message : String(error));
    console.error('[KIE API] Error Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: '서버 오류: ' + (error instanceof Error ? error.message : String(error)) },
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
