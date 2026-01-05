'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  MessageSquare,
  Target,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowRight,
  Lightbulb,
  Mic,
  Video,
} from 'lucide-react';
import { Button, Card, Input, Select, TextArea, Modal, Slider, Toggle } from '@/components/ui';
import { useStore } from '@/store/useStore';

interface ScriptAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript?: (script: string) => void;
}

interface ScriptSection {
  id: string;
  type: 'hook' | 'intro' | 'body' | 'cta' | 'outro';
  title: string;
  content: string;
  duration: number;
}

const categoryOptions = [
  { value: 'education', label: '교육/정보' },
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'review', label: '리뷰/언박싱' },
  { value: 'tutorial', label: '튜토리얼' },
  { value: 'vlog', label: '브이로그' },
  { value: 'cooking', label: '요리' },
  { value: 'gaming', label: '게임' },
  { value: 'tech', label: '기술/IT' },
];

const toneOptions = [
  { value: 'professional', label: '전문적' },
  { value: 'casual', label: '친근한' },
  { value: 'energetic', label: '에너지틱' },
  { value: 'calm', label: '차분한' },
  { value: 'humorous', label: '유머러스' },
];

const lengthOptions = [
  { value: 'shorts', label: '쇼츠 (60초)' },
  { value: 'short', label: '짧은 영상 (3-5분)' },
  { value: 'medium', label: '중간 영상 (8-12분)' },
  { value: 'long', label: '긴 영상 (15분+)' },
];

// 후킹 멘트 템플릿
const hookTemplates = {
  question: [
    '여러분, {topic}에 대해 얼마나 알고 계신가요?',
    '이거 모르면 {topic}에서 손해 봅니다.',
    '{topic}? 대부분 이렇게 생각하는데... 완전 틀렸습니다.',
    '지금 {topic} 하고 계신다면, 이 영상 꼭 보세요.',
  ],
  shock: [
    '{topic} 실제로 해봤더니 충격적인 결과가...',
    '이건 진짜 아무도 모르는 {topic} 비밀입니다.',
    '{topic}? 저도 처음엔 믿지 않았어요.',
    '3년 동안 {topic}만 연구한 결과...',
  ],
  story: [
    '저도 {topic} 때문에 많이 고민했었는데요.',
    '예전에 {topic} 하다가 완전 망한 적이 있어요.',
    '친구가 {topic} 물어봐서 정리해봤습니다.',
    '최근에 {topic} 관련해서 놀라운 걸 발견했어요.',
  ],
  promise: [
    '오늘 알려드리는 {topic}, 이것만 알면 끝입니다.',
    '딱 5분만 투자하면 {topic} 완벽 마스터.',
    '{topic} 왕초보도 따라하면 바로 적용 가능!',
    '이 방법으로 {topic} 결과가 3배 좋아졌어요.',
  ],
};

