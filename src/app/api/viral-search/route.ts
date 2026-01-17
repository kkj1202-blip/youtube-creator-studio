import { NextRequest, NextResponse } from 'next/server';

// TikTok/Instagram 트렌딩 영상 검색
// 직접 웹 API 호출 방식 (프록시 없이 지역별 데이터 가져오기)

interface SearchRequest {
  platform: 'tiktok' | 'instagram';
  query?: string;
  type: 'trending' | 'hashtag' | 'keyword';
  region?: 'korea' | 'global';
  minViews?: number;
  maxAge?: number;
  limit?: number;
}

interface VideoData {
  id: string;
  platform: 'tiktok' | 'instagram';
  url: string;
  thumbnail: string;
  title: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  uploadDate: string;
  duration?: number;
}

// ============================================================================
// Woop RapidAPI - 진짜 트렌딩/급상승 영상 데이터 (days, sorting 필터 지원)
// https://rapidapi.com/Woop/api/tiktok-most-trending-and-viral-content
// ============================================================================
async function fetchWoopTrending(
  days: number = 7, 
  region: string = 'global', 
  limit: number = 50
): Promise<VideoData[]> {
  const apiKey = process.env.WOOP_RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.log('⚠️ WOOP_RAPIDAPI_KEY not found, falling back to tikwm');
    return [];
  }

  try {
    const params = new URLSearchParams({
      days: String(days),           // 1 = 24시간, 7 = 1주일, 30 = 1달
      sorting: 'rise',              // rise = 일일 상승량 순, rate = 성장률 순
      videosLocation: region === 'korea' ? 'KR' : 'US',
      limit: String(limit),
    });

    console.log(`🔥 Fetching Woop API: days=${days}, region=${region}...`);

    const response = await fetch(
      `https://tiktok-most-trending-and-viral-content.p.rapidapi.com/video?${params}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'tiktok-most-trending-and-viral-content.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      console.error(`Woop API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Woop API 응답 구조에 맞게 매핑
    if (Array.isArray(data)) {
      const videos: VideoData[] = data.map((item: Record<string, unknown>) => ({
        id: String(item.id || item.videoId || ''),
        platform: 'tiktok' as const,
        url: String(item.videoUrl || item.url || `https://www.tiktok.com/@${item.authorName}/video/${item.id}`),
        thumbnail: String(item.coverUrl || item.cover || ''),
        title: String(item.description || item.title || ''),
        author: `@${item.authorName || item.author || 'unknown'}`,
        views: Number(item.playCount || item.views || 0),
        likes: Number(item.diggCount || item.likes || 0),
        comments: Number(item.commentCount || item.comments || 0),
        shares: Number(item.shareCount || item.shares || 0),
        uploadDate: item.createTime 
          ? new Date(Number(item.createTime) * 1000).toISOString() 
          : new Date().toISOString(),
        duration: Number(item.duration || 0),
      }));

      console.log(`🔥 Woop API returned: ${videos.length} trending videos`);
      return videos.sort((a, b) => b.views - a.views);
    }

    console.log('Woop API returned unexpected format');
    return [];
  } catch (error) {
    console.error('Woop API fetch error:', error);
    return [];
  }
}
// TikTok Web API를 통한 트렌딩 조회 - 키워드 검색 기반 (최신 영상 수집)
async function fetchTikTokTrending(region: string = 'US', limit: number = 20): Promise<VideoData[]> {
  const regionCode = region === 'korea' ? 'KR' : 'US';
  
  // tikwm의 해시태그 API는 "올타임 인기 영상"을 반환하여 1일/7일 필터에 부적합
  // 대신 키워드 검색 API를 사용하면 최신 영상을 얻을 수 있음 (테스트 확인됨)
  const SEARCH_KEYWORDS = regionCode === 'KR' 
    ? ['viral', 'fyp', '챌린지', '일상', 'vlog', 'kpop', 'comedy', 'dance', 'mukbang', 'trending']
    : ['viral', 'fyp', 'trending', 'foryou', 'comedy', 'dance', 'challenge', 'funny', 'satisfying', 'pov'];

  const mapToVideoData = (item: Record<string, unknown>): VideoData => ({
    id: String(item.video_id || item.id || ''),
    platform: 'tiktok' as const,
    url: `https://www.tiktok.com/@${(item.author as Record<string, unknown>)?.unique_id || 'user'}/video/${item.video_id || item.id}`,
    thumbnail: String(item.origin_cover || item.cover || item.ai_dynamic_cover || ''),
    title: String(item.title || ''),
    author: `@${(item.author as Record<string, unknown>)?.unique_id || (item.author as Record<string, unknown>)?.nickname || 'unknown'}`,
    views: Number(item.play_count || 0),
    likes: Number(item.digg_count || 0),
    comments: Number(item.comment_count || 0),
    shares: Number(item.share_count || 0),
    uploadDate: new Date(Number(item.create_time || 0) * 1000).toISOString(),
    duration: Number(item.duration || 0),
  });

  try {
    const allVideos: VideoData[] = [];
    const seenIds = new Set<string>();

    console.log(`🚀 Starting keyword-based TikTok fetch (region: ${regionCode})...`);

    // 1) 트렌딩 피드 (소수지만 일단 포함)
    const trendingPromise = fetch(`https://www.tikwm.com/api/feed/list?region=${regionCode}&count=50`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    }).then(r => r.json()).catch(() => null);

    // 2) 키워드 검색으로 최신 영상 수집 (각각 50개씩)
    const searchPromises = SEARCH_KEYWORDS.map(keyword =>
      fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=50`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      }).then(r => r.json()).catch(() => null)
    );

    // 모든 요청 병렬 실행
    const [trendingResult, ...searchResults] = await Promise.all([trendingPromise, ...searchPromises]);

    // 트렌딩 결과 처리
    if (trendingResult?.code === 0 && trendingResult.data) {
      const items = Array.isArray(trendingResult.data) ? trendingResult.data : Object.values(trendingResult.data);
      for (const item of items as Record<string, unknown>[]) {
        try {
          const video = mapToVideoData(item);
          if (video.id && video.views > 0 && !seenIds.has(video.id)) {
            seenIds.add(video.id);
            allVideos.push(video);
          }
        } catch { /* skip */ }
      }
      console.log(`📊 Trending feed: ${items.length} items`);
    }

    // 키워드 검색 결과 처리
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      if (result?.code === 0 && result.data?.videos) {
        const videos = result.data.videos as Record<string, unknown>[];
        for (const item of videos) {
          try {
            const video = mapToVideoData(item);
            if (video.id && video.views > 0 && !seenIds.has(video.id)) {
              seenIds.add(video.id);
              allVideos.push(video);
            }
          } catch { /* skip */ }
        }
        console.log(`🔍 "${SEARCH_KEYWORDS[i]}": ${videos.length} items`);
      }
    }

    console.log(`🎵 TikTok total collected: ${allVideos.length} unique videos`);
    
    // 조회수 높은 순으로 정렬
    return allVideos.sort((a, b) => b.views - a.views);
  } catch (error) {
    console.error('TikTok keyword search fetch error:', error);
    return [];
  }
}

// TikTok 해시태그 검색
async function fetchTikTokHashtag(hashtag: string, limit: number = 20): Promise<VideoData[]> {
  try {
    const tag = hashtag.replace(/^#/, '');
    
    // tikwm.com 해시태그 API
    const response = await fetch(`https://www.tikwm.com/api/challenge/posts?challenge_name=${encodeURIComponent(tag)}&count=${limit}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`TikTok hashtag API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code === 0 && data.data && Array.isArray(data.data.videos)) {
      return data.data.videos.map((item: Record<string, unknown>) => ({
        id: String(item.id || item.video_id || ''),
        platform: 'tiktok' as const,
        url: `https://www.tiktok.com/@${(item.author as Record<string, unknown>)?.unique_id || 'user'}/video/${item.id}`,
        thumbnail: String(item.origin_cover || item.cover || ''),
        title: String(item.title || `#${tag}`),
        author: `@${(item.author as Record<string, unknown>)?.unique_id || 'unknown'}`,
        views: Number(item.play_count || 0),
        likes: Number(item.digg_count || 0),
        comments: Number(item.comment_count || 0),
        shares: Number(item.share_count || 0),
        uploadDate: new Date(Number(item.create_time || 0) * 1000).toISOString(),
        duration: Number(item.duration || 0),
      }));
    }
    
    return [];
  } catch (error) {
    console.error('TikTok hashtag fetch error:', error);
    return [];
  }
}

