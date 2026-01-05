'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Tabs, TextArea } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  Search,
  Download,
  RefreshCw,
  Copy,
  CheckCircle2,
  Star,
  Flame,
  Clock,
  User,
  Filter,
  BarChart3,
  PieChart,
  Loader2,
  Heart,
  Meh,
  Frown,
} from 'lucide-react';

// 감정 타입
type SentimentType = 'positive' | 'negative' | 'neutral' | 'question' | 'request';

// 데모 댓글 데이터
interface Comment {
  id: string;
  author: string;
  text: string;
  likes: number;
  timestamp: string;
  sentiment: SentimentType;
  score: number;
  idea?: string;
  needsReply: boolean;
}

const demoComments: Comment[] = [
  {
    id: '1',
    author: '유튜브러버',
    text: '와 진짜 도움이 많이 됐어요! 특히 3분 쯤 나온 팁이 꿀팁이에요 ㅎㅎ',
    likes: 45,
    timestamp: '2시간 전',
    sentiment: 'positive',
    score: 0.92,
    needsReply: false,
  },
  {
    id: '2',
    author: '초보크리에이터',
    text: '다음 영상에서는 음성 녹음 꿀팁도 알려주세요! 마이크 추천도요~',
    likes: 128,
    timestamp: '3시간 전',
    sentiment: 'request',
    score: 0.85,
    idea: '음성 녹음 팁 + 마이크 추천 영상',
    needsReply: true,
  },
  {
    id: '3',
    author: '편집러',
    text: '혹시 사용하신 편집 프로그램이 뭔가요? 설정값도 알 수 있을까요?',
    likes: 67,
    timestamp: '5시간 전',
    sentiment: 'question',
    score: 0.78,
    needsReply: true,
  },
  {
    id: '4',
    author: '열심히하자',
    text: '이거 보고 바로 적용했는데 진짜 퀄리티가 달라졌어요!!! 감사합니다 🔥',
    likes: 234,
    timestamp: '6시간 전',
    sentiment: 'positive',
    score: 0.95,
    needsReply: false,
  },
  {
    id: '5',
    author: '의문점',
    text: '근데 이거 유료 프로그램 아닌가요? 무료로 할 수 있는 방법은 없나요...',
    likes: 89,
    timestamp: '8시간 전',
    sentiment: 'question',
    score: 0.72,
    idea: '무료 대안 프로그램 소개 영상',
    needsReply: true,
  },
  {
    id: '6',
    author: '비판적시청자',
    text: '솔직히 다른 유튜버들이 더 자세하게 설명하던데... 이건 좀 부족한듯',
    likes: 12,
    timestamp: '10시간 전',
    sentiment: 'negative',
    score: 0.35,
    needsReply: true,
  },
  {
    id: '7',
    author: '구독자123',
    text: '맨날 기다리는 채널인데 오늘도 역시 좋네요 ㅎㅎ',
    likes: 56,
    timestamp: '12시간 전',
    sentiment: 'positive',
    score: 0.88,
    needsReply: false,
  },
  {
    id: '8',
    author: '아이디어뱅크',
    text: '이런 주제도 다뤄주세요: 1. 조명 셋업 2. 배경 꾸미기 3. 카메라 앵글',
    likes: 156,
    timestamp: '1일 전',
    sentiment: 'request',
    score: 0.82,
    idea: '촬영 환경 시리즈 (조명/배경/앵글)',
    needsReply: true,
  },
  {
    id: '9',
    author: '중립적의견',
    text: '나쁘진 않은데 그냥 평범한 정보인듯',
    likes: 8,
    timestamp: '1일 전',
    sentiment: 'neutral',
    score: 0.50,
    needsReply: false,
  },
  {
    id: '10',
    author: '팬팬팬',
    text: '항상 응원해요! 다음 영상도 기대할게요 💕',
    likes: 78,
    timestamp: '2일 전',
    sentiment: 'positive',
    score: 0.90,
    needsReply: false,
  },
];

// 감정별 통계
const sentimentStats = {
  positive: { count: 4, percentage: 40, color: 'text-success', bgColor: 'bg-success', icon: ThumbsUp },
  negative: { count: 1, percentage: 10, color: 'text-error', bgColor: 'bg-error', icon: ThumbsDown },
  neutral: { count: 1, percentage: 10, color: 'text-muted', bgColor: 'bg-muted', icon: Meh },
  question: { count: 2, percentage: 20, color: 'text-primary', bgColor: 'bg-primary', icon: HelpCircle },
  request: { count: 2, percentage: 20, color: 'text-warning', bgColor: 'bg-warning', icon: Lightbulb },
};

