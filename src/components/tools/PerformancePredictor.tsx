'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Target,
  Lightbulb,
  BarChart3,
  Calendar,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button, Card, Input, Modal, Select } from '@/components/ui';
import { useStore } from '@/store/useStore';

interface PerformancePredictorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PredictionResult {
  views: {
    min: number;
    max: number;
    expected: number;
    trend: 'up' | 'down' | 'stable';
  };
  ctr: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; detail: string }[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  bestUploadTime: {
    day: string;
    time: string;
    reason: string;
  };
  competitors: {
    avgViews: number;
    topPerformer: string;
    opportunity: string;
  };
  recommendations: string[];
  overallScore: number;
}

const dayOptions = [
  { value: 'monday', label: '월요일' },
  { value: 'tuesday', label: '화요일' },
  { value: 'wednesday', label: '수요일' },
  { value: 'thursday', label: '목요일' },
  { value: 'friday', label: '금요일' },
  { value: 'saturday', label: '토요일' },
  { value: 'sunday', label: '일요일' },
];

const categoryOptions = [
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'gaming', label: '게임' },
  { value: 'education', label: '교육' },
  { value: 'tech', label: '기술/리뷰' },
  { value: 'vlog', label: '브이로그' },
  { value: 'cooking', label: '요리' },
  { value: 'beauty', label: '뷰티' },
  { value: 'finance', label: '재테크/금융' },
  { value: 'fitness', label: '피트니스' },
  { value: 'music', label: '음악' },
];

