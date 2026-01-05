'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { MessageSquare } from 'lucide-react';

export default function SubtitlePage() {
  return (
    <MainLayout>
      <ComingSoon
        title="자막 자동 생성기"
        description="영상에서 음성을 추출하고 자막을 자동으로 생성합니다."
        icon={<MessageSquare className="w-10 h-10 text-primary" />}
        features={[
          '음성 → 텍스트 자동 변환 (Whisper)',
          '쇼츠용 세로 자막 / 롱폼용 가로 자막 자동 변환',
          '강조 단어 자동 하이라이트',
          '이모지 자동 삽입',
          '폰트, 색상, 위치, 크기 커스텀',
          'SRT, VTT 파일 내보내기',
        ]}
      />
    </MainLayout>
  );
}
