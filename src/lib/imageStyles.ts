/**
 * 2026 마스터 이미지 스타일 라이브러리 v2.0
 * 
 * 업그레이드 내용:
 * - 모든 프롬프트에 고화질/텍스트 금지 기본 적용
 * - 2024-2025 최신 AI 이미지 생성 트렌드 반영
 * - 조명, 구도, 기술적 디테일 강화
 * - 일관성 유지를 위한 키워드 추가
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

// ============ 기본 품질 프롬프트 (모든 스타일에 자동 추가) ============
export const QUALITY_SUFFIX = ', masterpiece, best quality, ultra-detailed 8k, professional cinematic lighting, ray-tracing, global illumination, high-end production value, sharp focus, award-winning photography';
export const NEGATIVE_PROMPT = 'text, watermark, signature, logo, words, letters, writing, caption, subtitle, title, label, Korean text, Chinese text, Japanese text, any language text, typography, font, number, digit, script, inscription, alphabet, characters, romanization, blurry, low quality, distorted, deformed, ugly, bad anatomy, cropped, extra limbs, duplicate, disfigured, out of frame, lowres, mutation, messy text, illegible writing';

export const imageStyleLibrary: StyleCategory[] = [
  {
    id: 'animation',
    name: '애니메이션 스타일',
    icon: '🎬',
    styles: [
      {
        id: 'lego',
        name: '레고 (Ultimate LEGO Cinematic)',
        prompt: 'Professional LEGO photography, macro lens (100mm), authentic plastic material with fine scratches and stud detail, cinematic studio lighting, volumetric haze, ray-traced reflections on glossy plastic, shallow depth of field (f/1.8), vibrant official palette, miniature diorama aesthetic',
      },
      {
        id: 'arcane-style',
        name: '아케인 스타일 (Arcane Painterly)',
        prompt: 'Arcane League of Legends animation style, masterful combination of 3D modeling and hand-painted 2D textures, heavy brushstrokes, high-contrast dramatic cinematic lighting, glowing bioluminescent highlights, intense emotional atmosphere, stylized realism, gritty painterly aesthetic, masterpiece CGI',
      },
      {
        id: '3d-animation',
        name: '3D 애니메이션 (Next-Gen Disney)',
        prompt: 'Ultra-HD 3D animation, cutting-edge Disney/Pixar visual style, meticulous fabric simulation (micro-threads), soft global illumination, volumetric god rays, Octane render 8k, cinematic bokeh, vibrant color palette, high-end animation production value',
      },
      {
        id: 'hybrid-3d-premium',
        name: '프리미엄 3D (실사 반실사)',
        prompt: 'Masterpiece CGI visual style, perfect blend of photorealistic textures and stylized 3D animation, premium Unreal Engine 5 render, cinematic lighting with subsurface scattering, high-end fashion/streetwear fabrics (silk, leather, metal), stylish urban backdrop with artistic bokeh, Octane render 8k, sharp focus on scene atmosphere',
      },
      {
        id: 'ghibli-v2',
        name: '지브리 (Premium Watercolor)',
        prompt: 'High-end Studio Ghibli background art, traditional hand-painted gouache and watercolor, intricate foliage and lush nature, nostalgic summer lighting, shimmering heat haze, painterly cumulonimbus clouds, soft pastel earthy tones, Hayao Miyazaki inspired composition, serene pastoral masterpiece',
      },
      {
        id: 'retro-anime-90s',
        name: '90s 레트로 애니메이션 (Lo-fi Aesthetic)',
        prompt: '1990s vintage Japanese anime aesthetic, classic cel-shading, hand-drawn line art, lo-fi CRT grain, subtle color bleeding, chromatic aberration, nostalgic hazy atmosphere, neon city lights or soft rural landscapes, Sailor Moon and Cowboy Bebop inspired color grading, retro VHS vibe',
      },
      {
        id: 'claymation',
        name: '클레이메이션 (Stop-Motion)',
        prompt: 'Handcrafted clay sculpture, visible artist fingerprints and organic imperfections, stop-motion animation aesthetic, matte tactile Plasticine texture, soft studio softbox lighting, miniature set design, warm nostalgic feel, Aardman quality',
      },
      {
        id: 'shinkai-makoto',
        name: '신카이 마코토 (Ethereal Sky)',
        prompt: 'Hyper-detailed scenic art, Makoto Shinkai signature style, dramatic lens flares, glowing light rays, vibrant purple-orange-blue sky gradients, sparkling celestial elements, intricate urban architecture with wet reflections, emotional cinematic atmosphere, Your Name aesthetic',
      },
      {
        id: 'k-webtoon',
        name: 'K-웹툰 (High-End Manhwa)',
        prompt: 'Premium Korean webtoon illustration, elegant character design with pearlescent skin, trendy high-fashion styling, soft digital airbrushing, vibrant dramatic lighting effects, clean variable line weights, romantic aesthetic, high-quality manhwa cover art',
      },
      {
        id: 'us-comics',
        name: '미국 코믹스 (Modern Graphic Novel)',
        prompt: 'Dynamic American comic book art, heavy bold ink lines, dramatic chiaroscuro lighting, subtle halftone dot patterns, saturated primary color palette, gritty graphic novel aesthetic, superhero proportions, cinematic layout',
      },
    ],
  },
  {
    id: 'game',
    name: '게임 및 가상 세계 스타일',
    icon: '🎮',
    styles: [
      {
        id: 'minecraft-rtx',
        name: '마인크래프트 (RTX 2025)',
        prompt: 'Advanced Minecraft world with 2025 RTX ray-tracing, path-traced global illumination, high-res PBR textures, glowing emissive blocks with realistic bloom, caustic water reflections, volumetric atmospheric fog, cubic cinematic clouds, photorealistic blocky aesthetic',
      },
      {
        id: 'y2k-frutiger-aero',
        name: 'Y2K / 프루티거 에어로 (Glossy Future)',
        prompt: 'Frutiger Aero aesthetic, Y2K futuristic optimism, glossy glass and water textures, bright lime green and sky blue color palette, tropical fish and bubbles in translucent glass, high-gloss plastic surfaces, lens flares, clean 2000s tech-optimism atmosphere',
      },
      {
        id: 'roblox-avatar',
        name: '로블록스 아바타 (Premium Avatar)',
        prompt: 'High-end Roblox style, smooth glossy plastic material, trendy streetwear with 3D clothing layers, professional global illumination, bright playful lighting, sharp clean geometric shapes, collectible toy aesthetic',
      },
      {
        id: 'roblox-game-scene',
        name: '로블록스 게임 (Cinematic Gameplay)',
        prompt: 'Epic Roblox game scene, diverse blocky environment with advanced 2025 engine lighting, volumetric smoke and sparkles, dynamic camera angle, colorful community-created world, high-budget cinematic gameplay render, smooth plastic textures, vibrant and joyful atmosphere',
      },
      {
        id: 'pixel-art-hd',
        name: '픽셀 아트 (HD-2D Masterpiece)',
        prompt: 'Modern 32-bit HD-2D pixel art, Octopath Traveler style, per-pixel dynamic lighting, advanced particle effects, nostalgic yet crisp depth of field, tilt-shift bokeh, retro game masterpiece, beautiful color-shifted shadows',
      },
      {
        id: 'low-poly-trendy',
        name: '로우 폴리 (Trendy Geometric)',
        prompt: 'Minimalist geometric low-poly 3D art, soft pastel color gradients, clean sculptural world design, subtle ambient occlusion, trendy indie game aesthetic, paper-craft inspired textures, gentle poetic lighting',
      },
      {
        id: 'isometric-diorama',
        name: '아이소메트릭 (3D Premium Icon)',
        prompt: '3D isometric miniature diorama, perfect orthographic view, clean soft studio lighting, Apple-style minimalist aesthetic, pastel clay-like materials, hyper-detailed 3D illustration, cute tiny world',
      },
    ],
  },
  {
    id: 'cinematic',
    name: '실사화 및 시네마틱 스타일',
    icon: '🎥',
    styles: [
      {
        id: 'hyper-photo-2025',
        name: '실사화 (2025 Hyper-Reality)',
        prompt: 'Photorealistic 8k RAW photo, shot on Sony A7R V, 50mm f/1.2 G-Master lens, cinematic three-point lighting, natural color grading, no airbrushing, detailed textures, authentic professional photography',
      },
      {
        id: 'biophilic-design',
        name: '비오필릭 디자인 (Breathtaking Nature)',
        prompt: 'Biophilic architectural photography, fusion of modern luxury architecture and lush indoor nature, cascading tropical plants, natural sunlight filtering through architectural glass, organic sweeping curves, serene sanctuary vibe, high-end futuristic eco-design aesthetic',
      },
      {
        id: 'vintage-35mm',
        name: '35mm 필름 (90s Nostalgia)',
        prompt: 'Authentic 1990s 35mm film photography, Kodak Portra 400 aesthetic, soft organic grain, subtle light leaks, natural sun flare, warm nostalgic color tones, candid look, vintage cinematic atmosphere, high-quality film scan',
      },
      {
        id: 'hollywood-anamorphic',
        name: '시네마틱 (Anamorphic Epic)',
        prompt: '2.39:1 anamorphic widescreen cinema frame, ARRI Alexa 65 look, teal and orange cinematic color grading, dramatic chiaroscuro lighting, volumetric atmosphere, top-tier Hollywood production value, epic movie frame composition',
      },
      {
        id: 'cyberpunk-neon',
        name: '사이버펑크 (Neon Noir v2)',
        prompt: 'Futuristic cyberpunk neon noir, heavy rainfall, reflections on wet asphalt, magenta-cyan-violet lighting, atmospheric volumetric fog, high-tech gritty dystopian cityscape, Blade Runner-esque industrial aesthetic',
      },
    ],
  },
  {
    id: 'artistic',
    name: '예술적 및 독특한 질감',
    icon: '🎨',
    styles: [
      {
        id: 'pop-surrealism',
        name: '팝 초현실주의 (Dreamy Surreal)',
        prompt: 'Modern pop surrealism, dreamlike colorful and slightly weird atmosphere, floating objects, saturated pastel palette, high-contrast whimsical lighting, smooth polished surfaces, imaginative and creative composition, lowbrow art aesthetic',
      },
      {
        id: 'felted-wool',
        name: '펠트 양모 (Cozy Felted)',
        prompt: 'Extreme macro photography of needle-felted wool, soft fuzzy texture with visible individual fibers, cute handcrafted character, cozy warm tactile feel, soft diffused indoor lighting, hygge atmosphere, adorable handicraft aesthetic',
      },
      {
        id: 'hyper-tactile-toy',
        name: '하이퍼-택타일 토이 (Tactile Lab)',
        prompt: 'Hyper-detailed 3D toy art, mix of matte rubber and glossy plastic materials, soft squishy textures, vibrant pop colors, studio product lighting with soft shadows, high-end designer toy aesthetic, urban vinyl style, creative character design',
      },
      {
        id: 'modern-sculpture',
        name: '현대 조각 (Marble & Bronze)',
        prompt: 'Contemporary minimalist sculpture, smooth polished marble or iridescent crystal material, museum gallery lighting, dramatic shadows, elegant geometric balance, high-end fine art photography, luxurious tactile finish',
      },
      {
        id: 'impasto-modern',
        name: '임파스토 (Heavy Oil Texture)',
        prompt: 'Thick modern impasto oil painting, extremely heavy palette knife strokes, three-dimensional paint surface, rich saturated colors, expressive confident brushwork, museum gallery quality, tactile masterpiece',
      },
      {
        id: 'watercolor-ethereal',
        name: '에테리얼 수채화 (Fluid Art)',
        prompt: 'Fluid ethereal watercolor painting, artistic ink bleeds and controlled splashes, dreamlike transparency, high-quality cold-press paper texture, expressive brushstrokes, beautiful white space management, museum fine art',
      },
      {
        id: 'synthwave-2025',
        name: '신스웨이브 (Neo-Synth v2)',
        prompt: 'Modern synthwave aesthetic, 80s retro-futurism with 2025 rendering, neon wireframe grid, glowing sunset gradient, chrome reflections, lo-fi analog glitch effects, nostalgic yet high-tech atmosphere',
      },
      {
        id: 'paper-cut-layered',
        name: '종이 오리기 (Intricate Layers)',
        prompt: 'Multi-layered 3D paper cutting art, soft shadows between paper layers, handcrafted paper engineering, beautiful paper diorama with depth, delicate paper sculpture aesthetic, soft top-down lighting',
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
  leadCharacterIds?: string[];    // 주인공 캐릭터 IDs (최대 2명)
  referenceImageUrls?: string[];  // 캐시된 레퍼런스 이미지 URLs (Whisk 연동용)
  styleReferenceUrl?: string;     // 스타일 레퍼런스
  compositionReferenceUrl?: string; // 구성/장면 레퍼런스
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
 * 한글 대본을 영어 씬 설명으로 변환 v2.0
 * 더 많은 배경/행동/감정 키워드 지원
 */
