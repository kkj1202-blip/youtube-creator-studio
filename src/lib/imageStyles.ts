/**
 * 2026 마스터 이미지 스타일 라이브러리
 * 이미지 생성 시 일관된 스타일을 적용하기 위한 프롬프트 라이브러리
 */

export interface ImageStyle {
  id: string;
  name: string;
  prompt: string;
  thumbnail?: string;
}

export interface StyleCategory {
  id: string;
  name: string;
  icon: string;
  styles: ImageStyle[];
}

export const imageStyleLibrary: StyleCategory[] = [
  {
    id: 'animation',
    name: '애니메이션 스타일',
    icon: '🎬',
    styles: [
      {
        id: 'lego',
        name: '레고 (Ultimate LEGO Cinematic)',
        prompt: 'Official LEGO photography, 8k macro lens, realistic plastic material with slight scuffs and mold lines, studs-on-top construction, cinematic studio lighting, shallow depth of field, vibrant LEGO color palette, ray-traced reflections on plastic surfaces.',
      },
      {
        id: '3d-animation',
        name: '3D 애니메이션 (Next-Gen Disney)',
        prompt: 'Ultra-high-end 3D render, Pixar-grade subsurface scattering on skin, expressive stylized eyes, hyper-detailed fabric textures (denim, wool), soft global illumination, 8k Octane render, volumetric lighting, masterpiece.',
      },
      {
        id: '2d-animation',
        name: '2D 애니메이션 (Modern Vector Art)',
        prompt: 'Trendy 2D flat illustration, clean minimalist vector lines, high-contrast sophisticated color palette, cell-shaded, geometric harmony, professional motion graphic aesthetic, 4k digital art.',
      },
      {
        id: 'pixar',
        name: '픽사 (Pixar Emotional Core)',
        prompt: 'Hyper-detailed 3D animation, signature Pixar character proportions, warm emotional rim lighting, tactile world-building textures, rich micro-details, soft shadows, 8k resolution, cinematic storytelling frame.',
      },
      {
        id: 'ghibli',
        name: '지브리 (Neo-Ghibli Watercolor)',
        prompt: 'Hand-painted gouache and watercolor background, lush nature, soft natural sunlight filtering through leaves, nostalgic and serene atmosphere, high-definition Ghibli aesthetic, Joe Hisaishi movie vibe, masterpiece.',
      },
      {
        id: 'stickman',
        name: '졸라맨 (Premium Expressive Stickman)',
        prompt: 'Premium minimalist stickman character with highly expressive, stylized facial features integrated directly onto the character head, sleek fluid motion lines, professional 2D motion graphics aesthetic, clean vector art, high-contrast dark studio background, dynamic poses, cinematic lighting highlighting the character form, 4k resolution.',
      },
      {
        id: 'claymation',
        name: '클레이메이션 (Aardman Craft)',
        prompt: 'Authentic clay texture with visible artist fingerprints, stop-motion animation aesthetic, tactile matte finish, soft studio softbox lighting, miniature set design, handcrafted feel, high-quality claymation.',
      },
      {
        id: 'shinkai',
        name: '신카이 마코토 (Celestial Anime)',
        prompt: 'Ultra-detailed scenery, dramatic lens flares, hyper-realistic sky with purple and orange gradients, sparkling stars, emotional cinematic atmosphere, 8k anime art, Makoto Shinkai aesthetic.',
      },
      {
        id: 'us-comics',
        name: '미국 코믹스 (Modern Graphic Novel)',
        prompt: 'Dynamic comic book art, heavy ink lines, halftone dot patterns, dramatic chiaroscuro lighting, Ben-Day dots, vibrant primary colors, action-oriented composition, Marvel/DC aesthetic.',
      },
      {
        id: 'k-webtoon',
        name: 'K-웹툰 (High-End Manhwa)',
        prompt: 'Top-tier Korean webtoon style, elegant digital painting, trendy fashion design, glowing skin, soft focus backgrounds, vibrant lighting effects, high-quality manhwa character art.',
      },
    ],
  },
  {
    id: 'game',
    name: '게임 및 가상 세계 스타일',
    icon: '🎮',
    styles: [
      {
        id: 'minecraft',
        name: '마인크래프트 (RTX Overhaul)',
        prompt: 'Official Minecraft world with RTX ray-tracing enabled, volumetric fog, glowing emissive blocks, 8k high-res texture pack, cinematic lighting, realistic water reflections in a blocky world.',
      },
      {
        id: 'roblox',
        name: '로블록스 (High-Fidelity Blox)',
        prompt: 'Premium Roblox avatar style, smooth glossy plastic, trendy streetwear clothing textures, bright playful global illumination, modern Roblox engine lighting, high-end toy aesthetic.',
      },
      {
        id: 'pixel-art',
        name: '픽셀 아트 (Cyber-Pixel)',
        prompt: 'Modern 32-bit pixel art, advanced lighting and particle effects, deep depth of field, nostalgic but crisp, Octopath Traveler style, high-resolution pixel masterpiece.',
      },
      {
        id: 'low-poly',
        name: '로우 폴리 (Artistic Low Poly)',
        prompt: 'Geometric paper-craft aesthetic, sharp defined edges, soft pastel gradient colors, ambient occlusion, clean minimalist 3D world, trendy indie game aesthetic.',
      },
      {
        id: 'voxel',
        name: '복셀 (Voxel Masterpiece)',
        prompt: 'Intricate 3D cube-based diorama, isometric 45-degree view, tiny glowing cubes, toy-like miniature world, hyper-detailed voxel construction, soft tilt-shift effect.',
      },
      {
        id: 'gta',
        name: 'GTA 아트워크 (Vice City Vibe)',
        prompt: 'Bold black outlines, gritty saturated textures, high-contrast cinematic lighting, Rockstar Games loading screen aesthetic, urban street style, stylized realism.',
      },
      {
        id: 'isometric',
        name: '아이소메트릭 (3D Trendy Diorama)',
        prompt: '3D isometric miniature scene, orthographic view, clean soft lighting, pastel clay color palette, hyper-detailed 3D icons, Apple-style minimalist aesthetic.',
      },
    ],
  },
  {
    id: 'cinematic',
    name: '실사화 및 시네마틱 스타일',
    icon: '🎥',
    styles: [
      {
        id: 'hyper-photo',
        name: '실사화 (Hyper-Photo)',
        prompt: 'Photorealistic 8k RAW photo, shot on Sony A7R IV, 85mm f/1.2 lens, hyper-detailed skin pores and textures, natural cinematic lighting, masterpiece, sharp focus.',
      },
      {
        id: 'hollywood',
        name: '시네마틱 영화 (Hollywood Still)',
        prompt: 'Anamorphic widescreen aspect ratio, cinematic color grading (teal and orange), subtle film grain, dramatic lighting, shot on ARRI Alexa 65, movie scene aesthetic, high-budget film look.',
      },
      {
        id: 'cgi-movie',
        name: '시네마틱 3D (CGI Movie Render)',
        prompt: 'High-budget Hollywood CGI render, hyper-detailed environment, realistic physics-based rendering (PBR), cinematic atmosphere, Unreal Engine 5.5 movie render, 8k.',
      },
      {
        id: 'joseon',
        name: '조선시대 (18세기 후반 웹툰)',
        prompt: '18th-century Korean Joseon Dynasty (late 1700s) animation style, high-fidelity 2D webtoon aesthetic, historically accurate Hanbok textures with silk and cotton details, expressive character faces with bold line art, bustling traditional market (Jumak) background with 18th-century Hanok architecture, warm cinematic lighting, vibrant color palette, dynamic perspective, high-quality manhwa masterpiece.',
      },
      {
        id: 'cyberpunk',
        name: '사이버펑크 (Neon Noir)',
        prompt: 'Futuristic Neo-Seoul, heavy rain, neon signs reflections on wet pavement, cinematic haze, blue and magenta lighting, high-tech gritty atmosphere, Cyberpunk 2077 aesthetic.',
      },
      {
        id: 'retro-futurism',
        name: '레트로 퓨처리즘 (Space Age)',
        prompt: '1950s-60s sci-fi aesthetic, sleek chrome surfaces, mid-century modern design, pastel atomic age colors, vintage future vibe, NASA-punk aesthetic.',
      },
    ],
  },
  {
    id: 'artistic',
    name: '예술적 및 독특한 질감',
    icon: '🎨',
    styles: [
      {
        id: 'watercolor',
        name: '현대 수채화 (Ethereal Watercolor)',
        prompt: 'Fluid ink bleeds, artistic paint splashes, dreamlike atmosphere, high-quality textured paper, expressive brushstrokes, minimalist white space, masterpiece.',
      },
      {
        id: 'impasto',
        name: '임파스토 유화 (Heavy Texture Oil)',
        prompt: 'Thick impasto paint texture, visible palette knife strokes, heavy oil on canvas, rich deep colors, Van Gogh inspired modern touch, museum quality art.',
      },
      {
        id: 'pop-art',
        name: '팝아트 (Modern Neo-Pop)',
        prompt: 'Vibrant neon color blocks, CMYK aesthetic, bold fashion illustration, high-impact graphic design, Andy Warhol meets modern streetwear, trendy pop-culture.',
      },
      {
        id: 'synthwave',
        name: '신스웨이브 (Retro Synth)',
        prompt: '80s retro-futurism, wireframe landscape, glowing neon sun, VHS glitch aesthetic, purple and magenta gradients, outrun style.',
      },
      {
        id: 'pencil-sketch',
        name: '연필 스케치 (Master Drawing)',
        prompt: 'Detailed graphite drawing, hatching and cross-hatching, artistic paper texture, professional architectural sketch, charcoal smudge details, hand-drawn aesthetic.',
      },
      {
        id: 'paper-cut',
        name: '종이 오리기 (Paper-cut Art)',
        prompt: 'Multi-layered 3D paper art, soft shadows between paper layers, tactile paper texture, handcrafted diorama, intricate paper engineering.',
      },
      {
        id: 'amigurumi',
        name: '니트/털실 (Amigurumi Craft)',
        prompt: 'Extreme macro photography of wool texture, knitted fabric patterns, cozy and soft feel, handicraft style, vibrant yarn colors, toy photography.',
      },
      {
        id: 'popup-book',
        name: '팝업북 (Magical Pop-up)',
        prompt: 'Open storybook with 3D paper elements popping out, magical glowing light from the book, intricate paper folds, fairytale aesthetic, cinematic lighting.',
      },
      {
        id: 'neo-minimalism',
        name: '네오 미니멀리즘 (Luxury Minimal)',
        prompt: 'Extreme simplicity, soft pastel gradients, clean geometric balance, premium branding aesthetic, spacious and calm, high-end product photography style.',
      },
      {
        id: 'chaotic-packaging',
        name: '카오틱 패키징 (Maximalist Collage)',
        prompt: 'Hyper-detailed collage, chaotic stickers and labels, vibrant street fashion vibe, trendy pop-culture explosion, high-density visual interest.',
      },
      {
        id: 'barbiecore',
        name: '바비코어 (Plastic Surrealism)',
        prompt: 'Hyper-saturated pink world, surreal glossy plastic texture, high-fashion doll aesthetic, dreamlike surrealism, vibrant and feminine.',
      },
    ],
  },
];