const PerformancePredictor: React.FC<PerformancePredictorProps> = ({ isOpen, onClose }) => {
  const { currentProject } = useStore();
  const [title, setTitle] = useState(currentProject?.name || '');
  const [category, setCategory] = useState('education');
  const [subscriberCount, setSubscriberCount] = useState('10000');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // 예측 실행
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    // 시뮬레이션 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000));

    const subscribers = parseInt(subscriberCount) || 10000;
    const baseViews = Math.round(subscribers * 0.1); // 구독자 대비 10% 기준
    
    // CTR 분석
    let ctrScore = 70;
    const ctrFactors: PredictionResult['ctr']['factors'] = [];
    
    // 제목 길이 분석
    if (title.length > 50) {
      ctrScore -= 10;
      ctrFactors.push({ name: '제목 길이', impact: 'negative', detail: '제목이 너무 길어 잘릴 수 있음' });
    } else if (title.length < 20) {
      ctrScore -= 5;
      ctrFactors.push({ name: '제목 길이', impact: 'neutral', detail: '더 자세한 제목이 도움될 수 있음' });
    } else {
      ctrScore += 5;
      ctrFactors.push({ name: '제목 길이', impact: 'positive', detail: '적절한 길이의 제목' });
    }

    // 숫자 포함
    if (/\d/.test(title)) {
      ctrScore += 10;
      ctrFactors.push({ name: '숫자 사용', impact: 'positive', detail: '숫자가 포함되어 클릭 유도에 효과적' });
    }

    // 감정 단어
    const emotionalWords = ['충격', '놀라운', '최고', '비밀', '진짜', '실화', '꿀팁', '필수', '완벽'];
    if (emotionalWords.some(word => title.includes(word))) {
      ctrScore += 15;
      ctrFactors.push({ name: '감정 유발', impact: 'positive', detail: '호기심을 자극하는 단어 포함' });
    }

    // 질문형
    if (title.includes('?')) {
      ctrScore += 5;
      ctrFactors.push({ name: '질문형 제목', impact: 'positive', detail: '질문이 시청자 참여 유도' });
    }

    // 카테고리별 보정
    const categoryMultiplier: Record<string, number> = {
      entertainment: 1.5,
      gaming: 1.3,
      education: 1.0,
      tech: 1.1,
      vlog: 0.8,
      cooking: 0.9,
      beauty: 1.2,
      finance: 1.1,
      fitness: 0.9,
      music: 1.4,
    };

    const multiplier = categoryMultiplier[category] || 1;

    // CTR 등급
    const getCTRGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
      if (score >= 90) return 'A';
      if (score >= 75) return 'B';
      if (score >= 60) return 'C';
      if (score >= 45) return 'D';
      return 'F';
    };

    // 최적 업로드 시간
    const bestTimes: Record<string, { day: string; time: string; reason: string }> = {
      entertainment: { day: '금요일', time: '18:00', reason: '주말 시청 준비 시간대' },
      gaming: { day: '토요일', time: '14:00', reason: '게이머 활동 피크 시간' },
      education: { day: '월요일', time: '09:00', reason: '새로운 한 주 시작, 자기계발 의지' },
      tech: { day: '화요일', time: '12:00', reason: '점심시간 정보 탐색' },
      vlog: { day: '일요일', time: '10:00', reason: '여유로운 주말 아침' },
      cooking: { day: '토요일', time: '11:00', reason: '주말 요리 준비 시간' },
      beauty: { day: '수요일', time: '20:00', reason: '저녁 셀프케어 시간' },
      finance: { day: '월요일', time: '07:00', reason: '출근 전 정보 습득' },
      fitness: { day: '월요일', time: '06:00', reason: '새로운 시작 의지' },
      music: { day: '금요일', time: '21:00', reason: '주말 전 음악 감상 시간' },
    };

    const prediction: PredictionResult = {
      views: {
        min: Math.round(baseViews * 0.5 * multiplier),
        max: Math.round(baseViews * 3 * multiplier),
        expected: Math.round(baseViews * 1.2 * multiplier),
        trend: ctrScore >= 75 ? 'up' : ctrScore >= 50 ? 'stable' : 'down',
      },
      ctr: {
        score: Math.min(100, Math.max(0, ctrScore)),
        grade: getCTRGrade(ctrScore),
        factors: ctrFactors,
      },
      engagement: {
        likes: Math.round(baseViews * multiplier * 0.05),
        comments: Math.round(baseViews * multiplier * 0.01),
        shares: Math.round(baseViews * multiplier * 0.005),
      },
      bestUploadTime: bestTimes[category] || bestTimes.education,
      competitors: {
        avgViews: Math.round(baseViews * multiplier * 0.8),
        topPerformer: `${(baseViews * multiplier * 5).toLocaleString()}회`,
        opportunity: ctrScore >= 70 ? '상위 20% 진입 가능성 높음' : '개선 후 재도전 권장',
      },
      recommendations: [],
      overallScore: Math.round((ctrScore + (multiplier * 30)) / 1.3),
    };

    // 추천사항
    if (title.length > 50) {
      prediction.recommendations.push('제목을 50자 이내로 줄이면 모바일 노출이 개선됩니다.');
    }
    if (!emotionalWords.some(word => title.includes(word))) {
      prediction.recommendations.push('"꿀팁", "필수", "충격" 같은 단어로 호기심을 유발하세요.');
    }
    if (!/\d/.test(title)) {
      prediction.recommendations.push('숫자를 포함하면 클릭률이 17% 상승합니다. (예: "5가지 방법")');
    }
    prediction.recommendations.push(`${prediction.bestUploadTime.day} ${prediction.bestUploadTime.time}에 업로드하면 최적의 노출을 얻을 수 있습니다.`);

    setResult(prediction);
    setIsAnalyzing(false);
  };

  // 포맷 함수들
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-success';
      case 'B': return 'text-primary';
      case 'C': return 'text-warning';
      default: return 'text-error';
    }
  };

  const getGradeBg = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-success';
      case 'B': return 'bg-primary';
      case 'C': return 'bg-warning';
      default: return 'bg-error';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4 text-success" />;
      case 'down': return <ArrowDownRight className="w-4 h-4 text-error" />;
      default: return <TrendingUp className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 예상 성과 분석기" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 입력 섹션 */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="영상 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="분석할 영상 제목을 입력하세요"
              />
            </div>
            <Select
              label="카테고리"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
            />
          </div>
          <div className="flex gap-4 mt-4">
            <Input
              label="구독자 수"
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="10000"
              type="number"
              className="flex-1"
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={!title.trim() || isAnalyzing}
                isLoading={isAnalyzing}
                icon={<Sparkles className="w-4 h-4" />}
              >
                예측 분석
              </Button>
            </div>
          </div>
        </Card>

        {/* 결과 섹션 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 종합 점수 */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">종합 성과 예측</h3>
                  <p className="text-sm text-muted">AI 기반 예상 성과 분석 결과</p>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${result.overallScore >= 70 ? 'text-success' : result.overallScore >= 50 ? 'text-warning' : 'text-error'}`}>
                    {result.overallScore}
                  </div>
                  <div className="text-sm text-muted">점수</div>
                </div>
              </div>
            </Card>

            {/* 예상 조회수 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">예상 조회수</h4>
                  {getTrendIcon(result.views.trend)}
                </div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {formatNumber(result.views.expected)}
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>최소: {formatNumber(result.views.min)}</span>
                  <span>최대: {formatNumber(result.views.max)}</span>
                </div>
                <div className="mt-3 h-2 bg-card-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(result.views.expected / result.views.max) * 100}%` }}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-secondary" />
                  <h4 className="font-medium">클릭률 (CTR) 예측</h4>
                </div>
                <div className="flex items-baseline gap-3 mb-3">
                  <div className={`text-4xl font-bold ${getGradeColor(result.ctr.grade)}`}>
                    {result.ctr.grade}
                  </div>
                  <div className="text-2xl font-semibold text-muted">
                    {result.ctr.score}%
                  </div>
                </div>
                <div className="space-y-2">
                  {result.ctr.factors.map((factor, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-sm ${
                        factor.impact === 'positive' ? 'text-success' :
                        factor.impact === 'negative' ? 'text-error' : 'text-muted'
                      }`}
                    >
                      {factor.impact === 'positive' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : factor.impact === 'negative' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Lightbulb className="w-4 h-4" />
                      )}
                      <span>{factor.name}: {factor.detail}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* 예상 참여도 */}
            <Card className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                예상 참여도
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-card-hover rounded-lg">
                  <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-xl font-bold">{formatNumber(result.engagement.likes)}</div>
                  <div className="text-xs text-muted">좋아요</div>
                </div>
                <div className="text-center p-3 bg-card-hover rounded-lg">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <div className="text-xl font-bold">{formatNumber(result.engagement.comments)}</div>
                  <div className="text-xs text-muted">댓글</div>
                </div>
                <div className="text-center p-3 bg-card-hover rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <div className="text-xl font-bold">{formatNumber(result.engagement.shares)}</div>
                  <div className="text-xs text-muted">공유</div>
                </div>
              </div>
            </Card>

            {/* 최적 업로드 시간 & 경쟁 분석 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  최적 업로드 시간
                </h4>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-sm font-bold">{result.bestUploadTime.day}</div>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <div className="text-sm font-bold">{result.bestUploadTime.time}</div>
                  </div>
                </div>
                <p className="text-sm text-muted mt-3">
                  💡 {result.bestUploadTime.reason}
                </p>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary" />
                  경쟁 분석
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">카테고리 평균 조회수</span>
                    <span className="font-medium">{formatNumber(result.competitors.avgViews)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">상위 영상 조회수</span>
                    <span className="font-medium">{result.competitors.topPerformer}</span>
                  </div>
                  <div className="mt-3 p-2 bg-primary/10 rounded text-sm">
                    🎯 {result.competitors.opportunity}
                  </div>
                </div>
              </Card>
            </div>

            {/* 개선 추천 */}
            <Card className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-warning" />
                성과 향상을 위한 추천
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-card-hover rounded"
                  >
                    <span className="text-warning">•</span>
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* 안내 메시지 */}
        {!result && !isAnalyzing && (
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
            <p className="text-muted">
              영상 제목과 카테고리를 입력하고<br />
              <span className="text-primary font-medium">예측 분석</span> 버튼을 클릭하세요
            </p>
          </Card>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="ghost"
            onClick={handleAnalyze}
            disabled={!title.trim() || isAnalyzing}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            다시 분석
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PerformancePredictor;
