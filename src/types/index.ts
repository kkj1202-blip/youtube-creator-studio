// ==================== 기본 타입 ====================

export type AspectRatio = '16:9' | '9:16';

export type ImageStyle = '2d-anime' | '3d-anime' | 'realistic' | 'cartoon' | 'watercolor' | 'custom';

export type TransitionType = 'none' | 'fade' | 'slide';

export type KenBurnsEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';

// 새로운 모션 효과 타입
export type MotionEffect = 'none' | 'breathing' | 'pulse' | 'float' | 'shake' | 'parallax-soft' | 'parallax-medium' | 'parallax-strong';

export type EmotionTag = 'normal' | 'emphasis' | 'whisper' | 'excited';

export type RenderQuality = 'preview' | 'high' | 'ultra';

// TTS 엔진 타입
export type TTSEngine = 'elevenlabs' | 'edge-tts' | 'browser' | 'coqui';

// Ken Burns 세부 설정
export interface KenBurnsSettings {
  enabled: boolean;
  effect: KenBurnsEffect;
  speed: number; // 0.5 ~ 3.0 (배속)
  zoomPercent: number; // 10 ~ 50 (줌 %)
}

// 렌더링 품질 설정
export interface RenderSettings {
  quality: RenderQuality;
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  stabilization: boolean; // 화면 떨림 제거
  denoiseAudio: boolean; // 오디오 잡음 제거
  denoiseVideo: boolean; // 비디오 노이즈 제거
  sharpness: number; // 선명도 0 ~ 100
  bitrate: 'low' | 'medium' | 'high' | 'ultra';
}

// ==================== 씬 관련 타입 ====================

export interface Scene {
  id: string;
  order: number;
  script: string;
  imagePrompt?: string;
  imageUrl?: string;
  imageSource: 'generated' | 'uploaded' | 'none';
  audioUrl?: string;
  audioGenerated: boolean;
  videoUrl?: string;
  rendered: boolean;
  
  // 음성 설정
  voiceId?: string;
  voiceSpeed: number; // 0.8 ~ 1.3
  emotion: EmotionTag;
  ttsEngine: TTSEngine; // TTS 엔진 선택
  
  // 영상 설정
  imageDuration?: number; // 수동 설정 시 (초)
  postAudioGap: number; // 음성 후 여백 (초)
  transition: TransitionType;
  transitionDuration: number; // 전환 시간 (초)
  
  // Ken Burns 설정
  kenBurns: KenBurnsEffect;
  kenBurnsSpeed: number; // Ken Burns 속도 (0.5 ~ 3.0)
  kenBurnsZoom: number; // 줌 비율 (10 ~ 50%)
  
  // 모션 효과 설정
  motionEffect: MotionEffect;
  motionIntensity: number; // 모션 강도 (0.1 ~ 2.0)
  
  // 효과 조합 사용 여부
  combineEffects: boolean; // Ken Burns + Motion 동시 사용
  
  // 자막
  subtitleEnabled: boolean;
  subtitleText?: string;
  
  // 상태
  isProcessing: boolean;
  error?: string;
}

// ==================== 프로젝트 타입 ====================

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  
  // 기본 설정
  aspectRatio: AspectRatio;
  imageStyle: ImageStyle;
  customStylePrompt?: string;
  
  // 씬 목록
  scenes: Scene[];
  
  // 음성 설정
  defaultVoiceId?: string;
  defaultVoiceSpeed: number;
  defaultEmotion: EmotionTag;
  elevenLabsAccountIndex: number; // 0 또는 1
  
  // 영상 설정
  defaultTransition: TransitionType;
  defaultKenBurns: KenBurnsEffect;
  defaultKenBurnsSpeed: number;
  defaultKenBurnsZoom: number;
  defaultMotionEffect: MotionEffect;
  defaultMotionIntensity: number;
  defaultCombineEffects: boolean;
  defaultPostAudioGap: number;
  
  // TTS 설정
  defaultTTSEngine: TTSEngine;
  
  // BGM 설정
  bgmEnabled: boolean;
  bgmUrl?: string;
  bgmVolume: number; // 0 ~ 1
  
  // 자막 설정
  subtitleEnabled: boolean;
  subtitleStyle: SubtitleStyle;
  
  // 렌더링 설정
  renderSettings: RenderSettings;
  
  // 렌더링 품질 (레거시)
  renderQuality: RenderQuality;
}

// ==================== 자막 스타일 ====================

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'top' | 'center' | 'bottom';
  bold: boolean;
  italic: boolean;
  outline: boolean;
  outlineColor: string;
}

// ==================== 설정 타입 ====================

export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  isFavorite?: boolean; // 즐겨찾기 여부
  category?: string; // 카테고리 (예: 남성, 여성, 캐릭터 등)
  previewUrl?: string; // 미리듣기 URL
}