// 모든 스타일을 flat하게 가져오기
export function getAllStyles(): ImageStyle[] {
  return imageStyleLibrary.flatMap(category => category.styles);
}

// ID로 스타일 찾기
export function getStyleById(id: string): ImageStyle | undefined {
  return getAllStyles().find(style => style.id === id);
}

// 카테고리 ID로 카테고리 찾기
export function getCategoryById(id: string): StyleCategory | undefined {
  return imageStyleLibrary.find(category => category.id === id);
}

/**
 * 캐릭터/배경 일관성을 위한 시드 프롬프트 생성
 */
export interface ConsistencySettings {
  characterDescription?: string;  // 캐릭터 외형 설명
  backgroundDescription?: string; // 배경 설명
  colorPalette?: string;          // 색상 팔레트
  artDirection?: string;          // 아트 디렉션 추가 지시
}

export function generateConsistencyPrompt(settings: ConsistencySettings): string {
  const parts: string[] = [];
  
  if (settings.characterDescription) {
    parts.push(`[Character: ${settings.characterDescription}]`);
  }
  
  if (settings.backgroundDescription) {
    parts.push(`[Background: ${settings.backgroundDescription}]`);
  }
  
  if (settings.colorPalette) {
    parts.push(`[Color palette: ${settings.colorPalette}]`);
  }
  
  if (settings.artDirection) {
    parts.push(`[Art direction: ${settings.artDirection}]`);
  }
  
  return parts.join(' ');
}