function convertScriptToEnglishScene(script: string): string {
  const keywords: string[] = [];
  
  // ========== 장소/배경 (가장 중요!) ==========
  // 자연
  if (script.includes('숲') || script.includes('나무') || script.includes('산')) {
    keywords.push('lush green forest background');
  }
  if (script.includes('바다') || script.includes('해변') || script.includes('모래')) {
    keywords.push('beach scenery with ocean');
  }
  if (script.includes('하늘') || script.includes('구름')) {
    keywords.push('blue sky with clouds');
  }
  if (script.includes('공원') || script.includes('잔디')) {
    keywords.push('park with green grass');
  }
  if (script.includes('도시') || script.includes('빌딩') || script.includes('건물')) {
    keywords.push('urban city with buildings');
  }
  
  // 실내
  if (script.includes('집') || script.includes('방') || script.includes('거실')) {
    keywords.push('cozy home interior');
  }
  if (script.includes('사무실') || script.includes('회사') || script.includes('업무') || script.includes('업체')) {
    keywords.push('modern office interior');
  }
  if (script.includes('학교') || script.includes('교실') || script.includes('수업')) {
    keywords.push('school classroom');
  }
  if (script.includes('카페') || script.includes('커피') || script.includes('음료')) {
    keywords.push('cozy cafe');
  }
  if (script.includes('식당') || script.includes('음식') || script.includes('밥')) {
    keywords.push('restaurant setting');
  }
  if (script.includes('병원') || script.includes('의사')) {
    keywords.push('hospital setting');
  }
  if (script.includes('통장') || script.includes('은행') || script.includes('돈')) {
    keywords.push('bank office');
  }
  
  // 기타 장소
  if (script.includes('길') || script.includes('거리') || script.includes('골목')) {
    keywords.push('street scene');
  }
  if (script.includes('차') || script.includes('자동차') || script.includes('운전')) {
    keywords.push('car interior');
  }
  
  // ========== 행동 (대폭 확장!) ==========
  // 이동
  if (script.includes('걷') || script.includes('걸') || script.includes('산책')) {
    keywords.push('walking');
  }
  if (script.includes('뛰') || script.includes('달리')) {
    keywords.push('running');
  }
  
  // 자세
  if (script.includes('앉') || script.includes('의자')) {
    keywords.push('sitting');
  }
  if (script.includes('서') || script.includes('서있') || script.includes('일어')) {
    keywords.push('standing');
  }
  if (script.includes('누') || script.includes('눕')) {
    keywords.push('lying down');
  }
  
  // 소통
  if (script.includes('말') || script.includes('대화') || script.includes('이야기') || script.includes('얘기')) {
    keywords.push('talking speaking');
  }
  if (script.includes('듣') || script.includes('들었') || script.includes('경청')) {
    keywords.push('listening attentively');
  }
  if (script.includes('전화') || script.includes('통화')) {
    keywords.push('on the phone calling');
  }
  
  // 시선/관찰
  if (script.includes('보') || script.includes('쳐다') || script.includes('바라')) {
    keywords.push('looking at watching');
  }
  if (script.includes('찾') || script.includes('발견')) {
    keywords.push('searching finding');
  }
  
  // 음식
  if (script.includes('먹') || script.includes('식사') || script.includes('마시')) {
    keywords.push('eating drinking');
  }
  
  // 감정 표현
  if (script.includes('울') || script.includes('눈물')) {
    keywords.push('crying tears');
  }
  if (script.includes('웃') || script.includes('미소')) {
    keywords.push('laughing smiling joyful');
  }
  
  // 신체 접촉
  if (script.includes('포옹') || script.includes('안기') || script.includes('안아')) {
    keywords.push('hugging embracing');
  }
  if (script.includes('손잡') || script.includes('손을 잡')) {
    keywords.push('holding hands together');
  }
  if (script.includes('악수')) {
    keywords.push('handshake greeting');
  }
  
  // 갈등
  if (script.includes('싸') || script.includes('다투')) {
    keywords.push('arguing conflict');
  }
  
  // 인사/이별
  if (script.includes('손을 흔') || script.includes('흔들') || script.includes('인사')) {
    keywords.push('waving hand greeting');
  }
  if (script.includes('떠나') || script.includes('떠났') || script.includes('출발')) {
    keywords.push('leaving departing');
  }
  if (script.includes('헤어') || script.includes('이별') || script.includes('작별')) {
    keywords.push('parting farewell goodbye');
  }
  if (script.includes('만나') || script.includes('만났') || script.includes('재회')) {
    keywords.push('meeting reunion greeting');
  }
  
  // 지시/동작
  if (script.includes('가리') || script.includes('가르') || script.includes('알려')) {
    keywords.push('pointing showing teaching');
  }
  if (script.includes('끄덕') || script.includes('고개')) {
    keywords.push('nodding head');
  }
  if (script.includes('도') || script.includes('도움') || script.includes('도와')) {
    keywords.push('helping assisting');
  }
  
  // 기다림/생각
  if (script.includes('기다') || script.includes('대기')) {
    keywords.push('waiting patiently');
  }
  if (script.includes('생각') || script.includes('고민') || script.includes('고려')) {
    keywords.push('thinking contemplating');
  }
  
  // 시작/새로움
  if (script.includes('시작') || script.includes('새로운') || script.includes('첫')) {
    keywords.push('new beginning starting fresh');
  }
  
  // 마을/장소
  if (script.includes('마을') || script.includes('동네') || script.includes('주민')) {
    keywords.push('village town community');
  }
  
  // 시간대
  if (script.includes('해가') || script.includes('해 뜨') || script.includes('떠오')) {
    keywords.push('sunrise morning dawn');
  }
  
  // ========== 감정 ==========
  if (script.includes('행복') || script.includes('기쁨') || script.includes('좋') || script.includes('신나')) {
    keywords.push('happy joyful expression');
  }
  if (script.includes('슬') || script.includes('우울') || script.includes('속상') || script.includes('외로')) {
    keywords.push('sad melancholy expression');
  }
  if (script.includes('화') || script.includes('분노') || script.includes('짜증') || script.includes('열받')) {
    keywords.push('angry expression');
  }
  if (script.includes('놀') || script.includes('충격') || script.includes('깜짝') || script.includes('헉')) {
    keywords.push('shocked surprised');
  }
  if (script.includes('걱정') || script.includes('불안') || script.includes('고민')) {
    keywords.push('worried thinking');
  }
  if (script.includes('사랑') || script.includes('좋아') || script.includes('설레')) {
    keywords.push('romantic feeling');
  }
  
  // ========== 시간대/날씨 ==========
  if (script.includes('아침') || script.includes('오전')) {
    keywords.push('morning light');
  }
  if (script.includes('저녁') || script.includes('노을')) {
    keywords.push('evening sunset');
  }
  if (script.includes('밤') || script.includes('야간') || script.includes('어두')) {
    keywords.push('nighttime');
  }
  if (script.includes('비') || script.includes('우산')) {
    keywords.push('rainy weather');
  }
  
  // ========== 인물 수 ==========
  if (script.includes('혼자') || script.includes('홀로')) {
    keywords.push('single person');
  } else if (script.includes('둘') || script.includes('함께') || script.includes('같이')) {
    keywords.push('two people');
  } else if (script.includes('여러') || script.includes('모두') || script.includes('다같이')) {
    keywords.push('group of people');
  }
  
  // ========== 비즈니스/경제 ==========
  if (script.includes('삼성') || script.includes('기업') || script.includes('회사') || script.includes('업체')) {
    keywords.push('corporate business setting');
  }
  if (script.includes('공장') || script.includes('제조') || script.includes('생산')) {
    keywords.push('factory manufacturing plant');
  }
  if (script.includes('세금') || script.includes('납세') || script.includes('과세')) {
    keywords.push('tax documents money');
  }
  if (script.includes('철수') || script.includes('짐') || script.includes('싸')) {
    keywords.push('packing moving boxes leaving');
  }
  if (script.includes('투자') || script.includes('이익') || script.includes('손실')) {
    keywords.push('investment financial graphs');
  }
  
  // ========== 정치/정부 ==========
  if (script.includes('정부') || script.includes('정책') || script.includes('규제')) {
    keywords.push('government building official setting');
  }
  if (script.includes('대통령') || script.includes('장관') || script.includes('관료')) {
    keywords.push('political leader podium');
  }
  if (script.includes('법') || script.includes('법률') || script.includes('규정')) {
    keywords.push('legal documents court');
  }
  
  // ========== 국제/국가 ==========
  if (script.includes('베트남') || script.includes('동남아')) {
    keywords.push('Vietnam Southeast Asia factory district');
  }
  if (script.includes('중국') || script.includes('미국') || script.includes('일본') || script.includes('한국')) {
    keywords.push('international global map');
  }
  if (script.includes('해외') || script.includes('외국') || script.includes('수출') || script.includes('수입')) {
    keywords.push('international trade shipping');
  }
  
  // ========== 위기/문제 ==========
  if (script.includes('위기') || script.includes('문제') || script.includes('충격')) {
    keywords.push('crisis situation dramatic urgent');
  }
  if (script.includes('전기') || script.includes('정전') || script.includes('끊')) {
    keywords.push('power outage electricity dark');
  }
  if (script.includes('방관') || script.includes('무시') || script.includes('외면')) {
    keywords.push('ignoring turning away');
  }
  if (script.includes('약속') || script.includes('뒤집') || script.includes('배신')) {
    keywords.push('broken promise betrayal');
  }
  if (script.includes('보호') || script.includes('지원') || script.includes('도와')) {
    keywords.push('protection support helping');
  }
  
  // ========== 기본값 + 배경 보정 ==========
  if (keywords.length === 0) {
    keywords.push('character in colorful illustrated scene');
  }
  
  // 배경이 없으면 기본 배경 추가
  const hasBackground = keywords.some(k => 
    k.includes('interior') || k.includes('background') || k.includes('scene') || 
    k.includes('setting') || k.includes('cafe') || k.includes('office') ||
    k.includes('park') || k.includes('forest') || k.includes('beach') ||
    k.includes('city') || k.includes('street') || k.includes('school') ||
    k.includes('factory') || k.includes('government') || k.includes('Vietnam')
  );
  
  if (!hasBackground) {
    keywords.push('with colorful illustrated background');
  }
  
  return keywords.join(', ');
}

