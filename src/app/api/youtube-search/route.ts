import { NextRequest, NextResponse } from 'next/server';

// YouTube Data API v3를 통한 급상승 영상 검색
// - 최근 1~7일 내 업로드된 영상
// - Shorts 필터링 지원
// - 시크릿 모드 (API Key만 사용, 개인화 없음)

interface YouTubeSearchRequest {
  query?: string;
  type: 'trending' | 'shorts' | 'search';
  region?: string;
  maxAge?: number; // hours
  minViews?: number;
  limit?: number;
}

interface YouTubeVideo {
  id: string;
  platform: 'youtube';
  url: string;
  thumbnail: string;
  title: string;
  author: string;
  channelId: string;
  views: number;
  likes: number;
  comments: number;
  uploadDate: string;
  duration: number;
  isShort: boolean;
}

// ISO 8601 기간을 초로 변환
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// 조회수 문자열을 숫자로 변환
function parseViewCount(viewCount: string | number | undefined): number {
  if (!viewCount) return 0;
  if (typeof viewCount === 'number') return viewCount;
  return parseInt(viewCount.replace(/,/g, ''), 10) || 0;
}

// YouTube 트렌딩 영상 가져오기 (mostPopular)
async function fetchYouTubeTrending(
  regionCode: string = 'US',
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY not found');
    return [];
  }

  try {
    // 1. 트렌딩 영상 목록 가져오기
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videosUrl.searchParams.set('chart', 'mostPopular');
    videosUrl.searchParams.set('regionCode', regionCode);
    videosUrl.searchParams.set('maxResults', String(Math.min(maxResults, 50)));
    videosUrl.searchParams.set('key', apiKey);

    console.log(`🎬 Fetching YouTube trending: region=${regionCode}`);

    const response = await fetch(videosUrl.toString());
    
    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API error:', error);
      return [];
    }

    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    const videos: YouTubeVideo[] = data.items.map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const contentDetails = item.contentDetails as Record<string, unknown>;
      const statistics = item.statistics as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, Record<string, unknown>>;
      
      const duration = parseDuration(String(contentDetails?.duration || ''));
      const isShort = duration <= 60 || 
                      String(snippet.title || '').toLowerCase().includes('#shorts') ||
                      String(snippet.description || '').toLowerCase().includes('#shorts');

      return {
        id: String(item.id),
        platform: 'youtube' as const,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: String(thumbnails?.maxres?.url || thumbnails?.high?.url || thumbnails?.medium?.url || ''),
        title: String(snippet.title || ''),
        author: String(snippet.channelTitle || ''),
        channelId: String(snippet.channelId || ''),
        views: parseViewCount(statistics?.viewCount as string),
        likes: parseViewCount(statistics?.likeCount as string),
        comments: parseViewCount(statistics?.commentCount as string),
        uploadDate: String(snippet.publishedAt || new Date().toISOString()),
        duration,
        isShort,
      };
    });

    console.log(`🎬 YouTube trending: ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('YouTube trending fetch error:', error);
    return [];
  }
}

// YouTube 검색 (최신 영상)
async function searchYouTube(
  query: string,
  regionCode: string = 'US',
  publishedAfterHours: number = 24,
  maxResults: number = 50,
  shortsOnly: boolean = false
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY not found');
    return [];
  }

  try {
    // 기간 계산
    const publishedAfter = new Date(Date.now() - publishedAfterHours * 60 * 60 * 1000);
    
    // 검색 쿼리 수정 (Shorts 전용)
    const searchQuery = shortsOnly ? `${query} #shorts` : query;

    // 1. 검색으로 영상 ID 목록 가져오기
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'id');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('order', 'viewCount'); // 조회수순
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('regionCode', regionCode);
    searchUrl.searchParams.set('publishedAfter', publishedAfter.toISOString());
    searchUrl.searchParams.set('maxResults', String(Math.min(maxResults, 50)));
    if (shortsOnly) {
      searchUrl.searchParams.set('videoDuration', 'short'); // 4분 미만
    }
    searchUrl.searchParams.set('key', apiKey);

    console.log(`🔍 Searching YouTube: "${searchQuery}" in ${regionCode}, after ${publishedAfterHours}h`);

    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error('YouTube Search API error:', error);
      return [];
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('No search results');
      return [];
    }

    // 2. 영상 ID로 상세 정보 가져오기
    const videoIds = searchData.items
      .map((item: Record<string, unknown>) => (item.id as Record<string, unknown>)?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return [];

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videosUrl.searchParams.set('id', videoIds);
    videosUrl.searchParams.set('key', apiKey);

    const videosResponse = await fetch(videosUrl.toString());
    
    if (!videosResponse.ok) {
      return [];
    }

    const videosData = await videosResponse.json();

    const videos: YouTubeVideo[] = videosData.items.map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const contentDetails = item.contentDetails as Record<string, unknown>;
      const statistics = item.statistics as Record<string, unknown>;
      const thumbnails = snippet.thumbnails as Record<string, Record<string, unknown>>;
      
      const duration = parseDuration(String(contentDetails?.duration || ''));
      const isShort = duration <= 60 || 
                      String(snippet.title || '').toLowerCase().includes('#shorts') ||
                      String(snippet.description || '').toLowerCase().includes('#shorts');

      return {
        id: String(item.id),
        platform: 'youtube' as const,
        url: isShort 
          ? `https://www.youtube.com/shorts/${item.id}`
          : `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: String(thumbnails?.maxres?.url || thumbnails?.high?.url || thumbnails?.medium?.url || ''),
        title: String(snippet.title || ''),
        author: String(snippet.channelTitle || ''),
        channelId: String(snippet.channelId || ''),
        views: parseViewCount(statistics?.viewCount as string),
        likes: parseViewCount(statistics?.likeCount as string),
        comments: parseViewCount(statistics?.commentCount as string),
        uploadDate: String(snippet.publishedAt || new Date().toISOString()),
        duration,
        isShort,
      };
    });

    console.log(`🔍 YouTube search: ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// Shorts 트렌딩 검색 (여러 해외 지역)
async function fetchGlobalShortsTrending(
  publishedAfterHours: number = 72,
  limit: number = 50
): Promise<YouTubeVideo[]> {
  const regions = ['US', 'GB', 'JP', 'DE', 'FR', 'BR', 'MX', 'IN'];
  const keywords = ['viral', 'trending', 'fyp'];
  
  const allVideos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();

  // 각 지역의 트렌딩 가져오기 (병렬)
  const trendingPromises = regions.slice(0, 4).map(region => 
    fetchYouTubeTrending(region, 25)
  );

  // 키워드 검색 (병렬)
  const searchPromises = keywords.map(keyword =>
    searchYouTube(keyword, 'US', publishedAfterHours, 25, true)
  );

  const results = await Promise.all([...trendingPromises, ...searchPromises]);

  for (const videos of results) {
    for (const video of videos) {
      if (!seenIds.has(video.id)) {
        seenIds.add(video.id);
        allVideos.push(video);
      }
    }
  }

  // 조회수 순 정렬
  return allVideos.sort((a, b) => b.views - a.views).slice(0, limit);
}

export async function POST(request: NextRequest) {
  try {
    const body: YouTubeSearchRequest = await request.json();
    const { 
      query, 
      type = 'trending', 
      region = 'global', 
      maxAge = 72, // 기본 3일
      minViews = 0,
      limit = 50 
    } = body;

    let videos: YouTubeVideo[] = [];

    if (type === 'trending') {
      // 글로벌 트렌딩 (여러 지역 + Shorts 검색)
      if (region === 'global') {
        videos = await fetchGlobalShortsTrending(maxAge, limit);
      } else {
        const regionCode = region === 'korea' ? 'KR' : 'US';
        videos = await fetchYouTubeTrending(regionCode, limit);
      }
    } else if (type === 'shorts') {
      // Shorts 전용 검색
      const regionCode = region === 'korea' ? 'KR' : 'US';
      videos = await searchYouTube(query || 'trending', regionCode, maxAge, limit, true);
    } else if (type === 'search' && query) {
      // 일반 검색
      const regionCode = region === 'korea' ? 'KR' : 'US';
      videos = await searchYouTube(query, regionCode, maxAge, limit, false);
    }

    // 필터링
    if (minViews > 0) {
      videos = videos.filter(v => v.views >= minViews);
    }

    if (maxAge > 0) {
      const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
      videos = videos.filter(v => new Date(v.uploadDate).getTime() >= cutoff);
    }

    // Shorts만 필터링 (type이 shorts인 경우)
    if (type === 'shorts') {
      videos = videos.filter(v => v.isShort);
    }

    // 조회수순 정렬 및 limit 적용
    videos = videos.sort((a, b) => b.views - a.views).slice(0, limit);

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
      source: 'youtube-api',
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { success: false, videos: [], error: String(error) },
      { status: 500 }
    );
  }
}