// TikTok 키워드 검색
async function fetchTikTokSearch(keyword: string, limit: number = 20): Promise<VideoData[]> {
  try {
    // tikwm.com 검색 API
    const response = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=${limit}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`TikTok search API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code === 0 && data.data && Array.isArray(data.data.videos)) {
      return data.data.videos.map((item: Record<string, unknown>) => ({
        id: String(item.id || ''),
        platform: 'tiktok' as const,
        url: `https://www.tiktok.com/@${(item.author as Record<string, unknown>)?.unique_id || 'user'}/video/${item.id}`,
        thumbnail: String(item.origin_cover || item.cover || ''),
        title: String(item.title || keyword),
        author: `@${(item.author as Record<string, unknown>)?.unique_id || 'unknown'}`,
        views: Number(item.play_count || 0),
        likes: Number(item.digg_count || 0),
        comments: Number(item.comment_count || 0),
        shares: Number(item.share_count || 0),
        uploadDate: new Date(Number(item.create_time || 0) * 1000).toISOString(),
        duration: Number(item.duration || 0),
      }));
    }
    
    return [];
  } catch (error) {
    console.error('TikTok search fetch error:', error);
    return [];
  }
}

// Instagram RapidAPI를 통한 실제 데이터 조회
async function fetchInstagramReels(region: string = 'global', limit: number = 20): Promise<VideoData[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  console.log('🔑 Instagram API Check - RAPIDAPI_KEY present:', !!apiKey, apiKey ? `(${apiKey.length} chars)` : '');
  
  if (!apiKey) {
    console.log('⚠️ RAPIDAPI_KEY not found, using Instagram mock data');
    return [];
  }

  try {
    // RapidAPI Instagram Scraper2 by JoTucker
    // 올바른 엔드포인트: hash_tag_medias (hash_tag 파라미터 사용)
    const url = 'https://instagram-scraper2.p.rapidapi.com/hash_tag_medias?hash_tag=trending';
    console.log('📸 Calling Instagram API:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'instagram-scraper2.p.rapidapi.com',
      },
    });

    console.log('📸 Instagram API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📸 Instagram API Error Response:', errorText);
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📸 Instagram API Response Keys:', Object.keys(data));
    
    // API 응답 구조가 다를 수 있음 - 여러 형태 지원
    const items = data.data?.items || data.items || data.data || [];
    console.log('📸 Instagram items count:', Array.isArray(items) ? items.length : 'not array');
    
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, limit).map((item: Record<string, unknown>) => {
        const media = (item.media as Record<string, unknown>) || item;
        const imageVersions = media.image_versions2 as { candidates?: Array<{ url?: string }> } | undefined;
        const caption = media.caption as { text?: string } | undefined;
        return {
          id: String(media.pk || media.id || item.id || ''),
          platform: 'instagram' as const,
          url: `https://www.instagram.com/reel/${media.code || item.code || ''}`,
          thumbnail: String(imageVersions?.candidates?.[0]?.url || media.thumbnail_url || media.display_url || item.thumbnail_url || ''),
          title: String(caption?.text || media.caption || item.caption || '').slice(0, 100) || 'Instagram Reel',
          author: `@${(media.user as Record<string, unknown>)?.username || (item.user as Record<string, unknown>)?.username || 'instagram'}`,
          views: Number(media.play_count || media.view_count || item.play_count || 0),
          likes: Number(media.like_count || item.like_count || 0),
          comments: Number(media.comment_count || item.comment_count || 0),
          uploadDate: new Date(Number(media.taken_at || item.taken_at || 0) * 1000).toISOString(),
          duration: Number(media.video_duration || item.video_duration || 0),
        };
      });
    }
    
    console.log('📸 Instagram API returned empty or invalid data');
    return [];
  } catch (error) {
    console.error('📸 Instagram API catch error:', error);
    return [];
  }
}

