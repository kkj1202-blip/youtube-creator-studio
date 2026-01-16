import { NextRequest, NextResponse } from 'next/server';

// yt-dlp 기반 영상 다운로드 (또는 외부 서비스)
// TikTok/Instagram 영상 URL → 다운로드 링크 생성

interface DownloadRequest {
  url: string;
  platform: 'tiktok' | 'instagram';
  noWatermark?: boolean;
}

// 외부 다운로드 서비스 활용 (API 키 불필요)
async function getDownloadUrl(url: string, platform: string, noWatermark = true): Promise<string> {
  try {
    if (platform === 'tiktok') {
      // TikTok 다운로드 서비스 (무료)
      // tikwm.com API 활용
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('TikTok download service error');
      }

      const data = await response.json();
      
      if (data.code === 0 && data.data) {
        // noWatermark 옵션에 따라 다른 URL 반환
        return noWatermark 
          ? (data.data.play || data.data.wmplay)
          : (data.data.wmplay || data.data.play);
      }
      
      throw new Error(data.msg || 'Failed to get download URL');
    } else {
      // Instagram 다운로드 서비스
      // igram.io 또는 saveinsta 활용
      const apiUrl = `https://api.igram.io/api/convert`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(url)}`,
      });

      if (!response.ok) {
        // 폴백: 다른 서비스 시도
        return await tryAlternativeInstagramDownload(url);
      }

      const data = await response.json();
      
      if (data.url && data.url.length > 0) {
        return data.url[0].url;
      }
      
      throw new Error('Failed to get Instagram download URL');
    }
  } catch (error) {
    console.error('Download service error:', error);
    throw error;
  }
}

// Instagram 대체 다운로드 시도
async function tryAlternativeInstagramDownload(url: string): Promise<string> {
  try {
    // SaveInsta API 시도
    const response = await fetch('https://api.saveinsta.io/api/v1/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].url;
      }
    }
  } catch {
    // 무시하고 에러 throw
  }
  
  throw new Error('All Instagram download services failed');
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { url, platform, noWatermark = true } = body;

    if (!url || !platform) {
      return NextResponse.json(
        { success: false, error: 'url과 platform은 필수입니다' },
        { status: 400 }
      );
    }

    // URL 유효성 검사
    if (platform === 'tiktok' && !url.includes('tiktok.com')) {
      return NextResponse.json(
        { success: false, error: '올바른 TikTok URL이 아닙니다' },
        { status: 400 }
      );
    }

    if (platform === 'instagram' && !url.includes('instagram.com')) {
      return NextResponse.json(
        { success: false, error: '올바른 Instagram URL이 아닙니다' },
        { status: 400 }
      );
    }

    const downloadUrl = await getDownloadUrl(url, platform, noWatermark);
    
    // 파일명 생성
    const timestamp = Date.now();
    const filename = `${platform}_${timestamp}.mp4`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      platform,
      noWatermark,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '다운로드 실패' 
      },
      { status: 500 }
    );
  }
}

// 직접 URL 입력으로 다운로드하는 GET 엔드포인트
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const platform = searchParams.get('platform') as 'tiktok' | 'instagram' | null;

  if (!url || !platform) {
    return NextResponse.json(
      { success: false, error: 'url과 platform 쿼리 파라미터가 필요합니다' },
      { status: 400 }
    );
  }

  try {
    const downloadUrl = await getDownloadUrl(url, platform, true);
    
    // 리다이렉트하여 직접 다운로드
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '다운로드 실패' 
      },
      { status: 500 }
    );
  }
}
