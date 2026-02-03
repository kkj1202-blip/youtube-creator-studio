/**
 * Vrew 및 외부 편집기 연동을 위한 내보내기 서비스
 * - 이미지와 대본을 CSV 및 파일로 정리하여 ZIP 다운로드 제공
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Project, Scene } from '@/types';

/**
 * 프로젝트 에셋(이미지, 대본)을 Vrew용으로 패키징하여 다운로드
 * - FCPXML (타임라인) - 분할 지원
 * - CSV (대본 데이터)
 * - 이미지 파일들
 */
export async function exportForVrew(project: Project, batchSize: number = 0) {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseFolderName = `autokim_vrew_${dateStr}`;
  
  // 이미지 처리는 공통으로 한 번만 (중복 방지)
  const imageFiles = new Map<string, Blob | string>();
  const imagePromises: Promise<void>[] = [];

  // 모든 씬의 이미지 수집
  project.scenes.forEach((scene, index) => {
    const sceneNum = String(index + 1).padStart(3, '0');
    const imageFilename = `image_${sceneNum}.png`;

    if (scene.imageUrl) {
        if (scene.imageUrl.startsWith('data:')) {
            const base64Data = scene.imageUrl.split(',')[1];
            imageFiles.set(imageFilename, base64Data);
            zip.file(imageFilename, base64Data, { base64: true });
        } else {
            const promise = fetch(scene.imageUrl)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch image for scene ${index + 1}`);
                return res.blob();
            })
            .then(blob => {
                imageFiles.set(imageFilename, blob);
                zip.file(imageFilename, blob);
            })
            .catch(err => {
                console.error(`Failed to export image ${index + 1}:`, err);
                zip.file(`error_${sceneNum}.txt`, `Failed to load image: ${err.message}`);
            });
            imagePromises.push(promise);
        }
    }
  });

  await Promise.all(imagePromises);

  // 배치 처리: 전체 또는 분할
  const totalScenes = project.scenes.length;
  const size = batchSize > 0 ? batchSize : totalScenes;
  const batches = [];
  
  for (let i = 0; i < totalScenes; i += size) {
    batches.push(project.scenes.slice(i, i + size));
  }

  // 각 배치별로 FCPXML 및 CSV 생성
  batches.forEach((batchScenes, batchIndex) => {
    // 배치 시작/끝 인덱스 (1-based for naming)
    const startIdx = batchIndex * size + 1;
    const endIdx = startIdx + batchScenes.length - 1;
    const batchName = batchSize > 0 
        ? `vrew_project_${String(batchIndex + 1).padStart(2, '0')}_(${startIdx}-${endIdx})` 
        : `vrew_project_full`;

    // 배치용 XML 생성
    const xml = generateBatchFCPXML(batchScenes, startIdx, batchName);
    zip.file(`${batchName}.fcpxml`, xml);

    // CSV 생성
    let csvContent = '\uFEFFScene,Script,ImageFile,Duration\n';
    batchScenes.forEach((scene, idx) => {
        const globalIndex = startIdx + idx;
        const sceneNum = String(globalIndex).padStart(3, '0');
        const imageFilename = `image_${sceneNum}.png`;
        const safeText = `"${scene.script.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const duration = scene.imageDuration || 5;
        csvContent += `${globalIndex},${safeText},${imageFilename},${duration}\n`;
    });
    zip.file(`${batchName}.csv`, csvContent);
  });
  
  // 5. Readme 추가
  const readme = `
[Vrew로 가져오기 방법]

1. Vrew를 실행합니다.
2. [파일] -> [다른 편집 프로그램에서 가져오기] -> [Final Cut Pro XML]을 선택합니다.
3. 원하는 구간의 .fcpxml 파일을 선택하세요 (예: vrew_project_01_(1-5).fcpxml).
4. 이미지가 자동으로 타임라인에 배치됩니다.
5. 분할된 파일을 각각 별도의 Vrew 프로젝트로 저장할 수 있습니다.
  `;
  zip.file('사용법_READ_ME.txt', readme);

  // 6. 다운로드
  try {
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${baseFolderName}.zip`);
    return { success: true, count: project.scenes.length };
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * 배치를 위한 FCPXML 생성 (Global Index 유지)
 */
function generateBatchFCPXML(scenes: Scene[], globalStartIndex: number, eventName: string): string {
  const fps = 30;
  const timeBase = 30;
  const frameDuration = "100/3000s";
  
  let resources = '';
  let clips = '';
  let currentTime = 0;

  scenes.forEach((scene, index) => {
    const globalIndex = globalStartIndex + index;
    const sceneNum = String(globalIndex).padStart(3, '0');
    const filename = `image_${sceneNum}.png`;
    const id = `r${globalIndex}`; // ID Unique to global index
    const duration = scene.imageDuration || scene.audioDuration || 5; 
    const durationFrames = Math.round(duration * fps);
    
    // Resource Definition
    resources += `    <asset id="${id}" src="./${filename}" start="0s" duration="${duration}s" hasVideo="1" format="r1" />\n`;

    // Clip Definition
    const start = Math.round(currentTime * fps);
    
    clips += `            <asset-clip name="${sceneNum}" ref="${id}" offset="${start}/${timeBase}s" duration="${durationFrames}/${timeBase}s" start="0s" format="r1">\n`;
    clips += `              <note>Script: ${scene.script}</note>\n`;
    clips += `              <labels>\n`;
    clips += `                <label2>${scene.script}</label2>\n`;
    clips += `              </labels>\n`;
    clips += `            </asset-clip>\n`;

    currentTime += duration;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="${frameDuration}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
${resources}
  </resources>
  <library>
    <event name="${eventName}">
      <project name="${eventName}">
        <sequence format="r1">
          <spine>
${clips}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

/**
 * Experimental: Native Vrew Project (.vrew) Export
 * Structure based on reversed-engineered project.json
 */
/**
 * Native Vrew Project (.vrew) Export
 * Structure based on reversed-engineered project.json
 */
export async function exportNativeVrewProject(project: Project, batchSize: number = 0) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const projectTitle = `autokim_vrew_native_${dateStr}`;
  const totalScenes = project.scenes.length;
  
  // 배치 설정
  const size = batchSize > 0 ? batchSize : totalScenes;
  const batches = [];
  
  for (let i = 0; i < totalScenes; i += size) {
    batches.push(project.scenes.slice(i, i + size));
  }

  // 단일 배치(전체)인 경우 바로 .vrew 파일 저장
  if (batches.length === 1) {
    const blob = await generateSingleVrewBlob(batches[0], project.aspectRatio); 
    saveAs(blob, `${projectTitle}.vrew`);
    return { success: true, count: project.scenes.length };
  }

  // 다중 배치인 경우: 마스터 ZIP 생성
  const masterZip = new JSZip();
  
  await Promise.all(batches.map(async (batchScenes, batchIndex) => {
    // 배치 시작/끝 인덱스 (1-based for naming)
    const startIdx = batchIndex * size + 1;
    const endIdx = startIdx + batchScenes.length - 1;
    const batchName = `vrew_project_${String(batchIndex + 1).padStart(2, '0')}_(${startIdx}-${endIdx})`;
    
    try {
        const vrewBlob = await generateSingleVrewBlob(batchScenes, project.aspectRatio);
        masterZip.file(`${batchName}.vrew`, vrewBlob);
    } catch (e) {
        console.error(`Failed to generate batch ${batchIndex + 1}`, e);
        masterZip.file(`${batchName}_error.txt`, `Generaton failed: ${e}`);
    }
  }));

  // Readme
  const readme = `
[Vrew 파일(.vrew) 사용법]

1. 압축을 풀면 여러 개의 .vrew 파일이 있습니다.
2. Vrew를 실행한 뒤, 각 .vrew 파일을 더블 클릭하거나 [파일 열기]로 여세요.
3. XML 가져오기 과정 없이 바로 프로젝트가 열립니다!
  `;
  masterZip.file('사용법_READ_ME.txt', readme);

  const content = await masterZip.generateAsync({ type: 'blob' });
  saveAs(content, `${projectTitle}_SPLIT.zip`);
  return { success: true, count: project.scenes.length };
}

/**
 * Helper: Generate a single .vrew file blob from a list of scenes
 */
async function generateSingleVrewBlob(scenes: Scene[], aspectRatio?: string): Promise<Blob> {
    try {
        const response = await fetch('/api/export-vrew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scenes, aspectRatio }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate Vrew project on server');
        }

        return await response.blob();
    } catch (error) {
        console.error('Failed to generate Vrew blob via server:', error);
        throw error;
    }
}
