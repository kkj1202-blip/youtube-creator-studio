
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, voiceId, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required (Google Cloud or Gemini Key)' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Google Cloud TTS API Endpoint
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    // Default voice if not specified
    // Neural2 voices are higher quality
    const voiceName = voiceId || 'ko-KR-Neural2-A'; 
    const languageCode = voiceName.split('-').slice(0, 2).join('-'); // 'ko-KR'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: { 
            languageCode, 
            name: voiceName 
        },
        audioConfig: { 
            audioEncoding: 'MP3',
            speakingRate: 1.0, 
            pitch: 0.0 
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Google TTS API] Error:', data.error);
      return NextResponse.json(
        { error: data.error?.message || 'Google TTS failed' },
        { status: response.status }
      );
    }

    // data.audioContent is base64 encoded MP3
    // Create a data URL directly for the frontend to play/download
    const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
    
    // Estimate duration approx (not provided by API)
    // English ~15 chars/sec, Korean ~4-5 chars/sec?
    // Let's rely on frontend audio player to get exact duration, 
    // but return a rough estimate here if needed for timeline.
    // Korean syllables: roughly 0.2s each?
    const durationEstimate = text.length * 0.2; 

    return NextResponse.json({
      audioUrl,
      duration: durationEstimate, // rough estimate
      generated: true
    });

  } catch (error) {
    console.error('[Google TTS API] Internal Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    const url = `https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch voices' },
        { status: response.status }
      );
    }

    return NextResponse.json({ voices: data.voices });
  } catch (error) {
    console.error('[Google TTS API] List Voices Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
