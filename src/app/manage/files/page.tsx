'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { FolderOpen } from 'lucide-react';

export default function FilesPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="소스 파일 정리기"
        description="영상 소스 파일을 효율적으로 관리합니다."
        icon={<FolderOpen className="w-10 h-10 text-primary" />}
        features={[
          '프로젝트별 폴더 자동 분류',
          '미사용 소스 감지 → 정리 제안',
          '용량 분석 + 정리 추천',
          '태그 기반 검색',
          '중복 파일 감지',
          '클라우드 백업 연동',
        ]}
      />
    </MainLayout>
  );
}
