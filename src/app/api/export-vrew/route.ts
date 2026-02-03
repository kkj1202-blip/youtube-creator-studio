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

export async function POST(req: NextRequest) {
  try {
    const { scenes, aspectRatio } = await req.json();
    
    // Aspect Ratio Logic
    const isShorts = aspectRatio === '9:16';
    const videoRatio = isShorts ? 0.5625 : 1.7777777777777777;
    const videoWidth = isShorts ? 1080 : 1920;
    const videoHeight = isShorts ? 1920 : 1080;

    // Create the Vrew Project Zip
    const projectZip = new JSZip();
    const mediaFolder = projectZip.folder("media");

    // 1. Prepare Assets (Images & Audio)
    const allAssets: any[] = [];
    
    // Process scenes sequentially to maintain order
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      
      // -- Image Processing --
      if (scene.imageUrl) {
          const imageId = generateUUID();
          let imgBuffer: Buffer | null = null;

          try {
            if (scene.imageUrl.startsWith('data:')) {
              const base64Data = scene.imageUrl.split(',')[1];
              imgBuffer = Buffer.from(base64Data, 'base64');
            } else if (scene.imageUrl.startsWith('http')) {
              const res = await fetch(scene.imageUrl);
              if (res.ok) {
                const ab = await res.arrayBuffer();
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
                console.warn('Could not read image dimensions:', e);
              }
              
              // Store in media/ folder like real Vrew
              mediaFolder?.file(`${imageId}.png`, imgBuffer);
              
              allAssets.push({
                "version": 1,
                "mediaId": imageId,
                "sourceOrigin": "USER",
                "fileSize": fileSize,
                "name": `${imageId}.png`,
                "type": "Image",
                "isTransparent": false,
                "fileLocation": "IN_MEMORY",
                "_sceneIndex": index,
                "_dims": { width: imgWidth, height: imgHeight }
              });
            }
          } catch (err) {
            console.error(`Error processing image for scene ${index}:`, err);
          }
      }

      // -- Audio Processing --
      if (scene.audioUrl) {
          const audioId = generateShortId(10);
          let audioBuffer: Buffer | null = null;
          
          try {
              if (scene.audioUrl.startsWith('http')) {
                  const res = await fetch(scene.audioUrl);
                  if (res.ok) {
                      const ab = await res.arrayBuffer();
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
                  // Use audioDuration if available, otherwise imageDuration
                  const duration = Number(scene.audioDuration) || Number(scene.imageDuration) || 5;
                  
                  // Store in media/ folder like real Vrew
                  mediaFolder?.file(`${audioId}.mp3`, audioBuffer);
                  
                  allAssets.push({
                      "version": 1,
                      "mediaId": audioId,
                      "sourceOrigin": "VREW_RESOURCE",
                      "fileSize": audioBuffer.length,
                      "name": `${scene.script?.substring(0, 30) || audioId}.mp3`,
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
                      "_sceneIndex": index,
                      "_speechText": scene.script || "",
                      "_duration": duration
                  });
              }

          } catch (err) {
              console.error(`Error processing audio for scene ${index}:`, err);
          }
      }
    }

    // 2. Build project.json structure
    const scenesPayload: any[] = [];
    const propsAssets: Record<string, any> = {};
    const ttsClipInfosMap: Record<string, any> = {};

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

    scenes.forEach((scene: any, index: number) => {
      const sceneId = generateShortId(10);
      const clipId = generateShortId(10);
      
      const script = String(scene.script || "");
      
      const matchedImage = allAssets.find(a => a._sceneIndex === index && a.type === "Image");
      const matchedAudio = allAssets.find(a => a._sceneIndex === index && a.type === "AVMedia");
      
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

      // Build words array - Vrew uses specific word structure
      const words: any[] = [];

      if (matchedAudio) {
          // Split script into words for Vrew subtitle sync
          const rawWords = script.split(/\s+/).filter((w: string) => w.length > 0);
          const totalWords = rawWords.length || 1;
          
          // Calculate timing - simple even distribution
          let currentTime = 0;
          const wordDuration = duration / (totalWords + 1); // +1 for spacing
          
          rawWords.forEach((wordText: string, i: number) => {
              // Add word (type 0)
              words.push({
                  "id": generateShortId(10),
                  "text": wordText,
                  "startTime": currentTime,
                  "duration": wordDuration * 0.8, // 80% for word
                  "aligned": false,
                  "type": 0,
                  "originalDuration": wordDuration * 0.8,
                  "originalStartTime": currentTime,
                  "truncatedWords": [],
                  "autoControl": false,
                  "mediaId": matchedAudio.mediaId,
                  "audioIds": [],
                  "assetIds": [],
                  "playbackRate": 1
              });
              
              currentTime += wordDuration * 0.8;
              
              // Add blank/pause between words (type 1) - except for last word
              if (i < rawWords.length - 1) {
                  words.push({
                      "id": generateShortId(10),
                      "text": "",
                      "startTime": currentTime,
                      "duration": wordDuration * 0.2, // 20% for pause
                      "aligned": false,
                      "type": 1,
                      "originalDuration": wordDuration * 0.2,
                      "originalStartTime": currentTime,
                      "truncatedWords": [],
                      "autoControl": false,
                      "mediaId": matchedAudio.mediaId,
                      "audioIds": [],
                      "assetIds": [],
                      "playbackRate": 1
                  });
                  currentTime += wordDuration * 0.2;
              }
          });

          // Add End Marker (type 2)
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
              "mediaId": matchedAudio.mediaId,
              "audioIds": [],
              "assetIds": [],
              "playbackRate": 1
          });
          
          // Add to ttsClipInfosMap
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

      // Build scene payload - matching real Vrew structure
      scenesPayload.push({
        "id": sceneId,
        "clips": [
           {
              "id": clipId,
              "words": words,
              "captionMode": "MANUAL",
              "captions": [
                  { 
                    "text": [ { "insert": script + "\n" } ]
                  },
                  {
                    "text": [ { "insert": "\n" } ]
                  }
              ],
              "assetIds": assetIds, 
              "dirty": { 
                  "blankDeleted": false, 
                  "caption": false, 
                  "video": false 
              },
              "translationModified": {
                  "result": false,
                  "source": false
              },
              "audioIds": []
           }
        ],
        "name": "",
        "dirty": { 
            "video": false 
        }
      });
    });

    // Build files array - only include necessary fields for IN_MEMORY
    const filesPayload = allAssets.map(asset => {
        const baseFile: any = {
            "version": 1,
            "mediaId": asset.mediaId,
            "sourceOrigin": asset.sourceOrigin,
            "fileSize": asset.fileSize,
            "name": asset.name,
            "type": asset.type,
            "fileLocation": "IN_MEMORY"
        };
        
        if (asset.type === "Image") {
            baseFile.isTransparent = false;
        }
        
        if (asset.type === "AVMedia") {
            baseFile.videoAudioMetaInfo = asset.videoAudioMetaInfo;
            baseFile.sourceFileType = asset.sourceFileType;
        }
        
        return baseFile;
    });

    // Format date like real Vrew: "2026-1-1 19:18:49"
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
        "originalClipsMap": {},
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
              "created": { 
                  "version": "3.5.4", 
                  "date": now.toISOString().replace('Z', '+09:00'), 
                  "stage": "release" 
              },
              "updated": { 
                  "version": "3.5.4", 
                  "date": now.toISOString().replace('Z', '+09:00'), 
                  "stage": "release" 
              },
              "loadCount": 0, 
              "saveCount": 1
          },
          "savedStyleApplyCount": 0,
          "cumulativeTemplateApplyCount": 0,
          "ratioChangedByTemplate": false,
          "videoRemixInfos": {},
          "isAIWritingUsed": false,
          "clientLinebreakExecuteCount": 0,
          "agentStats": { 
              "isEdited": false, 
              "requestCount": 0, 
              "responseCount": 0, 
              "toolCallCount": 0, 
              "toolErrorCount": 0 
          }
      },
      "lastTTSSettings": lastTTSSettings
    };

    // Write project.json at root level
    projectZip.file("project.json", JSON.stringify(projectJson, null, 2));
    
    const vrewContent = await projectZip.generateAsync({ type: 'uint8array' });

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
