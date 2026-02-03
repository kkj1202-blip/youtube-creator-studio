'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Wand2, 
  Upload, 
  Save,
  RefreshCw,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Card, Button, Input, Modal } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { exportNativeVrewProject } from '@/lib/api/exportService';
import { generateAllImages, generateAllPrompts } from '@/lib/api/batchProcessor';
import ImageUploader from '@/components/scenes/ImageUploader'; // Reuse existing component
import { Project, Scene } from '@/types';

// Standalone Vrew Optimizer Page
const VrewOptimizerPage = () => {
  const { currentProject, updateScene, applyToAllScenes, settings, parseScriptToScenes, createProject } = useStore();
  
  const [scriptInput, setScriptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Script, 2: Image, 3: Export
  const [autoSplit, setAutoSplit] = useState(true); // 긴 문단 자동 나누기

  // Stats calculation
  const charCount = scriptInput.length;
  const estimatedDuration = Math.round(charCount / 5); // Roughly 5 chars per second (Korean avg)
  const estimatedMinutes = Math.floor(estimatedDuration / 60);

  // 1. Parse Script to Scenes
  const handleParseScript = () => {
    if (!scriptInput.trim()) {
      alert('대본을 입력해주세요!');
      return;
    }
    
    // 만약 프로젝트가 없다면 생성
    if (!currentProject) {
      createProject('Vrew 최적화 프로젝트 (대용량)');
    }

    let finalScript = scriptInput;

    // 대용량 및 긴 문단 자동 처리
    if (autoSplit) {
      // 1. 줄바꿈 정규화
      const lines = scriptInput.split(/\n/);
      const processedLines: string[] = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 200자 이상인 경우 문장 단위(., ?, !)로 분리 시도
        if (trimmed.length > 200) {
           // 문장 끝 부호 뒤에 줄바꿈 추가
           const splitText = trimmed.replace(/([.?!])\s+/g, '$1\n');
           processedLines.push(splitText);
        } else {
           processedLines.push(trimmed);
        }
      });
      finalScript = processedLines.join('\n');
    }

    // 스토어의 파서 사용 (기존 씬 대치)
    parseScriptToScenes(finalScript);
    
    // 다음 단계로 이동
    setStep(2);
  };

  // Handle uploaded images
  const handleBatchImageUpload = (results: Array<{ imageUrl: string; sceneNumber: number | null }>) => {
    results.forEach(({ imageUrl, sceneNumber }) => {
      // 씬 번호가 있으면 (1-base) 해당 씬 업데이트
      // 씬 번호는 1부터 시작하므로 인덱스는 -1
        if (sceneNumber !== null && currentProject) {
            // 안전하게 ID로 찾기
            const scene = currentProject.scenes.find(s => s.order === sceneNumber - 1 || (s.order === undefined && currentProject.scenes.indexOf(s) === sceneNumber - 1));

            if (scene) {
                updateScene(scene.id, {
                    imageUrl: imageUrl,
                    imageSource: 'uploaded',
                    error: undefined
                });
            }
        }
    });
    
    setShowUploader(false);
    alert(`${results.length}개의 이미지가 업로드되었습니다!`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold gradient-text">브루(Vrew) 최적화 도구</h1>
        <p className="text-xl text-muted-foreground">
          긴 영상(1시간+)도 문제없습니다. 대본만 넣으면 이미지를 생성해드립니다.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-4 mb-8">
        {[
          { num: 1, label: '대본 입력' },
          { num: 2, label: '이미지 매칭' },
          { num: 3, label: '브루 내보내기' }
        ].map((s) => (
          <div key={s.num} className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === s.num ? 'bg-primary/20 text-primary border border-primary' : 'bg-card text-muted'}`}>
            <span className="font-bold">{s.num}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Script Input */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              1. 대본 입력하기
            </h2>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-sm text-muted bg-secondary/10 px-3 py-1 rounded-full">
                    <CheckCircle2 className={`w-4 h-4 ${autoSplit ? 'text-primary' : 'text-muted'}`} />
                    <label className="cursor-pointer flex items-center gap-2 select-none">
                        <input 
                            type="checkbox" 
                            checked={autoSplit} 
                            onChange={(e) => setAutoSplit(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        긴 문장 자동 나누기
                    </label>
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => setScriptInput('')}>초기화</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <textarea
              className="w-full h-96 p-4 rounded-lg bg-card-hover border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-base leading-relaxed font-mono"
              placeholder={`여기에 대본을 붙여넣으세요. (2만자 이상도 가능)

팁:
- 줄바꿈(엔터) 기준으로 이미지(씬)가 나뉩니다.
- '긴 문장 자동 나누기'를 켜두시면 너무 긴 문장은 알아서 잘라드립니다.`}
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
            />
            <div className="flex justify-between items-center text-sm text-muted border-t border-border pt-2 mt-2">
                <div>
                    총 {charCount.toLocaleString()}자 
                    <span className="mx-2">|</span> 
                    예상 영상 길이: 약 {estimatedMinutes}분 {estimatedDuration % 60}초
                </div>
                <div>
                     예상 씬(이미지) 수: {scriptInput.trim().split('\n').filter(l => l.trim()).length}개
                </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleParseScript}
              disabled={!scriptInput.trim()}
              className="gap-2"
              size="lg"
            >
              대본 분석 및 적용하기 ({estimatedMinutes}분 분량)
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Image Generation */}
      {step === 2 && (
        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-secondary" />
              2. 이미지 자동 생성 및 매칭
            </h2>
            <div className="text-sm text-muted">
              총 {currentProject?.scenes.length}개 씬
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left: Auto Generation */}
             <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  AI 이미지 자동 생성
                </h3>
                <p className="text-sm text-muted mb-4">
                  대본 내용을 분석하여 가장 적절한 이미지를 자동으로 생성합니다.
                </p>
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    variant="primary"
                    onClick={async () => {
                      if (!settings.kieApiKey && !settings.whiskCookie) {
                        alert('설정에서 API 키나 쿠키를 먼저 등록해주세요.');
                        return;
                      }
                      setIsProcessing(true);
                      try {
                        // Re-use existing generation logic
                        await generateAllImages(
                           currentProject as Project,
                           settings.kieApiKey,
                           undefined, // progress callback
                           updateScene, // update store
                           undefined, // options
                           settings.whiskCookie,
                           settings.imageSource
                        );
                        alert('이미지 생성이 완료되었습니다!');
                      } catch(e) {
                         alert('생성 중 오류 발생: ' + e);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    isLoading={isProcessing}
                  >
                    전체 이미지 자동 생성 (AI)
                  </Button>
                  <Button
                     className="w-full"
                     variant="ghost"
                     onClick={async () => {
                        setIsProcessing(true);
                        await generateAllPrompts(currentProject as Project, undefined, updateScene);
                        setIsProcessing(false);
                        alert('프롬프트 생성 완료');
                     }}
                  >
                    프롬프트만 먼저 생성하기
                  </Button>
                </div>
             </div>

             {/* Right: Manual Upload */}
             <div className="bg-secondary/5 p-6 rounded-xl border border-secondary/20 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4 text-secondary" />
                  내 이미지 업로드
                </h3>
                <p className="text-sm text-muted mb-4">
                  이미 가지고 있는 이미지가 있다면 일괄 업로드하세요.<br/>
                  (파일명 순서대로 1, 2, 3... 자동 매칭됩니다)
                </p>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => setShowUploader(true)}
                >
                  이미지 폴더 일괄 업로드
                </Button>
             </div>
          </div>

          {/* Status Preview */}
          <div className="mt-4 pt-4 border-t border-border">
             <div className="flex gap-4 text-sm text-muted justify-center">
                <span>완료된 씬: <b className="text-foreground">{currentProject?.scenes.filter(s => s.imageUrl).length}</b></span>
                <span>/</span>
                <span>전체 씬: <b className="text-foreground">{currentProject?.scenes.length}</b></span>
             </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>이전</Button>
            <Button 
              onClick={() => setStep(3)} 
              className="gap-2"
              disabled={currentProject?.scenes.filter(s => s.imageUrl).length === 0}
            >
              다음: 브루 내보내기
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Image Uploader Modal */}
      <Modal
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        title="이미지 일괄 업로드"
        size="lg"
      >
         <ImageUploader
            onUpload={handleBatchImageUpload}
            onClose={() => setShowUploader(false)}
            totalScenes={currentProject?.scenes.length || 0}
            existingSceneImages={new Map(currentProject?.scenes.map((s, i) => [i + 1, !!s.imageUrl]))}
         />
      </Modal>

      {/* Step 3: Export */}
      {step === 3 && (
        <Card className="p-8 space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
               <Download className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              준비가 완료되었습니다!
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              이제 아래 버튼을 눌러 <b>브루 실행파일(.vrew)</b>을 다운로드하세요.<br/>
              다운로드된 파일을 더블 클릭하면<br/>
              대본과 이미지가 마법처럼 연결된 채로 Vrew가 열립니다.
            </p>
          </div>

          <div className="flex justify-center gap-4">
             <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[300px] h-14 text-lg"
                onClick={async () => {
                   try {
                     await exportNativeVrewProject(currentProject as Project);
                     alert('Vrew 프로젝트 파일(.vrew) 다운로드가 시작됩니다!');
                   } catch(e) {
                     alert('내보내기 실패: ' + e);
                     console.error(e);
                   }
                }}
             >
                <Save className="w-6 h-6 mr-2" />
                Vrew 파일 다운로드 (.vrew)
             </Button>
          </div>
          
          <div className="bg-card-hover p-4 rounded-lg text-left text-sm text-muted max-w-md mx-auto">
             <b>💡 참고:</b><br/>
             1. 다운로드된 <code>.vrew</code> 파일을 실행하세요.<br/>
             2. Vrew가 자동으로 열리며 프로젝트가 로드됩니다.<br/>
             3. (더 이상 XML 가져오기를 할 필요가 없습니다)
          </div>

          <div className="flex justify-start pt-8">
            <Button variant="ghost" onClick={() => setStep(2)}>이전</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default VrewOptimizerPage;
