import { NextRequest, NextResponse } from 'next/server';

// FFmpeg CDN 파일들을 프록시
const CDN_FILES: Record<string, { url: string; contentType: string }> = {
  'ffmpeg.js': {
    url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
    contentType: 'application/javascript',
  },
  'ffmpeg-core.js': {
    url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
    contentType: 'application/javascript',
  },
  'ffmpeg-core.wasm': {
    url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    contentType: 'application/wasm',
  },
  'ffmpeg-core.worker.js': {
    url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js',
    contentType: 'application/javascript',
  },
};

// 캐시 저장소
const cache = new Map<string, { data: ArrayBuffer; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1시간

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file || !CDN_FILES[file]) {
    return NextResponse.json(
      { error: 'Invalid file parameter', available: Object.keys(CDN_FILES) },
      { status: 400 }
    );
  }

  const { url, contentType } = CDN_FILES[file];

  try {
    // 캐시 확인
    const cached = cache.get(file);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[FFmpeg Proxy] Cache hit: ${file}`);
      return new NextResponse(cached.data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // CDN에서 파일 가져오기
    console.log(`[FFmpeg Proxy] Fetching: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CDN fetch failed: ${response.status}`);
    }

    const data = await response.arrayBuffer();

    // 캐시 저장
    cache.set(file, { data, timestamp: Date.now() });

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`[FFmpeg Proxy] Error fetching ${file}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch file from CDN' },
      { status: 500 }
    );
  }
}
