'use client';

import React, { useState, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Modal, Select } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  Download,
  Search,
  Heart,
  HeartOff,
  Clock,
  Volume2,
  VolumeX,
  Shuffle,
  Filter,
  Sparkles,
  TrendingUp,
  Zap,
  Coffee,
  Smile,
  Frown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Plus,
  Headphones,
  SkipBack,
  SkipForward,
  Repeat,
  ListMusic,
} from 'lucide-react';
import type { BGMTrack } from '@/types';

// 장르/분위기 옵션
const genres = [
  { value: 'all', label: '전체', icon: '🎵' },
  { value: 'cinematic', label: '시네마틱', icon: '🎬' },
  { value: 'upbeat', label: '업비트', icon: '🎉' },
  { value: 'chill', label: '칠/로파이', icon: '☕' },
  { value: 'dramatic', label: '드라마틱', icon: '🎭' },
  { value: 'happy', label: '밝은/경쾌', icon: '😊' },
  { value: 'sad', label: '감성/슬픔', icon: '😢' },
  { value: 'epic', label: '에픽/웅장', icon: '⚔️' },
  { value: 'corporate', label: '기업/프로', icon: '💼' },
  { value: 'electronic', label: '일렉트로닉', icon: '🎧' },
];

const moods = [
  { value: 'all', label: '전체 분위기' },
  { value: 'energetic', label: '에너지틱' },
  { value: 'relaxing', label: '편안한' },
  { value: 'inspiring', label: '영감 주는' },
  { value: 'mysterious', label: '미스터리' },
  { value: 'romantic', label: '로맨틱' },
  { value: 'tense', label: '긴장감' },
  { value: 'playful', label: '장난스러운' },
];

// 데모 BGM 데이터
const demoBGMTracks: BGMTrack[] = [
  { 
    id: '1', 
    name: 'Cinematic Inspire', 
    duration: 185, 
    genre: 'cinematic', 
    mood: 'inspiring', 
    bpm: 90, 
    url: '/demo-bgm/cinematic-inspire.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['오프닝', '인트로', '다큐멘터리']
  },
  { 
    id: '2', 
    name: 'Upbeat Energy', 
    duration: 142, 
    genre: 'upbeat', 
    mood: 'energetic', 
    bpm: 128, 
    url: '/demo-bgm/upbeat-energy.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC BY',
    tags: ['쇼츠', '활기찬', '스포츠']
  },
  { 
    id: '3', 
    name: 'Lofi Chill Beats', 
    duration: 210, 
    genre: 'chill', 
    mood: 'relaxing', 
    bpm: 75, 
    url: '/demo-bgm/lofi-chill.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['브이로그', '일상', '카페']
  },
  { 
    id: '4', 
    name: 'Epic Adventure', 
    duration: 220, 
    genre: 'epic', 
    mood: 'inspiring', 
    bpm: 110, 
    url: '/demo-bgm/epic-adventure.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['게임', '모험', '트레일러']
  },
  { 
    id: '5', 
    name: 'Corporate Success', 
    duration: 165, 
    genre: 'corporate', 
    mood: 'inspiring', 
    bpm: 100, 
    url: '/demo-bgm/corporate-success.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC BY',
    tags: ['프레젠테이션', '비즈니스', '기업']
  },
  { 
    id: '6', 
    name: 'Happy Days', 
    duration: 155, 
    genre: 'happy', 
    mood: 'playful', 
    bpm: 120, 
    url: '/demo-bgm/happy-days.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['가족', '아이들', '밝은']
  },
  { 
    id: '7', 
    name: 'Emotional Piano', 
    duration: 195, 
    genre: 'sad', 
    mood: 'romantic', 
    bpm: 70, 
    url: '/demo-bgm/emotional-piano.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['감성', '피아노', '회상']
  },
  { 
    id: '8', 
    name: 'Tension Rising', 
    duration: 180, 
    genre: 'dramatic', 
    mood: 'tense', 
    bpm: 95, 
    url: '/demo-bgm/tension-rising.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC BY',
    tags: ['서스펜스', '긴장', '미스터리']
  },
  { 
    id: '9', 
    name: 'Electronic Future', 
    duration: 175, 
    genre: 'electronic', 
    mood: 'energetic', 
    bpm: 140, 
    url: '/demo-bgm/electronic-future.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['테크', 'EDM', '미래']
  },
  { 
    id: '10', 
    name: 'Mystery Ambient', 
    duration: 240, 
    genre: 'cinematic', 
    mood: 'mysterious', 
    bpm: 60, 
    url: '/demo-bgm/mystery-ambient.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['미스터리', '배경', '앰비언트']
  },
  { 
    id: '11', 
    name: 'Vlog Sunny Day', 
    duration: 168, 
    genre: 'happy', 
    mood: 'relaxing', 
    bpm: 95, 
    url: '/demo-bgm/vlog-sunny.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC0',
    tags: ['브이로그', '여행', '밝은']
  },
  { 
    id: '12', 
    name: 'Action Trailer', 
    duration: 150, 
    genre: 'epic', 
    mood: 'energetic', 
    bpm: 135, 
    url: '/demo-bgm/action-trailer.mp3',
    previewUrl: '/demo-audio.mp3',
    license: 'CC BY',
    tags: ['액션', '트레일러', '강렬']
  },
];

