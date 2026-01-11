/**
 * LLM API 서비스 (Gemini 기본, GPT 백업)
 * 대본 분석, 캐릭터 추출, 이미지 프롬프트 생성 등
 */

// API 설정
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface LLMConfig {
  provider: 'gemini' | 'openai';
  geminiApiKey?: string;
  openaiApiKey?: string;
}

export interface Character {
  name: string;
  role: '주인공' | '조연' | '단역';
  gender: '남성' | '여성' | '불명';
  ageRange: string;
  appearance: string;
  personality: string;
  relationship: string;
}

export interface ScriptAnalysis {
  title: string;
  genre: string;
  setting: string;
  mood: string;
  characters: Character[];
  scenes: SceneAnalysis[];
}

export interface SceneAnalysis {
  sceneNumber: number;
  description: string;
  characters: string[];
  location: string;
  mood: string;
  visualDescription: string;
}

// Gemini API 호출
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
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
async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 영상 제작을 위한 대본 분석 전문가입니다. JSON 형식으로 응답하세요.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// LLM 호출 (Gemini 우선, 실패시 OpenAI)
export async function callLLM(config: LLMConfig, prompt: string): Promise<string> {
  if (config.provider === 'gemini' && config.geminiApiKey) {
    try {
      return await callGemini(config.geminiApiKey, prompt);
    } catch (error) {
      console.error('[LLM] Gemini 실패, OpenAI로 시도:', error);
      if (config.openaiApiKey) {
        return await callOpenAI(config.openaiApiKey, prompt);
      }
      throw error;
    }
  } else if (config.openaiApiKey) {
    return await callOpenAI(config.openaiApiKey, prompt);
  }
  throw new Error('LLM API 키가 설정되지 않았습니다.');
}

// 대본에서 캐릭터 분석
export async function analyzeCharacters(config: LLMConfig, scripts: string[]): Promise<Character[]> {
  const fullScript = scripts.join('\n\n---씬 구분---\n\n');
  
  const prompt = `다음 대본을 분석하여 등장 캐릭터들의 정보를 추출해주세요.

대본:
"""
${fullScript.slice(0, 8000)}
"""

다음 JSON 형식으로 응답해주세요 (JSON만 출력, 다른 텍스트 없이):
{
  "characters": [
    {
      "name": "캐릭터 이름",
      "role": "주인공/조연/단역 중 하나",
      "gender": "남성/여성/불명 중 하나",
      "ageRange": "예: 20대 초반, 30대 중반, 10대 등",
      "appearance": "외형 특징을 상세히 (머리 스타일, 체형, 특징적인 외모 등). 대본에 없으면 역할에 맞게 추론",
      "personality": "성격 특징 (밝음, 차분함, 냉정함 등)",
      "relationship": "다른 캐릭터와의 관계"
    }
  ]
}

주의사항:
1. 주인공은 1-2명만 선정 (가장 대사가 많거나 중심 인물)
2. 조연은 2-3명까지
3. appearance는 이미지 생성에 사용되므로 구체적으로 작성
4. 대본에 외형 설명이 없으면 역할과 성격에 맞게 합리적으로 추론`;

  const response = await callLLM(config, prompt);
  
  try {
    // JSON 추출
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 응답 없음');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.characters || [];
  } catch (error) {
    console.error('[LLM] 캐릭터 분석 파싱 오류:', error, response);
    return [];
  }
}

// 씬별 이미지 프롬프트 생성
export async function generateScenePrompts(
  config: LLMConfig, 
  scripts: string[], 
  characters: Character[],
  style: string
): Promise<string[]> {
  const characterRef = characters.map(c => 
    `- ${c.name} (${c.role}, ${c.gender}, ${c.ageRange}): ${c.appearance}`
  ).join('\n');

  const prompts: string[] = [];
  
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    
    const prompt = `다음 씬의 대표 이미지를 위한 프롬프트를 생성해주세요.

씬 ${i + 1}:
"""
${script.slice(0, 1500)}
"""

등장 캐릭터 참조:
${characterRef}

이미지 스타일: ${style}

다음 형식으로 영어 프롬프트만 출력하세요 (다른 텍스트 없이):
[씬에 등장하는 캐릭터들의 외형을 구체적으로 묘사], [배경/장소], [분위기/조명], [카메라 앵글], ${style} style, highly detailed, cinematic

주의사항:
1. 캐릭터 외형은 위 참조 정보와 일관되게 유지
2. 영어로만 작성
3. 프롬프트만 출력 (설명 없이)`;

    const response = await callLLM(config, prompt);
    prompts.push(response.trim());
    
    // API 속도 제한 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return prompts;
}

// 캐릭터 이미지 프롬프트 생성 (일관성 강화)
export async function generateCharacterImagePrompt(
  config: LLMConfig,
  character: Character,
  style: string,
  referenceDescription?: string
): Promise<string> {
  const prompt = `다음 캐릭터의 포트레이트 이미지를 위한 프롬프트를 생성해주세요.

캐릭터 정보:
- 이름: ${character.name}
- 역할: ${character.role}
- 성별: ${character.gender}
- 나이대: ${character.ageRange}
- 외형: ${character.appearance}
- 성격: ${character.personality}

이미지 스타일: ${style}

${referenceDescription ? `참조 이미지 설명: ${referenceDescription}` : ''}

다음 형식으로 영어 프롬프트만 출력하세요 (다른 텍스트 없이):
portrait of [상세한 캐릭터 외형 묘사], [표정], [의상], ${style} style, centered composition, looking at camera, highly detailed, professional lighting

주의사항:
1. 캐릭터의 외형 특징을 구체적으로 묘사
2. ${style} 스타일에 맞는 표현 사용
3. 영어로만 작성
4. 프롬프트만 출력`;

  const response = await callLLM(config, prompt);
  return response.trim();
}

// 대본 전체 분석 (캐릭터 + 씬 + 설정)
export async function analyzeFullScript(config: LLMConfig, scripts: string[]): Promise<ScriptAnalysis> {
  const fullScript = scripts.join('\n\n---씬 구분---\n\n');
  
  const prompt = `다음 대본을 종합적으로 분석해주세요.

대본:
"""
${fullScript.slice(0, 10000)}
"""

다음 JSON 형식으로 응답해주세요 (JSON만 출력):
{
  "title": "추정되는 제목 또는 주제",
  "genre": "장르 (드라마/코미디/로맨스/스릴러/일상 등)",
  "setting": "시대적/공간적 배경",
  "mood": "전체적인 분위기",
  "characters": [
    {
      "name": "캐릭터 이름",
      "role": "주인공/조연/단역",
      "gender": "남성/여성/불명",
      "ageRange": "나이대",
      "appearance": "상세한 외형 묘사 (이미지 생성용)",
      "personality": "성격",
      "relationship": "관계"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "씬 요약",
      "characters": ["등장 캐릭터 이름들"],
      "location": "장소",
      "mood": "분위기",
      "visualDescription": "시각적 묘사 (이미지 생성용)"
    }
  ]
}`;

  const response = await callLLM(config, prompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 응답 없음');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[LLM] 전체 분석 파싱 오류:', error);
    return {
      title: '',
      genre: '',
      setting: '',
      mood: '',
      characters: [],
      scenes: []
    };
  }
}
