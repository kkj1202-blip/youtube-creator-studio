import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * Change audio speed using ffmpeg
 */
async function changeAudioSpeed(audioBuffer: Buffer, speed: number): Promise<Buffer> {
  if (speed === 1.0) return audioBuffer;

  // Limit speed to safe range (0.5x to 2.0x)
  const safeSpeed = Math.max(0.5, Math.min(2.0, speed));
  
  // Use a temp file approach for better stability than piping in some environments
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${uuidv4()}.mp3`);
  const outputPath = path.join(tempDir, `output-${uuidv4()}.mp3`);

  await fs.promises.writeFile(inputPath, audioBuffer);

  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static not found'));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-i', inputPath,
      '-filter:a', `atempo=${safeSpeed}`,
      '-vn', // No video
      outputPath
    ]);

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        try {
          const outputBuffer = await fs.promises.readFile(outputPath);
          // Cleanup
          await fs.promises.unlink(inputPath).catch(() => {});
          await fs.promises.unlink(outputPath).catch(() => {});
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
        // Cleanup on error
        await fs.promises.unlink(inputPath).catch(() => {});
        await fs.promises.unlink(outputPath).catch(() => {});
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * 음성 생성 API 엔드포인트
 * ElevenLabs TTS API 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, voiceId, text, speed, stability, similarityBoost, style, useSpeakerBoost } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { error: '보이스 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // ElevenLabs TTS API 호출 (고품질 설정)
    // output_format: mp3_44100_192 (44.1kHz, 192kbps - 고품질)
    const outputFormat = 'mp3_44100_192';
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2', // 한국어 지원 모델
          voice_settings: {
            stability: stability ?? 0.50, // Default to balanced
            similarity_boost: similarityBoost ?? 0.75,
            style: style ?? 0.0,
            use_speaker_boost: useSpeakerBoost ?? true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
      // 데모 모드 (개발 환경 또는 특정 키)
      if (process.env.NODE_ENV === 'development' && (!apiKey || apiKey === 'demo')) {
        return NextResponse.json({ 
          audioUrl: '/demo-audio.mp3',
          duration: Math.ceil(text.length / 5.8),
          demo: true,
          message: 'API 키가 유효하지 않아 데모 오디오가 반환되었습니다.'
        });
      }
      
      return NextResponse.json(
        { error: `음성 생성 실패: ${errorText}` },
        { status: response.status }
      );
    }

    // 오디오 데이터를 버퍼로 받음
    let audioBuffer = Buffer.from(await response.arrayBuffer());

    // 속도 조절 (ffmpeg 사용)
    if (speed && speed !== 1.0) {
      try {
        console.log(`Applying speed change: ${speed}x`);
        audioBuffer = await changeAudioSpeed(audioBuffer, speed);
      } catch (err) {
        console.error('Speed adjustment failed:', err);
        // 실패해도 원본 오디오는 반환 (경고 로그만 남김)
      }
    }

    // Base64 변환
    const base64Audio = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // 오디오 길이 계산 (192kbps 기준 + 0.5초 안전 마진)
    // 속도가 빨라지면 길이는 줄어듦 (이미 Buffer 크기가 줄어들었으므로 자동 반영됨)
    const estimatedDuration = (audioBuffer.byteLength * 8) / (192 * 1000) + 0.5;

    return NextResponse.json({ 
      audioUrl,
      duration: Math.round(estimatedDuration * 10) / 10,
    });
  } catch (error) {
    console.error('Voice generation error:', error);
    
    // 데모 모드 폴백
    if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
            audioUrl: '/demo-audio.mp3',
            duration: 5,
            demo: true
        });
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
