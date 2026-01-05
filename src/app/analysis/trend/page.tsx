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
} from 'lucide-react';

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

// 데모 트렌드 데이터
const demoTrendingKeywords = [
  { keyword: 'AI 영상 편집', score: 98, trend: 'up' as const, change: '+45%', volume: '1.2M', competition: 'medium' },
  { keyword: '쇼츠 알고리즘', score: 95, trend: 'up' as const, change: '+32%', volume: '890K', competition: 'high' },
  { keyword: '유튜브 수익화', score: 92, trend: 'up' as const, change: '+28%', volume: '2.1M', competition: 'high' },
  { keyword: '영상 제작 꿀팁', score: 88, trend: 'up' as const, change: '+22%', volume: '560K', competition: 'medium' },
  { keyword: '무료 음악 사이트', score: 85, trend: 'stable' as const, change: '+5%', volume: '780K', competition: 'low' },
  { keyword: '썸네일 만들기', score: 82, trend: 'up' as const, change: '+18%', volume: '450K', competition: 'medium' },
  { keyword: '구독자 늘리기', score: 80, trend: 'stable' as const, change: '+8%', volume: '1.5M', competition: 'high' },
  { keyword: '편집 프로그램 추천', score: 78, trend: 'down' as const, change: '-5%', volume: '320K', competition: 'low' },
  { keyword: '브이로그 카메라', score: 75, trend: 'up' as const, change: '+15%', volume: '280K', competition: 'medium' },
  { keyword: '조회수 올리기', score: 72, trend: 'stable' as const, change: '+3%', volume: '1.8M', competition: 'high' },
];

// 데모 추천 제목
const demoTitleSuggestions = [
  { title: '이 방법 알면 AI가 영상 알아서 만들어줌 (진짜)', score: 95, reason: '호기심 유발 + 실용적' },
  { title: '[충격] 쇼츠 하나로 월 500만원 버는 비밀', score: 92, reason: '수치 강조 + 비밀 요소' },
  { title: '유튜브 10년차가 알려주는 진짜 성공 비결', score: 88, reason: '권위 + 독점 정보' },
  { title: '이거 모르면 유튜브 접어야 합니다 (심각)', score: 85, reason: '위기감 + 필수 정보' },
  { title: '초보도 따라하면 영상 퀄리티 10배 올라감', score: 82, reason: '접근성 + 구체적 수치' },
];

// 데모 관련 키워드
const demoRelatedKeywords = [
  { keyword: '유튜브 시작하기', relevance: 95 },
  { keyword: '영상 편집 배우기', relevance: 90 },
  { keyword: '촬영 장비 추천', relevance: 85 },
  { keyword: '유튜브 SEO', relevance: 82 },
  { keyword: '채널 브랜딩', relevance: 78 },
  { keyword: '수익 창출 조건', relevance: 75 },
  { keyword: '알고리즘 공략', relevance: 72 },
  { keyword: '커뮤니티 탭 활용', relevance: 68 },
];

export default function TrendPage() {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // 분석 결과 상태
  const [trendingKeywords, setTrendingKeywords] = useState(demoTrendingKeywords);
  const [titleSuggestions, setTitleSuggestions] = useState(demoTitleSuggestions);
  const [relatedKeywords, setRelatedKeywords] = useState(demoRelatedKeywords);

  const tabs = [
    { id: 'trending', label: '인기 키워드', icon: <Flame className="w-4 h-4" /> },
    { id: 'search', label: '키워드 분석', icon: <Search className="w-4 h-4" /> },
    { id: 'titles', label: 'AI 제목 추천', icon: <Sparkles className="w-4 h-4" /> },
  ];

  // 트렌드 갱신
  const handleRefreshTrends = async () => {
    setIsLoading(true);
    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1500));
    // 데이터 셔플
    setTrendingKeywords([...demoTrendingKeywords].sort(() => Math.random() - 0.5));
    setIsLoading(false);
  };

  // 키워드 검색
  const handleSearchKeyword = async () => {
    if (!searchKeyword.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 관련 키워드 생성 (데모)
    setRelatedKeywords([
      { keyword: `${searchKeyword} 방법`, relevance: 95 },
      { keyword: `${searchKeyword} 추천`, relevance: 90 },
      { keyword: `${searchKeyword} 비교`, relevance: 85 },
      { keyword: `${searchKeyword} 후기`, relevance: 80 },
      { keyword: `${searchKeyword} 초보`, relevance: 75 },
      { keyword: `${searchKeyword} 팁`, relevance: 70 },
      { keyword: `최신 ${searchKeyword}`, relevance: 65 },
      { keyword: `${searchKeyword} 2024`, relevance: 60 },
    ]);
    
    setIsLoading(false);
  };

  // 제목 생성
  const handleGenerateTitles = async () => {
    if (!searchKeyword.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setTitleSuggestions([
      { title: `${searchKeyword} 완벽 가이드 (이것만 보세요)`, score: 94, reason: '완성도 + 필수 정보' },
      { title: `[꿀팁] ${searchKeyword} 이렇게 하면 바로 됨`, score: 91, reason: '실용적 + 즉각적 결과' },
      { title: `프로가 알려주는 ${searchKeyword} 핵심 비법`, score: 88, reason: '권위 + 핵심 정보' },
      { title: `${searchKeyword}? 이 영상 하나로 끝`, score: 85, reason: '간결함 + 완결성' },
      { title: `아직도 ${searchKeyword} 이렇게 하세요? (틀림)`, score: 82, reason: '도발 + 교정' },
    ]);
    
    setActiveTab('titles');
    setIsLoading(false);
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
                    "{searchKeyword || '키워드'}" 키워드 기반 클릭률 높은 제목 추천
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
