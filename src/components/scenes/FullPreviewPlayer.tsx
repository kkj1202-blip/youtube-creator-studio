'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useStore } from '@/store/useStore';
import type { Scene, Project } from '@/types';

interface FullPreviewPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FullPreviewPlayer: React.FC<FullPreviewPlayerProps> = ({ isOpen, onClose }) => {
  const { currentProject } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scenes = currentProject?.scenes || [];
  
  // 각 씬의 예상 시간 계산 (초 단위)
  const getSceneDuration = (scene: Scene): number => {
    // 기본 5초, 스크립트 길이에 따라 조정
    const baseDuration = 5;
    const scriptDuration = scene.script ? Math.ceil(scene.script.length / 15) : 0;
    const imageDuration = scene.imageDuration || 0;
    const postGap = scene.postAudioGap || 0.5;
    return Math.max(baseDuration, scriptDuration) + imageDuration + postGap;
  };

  // 전체 영상 길이
  const totalDuration = scenes.reduce((sum, scene) => sum + getSceneDuration(scene), 0);

  // 각 씬의 시작 시간
  const sceneStartTimes = scenes.reduce<number[]>((acc, scene, i) => {
    if (i === 0) return [0];
    return [...acc, acc[i - 1] + getSceneDuration(scenes[i - 1])];
  }, []);

