'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Wand2,
  Copy,
  Download,
  RefreshCw,
  Sparkles,
  Clock,
  Zap,
} from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Button, Input, Select, Card, TextArea, Toggle, Slider } from '@/components/ui';

const toneOptions = [
  { value: 'casual', label: '캐주얼 / 친근한' },
  { value: 'professional', label: '전문적 / 진지한' },
  { value: 'humorous', label: '유머러스 / 재미있는' },
  { value: 'educational', label: '교육적 / 설명하는' },
  { value: 'dramatic', label: '드라마틱 / 긴장감' },
];

const lengthOptions = [
  { value: 'shorts', label: '쇼츠 (15~60초)' },
  { value: 'short', label: '짧은 영상 (3~5분)' },
  { value: 'medium', label: '중간 영상 (8~12분)' },
  { value: 'long', label: '긴 영상 (15분+)' },
];

export default function ScriptPage() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('casual');
  const [length, setLength] = useState('short');
  const [includeHook, setIncludeHook] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');

  const handleGenerate = async () => {
    if (!topic) return;
    
    setIsGenerating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Demo generated script
    const demoScript = `[후킹 인트로]
여러분, ${topic}에 대해 제대로 알고 계신가요?

오늘 이 영상에서 알려드리는 내용을 모르면, 정말 큰 손해를 볼 수 있습니다.

[본론 - 1부]
먼저 첫 번째로 알아야 할 것은...

${topic}의 핵심 원리는 생각보다 간단합니다.

많은 분들이 이 부분에서 실수를 하는데요.

[본론 - 2부]
두 번째로 중요한 포인트는...

이것만 기억하셔도 결과가 확실히 달라집니다.

실제로 저도 이 방법을 적용한 후로...

[본론 - 3부]
마지막으로, 가장 중요한 것은...

많은 전문가들이 이 부분을 강조하는 이유가 있습니다.

[CTA / 마무리]
오늘 알려드린 내용이 도움이 되셨다면,
좋아요와 구독 부탁드립니다!

다음 영상에서는 더 심화된 내용으로 찾아뵙겠습니다.

감사합니다!`;

    setGeneratedScript(demoScript);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    alert('대본이 클립보드에 복사되었습니다.');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${topic.slice(0, 20)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const estimatedDuration = {
    shorts: '15~60초',
    short: '3~5분',
    medium: '8~12분',
    long: '15분+',
  }[length];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            대본 작성 AI
          </h1>
          <p className="text-muted">
            주제만 입력하면 YouTube 영상용 대본을 자동으로 작성해드립니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                주제 입력
              </h3>
              <div className="space-y-4">
                <Input
                  label="영상 주제"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 초보자를 위한 주식 투자 방법"
                />
                <TextArea
                  label="포함할 키워드 (선택)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="꼭 포함되어야 할 내용이나 키워드"
                  rows={2}
                />
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                스타일 설정
              </h3>
              <div className="space-y-4">
                <Select
                  label="톤앤매너"
                  options={toneOptions}
                  value={tone}
                  onChange={setTone}
                />
                <Select
                  label="영상 길이"
                  options={lengthOptions}
                  value={length}
                  onChange={setLength}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    예상 길이
                  </span>
                  <span className="text-foreground font-medium">{estimatedDuration}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                구성 요소
              </h3>
              <div className="space-y-3">
                <Toggle
                  label="후킹 인트로 포함"
                  checked={includeHook}
                  onChange={setIncludeHook}
                />
                <Toggle
                  label="CTA (행동 유도) 포함"
                  checked={includeCta}
                  onChange={setIncludeCta}
                />
              </div>
            </Card>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={!topic || isGenerating}
              isLoading={isGenerating}
              icon={<Wand2 className="w-4 h-4" />}
            >
              {isGenerating ? '대본 생성 중...' : '대본 생성하기'}
            </Button>
          </div>

          {/* Output Panel */}
          <div className="space-y-4">
            <Card className="h-[calc(100vh-300px)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  생성된 대본
                </h3>
                {generatedScript && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      다시 생성
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {generatedScript ? (
                  <div className="bg-card-hover rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                      {generatedScript}
                    </pre>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Wand2 className="w-12 h-12 text-muted mx-auto mb-3" />
                      <p className="text-muted">
                        주제를 입력하고 대본을 생성해주세요
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {generatedScript && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={handleCopy}
                    icon={<Copy className="w-4 h-4" />}
                  >
                    복사
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={handleDownload}
                    icon={<Download className="w-4 h-4" />}
                  >
                    다운로드
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      // TODO: Send to video creator
                      alert('영상 제작기로 이동 기능은 곧 추가됩니다.');
                    }}
                  >
                    영상 제작하기
                  </Button>
                </div>
              )}
            </Card>

            {/* Word Count */}
            {generatedScript && (
              <Card className="bg-card-hover">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {generatedScript.length}
                    </p>
                    <p className="text-xs text-muted">글자 수</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {generatedScript.split('\n\n').filter(s => s.trim()).length}
                    </p>
                    <p className="text-xs text-muted">예상 씬</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ~{Math.ceil(generatedScript.length / 150)}분
                    </p>
                    <p className="text-xs text-muted">예상 길이</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
}
