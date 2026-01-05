'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { TrendingUp } from 'lucide-react';

export default function TrendPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="트렌드 키워드 분석기"
        description="YouTube와 구글 트렌드를 분석하여 인기 키워드를 찾아줍니다."
        icon={<TrendingUp className="w-10 h-10 text-primary" />}
        features={[
          '유튜브/구글 트렌드 실시간 분석',
          '내 채널 카테고리 기반 인기 키워드',
          '경쟁 채널 인기 영상 제목 패턴 분석',
          'AI 제목 추천 (클릭률 예측 점수)',
          '키워드 검색량 추이 그래프',
          '관련 키워드 자동 추천',
        ]}
      />
    </MainLayout>
  );
}