/**
 * 한글 대본을 영어 씬 설명으로 변환
 * 간단한 키워드 기반 변환 (LLM 없이)
 */
function convertScriptToEnglishScene(script: string): string {
  // 핵심 키워드 추출 및 영어 변환
  const keywords: string[] = [];
  
  // 장소/상황 키워드
  if (script.includes('통장') || script.includes('은행') || script.includes('돈')) {
    keywords.push('bank office scene');
  }
  if (script.includes('회사') || script.includes('사무실') || script.includes('업체') || script.includes('거래')) {
    keywords.push('corporate office meeting');
  }
  if (script.includes('집') || script.includes('방')) {
    keywords.push('home interior');
  }
  if (script.includes('거리') || script.includes('길')) {
    keywords.push('street scene');
  }
  
  // 감정/상황 키워드
  if (script.includes('화') || script.includes('분노') || script.includes('짜증')) {
    keywords.push('angry expression');
  }
  if (script.includes('슬') || script.includes('우울') || script.includes('눈물')) {
    keywords.push('sad emotional');
  }
  if (script.includes('놀') || script.includes('충격') || script.includes('깜짝')) {
    keywords.push('shocked surprised');
  }
  if (script.includes('행복') || script.includes('기쁨') || script.includes('웃')) {
    keywords.push('happy smiling');
  }
  if (script.includes('걱정') || script.includes('불안') || script.includes('고민')) {
    keywords.push('worried anxious');
  }
  
  // 행동 키워드
  if (script.includes('말') || script.includes('대화') || script.includes('이야기')) {
    keywords.push('talking conversation');
  }
  if (script.includes('앉') || script.includes('의자')) {
    keywords.push('sitting');
  }
  if (script.includes('서') || script.includes('일어')) {
    keywords.push('standing');
  }
  if (script.includes('걸') || script.includes('이동')) {
    keywords.push('walking');
  }
  
  // 인물 수
  if (script.includes('혼자') || script.includes('나')) {
    keywords.push('single person');
  }
  if (script.includes('둘') || script.includes('함께') || script.includes('같이')) {
    keywords.push('two people');
  }
  if (script.includes('여러') || script.includes('모두') || script.includes('다같이')) {
    keywords.push('group of people');
  }
  
  // 시간대
  if (script.includes('아침') || script.includes('오전')) {
    keywords.push('morning light');
  }
  if (script.includes('저녁') || script.includes('밤') || script.includes('야간')) {
    keywords.push('evening night');
  }
  
  // 기본 씬 설명 추가
  if (keywords.length === 0) {
    keywords.push('character scene');
  }
  
  return keywords.join(', ');
}

