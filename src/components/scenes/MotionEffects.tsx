'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { MotionEffect } from '@/types';

interface MotionEffectsProps {
  imageUrl: string;
  effect: MotionEffect;
  intensity: number;
  isPlaying: boolean;
  duration: number;
  className?: string;
  aspectRatio?: '16:9' | '9:16';
}

/**
 * 이미지에 다양한 모션 효과를 적용하는 컴포넌트
 * 
 * 효과 종류:
 * - breathing: 호흡하듯 살짝 확대/축소 반복
 * - pulse: 펄스처럼 박동하는 효과
 * - float: 위아래로 둥둥 떠다니는 효과
 * - shake: 미세한 흔들림
 * - parallax-*: 마우스/시간에 따른 3D 효과
 */
const MotionEffects: React.FC<MotionEffectsProps> = ({
  imageUrl,
  effect,
  intensity,
  isPlaying,
  duration,
  className = '',
  aspectRatio = '16:9',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [time, setTime] = useState(0);

  // 마우스 추적 (parallax 효과용)
  useEffect(() => {
    if (!effect.startsWith('parallax')) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [effect]);

  // 시간 기반 애니메이션
  useEffect(() => {
    if (!isPlaying || effect === 'none') return;

    const interval = setInterval(() => {
      setTime(t => t + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, effect]);

  // 효과별 스타일 계산
  const getEffectStyle = (): React.CSSProperties => {
    if (effect === 'none' || !isPlaying) {
      return {};
    }

    const i = intensity;
    const t = time;

    switch (effect) {
      case 'breathing':
        // 호흡 효과: 느린 확대/축소 반복
        const breathScale = 1 + Math.sin(t * 0.8) * 0.02 * i;
        return {
          transform: `scale(${breathScale})`,
          transition: 'transform 0.1s ease-out',
        };

      case 'pulse':
        // 펄스 효과: 심장 박동처럼 빠른 확대 후 천천히 축소
        const pulsePhase = (t * 1.5) % (Math.PI * 2);
        const pulseScale = 1 + Math.pow(Math.sin(pulsePhase), 4) * 0.03 * i;
        return {
          transform: `scale(${pulseScale})`,
          transition: 'transform 0.05s ease-out',
        };

      case 'float':
        // 떠다니는 효과: 상하 + 약간의 회전
        const floatY = Math.sin(t * 0.6) * 8 * i;
        const floatRotate = Math.sin(t * 0.4) * 1 * i;
        return {
          transform: `translateY(${floatY}px) rotate(${floatRotate}deg)`,
          transition: 'transform 0.1s ease-out',
        };

      case 'shake':
        // 미세한 흔들림
        const shakeX = (Math.random() - 0.5) * 2 * i;
        const shakeY = (Math.random() - 0.5) * 2 * i;
        const shakeRotate = (Math.random() - 0.5) * 0.5 * i;
        return {
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRotate}deg)`,
        };

      case 'parallax-soft':
      case 'parallax-medium':
      case 'parallax-strong':
        // Parallax 3D 효과
        const parallaxIntensity = 
          effect === 'parallax-soft' ? 5 :
          effect === 'parallax-medium' ? 12 :
          20;
        
        const px = (mousePosition.x - 0.5) * parallaxIntensity * i;
        const py = (mousePosition.y - 0.5) * parallaxIntensity * i;
        const rotateY = (mousePosition.x - 0.5) * 10 * i;
        const rotateX = (mousePosition.y - 0.5) * -10 * i;
        
        return {
          transform: `perspective(1000px) translateX(${px}px) translateY(${py}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.05)`,
          transition: 'transform 0.15s ease-out',
        };

      default:
        return {};
    }
  };

  // Parallax 레이어 효과 (여러 레이어로 깊이감 표현)
  const renderParallaxLayers = () => {
    if (!effect.startsWith('parallax') || !isPlaying) {
      return (
        <img
          src={imageUrl}
          alt="Scene"
          className="w-full h-full object-cover"
          style={getEffectStyle()}
        />
      );
    }

    const parallaxIntensity = 
      effect === 'parallax-soft' ? 1 :
      effect === 'parallax-medium' ? 2 :
      3;

    // 3개 레이어로 깊이감 표현
    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* 배경 레이어 (느리게 움직임) */}
        <div
          className="absolute inset-[-20px]"
          style={{
            transform: `translate(${(mousePosition.x - 0.5) * 10 * parallaxIntensity * intensity}px, ${(mousePosition.y - 0.5) * 10 * parallaxIntensity * intensity}px)`,
            transition: 'transform 0.3s ease-out',
            filter: 'blur(2px)',
          }}
        >
          <img
            src={imageUrl}
            alt="Background"
            className="w-full h-full object-cover scale-110"
          />
        </div>

        {/* 중간 레이어 */}
        <div
          className="absolute inset-[-10px]"
          style={{
            transform: `translate(${(mousePosition.x - 0.5) * 20 * parallaxIntensity * intensity}px, ${(mousePosition.y - 0.5) * 20 * parallaxIntensity * intensity}px)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Middle"
            className="w-full h-full object-cover scale-105"
            style={{ opacity: 0.7 }}
          />
        </div>

        {/* 전경 레이어 (빠르게 움직임) */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${(mousePosition.x - 0.5) * 30 * parallaxIntensity * intensity}px, ${(mousePosition.y - 0.5) * 30 * parallaxIntensity * intensity}px) scale(1.02)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Foreground"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  };

  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectClass} ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {effect.startsWith('parallax') ? (
        renderParallaxLayers()
      ) : (
        <img
          src={imageUrl}
          alt="Scene"
          className="w-full h-full object-cover"
          style={getEffectStyle()}
        />
      )}
    </div>
  );
};

export default MotionEffects;

// CSS 애니메이션 키프레임 (글로벌 스타일용)
export const motionEffectStyles = `
  @keyframes breathing {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    15% { transform: scale(1.05); }
    30% { transform: scale(1); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-8px) rotate(1deg); }
    75% { transform: translateY(8px) rotate(-1deg); }
  }

  @keyframes shake {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    10% { transform: translate(-1px, -1px) rotate(-0.5deg); }
    20% { transform: translate(1px, 0) rotate(0.5deg); }
    30% { transform: translate(-1px, 1px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(0.5deg); }
    50% { transform: translate(-1px, 0) rotate(-0.5deg); }
    60% { transform: translate(1px, 1px) rotate(0deg); }
    70% { transform: translate(0, -1px) rotate(-0.5deg); }
    80% { transform: translate(-1px, 0) rotate(0.5deg); }
    90% { transform: translate(1px, 1px) rotate(0deg); }
  }

  .motion-breathing {
    animation: breathing 4s ease-in-out infinite;
  }

  .motion-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .motion-float {
    animation: float 6s ease-in-out infinite;
  }

  .motion-shake {
    animation: shake 0.5s ease-in-out infinite;
  }
`;