  // 현재 씬 결정
  useEffect(() => {
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (currentTime >= sceneStartTimes[i]) {
        if (currentSceneIndex !== i) {
          setCurrentSceneIndex(i);
        }
        break;
      }
    }
  }, [currentTime, sceneStartTimes, currentSceneIndex, scenes.length]);

  // 재생/일시정지
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // 타이머 관리
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // 컨트롤 자동 숨김
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // 시간 포맷
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 씬 이동
  const goToScene = (index: number) => {
    if (index >= 0 && index < scenes.length) {
      setCurrentTime(sceneStartTimes[index]);
      setCurrentSceneIndex(index);
    }
  };

  // 이전 씬
  const prevScene = () => {
    goToScene(currentSceneIndex - 1);
  };

  // 다음 씬
  const nextScene = () => {
    goToScene(currentSceneIndex + 1);
  };

  // 시크바 클릭
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    setCurrentTime(percentage * totalDuration);
  };

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          setCurrentTime(prev => Math.max(0, prev - 5));
          break;
        case 'ArrowRight':
          setCurrentTime(prev => Math.min(totalDuration, prev + 5));
          break;
        case 'ArrowUp':
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
          setIsMuted(prev => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePlay, totalDuration, isFullscreen, onClose]);

  const currentScene = scenes[currentSceneIndex];

  // 전환 효과 스타일
  const getTransitionStyle = (scene: Scene) => {
    switch (scene.transition) {
      case 'fade':
        return { opacity: 1, transition: 'opacity 0.5s ease' };
      case 'slide':
        return { transform: 'translateX(0)', transition: 'transform 0.5s ease' };
      default:
        return {};
    }
  };

  if (!currentProject || scenes.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="미리보기" size="lg">
        <div className="text-center py-12 text-muted">
          <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>미리볼 씬이 없습니다.</p>
          <p className="text-sm">씬을 먼저 추가해주세요.</p>
        </div>
      </Modal>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
          ref={containerRef}
          onMouseMove={handleMouseMove}
        >
          {/* 메인 비디오 영역 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`relative ${
                currentProject.aspectRatio === '9:16' 
                  ? 'h-full aspect-[9/16]' 
                  : 'w-full aspect-video max-h-full'
              } bg-gray-900 overflow-hidden`}
            >
              {/* 배경 이미지 */}
              {currentScene?.imageUrl ? (
                <motion.img
                  key={currentScene.id}
                  src={currentScene.imageUrl}
                  alt={`Scene ${currentSceneIndex + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ 
                    opacity: 1, 
                    scale: currentScene.kenBurns !== 'none' ? [1, 1.1] : 1,
                  }}
                  transition={{ 
                    opacity: { duration: 0.5 },
                    scale: { duration: getSceneDuration(currentScene), ease: 'linear' }
                  }}
                  style={getTransitionStyle(currentScene)}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-6xl opacity-50">🎬</span>
                </div>
              )}

              {/* 자막 오버레이 */}
              {currentScene?.subtitleEnabled && currentScene?.script && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-16 left-4 right-4"
                >
                  <div
                    className="mx-auto max-w-3xl px-6 py-3 rounded-lg text-center"
                    style={{
                      backgroundColor: `${currentProject.subtitleStyle?.backgroundColor || '#000000'}${
                        Math.round((currentProject.subtitleStyle?.backgroundOpacity || 0.7) * 255).toString(16).padStart(2, '0')
                      }`,
                      fontFamily: currentProject.subtitleStyle?.fontFamily || 'Noto Sans KR',
                      fontSize: `${(currentProject.subtitleStyle?.fontSize || 24)}px`,
                      color: currentProject.subtitleStyle?.fontColor || '#ffffff',
                      fontWeight: currentProject.subtitleStyle?.bold ? 'bold' : 'normal',
                    }}
                  >
                    {currentScene.script}
                  </div>
                </motion.div>
              )}

              {/* 씬 번호 표시 */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                씬 {currentSceneIndex + 1} / {scenes.length}
              </div>
            </div>
          </div>

          {/* 컨트롤 오버레이 */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                {/* 상단 바 */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        icon={<X className="w-5 h-5" />}
                        className="text-white hover:bg-white/20"
                      >
                        닫기
                      </Button>
                      <span className="text-white font-medium">
                        {currentProject.name} - 미리보기
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        총 {formatTime(totalDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 중앙 재생 버튼 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white ml-1" />
                    )}
                  </button>
                </div>

                {/* 하단 컨트롤 */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto">
                  {/* 타임라인 */}
                  <div className="mb-4">
                    {/* 씬 마커 */}
                    <div className="relative h-2 mb-1">
                      {sceneStartTimes.map((startTime, i) => (
                        <div
                          key={i}
                          className="absolute top-0 w-0.5 h-full bg-white/30"
                          style={{ left: `${(startTime / totalDuration) * 100}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* 시크바 */}
                    <div
                      className="relative h-2 bg-white/20 rounded-full cursor-pointer group"
                      onClick={handleSeek}
                    >
                      {/* 버퍼/로드 표시 */}
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                      
                      {/* 진행 바 */}
                      <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full"
                        style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                      />
                      
                      {/* 핸들 */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${(currentTime / totalDuration) * 100}% - 8px)` }}
                      />
                    </div>

                    {/* 시간 표시 */}
                    <div className="flex justify-between mt-1 text-xs text-white/70">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                  </div>

                  {/* 버튼 컨트롤 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevScene}
                        disabled={currentSceneIndex === 0}
                        icon={<SkipBack className="w-5 h-5" />}
                        className="text-white hover:bg-white/20"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlay}
                        icon={isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        className="text-white hover:bg-white/20"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextScene}
                        disabled={currentSceneIndex === scenes.length - 1}
                        icon={<SkipForward className="w-5 h-5" />}
                        className="text-white hover:bg-white/20"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      {/* 볼륨 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(prev => !prev)}
                          className="text-white hover:text-primary transition-colors"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            setVolume(parseFloat(e.target.value));
                            setIsMuted(false);
                          }}
                          className="w-20 accent-primary"
                        />
                      </div>

                      {/* 전체화면 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        icon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        className="text-white hover:bg-white/20"
                      />
                    </div>
                  </div>
                </div>

                {/* 씬 네비게이션 (좌측) */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                  <button
                    onClick={prevScene}
                    disabled={currentSceneIndex === 0}
                    className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>

                {/* 씬 네비게이션 (우측) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                  <button
                    onClick={nextScene}
                    disabled={currentSceneIndex === scenes.length - 1}
                    className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 씬 썸네일 바 */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto"
              >
                <div className="flex gap-2 p-2 bg-black/80 rounded-lg backdrop-blur">
                  {scenes.map((scene, i) => (
                    <button
                      key={scene.id}
                      onClick={() => goToScene(i)}
                      className={`relative w-16 h-9 rounded overflow-hidden border-2 transition-colors ${
                        i === currentSceneIndex ? 'border-primary' : 'border-transparent hover:border-white/50'
                      }`}
                    >
                      {scene.imageUrl ? (
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs text-white">
                          {i + 1}
                        </div>
                      )}
                      {i === currentSceneIndex && (
                        <div className="absolute inset-0 bg-primary/30" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 숨겨진 오디오 요소 */}
          <audio ref={audioRef} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullPreviewPlayer;
