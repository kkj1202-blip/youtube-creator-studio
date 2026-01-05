'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { Scissors } from 'lucide-react';

export default function ClipPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="롱폼 → 쇼츠 변환기"
        description="긴 영상에서 하이라이트를 자동으로 추출하여 쇼츠로 변환합니다."
        icon={<Scissors className="w-10 h-10 text-primary" />}
        features={[
          '긴 영상 업로드 → 하이라이트 구간 AI 자동 감지',
          '바이럴 가능성 높은 구간 추천',
          '세로 비율(9:16) 자동 크롭',
          '자막 자동 포함',
          '여러 클립 한번에 추출',
          '클립별 다운로드',
        ]}
      />
    </MainLayout>
  );
}
