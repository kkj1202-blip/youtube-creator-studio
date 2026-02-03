import { NextRequest, NextResponse } from 'next/server';

/**
 * LLM을 사용하여 씬 대본에서 이미지 프롬프트 생성
 * GPT/Gemini API를 사용하여 대본 내용을 분석하고 상세한 이미지 프롬프트 생성
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface RequestBody {
  script: string;
  stylePrompt: string;
  styleName: string;
  characterDescription?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

// Gemini API 호출
async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const data = await response.json();
        errorDetail = data.error?.message || JSON.stringify(data);
      } catch (e) {
        errorDetail = await response.text();
      }
      
      if (errorDetail.includes('expired') || errorDetail.includes('renew')) {
        throw new Error('Gemini API 키가 만료되었습니다.');
      }
      throw new Error(`Gemini API 오류: ${response.status} - ${errorDetail}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Gemini 연결 중 오류 발생');
  }
}

// OpenAI API 호출
async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const data = await response.json();
        errorDetail = data.error?.message || JSON.stringify(data);
      } catch (e) {
        errorDetail = await response.text();
      }
      throw new Error(`OpenAI API 오류: ${response.status} - ${errorDetail}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('OpenAI 연결 중 오류 발생');
  }
}

export async function POST(request: NextRequest) {
  console.log('[generate-scene-prompt] POST 요청 수신');
  
  try {
    const body: RequestBody = await request.json();
    const { 
      script, 
      stylePrompt, 
      styleName, 
      characterDescription,
      geminiApiKey,
      openaiApiKey 
    } = body;

    if (!script) {
      return NextResponse.json(
        { error: '대본이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!geminiApiKey && !openaiApiKey) {
      return NextResponse.json(
        { error: 'LLM API 키가 필요합니다. (Gemini 또는 OpenAI)' },
        { status: 400 }
      );
    }

    // 스타일 강제 규칙 감지
    const isStickman = styleName.toLowerCase().includes('stickman') || 
                       styleName.toLowerCase().includes('stick') ||
                       stylePrompt.toLowerCase().includes('stickman') ||
                       stylePrompt.toLowerCase().includes('졸라맨');
    
    const styleRule = isStickman 
      ? `CRITICAL STYLE RULE: ALL characters MUST be simple white stickman figures. 
         - ONLY white minimalist stick figures with round heads
         - NO realistic humans, NO detailed faces, NO skin, NO hair textures
         - ALL characters in the scene must be stickman - no exceptions!
         - Even background characters must be stickmen`
      : `STYLE: ${styleName} - Follow this art style for all elements`;

    const systemPrompt = `You are a professional CINEMATIC DIRECTOR and VISUAL ANALYST.
    Your mission is to transform a Korean narration script into a SAFE, RICH, and DETAILED visual scene description.
    
    CRITICAL OBJECTIVE: You MUST capture Situation, Environment, and Action while FOLLOWING GOOGLE SAFETY POLICIES.

    AI GENERATION RULES:
    - START EVERY PROMPT WITH: "PURE VISUAL SCENE, WITHOUT ANY TEXT OR WORDS,"
    - SUBJECT IDENTITY: If a [MAIN CHARACTER IDENTITY] is defined below, YOU MUST USE IT (e.g. "A white tiger in a suit"). Do NOT use generic terms like "The Lead Character" if a specific description exists.
    - COMPOSITION: Default to "Cinematic Wide Shot, Establishing Shot, Rule of Thirds" to show the full context. Avoid close-ups or portraits unless explicitly requested.
    - EMOTION: Extract the emotional vibe from the script but express it through body language and atmosphere, not just facial expressions.
    - FOCUS: Use 60% on Environment/Background, 20% on Action, and 20% on Composition/Lighting. The character should be naturally integrated into the scene.

    ${styleRule}`;

    // 상세 분석 지시
    const characterSection = characterDescription 
      ? `\n\n[MAIN CHARACTER IDENTITY]:
${characterDescription}
Maintain this character's look (hair, clothing, facial features) in every action.`
      : '';

    const backgroundSection = (body as any).backgroundDescription
      ? `\n\n[WORLD/BACKGROUND SETTING]:
${(body as any).backgroundDescription}
All scenes must take place in or follow this environment theme.`
      : '';

    const userPrompt = `TASK: ANALYZE the script and output ONLY Comma-Separated VISUAL Keywords.

===== KOREAN SCRIPT =====
${script}
========================
${characterSection}${backgroundSection}

OUTPUT FORMAT:
NO TEXT, NO WORDS, NO LETTERS, [Art Style Keywords], [Detailed Background/Environment], [Main Subject & Specific Action], [Lighting & Mood], [Cinematic Composition]`;

    let prompt: string;

    // Gemini 우선, 실패시 OpenAI
    if (geminiApiKey) {
      try {
        prompt = await callGemini(geminiApiKey, systemPrompt, userPrompt);
      } catch (error) {
        console.error('[generate-scene-prompt] Gemini 실패:', error);
        if (openaiApiKey) {
          prompt = await callOpenAI(openaiApiKey, systemPrompt, userPrompt);
        } else {
          throw error;
        }
      }
    } else if (openaiApiKey) {
      prompt = await callOpenAI(openaiApiKey, systemPrompt, userPrompt);
    } else {
      throw new Error('API 키 없음');
    }

    // 프롬프트 정제 - 마크다운이나 불필요한 텍스트 제거
    prompt = prompt
      .replace(/```[^`]*```/g, '')  // 코드 블록 제거
      .replace(/\*\*[^*]*\*\*/g, '')  // 볼드 제거
      .replace(/^(Here is|Here's|Image prompt:|Prompt:)/i, '')  // 서두 제거
      .trim();

    // NO TEXT로 시작하지 않으면 추가
    if (!prompt.toUpperCase().startsWith('NO TEXT')) {
      prompt = 'NO TEXT, NO WORDS, NO LETTERS, ' + prompt;
    }

    // 🔥 스틱맨 스타일 강제 후처리
    if (isStickman) {
      console.log('[generate-scene-prompt] 스틱맨 스타일 강제 후처리 적용...');
      
      // 실사 인물 단어를 스틱맨으로 대체
      const realisticToStickman: Record<string, string> = {
        'businessman': 'white stickman',
        'businesswoman': 'white stickman',
        'businesspeople': 'white stickmen',
        'businessperson': 'white stickman',
        'man': 'white stickman',
        'woman': 'white stickman',
        'person': 'white stickman',
        'people': 'white stickmen',
        'worker': 'white stickman worker',
        'workers': 'white stickmen workers',
        'employee': 'white stickman',
        'employees': 'white stickmen',
        'executive': 'white stickman',
        'executives': 'white stickmen',
        'official': 'white stickman',
        'officials': 'white stickmen',
        'narrator': 'white stickman narrator',
        'presenter': 'white stickman presenter',
        'human': 'white stickman',
        'humans': 'white stickmen',
        'character': 'white stickman character',
        'characters': 'white stickman characters',
        'figure': 'white stick figure',
        'figures': 'white stick figures',
      };
      
      // 대소문자 무시하고 대체
      for (const [realistic, stickman] of Object.entries(realisticToStickman)) {
        const regex = new RegExp(`\\b${realistic}\\b`, 'gi');
        prompt = prompt.replace(regex, stickman);
      }
      
      // 외모 설명 제거 (피부색, 머리카락 등)
      prompt = prompt.replace(/\b(skin|hair|face|eyes|nose|mouth|lips|beard|mustache)\b[^,]*/gi, '');
      prompt = prompt.replace(/\b(wearing suit|in suit|suit and tie|formal attire|dressed in)\b/gi, '');
      
      // 스틱맨 강제 후미 추가
      if (!prompt.includes('ONLY white stickman')) {
        prompt = prompt + ', ONLY simple white stickman characters, NO realistic humans, NO detailed faces, NO skin texture';
      }
    }

    console.log('[generate-scene-prompt] 최종 프롬프트:', prompt.slice(0, 200) + '...');

    return NextResponse.json({
      success: true,
      prompt,
    });

  } catch (error) {
    console.error('[generate-scene-prompt] 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프롬프트 생성 실패' },
      { status: 500 }
    );
  }
}
