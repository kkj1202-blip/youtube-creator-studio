// Viral Video Search Client
// TikTok/Instagram 트렌딩 영상 검색 및 다운로드

export interface VideoResult {
  id: string;
  platform: 'tiktok' | 'instagram';
  url: string;
  thumbnail: string;
  title: string;
  author: string;
  authorAvatar?: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  uploadDate: string;
  duration?: number;
}

export interface SearchParams {
  platform: 'tiktok' | 'instagram';
  query?: string;
  type: 'trending' | 'hashtag' | 'keyword';
  minViews?: number;
  maxAge?: number; // hours
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  videos: VideoResult[];
  error?: string;
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

// TikTok 트렌딩 영상 검색
export async function searchTikTokTrending(params: Omit<SearchParams, 'platform'>): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/viral-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, platform: 'tiktok' }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, videos: [], error: String(error) };
  }
}

// Instagram Reels 검색
export async function searchInstagramReels(params: Omit<SearchParams, 'platform'>): Promise<SearchResponse> {
  try {
    const response = await fetch('/api/viral-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, platform: 'instagram' }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, videos: [], error: String(error) };
  }
}

// 영상 다운로드
export async function downloadVideo(url: string, platform: 'tiktok' | 'instagram'): Promise<DownloadResponse> {
  try {
    const response = await fetch('/api/download-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, platform }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// 조회수 포맷팅 (1.2M, 500K 등)
export function formatViewCount(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

// 상대적 시간 포맷팅 (2시간 전, 3일 전 등)
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}
