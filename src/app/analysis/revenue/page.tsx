'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Tabs } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Video,
  Eye,
  ThumbsUp,
  Download,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Star,
  Film,
} from 'lucide-react';

// 데모 수익 데이터
const demoMonthlyRevenue = [
  { month: '7월', adsense: 850000, sponsorship: 500000, membership: 120000, total: 1470000 },
  { month: '8월', adsense: 920000, sponsorship: 800000, membership: 150000, total: 1870000 },
  { month: '9월', adsense: 780000, sponsorship: 300000, membership: 180000, total: 1260000 },
  { month: '10월', adsense: 1050000, sponsorship: 1200000, membership: 200000, total: 2450000 },
  { month: '11월', adsense: 1180000, sponsorship: 600000, membership: 220000, total: 2000000 },
  { month: '12월', adsense: 1350000, sponsorship: 1500000, membership: 250000, total: 3100000 },
];

// 데모 영상별 성과
const demoVideoPerformance = [
  {
    id: '1',
    title: '[꿀팁] AI로 영상 편집하는 방법 (초간단)',
    type: 'shorts' as const,
    views: 1250000,
    likes: 45000,
    comments: 1200,
    revenue: 380000,
    workHours: 2,
    roi: 190000,
    date: '12월 15일',
  },
  {
    id: '2',
    title: '유튜브 시작 1년, 솔직 후기 (수익 공개)',
    type: 'longform' as const,
    views: 320000,
    likes: 18000,
    comments: 2800,
    revenue: 520000,
    workHours: 12,
    roi: 43333,
    date: '12월 10일',
  },
  {
    id: '3',
    title: '이 장비 하나로 퀄리티 10배 업',
    type: 'shorts' as const,
    views: 890000,
    likes: 32000,
    comments: 800,
    revenue: 280000,
    workHours: 1.5,
    roi: 186667,
    date: '12월 8일',
  },
  {
    id: '4',
    title: '영상 편집 기초부터 고급까지 완벽 가이드',
    type: 'longform' as const,
    views: 180000,
    likes: 12000,
    comments: 1500,
    revenue: 420000,
    workHours: 20,
    roi: 21000,
    date: '12월 5일',
  },
  {
    id: '5',
    title: '쇼츠 알고리즘 뚫는 법',
    type: 'shorts' as const,
    views: 2100000,
    likes: 78000,
    comments: 2100,
    revenue: 620000,
    workHours: 3,
    roi: 206667,
    date: '12월 1일',
  },
];

