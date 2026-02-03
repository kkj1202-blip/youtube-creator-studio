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
  console.log('[Generate Image API] Request received');
  
  try {
    const body = await request.json();
    // Support both old structure (flat) and new structure
    const { 
      apiKey, // for KIE
      prompt, 
      aspectRatio, 
      style,
      imageSource, // 'kie' | 'whisk' | ...
      whiskMode,   // 'api' | 'dom'
      whiskCookie,  // JSON string
      referenceImages // { subject, style, composition }
    } = body;
    
    // Default to KIE if not specified (legacy support)
    const source = imageSource || 'kie';

    console.log(`[Generate Image API] Source: ${source}, Mode: ${whiskMode || 'N/A'}`);

    // =================================================================================
    // 🎨 WHISK GENERATION LOGIC
    // =================================================================================
    if (source === 'whisk') {
      console.log('[Whisk API] Forwarding request to Python Backend Queue...');
      
      try {
          const backendUrl = 'http://localhost:8000/api/generate-image-queued';
          
          // Helper to resolving local paths
          const getLocalPath = (url?: string) => {
              if (!url) return null;
              if (url.includes(':') || url.startsWith('/')) {
                 if (url.startsWith('/uploads/')) {
                     return path.join(process.cwd(), 'public', url.replace(/^\//, ''));
                 }
                 if (fs.existsSync(url)) return url;
              }
              return null;
          };

          const payload = {
              prompt: prompt,
              output_dir: path.join(process.cwd(), 'public', 'uploads'),
              cookies_path: path.join(process.cwd(), 'cookies.json'), // Assuming standard cookie path
              subject_path: getLocalPath(referenceImages?.subject),
              style_path: getLocalPath(referenceImages?.style),
              composition_path: getLocalPath(referenceImages?.composition),
              mode: whiskMode || 'api' // Default to API mode (which has auto-fallback to DOM)
          };

          console.log(`[Whisk API] Sending payload to backend (Mode: ${payload.mode})`);

          const res = await fetch(backendUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!res.ok) {
              const errText = await res.text();
              throw new Error(`Backend Error (${res.status}): ${errText}`);
          }

          const data = await res.json();
          
          if (!data.success) {
              throw new Error(data.error || 'Unknown Backend Failure');
          }

          return NextResponse.json({
              imageUrl: data.image_url, // /outputs/filename.jpg
              success: true,
              mode: 'api-queued'
          });

      } catch (error: any) {
          console.error('[Whisk API] Backend Request Failed:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // =================================================================================
    // 🖌️ KIE GENERATION LOGIC (Legacy)
    // =================================================================================
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    // ... (KIE Logic remains same)
    // For brevity, I will copy the existing KIE implementation here if I were replacing the whole file,
    // but since I am using replace_file_content with range, I need to fit this into the existing structure.
    
    // Wait, the KIE logic is long. I will wrap it in an `if (source === 'kie')` block.
    // However, I need to make sure I don't break the file.
    // The previous code started KIE logic immediately after arg validation.
    
    // I will include the KIE logic inside the `else` or fallthrough
    // To make this robust, I'll assume the original logic handles KIE.
    // I will paste the WHISK logic *before* the KIE checks, and if source == whisk, return early.
    
    if (source === 'kie') {
        const createTaskPayload = {
        model: 'z-image',
        input: {
            prompt: prompt,
            aspect_ratio: aspectRatio || '16:9',
        },
        };

        // ... (Re-implement KIE fetch logic or call helper? No helper exists in this file)
        
        // Since I'm replacing the whole POST function, I MUST re-include the KIE logic.
        // It's specific and complex (polling etc). 
        
        // Let's copy the KIE logic from the previous `view_file`.
        
        console.log('[KIE API] KIE 모드 시작');
         // ... Rebuilding KIE Logic ...
        // Validation
        if (!apiKey) return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 });
        if (!prompt) return NextResponse.json({ error: '프롬프트가 필요합니다.' }, { status: 400 });

        // Request
        const response = await fetch(`${KIE_API_BASE}/createTask`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(createTaskPayload)
        });
        
        if (!response.ok) {
            return NextResponse.json({ error: `KIE Server Error: ${response.status}` }, { status: 503 });
        }
        
        const createData = await response.json();
        if (createData.code !== 200) {
             return NextResponse.json({ error: createData.msg || 'Create Task Failed' }, { status: 500 });
        }

        const taskId = createData.data?.taskId;
        if (!taskId) return NextResponse.json({ error: 'No Task ID' }, { status: 500 });
        
        const imageUrl = await pollTaskResult(taskId, apiKey);
        if (!imageUrl) return NextResponse.json({ error: 'Generation Failed or Timed Out' }, { status: 504 });

        return NextResponse.json({ imageUrl, taskId, success: true });
    }

    return NextResponse.json({ error: 'Invalid Image Source' }, { status: 400 });

  } catch (error) {
    console.error('[Generate API] Critical Error:', error);
    return NextResponse.json(
      { error: '서버 내부 오류: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Helper: Run Whisk DOM Mode
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const path = require('path');

async function runWhiskDomMode(prompt: string, cookies: string, outputDir: string, referenceImages: any = null) {
    const scriptPath = path.join(process.cwd(), 'python-core', 'services', 'generate_whisk.py');
    const safePrompt = prompt.replace(/"/g, '\\"');
    const safeCookies = (cookies || '[]').replace(/"/g, '\\"'); // Simple escaping
    
    // We pass cookies, output dir
    // We set count=1
    // The script prints ---RESULT_START--- [list] ---RESULT_END---
    
    let cmd = `python "${scriptPath}" --prompt "${safePrompt}" --output "${outputDir}" --cookies "${safeCookies}" --count 1`;

    // Append References if available
    if (referenceImages) {
        const getLocalPath = (url?: string) => {
          if (!url) return null;
          if (url.includes(':') || url.startsWith('/')) {
             if (url.startsWith('/uploads/')) {
                 return path.join(process.cwd(), 'public', url.replace(/^\//, ''));
             }
             if (fs.existsSync(url)) return url;
          }
          return null;
        };

        const subject = getLocalPath(referenceImages.subject);
        const style = getLocalPath(referenceImages.style);
        const composition = getLocalPath(referenceImages.composition);

        if (subject) cmd += ` --subject "${subject}"`;
        if (style) cmd += ` --style "${style}"`;
        if (composition) cmd += ` --composition "${composition}"`;
        
        console.log('[Whisk DOM] Refs attached:', { subject, style, composition });
    }
    
    try {
        console.log('[Whisk DOM] Executing:', cmd);
        
        const { stdout, stderr } = await execAsync(cmd);
        
        // Extract Result
        const match = stdout.match(/---RESULT_START---([\s\S]*?)---RESULT_END---/);
        if (match && match[1]) {
            const files = JSON.parse(match[1]);
            if (files.length > 0) {
                return NextResponse.json({ 
                    imageUrl: files[0], 
                    success: true,
                    mode: 'dom' // Indicate fallback happened
                });
            }
        }
        
        throw new Error('No image files returned from DOM script');
        
    } catch (e: any) {
        console.error('[Whisk DOM] Failed:', e);
        return NextResponse.json({ 
            error: 'Browser generation failed: ' + e.message,
            logs: e.stderr 
        }, { status: 500 });
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