export default function CommentsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [comments, setComments] = useState<Comment[]>(demoComments);
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<SentimentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'likes' | 'recent' | 'score'>('likes');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabs = [
    { id: 'all', label: '전체', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'ideas', label: '아이디어 추출', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'reply', label: '답글 필요', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'stats', label: '통계', icon: <PieChart className="w-4 h-4" /> },
  ];

  const filterOptions = [
    { value: 'all', label: '전체' },
    { value: 'positive', label: '😊 긍정' },
    { value: 'negative', label: '😞 부정' },
    { value: 'question', label: '❓ 질문' },
    { value: 'request', label: '💡 요청' },
    { value: 'neutral', label: '😐 중립' },
  ];

  const sortOptions = [
    { value: 'likes', label: '좋아요 순' },
    { value: 'recent', label: '최신 순' },
    { value: 'score', label: '중요도 순' },
  ];

  // 댓글 분석 시작
  const handleAnalyze = async () => {
    if (!videoUrl.trim()) return;
    
    setIsLoading(true);
    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 실제로는 YouTube API 호출
    setComments(demoComments);
    setIsLoading(false);
  };

  // 필터링된 댓글
  const filteredComments = comments
    .filter(c => {
      if (activeTab === 'ideas') return !!c.idea;
      if (activeTab === 'reply') return c.needsReply;
      if (filter !== 'all') return c.sentiment === filter;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'likes') return b.likes - a.likes;
      if (sortBy === 'score') return b.score - a.score;
      return 0; // recent는 이미 정렬됨
    });

  // 추출된 아이디어
  const extractedIdeas = comments.filter(c => c.idea);

  // 답글 필요한 댓글
  const needsReplyComments = comments.filter(c => c.needsReply);

  // 감정 아이콘
  const getSentimentIcon = (sentiment: SentimentType) => {
    const stats = sentimentStats[sentiment];
    const Icon = stats.icon;
    return <Icon className={`w-4 h-4 ${stats.color}`} />;
  };

  // 감정 라벨
  const getSentimentLabel = (sentiment: SentimentType) => {
    const labels: Record<SentimentType, string> = {
      positive: '긍정',
      negative: '부정',
      neutral: '중립',
      question: '질문',
      request: '요청',
    };
    return labels[sentiment];
  };

  // 복사
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 내보내기
  const handleExport = () => {
    const data = {
      totalComments: comments.length,
      sentiment: sentimentStats,
      ideas: extractedIdeas.map(c => c.idea),
      needsReply: needsReplyComments.length,
      comments: comments,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_analysis_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            💬 댓글 분석기
          </h1>
          <p className="text-muted">
            영상 댓글에서 인사이트와 아이디어를 자동으로 추출합니다
          </p>
        </div>

        {/* 영상 URL 입력 */}
        <Card className="flex-shrink-0 mb-4 p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="YouTube 영상 URL"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={!videoUrl.trim() || isLoading}
              isLoading={isLoading}
              icon={<Search className="w-4 h-4" />}
            >
              {isLoading ? '분석 중...' : '댓글 분석'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleExport}
              disabled={comments.length === 0}
              icon={<Download className="w-4 h-4" />}
            >
              내보내기
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex-shrink-0 mb-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* All Comments / Ideas / Reply Needed */}
            {(activeTab === 'all' || activeTab === 'ideas' || activeTab === 'reply') && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6"
              >
                {/* 댓글 목록 */}
                <Card className="lg:col-span-3 flex flex-col overflow-hidden">
                  {/* 필터 바 */}
                  {activeTab === 'all' && (
                    <div className="flex gap-4 mb-4">
                      <Select
                        label=""
                        options={filterOptions}
                        value={filter}
                        onChange={(v) => setFilter(v as SentimentType | 'all')}
                      />
                      <Select
                        label=""
                        options={sortOptions}
                        value={sortBy}
                        onChange={(v) => setSortBy(v as 'likes' | 'recent' | 'score')}
                      />
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {filteredComments.length === 0 ? (
                      <div className="text-center py-12 text-muted">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>댓글이 없습니다</p>
                        <p className="text-sm">YouTube 영상 URL을 입력하고 분석하세요</p>
                      </div>
                    ) : (
                      filteredComments.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`p-4 rounded-lg border ${
                            comment.needsReply ? 'border-warning bg-warning/5' : 'border-border bg-card-hover'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-muted" />
                                <span className="text-sm font-medium text-foreground">
                                  {comment.author}
                                </span>
                                <span className="text-xs text-muted">{comment.timestamp}</span>
                                {getSentimentIcon(comment.sentiment)}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentStats[comment.sentiment].bgColor}/20 ${sentimentStats[comment.sentiment].color}`}>
                                  {getSentimentLabel(comment.sentiment)}
                                </span>
                                {comment.needsReply && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                                    답글 필요
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-foreground mb-2">{comment.text}</p>
                              
                              {comment.idea && (
                                <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                                  <p className="text-xs text-primary flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    추출된 아이디어: {comment.idea}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {comment.likes}
                                </span>
                                <span>중요도: {Math.round(comment.score * 100)}%</span>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(comment.text, comment.id)}
                              icon={copiedId === comment.id ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                            />
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </Card>

                {/* 사이드바 */}
                <div className="space-y-4">
                  {/* 요약 통계 */}
                  <Card>
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      📊 댓글 요약
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">총 댓글</span>
                        <span className="font-bold text-foreground">{comments.length}개</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">아이디어</span>
                        <span className="font-bold text-primary">{extractedIdeas.length}개</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">답글 필요</span>
                        <span className="font-bold text-warning">{needsReplyComments.length}개</span>
                      </div>
                    </div>
                  </Card>

                  {/* 감정 분포 */}
                  <Card>
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      😊 감정 분포
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(sentimentStats).map(([key, stats]) => (
                        <div key={key} className="flex items-center gap-2">
                          <stats.icon className={`w-4 h-4 ${stats.color}`} />
                          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stats.bgColor} rounded-full`}
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted w-8">{stats.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* 빠른 액션 */}
                  <Card>
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      ⚡ 빠른 액션
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setActiveTab('ideas')}
                        icon={<Lightbulb className="w-4 h-4" />}
                      >
                        아이디어 보기 ({extractedIdeas.length})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setActiveTab('reply')}
                        icon={<AlertCircle className="w-4 h-4" />}
                      >
                        답글 필요 ({needsReplyComments.length})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setFilter('question')}
                        icon={<HelpCircle className="w-4 h-4" />}
                      >
                        질문만 보기
                      </Button>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {/* 감정 분석 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    감정 분석
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(sentimentStats).map(([key, stats]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${stats.bgColor}/20 flex items-center justify-center`}>
                          <stats.icon className={`w-5 h-5 ${stats.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {getSentimentLabel(key as SentimentType)}
                            </span>
                            <span className={`text-sm font-bold ${stats.color}`}>
                              {stats.count}개 ({stats.percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className={`h-full ${stats.bgColor} rounded-full`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 핵심 지표 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    핵심 지표
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-success/10 rounded-lg text-center">
                      <p className="text-3xl font-bold text-success">
                        {Math.round((sentimentStats.positive.count / comments.length) * 100)}%
                      </p>
                      <p className="text-xs text-muted mt-1">긍정 비율</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg text-center">
                      <p className="text-3xl font-bold text-primary">
                        {extractedIdeas.length}
                      </p>
                      <p className="text-xs text-muted mt-1">아이디어</p>
                    </div>
                    <div className="p-4 bg-warning/10 rounded-lg text-center">
                      <p className="text-3xl font-bold text-warning">
                        {needsReplyComments.length}
                      </p>
                      <p className="text-xs text-muted mt-1">답글 필요</p>
                    </div>
                    <div className="p-4 bg-error/10 rounded-lg text-center">
                      <p className="text-3xl font-bold text-error">
                        {sentimentStats.negative.count}
                      </p>
                      <p className="text-xs text-muted mt-1">부정 댓글</p>
                    </div>
                  </div>
                </Card>

                {/* 추출된 아이디어 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    추출된 아이디어
                  </h3>
                  {extractedIdeas.length > 0 ? (
                    <div className="space-y-2">
                      {extractedIdeas.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 bg-primary/10 rounded-lg flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm text-foreground font-medium">{comment.idea}</p>
                            <p className="text-xs text-muted mt-1">
                              by {comment.author} • 👍 {comment.likes}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(comment.idea || '', `idea_${comment.id}`)}
                            icon={copiedId === `idea_${comment.id}` ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted text-center py-8">
                      추출된 아이디어가 없습니다
                    </p>
                  )}
                </Card>

                {/* 인기 키워드 (시뮬레이션) */}
                <Card className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    자주 언급된 키워드
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['꿀팁', '퀄리티', '편집', '다음 영상', '마이크', '무료', '프로그램', '감사', '도움', '추천'].map((keyword, index) => (
                      <motion.span
                        key={keyword}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 cursor-pointer transition-colors"
                        style={{ fontSize: `${14 + Math.random() * 8}px` }}
                      >
                        {keyword}
                      </motion.span>
                    ))}
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
