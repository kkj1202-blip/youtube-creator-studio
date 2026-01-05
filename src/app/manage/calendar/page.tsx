'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="콘텐츠 캘린더"
        description="영상 업로드 일정을 계획하고 관리합니다."
        icon={<Calendar className="w-10 h-10 text-primary" />}
        features={[
          '최적 업로드 시간대 분석',
          '쇼츠/롱폼 업로드 주기 관리',
          '예정된 영상 일정 캘린더 뷰',
          '알림 설정 (업로드 예정일 알림)',
          '드래그 앤 드롭 일정 조정',
          '반복 일정 설정',
        ]}
      />
    </MainLayout>
  );
}
