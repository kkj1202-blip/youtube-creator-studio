/**
 * 공통 옵션 상수
 * 여러 컴포넌트에서 중복 사용되던 옵션들을 통합
 */

import type { EmotionTag, TransitionType, KenBurnsEffect, MotionEffect, TTSEngine } from '@/types';

// ==================== 감정 옵션 ====================
export const emotionOptions: Array<{ value: EmotionTag; label: string }> = [
  { value: 'normal', label: '일반' },
  { value: 'emphasis', label: '강조' },
  { value: 'whisper', label: '속삭임' },
  { value: 'excited', label: '흥분' },
];

// ==================== 전환 효과 옵션 ====================
export const transitionOptions: Array<{ value: TransitionType; label: string }> = [
  { value: 'none', label: '없음' },
  { value: 'fade', label: '페이드' },
  { value: 'slide', label: '슬라이드' },
];

// ==================== Ken Burns 효과 옵션 ====================
export const kenBurnsOptions: Array<{ value: KenBurnsEffect; label: string }> = [
  { value: 'none', label: '없음' },
  { value: 'random', label: '🎲 랜덤 (매번 다른 효과)' },
  { value: 'zoom-in', label: '🔍 줌 인' },
  { value: 'zoom-out', label: '🔎 줌 아웃' },
  { value: 'pan-left', label: '⬅️ 왼쪽 패닝' },
  { value: 'pan-right', label: '➡️ 오른쪽 패닝' },
  { value: 'pan-up', label: '⬆️ 위로 패닝' },
  { value: 'pan-down', label: '⬇️ 아래로 패닝' },
];

// 간소화된 버전 (ProjectSettings용)
export const kenBurnsOptionsSimple: Array<{ value: KenBurnsEffect; label: string }> = [
  { value: 'none', label: '없음' },
  { value: 'zoom-in', label: '줌 인' },
  { value: 'zoom-out', label: '줌 아웃' },
  { value: 'pan-left', label: '왼쪽 패닝' },
  { value: 'pan-right', label: '오른쪽 패닝' },
];

// ==================== 모션 효과 옵션 ====================
export const motionEffectOptions: Array<{ value: MotionEffect; label: string }> = [
  { value: 'none', label: '없음' },
  { value: 'breathing', label: '🫁 호흡 효과 (부드러운 확대/축소)' },
  { value: 'pulse', label: '💓 펄스 효과 (심장 박동)' },
  { value: 'float', label: '🎈 떠다니기 (상하 움직임)' },
  { value: 'shake', label: '📳 미세 흔들림' },
  { value: 'parallax-soft', label: '🎭 3D 효과 (약하게)' },
  { value: 'parallax-medium', label: '🎭 3D 효과 (보통)' },
  { value: 'parallax-strong', label: '🎭 3D 효과 (강하게)' },
];

// ==================== TTS 엔진 옵션 ====================
export const ttsEngineOptions: Array<{ value: TTSEngine; label: string }> = [
  { value: 'edge-tts', label: '🆓 Edge TTS (무료, 한국어)' },
  { value: 'elevenlabs', label: '💎 ElevenLabs (유료, 고품질)' },
  { value: 'browser', label: '🌐 브라우저 TTS (무료, 즉시)' },
];

// ==================== 무료 한국어 보이스 (Edge TTS) ====================
export const freeKoreanVoices: Array<{ value: string; label: string }> = [
  { value: 'ko-KR-SunHiNeural', label: '선희 (여성, 밝은)' },
  { value: 'ko-KR-InJoonNeural', label: '인준 (남성, 전문적)' },
  { value: 'ko-KR-BongJinNeural', label: '봉진 (남성, 따뜻한)' },
  { value: 'ko-KR-GookMinNeural', label: '국민 (남성, 차분한)' },
  { value: 'ko-KR-JiMinNeural', label: '지민 (여성, 활발한)' },
  { value: 'ko-KR-SeoHyeonNeural', label: '서현 (여성, 차분한)' },
  { value: 'ko-KR-YuJinNeural', label: '유진 (여성, 젊은)' },
];

// ==================== 화면 비율 옵션 ====================
export const aspectRatioOptions: Array<{ value: '16:9' | '9:16'; label: string }> = [
  { value: '16:9', label: '16:9 (롱폼 - 가로)' },
  { value: '9:16', label: '9:16 (쇼츠 - 세로)' },
];

// ==================== 이미지 스타일 옵션 ====================
export const imageStyleOptions: Array<{ value: string; label: string }> = [
  { value: '2d-anime', label: '2D 애니메이션' },
  { value: '3d-anime', label: '3D 애니메이션' },
  { value: 'realistic', label: '실사/사실적' },
  { value: 'cartoon', label: '카툰' },
  { value: 'watercolor', label: '수채화' },
  { value: 'custom', label: '커스텀 (직접 입력)' },
];

// ==================== 렌더링 품질 옵션 ====================
export const renderQualityOptions: Array<{ value: 'preview' | 'high'; label: string }> = [
  { value: 'preview', label: '미리보기 (480p, 빠름)' },
  { value: 'high', label: '고화질 (1080p)' },
];