// 효과음 데이터
const soundEffects = [
  { id: 'sfx1', name: '전환음 - 우쉬', category: 'transition', duration: 1.2 },
  { id: 'sfx2', name: '팝 사운드', category: 'transition', duration: 0.5 },
  { id: 'sfx3', name: '성공 알림', category: 'notification', duration: 1.0 },
  { id: 'sfx4', name: '실패 알림', category: 'notification', duration: 0.8 },
  { id: 'sfx5', name: '타이핑 소리', category: 'ambient', duration: 2.5 },
  { id: 'sfx6', name: '카메라 셔터', category: 'ui', duration: 0.3 },
  { id: 'sfx7', name: '하이라이트', category: 'highlight', duration: 1.5 },
  { id: 'sfx8', name: '드럼롤', category: 'transition', duration: 3.0 },
];

export default function BgmPage() {
  const [tracks, setTracks] = useState<BGMTrack[]>(demoBGMTracks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedMood, setSelectedMood] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['1', '3', '6']));
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(['3', '1', '5']);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<BGMTrack | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'bgm' | 'sfx'>('bgm');
  const [aiPrompt, setAIPrompt] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 필터링된 트랙
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      const matchesSearch = searchQuery === '' || 
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
      const matchesMood = selectedMood === 'all' || track.mood === selectedMood;
      return matchesSearch && matchesGenre && matchesMood;
    });
  }, [tracks, searchQuery, selectedGenre, selectedMood]);

  // 추천 트랙 (인기 기반)
  const recommendedTracks = useMemo(() => {
    return tracks.filter(t => favorites.has(t.id) || recentlyUsed.includes(t.id)).slice(0, 4);
  }, [tracks, favorites, recentlyUsed]);

  // 시간 포맷
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 재생/일시정지
  const togglePlay = (trackId: string, previewUrl?: string) => {
    if (currentlyPlaying === trackId) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = previewUrl || '/demo-audio.mp3';
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.play();
      }
      setCurrentlyPlaying(trackId);
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = (trackId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(trackId)) {
      newFavorites.delete(trackId);
    } else {
      newFavorites.add(trackId);
    }
    setFavorites(newFavorites);
  };

  // 다운로드 처리
  const handleDownload = (track: BGMTrack) => {
    setSelectedTrack(track);
    setShowDownloadModal(true);
    // 최근 사용에 추가
    setRecentlyUsed(prev => [track.id, ...prev.filter(id => id !== track.id)].slice(0, 10));
  };

  // AI 추천 처리
  const handleAIRecommend = () => {
    // 실제 구현 시 AI API 호출
    console.log('AI 추천 요청:', aiPrompt);
    setShowAIModal(false);
    setAIPrompt('');
  };

  // 장르 아이콘
  const getGenreIcon = (genre: string) => {
    const genreData = genres.find(g => g.value === genre);
    return genreData?.icon || '🎵';
  };

  // 라이선스 배지
  const getLicenseBadge = (license: string) => {
    switch (license) {
      case 'CC0':
        return <span className="px-1.5 py-0.5 text-xs bg-success/20 text-success rounded">CC0</span>;
      case 'CC BY':
        return <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">CC BY</span>;
      default:
        return <span className="px-1.5 py-0.5 text-xs bg-muted/20 text-muted rounded">{license}</span>;
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          onEnded={() => setCurrentlyPlaying(null)}
        />

        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                🎵 BGM & 효과음 라이브러리
              </h1>
              <p className="text-muted">
                저작권 걱정 없는 무료 음원을 찾아보세요
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIModal(true)}
                icon={<Sparkles className="w-4 h-4" />}
              >
                AI 추천
              </Button>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'bgm' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('bgm')}
              icon={<Music className="w-4 h-4" />}
            >
              배경음악
            </Button>
            <Button
              variant={activeTab === 'sfx' ? 'primary' : 'ghost'}
              onClick={() => setActiveTab('sfx')}
              icon={<Zap className="w-4 h-4" />}
            >
              효과음
            </Button>
          </div>

          {/* 장르 필터 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {genres.map(genre => (
              <button
                key={genre.value}
                onClick={() => setSelectedGenre(genre.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedGenre === genre.value
                    ? 'bg-primary text-white'
                    : 'bg-card hover:bg-card-hover text-foreground'
                }`}
              >
                <span>{genre.icon}</span>
                <span className="text-sm">{genre.label}</span>
              </button>
            ))}
          </div>

          {/* 검색 및 필터 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="음악 이름, 태그로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={selectedMood}
              onChange={setSelectedMood}
              options={moods}
            />
            <div className="flex items-center gap-2 px-3 bg-card rounded-lg border border-border">
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-muted" />
                ) : (
                  <Volume2 className="w-4 h-4 text-foreground" />
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
                  if (audioRef.current) {
                    audioRef.current.volume = parseFloat(e.target.value);
                  }
                }}
                className="w-20 accent-primary"
              />
            </div>
          </div>
        </div>

        {/* BGM 탭 */}
        {activeTab === 'bgm' && (
          <div className="flex-1 overflow-auto space-y-6">
            {/* 추천 섹션 */}
            {recommendedTracks.length > 0 && !searchQuery && selectedGenre === 'all' && (
              <div>
                <h2 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  추천 & 최근 사용
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {recommendedTracks.map(track => (
                    <Card key={track.id} className="p-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{getGenreIcon(track.genre)}</span>
                        <button onClick={() => toggleFavorite(track.id)}>
                          {favorites.has(track.id) ? (
                            <Heart className="w-4 h-4 text-error fill-error" />
                          ) : (
                            <HeartOff className="w-4 h-4 text-muted" />
                          )}
                        </button>
                      </div>
                      <p className="font-medium text-sm truncate mb-1">{track.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">{formatDuration(track.duration)}</span>
                        <button
                          onClick={() => togglePlay(track.id, track.previewUrl)}
                          className="p-1.5 rounded-full bg-primary text-white hover:bg-primary-hover"
                        >
                          {currentlyPlaying === track.id ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 전체 목록 */}
            <div>
              <h2 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
                <ListMusic className="w-4 h-4" />
                {selectedGenre === 'all' ? '전체' : genres.find(g => g.value === selectedGenre)?.label} 음악
                <span className="ml-1 text-xs">({filteredTracks.length})</span>
              </h2>
              
              <Card className="overflow-hidden">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-12 gap-2 p-3 bg-card-hover text-sm font-medium text-muted border-b border-border">
                  <div className="col-span-1"></div>
                  <div className="col-span-4">제목</div>
                  <div className="col-span-2">장르</div>
                  <div className="col-span-1 text-center">BPM</div>
                  <div className="col-span-1 text-center">길이</div>
                  <div className="col-span-1">라이선스</div>
                  <div className="col-span-2"></div>
                </div>

                {/* 트랙 리스트 */}
                <div className="divide-y divide-border">
                  {filteredTracks.map(track => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`grid grid-cols-12 gap-2 p-3 items-center hover:bg-card-hover transition-colors ${
                        currentlyPlaying === track.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* 재생 버튼 */}
                      <div className="col-span-1">
                        <button
                          onClick={() => togglePlay(track.id, track.previewUrl)}
                          className={`p-2 rounded-full transition-colors ${
                            currentlyPlaying === track.id 
                              ? 'bg-primary text-white' 
                              : 'bg-card-hover hover:bg-primary/20'
                          }`}
                        >
                          {currentlyPlaying === track.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* 제목 & 태그 */}
                      <div className="col-span-4">
                        <p className="font-medium text-sm">{track.name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {track.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-card-hover rounded text-muted">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 장르 */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span>{getGenreIcon(track.genre)}</span>
                        <span className="text-sm capitalize">
                          {genres.find(g => g.value === track.genre)?.label}
                        </span>
                      </div>

                      {/* BPM */}
                      <div className="col-span-1 text-center text-sm text-muted">
                        {track.bpm}
                      </div>

                      {/* 길이 */}
                      <div className="col-span-1 text-center text-sm text-muted">
                        {formatDuration(track.duration)}
                      </div>

                      {/* 라이선스 */}
                      <div className="col-span-1">
                        {getLicenseBadge(track.license || 'CC0')}
                      </div>

                      {/* 액션 */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleFavorite(track.id)}
                          className="p-1.5 hover:bg-card rounded"
                        >
                          {favorites.has(track.id) ? (
                            <Heart className="w-4 h-4 text-error fill-error" />
                          ) : (
                            <HeartOff className="w-4 h-4 text-muted hover:text-error" />
                          )}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(track)}
                          icon={<Download className="w-3 h-3" />}
                        >
                          사용
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredTracks.length === 0 && (
                  <div className="p-8 text-center text-muted">
                    <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>검색 결과가 없습니다</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* 효과음 탭 */}
        {activeTab === 'sfx' && (
          <div className="flex-1 overflow-auto">
            <Card>
              <div className="p-4 border-b border-border">
                <h3 className="font-medium">효과음 라이브러리</h3>
                <p className="text-sm text-muted">전환, 알림, UI 등 다양한 효과음</p>
              </div>
              <div className="divide-y divide-border">
                {soundEffects.map(sfx => (
                  <div key={sfx.id} className="flex items-center justify-between p-3 hover:bg-card-hover">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePlay(sfx.id)}
                        className={`p-2 rounded-full ${
                          currentlyPlaying === sfx.id ? 'bg-primary text-white' : 'bg-card-hover'
                        }`}
                      >
                        {currentlyPlaying === sfx.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <p className="font-medium text-sm">{sfx.name}</p>
                        <p className="text-xs text-muted">{sfx.category} • {sfx.duration}초</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" icon={<Download className="w-3 h-3" />}>
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 현재 재생 바 */}
        <AnimatePresence>
          {currentlyPlaying && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-64 right-0 bg-card border-t border-border p-3"
            >
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {tracks.find(t => t.id === currentlyPlaying)?.name || '미리듣기'}
                    </p>
                    <p className="text-xs text-muted">재생 중</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-card-hover rounded">
                      <SkipBack className="w-4 h-4 text-muted" />
                    </button>
                    <button
                      onClick={() => togglePlay(currentlyPlaying)}
                      className="p-2 rounded-full bg-primary text-white"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-card-hover rounded">
                      <SkipForward className="w-4 h-4 text-muted" />
                    </button>
                  </div>
                  <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3" />
                  </div>
                  <button className="p-1 hover:bg-card-hover rounded">
                    <Repeat className="w-4 h-4 text-muted" />
                  </button>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const track = tracks.find(t => t.id === currentlyPlaying);
                    if (track) handleDownload(track);
                  }}
                  icon={<Download className="w-4 h-4" />}
                >
                  프로젝트에 추가
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI 추천 모달 */}
        <Modal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          title="🤖 AI BGM 추천"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              영상 분위기를 설명해주시면 어울리는 BGM을 추천해드립니다.
            </p>
            <textarea
              className="w-full h-32 p-3 rounded-lg border border-border bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="예: 여행 브이로그인데 밝고 경쾌한 분위기였으면 좋겠어요. 일본 여행이고, 벚꽃이 피는 봄 분위기입니다."
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAIPrompt('밝고 경쾌한 브이로그용 음악')}
                className="px-3 py-1.5 bg-card-hover rounded-full text-sm hover:bg-primary/20"
              >
                🎬 브이로그
              </button>
              <button
                onClick={() => setAIPrompt('게임 하이라이트에 어울리는 긴장감 있는 음악')}
                className="px-3 py-1.5 bg-card-hover rounded-full text-sm hover:bg-primary/20"
              >
                🎮 게임
              </button>
              <button
                onClick={() => setAIPrompt('요리 영상에 어울리는 편안한 배경음악')}
                className="px-3 py-1.5 bg-card-hover rounded-full text-sm hover:bg-primary/20"
              >
                🍳 요리
              </button>
              <button
                onClick={() => setAIPrompt('튜토리얼/강의용 차분한 배경음악')}
                className="px-3 py-1.5 bg-card-hover rounded-full text-sm hover:bg-primary/20"
              >
                📚 튜토리얼
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAIModal(false)}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleAIRecommend}
                disabled={!aiPrompt.trim()}
                icon={<Sparkles className="w-4 h-4" />}
              >
                추천 받기
              </Button>
            </div>
          </div>
        </Modal>

        {/* 다운로드/사용 모달 */}
        <Modal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          title="🎵 BGM 사용"
        >
          {selectedTrack && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-card-hover rounded-lg">
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl">{getGenreIcon(selectedTrack.genre)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{selectedTrack.name}</h3>
                  <p className="text-sm text-muted">
                    {formatDuration(selectedTrack.duration)} • {selectedTrack.bpm} BPM
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getLicenseBadge(selectedTrack.license || 'CC0')}
                    <span className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 상업적 사용 가능
                    </span>
                  </div>
                </div>
              </div>

              {/* 라이선스 안내 */}
              <div className="p-3 bg-success/10 rounded-lg">
                <h4 className="font-medium text-success mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 저작권 안내
                </h4>
                <p className="text-sm text-muted">
                  {selectedTrack.license === 'CC0' 
                    ? '이 음원은 CC0 라이선스로 저작권 표시 없이 자유롭게 사용할 수 있습니다.'
                    : '이 음원은 CC BY 라이선스로 출처를 표시하면 자유롭게 사용할 수 있습니다.'}
                </p>
              </div>

              {/* 사용 옵션 */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">사용 방법</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    icon={<Download className="w-4 h-4" />}
                  >
                    파일 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    프로젝트에 추가
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    icon={<Copy className="w-4 h-4" />}
                  >
                    URL 복사
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    원본 페이지
                  </Button>
                </div>
              </div>

              {/* 태그 */}
              <div>
                <h4 className="font-medium text-sm mb-2">태그</h4>
                <div className="flex gap-1 flex-wrap">
                  {selectedTrack.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-card-hover rounded text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setShowDownloadModal(false)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
