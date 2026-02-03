import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface RequestBody {
  keywords: string[];
  referenceTitles?: string[];
  tone?: 'clickbait' | 'informative' | 'emotional' | 'witty';
  count?: number;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: {
          temperature: 0.8,
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
        temperature: 0.8,
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
  try {
    const body: RequestBody = await request.json();
    const { 
      keywords, 
      referenceTitles = [], 
      tone = 'clickbait',
      count = 5,
      geminiApiKey,
      openaiApiKey 
    } = body;

    if (!geminiApiKey && !openaiApiKey) {
      return NextResponse.json(
        { error: 'LLM API key (Gemini or OpenAI) is required.' },
        { status: 400 }
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords are required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional YouTube Consultant and Copywriter specialized in creating viral titles.
Your goal is to generate HIGH-CTR (Click-Through Rate) titles based on given keywords and reference data.

TONE GUIDELINES:
- clickbait: Shocking, urgent, curiosity-inducing, uses questions or numbers (e.g., "This changes everything...")
- informative: Clear, concise, focuses on value and distinct benefits (e.g., "How to X in 5 mins")
- emotional: Touching, sad, or inspiring, appeals to feelings
- witty: Funny, puns, clever wordplay

OUTPUT FORMAT:
- Return ONLY a JSON array of strings.
- Example: ["Title 1", "Title 2", "Title 3"]
- Do not include markdown formatting (like \`\`\`json).
- Language: Korean (unless keywords are strictly English).
- Use appropriate emojis to grab attention.`;

    const userPrompt = `
Generate ${count} viral YouTube titles based on the following info:

KEYWORDS: ${keywords.join(', ')}
TONE: ${tone}
REFERENCE TITLES (What's already trending):
${referenceTitles.slice(0, 10).map(t => `- ${t}`).join('\n')}

REQUIREMENTS:
1. Make them short and punchy (under 60 chars preferred).
2. Integrate the keywords naturally.
3. If 'clickbait', use hooks like "결국...", "충격", "이럴수가", numbers, etc.
4. Output specific JSON array format: ["title1", "title2", ...]
    `;

    let resultText = '';
    
    // 1. Try Gemini
    if (geminiApiKey) {
      try {
        resultText = await callGemini(geminiApiKey, systemPrompt, userPrompt);
      } catch (e) {
        console.error('Gemini Title Gen Failed:', e);
        if (openaiApiKey) {
          resultText = await callOpenAI(openaiApiKey, systemPrompt, userPrompt);
        } else {
          throw e;
        }
      }
    } else if (openaiApiKey) {
      resultText = await callOpenAI(openaiApiKey, systemPrompt, userPrompt);
    }

    // Parse JSON
    let titles: string[] = [];
    try {
      // Clean up markdown code blocks if present
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      titles = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON Parse Error:', e, 'Raw:', resultText);
      // Fallback: split by newlines if JSON parsing fails
      titles = resultText.split('\n').filter(line => line.trim().length > 0).slice(0, count);
    }

    return NextResponse.json({
      success: true,
      titles
    });

  } catch (error) {
    console.error('Title generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
