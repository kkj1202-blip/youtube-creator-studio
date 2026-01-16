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

    const systemPrompt = `You are a VISUAL SCENE DIRECTOR who converts Korean narration into detailed English image prompts.

CRITICAL TASK: Extract SPECIFIC VISUAL ELEMENTS from the Korean script and describe them for image generation.

ANALYSIS STEPS:
1. IDENTIFY the main SUBJECT/TOPIC (e.g., money, fraud, factory, company, crisis)
2. FIND SPECIFIC NUMBERS/AMOUNTS and visualize them (e.g., "270억 달러" → "piles of money, financial documents showing billions")
3. IDENTIFY LOCATIONS mentioned (e.g., "베트남" → "Vietnam factory district with Vietnamese signs")
4. IDENTIFY ACTIONS (e.g., "짐을 싸고" → "workers packing boxes, moving trucks")
5. IDENTIFY EMOTIONS/MOOD (e.g., "충격" → "shocked expressions", "위기" → "dramatic crisis atmosphere")
6. IDENTIFY OBJECTS related to the topic (money → cash stacks, banks; fraud → documents, handcuffs; factory → machinery, boxes)

EXAMPLES:
- Input: "270억 달러 금융 사기" → Output: "massive pile of cash and documents, financial fraud scene, shocked businesspeople, falling stock charts, dramatic red lighting"
- Input: "삼성이 짐을 싸고 있다" → Output: "Samsung logo on boxes, workers packing factory equipment, moving trucks, empty factory floor"
- Input: "전기를 끊어버렸다" → Output: "power outage, dark factory, emergency lights, frustrated workers"

ABSOLUTE RULES:
1. Output ONLY the English prompt - NO explanations, NO Korean text
2. Start with: "NO TEXT, NO WORDS, NO LETTERS,"
3. Include SPECIFIC VISUAL ELEMENTS from the script (don't just show generic characters)
4. Match the art style provided
5. Be SPECIFIC about what should appear in the scene`;

    const userPrompt = `ANALYZE this Korean script and create a DETAILED image prompt:

===== SCRIPT =====
${script}
==================

REQUIRED VISUAL ELEMENTS TO EXTRACT:
- What is the MAIN TOPIC? (money, fraud, company, crisis, etc.)
- What SPECIFIC OBJECTS should appear? (cash, documents, boxes, factories, etc.)
- What LOCATION/BACKGROUND fits this scene?
- What ACTIONS are happening?
- What EMOTIONS should characters show?

ART STYLE: ${styleName}
STYLE KEYWORDS: ${stylePrompt.slice(0, 300)}

${characterDescription ? `CHARACTER APPEARANCE (MUST maintain exactly): ${characterDescription}` : ''}

OUTPUT FORMAT (English only, no explanation):
NO TEXT, NO WORDS, NO LETTERS, [style], [main subject/object], [specific visual elements from script], [background/location], [character actions/emotions], [mood/lighting]`;

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
