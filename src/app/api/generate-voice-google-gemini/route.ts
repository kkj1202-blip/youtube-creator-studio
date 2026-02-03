
import { NextResponse } from 'next/server';

// Google AI Studio (Gemini) Endpoint
const GEMINI_TTS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

export async function POST(req: Request) {
  try {
    const { text, voiceId, speed, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Default to 'Kore' if no voiceId provided
    const selectedVoice = voiceId || 'Kore';

    // Gemini API Request Body
    const requestBody = {
      contents: [
        {
          parts: [
            { text: `Read the following text naturally and clearly in Korean. ${
            speed && speed !== 1.0 
              ? `Speaking speed: ${speed}x.`
              : ''
          }\nText: "${text}"` }
          ]
        }
      ],
      generationConfig: {
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        }
      }
    };

    console.log('Gemini TTS Request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini TTS API Error:', errorText);
        return NextResponse.json(
            { error: `Gemini TTS API Error: ${errorText}` },
            { status: response.status }
        );
    }

    const data = await response.json();
    console.log('Gemini TTS Response:', JSON.stringify(data, null, 2));

    let audioBase64 = null;
    
    if (data.audioContent) {
        audioBase64 = data.audioContent;
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
    }

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'No audio content received in Gemini response', details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audioUrl: `data:audio/mp3;base64,${audioBase64}`,
      duration: 0,
    });

  } catch (error) {
    console.error('Gemini TTS Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
