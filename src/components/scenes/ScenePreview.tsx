'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Scene, SubtitleStyle } from '@/types';
import MotionEffects from './MotionEffects';

interface ScenePreviewProps {
  scene: Scene;
  aspectRatio: '16:9' | '9:16';
  subtitleStyle: SubtitleStyle;
}

const ScenePreview: React.FC<ScenePreviewProps> = ({
  scene,
  aspectRatio,
  subtitleStyle,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [time, setTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !scene.audioUrl) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [scene.audioUrl]);

  // 마우스 추적 (parallax 효과용)
  useEffect(() => {
    const motionEffect = scene.motionEffect || 'none';
    if (!motionEffect.startsWith('parallax')) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [scene.motionEffect]);

  // 시간 기반 애니메이션
  useEffect(() => {
    const motionEffect = scene.motionEffect || 'none';
    if (!isPlaying || motionEffect === 'none') return;

    const interval = setInterval(() => {
      setTime(t => t + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, scene.motionEffect]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.currentTime = 0;
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    setTime(0);
    if (isPlaying) {
      audio.play();
    }
  };

  // Ken Burns 애니메이션 스타일
  const getKenBurnsStyle = () => {
    if (!isPlaying || scene.kenBurns === 'none') return {};

    const animations: Record<string, any> = {
      'zoom-in': {
        animation: `kenburns-zoom-in ${duration}s ease-out forwards`,
      },
      'zoom-out': {
        animation: `kenburns-zoom-out ${duration}s ease-out forwards`,
      },
      'pan-left': {
        animation: `kenburns-pan-left ${duration}s ease-out forwards`,
      },
      'pan-right': {
        animation: `kenburns-pan-right ${duration}s ease-out forwards`,
      },
      'pan-up': {
        animation: `kenburns-pan-up ${duration}s ease-out forwards`,
      },
      'pan-down': {
        animation: `kenburns-pan-down ${duration}s ease-out forwards`,
      },
    };

    return animations[scene.kenBurns] || {};
  };

  // 모션 효과 스타일
  const getMotionEffectStyle = (): React.CSSProperties => {
    const motionEffect = scene.motionEffect || 'none';
    const intensity = scene.motionIntensity || 1.0;
    
    if (motionEffect === 'none' || !isPlaying) {
      return {};
    }

    const i = intensity;
    const t = time;

    switch (motionEffect) {
      case 'breathing':
        const breathScale = 1 + Math.sin(t * 0.8) * 0.02 * i;
        return {
          transform: `scale(${breathScale})`,
          transition: 'transform 0.1s ease-out',
        };

      case 'pulse':
        const pulsePhase = (t * 1.5) % (Math.PI * 2);
        const pulseScale = 1 + Math.pow(Math.sin(pulsePhase), 4) * 0.03 * i;
        return {
          transform: `scale(${pulseScale})`,
          transition: 'transform 0.05s ease-out',
        };

      case 'float':
        const floatY = Math.sin(t * 0.6) * 8 * i;
        const floatRotate = Math.sin(t * 0.4) * 1 * i;
        return {
          transform: `translateY(${floatY}px) rotate(${floatRotate}deg)`,
          transition: 'transform 0.1s ease-out',
        };

      case 'shake':
        // 시간 기반 pseudo-random으로 떨림 효과
        const shakeX = Math.sin(t * 50) * 2 * i;
        const shakeY = Math.cos(t * 47) * 2 * i;
        const shakeRotate = Math.sin(t * 43) * 0.5 * i;
        return {
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRotate}deg)`,
        };

      case 'parallax-soft':
      case 'parallax-medium':
      case 'parallax-strong':
        const parallaxIntensity = 
          motionEffect === 'parallax-soft' ? 5 :
          motionEffect === 'parallax-medium' ? 12 :
          20;
        
        const px = (mousePosition.x - 0.5) * parallaxIntensity * i;
        const py = (mousePosition.y - 0.5) * parallaxIntensity * i;
        const rotateY = (mousePosition.x - 0.5) * 10 * i;
        const rotateX = (mousePosition.y - 0.5) * -10 * i;
        
        return {
          transform: `perspective(1000px) translateX(${px}px) translateY(${py}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.05)`,
          transition: 'transform 0.15s ease-out',
        };

      case 'eye-blink':
        // 4초마다 눈 깜빡임 (밝기 변화로 표현)
        const blinkPhase = (t * 0.25) % 1; // 4초 주기
        const blink = blinkPhase > 0.95 || blinkPhase < 0.05 ? 0.9 : 1;
        return {
          filter: `brightness(${blink})`,
          transition: 'filter 0.1s ease-in-out',
        };

      case 'head-bob':
        // 고개 끄덕임 (위아래 + 미세 회전)
        const bobY = Math.sin(t * 1.2) * 3 * i;
        const bobRotate = Math.sin(t * 0.8) * 1.5 * i;
        return {
          transform: `translateY(${bobY}px) rotate(${bobRotate}deg)`,
          transition: 'transform 0.1s ease-out',
        };

      case 'subtle-life':
        // 눈깜빡임 + 호흡 + 좌우 흔들림 조합
        const lifeBreath = 1 + Math.sin(t * 0.6) * 0.015 * i;
        const lifeBlinkPhase = (t * 0.2) % 1;
        const lifeBlink = lifeBlinkPhase > 0.96 ? 0.85 : 1;
        const lifeSway = Math.sin(t * 0.4) * 2 * i;
        return {
          transform: `scale(${lifeBreath}) translateX(${lifeSway}px)`,
          filter: `brightness(${lifeBlink})`,
          transition: 'all 0.15s ease-out',
        };

      default:
        return {};
    }
  };

  // 자막 스타일
  const getSubtitleStyles = (): React.CSSProperties => {
    if (!scene.subtitleEnabled) return { display: 'none' };

    const positionStyles: Record<string, any> = {
      top: { top: '10%' },
      center: { top: '50%', transform: 'translateY(-50%)' },
      bottom: { bottom: '10%' },
    };

    return {
      position: 'absolute',
      left: '5%',
      right: '5%',
      ...positionStyles[subtitleStyle.position],
      fontFamily: subtitleStyle.fontFamily,
      fontSize: `${subtitleStyle.fontSize}px`,
      fontWeight: subtitleStyle.bold ? 'bold' : 'normal',
      fontStyle: subtitleStyle.italic ? 'italic' : 'normal',
      color: subtitleStyle.fontColor,
      backgroundColor: `${subtitleStyle.backgroundColor}${Math.round(subtitleStyle.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
      padding: '8px 16px',
      borderRadius: '8px',
      textAlign: 'center',
      textShadow: subtitleStyle.outline 
        ? `1px 1px 2px ${subtitleStyle.outlineColor}, -1px -1px 2px ${subtitleStyle.outlineColor}`
        : 'none',
      zIndex: 10,
    };
  };

  // 결합된 이미지 스타일 (Ken Burns + Motion Effect)
  const getCombinedImageStyle = (): React.CSSProperties => {
    const kenBurns = getKenBurnsStyle();
    const motionEffect = getMotionEffectStyle();
    
    // 둘 다 있으면 transform 결합
    if (kenBurns.animation && motionEffect.transform) {
      return {
        ...kenBurns,
        // Ken Burns와 Motion Effect를 함께 적용
      };
    }
    
    return { ...kenBurns, ...motionEffect };
  };

  const aspectRatioClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  const previewContent = (
    <div 
      ref={containerRef}
      className={`relative ${aspectRatioClass} bg-black rounded-lg overflow-hidden`}
      style={{ perspective: '1000px' }}
    >
      {/* 이미지 */}
      {scene.imageUrl ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={scene.imageUrl}
            alt={`씬 ${scene.order + 1}`}
            className="w-full h-full object-cover"
            style={getCombinedImageStyle()}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-card-hover">
          <p className="text-muted">이미지가 없습니다</p>
        </div>
      )}

      {/* 모션 효과 인디케이터 */}
      {scene.motionEffect && scene.motionEffect !== 'none' && isPlaying && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs flex items-center gap-1">
          ✨ {scene.motionEffect}
        </div>
      )}

      {/* 자막 */}
      {scene.subtitleEnabled && scene.script && (
        <div style={getSubtitleStyles()}>
          {scene.subtitleText || scene.script}
        </div>
      )}

      {/* 오디오 */}
      {scene.audioUrl && (
        <audio ref={audioRef} src={scene.audioUrl} preload="metadata" />
      )}

      {/* 컨트롤 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <button
            onClick={restart}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!scene.audioUrl && !scene.imageUrl}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 진행 바 */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      {previewContent}

      {/* Ken Burns 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes kenburns-zoom-in {
          0% { transform: scale(1); }
          100% { transform: scale(1.2); }
        }
        @keyframes kenburns-zoom-out {
          0% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes kenburns-pan-left {
          0% { transform: translateX(0) scale(1.1); }
          100% { transform: translateX(-10%) scale(1.1); }
        }
        @keyframes kenburns-pan-right {
          0% { transform: translateX(-10%) scale(1.1); }
          100% { transform: translateX(0) scale(1.1); }
        }
        @keyframes kenburns-pan-up {
          0% { transform: translateY(0) scale(1.1); }
          100% { transform: translateY(-10%) scale(1.1); }
        }
        @keyframes kenburns-pan-down {
          0% { transform: translateY(-10%) scale(1.1); }
          100% { transform: translateY(0) scale(1.1); }
        }
      `}</style>

      {/* 전체화면 모달 */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full max-w-4xl p-4">
              {previewContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ScenePreview;
