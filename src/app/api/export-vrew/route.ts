import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

// Helper for Vrew-compatible Short IDs (10-12 chars)
function generateShortId(length: number = 11): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(req: NextRequest) {
  try {
    const { scenes, aspectRatio } = await req.json();
    
    // Aspect Ratio Logic
    const isShorts = aspectRatio === '9:16' || !aspectRatio;
    const videoRatio = isShorts ? 0.5625 : 1.7777777777777777;
    const videoWidth = isShorts ? 1080 : 1920;
    const videoHeight = isShorts ? 1920 : 1080;

    // Create the Vrew Project Zip
    const projectZip = new JSZip();

    // 1. Prepare Assets (Images & Audio)
    const allAssets: any[] = [];
    
    // Process scenes
    await Promise.all(scenes.map(async (scene: any, index: number) => {
      // -- Image Processing --
      let imageId = null;
      if (scene.imageUrl) {
          imageId = generateShortId(10);
          let imgBuffer: Buffer | null = null;
          let fileSize = 0;

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
              fileSize = imgBuffer.length;
              let imgWidth = 1920;
              let imgHeight = 1080;
              try {
                const dims = sizeOf(imgBuffer);
                imgWidth = dims.width || 1920;
                imgHeight = dims.height || 1080;
              } catch (e) {}
              
              projectZip.file(`${imageId}.png`, imgBuffer);
              allAssets.push({
                "version": 1,
                "mediaId": imageId,
                "sourceOrigin": "USER",
                "fileSize": fileSize,
                "name": `${imageId}.png`,
                "type": "Image", // Images use "Image" type
                "sourceFileType": "IMAGE",
                "isTransparent": false,
                "fileLocation": "IN_MEMORY",
                "path": `${imageId}.png`,
                "relativePath": `./${imageId}.png`,
                "_sceneIndex": index,
                "_dims": { width: imgWidth, height: imgHeight }
              });
            }
          } catch (err) {
            console.error(`Error processing image for scene ${index}:`, err);
          }
      }

      // -- Audio Processing --
      let audioId = null;
      if (scene.audioUrl) {
          audioId = generateShortId(10);
          let audioBuffer: Buffer | null = null;
          
          try {
              if (scene.audioUrl.startsWith('http')) {
                  const res = await fetch(scene.audioUrl);
                  if (res.ok) {
                      const ab = await res.arrayBuffer();
                      audioBuffer = Buffer.from(ab);
                  }
              } else {
                  let localPath = decodeURIComponent(scene.audioUrl.replace(/^file:\/\/\/?/, ''));
                  localPath = path.normalize(localPath);
                  if (fs.existsSync(localPath)) {
                      audioBuffer = await fs.promises.readFile(localPath);
                  }
              }

              if (audioBuffer) {
                  const duration = Number(scene.imageDuration) || 5;
                  projectZip.file(`${audioId}.mp3`, audioBuffer);
                  allAssets.push({
                      "version": 1,
                      "mediaId": audioId,
                      "sourceOrigin": "VREW_RESOURCE",
                      "fileSize": audioBuffer.length,
                      "name": `${audioId}.mp3`,
                      "type": "AVMedia",
                      "sourceFileType": "TTS",
                      "videoAudioMetaInfo": {
                          "audioInfo": { "sampleRate": 24000, "codec": "mp3", "channelCount": 1 },
                          "duration": duration,
                          "presumedDevice": "unknown",
                          "mediaContainer": "mp3"
                      },
                      "fileLocation": "IN_MEMORY",
                      "path": `${audioId}.mp3`,
                      "relativePath": `./${audioId}.mp3`,
                      "speechText": scene.script,
                      "_sceneIndex": index
                  });
              }

          } catch (err) {
              console.error(`Error processing audio for scene ${index}:`, err);
          }
      }
    }));

    // 2. Build project.json structure
    const scenesPayload: any[] = [];
    const propsAssets: Record<string, any> = {};
    const matchedAudioCount = allAssets.filter(a => a.type === "Audio").length;

    scenes.forEach((scene: any, index: number) => {
      const sceneId = generateShortId(10);
      const clipId = generateShortId(10);
      
      const duration = Number(scene.imageDuration) || 5;
      const script = String(scene.script || "");
      
      const matchedImage = allAssets.find(a => a._sceneIndex === index && a.type === "Image");
      const matchedAudio = allAssets.find(a => a._sceneIndex === index && a.type === "AVMedia");

      const assetIds: string[] = [];
      if (matchedImage) {
          const usageId = generateShortId(10); // Usage ID also follows short format
          assetIds.push(usageId);
          propsAssets[usageId] = {
            "mediaId": matchedImage.mediaId,
            "xPos": 0, "yPos": 0, "height": 1, "width": 1, "rotation": 0, "zIndex": 0,
            "type": "image",
            "originalWidthHeightRatio": matchedImage._dims.width / matchedImage._dims.height,
            "importType": "user_asset_panel",
            "editInfo": {},
            "stats": { "fillType": "cut", "fillMenu": "floating", "rearrangeCount": 0 }
          };
      }

      // Words array for the clip - Split by spaces for Vrew compatibility
      const words: any[] = [];

      if (matchedAudio) {
          const rawWords = script.split(/\s+/).filter(w => w.length > 0);
          const totalWords = rawWords.length || 1;
          const avgDuration = duration / totalWords;
          
          rawWords.forEach((wordText, i) => {
              words.push({
                  "id": generateShortId(10),
                  "text": wordText,
                  "startTime": i * avgDuration,
                  "duration": avgDuration,
                  "aligned": false, // Per guide v2
                  "type": 0,
                  "originalDuration": avgDuration,
                  "originalStartTime": i * avgDuration,
                  "truncatedWords": [],
                  "autoControl": false,
                  "mediaId": matchedAudio.mediaId,
                  "audioIds": [],
                  "assetIds": [],
                  "playbackRate": 1
              });
          });

          // Add End Marker (type 2)
          words.push({
              "id": generateShortId(10),
              "text": "",
              "startTime": duration,
              "duration": 0,
              "aligned": false,
              "type": 2, // End Marker
              "originalDuration": 0,
              "originalStartTime": duration,
              "truncatedWords": [],
              "autoControl": false,
              "mediaId": matchedAudio.mediaId,
              "audioIds": [],
              "assetIds": [],
              "playbackRate": 1
          });
      } else {
          // If no audio, words is an empty array per guide v2
      }



      scenesPayload.push({
        "id": sceneId,
        "clips": [
           {
              "id": clipId,
              "words": words,
              "captionMode": "MANUAL",
              "captions": [
                  { 
                    "text": [ { "insert": script + "\n" } ],
                    "style": { // Injected style for UI rendering
                      "mediaId": "uc-0010-simple-textbox",
                      "yAlign": "bottom",
                      "yOffset": -0.1,
                      "xOffset": -0.02,
                      "rotation": 0,
                      "width": 0.96,
                      "customAttributes": [
                        { "attributeName": "--textbox-color", "type": "color-hex", "value": "#000000" },
                        { "attributeName": "--textbox-align", "type": "textbox-align", "value": "center" }
                      ],
                      "scaleFactor": isShorts ? 0.5625 : 1.7777777777777777 // Match videoRatio
                    }
                  }
              ],

              "assetIds": assetIds, 
              "dirty": { "blankDeleted": false, "caption": true, "video": true },
              "audioIds": []
           }
        ],
        "duration": duration,
        "name": "", 
        "dirty": { "blankDeleted": false, "caption": true, "video": true }
      });
    });

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

    allAssets.filter(a => a.sourceFileType === "TTS").forEach(a => {
        ttsClipInfosMap[a.mediaId] = {
            "duration": a.videoAudioMetaInfo?.duration || 0,
            "text": {
                "raw": a.speechText,
                "processed": a.speechText,
                "textAspectLang": "ko-KR"
            },
            "speaker": lastTTSSettings.speaker,
            "volume": 4, "speed": 0, "pitch": 1, "emotion": "calm"
        };
    });

    const projectJson: any = {
      "version": 15,
      "files": allAssets.map(asset => ({
        "version": 1,
        "mediaId": asset.mediaId,
        "sourceOrigin": asset.sourceOrigin,
        "fileSize": asset.fileSize,
        "name": asset.name,
        "type": asset.type,
        "sourceFileType": asset.sourceFileType,
        "videoAudioMetaInfo": asset.videoAudioMetaInfo || undefined,
        "isTransparent": false,
        "fileLocation": "IN_MEMORY",
        "path": asset.path,
        "relativePath": asset.relativePath
      })), 
      "transcript": {
          "scenes": scenesPayload,
          "ttsClipInfosMap": {}
      },
      "props": {

        "assets": propsAssets,
        "audios": {},
        "overdubInfos": {},
        "analyzeDate": new Date().toISOString().replace('T', ' ').split('.')[0],
        "captionDisplayMode": {"0": true, "1": false}, 
        "mediaEffectMap": {},
        "markerNames": {"0": "", "1": "", "2": "", "3": "", "4": "", "5": ""},
        "flipSetting": {},
        "videoRatio": videoRatio,
        "globalVideoTransform": {"zoom": 1, "xPos": 0, "yPos": 0, "rotation": 0},
        "videoSize": {"width": videoWidth, "height": videoHeight},
        "backgroundMap": {},
        "ttsClipInfosMap": ttsClipInfosMap,
        "globalCaptionStyle": {

            "captionStyleSetting": {
                "mediaId": "uc-0010-simple-textbox",
                "yAlign": "bottom", "yOffset": -0.1, "xOffset": -0.02, "rotation": 0, "width": 0.96,
                "customAttributes": [
                    {"attributeName": "--textbox-color", "type": "color-hex", "value": "rgb(0, 0, 0)"},
                    {"attributeName": "--textbox-align", "type": "textbox-align", "value": "center"}
                ],
                "scaleFactor": videoRatio 
            },
            "quillStyle": {
                "font": "NanumSquare Neo Bold-Vrew_700", "size": "150", "color": "#ffffff",
                "outline-on": "true", "outline-color": "#000000", "outline-width": "6"

            }
        },
        "lastTTSSettings": {
            "pitch": 1, "speed": 0, "volume": 4,
            "speaker": {
                "age": "youth", "gender": "male", "lang": "ko-KR",
                "name": "vos-male05", "speakerId": "vos-male05", "provider": "kt",
                "emotions": ["neutral", "happy", "calm", "sad", "angry"],
                "tags": ["careful", "trustworthy", "sincere", "descriptive"]
            },
            "emotion": "calm"
        },
        "initProjectVideoSize": {"width": videoWidth, "height": videoHeight},
        "pronunciationDisplay": true,
        "projectAudioLanguage": "ko",
        "audioLanguagesMap": {},
        "originalClipsMap": {}
      },
      "comment": "3.5.4\t" + new Date().toISOString(),
      "projectId": `${generateShortId(10)}-${generateShortId(10)}`,
      "playbackRate": 1,
      "statistics": {
          "wordCursorCount": {"0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0},
          "wordSelectionCount": {"0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0},
          "wordCorrectionCount": {"0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0},
          "projectStartMode": matchedAudioCount > 0 ? "video_audio" : "ai_voice",
          "saveInfo": {
              "created": {"version": "3.5.4", "date": new Date().toISOString(), "stage": "release"},
              "updated": {"version": "3.5.4", "date": new Date().toISOString(), "stage": "release"},
              "loadCount": 0, "saveCount": 1
          },
          "savedStyleApplyCount": 0,
          "cumulativeTemplateApplyCount": 0,
          "ratioChangedByTemplate": false,
          "videoRemixInfos": {},
          "isAIWritingUsed": false,
          "sttLinebreakOptions": { "mode": 0, "maxLineLength": 30 },
          "clientLinebreakExecuteCount": 1,
          "agentStats": { "isEdited": false, "requestCount": 0, "responseCount": 0, "toolCallCount": 0, "toolErrorCount": 0 }
      },
      "lastTTSSettings": {
            "pitch": 1, "speed": 0, "volume": 4,
            "speaker": {
                "age": "youth", "gender": "male", "lang": "ko-KR",
                "name": "vos-male05", "speakerId": "vos-male05", "provider": "kt",
                "emotions": ["neutral", "happy", "calm", "sad", "angry"],
                "tags": ["careful", "trustworthy", "sincere", "descriptive"]
            },
            "emotion": "calm"
        },
      "docInfo": null
    };

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
