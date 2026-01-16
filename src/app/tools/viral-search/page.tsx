'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Download,
  ExternalLink,
  TrendingUp,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Globe,
  Flame,
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

type Platform = 'tiktok' | 'instagram';
type Region = 'korea' | 'global';

const STORAGE_KEY = 'viral-search-settings-v2';

// Utils
function formatViewCount(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(0) + 'K';
  return views.toString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return '방금';
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

export default function ViralSearchPage() {
  // State
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [region, setRegion] = useState<Region>('global');
  const [maxAge, setMaxAge] = useState<number>(24); // 1일 기본
  const [minViews, setMinViews] = useState<number>(1000000); // 100만 기본
  const [maxResults, setMaxResults] = useState<number>(10); // 10개 기본
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.platform) setPlatform(s.platform);
        if (s.region) setRegion(s.region);
        if (s.maxAge) setMaxAge(s.maxAge);
        if (s.minViews) setMinViews(s.minViews);
        if (s.maxResults) setMaxResults(s.maxResults);
      }
    } catch {}
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ platform, region, maxAge, minViews, maxResults }));
  }, [platform, region, maxAge, minViews, maxResults]);

  // Search handler
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/viral-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          type: 'trending',
          region,
          maxAge,
          minViews,
          limit: maxResults,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setVideos(data.videos.slice(0, maxResults));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [platform, region, maxAge, minViews, maxResults]);

  // Download handler
  const handleDownload = useCallback(async (video: VideoResult) => {
    setDownloadingIds(prev => new Set(prev).add(video.id));
    try {
      const response = await fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.url, platform: video.platform }),
      });
      const data = await response.json();
      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        setDownloadedIds(prev => new Set(prev).add(video.id));
      }
    } catch {} finally {
      setDownloadingIds(prev => { const n = new Set(prev); n.delete(video.id); return n; });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg hover:bg-card-hover transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted" />
            </Link>
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold">틱톡/인스타 트렌딩</span>
            </div>
            
            {/* Inline Filters */}
            <div className="flex-1 flex items-center gap-3 ml-6">
              {/* Platform */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                <button
                  onClick={() => setPlatform('tiktok')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    platform === 'tiktok' ? 'bg-pink-500 text-white' : 'bg-card text-muted hover:bg-card-hover'
                  }`}
                >🎵 TikTok</button>
                <button
                  onClick={() => setPlatform('instagram')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    platform === 'instagram' ? 'bg-purple-500 text-white' : 'bg-card text-muted hover:bg-card-hover'
                  }`}
                >📸 Insta</button>
              </div>

              {/* Region */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                <button
                  onClick={() => setRegion('korea')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    region === 'korea' ? 'bg-green-500 text-white' : 'bg-card text-muted hover:bg-card-hover'
                  }`}
                >🇰🇷 한국</button>
                <button
                  onClick={() => setRegion('global')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    region === 'global' ? 'bg-blue-500 text-white' : 'bg-card text-muted hover:bg-card-hover'
                  }`}
                >🌍 해외</button>
              </div>

              <div className="w-px h-6 bg-border" />

              {/* Period */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" />
                <select
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value={6}>6시간</option>
                  <option value={12}>12시간</option>
                  <option value={24}>1일</option>
                  <option value={72}>3일</option>
                  <option value={168}>7일</option>
                  <option value={720}>30일</option>
                </select>
              </div>

              {/* Min Views */}
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted" />
                <select
                  value={minViews}
                  onChange={(e) => setMinViews(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value={0}>전체</option>
                  <option value={10000}>1만+</option>
                  <option value={100000}>10만+</option>
                  <option value={500000}>50만+</option>
                  <option value={1000000}>100만+</option>
                  <option value={5000000}>500만+</option>
                  <option value={10000000}>1000만+</option>
                </select>
              </div>

              {/* Max Results */}
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted" />
                <select
                  value={maxResults || 10}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                >
                  <option value={10}>10개</option>
                  <option value={20}>20개</option>
                  <option value={50}>50개</option>
                  <option value={100}>100개</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="btn btn-primary px-6 py-2 flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        {videos.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">
              {videos.length}개 결과 · {region === 'korea' ? '🇰🇷 한국' : '🌍 해외'}
            </span>
          </div>
        )}

        {/* Empty State */}
        {videos.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">트렌딩 영상 검색</h3>
            <p className="text-muted text-sm mb-4">필터 설정 후 검색 버튼을 클릭하세요</p>
            <button onClick={handleSearch} className="btn btn-primary">
              <Globe className="w-4 h-4 mr-2" />
              지금 검색하기
            </button>
          </div>
        )}

        {/* Grid - 8 columns for compact view */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
          <AnimatePresence>
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.02 }}
                className="group relative rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[9/16]">
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex gap-1 mb-2">
                        <button
                          onClick={() => window.open(video.url, '_blank')}
                          className="flex-1 py-1.5 rounded bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          보기
                        </button>
                        <button
                          onClick={() => handleDownload(video)}
                          disabled={downloadingIds.has(video.id)}
                          className={`flex-1 py-1.5 rounded text-white text-xs flex items-center justify-center gap-1 ${
                            downloadedIds.has(video.id) ? 'bg-green-500/50' : 'bg-primary/70 hover:bg-primary'
                          }`}
                        >
                          {downloadingIds.has(video.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : downloadedIds.has(video.id) ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          {downloadedIds.has(video.id) ? '완료' : '저장'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Badge */}
                  <div className="absolute top-1 left-1 right-1 flex justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      video.platform === 'tiktok' ? 'bg-pink-500/80 text-white' : 'bg-purple-500/80 text-white'
                    }`}>
                      {video.platform === 'tiktok' ? '🎵' : '📸'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                      {formatRelativeTime(video.uploadDate)}
                    </span>
                  </div>

                  {/* Duration */}
                  {video.duration && video.duration > 0 && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[10px] text-white flex items-center gap-0.5">
                      <Play className="w-2 h-2" />
                      {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <Eye className="w-3 h-3" />
                    <span className="font-medium text-foreground">{formatViewCount(video.views)}</span>
                    <Heart className="w-3 h-3 ml-1" />
                    <span>{formatViewCount(video.likes)}</span>
                    <MessageCircle className="w-3 h-3 ml-1" />
                    <span>{formatViewCount(video.comments)}</span>
                  </div>
                  <p className="text-[10px] text-muted truncate mt-0.5">{video.author}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