/**
 * 최종 이미지 프롬프트 생성 v4.0
 * 씬 중심 프롬프트 시스템
 * 
 * 프롬프트 구성 (우선순위 순):
 * 1. 스타일 핵심 (짧게) - 100자
 * 2. 씬 설명 (가장 중요!) - 300자
 * 3. 캐릭터 일관성 - 200자
 * 4. 품질 + 일관성 - 100자
 * 
 * KIE API 최대 프롬프트 길이: 약 1000자
 */
const MAX_PROMPT_LENGTH = 900; // 안전 마진

// 예산 할당 (씬 중심으로 재조정)
const BUDGET = {
  styleCore: 100,     // 스타일 핵심 (짧게!)
  scene: 500,         // 씬 설명 (크게 확장!)
  character: 200,     // 캐릭터 일관성
  quality: 100,       // 품질 + 일관성
};

export function buildFinalPrompt(
  sceneDescription: string,
  stylePrompt: string,
  consistencySettings?: ConsistencySettings,
  hasReferences: boolean = false
): string {
  const parts: string[] = [];
  
  // ============ 0. 강력한 텍스트 금지 (짧고 강하게!) ============
  parts.push('PURE VISUAL SCENE, WITHOUT ANY TEXT OR WORDS');
  
  // ============ 1. 씬 설명 (가장 중요! 맨 앞으로 이동) ============
  let scenePart = '';
  if (sceneDescription) {
    // 이미 시각적 프롬프트(LLM 생성 등)인 경우 변환 없이 사용
    const looksLikePrompt = sceneDescription.toUpperCase().includes('NO TEXT') || 
                            sceneDescription.toLowerCase().includes('lighting') || 
                            sceneDescription.toLowerCase().includes('cinematic') ||
                            sceneDescription.toLowerCase().includes('background');
    
    if (looksLikePrompt) {
      scenePart = sceneDescription
        .replace(/PURE VISUAL SCENE, WITHOUT ANY TEXT OR WORDS/gi, '')
        .replace(/NO TEXT, NO WORDS, NO LETTERS, PURE VISUAL SCENE,/gi, '')
        .trim();
    } else {
      const englishScene = convertScriptToEnglishScene(sceneDescription);
      scenePart = englishScene ? `Scene: ${englishScene}` : '';
    }
    
    // 래퍼런스가 있을 때는 '상황'과 '행동'이 최우선 (얼빡샷 방지)
    if (hasReferences && scenePart) {
      // 2025.01 최종 수정: '전신샷(Full body)' 강제 제거 -> 자연스러운 시네마틱 구도 유도
      // (사용자 피드백: 전신샷 키워드가 오히려 부자연스러운 스탠딩 샷을 유발할 가능성 있음)
      scenePart = `(Wide shot illustrating the situation:1.6), (Environment and background focus:1.5), (Dynamic action:1.4), (Cinematic framing with rule of thirds), ${scenePart}`;
    }
    
    if (scenePart) parts.push(scenePart.slice(0, BUDGET.scene));
  } else {
    parts.push('visual scene centered around the environment');
  }

  // ============ 2. 스타일 핵심 ============
  if (stylePrompt) {
    const styleCore = stylePrompt.slice(0, BUDGET.styleCore);
    parts.push(styleCore);
    
    const lowerStyle = stylePrompt.toLowerCase();
    if (lowerStyle.includes('stickman') || lowerStyle.includes('stick figure') || lowerStyle.includes('white minimalist')) {
      parts.push('ONLY simple white stickman characters, NO realistic humans, NO detailed faces, NO skin texture');
    }
  }
  
  // ============ 3. 품질 + 일관성 키워드 ============
  parts.push('masterpiece, 8k, highly detailed');
  
  // ============ 4. 스타일 재강조 ============
  if (stylePrompt) {
    const styleKeywords = stylePrompt.split(',').slice(0, 3).join(', ');
    parts.push(`STYLE: ${styleKeywords}`);
  }

  // ============ 5. 캐릭터 일관성 (맨 뒤로 이동!!) ============
  // 인물 비중을 최소화하기 위해 가장 마지막에 배치
  if (consistencySettings?.characterDescription) {
    const characterPart = consistencySettings.characterDescription.slice(0, BUDGET.character);
    
    if (hasReferences) {
        // 래퍼런스 모드: '일관성'은 유지하되, 크기나 앵글은 상황에 맞게 유동적으로.
        // 기존의 'small character'나 'Upper body' 강제 로직 제거
        parts.push(`(maintain character details), (natural integration into scene), (character performing action)`);
    } else {
        parts.push(`Character in scene: ${characterPart}, naturally blended`);
    }
  }

  if (hasReferences) {
    // 래퍼런스 핵심 지시: 부정어(NO xxx) 대신 긍정어(Wide Shot)만 사용하여 토큰 오염 방지
    parts.push('(Extreme Wide Shot), (Full body visible), (Environmental storytelling), (Cinematic composition), (Rule of thirds)');
  }
  
  // 텍스트 금지 (Global Text Ban)
  parts.push('(clean image), (no text), (no watermark), (textless), (pure visual)');
  
  // 최종 조합
  const combined = parts.join(', ');
  
  // 중복 제거
  const uniqueParts = Array.from(new Set(combined.split(',').map(p => p.trim()).filter(Boolean)));
  let finalPrompt = uniqueParts.join(', ');
  
  // 보정
  finalPrompt = finalPrompt
    .replace(/\b(narrator|script|presenter|subtitle|caption|story|narrating|speaking|dialogue)\b/gi, '')
    .replace(/\bmoney\b/gi, 'financial charts')
    .replace(/\bdollar\b/gi, 'numerical data');

  // 캐릭터 일관성 보정 (얼빡샷 원인 제거)
  if (hasReferences) {
     // 인물 관련 단어가 나오면 'scene with ~' 형태로 변환하여 인물 중심 탈피 시도
     // finalPrompt = finalPrompt.replace(/\b(man|woman)\b/gi, 'character in scene'); 
  }

  // 한글 제거
  finalPrompt = finalPrompt.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '').replace(/\s+/g, ' ').trim();

  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    finalPrompt = finalPrompt.slice(0, MAX_PROMPT_LENGTH);
  }
  
  return finalPrompt;
}

/**
 * 네거티브 프롬프트 가져오기 (스타일별 강화)
 */
