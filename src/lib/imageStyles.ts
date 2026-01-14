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
        name: '졸라맨 (Premium Expressive Stickman)',
        prompt: 'Premium minimalist stickman character with highly expressive integrated facial features, sleek fluid motion lines suggesting movement, clean professional 2D motion graphics aesthetic, pure vector art on clean dark studio background, dynamic action poses, cinematic single-point lighting highlighting character form, bold contrasting colors',
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
 * 최종 이미지 프롬프트 생성 v2.0
 * 스타일 프롬프트 + 품질 접미사 + 일관성 설정 + 씬 설명을 조합
 * KIE API 최대 프롬프트 길이: 약 1000자
 */
const MAX_PROMPT_LENGTH = 950; // 여유분 포함

export function buildFinalPrompt(
  sceneDescription: string,
  stylePrompt: string,
  consistencySettings?: ConsistencySettings
): string {
  const parts: string[] = [];
  
  // 1. 스타일 프롬프트 (가장 중요 - 맨 앞에 배치)
  if (stylePrompt) {
    parts.push(stylePrompt);
  }
  
  // 2. 품질 접미사 자동 추가
  parts.push(QUALITY_SUFFIX);
  
  // 3. 스타일 강조 키워드
  const styleKeywords = extractStyleKeywords(stylePrompt);
  if (styleKeywords) {
    parts.push(styleKeywords);
  }
  
  // 4. 캐릭터 일관성 정보 (최대 150자)
  if (consistencySettings?.characterDescription) {
    const charDesc = consistencySettings.characterDescription.slice(0, 150);
    parts.push(`same character: ${charDesc}`);
  }
  
  // 5. 씬 설명 (한글 대본을 영어로 변환)
  if (sceneDescription) {
    const englishScene = convertScriptToEnglishScene(sceneDescription);
    parts.push(englishScene);
  }
  
  // 6. 일관성 강화 키워드
  parts.push('consistent style throughout, same art direction');
  
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
