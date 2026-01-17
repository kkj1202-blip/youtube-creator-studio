'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Tabs } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Hash,
  Sparkles,
  Target,
  BarChart3,
  LineChart,
  RefreshCw,
  Copy,
  CheckCircle2,
  Star,
  Flame,
  Clock,
  Eye,
  ThumbsUp,
  Loader2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

// 카테고리 옵션
const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: 'gaming', label: '게임' },
  { value: 'education', label: '교육' },
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'tech', label: '기술/리뷰' },
  { value: 'vlog', label: '브이로그' },
  { value: 'cooking', label: '요리' },
  { value: 'beauty', label: '뷰티' },
  { value: 'finance', label: '재테크/금융' },
  { value: 'fitness', label: '피트니스' },
];

// 기간 옵션
const periodOptions = [
  { value: '24h', label: '지난 24시간' },
  { value: '7d', label: '지난 7일' },
  { value: '30d', label: '지난 30일' },
  { value: '90d', label: '지난 90일' },
];

// 지역 옵션
const regionOptions = [
  { value: 'korea', label: '🇰🇷 한국' },
  { value: 'global', label: '🌐 글로벌' },
  { value: 'US', label: '🇺🇸 미국' },
  { value: 'JP', label: '🇯🇵 일본' },
];

// 인터페이스
interface TrendingKeyword {
  keyword: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: string;
  volume: string;
  competition: 'low' | 'medium' | 'high';
  videoCount?: number;
}

interface TrendingVideo {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  views: number;
  subscriberCount?: number;
  algorithmScore?: number;
  uploadDate: string;
  url: string;
}

interface TitleSuggestion {
  title: string;
  score: number;
  reason: string;
}

interface RelatedKeyword {
  keyword: string;
  relevance: number;
}

