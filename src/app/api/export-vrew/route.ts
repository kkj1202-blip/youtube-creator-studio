import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

// Helper for Vrew-compatible Short IDs (10-12 chars)
function generateShortId(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate UUID v4 format (like real Vrew uses for some IDs)
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 병렬 처리를 위한 배치 함수 (동시에 최대 N개씩 처리)
async function processInBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map((item, idx) => processor(item, i + idx))
        );
        results.push(...batchResults);
    }
    return results;
}

// 이미지/오디오 fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number = 30000): Promise<ArrayBuffer | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            return await res.arrayBuffer();
        }
        return null;
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`Fetch timeout or error for ${url}:`, err);
        return null;
    }
}

export const maxDuration = 300; // Vercel 함수 타임아웃 5분으로 설정

export async function POST(req: NextRequest) {
  try {
    const { scenes, aspectRatio } = await req.json();
    
    console.log(`[export-vrew] Starting export for ${scenes.length} scenes`);
    
    // Aspect Ratio Logic
    const isShorts = aspectRatio === '9:16';
    const videoRatio = isShorts ? 0.5625 : 1.7777777777777777;
    const videoWidth = isShorts ? 1080 : 1920;
    const videoHeight = isShorts ? 1920 : 1080;

    // Create the Vrew Project Zip
    // ✅ 실제 Vrew 파일 분석 결과: media/ 경로 사용 (folder() 사용 안 함!)
    const projectZip = new JSZip();

    // 1. Prepare Assets - 병렬 처리로 최적화
    // Map으로 빠른 lookup을 위해 저장
    const imageAssetMap = new Map<number, any>();
    const audioAssetMap = new Map<number, any>();

    // 동시에 10개씩 병렬 처리 (메모리와 네트워크 밸런스)
    const BATCH_SIZE = 10;
    
    console.log(`[export-vrew] Processing images...`);
    
    // 이미지 병렬 처리
    await processInBatches(scenes, BATCH_SIZE, async (scene: any, index: number) => {
        if (!scene.imageUrl) return;
        
        const imageId = generateUUID();
        let imgBuffer: Buffer | null = null;

        try {
            if (scene.imageUrl.startsWith('data:')) {
                const base64Data = scene.imageUrl.split(',')[1];
                imgBuffer = Buffer.from(base64Data, 'base64');
            } else if (scene.imageUrl.startsWith('http')) {
                const ab = await fetchWithTimeout(scene.imageUrl);
                if (ab) {
                    imgBuffer = Buffer.from(ab);
                }
            } else {
                // Local File
                let localPath = decodeURIComponent(scene.imageUrl.replace(/^file:\/\/\/?/, ''));
                localPath = path.normalize(localPath);
                if (fs.existsSync(localPath)) {
                    imgBuffer = await fs.promises.readFile(localPath);
                }
            }

            if (imgBuffer) {
                const fileSize = imgBuffer.length;
                let imgWidth = 1920;
                let imgHeight = 1080;
                try {
                    const dims = sizeOf(imgBuffer);
                    imgWidth = dims.width || 1920;
                    imgHeight = dims.height || 1080;
                } catch (e) {
                    // 크기 읽기 실패해도 계속 진행
                }
                
                // ✅ 실제 Vrew: media/ 경로에 저장 (folder() 사용 안 함!)
                projectZip.file(`media/${imageId}.png`, imgBuffer);
                
                imageAssetMap.set(index, {
                    "version": 1,
                    "mediaId": imageId,
                    "sourceOrigin": "USER",
                    "fileSize": fileSize,
                    "name": `${imageId}.png`,
                    "type": "Image",
                    "isTransparent": false,
                    "fileLocation": "IN_MEMORY",
                    "_dims": { width: imgWidth, height: imgHeight }
                });
            }
        } catch (err) {
            console.error(`Error processing image for scene ${index}:`, err);
        }
    });
    
    console.log(`[export-vrew] Processed ${imageAssetMap.size} images`);
    console.log(`[export-vrew] Processing audio...`);

    // 오디오 병렬 처리
    await processInBatches(scenes, BATCH_SIZE, async (scene: any, index: number) => {
        if (!scene.audioUrl) return;
        
        const audioId = generateShortId(10);
        let audioBuffer: Buffer | null = null;
        
        try {
            if (scene.audioUrl.startsWith('http')) {
                const ab = await fetchWithTimeout(scene.audioUrl);
                if (ab) {
                    audioBuffer = Buffer.from(ab);
                }
            } else if (scene.audioUrl.startsWith('data:')) {
                const base64Data = scene.audioUrl.split(',')[1];
                audioBuffer = Buffer.from(base64Data, 'base64');
            } else {
                let localPath = decodeURIComponent(scene.audioUrl.replace(/^file:\/\/\/?/, ''));
                localPath = path.normalize(localPath);
                if (fs.existsSync(localPath)) {
                    audioBuffer = await fs.promises.readFile(localPath);
                }
            }

            if (audioBuffer) {
                const duration = Number(scene.audioDuration) || Number(scene.imageDuration) || 5;
                
                // ✅ 실제 Vrew: media/ 경로에 저장 (folder() 사용 안 함!)
                projectZip.file(`media/${audioId}.mp3`, audioBuffer);
                
                audioAssetMap.set(index, {
                    "version": 1,
                    "mediaId": audioId,
                    "sourceOrigin": "VREW_RESOURCE",
                    "fileSize": audioBuffer.length,
                    "name": `${(scene.script || '').substring(0, 30) || audioId}.mp3`,
                    "type": "AVMedia",
                    "videoAudioMetaInfo": {
                        "duration": duration,
                        "audioInfo": { 
                            "sampleRate": 24000, 
                            "codec": "mp3", 
                            "channelCount": 1 
                        }
                    },
                    "sourceFileType": "TTS",
                    "fileLocation": "IN_MEMORY",
                    "_speechText": scene.script || "",
                    "_duration": duration
                });
            }
        } catch (err) {
            console.error(`Error processing audio for scene ${index}:`, err);
        }
    });
    
    console.log(`[export-vrew] Processed ${audioAssetMap.size} audio files`);

    // 2. Build project.json structure
    const scenesPayload: any[] = [];
    const propsAssets: Record<string, any> = {};
    const ttsClipInfosMap: Record<string, any> = {};
    const originalClipsMap: Record<string, any[]> = {};

    const lastTTSSettings = {
      "pitch": 1, "speed": 0, "volume": 4,
      "speaker": {
        "age": "youth", "gender": "male", "lang": "ko-KR",
        "name": "vos-male05", "speakerId": "vos-male05", "provider": "kt",
        "emotions": ["neutral", "happy", "calm", "sad", "angry"],
        "tags": ["careful", "trustworthy", "sincere", "descriptive"]
      },
      "emotion": "calm"
    };

    // 씬 데이터 구성 (동기 처리 - 빠름)
    scenes.forEach((scene: any, index: number) => {
      const sceneId = generateShortId(10);
      const clipId = generateShortId(10);
      
      const script = String(scene.script || "");
      
      // Map에서 O(1)로 조회
      const matchedImage = imageAssetMap.get(index);
      const matchedAudio = audioAssetMap.get(index);
      
      // Use audio duration if available
      const duration = matchedAudio?._duration || Number(scene.audioDuration) || Number(scene.imageDuration) || 5;

      // Setup image asset reference
      const assetIds: string[] = [];
      if (matchedImage) {
          const usageId = generateUUID();
          assetIds.push(usageId);
          
          const imgRatio = matchedImage._dims.width / matchedImage._dims.height;
          
          propsAssets[usageId] = {
            "mediaId": matchedImage.mediaId,
            "xPos": 0, 
            "yPos": 0, 
            "height": 1, 
            "width": 1,
            "rotation": 0, 
            "zIndex": 0,
            "type": "image",
            "originalWidthHeightRatio": imgRatio,
            "importType": "user_asset_panel",
            "editInfo": {},
            "stats": { 
                "fillType": "cut", 
                "fillMenu": "floating", 
                "rearrangeCount": 0 
            }
          };
      }

      // Build words array
      // 🔴 지침서 v2: 오디오 없으면 words: [] 빈 배열!
      const words: any[] = [];
      
      if (matchedAudio) {
          // 오디오가 있을 때만 words 배열 생성
          const rawWords = script.split(/\s+/).filter((w: string) => w.length > 0);
          const totalWords = rawWords.length || 1;
          const audioMediaId = matchedAudio.mediaId;
          
          let currentTime = 0;
          const wordDuration = duration / (totalWords + 1);
          
          rawWords.forEach((wordText: string, i: number) => {
              words.push({
                  "id": generateShortId(10),
                  "text": wordText,
                  "startTime": currentTime,
                  "duration": wordDuration * 0.8,
                  "aligned": false,
                  "type": 0,
                  "originalDuration": wordDuration * 0.8,
                  "originalStartTime": currentTime,
                  "truncatedWords": [],
                  "autoControl": false,
                  "audioIds": [],
                  "assetIds": [],
                  "playbackRate": 1,
                  "mediaId": audioMediaId
              });
              currentTime += wordDuration * 0.8;
              
              if (i < rawWords.length - 1) {
                  words.push({
                      "id": generateShortId(10),
                      "text": "",
                      "startTime": currentTime,
                      "duration": wordDuration * 0.2,
                      "aligned": false,
                      "type": 1,
                      "originalDuration": wordDuration * 0.2,
                      "originalStartTime": currentTime,
                      "truncatedWords": [],
                      "autoControl": false,
                      "audioIds": [],
                      "assetIds": [],
                      "playbackRate": 1,
                      "mediaId": audioMediaId
                  });
                  currentTime += wordDuration * 0.2;
              }
          });

          // End Marker (오디오 있을 때만)
          words.push({
              "id": generateShortId(10),
              "text": "",
              "startTime": duration,
              "duration": 0,
              "aligned": false,
              "type": 2,
              "originalDuration": 0,
              "originalStartTime": duration,
              "truncatedWords": [],
              "autoControl": false,
              "audioIds": [],
              "assetIds": [],
              "playbackRate": 1,
              "mediaId": audioMediaId
          });
      } else {
          // 오디오 없을 때: 최소한 End Marker는 필요할 수 있음
          words.push({
              "id": generateShortId(10),
              "text": "",
              "startTime": duration,
              "duration": 0,
              "aligned": false,
              "type": 2,
              "originalDuration": 0,
              "originalStartTime": duration,
              "truncatedWords": [],
              "autoControl": false,
              "audioIds": [],
              "assetIds": [],
              "playbackRate": 1
          });
      }
      
      // ttsClipInfosMap
      if (matchedAudio) {
          ttsClipInfosMap[matchedAudio.mediaId] = {
              "duration": duration,
              "text": {
                  "raw": script,
                  "processed": script,
                  "textAspectLang": "ko-KR"
              },
              "speaker": lastTTSSettings.speaker,
              "volume": 4, 
              "speed": 0, 
              "pitch": 1, 
              "emotion": "calm"
          };
      }

      // originalClipsMap에 클립 ID 추가
      originalClipsMap[clipId] = [];

      // Scene payload
      scenesPayload.push({
        "id": sceneId,
        "clips": [
           {
              "words": words,
              "captionMode": "MANUAL",
              "captions": [
                  { "text": [ { "insert": script + "\n" } ] },
                  { "text": [ { "insert": "\n" } ] }
              ],
              "assetIds": assetIds, 
              "dirty": { "blankDeleted": false, "caption": false, "video": false },
              "translationModified": { "result": false, "source": false },
              "id": clipId,  // id를 마지막으로 이동 (실제 Vrew 구조와 동일)
              "audioIds": []
           }
        ],
        "name": "",
        "dirty": { "video": false }
      });
    });

    // Build files array from Maps
    const filesPayload: any[] = [];
    
    imageAssetMap.forEach((asset) => {
        filesPayload.push({
            "version": 1,
            "mediaId": asset.mediaId,
            "sourceOrigin": asset.sourceOrigin,
            "fileSize": asset.fileSize,
            "name": asset.name,
            "type": asset.type,
            "isTransparent": false,
            "fileLocation": "IN_MEMORY"
        });
    });
    
    audioAssetMap.forEach((asset) => {
        filesPayload.push({
            "version": 1,
            "mediaId": asset.mediaId,
            "sourceOrigin": asset.sourceOrigin,
            "fileSize": asset.fileSize,
            "name": asset.name,
            "type": asset.type,
            "videoAudioMetaInfo": asset.videoAudioMetaInfo,
            "sourceFileType": asset.sourceFileType,
            "fileLocation": "IN_MEMORY"
        });
    });

    // Format date
    const now = new Date();
    const analyzeDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const projectJson: any = {
      "version": 15,
      "files": filesPayload,
      "transcript": {
          "scenes": scenesPayload
      },
      "props": {
        "assets": propsAssets,
        "audios": {},
        "overdubInfos": {},
        "analyzeDate": analyzeDate,
        "captionDisplayMode": { "0": true, "1": false },
        "mediaEffectMap": {},
        "markerNames": { "0": "", "1": "", "2": "", "3": "", "4": "", "5": "" },
        "flipSetting": {},
        "videoRatio": videoRatio,
        "globalVideoTransform": { "zoom": 1, "xPos": 0, "yPos": 0, "rotation": 0 },
        "videoSize": { "width": videoWidth, "height": videoHeight },
        "backgroundMap": {},
        "globalCaptionStyle": {
            "captionStyleSetting": {
                "mediaId": "uc-0010-simple-textbox",
                "yAlign": "bottom", 
                "yOffset": -0.1, 
                "xOffset": -0.02, 
                "rotation": 0, 
                "width": 0.96,
                "customAttributes": [
                    { "attributeName": "--textbox-color", "type": "color-hex", "value": "rgb(0, 0, 0)" },
                    { "attributeName": "--textbox-align", "type": "textbox-align", "value": "center" }
                ],
                "scaleFactor": videoRatio
            },
            "quillStyle": {
                "font": "Kyobo Handwriting 2020-Vrew_400",
                "size": "150",
                "color": "#ffffff",
                "outline-on": "true",
                "outline-color": "#000000",
                "outline-width": "6"
            }
        },
        "lastTTSSettings": lastTTSSettings,
        "initProjectVideoSize": { "width": videoWidth, "height": videoHeight },
        "pronunciationDisplay": true,
        "projectAudioLanguage": "ko",
        "audioLanguagesMap": {},
        "originalClipsMap": originalClipsMap,
        "ttsClipInfosMap": ttsClipInfosMap
      },
      "comment": `3.5.4\t${now.toISOString()}`,
      "projectId": generateUUID(),
      "statistics": {
          "wordCursorCount": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 },
          "wordSelectionCount": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 },
          "wordCorrectionCount": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 },
          "projectStartMode": "ai_voice",
          "saveInfo": {
              "created": { "version": "3.5.4", "date": now.toISOString().replace('Z', '+09:00'), "stage": "release" },
              "updated": { "version": "3.5.4", "date": now.toISOString().replace('Z', '+09:00'), "stage": "release" },
              "loadCount": 0, 
              "saveCount": 1
          },
          "savedStyleApplyCount": 0,
          "cumulativeTemplateApplyCount": 0,
          "ratioChangedByTemplate": false,
          "videoRemixInfos": {},
          "isAIWritingUsed": false,
          "clientLinebreakExecuteCount": 0,
          "agentStats": { "isEdited": false, "requestCount": 0, "responseCount": 0, "toolCallCount": 0, "toolErrorCount": 0 }
      },
      "lastTTSSettings": lastTTSSettings
    };

    console.log(`[export-vrew] Building ZIP file...`);
    
    // 빈 media/ 폴더 제거 (JSZip이 자동 생성한 것)
    if (projectZip.files['media/'] && !projectZip.files['media/'].dir === false) {
        delete projectZip.files['media/'];
    }
    
    // 새 ZIP 생성 - project.json을 먼저 추가하고 media 파일들 추가
    const finalZip = new JSZip();
    
    // 1. project.json 먼저 (압축된 JSON)
    finalZip.file("project.json", JSON.stringify(projectJson));
    
    // 2. media 파일들 추가 (폴더 엔트리 없이 파일만)
    for (const [name, file] of Object.entries(projectZip.files)) {
        if (name !== 'media/' && name.startsWith('media/') && !file.dir) {
            const content = await (file as any).async('uint8array');
            finalZip.file(name, content);
        }
    }
    
    // ZIP 생성 - STORE 방식 (실제 Vrew 파일과 동일)
    const vrewContent = await finalZip.generateAsync({ 
        type: 'uint8array',
        compression: 'STORE'  // 압축 안 함 (실제 Vrew와 동일)
    });
    
    console.log(`[export-vrew] Export complete! File size: ${(vrewContent.length / 1024 / 1024).toFixed(2)}MB`);

    return new NextResponse(vrewContent as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="project.vrew"'
      }
    });

  } catch (error: any) {
    console.error('Server side export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