/**
 * 최종 이미지 프롬프트 생성
 * 스타일 프롬프트 + 일관성 설정 + 씬 설명을 조합
 * KIE API 최대 프롬프트 길이: 약 1000자
 */
const MAX_PROMPT_LENGTH = 950; // 여유분 포함

export function buildFinalPrompt(
  sceneDescription: string,
  stylePrompt: string,
  consistencySettings?: ConsistencySettings
): string {
  const parts: string[] = [];
  
  // 1. 스타일 프롬프트 (가장 중요 - 맨 앞에 배치, 전체 사용)
  // 스타일이 핵심이므로 자르지 않음
  if (stylePrompt) {
    parts.push(stylePrompt);
  }
  
  // 2. 스타일 강조 (반복하여 강화)
  const styleKeywords = extractStyleKeywords(stylePrompt);
  if (styleKeywords) {
    parts.push(styleKeywords);
  }
  
  // 3. 캐릭터 일관성 정보 - 간략화 (최대 150자)
  if (consistencySettings?.characterDescription) {
    const charDesc = consistencySettings.characterDescription.slice(0, 150);
    parts.push(`character: ${charDesc}`);
  }
  
  // 4. 씬 설명 (한글 대본을 영어로 변환)
  if (sceneDescription) {
    const englishScene = convertScriptToEnglishScene(sceneDescription);
    parts.push(englishScene);
  }
  
  // 5. 일관성 강화 키워드
  parts.push('consistent style, same art style throughout');
  
  // 최종 프롬프트 길이 제한
  let finalPrompt = parts.join(', ');
  
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`[buildFinalPrompt] 프롬프트 길이 초과: ${finalPrompt.length}자 → ${MAX_PROMPT_LENGTH}자로 자름`);
    finalPrompt = finalPrompt.slice(0, MAX_PROMPT_LENGTH);
  }
  
  console.log('[buildFinalPrompt] 최종 프롬프트:', finalPrompt);
  return finalPrompt;
}