export default function TrendPage() {
  const { settings } = useStore();
  const [activeTab, setActiveTab] = useState('trending');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('7d');
  const [region, setRegion] = useState('korea');
  const [sortBy, setSortBy] = useState<'algorithm' | 'views'>('algorithm');

  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 분석 결과 상태
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [relatedKeywords, setRelatedKeywords] = useState<RelatedKeyword[]>([]);

  const tabs = [
    { id: 'trending', label: '인기 키워드', icon: <Flame className="w-4 h-4" /> },
    { id: 'search', label: '키워드 분석', icon: <Search className="w-4 h-4" /> },
    { id: 'titles', label: 'AI 제목 추천', icon: <Sparkles className="w-4 h-4" /> },
  ];

  // YouTube API 키 가져오기
  const getApiKeys = () => {
    return [settings.youtubeApiKey, settings.youtubeApiKey2, settings.youtubeApiKey3]
      .filter(k => k && k.trim());
  };

  // 시크릿 모드: API Key만 사용 (로그인 없음, 개인화 없음)
  const isIncognitoMode = () => {
    const keys = getApiKeys();
    return keys.length > 0; // API Key만 있으면 시크릿 모드
  };

  // 초기 로드 시 트렌딩 가져오기
  useEffect(() => {
    if (getApiKeys().length > 0) {
      handleRefreshTrends();
    }
  }, []);

  // 실제 YouTube API로 트렌딩 영상에서 키워드 추출
  const handleRefreshTrends = async () => {
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      setError('설정에서 YouTube API 키를 등록해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'trending',
          region: region, // 선택된 지역 사용
          maxAge: period === '24h' ? 24 : period === '7d' ? 168 : period === '30d' ? 720 : 2160,
          limit: 50,
          apiKeys,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.videos) {
        // 영상 제목에서 키워드 추출
        const keywordMap = new Map<string, { count: number; totalViews: number }>();
        
        data.videos.forEach((video: { title: string; views: number }) => {
          // 제목에서 키워드 추출 (괄호, 특수문자 제거)
          const cleanTitle = video.title
            .replace(/[\[\]【】\(\)]/g, ' ')
            .replace(/[#@]/g, ' ')
            .toLowerCase();
          
          // 2글자 이상 단어 추출
          const words = cleanTitle.split(/\s+/).filter((w: string) => 
            w.length >= 2 && !/^[0-9]+$/.test(w) && !['the', 'and', 'for', 'with'].includes(w)
          );
          
          words.forEach((word: string) => {
            const existing = keywordMap.get(word) || { count: 0, totalViews: 0 };
            keywordMap.set(word, { 
              count: existing.count + 1, 
              totalViews: existing.totalViews + video.views 
            });
          });
        });

        // 키워드 정렬 및 변환
        const sortedKeywords = Array.from(keywordMap.entries())
          .filter(([_, data]) => data.count >= 2) // 2회 이상 등장
          .sort((a, b) => b[1].totalViews - a[1].totalViews)
          .slice(0, 15)
          .map(([keyword, data], idx) => ({
            keyword,
            score: Math.max(50, 100 - idx * 3),
            trend: data.count >= 5 ? 'up' as const : data.count >= 3 ? 'stable' as const : 'down' as const,
            change: `+${Math.floor(data.count * 10)}%`,
            volume: data.totalViews >= 1000000 
              ? `${(data.totalViews / 1000000).toFixed(1)}M`
              : `${Math.floor(data.totalViews / 1000)}K`,
            competition: data.count >= 5 ? 'high' as const : data.count >= 3 ? 'medium' as const : 'low' as const,
            videoCount: data.count,
          }));

        setTrendingKeywords(sortedKeywords);

        // 영상 데이터 저장 (Algorithm Hunter)
        const videos: TrendingVideo[] = data.videos.map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail,
          author: v.author,
          views: v.views,
          subscriberCount: v.subscriberCount,
          algorithmScore: v.algorithmScore,
          uploadDate: v.uploadDate,
          url: v.url
        }));
        setTrendingVideos(videos);

      } else {
        setError(data.error || '트렌드 데이터를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Trend fetch error:', err);
      setError('API 호출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 실제 YouTube API로 키워드 검색
  const handleSearchKeyword = async () => {
    if (!searchKeyword.trim()) return;
    
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      setError('설정에서 YouTube API 키를 등록해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search',
          query: searchKeyword,
          region: 'global',
          maxAge: period === '24h' ? 24 : period === '7d' ? 168 : 720,
          limit: 30,
          apiKeys,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.videos) {
        // 검색 결과에서 관련 키워드 추출
        const keywordMap = new Map<string, number>();
        
        data.videos.forEach((video: { title: string }) => {
          const words = video.title
            .replace(/[\[\]【】\(\)]/g, ' ')
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length >= 2 && w !== searchKeyword.toLowerCase());
          
          words.forEach((word: string) => {
            keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
          });
        });

        const related = Array.from(keywordMap.entries())
          .filter(([_, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([keyword, count]) => ({
            keyword,
            relevance: Math.min(100, count * 15),
          }));

        setRelatedKeywords(related);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // AI 제목 생성 (LLM 연동)
  const handleGenerateTitles = async () => {
    if (!searchKeyword.trim() && trendingKeywords.length === 0) {
      setError('분석할 키워드가 없거나 트렌드 데이터가 없습니다.');
      return;
    }

    const geminiKey = settings.geminiApiKey;
    const openaiKey = settings.openaiApiKey;

    if (!geminiKey && !openaiKey) {
      setError('AI 분석을 위해 설정에서 Gemini 또는 OpenAI API 키를 등록해주세요.');
      // 템플릿 폴백
      setTitleSuggestions([
        { title: `${searchKeyword || '이 주제'} 완벽 가이드 (이것만 보세요)`, score: 94, reason: '완성도 + 필수 정보' },
        { title: `[충격] ${searchKeyword || '알고리즘'}의 숨겨진 진실`, score: 92, reason: '호기심 유발' },
        { title: `${searchKeyword || '이것'} 1분만에 마스터하기`, score: 90, reason: '간결함 + 효율성' },
        { title: `프로가 알려주는 ${searchKeyword || '핵심'} 비법`, score: 88, reason: '권위 + 핵심 정보' },
        { title: `${searchKeyword || '영상'}? 이걸로 종결합니다`, score: 85, reason: '완결성 강조' },
      ]);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // 컨텍스트 데이터 수집
      const keywords = searchKeyword 
        ? [searchKeyword, ...relatedKeywords.slice(0, 4).map(k => k.keyword)]
        : trendingKeywords.slice(0, 5).map(k => k.keyword);

      const referenceTitles = trendingVideos.slice(0, 10).map(v => v.title);

      // API 호출
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          referenceTitles,
          tone: 'clickbait',
          count: 5,
          geminiApiKey: geminiKey,
          openaiApiKey: openaiKey,
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.titles)) {
        // 결과 매핑
        const suggestions: TitleSuggestion[] = data.titles.map((title: string, idx: number) => ({
          title,
          score: 95 - idx * 2,
          reason: '트렌드 데이터 기반 AI 생성',
        }));
        
        
        setTitleSuggestions(suggestions);
        setActiveTab('titles');
      } else {
        throw new Error(data.error || '제목 생성 실패');
      }
    } catch (err) {
      console.error('AI Title Error:', err);
      setError('AI 제목 생성 중 오류가 발생했습니다. (설정에서 API 키를 확인해주세요)');
    } finally {
      setIsLoading(false);
    }
  };

  // 복사 기능
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 트렌드 아이콘
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-error" />;
      default: return <span className="text-muted">—</span>;
    }
  };

  // 경쟁도 색상
  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success bg-success/10';
      case 'medium': return 'text-warning bg-warning/10';
      case 'high': return 'text-error bg-error/10';
      default: return 'text-muted bg-muted/10';
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            📈 트렌드 키워드 분석
          </h1>
          <p className="text-muted">
            실시간 인기 키워드를 분석하고 AI가 제목을 추천합니다
          </p>
        </div>

        {/* 검색 & 필터 */}
        <div className="flex-shrink-0 mb-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="키워드 검색"
                  placeholder="분석할 키워드 입력..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchKeyword()}
                />
              </div>
              <div className="w-40">
                <Select
                  label="카테고리"
                  options={categoryOptions}
                  value={category}
                  onChange={setCategory}
                />
              </div>
              <div className="w-36">
                <Select
                  label="기간"
                  options={periodOptions}
                  value={period}
                  onChange={setPeriod}
                />
              </div>
              <div className="w-36">
                <Select
                  label="지역"
                  options={regionOptions}
                  value={region}
                  onChange={setRegion}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleSearchKeyword}
                  disabled={!searchKeyword.trim() || isLoading}
                  icon={<Search className="w-4 h-4" />}
                >
                  분석
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleGenerateTitles}
                  disabled={!searchKeyword.trim() || isLoading}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  AI 제목
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 mb-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Trending Tab */}
            {activeTab === 'trending' && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* 인기 키워드 목록 */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      실시간 인기 키워드
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshTrends}
                      disabled={isLoading}
                      icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                      새로고침
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-card-hover sticky top-0">
                        <tr className="text-left text-xs text-muted">
                          <th className="p-3 font-medium">#</th>
                          <th className="p-3 font-medium">키워드</th>
                          <th className="p-3 font-medium">점수</th>
                          <th className="p-3 font-medium">추이</th>
                          <th className="p-3 font-medium">검색량</th>
                          <th className="p-3 font-medium">경쟁도</th>
                          <th className="p-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {trendingKeywords.map((item, index) => (
                          <motion.tr
                            key={item.keyword}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-border hover:bg-card-hover transition-colors"
                          >
                            <td className="p-3">
                              <span className={`font-bold ${index < 3 ? 'text-primary' : 'text-muted'}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-foreground">{item.keyword}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${item.score}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted">{item.score}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                {getTrendIcon(item.trend)}
                                <span className={`text-xs ${
                                  item.trend === 'up' ? 'text-success' :
                                  item.trend === 'down' ? 'text-error' : 'text-muted'
                                }`}>
                                  {item.change}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted">{item.volume}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${getCompetitionColor(item.competition)}`}>
                                {item.competition === 'low' ? '낮음' : item.competition === 'medium' ? '보통' : '높음'}
                              </span>
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSearchKeyword(item.keyword);
                                  setActiveTab('search');
                                }}
                                icon={<Search className="w-3 h-3" />}
                              />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* 사이드바 */}
                <div className="space-y-4">
                  {/* 통계 요약 */}
                  <Card>
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      📊 오늘의 통계
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">상승 키워드</span>
                        <span className="text-success font-bold">
                          {trendingKeywords.filter(k => k.trend === 'up').length}개
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">하락 키워드</span>
                        <span className="text-error font-bold">
                          {trendingKeywords.filter(k => k.trend === 'down').length}개
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">평균 경쟁도</span>
                        <span className="text-warning font-bold">중간</span>
                      </div>
                    </div>
                  </Card>

                  {/* 추천 니치 */}
                  <Card>
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      블루오션 추천
                    </h3>
                    <div className="space-y-2">
                      {trendingKeywords
                        .filter(k => k.competition === 'low' && k.trend === 'up')
                        .slice(0, 3)
                        .map((k, i) => (
                          <div
                            key={i}
                            className="p-2 bg-success/10 rounded-lg text-sm cursor-pointer hover:bg-success/20 transition-colors"
                            onClick={() => {
                              setSearchKeyword(k.keyword);
                              handleGenerateTitles();
                            }}
                          >
                            <span className="text-foreground">{k.keyword}</span>
                            <span className="text-xs text-success ml-2">{k.change}</span>
                          </div>
                        ))}
                    </div>
                  </Card>

                  {/* 팁 */}
                  <Card className="bg-primary/5">
                    <h3 className="text-sm font-semibold text-foreground mb-2">💡 팁</h3>
                    <p className="text-xs text-muted">
                      검색량은 높지만 경쟁도가 낮은 키워드가 최적의 선택입니다. 
                      상승 추세인 키워드를 빠르게 공략하세요!
                    </p>
                  </Card>
                </div>

                {/* Algorithm Hunter Section (Video Ranking) */}
                <div className="lg:col-span-3 mt-4">
                  <Card className="flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            🚀 알고리즘 헌터 (Video Ranking)
                          </h3>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                            LIVE
                          </span>
                        </div>
                        <p className="text-sm text-muted">구독자 대비 조회수가 폭발적으로 높은 영상을 찾아냅니다.</p>
                      </div>
                      <div className="flex items-center bg-card-hover p-1 rounded-lg border border-border">
                         <button
                           onClick={() => setSortBy('algorithm')}
                           className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                             sortBy === 'algorithm' 
                               ? 'bg-primary text-primary-foreground shadow-sm' 
                               : 'text-muted hover:text-foreground'
                           }`}
                         >
                           🔥 알고리즘순
                         </button>
                         <button
                           onClick={() => setSortBy('views')}
                           className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                             sortBy === 'views' 
                               ? 'bg-primary text-primary-foreground shadow-sm' 
                               : 'text-muted hover:text-foreground'
                           }`}
                         >
                           👀 조회수순
                         </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-card-hover border-b border-border">
                          <tr>
                            <th className="p-3 text-left font-medium text-muted w-16">순위</th>
                            <th className="p-3 text-left font-medium text-muted">영상 정보</th>
                            <th className="p-3 text-right font-medium text-muted w-24">알고리즘 점수</th>
                            <th className="p-3 text-right font-medium text-muted w-24">조회수</th>
                            <th className="p-3 text-right font-medium text-muted w-24">구독자</th>
                            <th className="p-3 text-right font-medium text-muted w-32">업로드</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {trendingVideos
                            .sort((a, b) => {
                              if (sortBy === 'algorithm') return (b.algorithmScore || 0) - (a.algorithmScore || 0);
                              return b.views - a.views;
                            })
                            .slice(0, 50)
                            .map((video, idx) => (
                            <tr key={video.id} className="group hover:bg-card-hover/50 transition-colors">
                              <td className="p-3 font-bold text-lg text-muted group-hover:text-primary transition-colors">
                                {idx + 1}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-3">
                                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 w-32 aspect-video rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all group-hover:scale-105">
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                  </a>
                                  <div className="flex flex-col justify-center min-w-0">
                                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground truncate hover:underline hover:text-primary transition-colors" title={video.title}>
                                      {video.title}
                                    </a>
                                    <span className="text-xs text-muted flex items-center gap-1 mt-1">
                                      {video.author}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`font-bold ${
                                    (video.algorithmScore || 0) >= 1000 ? 'text-red-500' :
                                    (video.algorithmScore || 0) >= 300 ? 'text-orange-500' : 'text-primary'
                                  }`}>
                                    {video.algorithmScore ? `${video.algorithmScore}%` : '-'}
                                  </span>
                                  {(video.algorithmScore || 0) >= 1000 && <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">SUPER</span>}
                                </div>
                              </td>
                              <td className="p-3 text-right font-medium text-foreground">
                                {video.views >= 1000000 ? `${(video.views / 1000000).toFixed(1)}M` : `${Math.floor(video.views / 1000)}K`}
                              </td>
                              <td className="p-3 text-right text-muted">
                                {video.subscriberCount 
                                  ? (video.subscriberCount >= 1000000 
                                      ? `${(video.subscriberCount / 1000000).toFixed(1)}M` 
                                      : `${Math.floor(video.subscriberCount / 1000)}K`)
                                  : '-'}
                              </td>
                              <td className="p-3 text-right text-muted text-xs">
                                {new Date(video.uploadDate).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {trendingVideos.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-muted flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <p>데이터가 없습니다. 새로고침을 눌러주세요.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* 키워드 분석 결과 */}
                <Card className="flex flex-col overflow-hidden">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />
                    관련 키워드
                  </h3>

                  {searchKeyword ? (
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {relatedKeywords.map((item, index) => (
                        <motion.div
                          key={item.keyword}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-card-hover rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                          onClick={() => setSearchKeyword(item.keyword)}
                        >
                          <span className="text-foreground">{item.keyword}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${item.relevance}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted w-8">{item.relevance}%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.keyword, index);
                              }}
                              icon={copiedIndex === index ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted">
                      <div className="text-center">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>키워드를 입력하고 분석하세요</p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* 검색량 그래프 (시뮬레이션) */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-primary" />
                    검색량 추이
                  </h3>

                  {searchKeyword ? (
                    <div className="space-y-4">
                      {/* 간단한 막대 그래프 시뮬레이션 */}
                      <div className="flex items-end gap-2 h-40">
                        {[65, 72, 58, 80, 95, 88, 92].map((value, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${value}%` }}
                              transition={{ delay: i * 0.1, duration: 0.5 }}
                              className="w-full bg-primary rounded-t"
                            />
                            <span className="text-xs text-muted mt-2">
                              {['월', '화', '수', '목', '금', '토', '일'][i]}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 요약 통계 */}
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">78K</p>
                          <p className="text-xs text-muted">월간 검색량</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">+23%</p>
                          <p className="text-xs text-muted">전월 대비</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-warning">중간</p>
                          <p className="text-xs text-muted">경쟁도</p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleGenerateTitles}
                        icon={<Sparkles className="w-4 h-4" />}
                      >
                        이 키워드로 제목 생성
                      </Button>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted">
                      <p>키워드를 선택하면 추이가 표시됩니다</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Titles Tab */}
            {activeTab === 'titles' && (
              <motion.div
                key="titles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto"
              >
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI 제목 추천
                  </h3>

                  <p className="text-sm text-muted mb-6">
                    &ldquo;{searchKeyword || '키워드'}&rdquo; 키워드 기반 클릭률 높은 제목 추천
                  </p>

                  <div className="space-y-3">
                    {titleSuggestions.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {index === 0 && <Star className="w-4 h-4 text-warning fill-warning" />}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.score >= 90 ? 'bg-success/20 text-success' :
                                item.score >= 80 ? 'bg-primary/20 text-primary' :
                                'bg-muted/20 text-muted'
                              }`}>
                                점수: {item.score}
                              </span>
                            </div>
                            <p className="text-foreground font-medium mb-2">{item.title}</p>
                            <p className="text-xs text-muted">💡 {item.reason}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(item.title, index + 100)}
                            icon={copiedIndex === index + 100 ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                          >
                            {copiedIndex === index + 100 ? '복사됨' : '복사'}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handleGenerateTitles}
                      disabled={isLoading}
                      icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                      다른 제목 생성
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
