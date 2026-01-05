'use client';

import { MainLayout } from '@/components/layout';
import ComingSoon from '@/components/tools/ComingSoon';
import { MessageSquare } from 'lucide-react';

export default function CommentsPage() {
  return (
    <MainLayout>
      <ComingSoon
        title="댓글 분석기"
        description="영상 댓글을 분석하여 인사이트를 추출합니다."
        icon={<MessageSquare className="w-10 h-10 text-primary" />}
        features={[
          '댓글 자동 분류 (긍정/부정/질문/요청)',
          '"다음 영상 아이디어" 자동 추출',
          '자주 나오는 키워드 워드클라우드',
          '답글 필요한 댓글 우선순위 정렬',
          '감정 분석 대시보드',
          '시간대별 댓글 트렌드',
        ]}
      />
    </MainLayout>
  );
}
