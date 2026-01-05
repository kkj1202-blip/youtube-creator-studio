import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * 무료 음성 생성 API 엔드포인트
 * Edge TTS (Microsoft) - 완전 무료, API 키 불필요
 * 
 * 한국어 보이스:
 * - ko-KR-SunHiNeural (여성, 밝은)
 * - ko-KR-InJoonNeural (남성, 전문적)
 * - ko-KR-BongJinNeural (남성, 따뜻한)
 * - ko-KR-GookMinNeural (남성, 차분한)
 * - ko-KR-JiMinNeural (여성, 활발한)
 * - ko-KR-SeoHyeonNeural (여성, 차분한)
 * - ko-KR-SoonBokNeural (여성, 어른)
 * - ko-KR-YuJinNeural (여성, 젊은)
 */

// 한국어 Edge TTS 보이스 목록
export const KOREAN_VOICES = [
  { id: 'ko-KR-SunHiNeural', name: '선희 (여성, 밝은)', gender: 'female', description: '밝고 친근한 톤' },
  { id: 'ko-KR-InJoonNeural', name: '인준 (남성, 전문적)', gender: 'male', description: '전문적이고 차분한 톤' },
  { id: 'ko-KR-BongJinNeural', name: '봉진 (남성, 따뜻한)', gender: 'male', description: '따뜻하고 친근한 톤' },
  { id: 'ko-KR-GookMinNeural', name: '국민 (남성, 차분한)', gender: 'male', description: '차분하고 안정적인 톤' },
  { id: 'ko-KR-JiMinNeural', name: '지민 (여성, 활발한)', gender: 'female', description: '활발하고 생기있는 톤' },
  { id: 'ko-KR-SeoHyeonNeural', name: '서현 (여성, 차분한)', gender: 'female', description: '차분하고 편안한 톤' },
  { id: 'ko-KR-SoonBokNeural', name: '순복 (여성, 어른)', gender: 'female', description: '성숙하고 따뜻한 톤' },
  { id: 'ko-KR-YuJinNeural', name: '유진 (여성, 젊은)', gender: 'female', description: '젊고 활기찬 톤' },
];

// 감정/스타일 매핑
const emotionToStyle: Record<string, string> = {
  normal: 'general',
  emphasis: 'empathetic',
  whisper: 'whispering',
  excited: 'cheerful',
};

// 임시 디렉토리
const TMP_DIR = '/tmp/edge-tts-audio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voiceId, text, speed = 1.0, emotion = 'normal', pitch = 0 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    const selectedVoice = voiceId || 'ko-KR-SunHiNeural';
    
    // 속도 변환: 1.0 = 기본, 0.8 = -20%, 1.2 = +20%
    const ratePercent = Math.round((speed - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    
    // 피치 변환
    const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

    try {
      // 임시 디렉토리 생성
      if (!existsSync(TMP_DIR)) {
        await mkdir(TMP_DIR, { recursive: true });
      }

      const audioId = uuidv4();
      const outputPath = path.join(TMP_DIR, `${audioId}.mp3`);
      
      // Edge TTS CLI 실행 (edge-tts Python 패키지 사용)
      // pip install edge-tts 필요
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
      const command = `edge-tts --voice "${selectedVoice}" --rate="${rateStr}" --pitch="${pitchStr}" --text "${escapedText}" --write-media "${outputPath}"`;
      
      console.log('Edge TTS command:', command);
      
      try {
        await execAsync(command, { timeout: 30000 });
      } catch (execError: unknown) {
        // edge-tts가 설치되지 않은 경우 대안 사용
        console.log('Edge TTS CLI not available, using alternative method');
        
        // 대안 1: gtts (Google TTS) 시도
        try {
          const gttsCommand = `gtts-cli "${escapedText}" --lang ko --output "${outputPath}"`;
          await execAsync(gttsCommand, { timeout: 30000 });
        } catch {
          // 대안 2: 브라우저 TTS 사용 안내
          const estimatedDuration = Math.ceil(text.length / 5.8 / speed);
          return NextResponse.json({
            audioUrl: null,
            useBrowserTTS: true,
            voice: selectedVoice,
            duration: estimatedDuration,
            text: text,
            speed: speed,
            message: '서버 TTS를 사용할 수 없습니다. 브라우저 TTS를 사용합니다.',
          });
        }
      }

      // 생성된 오디오 파일 읽기
      if (existsSync(outputPath)) {
        const audioBuffer = await readFile(outputPath);
        const base64Audio = audioBuffer.toString('base64');
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

        // 오디오 길이 추정 (MP3 128kbps 기준)
        const estimatedDuration = Math.round((audioBuffer.byteLength * 8) / (128 * 1000) * 10) / 10;

        // 임시 파일 삭제
        await unlink(outputPath).catch(() => {});

        return NextResponse.json({
          audioUrl,
          duration: estimatedDuration || Math.ceil(text.length / 5.8 / speed),
          engine: 'edge-tts',
          voice: selectedVoice,
          free: true,
        });
      } else {
        throw new Error('오디오 파일이 생성되지 않았습니다.');
      }
    } catch (ttsError) {
      console.error('Edge TTS error:', ttsError);
      
      // 폴백: 브라우저 TTS 사용 안내
      const estimatedDuration = Math.ceil(text.length / 5.8 / speed);
      return NextResponse.json({
        audioUrl: null,
        useBrowserTTS: true,
        voice: selectedVoice,
        duration: estimatedDuration,
        text: text,
        speed: speed,
        message: 'Edge TTS 서버 연결 실패. 브라우저 TTS를 사용합니다.',
      });
    }
  } catch (error) {
    console.error('Free voice generation error:', error);
    return NextResponse.json(
      { error: '음성 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 사용 가능한 보이스 목록
export async function GET() {
  return NextResponse.json({
    voices: KOREAN_VOICES,
    engine: 'edge-tts',
    description: 'Microsoft Edge TTS - 무료, API 키 불필요',
    features: [
      '✅ 완전 무료 (API 키 불필요)',
      '✅ 8개 한국어 음성 (남성 3명, 여성 5명)',
      '✅ 속도 조절 (0.5x ~ 2.0x)',
      '✅ 피치 조절',
      '✅ 자연스러운 신경망 음성',
    ],
  });
}
