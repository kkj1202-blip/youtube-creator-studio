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
export const QUALITY_SUFFIX = ', masterpiece, best quality, 8k ultra HD, sharp focus, highly detailed';
export const NEGATIVE_PROMPT = 'text, watermark, signature, logo, words, letters, blurry, low quality, distorted, deformed, ugly, bad anatomy, cropped';

export const imageStyleLibrary: StyleCategory[] = [
  {
    id: 'animation',
    name: '애니메이션 스타일',
    icon: '🎬',
    styles: [
      {
        id: 'lego',
        name: '레고 (Ultimate LEGO Cinematic)',
        prompt: 'Official LEGO photography style, 8k macro lens shot, realistic plastic material with authentic studs-on-top construction, cinematic studio lighting with soft shadows, shallow depth of field, vibrant official LEGO color palette, ray-traced reflections on glossy plastic surfaces, miniature diorama feel, professional toy photography',
      },
      {
        id: '3d-animation',
        name: '3D 애니메이션 (Next-Gen Pixar)',
        prompt: 'Ultra high-end 3D CGI render, Pixar-grade character design with expressive stylized eyes, hyper-realistic subsurface scattering on skin, detailed fabric textures with individual threads visible, soft global illumination, 8k Octane render quality, volumetric lighting with god rays, cinematic depth of field, Disney-quality animation frame',
      },
      {
        id: '2d-animation',
        name: '2D 애니메이션 (Modern Vector Art)',
        prompt: 'Premium 2D flat illustration, clean minimalist vector art with precise geometric lines, sophisticated high-contrast color palette, cell-shaded with smooth gradients, professional motion graphic aesthetic, trendy editorial illustration style, bold shapes and negative space, 4k digital art',
      },
      {
        id: 'pixar',
        name: '픽사 (Pixar Emotional Storytelling)',
        prompt: 'Hyper-detailed 3D Pixar-style animation, signature character proportions with large expressive eyes, warm emotional rim lighting, tactile world-building with micro-textures, rich environmental storytelling details, soft diffused shadows, cinematic 2.39:1 aspect composition, emotional color grading',
      },
      {
        id: 'ghibli',
        name: '지브리 (Studio Ghibli Watercolor)',
        prompt: 'Hand-painted gouache and watercolor background, Studio Ghibli aesthetic, lush nature with intricate foliage, soft natural sunlight filtering through leaves, nostalgic serene atmosphere, painterly clouds with soft edges, warm earthy color palette, Hayao Miyazaki inspired composition, dreamy pastoral scene',
      },
      {
        id: 'stickman',
        name: '3D 졸라맨 (Trendy Stickman)',
        prompt: 'Trendy 3D rendered white stickman character, cute minimalist 3D figure with smooth white body, small round head with simple dot eyes, stylized 3D character with soft shadows, modern CGI render, clean white character on vibrant colorful 3D background, Pixar-style lighting, cheerful expression, dynamic action pose, bright pop-color environment, soft ambient occlusion',
      },
      {
        id: 'claymation',
        name: '클레이메이션 (Aardman Stop-Motion)',
        prompt: 'Authentic clay sculpture with visible artist fingerprints and organic textures, Aardman-style stop-motion animation aesthetic, matte tactile finish, soft studio softbox lighting with gentle shadows, handcrafted miniature set design, warm nostalgic atmosphere, Plasticine texture detail, Wallace and Gromit quality',
      },
      {
        id: 'shinkai',
        name: '신카이 마코토 (Makoto Shinkai Celestial)',
        prompt: 'Ultra-detailed scenic background, Makoto Shinkai signature style, dramatic lens flares and light rays, hyper-realistic sky with purple orange pink gradients at golden hour, sparkling stars and celestial elements, emotional cinematic atmosphere, intricate urban architecture, reflections on wet surfaces, Your Name aesthetic',
      },
      {
        id: 'us-comics',
        name: '미국 코믹스 (Modern Marvel DC)',
        prompt: 'Dynamic American comic book art, heavy bold ink lines with confident strokes, dramatic chiaroscuro lighting, classic halftone dot patterns, vibrant saturated primary colors, action-oriented dynamic composition, heroic proportions, Ben-Day dots texture, modern Marvel/DC graphic novel aesthetic',
      },
      {
        id: 'k-webtoon',
        name: 'K-웹툰 (Premium Korean Manhwa)',
        prompt: 'Top-tier Korean webtoon digital painting, elegant character design with glowing flawless skin, trendy modern fashion styling, soft airbrushed gradients, vibrant Korean drama lighting effects, clean line art with varying weights, high-quality manhwa illustration, romantic webtoon aesthetic',
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
        name: '마인크래프트 (RTX Shader)',
        prompt: 'Official Minecraft world with RTX ray-tracing enabled, volumetric fog and atmospheric haze, glowing emissive blocks with bloom effects, 8k high-resolution texture pack, cinematic shader lighting, realistic water reflections in blocky world, dramatic sky with cubic clouds, path-traced global illumination',
      },
      {
        id: 'roblox',
        name: '로블록스 (Premium Roblox Avatar)',
        prompt: 'Premium Roblox avatar character style, smooth glossy plastic appearance, trendy streetwear clothing with detailed textures, bright playful global illumination, modern Roblox engine lighting quality, high-end collectible toy aesthetic, vibrant saturated colors, clean geometric shapes',
      },
      {
        id: 'pixel-art',
        name: '픽셀 아트 (HD-2D Octopath)',
        prompt: 'Modern 32-bit HD-2D pixel art, advanced per-pixel lighting and particle effects, Octopath Traveler aesthetic, nostalgic yet crisp with depth of field effects, carefully crafted color palette, scanline texture overlay, retro game masterpiece with modern rendering, isometric or side-scrolling composition',
      },
      {
        id: 'low-poly',
        name: '로우 폴리 (Artistic Geometric)',
        prompt: 'Geometric low-poly 3D art with defined triangular facets, soft pastel gradient coloring, clean minimalist world design, subtle ambient occlusion, trendy indie game aesthetic, paper-craft inspired textures, gentle shadows, modern casual game art style',
      },
      {
        id: 'voxel',
        name: '복셀 (Detailed Voxel Diorama)',
        prompt: 'Intricate 3D voxel-based diorama, isometric 45-degree camera angle, tiny glowing cube details, magical toy-like miniature world, hyper-detailed voxel construction, soft tilt-shift bokeh effect, warm ambient lighting, cozy inviting atmosphere',
      },
      {
        id: 'gta',
        name: 'GTA 아트워크 (Rockstar Loading Screen)',
        prompt: 'Bold black outlines with confident strokes, Rockstar Games loading screen art style, gritty heavily saturated textures, high-contrast dramatic lighting, urban street style atmosphere, stylized realism, GTA Vice City color grading with magenta and cyan, criminal underworld vibe',
      },
      {
        id: 'isometric',
        name: '아이소메트릭 (3D Trendy Diorama)',
        prompt: '3D isometric miniature scene, perfect orthographic camera view, clean soft studio lighting, pastel clay-like color palette, hyper-detailed 3D icon design, Apple-style minimalist aesthetic, gentle shadows, modern UI/UX illustration, cute tiny world',
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
        name: '실사화 (Hyper-Photorealistic)',
        prompt: 'Photorealistic 8k RAW photograph, shot on Sony A7R V with 85mm f/1.2 lens, hyper-detailed skin pores and textures, natural cinematic three-point lighting, shallow depth of field with creamy bokeh, professional studio photography, ultra-sharp focus on subject',
      },
      {
        id: 'hollywood',
        name: '시네마틱 영화 (Hollywood Blockbuster)',
        prompt: 'Anamorphic widescreen 2.39:1 cinematic frame, Hollywood color grading with teal and orange contrast, subtle organic film grain, dramatic three-point lighting, shot on ARRI Alexa 65 with master prime lens, high-budget theatrical production value, movie scene composition',
      },
      {
        id: 'cgi-movie',
        name: '시네마틱 3D (CGI Movie VFX)',
        prompt: 'High-budget Hollywood CGI VFX render, Unreal Engine 5.5 movie-quality, hyper-detailed environment with subsurface scattering, physics-based rendering PBR materials, cinematic atmosphere with volumetric lighting, 8k theatrical resolution, ILM/Weta level quality',
      },
      {
        id: 'joseon',
        name: '조선시대 (18세기 Historical K-Drama)',
        prompt: '18th-century Korean Joseon Dynasty historical scene, high-fidelity period webtoon aesthetic, historically accurate Hanbok with silk and cotton textures, expressive character with bold line art, traditional Hanok architecture background, warm candlelit atmosphere, vibrant saturated colors, cinematic K-drama composition',
      },
      {
        id: 'cyberpunk',
        name: '사이버펑크 (Neon Noir Dystopia)',
        prompt: 'Futuristic cyberpunk cityscape, heavy rain with neon reflections on wet pavement, atmospheric haze and volumetric fog, magenta cyan blue neon lighting, high-tech dystopian atmosphere, Blade Runner 2049 aesthetic, holographic advertisements, gritty noir mood',
      },
      {
        id: 'retro-futurism',
        name: '레트로 퓨처리즘 (Space Age 50s-60s)',
        prompt: '1950s-60s retro-futurism sci-fi aesthetic, sleek chrome and polished metal surfaces, mid-century modern atomic age design, pastel mint coral colors, vintage space age vibe, NASA-punk rocket aesthetic, optimistic future vision, Googie architecture influence',
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
        prompt: 'Fluid ethereal watercolor painting, artistic ink bleeds with controlled splashes, dreamlike transparent washes, high-quality textured cold-press paper, expressive confident brushstrokes, beautiful white space composition, museum gallery quality fine art',
      },
      {
        id: 'impasto',
        name: '임파스토 유화 (Heavy Texture Oil)',
        prompt: 'Thick impasto oil painting texture, visible bold palette knife strokes, heavy paint on stretched canvas, rich deep saturated colors, Van Gogh inspired expressionist technique, dramatic brushwork, museum quality fine art, tactile three-dimensional paint surface',
      },
      {
        id: 'pop-art',
        name: '팝아트 (Neo-Pop Warhol)',
        prompt: 'Vibrant neon pop art with bold color blocks, CMYK printing aesthetic, high-impact fashion illustration, Andy Warhol meets Roy Lichtenstein, Ben-Day dots pattern, trendy pop-culture reference, bold graphic design, street art influence',
      },
      {
        id: 'synthwave',
        name: '신스웨이브 (Retro Synth Outrun)',
        prompt: '80s retro-futurism synthwave aesthetic, neon wireframe grid landscape, glowing gradient sunset with pink purple orange, VHS analog glitch effects, chrome text effects, Outrun arcade game style, nostalgic vapor wave atmosphere',
      },
      {
        id: 'pencil-sketch',
        name: '연필 스케치 (Master Graphite)',
        prompt: 'Detailed graphite pencil drawing, professional hatching and cross-hatching technique, archival quality paper texture, architectural master sketch, subtle charcoal smudge details, hand-drawn fine art aesthetic, museum quality draftsmanship',
      },
      {
        id: 'paper-cut',
        name: '종이 오리기 (Paper-cut Diorama)',
        prompt: 'Multi-layered 3D paper cutting art, soft shadows between paper layers, tactile textured paper with visible fibers, intricate handcrafted paper engineering, beautiful paper diorama with depth, delicate paper sculpture aesthetic',
      },
      {
        id: 'amigurumi',
        name: '니트/털실 (Amigurumi Craft)',
        prompt: 'Extreme macro photography of knitted wool texture, amigurumi crocheted character, cozy soft tactile feel, vibrant yarn colors with visible stitches, warm handicraft aesthetic, adorable plush toy photography, hygge atmosphere',
      },
      {
        id: 'popup-book',
        name: '팝업북 (Magical Pop-up Book)',
        prompt: 'Open magical storybook with 3D paper elements popping out, warm golden light emanating from pages, intricate paper fold engineering, fairytale fantasy aesthetic, dramatic cinematic lighting, children book illustration, sense of wonder',
      },
      {
        id: 'neo-minimalism',
        name: '네오 미니멀리즘 (Luxury Minimal)',
        prompt: 'Extreme clean minimalism, soft gradient pastel backgrounds, geometric balance and harmony, premium luxury branding aesthetic, spacious calm composition, high-end product photography style, negative space mastery, Apple-inspired design',
      },
      {
        id: 'chaotic-packaging',
        name: '카오틱 패키징 (Maximalist Collage)',
        prompt: 'Hyper-detailed maximalist collage, chaotic stickers labels and patterns, vibrant street fashion magazine aesthetic, trendy pop-culture explosion, high-density visual chaos, Y2K scrapbook energy, overwhelming visual interest',
      },
      {
        id: 'barbiecore',
        name: '바비코어 (Plastic Surrealism)',
        prompt: 'Hyper-saturated hot pink Barbie world, surreal glossy plastic texture and materials, high-fashion doll aesthetic, dreamlike surrealist composition, ultra-feminine glamorous vibe, Barbie movie production design, plastic fantastic',
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
  
  // ========== 행동 ==========
  if (script.includes('걷') || script.includes('걸') || script.includes('산책')) {
    keywords.push('walking');
  }
  if (script.includes('뛰') || script.includes('달리')) {
    keywords.push('running');
  }
  if (script.includes('앉') || script.includes('의자')) {
    keywords.push('sitting');
  }
  if (script.includes('서') || script.includes('서있') || script.includes('일어')) {
    keywords.push('standing');
  }
  if (script.includes('말') || script.includes('대화') || script.includes('이야기') || script.includes('얘기')) {
    keywords.push('talking');
  }
  if (script.includes('먹') || script.includes('식사') || script.includes('마시')) {
    keywords.push('eating');
  }
  if (script.includes('울') || script.includes('눈물')) {
    keywords.push('crying');
  }
  if (script.includes('웃') || script.includes('미소')) {
    keywords.push('laughing smiling');
  }
  // "안기", "포옹"만 포함 (단순 "안"은 제외)
  if (script.includes('포옹') || script.includes('안기') || script.includes('안아')) {
    keywords.push('hugging');
  }
  if (script.includes('싸') || script.includes('다투')) {
    keywords.push('arguing');
  }
  // 추가: 손 흔들기, 인사
  if (script.includes('손을 흔') || script.includes('흔들') || script.includes('인사')) {
    keywords.push('waving goodbye');
  }
  // 추가: 떠나기, 떠남
  if (script.includes('떠나') || script.includes('떠났') || script.includes('출발')) {
    keywords.push('departing leaving');
  }
  // 추가: 새로운 시작
  if (script.includes('시작') || script.includes('새로운')) {
    keywords.push('new beginning');
  }
  // 추가: 마을 관련
  if (script.includes('마을') || script.includes('동네') || script.includes('주민')) {
    keywords.push('village town scene');
  }
  // 추가: 해, 아침
  if (script.includes('해가') || script.includes('해 뜨') || script.includes('떠오')) {
    keywords.push('sunrise morning');
  }
  
  // ========== 감정 ==========
  if (script.includes('행복') || script.includes('기쁨') || script.includes('좋')) {
    keywords.push('happy expression');
  }
  if (script.includes('슬') || script.includes('우울') || script.includes('속상')) {
    keywords.push('sad expression');
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
  
  // ========== 기본값 + 배경 보정 ==========
  if (keywords.length === 0) {
    keywords.push('character in colorful illustrated scene');
  }
  
  // 배경이 없으면 기본 배경 추가
  const hasBackground = keywords.some(k => 
    k.includes('interior') || k.includes('background') || k.includes('scene') || 
    k.includes('setting') || k.includes('cafe') || k.includes('office') ||
    k.includes('park') || k.includes('forest') || k.includes('beach') ||
    k.includes('city') || k.includes('street') || k.includes('school')
  );
  
  if (!hasBackground) {
    keywords.push('with colorful illustrated background');
  }
  
  return keywords.join(', ');
}

/**
 * 최종 이미지 프롬프트 생성 v3.0
 * 스마트 프롬프트 예산 분배 시스템
 * 
 * 프롬프트 구성 (우선순위 순):
 * 1. 캐릭터 일관성 (최중요 - 200자)
 * 2. 씬 설명 (중요 - 150자)  
 * 3. 스타일 프롬프트 (나머지 - 최대 400자)
 * 4. 품질 키워드 (50자)
 * 5. 일관성 키워드 (50자)
 * 
 * KIE API 최대 프롬프트 길이: 약 1000자
 */
const MAX_PROMPT_LENGTH = 900; // 안전 마진

// 예산 할당 (우선순위 기반)
const BUDGET = {
  character: 200,   // 캐릭터 일관성 (가장 중요)
  scene: 150,       // 씬 설명
  style: 400,       // 스타일 프롬프트
  quality: 50,      // 품질 키워드
  consistency: 50,  // 일관성 키워드
};

export function buildFinalPrompt(
  sceneDescription: string,
  stylePrompt: string,
  consistencySettings?: ConsistencySettings
): string {
  const parts: string[] = [];
  let usedLength = 0;
  
  // ============ 1. 캐릭터 일관성 (최우선) ============
  // 캐릭터가 없으면 다른 요소에 예산 재분배
  let characterPart = '';
  if (consistencySettings?.characterDescription) {
    characterPart = consistencySettings.characterDescription.slice(0, BUDGET.character);
    parts.push(`[Character: ${characterPart}]`);
    usedLength += characterPart.length + 15; // "[Character: ]" 오버헤드
  }
  
  // ============ 2. 씬 설명 (중요) ============
  // 한글 대본 → 영어 키워드 변환 + 원본 대본 일부 포함
  let scenePart = '';
  if (sceneDescription) {
    const englishScene = convertScriptToEnglishScene(sceneDescription);
    // 원본 대본에서 핵심 단어 추출 (50자까지)
    const koreanHint = sceneDescription.slice(0, 50);
    scenePart = `[Scene: ${englishScene}] (${koreanHint})`;
    scenePart = scenePart.slice(0, BUDGET.scene + 50); // 씬에 추가 예산
    parts.push(scenePart);
    usedLength += scenePart.length;
  }
  
  // ============ 3. 스타일 프롬프트 (남은 예산 사용) ============
  // 캐릭터/씬에서 사용하지 않은 예산을 스타일에 추가
  const unusedBudget = (BUDGET.character - (characterPart.length || 0)) + 
                       (BUDGET.scene - (scenePart.length || 0));
  const styleBudget = BUDGET.style + unusedBudget;
  
  if (stylePrompt) {
    // 스타일 프롬프트 - 씬 다음에 배치 (unshift 제거!)
    const trimmedStyle = stylePrompt.slice(0, styleBudget);
    parts.push(trimmedStyle); // 맨 뒤에 배치
    usedLength += trimmedStyle.length;
  }
  
  // ============ 4. 품질 키워드 (간소화) ============
  const qualityKeywords = 'masterpiece, 8k, highly detailed';
  parts.push(qualityKeywords);
  usedLength += qualityKeywords.length;
  
  // ============ 5. 일관성 키워드 ============
  if (characterPart) {
    parts.push('same character, consistent style');
  } else {
    parts.push('consistent style');
  }
  
  // 최종 조합 (순서: 씬 → 캐릭터 → 스타일 → 품질 → 일관성)
  let finalPrompt = parts.join(', ');
  
  // 안전망: 여전히 초과하면 자름
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`[buildFinalPrompt] 프롬프트 길이 초과: ${finalPrompt.length}자 → ${MAX_PROMPT_LENGTH}자로 자름`);
    finalPrompt = finalPrompt.slice(0, MAX_PROMPT_LENGTH);
  }
  
  // 디버그 로그
  console.log('[buildFinalPrompt] 프롬프트 구조:');
  console.log(`  1. 씬 설명: ${scenePart.slice(0, 50)}...`);
  console.log(`  2. 캐릭터: ${characterPart.slice(0, 30)}...`);
  console.log(`  3. 스타일: ${stylePrompt?.slice(0, 30) || 'N/A'}...`);
  console.log(`  - 총 길이: ${finalPrompt.length}/${MAX_PROMPT_LENGTH}자`);
  
  return finalPrompt;
}

/**
 * 네거티브 프롬프트 가져오기
 */
export function getNegativePrompt(): string {
  return NEGATIVE_PROMPT;
}

/**
 * 스타일 프롬프트에서 핵심 키워드 추출 (스타일 강화용)
 */
function extractStyleKeywords(stylePrompt: string): string {
  if (!stylePrompt) return '';
  
  const keywords: string[] = [];
  const lowerPrompt = stylePrompt.toLowerCase();
  
  // 스타일 유형 감지 및 강화 키워드 추가
  if (lowerPrompt.includes('stickman') || lowerPrompt.includes('minimalist')) {
    keywords.push('stickman style only', 'simple line art', 'no realistic rendering');
  }
  if (lowerPrompt.includes('3d') || lowerPrompt.includes('pixar') || lowerPrompt.includes('cgi')) {
    keywords.push('3D rendered', 'CGI animation style');
  }
  if (lowerPrompt.includes('2d') || lowerPrompt.includes('vector') || lowerPrompt.includes('flat')) {
    keywords.push('2D flat style', 'vector illustration');
  }
  if (lowerPrompt.includes('anime') || lowerPrompt.includes('manga') || lowerPrompt.includes('shinkai')) {
    keywords.push('anime art style', 'Japanese animation');
  }
  if (lowerPrompt.includes('webtoon') || lowerPrompt.includes('manhwa') || lowerPrompt.includes('korean')) {
    keywords.push('Korean webtoon style', 'digital manhwa');
  }
  if (lowerPrompt.includes('lego') || lowerPrompt.includes('plastic')) {
    keywords.push('LEGO brick style', 'plastic toy aesthetic');
  }
  if (lowerPrompt.includes('pixel')) {
    keywords.push('pixel art only', 'retro game style');
  }
  if (lowerPrompt.includes('watercolor') || lowerPrompt.includes('ghibli') || lowerPrompt.includes('gouache')) {
    keywords.push('hand-painted watercolor', 'Ghibli aesthetic');
  }
  if (lowerPrompt.includes('photorealistic') || lowerPrompt.includes('photograph') || lowerPrompt.includes('raw')) {
    keywords.push('ultra realistic photography', 'no illustration');
  }
  if (lowerPrompt.includes('cyberpunk') || lowerPrompt.includes('neon')) {
    keywords.push('cyberpunk aesthetic', 'neon lighting');
  }
  
  return keywords.join(', ');
}
