'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  Download,
  ExternalLink,
  TrendingUp,
  Hash,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Filter,
  RefreshCw,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  MapPin,
  Save,
  Settings,
} from 'lucide-react';

// Types
interface VideoResult {
  id: string;
  platform: 'tiktok' | 'instagram';
  url: string;
  thumbnail: string;
  title: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  uploadDate: string;
  duration?: number;
}

type SearchType = 'trending' | 'hashtag' | 'keyword';
type Platform = 'tiktok' | 'instagram';
type Region = 'korea' | 'global';

interface SavedSettings {
  platform: Platform;
  region: Region;
  maxAge: number;
  minViews: number;
}

const STORAGE_KEY = 'viral-search-settings';

// Utils
function formatViewCount(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${Math.floor(diffDays / 7)}주 전`;
}

// Load saved settings from localStorage
function loadSettings(): SavedSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
}

// Save settings to localStorage
function saveSettings(settings: SavedSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export default function ViralSearchPage() {
  // State
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [searchType, setSearchType] = useState<SearchType>('trending');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region>('global');
  const [maxAge, setMaxAge] = useState<number>(168); // 7일 (기본값)
  const [minViews, setMinViews] = useState<number>(100000);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const saved = loadSettings();
    if (saved) {
      setPlatform(saved.platform);
      setRegion(saved.region);
      setMaxAge(saved.maxAge);
      setMinViews(saved.minViews);
    }
  }, []);

  // Save default settings
  const handleSaveSettings = useCallback(() => {
    saveSettings({ platform, region, maxAge, minViews });
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  }, [platform, region, maxAge, minViews]);

  // Search handler
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/viral-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          type: searchType,
          query: searchType !== 'trending' ? query : undefined,
          region,
          maxAge,
          minViews,
          limit: 20,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVideos(data.videos);
        if (data.source === 'mock') {
          console.log('⚠️ Using mock data (no API key configured)');
        }
      } else {
        setError(data.error || '검색에 실패했습니다');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [platform, searchType, query, region, maxAge, minViews]);

  // Download handler
  const handleDownload = useCallback(async (video: VideoResult) => {
    setDownloadingIds(prev => new Set(prev).add(video.id));

    try {
      const response = await fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: video.url,
          platform: video.platform,
        }),
      });

      const data = await response.json();

      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        setDownloadedIds(prev => new Set(prev).add(video.id));
      } else {
        alert(`다운로드 실패: ${data.error}`);
      }
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  }, []);

  // Platform badge colors
  const platformColors = {
    tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Save Success Toast */}
      <AnimatePresence>
        {showSaveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-success text-white rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            기본 설정이 저장되었습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg bg-card hover:bg-card-hover border border-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <TrendingUp className="w-7 h-7" />
              Viral Video Searcher
            </h1>
            <p className="text-muted text-sm mt-1">
              TikTok/Instagram에서 급상승 영상을 찾아 레퍼런스로 다운로드하세요
            </p>
          </div>
        </div>

        {/* Search Controls */}
        <div className="card mb-6">
          {/* Row 1: Platform & Region */}
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Platform Select */}
            <div className="flex gap-2">
              <button
                onClick={() => setPlatform('tiktok')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  platform === 'tiktok'
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                    : 'bg-card border-border text-muted hover:border-pink-500/50'
                }`}
              >
                🎵 TikTok
              </button>
              <button
                onClick={() => setPlatform('instagram')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  platform === 'instagram'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-card border-border text-muted hover:border-purple-500/50'
                }`}
              >
                📸 Instagram
              </button>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-border hidden md:block" />

            {/* Region Select */}
            <div className="flex gap-2">
              <button
                onClick={() => setRegion('korea')}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  region === 'korea'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-card border-border text-muted hover:border-green-500/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                🇰🇷 한국
              </button>
              <button
                onClick={() => setRegion('global')}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  region === 'global'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-card border-border text-muted hover:border-blue-500/50'
                }`}
              >
                <Globe className="w-4 h-4" />
                🌍 해외
              </button>
            </div>
          </div>

          {/* Row 2: Search Type & Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Search Type */}
            <div className="flex gap-2">
              <button
                onClick={() => setSearchType('trending')}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  searchType === 'trending'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card border-border text-muted hover:border-primary/50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                트렌딩
              </button>
              <button
                onClick={() => setSearchType('hashtag')}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  searchType === 'hashtag'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card border-border text-muted hover:border-primary/50'
                }`}
              >
                <Hash className="w-4 h-4" />
                해시태그
              </button>
              <button
                onClick={() => setSearchType('keyword')}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  searchType === 'keyword'
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-card border-border text-muted hover:border-primary/50'
                }`}
              >
                <Search className="w-4 h-4" />
                키워드
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-secondary/20 border-secondary text-secondary'
                  : 'bg-card border-border text-muted hover:border-secondary/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              필터
            </button>
          </div>

          {/* Query Input */}
          <AnimatePresence>
            {searchType !== 'trending' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchType === 'hashtag' ? '#dance, #fyp, #viral' : 'Search keywords...'}
                  className="input"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-card-hover rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      업로드 기간
                    </label>
                    <select
                      value={maxAge}
                      onChange={(e) => setMaxAge(Number(e.target.value))}
                      className="select"
                      title="업로드 기간 선택"
                    >
                      <option value={6}>6시간 이내</option>
                      <option value={12}>12시간 이내</option>
                      <option value={24}>24시간 이내</option>
                      <option value={48}>48시간 이내</option>
                      <option value={72}>3일 이내</option>
                      <option value={168}>7일 이내</option>
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      최소 조회수
                    </label>
                    <select
                      value={minViews}
                      onChange={(e) => setMinViews(Number(e.target.value))}
                      className="select"
                      title="최소 조회수 선택"
                    >
                      <option value={10000}>10K 이상</option>
                      <option value={50000}>50K 이상</option>
                      <option value={100000}>100K 이상</option>
                      <option value={500000}>500K 이상</option>
                      <option value={1000000}>1M 이상</option>
                      <option value={5000000}>5M 이상</option>
                      <option value={10000000}>10M 이상</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSaveSettings}
                      className="btn btn-ghost w-full flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      기본값으로 저장
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading || (searchType !== 'trending' && !query)}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                검색 중...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                {region === 'global' ? '🌍 해외' : '🇰🇷 한국'} 바이럴 영상 검색
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card mb-6 border-error bg-error/10 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error" />
            <span className="text-error">{error}</span>
          </div>
        )}

        {/* Results Grid */}
        {videos.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              검색 결과 ({videos.length}개) - {region === 'global' ? '🌍 해외' : '🇰🇷 한국'}
            </h2>
            <button
              onClick={handleSearch}
              className="btn btn-ghost text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="card card-hover group relative overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[9/16] bg-card-hover rounded-lg overflow-hidden mb-3">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Duration Badge */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                    </div>
                  )}

                  {/* Platform Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs border ${platformColors[video.platform]}`}>
                    {video.platform === 'tiktok' ? '🎵 TikTok' : '📸 Instagram'}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => window.open(video.url, '_blank')}
                      className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      title="원본 보기"
                    >
                      <ExternalLink className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handleDownload(video)}
                      disabled={downloadingIds.has(video.id)}
                      className={`p-3 rounded-full transition-colors ${
                        downloadedIds.has(video.id)
                          ? 'bg-success/30'
                          : 'bg-primary/50 hover:bg-primary/70'
                      }`}
                      title="다운로드"
                    >
                      {downloadingIds.has(video.id) ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : downloadedIds.has(video.id) ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Download className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {video.title}
                  </p>
                  <p className="text-xs text-muted">{video.author}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatViewCount(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatViewCount(video.comments)}
                    </span>
                    {video.shares && (
                      <span className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        {formatViewCount(video.shares)}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(video.uploadDate)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {!isLoading && videos.length === 0 && (
          <div className="card text-center py-16">
            <TrendingUp className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              바이럴 영상을 검색하세요
            </h3>
            <p className="text-muted mb-6">
              TikTok/Instagram에서 급상승 중인 영상을 찾아 레퍼런스로 활용하세요
            </p>
            <button
              onClick={handleSearch}
              className="btn btn-primary mx-auto"
            >
              <Search className="w-5 h-5" />
              {region === 'global' ? '🌍 해외' : '🇰🇷 한국'} 트렌딩 영상 검색
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