export interface ElevenLabsAccount {
  name: string;
  apiKey: string;
  voices: VoiceOption[];
  isActive: boolean; // 계정 활성화 여부
  usagePercent?: number; // 사용량 퍼센트 (선택)
}

// 커스텀 즐겨찾기 보이스 (계정 무관하게 직접 등록)
export interface FavoriteVoice {
  id: string;           // ElevenLabs Voice ID
  name: string;         // 표시 이름
  description?: string; // 설명 (예: 남성, 여성, 톤 등)
}

export interface Settings {
  // API 키
  kieApiKey: string;
  elevenLabsAccounts: ElevenLabsAccount[];
  youtubeApiKey: string;
  
  // 기본 설정
  defaultAspectRatio: AspectRatio;
  defaultImageStyle: ImageStyle;
  defaultVoiceId?: string;
  
  // 즐겨찾기 보이스 (커스텀 등록)
  favoriteVoices: FavoriteVoice[];
  
  // 마지막 사용 설정 (자동 저장)
  lastUsedSettings: {
    ttsEngine: TTSEngine;
    voiceId?: string;
    voiceSpeed: number;
    emotion: EmotionTag;
    transition: TransitionType;
    kenBurns: KenBurnsEffect;
    subtitleEnabled: boolean;
  };
  
  // 자동 저장
  autoSaveInterval: number; // 초
  maxVersionHistory: number;
}

// ==================== 템플릿 타입 ====================

export interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  
  // 설정값들
  aspectRatio: AspectRatio;
  imageStyle: ImageStyle;
  customStylePrompt?: string;
  defaultVoiceId?: string;
  defaultVoiceSpeed: number;
  defaultEmotion: EmotionTag;
  defaultTransition: TransitionType;
  defaultKenBurns: KenBurnsEffect;
  defaultPostAudioGap: number;
  bgmEnabled: boolean;
  subtitleEnabled: boolean;
  subtitleStyle: SubtitleStyle;
}

// ==================== 버전 히스토리 ====================

export interface ProjectVersion {
  id: string;
  projectId: string;
  savedAt: string;
  data: Project;
}

// ==================== API 응답 타입 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  prompt: string;
}

export interface VoiceGenerationResponse {
  audioUrl: string;
  duration: number;
}

export interface RenderResponse {
  videoUrl: string;
  duration: number;
}

// ==================== 분석 도구 타입 ====================

export interface TrendKeyword {
  keyword: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  relatedKeywords: string[];
}

export interface CommentAnalysis {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'question' | 'request';
  score: number;
  ideaExtracted?: string;
}

export interface RevenueData {
  date: string;
  adsense: number;
  sponsorship: number;
  membership: number;
  total: number;
}

export interface VideoPerformance {
  videoId: string;
  title: string;
  type: 'shorts' | 'longform';
  views: number;
  likes: number;
  comments: number;
  revenue: number;
  workHours: number;
  roi: number;
}

// ==================== 캘린더 타입 ====================

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'shorts' | 'longform' | 'idea' | 'deadline';
  description?: string;
  completed?: boolean;
}

// ==================== BGM 라이브러리 타입 ====================

export interface BGMTrack {
  id: string;
  name: string;
  artist?: string;
  duration: number;
  mood: string;
  genre: string;
  bpm?: number;
  url: string;
  previewUrl?: string;
  license?: string;
  tags: string[];
  isFavorite?: boolean;
}

// ==================== 소스 파일 관리 타입 ====================

export interface SourceFile {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'video' | 'audio' | 'other';
  size: number;
  createdAt: string;
  tags: string[];
  projectId?: string;
  used: boolean;
}

// ==================== 자막 생성 타입 ====================

export interface SubtitleWord {
  text: string;
  start: number; // ms
  end: number; // ms
  confidence: number;
  isHighlight?: boolean;
  emoji?: string;
}

export interface SubtitleSegment {
  id: string;
  text: string;
  start: number; // ms
  end: number; // ms
  words: SubtitleWord[];
  speaker?: string;
}

export interface SubtitleProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  audioUrl?: string;
  videoUrl?: string;
  segments: SubtitleSegment[];
  style: SubtitleStyle;
  aspectRatio: AspectRatio;
  highlightWords: string[]; // 강조할 단어 목록
  autoEmoji: boolean;
}

export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'json';

// ==================== 클립 추출 타입 (롱폼→쇼츠) ====================

export interface VideoClip {
  id: string;
  start: number; // ms
  end: number; // ms
  duration: number; // ms
  score: number; // 하이라이트 점수 0-100
  reason: string; // 추출 이유
  transcript?: string;
  thumbnailUrl?: string;
}

export interface ClipProject {
  id: string;
  name: string;
  sourceVideoUrl: string;
  sourceDuration: number;
  clips: VideoClip[];
  createdAt: string;
}