// 수익 소스 비율
const revenueSourceRatio = {
  adsense: { label: '애드센스', percentage: 55, color: '#10b981', amount: 1350000 },
  sponsorship: { label: '협찬', percentage: 35, color: '#3b82f6', amount: 1500000 },
  membership: { label: '멤버십', percentage: 10, color: '#f59e0b', amount: 250000 },
};

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showAddRevenue, setShowAddRevenue] = useState(false);

  const tabs = [
    { id: 'overview', label: '전체 현황', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'videos', label: '영상별 성과', icon: <Video className="w-4 h-4" /> },
    { id: 'roi', label: 'ROI 분석', icon: <Target className="w-4 h-4" /> },
  ];

  const periodOptions = [
    { value: 'week', label: '이번 주' },
    { value: 'month', label: '이번 달' },
    { value: '3months', label: '최근 3개월' },
    { value: '6months', label: '최근 6개월' },
    { value: 'year', label: '올해' },
  ];

  // 현재 달 데이터
  const currentMonth = demoMonthlyRevenue[demoMonthlyRevenue.length - 1];
  const prevMonth = demoMonthlyRevenue[demoMonthlyRevenue.length - 2];
  const revenueChange = ((currentMonth.total - prevMonth.total) / prevMonth.total * 100).toFixed(1);

  // 쇼츠 vs 롱폼 비교
  const shortsVideos = demoVideoPerformance.filter(v => v.type === 'shorts');
  const longformVideos = demoVideoPerformance.filter(v => v.type === 'longform');
  
  const shortsAvgROI = shortsVideos.reduce((sum, v) => sum + v.roi, 0) / shortsVideos.length;
  const longformAvgROI = longformVideos.reduce((sum, v) => sum + v.roi, 0) / longformVideos.length;

  // 숫자 포맷
  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatKRW = (num: number) => {
    return num.toLocaleString('ko-KR') + '원';
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                💰 수익/성과 대시보드
              </h1>
              <p className="text-muted">
                채널의 수익과 ROI를 한눈에 분석하세요
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                label=""
                options={periodOptions}
                value={selectedPeriod}
                onChange={setSelectedPeriod}
              />
              <Button
                variant="primary"
                onClick={() => setShowAddRevenue(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                수익 기록
              </Button>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 총 수익 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">이번 달 수익</span>
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatKRW(currentMonth.total)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${parseFloat(revenueChange) >= 0 ? 'text-success' : 'text-error'}`}>
                {parseFloat(revenueChange) >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{Math.abs(parseFloat(revenueChange))}% 전월 대비</span>
              </div>
            </Card>
          </motion.div>

          {/* 평균 ROI */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">평균 시간당 수익</span>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatKRW(Math.round(demoVideoPerformance.reduce((sum, v) => sum + v.roi, 0) / demoVideoPerformance.length))}
              </p>
              <p className="text-sm text-muted mt-2">작업 시간 대비</p>
            </Card>
          </motion.div>

          {/* 총 조회수 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">이번 달 조회수</span>
                <Eye className="w-5 h-5 text-warning" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(demoVideoPerformance.reduce((sum, v) => sum + v.views, 0))}
              </p>
              <p className="text-sm text-success mt-2 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +28% 전월 대비
              </p>
            </Card>
          </motion.div>

          {/* 업로드 영상 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">이번 달 업로드</span>
                <Video className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {demoVideoPerformance.length}개
              </p>
              <p className="text-sm text-muted mt-2">
                쇼츠 {shortsVideos.length} / 롱폼 {longformVideos.length}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 mb-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* 월별 수익 그래프 */}
                <Card className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    월별 수익 추이
                  </h3>
                  
                  {/* 간단한 막대 그래프 */}
                  <div className="flex items-end gap-4 h-48 mt-4">
                    {demoMonthlyRevenue.map((data, i) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col gap-0.5" style={{ height: '160px' }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(data.membership / 3500000) * 100}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="w-full bg-warning rounded-t"
                          />
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(data.sponsorship / 3500000) * 100}%` }}
                            transition={{ delay: i * 0.1 + 0.1, duration: 0.5 }}
                            className="w-full bg-primary"
                          />
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(data.adsense / 3500000) * 100}%` }}
                            transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                            className="w-full bg-success rounded-b"
                          />
                        </div>
                        <span className="text-xs text-muted mt-2">{data.month}</span>
                        <span className="text-xs font-medium text-foreground">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 범례 */}
                  <div className="flex gap-6 mt-4 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-success" />
                      <span className="text-xs text-muted">애드센스</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-xs text-muted">협찬</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-warning" />
                      <span className="text-xs text-muted">멤버십</span>
                    </div>
                  </div>
                </Card>

                {/* 수익 소스 비율 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    수익 소스 비율
                  </h3>
                  
                  {/* 간단한 원형 표시 */}
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#10b981"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${55 * 3.14} ${100 * 3.14}`}
                        initial={{ strokeDashoffset: 314 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 1 }}
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#3b82f6"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${35 * 3.14} ${100 * 3.14}`}
                        strokeDashoffset={`${-55 * 3.14}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">100%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(revenueSourceRatio).map(([key, source]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: source.color }}
                          />
                          <span className="text-sm text-foreground">{source.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-foreground">
                            {formatKRW(source.amount)}
                          </span>
                          <span className="text-xs text-muted ml-2">
                            ({source.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    영상별 성과
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-card-hover">
                        <tr className="text-left text-xs text-muted">
                          <th className="p-3 font-medium">영상</th>
                          <th className="p-3 font-medium">유형</th>
                          <th className="p-3 font-medium">조회수</th>
                          <th className="p-3 font-medium">좋아요</th>
                          <th className="p-3 font-medium">댓글</th>
                          <th className="p-3 font-medium">수익</th>
                          <th className="p-3 font-medium">작업시간</th>
                          <th className="p-3 font-medium">시간당 수익</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoVideoPerformance
                          .sort((a, b) => b.roi - a.roi)
                          .map((video, index) => (
                            <motion.tr
                              key={video.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-border hover:bg-card-hover transition-colors"
                            >
                              <td className="p-3">
                                <div className="max-w-[250px]">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {video.title}
                                  </p>
                                  <p className="text-xs text-muted">{video.date}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  video.type === 'shorts' 
                                    ? 'bg-primary/20 text-primary' 
                                    : 'bg-warning/20 text-warning'
                                }`}>
                                  {video.type === 'shorts' ? '쇼츠' : '롱폼'}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-foreground">
                                {formatCurrency(video.views)}
                              </td>
                              <td className="p-3 text-sm text-foreground">
                                {formatCurrency(video.likes)}
                              </td>
                              <td className="p-3 text-sm text-foreground">
                                {formatCurrency(video.comments)}
                              </td>
                              <td className="p-3 text-sm font-medium text-success">
                                {formatKRW(video.revenue)}
                              </td>
                              <td className="p-3 text-sm text-muted">
                                {video.workHours}시간
                              </td>
                              <td className="p-3">
                                <span className={`text-sm font-bold ${
                                  video.roi > 150000 ? 'text-success' :
                                  video.roi > 50000 ? 'text-warning' : 'text-muted'
                                }`}>
                                  {formatKRW(video.roi)}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* ROI Tab */}
            {activeTab === 'roi' && (
              <motion.div
                key="roi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* 쇼츠 vs 롱폼 비교 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    쇼츠 vs 롱폼 ROI 비교
                  </h3>

                  <div className="space-y-6">
                    {/* 쇼츠 */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">쇼츠</span>
                        </div>
                        <span className="text-xs text-muted">{shortsVideos.length}개 영상</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xl font-bold text-primary">
                            {formatKRW(Math.round(shortsAvgROI))}
                          </p>
                          <p className="text-xs text-muted">시간당 수익</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {(shortsVideos.reduce((sum, v) => sum + v.workHours, 0) / shortsVideos.length).toFixed(1)}h
                          </p>
                          <p className="text-xs text-muted">평균 작업시간</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(Math.round(shortsVideos.reduce((sum, v) => sum + v.views, 0) / shortsVideos.length))}
                          </p>
                          <p className="text-xs text-muted">평균 조회수</p>
                        </div>
                      </div>
                    </div>

                    {/* 롱폼 */}
                    <div className="p-4 bg-warning/10 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Film className="w-5 h-5 text-warning" />
                          <span className="font-medium text-foreground">롱폼</span>
                        </div>
                        <span className="text-xs text-muted">{longformVideos.length}개 영상</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xl font-bold text-warning">
                            {formatKRW(Math.round(longformAvgROI))}
                          </p>
                          <p className="text-xs text-muted">시간당 수익</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {(longformVideos.reduce((sum, v) => sum + v.workHours, 0) / longformVideos.length).toFixed(1)}h
                          </p>
                          <p className="text-xs text-muted">평균 작업시간</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(Math.round(longformVideos.reduce((sum, v) => sum + v.views, 0) / longformVideos.length))}
                          </p>
                          <p className="text-xs text-muted">평균 조회수</p>
                        </div>
                      </div>
                    </div>

                    {/* 비교 결과 */}
                    <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-success fill-success" />
                        <span className="font-medium text-success">ROI 승자</span>
                      </div>
                      <p className="text-foreground">
                        <span className="font-bold">쇼츠</span>가 시간당 수익이{' '}
                        <span className="text-success font-bold">
                          {((shortsAvgROI / longformAvgROI - 1) * 100).toFixed(0)}% 더 높습니다
                        </span>
                      </p>
                      <p className="text-sm text-muted mt-2">
                        하지만 롱폼은 협찬/브랜드 딜 기회가 더 많고, 충성 구독자 확보에 유리합니다.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* ROI 팁 & 인사이트 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    수익 최적화 인사이트
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">쇼츠 업로드 빈도 증가 추천</p>
                          <p className="text-sm text-muted mt-1">
                            쇼츠의 시간 대비 수익이 5배 높습니다. 주 3-5개 쇼츠 업로드를 권장합니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">협찬 비중 확대 가능</p>
                          <p className="text-sm text-muted mt-1">
                            현재 협찬이 총 수익의 35%입니다. 니치 협찬을 통해 50%까지 확대 가능합니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">롱폼 작업시간 최적화</p>
                          <p className="text-sm text-muted mt-1">
                            롱폼 평균 작업시간이 16시간입니다. AI 도구 활용으로 8시간까지 단축 가능합니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">💡 이번 달 목표</h4>
                      <ul className="text-sm text-muted space-y-1">
                        <li>• 쇼츠 8개 → 12개로 증가</li>
                        <li>• 협찬 1건 추가 확보</li>
                        <li>• 롱폼 작업시간 20% 단축</li>
                      </ul>
                    </div>
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
