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
  // 클라이언트에서 전달하는 API 키 (설정에서 입력)
  apiKeys?: string[];
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
  subscriberCount?: number;
  algorithmScore?: number; // (views / subscriberCount) * 100
}

// ============================================================================
// API Key 로테이션 시스템 (3개 키 순환 사용으로 할당량 분산)
// 클라이언트 설정 키 우선, 없으면 환경 변수 사용
// ============================================================================
let currentKeyIndex = 0;
let requestApiKeys: string[] = []; // 요청마다 설정되는 키

function setRequestApiKeys(keys: string[]) {
  requestApiKeys = keys.filter(k => k && k.trim());
}

function getApiKeys(): string[] {
  // 요청에서 전달받은 키가 있으면 사용
  if (requestApiKeys.length > 0) {
    return requestApiKeys;
  }
  // 없으면 환경 변수에서 가져오기
  const keys: string[] = [];
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);
  if (process.env.YOUTUBE_API_KEY_2) keys.push(process.env.YOUTUBE_API_KEY_2);
  if (process.env.YOUTUBE_API_KEY_3) keys.push(process.env.YOUTUBE_API_KEY_3);
  return keys;
}

function getNextApiKey(): string | null {
  const keys = getApiKeys();
  if (keys.length === 0) return null;
  
  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`🔑 Using YouTube API key #${(currentKeyIndex === 0 ? keys.length : currentKeyIndex)} of ${keys.length}`);
  return key;
}

// 채널 정보(구독자 수)를 일괄 조회하여 영상 정보에 병합하고 알코리즘 점수 계산
async function enrichVideosWithChannelInfo(videos: YouTubeVideo[], apiKey: string): Promise<YouTubeVideo[]> {
  if (videos.length === 0) return videos;

  // 1. 고유한 Channel ID 추출
  const channelIds = Array.from(new Set(videos.map(v => v.channelId))).filter(Boolean);
  const channelMap = new Map<string, number>(); // channelId -> subscriberCount

  // 2. 50개씩 끊어서 채널 정보 조회 (API Quota 절약)
  const chunkSize = 50;
  for (let i = 0; i < channelIds.length; i += chunkSize) {
    const chunk = channelIds.slice(i, i + chunkSize);
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelsUrl.searchParams.set('part', 'statistics');
    channelsUrl.searchParams.set('id', chunk.join(','));
    channelsUrl.searchParams.set('key', apiKey);

    try {
      const res = await fetch(channelsUrl.toString());
      const data = await res.json();
      if (data.items) {
        data.items.forEach((item: any) => {
          const subs = parseInt(item.statistics?.subscriberCount || '0', 10);
          channelMap.set(item.id, subs);
        });
      }
    } catch (e) {
      console.error('Failed to fetch channel info', e);
    }
  }

  // 3. 영상 정보에 구독자 수 병합 및 알고리즘 점수 계산
  return videos.map(video => {
    const subscriberCount = channelMap.get(video.channelId) || 0;
    // 구독자가 0이거나 숨김인 경우 조회수 자체를 점수로 (신규 채널 우대)
    // 구독자 1000명 이하인 경우 1000으로 보정 (극단적 비율 방지)
    const effectiveSubs = Math.max(subscriberCount, 1000); 
    
    // 알고리즘 점수 = (조회수 / 유효 구독자수) * 100 (%)
    // 예: 구독자 1만, 조회수 5만 -> 500% (5배 터짐)
    let algorithmScore = 0;
    if (effectiveSubs > 0) {
      algorithmScore = Math.floor((video.views / effectiveSubs) * 100);
    }

    return {
      ...video,
      subscriberCount,
      algorithmScore
    };
  });
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
  const apiKey = getNextApiKey();
  
  if (!apiKey) {
    console.error('No YouTube API keys configured');
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

    return videos;
  } catch (err) {
    console.error(err);
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
  const apiKey = getNextApiKey();
  
  if (!apiKey) {
    console.error('No YouTube API keys configured');
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
      limit = 50,
      apiKeys = []
    } = body;

    // 클라이언트에서 전달된 키 설정
    setRequestApiKeys(apiKeys);

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

    if (maxAge > 0 && type !== 'trending') { // 트렌딩은 이미 쿼리에서 필터링하거나 제공된 리스트
      const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
      videos = videos.filter(v => new Date(v.uploadDate).getTime() >= cutoff);
    }

    // Shorts만 필터링 (type이 shorts인 경우)
    if (type === 'shorts') {
      videos = videos.filter(v => v.isShort);
    }

    // 2. 알고리즘 점수 계산 (채널 구독자 조회) - 모든 결과에 대해 일괄 처리
    // API 키가 있을 때만 실행 (할당량 소모)
    const apiKey = getNextApiKey();
    if (apiKey) {
      try {
        videos = await enrichVideosWithChannelInfo(videos, apiKey);
      } catch (enrichErr) {
        console.error('Failed to enrich with channel info:', enrichErr);
        // 실패해도 비디오 목록은 반환
      }
    }

    // 기본 정렬: 조회수 순 (UI에서 변경 가능하므로 여기서는 raw data 제공에 집중)
    // 단, Algorithm Hunter의 취지에 맞게 algorithmScore 필드가 있으면 유용
    
    // limit 적용
    videos = videos.slice(0, limit);

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