// Instagram Mock 데이터
function getInstagramMockData(query?: string, region: string = 'global'): VideoData[] {
  const isKorea = region === 'korea';
  
  if (isKorea) {
    return [
      {
        id: 'ig_kr_1',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/KR123',
        thumbnail: 'https://picsum.photos/seed/igkr1/400/600',
        title: query ? `${query} 바이럴 릴스` : '🎬 폭발적 인기 릴스',
        author: '@insta_viral_kr',
        views: 3200000,
        likes: 520000,
        comments: 18000,
        uploadDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        duration: 30,
      },
      {
        id: 'ig_kr_2',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/KR456',
        thumbnail: 'https://picsum.photos/seed/igkr2/400/600',
        title: '하루만에 터진 릴스 비결 🚀',
        author: '@reel_master_kr',
        views: 1500000,
        likes: 280000,
        comments: 9200,
        uploadDate: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        duration: 45,
      },
      {
        id: 'ig_kr_3',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/KR789',
        thumbnail: 'https://picsum.photos/seed/igkr3/400/600',
        title: '릴스 알고리즘 해킹 🔓',
        author: '@growth_tips_kr',
        views: 890000,
        likes: 145000,
        comments: 5600,
        uploadDate: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        duration: 60,
      },
    ];
  } else {
    return [
      {
        id: 'ig_us_1',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/US123',
        thumbnail: 'https://picsum.photos/seed/igus1/400/600',
        title: query ? `${query} trending reel` : '🔥 This is insane! #viral',
        author: '@kyliejenner',
        views: 52000000,
        likes: 9800000,
        comments: 185000,
        uploadDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        duration: 28,
      },
      {
        id: 'ig_us_2',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/US456',
        thumbnail: 'https://picsum.photos/seed/igus2/400/600',
        title: 'POV: When the beat drops 🎶 #reels',
        author: '@therock',
        views: 38000000,
        likes: 7200000,
        comments: 120000,
        uploadDate: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        duration: 35,
      },
      {
        id: 'ig_us_3',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/US789',
        thumbnail: 'https://picsum.photos/seed/igus3/400/600',
        title: 'Life hack you need to know 💡 #tips',
        author: '@5.min.crafts',
        views: 25000000,
        likes: 4500000,
        comments: 78000,
        uploadDate: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
        duration: 60,
      },
      {
        id: 'ig_us_4',
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/US101',
        thumbnail: 'https://picsum.photos/seed/igus4/400/600',
        title: 'Wait for it... 😱 #satisfying',
        author: '@oddlysatisfying',
        views: 19000000,
        likes: 3200000,
        comments: 45000,
        uploadDate: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        duration: 42,
      },
    ];
  }
}

