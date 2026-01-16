import { NextResponse } from 'next/server';

export async function GET() {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  return NextResponse.json({
    hasRapidApiKey: !!rapidApiKey,
    keyLength: rapidApiKey?.length || 0,
    keyPreview: rapidApiKey ? rapidApiKey.slice(0, 10) + '...' : 'NOT SET',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')),
  });
}