/**
 * 스타일 프롬프트에서 핵심 키워드 추출 (스타일 강화용)
 */
function extractStyleKeywords(stylePrompt: string): string {
  if (!stylePrompt) return '';
  
  const keywords: string[] = [];
  
  // 스타일 유형 감지 및 강화 키워드 추가
  if (stylePrompt.toLowerCase().includes('stickman') || stylePrompt.toLowerCase().includes('minimalist')) {
    keywords.push('stickman style only', 'simple line art', 'no realistic rendering');
  }
  if (stylePrompt.toLowerCase().includes('3d') || stylePrompt.toLowerCase().includes('pixar')) {
    keywords.push('3D rendered', 'CGI animation style');
  }
  if (stylePrompt.toLowerCase().includes('2d') || stylePrompt.toLowerCase().includes('vector')) {
    keywords.push('2D flat style', 'vector illustration');
  }
  if (stylePrompt.toLowerCase().includes('anime') || stylePrompt.toLowerCase().includes('manga')) {
    keywords.push('anime art style', 'Japanese animation');
  }
  if (stylePrompt.toLowerCase().includes('webtoon') || stylePrompt.toLowerCase().includes('manhwa')) {
    keywords.push('Korean webtoon style', 'digital manhwa');
  }
  if (stylePrompt.toLowerCase().includes('lego')) {
    keywords.push('LEGO brick style', 'plastic toy aesthetic');
  }
  if (stylePrompt.toLowerCase().includes('pixel')) {
    keywords.push('pixel art only', 'retro game style');
  }
  if (stylePrompt.toLowerCase().includes('watercolor') || stylePrompt.toLowerCase().includes('ghibli')) {
    keywords.push('hand-painted watercolor', 'Ghibli aesthetic');
  }
  
  return keywords.join(', ');
}
