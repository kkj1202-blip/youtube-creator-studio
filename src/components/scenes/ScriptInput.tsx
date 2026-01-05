'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Wand2, 
  Upload, 
  ArrowRight, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings2,
  SplitSquareVertical,
  Hash,
  Minus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Card, Input, Toggle } from '@/components/ui';

interface ScriptInputProps {
  onComplete: () => void;
}

// 대본 파싱 옵션
interface ParseOptions {
  separator: 'double-newline' | 'single-newline' | 'period' | 'marker' | 'custom';
  markerType: 'scene-bracket' | 'hash' | 'dash' | 'number-bracket' | 'all';
  customSeparator: string;
  minSceneLength: number;
  maxSceneLength: number;
  autoMergeShort: boolean;
  removeEmptyLines: boolean;
  removeMarkers: boolean;
}

const defaultParseOptions: ParseOptions = {
  separator: 'double-newline',
  markerType: 'all',
  customSeparator: '---',
  minSceneLength: 10,
  maxSceneLength: 500,
  autoMergeShort: true,
  removeEmptyLines: true,
  removeMarkers: true,
};

// 마커 패턴 정의
const MARKER_PATTERNS = {
  'scene-bracket': /\[씬\s*\d*\]|\[scene\s*\d*\]|\[Scene\s*\d*\]/gi,  // [씬1], [scene 2], [Scene3]
  'hash': /^#{1,3}\s*씬?\s*\d*/gm,  // #씬1, ## 씬 2, ###3
  'dash': /^-{3,}$/gm,  // ---, ----
  'number-bracket': /^\(\d+\)|\[\d+\]/gm,  // (1), [2]
  'all': /\[씬\s*\d*\]|\[scene\s*\d*\]|\[Scene\s*\d*\]|^#{1,3}\s*씬?\s*\d*|^-{3,}$|^\(\d+\)|\[\d+\]/gim,
};