// TikTok Mock 데이터 (API 실패 시 폴백)
function getTikTokMockData(query?: string, region: string = 'global'): VideoData[] {
  const isKorea = region === 'korea';
  
  if (isKorea) {
    return [
      {
        id: 'tt_kr_1',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@example_kr/video/123',
        thumbnail: 'https://picsum.photos/seed/ttkr1/400/600',
        title: query ? `${query} 관련 인기 영상` : '🔥 급상승 챌린지 영상',
        author: '@viral_creator_kr',
        views: 2500000,
        likes: 450000,
        comments: 12000,
        shares: 85000,
        uploadDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        duration: 32,
      },
      {
        id: 'tt_kr_2',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@example_kr/video/456',
        thumbnail: 'https://picsum.photos/seed/ttkr2/400/600',
        title: '24시간만에 100만뷰 돌파! 🚀',
        author: '@trending_star_kr',
        views: 1800000,
        likes: 320000,
        comments: 8500,
        shares: 45000,
        uploadDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        duration: 45,
      },
      {
        id: 'tt_kr_3',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@example_kr/video/789',
        thumbnail: 'https://picsum.photos/seed/ttkr3/400/600',
        title: '이게 진짜 대박인 이유 😱',
        author: '@content_master_kr',
        views: 950000,
        likes: 180000,
        comments: 4200,
        shares: 22000,
        uploadDate: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        duration: 28,
      },
    ];
  } else {
    return [
      {
        id: 'tt_us_1',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@charlidamelio/video/123',
        thumbnail: 'https://picsum.photos/seed/ttus1/400/600',
        title: query ? `${query} viral trend` : '🔥 Viral Dance Challenge #fyp',
        author: '@charlidamelio',
        views: 45000000,
        likes: 8500000,
        comments: 125000,
        shares: 950000,
        uploadDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        duration: 15,
      },
      {
        id: 'tt_us_2',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@khaby.lame/video/456',
        thumbnail: 'https://picsum.photos/seed/ttus2/400/600',
        title: 'When life gives you problems 😂 #comedy',
        author: '@khaby.lame',
        views: 32000000,
        likes: 6200000,
        comments: 85000,
        shares: 720000,
        uploadDate: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        duration: 12,
      },
      {
        id: 'tt_us_3',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@mrbeast/video/789',
        thumbnail: 'https://picsum.photos/seed/ttus3/400/600',
        title: 'I Gave Away $1,000,000 🤑 #challenge',
        author: '@mrbeast',
        views: 28000000,
        likes: 5100000,
        comments: 92000,
        shares: 680000,
        uploadDate: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        duration: 58,
      },
      {
        id: 'tt_us_4',
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@addisonre/video/101',
        thumbnail: 'https://picsum.photos/seed/ttus4/400/600',
        title: 'New trending audio 🎵 #viral',
        author: '@addisonre',
        views: 18500000,
        likes: 3800000,
        comments: 45000,
        shares: 320000,
        uploadDate: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        duration: 22,
      },
    ];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { platform, query, type, region = 'global', minViews, maxAge, limit = 20 } = body;

    if (!platform || !type) {
      return NextResponse.json(
        { success: false, videos: [], error: 'platform과 type은 필수입니다' },
        { status: 400 }
      );
    }

    let videos: VideoData[] = [];
    let source = 'api';

    if (platform === 'tiktok') {
      // TikTok 실제 API 호출
      if (type === 'trending') {
        // 1순위: Woop API (진짜 급상승 데이터, days 필터 지원)
        // maxAge는 시간 단위 → days로 변환 (1일=24h, 7일=168h)
        const woopDays = maxAge ? Math.ceil(maxAge / 24) : 7;
        videos = await fetchWoopTrending(woopDays, region, limit);
        if (videos.length > 0) {
          source = 'woop';
          console.log(`✅ Using Woop API: ${videos.length} trending videos (${woopDays} days)`);
        }
        
        // 2순위: tikwm (Woop 실패 시 fallback)
        if (videos.length === 0) {
          console.log('⚠️ Woop API empty, falling back to tikwm...');
          videos = await fetchTikTokTrending(region, limit);
        }
      } else if (type === 'hashtag' && query) {
        videos = await fetchTikTokHashtag(query, limit);
      } else if (type === 'keyword' && query) {
        videos = await fetchTikTokSearch(query, limit);
      }
      
      // API 실패 시 Mock 데이터 사용
      if (videos.length === 0) {
        console.log('TikTok API failed, using mock data');
        videos = getTikTokMockData(query, region);
        source = 'mock';
      }
    } else {
      // Instagram - RapidAPI로 시도, 실패시 Mock
      videos = await fetchInstagramReels(region, limit);
      
      if (videos.length === 0) {
        console.log('Instagram API failed or no key, using mock data');
        videos = getInstagramMockData(query, region);
        source = 'mock';
      }
    }

    // 필터링 적용
    if (minViews) {
      videos = videos.filter(v => v.views >= minViews);
    }

    if (maxAge) {
      const cutoff = Date.now() - maxAge * 60 * 60 * 1000;
      videos = videos.filter(v => new Date(v.uploadDate).getTime() >= cutoff);
    }

    // 조회수 기준 정렬
    videos.sort((a, b) => b.views - a.views);

    // limit 적용
    videos = videos.slice(0, limit);

    return NextResponse.json({
      success: true,
      videos,
      region,
      source,
      count: videos.length,
    });
  } catch (error) {
    console.error('Viral search error:', error);
    return NextResponse.json(
      { success: false, videos: [], error: String(error) },
      { status: 500 }
    );
  }
}
