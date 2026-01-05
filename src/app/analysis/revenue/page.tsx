'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { BarChart3 } from 'lucide-react';

export default function RevenuePage() {
  return (
    <MainLayout>
      <ComingSoon
        title="수익/성과 대시보드"
        description="채널의 수익과 성과를 한눈에 분석합니다."
        icon={<BarChart3 className="w-10 h-10 text-primary" />}
        features={[
          '애드센스/협찬/멤버십 수익 통합 뷰',
          '쇼츠 vs 롱폼 ROI 비교',
          '작업 시간 대비 수익 분석',
          '월별/영상별 성과 그래프',
          '예상 수익 시뮬레이션',
          '수익 트렌드 알림',
        ]}
      />
    </MainLayout>
  );
}