const ScriptInput: React.FC<ScriptInputProps> = ({ onComplete }) => {
  const { parseScriptToScenes, currentProject } = useStore();
  const [script, setScript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ParseOptions>(defaultParseOptions);

  // 마커 기반 분리 함수
  const splitByMarkers = useCallback((text: string, markerType: ParseOptions['markerType'], removeMarkers: boolean): string[] => {
    const pattern = MARKER_PATTERNS[markerType];
    
    // 마커 위치 찾기
    const markers: number[] = [];
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      markers.push(match.index);
    }
    
    if (markers.length === 0) {
      return [text]; // 마커 없으면 전체 반환
    }
    
    // 마커 위치 기준으로 분할
    const scenes: string[] = [];
    
    // 첫 마커 전 내용
    if (markers[0] > 0) {
      const beforeFirst = text.slice(0, markers[0]).trim();
      if (beforeFirst) scenes.push(beforeFirst);
    }
    
    // 마커 사이 내용
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i];
      const end = markers[i + 1] || text.length;
      let segment = text.slice(start, end);
      
      // 마커 제거
      if (removeMarkers) {
        segment = segment.replace(pattern, '').trim();
      }
      
      if (segment.trim()) {
        scenes.push(segment.trim());
      }
    }
    
    return scenes;
  }, []);

  // 최적화된 씬 파싱 함수
  const parseScript = useCallback((text: string, opts: ParseOptions): string[] => {
    if (!text.trim()) return [];

    let lines: string[];

    // 구분자에 따른 분리
    switch (opts.separator) {
      case 'single-newline':
        lines = text.split('\n');
        break;
      case 'period':
        lines = text.split(/(?<=[.!?])\s+/);
        break;
      case 'marker':
        lines = splitByMarkers(text, opts.markerType, opts.removeMarkers);
        break;
      case 'custom':
        lines = text.split(opts.customSeparator);
        break;
      case 'double-newline':
      default:
        // 빈 줄 + 마커 조합 (기본값)
        // 먼저 마커로 1차 분리 시도
        const hasMarkers = MARKER_PATTERNS['all'].test(text);
        if (hasMarkers) {
          // 마커가 있으면 마커 기준 분리 + 빈 줄 분리 병행
          const markerSplit = splitByMarkers(text, opts.markerType, opts.removeMarkers);
          lines = markerSplit.flatMap(segment => segment.split(/\n\s*\n/));
        } else {
          lines = text.split(/\n\s*\n/);
        }
    }

    // 정리
    let scenes = lines
      .map((line) => line.trim())
      .filter((line) => line.length >= opts.minSceneLength);

    // 빈 줄 제거
    if (opts.removeEmptyLines) {
      scenes = scenes.map((scene) => 
        scene.split('\n').filter((l) => l.trim()).join('\n')
      );
    }

    // 짧은 씬 자동 병합
    if (opts.autoMergeShort && opts.minSceneLength > 0) {
      const merged: string[] = [];
      let buffer = '';

      for (const scene of scenes) {
        if (buffer.length + scene.length < opts.maxSceneLength && buffer.length < opts.minSceneLength * 2) {
          buffer = buffer ? `${buffer}\n\n${scene}` : scene;
        } else {
          if (buffer) merged.push(buffer);
          buffer = scene;
        }
      }
      if (buffer) merged.push(buffer);
      scenes = merged;
    }

    // 긴 씬 분할
    const finalScenes: string[] = [];
    for (const scene of scenes) {
      if (scene.length > opts.maxSceneLength) {
        // 문장 단위로 분할 시도
        const sentences = scene.split(/(?<=[.!?])\s+/);
        let chunk = '';
        
        for (const sentence of sentences) {
          if (chunk.length + sentence.length > opts.maxSceneLength && chunk) {
            finalScenes.push(chunk.trim());
            chunk = sentence;
          } else {
            chunk = chunk ? `${chunk} ${sentence}` : sentence;
          }
        }
        if (chunk) finalScenes.push(chunk.trim());
      } else {
        finalScenes.push(scene);
      }
    }

    return finalScenes.filter((s) => s.length >= opts.minSceneLength);
  }, [splitByMarkers]);

  // 미리보기용 씬 개수 계산 (메모이제이션)
  const previewStats = useMemo(() => {
    const scenes = parseScript(script, options);
    const totalChars = script.length;
    const avgLength = scenes.length > 0 ? Math.round(totalChars / scenes.length) : 0;
    
    // 마커 감지
    const hasMarkers = MARKER_PATTERNS['all'].test(script);
    
    return {
      sceneCount: scenes.length,
      totalChars,
      avgLength,
      estimatedDuration: Math.round(scenes.length * 8), // 씬당 평균 8초 가정
      hasMarkers,
    };
  }, [script, options, parseScript]);

  // 파싱 실행
  const handleParse = useCallback(async () => {
    if (!script.trim()) return;

    setIsProcessing(true);

    // 대용량 처리를 위한 비동기 처리
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      const scenes = parseScript(script, options);
      
      if (scenes.length === 0) {
        alert('파싱된 씬이 없습니다. 구분자 설정을 확인하세요.');
        setIsProcessing(false);
        return;
      }

      if (scenes.length > 300) {
        const confirm = window.confirm(
          `${scenes.length}개의 씬이 감지되었습니다. 너무 많은 씬은 성능에 영향을 줄 수 있습니다. 계속하시겠습니까?`
        );
        if (!confirm) {
          setIsProcessing(false);
          return;
        }
      }

      // 청크 단위로 씬 생성 (대용량 처리)
      const CHUNK_SIZE = 50;
      const combinedScript = scenes.join('\n\n');
      
      parseScriptToScenes(combinedScript);
      onComplete();
    } catch (error) {
      console.error('Parse error:', error);
      alert('대본 파싱 중 오류가 발생했습니다.');
    }

    setIsProcessing(false);
  }, [script, options, parseScript, parseScriptToScenes, onComplete]);

  // 파일 업로드 처리
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setScript(content);
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // 예시 대본 (마커 포함 버전)
  const exampleScript = `[씬1] 인트로
안녕하세요, 오늘은 인공지능의 미래에 대해 이야기해보겠습니다.

[씬2] 본론 시작
인공지능은 우리 생활의 모든 영역에서 혁명을 일으키고 있습니다.

[씬3] AI 활용 분야
의료, 교육, 금융 등 다양한 분야에서 AI가 활용되고 있죠.

[씬4] 생성형 AI
특히 최근에는 생성형 AI의 발전이 눈부십니다.

[씬5] 미래 전망
앞으로 AI는 더욱 발전하여 우리의 삶을 편리하게 만들어 줄 것입니다.

[씬6] 아웃트로
시청해주셔서 감사합니다. 좋아요와 구독 부탁드립니다!`;

  // 예시 대본 (빈 줄 버전)
  const exampleScriptSimple = `안녕하세요, 오늘은 인공지능의 미래에 대해 이야기해보겠습니다.

인공지능은 우리 생활의 모든 영역에서 혁명을 일으키고 있습니다.

의료, 교육, 금융 등 다양한 분야에서 AI가 활용되고 있죠.

특히 최근에는 생성형 AI의 발전이 눈부십니다.

앞으로 AI는 더욱 발전하여 우리의 삶을 편리하게 만들어 줄 것입니다.

시청해주셔서 감사합니다. 좋아요와 구독 부탁드립니다!`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          대본 입력
        </h2>
        <p className="text-muted">
          영상의 대본을 입력하세요. 최대 10,000자, 200씬까지 지원합니다.
        </p>
      </div>

      <Card className="mb-6">
        <TextArea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={`대본을 입력하세요...

씬 구분: 빈 줄(엔터 2번)로 구분됩니다.

예시:
첫 번째 씬 내용입니다.
안녕하세요, 오늘 영상 시작합니다.

두 번째 씬 내용입니다.
이번 영상의 주제는...

세 번째 씬 내용입니다.
마무리하겠습니다.`}
          rows={12}
          className="text-base font-mono"
        />
        
        {/* 통계 바 */}
        <div className="flex flex-wrap items-center justify-between mt-4 pt-4 border-t border-border gap-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`${previewStats.sceneCount > 200 ? 'text-error' : previewStats.sceneCount > 100 ? 'text-warning' : 'text-success'}`}>
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              {previewStats.sceneCount}개 씬
            </span>
            <span className="text-muted">
              {previewStats.totalChars.toLocaleString()}자
            </span>
            <span className="text-muted">
              평균 {previewStats.avgLength}자/씬
            </span>
            <span className="text-muted">
              ~{Math.floor(previewStats.estimatedDuration / 60)}분 {previewStats.estimatedDuration % 60}초
            </span>
            {previewStats.hasMarkers && (
              <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                <Hash className="w-3 h-3 inline mr-1" />
                마커 감지됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(!showOptions)}
              icon={<Settings2 className="w-4 h-4" />}
            >
              파싱 옵션
            </Button>
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
              >
                예시 불러오기
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-card-hover rounded-t-lg"
                  onClick={() => setScript(exampleScript)}
                >
                  📌 마커 포함 예시
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-card-hover rounded-b-lg"
                  onClick={() => setScript(exampleScriptSimple)}
                >
                  📝 빈 줄 구분 예시
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 파싱 옵션 */}
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border space-y-4"
          >
            <h4 className="font-medium text-sm flex items-center gap-2">
              <SplitSquareVertical className="w-4 h-4" />
              씬 분리 옵션
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">구분자</label>
                <select
                  value={options.separator}
                  onChange={(e) => setOptions({ ...options, separator: e.target.value as ParseOptions['separator'] })}
                  className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
                >
                  <option value="double-newline">빈 줄 + 마커 자동 감지 (권장)</option>
                  <option value="marker">마커만 ([씬], #, ---)</option>
                  <option value="single-newline">줄바꿈 (엔터 1번)</option>
                  <option value="period">문장 끝 (. ! ?)</option>
                  <option value="custom">사용자 지정</option>
                </select>
              </div>

              {options.separator === 'marker' && (
                <div>
                  <label className="block text-sm text-muted mb-1">마커 유형</label>
                  <select
                    value={options.markerType}
                    onChange={(e) => setOptions({ ...options, markerType: e.target.value as ParseOptions['markerType'] })}
                    className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
                  >
                    <option value="all">모든 마커</option>
                    <option value="scene-bracket">[씬1], [scene2]</option>
                    <option value="hash">#씬1, ##씬2</option>
                    <option value="dash">--- (구분선)</option>
                    <option value="number-bracket">(1), [2]</option>
                  </select>
                </div>
              )}

              {options.separator === 'custom' && (
                <div>
                  <label className="block text-sm text-muted mb-1">사용자 구분자</label>
                  <Input
                    value={options.customSeparator}
                    onChange={(e) => setOptions({ ...options, customSeparator: e.target.value })}
                    placeholder="예: ---"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-muted mb-1">최소 씬 길이 (자)</label>
                <Input
                  type="number"
                  value={options.minSceneLength}
                  onChange={(e) => setOptions({ ...options, minSceneLength: Number(e.target.value) })}
                  min={1}
                  max={100}
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">최대 씬 길이 (자)</label>
                <Input
                  type="number"
                  value={options.maxSceneLength}
                  onChange={(e) => setOptions({ ...options, maxSceneLength: Number(e.target.value) })}
                  min={50}
                  max={1000}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Toggle
                checked={options.autoMergeShort}
                onChange={(checked) => setOptions({ ...options, autoMergeShort: checked })}
                label="짧은 씬 자동 병합"
              />
              <Toggle
                checked={options.removeEmptyLines}
                onChange={(checked) => setOptions({ ...options, removeEmptyLines: checked })}
                label="빈 줄 제거"
              />
              <Toggle
                checked={options.removeMarkers}
                onChange={(checked) => setOptions({ ...options, removeMarkers: checked })}
                label="마커 텍스트 제거"
              />
            </div>
          </motion.div>
        )}
      </Card>

      {/* 마커 감지 안내 */}
      {previewStats.hasMarkers && options.separator === 'double-newline' && (
        <Card className="mb-4 bg-primary/10 border-primary/30">
          <div className="flex items-start gap-3">
            <Hash className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">씬 마커가 감지되었습니다</p>
              <p className="text-xs text-muted mt-1">
                [씬], #, --- 등의 마커가 자동으로 인식됩니다. 
                파싱 옵션에서 마커 유형을 변경할 수 있습니다.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 경고 메시지 */}
      {previewStats.sceneCount > 100 && (
        <Card className="mb-4 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">많은 씬이 감지되었습니다</p>
              <p className="text-xs text-muted mt-1">
                {previewStats.sceneCount}개의 씬은 처리 시간이 오래 걸릴 수 있습니다.
                파싱 옵션에서 최소 씬 길이를 늘리거나 구분자를 변경해보세요.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <label className="flex-1">
          <input
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            className="w-full"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          >
            텍스트 파일 업로드
          </Button>
        </label>
        
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleParse}
          disabled={!script.trim() || isProcessing}
          isLoading={isProcessing}
          icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        >
          {isProcessing ? '처리 중...' : '씬 분리하기'}
        </Button>
      </div>

      {/* Tips */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          작성 팁
        </h3>
        <ul className="text-sm text-muted space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong className="text-foreground">빈 줄(엔터 2번)</strong>로 기본 씬 구분</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong className="text-foreground">[씬1], #씬2, ---</strong> 마커로 명확한 구분</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>한 씬에 10~30초 분량 (50~200자) 권장</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>나레이션 스타일로 작성하면 TTS 품질이 좋아집니다</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>특수문자나 이모지는 TTS에서 제외될 수 있습니다</span>
          </li>
        </ul>
        
        {/* 마커 예시 */}
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted mb-2">지원하는 마커 형식</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <code className="px-2 py-1 bg-card rounded">[씬1]</code>
            <code className="px-2 py-1 bg-card rounded">[scene2]</code>
            <code className="px-2 py-1 bg-card rounded">#씬1</code>
            <code className="px-2 py-1 bg-card rounded">##씬2</code>
            <code className="px-2 py-1 bg-card rounded">---</code>
            <code className="px-2 py-1 bg-card rounded">(1)</code>
            <code className="px-2 py-1 bg-card rounded">[2]</code>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ScriptInput;
