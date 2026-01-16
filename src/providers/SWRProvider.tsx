'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

/**
 * SWR 글로벌 설정
 * - 자동 리페치 비활성화 (영상 제작 앱에서는 불필요)
 * - 중복 요청 방지
 * - 에러 재시도 제한
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        // 캐시 유지 시간 (5분)
        dedupingInterval: 300000,
        
        // 에러 시 재시도 1회만
        errorRetryCount: 1,
        
        // 포커스 시 자동 리페치 비활성화
        revalidateOnFocus: false,
        
        // 재연결 시 자동 리페치 비활성화
        revalidateOnReconnect: false,
        
        // 마운트 시 리페치 비활성화
        revalidateOnMount: false,
        
        // 자동 리페치 간격 비활성화
        refreshInterval: 0,
        
        // 기본 fetcher
        fetcher: async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`API Error: ${res.status}`);
          }
          return res.json();
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
