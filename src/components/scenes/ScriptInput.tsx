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
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Card, Input, Toggle } from '@/components/ui';

interface ScriptInputProps {
  onComplete: () => void;
}

// 대본 파싱 옵션
interface ParseOptions {
  separator: 'double-newline' | 'single-newline' | 'period' | 'custom';
  customSeparator: string;
  minSceneLength: number;
  maxSceneLength: number;
  autoMergeShort: boolean;
  removeEmptyLines: boolean;
}

const defaultParseOptions: ParseOptions = {
  separator: 'double-newline',
  customSeparator: '---',
  minSceneLength: 10,
  maxSceneLength: 500,
  autoMergeShort: true,
  removeEmptyLines: true,
};

const ScriptInput: React.FC<ScriptInputProps> = ({ onComplete }) => {
  const { parseScriptToScenes, currentProject } = useStore();
  const [script, setScript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ParseOptions>(defaultParseOptions);

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
      case 'custom':
        lines = text.split(opts.customSeparator);
        break;
      case 'double-newline':
      default:
        lines = text.split(/\n\s*\n/);
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
  }, []);

  // 미리보기용 씬 개수 계산 (메모이제이션)
  const previewStats = useMemo(() => {
    const scenes = parseScript(script, options);
    const totalChars = script.length;
    const avgLength = scenes.length > 0 ? Math.round(totalChars / scenes.length) : 0;
    
    return {
      sceneCount: scenes.length,
      totalChars,
      avgLength,
      estimatedDuration: Math.round(scenes.length * 8), // 씬당 평균 8초 가정
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

  const exampleScript = `안녕하세요, 오늘은 인공지능의 미래에 대해 이야기해보겠습니다.

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
          placeholder={`대본을 입력하세요...\n\n빈 줄로 씬을 구분합니다.\n\n예시:\n첫 번째 씬의 대본입니다.\n\n두 번째 씬의 대본입니다.\n\n세 번째 씬의 대본입니다.`}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScript(exampleScript)}
            >
              예시 불러오기
            </Button>
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
                  <option value="double-newline">빈 줄 (엔터 2번)</option>
                  <option value="single-newline">줄바꿈 (엔터 1번)</option>
                  <option value="period">문장 끝 (. ! ?)</option>
                  <option value="custom">사용자 지정</option>
                </select>
              </div>

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
            </div>
          </motion.div>
        )}
      </Card>

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
          <li>• 각 씬은 <strong className="text-foreground">빈 줄(엔터 2번)</strong>로 구분됩니다</li>
          <li>• 한 씬에 너무 많은 내용을 넣지 마세요 (10~30초 분량, 50~200자 권장)</li>
          <li>• 대용량 대본(10,000자+)은 파싱 옵션을 조정하면 더 나은 결과를 얻을 수 있습니다</li>
          <li>• 나레이션 스타일로 작성하면 TTS 품질이 좋아집니다</li>
          <li>• 특수문자나 이모지는 TTS에서 제외될 수 있습니다</li>
        </ul>
      </Card>
    </motion.div>
  );
};

export default ScriptInput;
