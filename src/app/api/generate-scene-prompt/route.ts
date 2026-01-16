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
    const error = await response.text();
    throw new Error(`Gemini API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// OpenAI API 호출
async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
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
    const error = await response.text();
    throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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

    const systemPrompt = `You are an expert image prompt engineer for AI image generation.
Your task is to analyze a Korean script/narration and generate a detailed English image prompt.

CRITICAL RULES:
1. The output must be ONLY the English prompt - no explanations, no Korean, no markdown
2. NEVER include ANY text, words, letters, captions, subtitles, or watermarks in the prompt
3. Focus on visual elements: characters, actions, backgrounds, lighting, mood
4. Always start with: "NO TEXT, NO WORDS, NO LETTERS,"
5. Match the style requirements exactly
6. If characters are described, maintain their exact appearance
7. Be specific about actions, emotions, and scene context`;

    const userPrompt = `Generate an image prompt for this scene:

SCRIPT (Korean):
"""
${script.slice(0, 500)}
"""

STYLE: ${styleName}
STYLE PROMPT: ${stylePrompt.slice(0, 200)}

${characterDescription ? `CHARACTER TO MAINTAIN: ${characterDescription}` : 'No specific character set - create appropriate characters for the scene'}

Output format (ONLY English prompt, nothing else):
NO TEXT, NO WORDS, NO LETTERS, [style keywords], [scene description with characters and actions], [background/location], [mood/lighting], [camera angle]`;

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

    console.log('[generate-scene-prompt] 생성된 프롬프트:', prompt.slice(0, 150) + '...');

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