const ScriptAssistant: React.FC<ScriptAssistantProps> = ({ isOpen, onClose, onApplyScript }) => {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('education');
  const [tone, setTone] = useState('casual');
  const [length, setLength] = useState('short');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<ScriptSection[]>([]);
  const [selectedHookStyle, setSelectedHookStyle] = useState<keyof typeof hookTemplates>('question');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [shortsVersion, setShortsVersion] = useState('');

  // 스크립트 생성
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const points = keyPoints.split('\n').filter(p => p.trim());
    
    // 시간 계산
    const durations = {
      shorts: { hook: 5, intro: 10, body: 35, cta: 10, outro: 0 },
      short: { hook: 10, intro: 30, body: 180, cta: 30, outro: 30 },
      medium: { hook: 15, intro: 45, body: 450, cta: 45, outro: 45 },
      long: { hook: 20, intro: 60, body: 750, cta: 60, outro: 60 },
    };
    
    const timing = durations[length as keyof typeof durations];

    // 후킹 멘트 선택
    const hookList = hookTemplates[selectedHookStyle];
    const selectedHook = hookList[Math.floor(Math.random() * hookList.length)].replace('{topic}', topic);

    // 톤에 따른 인트로 스타일
    const introStyles: Record<string, string> = {
      professional: `안녕하세요, 오늘은 ${topic}에 대해 심층 분석해보겠습니다.`,
      casual: `안녕하세요 여러분! 오늘은 ${topic}에 대해 이야기해볼게요.`,
      energetic: `여러분!! 드디어 ${topic} 완벽 가이드입니다! 레츠고!`,
      calm: `안녕하세요. 오늘은 ${topic}에 대해 차분히 알아보겠습니다.`,
      humorous: `아 여러분, ${topic}... 이거 진짜 제가 알려드릴게요 ㅋㅋ`,
    };

    const sections: ScriptSection[] = [
      {
        id: 'hook',
        type: 'hook',
        title: '🎣 후킹 멘트',
        content: selectedHook,
        duration: timing.hook,
      },
      {
        id: 'intro',
        type: 'intro',
        title: '👋 인트로',
        content: `${introStyles[tone]}\n\n${targetAudience ? `특히 ${targetAudience}인 분들에게 유용할 거예요.\n` : ''}이번 영상에서는:\n${points.length > 0 ? points.map((p, i) => `${i + 1}. ${p}`).join('\n') : `- ${topic}의 핵심 포인트\n- 실전에서 바로 적용할 수 있는 팁\n- 주의해야 할 점들`}\n\n을 알려드릴게요.`,
        duration: timing.intro,
      },
      {
        id: 'body',
        type: 'body',
        title: '📝 본론',
        content: points.length > 0 
          ? points.map((point, i) => `[파트 ${i + 1}] ${point}\n\n${point}에 대해 자세히 설명드리면...\n\n(여기에 구체적인 설명, 예시, 시연 등을 추가하세요)\n\n핵심 포인트:\n- 포인트 1\n- 포인트 2\n- 포인트 3`).join('\n\n---\n\n')
          : `[파트 1] ${topic}의 기본 개념\n\n먼저 ${topic}이 무엇인지 알아볼게요.\n\n(기본 개념 설명)\n\n[파트 2] 실전 적용 방법\n\n이제 실제로 어떻게 적용하는지 보여드릴게요.\n\n(단계별 설명)\n\n[파트 3] 주의사항 및 팁\n\n${topic}할 때 주의할 점들이에요.\n\n- 주의점 1\n- 주의점 2\n- 꿀팁`,
        duration: timing.body,
      },
      {
        id: 'cta',
        type: 'cta',
        title: '📢 CTA (행동 유도)',
        content: `오늘 알려드린 ${topic} 내용, 어떠셨나요?\n\n도움이 되셨다면 좋아요와 구독 부탁드려요!\n알림 설정까지 해주시면 새 영상을 놓치지 않으실 수 있어요.\n\n궁금한 점이나 더 알고 싶은 내용은 댓글로 남겨주세요!\n다음 영상 주제로 반영하겠습니다.`,
        duration: timing.cta,
      },
    ];

    if (length !== 'shorts') {
      sections.push({
        id: 'outro',
        type: 'outro',
        title: '👋 아웃트로',
        content: `그럼 저는 다음 영상에서 뵐게요.\n${tone === 'energetic' ? '다들 화이팅! 뿅!' : tone === 'humorous' ? '안녕히 계세요 여러분 ㅋㅋ' : '감사합니다. 다음에 또 만나요!'}`,
        duration: timing.outro,
      });
    }

    setGeneratedScript(sections);

    // 쇼츠 버전 생성
    if (length !== 'shorts') {
      const shortsScript = `${selectedHook}\n\n${topic} 핵심만 빠르게!\n\n` +
        (points.length > 0 
          ? points.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')
          : `1. 핵심 포인트 1\n2. 핵심 포인트 2\n3. 핵심 포인트 3`) +
        `\n\n자세한 내용은 본 영상에서!\n\n#${topic.replace(/\s/g, '')} #shorts`;
      setShortsVersion(shortsScript);
    }

    setIsGenerating(false);
  };

  // 복사 기능
  const handleCopy = async (text: string, sectionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // 전체 스크립트 복사
  const handleCopyAll = async () => {
    const fullScript = generatedScript.map(s => `[${s.title}]\n${s.content}`).join('\n\n---\n\n');
    await navigator.clipboard.writeText(fullScript);
    setCopiedSection('all');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // 스크립트 적용
  const handleApply = () => {
    if (onApplyScript) {
      const fullScript = generatedScript.map(s => s.content).join('\n\n');
      onApplyScript(fullScript);
    }
    onClose();
  };

  // 총 시간 계산
  const totalDuration = generatedScript.reduce((sum, s) => sum + s.duration, 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✍️ AI 스크립트 작성 도우미" size="xl">
      <div className="flex gap-4 h-[70vh]">
        {/* 좌측: 입력 */}
        <div className="w-2/5 flex flex-col overflow-y-auto pr-2">
          <div className="space-y-4">
            <Input
              label="영상 주제 *"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 초보자를 위한 투자 방법"
              icon={<Lightbulb className="w-4 h-4" />}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="카테고리"
                value={category}
                onChange={setCategory}
                options={categoryOptions}
              />
              <Select
                label="톤/스타일"
                value={tone}
                onChange={setTone}
                options={toneOptions}
              />
            </div>

            <Select
              label="영상 길이"
              value={length}
              onChange={setLength}
              options={lengthOptions}
            />

            <Input
              label="타겟 시청자 (선택)"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="예: 20-30대 직장인"
              icon={<Target className="w-4 h-4" />}
            />

            <TextArea
              label="핵심 포인트 (줄바꿈으로 구분)"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="포인트 1&#10;포인트 2&#10;포인트 3"
              rows={4}
            />

            <div>
              <label className="text-sm text-muted mb-2 block">후킹 스타일</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(hookTemplates).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedHookStyle(style as keyof typeof hookTemplates)}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedHookStyle === style
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {style === 'question' ? '❓ 질문형' :
                     style === 'shock' ? '😱 충격형' :
                     style === 'story' ? '📖 스토리형' :
                     '🎯 약속형'}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              isLoading={isGenerating}
              icon={<Sparkles className="w-4 h-4" />}
            >
              스크립트 생성
            </Button>
          </div>
        </div>

        {/* 우측: 결과 */}
        <div className="w-3/5 flex flex-col overflow-hidden border-l border-border pl-4">
          {generatedScript.length > 0 ? (
            <>
              {/* 상단 요약 */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4 text-muted" />
                    <span>총 {formatDuration(totalDuration)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <FileText className="w-4 h-4 text-muted" />
                    <span>{generatedScript.length}개 섹션</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAll}
                    icon={copiedSection === 'all' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  >
                    전체 복사
                  </Button>
                </div>
              </div>

              {/* 스크립트 섹션들 */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {generatedScript.map((section) => (
                  <Card key={section.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.title}</span>
                        <span className="text-xs text-muted">({formatDuration(section.duration)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(section.content, section.id);
                          }}
                          className="p-1 hover:bg-card rounded"
                        >
                          {copiedSection === section.id ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted" />
                          )}
                        </button>
                        {expandedSection === section.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSection === section.id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 border-t border-border">
                            <pre className="whitespace-pre-wrap text-sm font-sans">
                              {section.content}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}

                {/* 쇼츠 버전 */}
                {shortsVersion && (
                  <Card className="overflow-hidden border-primary/30">
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'shorts' ? null : 'shorts')}
                      className="w-full p-3 flex items-center justify-between hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="font-medium text-primary">📱 쇼츠 버전</span>
                        <span className="text-xs text-muted">(60초)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(shortsVersion, 'shorts');
                          }}
                          className="p-1 hover:bg-card rounded"
                        >
                          {copiedSection === 'shorts' ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted" />
                          )}
                        </button>
                        {expandedSection === 'shorts' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedSection === 'shorts' && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 border-t border-border">
                            <pre className="whitespace-pre-wrap text-sm font-sans">
                              {shortsVersion}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}
              </div>

              {/* 하단 액션 */}
              <div className="pt-4 border-t border-border flex justify-between">
                <Button
                  variant="ghost"
                  onClick={handleGenerate}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  다시 생성
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    닫기
                  </Button>
                  {onApplyScript && (
                    <Button
                      variant="primary"
                      onClick={handleApply}
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      스크립트 적용
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Wand2 className="w-12 h-12 mx-auto mb-4 text-muted opacity-50" />
                <p className="text-muted">
                  주제를 입력하고<br />
                  <span className="text-primary font-medium">스크립트 생성</span> 버튼을 클릭하세요
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ScriptAssistant;
