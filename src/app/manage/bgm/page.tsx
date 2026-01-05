'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { Music } from 'lucide-react';

export default function BgmPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="BGM & 효과음 라이브러리"
        description="저작권 걱정 없는 BGM과 효과음을 찾아보세요."
        icon={<Music className="w-10 h-10 text-primary" />}
        features={[
          '영상 분위기 분석 → BGM 자동 추천',
          '저작권 프리 음원만 제공',
          '장면 전환점 효과음 타이밍 제안',
          '즐겨찾기 + 최근 사용 목록',
          '장르/분위기별 필터링',
          '미리듣기 + 원클릭 다운로드',
        ]}
      />
    </MainLayout>
  );
}
