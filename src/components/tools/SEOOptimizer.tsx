'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Hash,
  FileText,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Clock,
  TrendingUp,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react';
import { Button, Card, Input, TextArea, Modal } from '@/components/ui';
import { useStore } from '@/store/useStore';

interface SEOOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SEOAnalysis {
  title: {
    text: string;
    length: number;
    score: number;
    suggestions: string[];
  };
  description: {
    text: string;
    length: number;
    score: number;
    hasTimestamps: boolean;
    hasCTA: boolean;
    suggestions: string[];
  };
  tags: string[];
  hashtags: string[];
  overallScore: number;
}

const SEOOptimizer: React.FC<SEOOptimizerProps> = ({ isOpen, onClose }) => {
  const { currentProject } = useStore();
  const [title, setTitle] = useState(currentProject?.name || '');
  const [description, setDescription] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('title');

  // 제목 분석
  const analyzeTitle = (text: string): SEOAnalysis['title'] => {
    const length = text.length;
    let score = 100;
    const suggestions: string[] = [];

    // 길이 체크 (권장 50자 이내)
    if (length > 60) {
      score -= 20;
      suggestions.push('제목이 너무 깁니다. 60자 이내로 줄이세요.');
    } else if (length > 50) {
      score -= 10;
      suggestions.push('제목이 약간 깁니다. 50자 이내가 좋습니다.');
    } else if (length < 20) {
      score -= 15;
      suggestions.push('제목이 너무 짧습니다. 핵심 키워드를 추가하세요.');
    }

    // 숫자 포함 체크
    if (!/\d/.test(text)) {
      score -= 5;
      suggestions.push('숫자를 포함하면 클릭률이 올라갑니다. (예: "5가지 방법")');
    }

    // 감정 유발 단어 체크
    const emotionalWords = ['충격', '놀라운', '최고', '비밀', '진짜', '실화', '꿀팁', '필수', '완벽'];
    if (!emotionalWords.some(word => text.includes(word))) {
      score -= 5;
      suggestions.push('감정을 유발하는 단어를 추가하세요. (예: 충격, 꿀팁, 필수)');
    }

    // 질문형/호기심 유발 체크
    if (!text.includes('?') && !text.includes('이유') && !text.includes('방법')) {
      score -= 5;
      suggestions.push('질문이나 방법을 제시하면 관심을 끌 수 있습니다.');
    }

    return { text, length, score: Math.max(0, score), suggestions };
  };

  // 설명 분석
  const analyzeDescription = (text: string): SEOAnalysis['description'] => {
    const length = text.length;
    let score = 100;
    const suggestions: string[] = [];

    // 길이 체크 (권장 200-500자)
    if (length < 100) {
      score -= 20;
      suggestions.push('설명이 너무 짧습니다. 최소 200자 이상 작성하세요.');
    } else if (length < 200) {
      score -= 10;
      suggestions.push('설명을 더 자세히 작성하면 좋습니다.');
    } else if (length > 5000) {
      score -= 5;
      suggestions.push('설명이 너무 깁니다. 핵심만 담아주세요.');
    }

    // 타임스탬프 체크
    const hasTimestamps = /\d{1,2}:\d{2}/.test(text);
    if (!hasTimestamps) {
      score -= 10;
      suggestions.push('타임스탬프를 추가하면 시청자 편의성이 올라갑니다.');
    }

    // CTA (Call to Action) 체크
    const ctaWords = ['구독', '좋아요', '알림', '댓글', '공유'];
    const hasCTA = ctaWords.some(word => text.includes(word));
    if (!hasCTA) {
      score -= 10;
      suggestions.push('구독, 좋아요 등 행동 유도 문구를 추가하세요.');
    }

    // 링크 체크
    if (!text.includes('http') && !text.includes('www')) {
      score -= 5;
      suggestions.push('관련 링크나 SNS 링크를 추가하면 좋습니다.');
    }

    // 해시태그 체크
    if (!text.includes('#')) {
      score -= 5;
      suggestions.push('관련 해시태그를 추가하세요.');
    }

    return { text, length, score: Math.max(0, score), hasTimestamps, hasCTA, suggestions };
  };

  // 태그 생성
  const generateTags = (titleText: string, keywordText: string): string[] => {
    const baseTags = keywordText ? [keywordText] : [];
    const words = titleText.split(/\s+/).filter(w => w.length > 1);
    
    // 기본 태그
    const demoTags = [
      ...baseTags,
      ...words.slice(0, 3),
      '유튜브', '콘텐츠', '꿀팁', '추천', '정보', '리뷰',
      '2025', '최신', '인기', '트렌드', '브이로그',
    ];

    return [...new Set(demoTags)].slice(0, 15);
  };

  // 해시태그 생성
  const generateHashtags = (titleText: string, keywordText: string): string[] => {
    const tags = generateTags(titleText, keywordText);
    return tags.slice(0, 5).map(tag => `#${tag.replace(/\s+/g, '')}`);
  };

  // 전체 분석 실행
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    // 시뮬레이션 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));

    const titleAnalysis = analyzeTitle(title);
    const descAnalysis = analyzeDescription(description);
    const tags = generateTags(title, keyword);
    const hashtags = generateHashtags(title, keyword);

    const overallScore = Math.round(
      (titleAnalysis.score + descAnalysis.score) / 2
    );

    setAnalysis({
      title: titleAnalysis,
      description: descAnalysis,
      tags,
      hashtags,
      overallScore,
    });

    setIsAnalyzing(false);
  };

  // AI 제목 생성
  const handleGenerateTitle = async () => {
    if (!keyword.trim()) return;
    
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const titleTemplates = [
      `${keyword} 완벽 정리 - 이것만 알면 끝!`,
      `${keyword}? 아직도 이렇게 하세요? (충격)`,
      `${keyword} 마스터하는 5가지 꿀팁`,
      `실제로 효과 본 ${keyword} 방법 공개`,
      `${keyword}의 모든 것 - 초보자 필독`,
    ];

    setTitle(titleTemplates[Math.floor(Math.random() * titleTemplates.length)]);
    setIsGenerating(false);
  };

  // AI 설명 생성
  const handleGenerateDescription = async () => {
    if (!title.trim()) return;
    
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const timestamps = currentProject?.scenes?.map((scene, i) => {
      const time = i * 30;
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      return `${mins}:${secs.toString().padStart(2, '0')} ${scene.script?.substring(0, 20) || `파트 ${i + 1}`}...`;
    }).join('\n') || '0:00 인트로\n0:30 본론\n2:00 마무리';

    const generatedDesc = `안녕하세요! 오늘은 "${title}"에 대해 알려드립니다.

📌 영상 목차
${timestamps}

💡 이 영상이 도움이 되셨다면 좋아요와 구독 부탁드려요!
알림 설정까지 해주시면 새로운 영상을 놓치지 않으실 수 있어요.

📱 SNS
- Instagram: @your_channel
- Blog: https://your-blog.com

🔖 관련 태그
${generateHashtags(title, keyword).join(' ')}

#${keyword || '유튜브'} #콘텐츠 #꿀팁 #추천`;

    setDescription(generatedDesc);
    setIsGenerating(false);
  };

  // 복사 기능
  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 전체 메타데이터 다운로드
  const handleDownload = () => {
    if (!analysis) return;

    const metadata = {
      title,
      description,
      tags: analysis.tags,
      hashtags: analysis.hashtags,
      analysis: {
        titleScore: analysis.title.score,
        descriptionScore: analysis.description.score,
        overallScore: analysis.overallScore,
      },
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo_metadata_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 점수 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-error';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔍 SEO 최적화 도우미" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 키워드 입력 */}
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="주요 키워드를 입력하세요"
              icon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!title && !description)}
              isLoading={isAnalyzing}
              icon={<TrendingUp className="w-4 h-4" />}
            >
              분석하기
            </Button>
          </div>
        </Card>

        {/* 전체 점수 (분석 후) */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 p-4 bg-card rounded-xl"
          >
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm text-muted">SEO 점수</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="flex gap-6">
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(analysis.title.score)}`}>
                  {analysis.title.score}
                </div>
                <div className="text-xs text-muted">제목</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(analysis.description.score)}`}>
                  {analysis.description.score}
                </div>
                <div className="text-xs text-muted">설명</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 제목 섹션 */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'title' ? '' : 'title')}
            className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium">제목</span>
              <span className="text-xs text-muted">({title.length}자)</span>
              {analysis && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreBg(analysis.title.score)} text-white`}>
                  {analysis.title.score}점
                </span>
              )}
            </div>
            {expandedSection === 'title' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'title' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="영상 제목을 입력하세요"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      onClick={handleGenerateTitle}
                      disabled={!keyword || isGenerating}
                      isLoading={isGenerating}
                      icon={<Sparkles className="w-4 h-4" />}
                    >
                      AI 생성
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleCopy(title, 'title')}
                      icon={copiedField === 'title' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    />
                  </div>

                  {/* 진행 바 */}
                  <div className="h-1 bg-card-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        title.length > 60 ? 'bg-error' : title.length > 50 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(100, (title.length / 60) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>권장: 50자 이내</span>
                    <span className={title.length > 60 ? 'text-error' : ''}>
                      {title.length}/60
                    </span>
                  </div>

                  {/* 분석 결과 */}
                  {analysis && analysis.title.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {analysis.title.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-warning">
                          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 설명 섹션 */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'description' ? '' : 'description')}
            className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-medium">설명</span>
              <span className="text-xs text-muted">({description.length}자)</span>
              {analysis && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreBg(analysis.description.score)} text-white`}>
                  {analysis.description.score}점
                </span>
              )}
            </div>
            {expandedSection === 'description' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'description' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                  <div className="flex gap-2 items-start">
                    <TextArea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="영상 설명을 입력하세요..."
                      rows={8}
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={!title || isGenerating}
                        isLoading={isGenerating}
                        icon={<Sparkles className="w-4 h-4" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(description, 'description')}
                        icon={copiedField === 'description' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      />
                    </div>
                  </div>

                  {/* 체크리스트 */}
                  {analysis && (
                    <div className="flex gap-4 text-sm">
                      <div className={`flex items-center gap-1 ${analysis.description.hasTimestamps ? 'text-success' : 'text-muted'}`}>
                        <Clock className="w-4 h-4" />
                        타임스탬프 {analysis.description.hasTimestamps ? '✓' : '✗'}
                      </div>
                      <div className={`flex items-center gap-1 ${analysis.description.hasCTA ? 'text-success' : 'text-muted'}`}>
                        <Target className="w-4 h-4" />
                        CTA {analysis.description.hasCTA ? '✓' : '✗'}
                      </div>
                    </div>
                  )}

                  {/* 분석 결과 */}
                  {analysis && analysis.description.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {analysis.description.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-warning">
                          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 태그 섹션 */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'tags' ? '' : 'tags')}
            className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              <span className="font-medium">태그</span>
              {analysis && (
                <span className="text-xs text-muted">({analysis.tags.length}개)</span>
              )}
            </div>
            {expandedSection === 'tags' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'tags' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                  {analysis ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {analysis.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm cursor-pointer hover:bg-primary/20"
                            onClick={() => handleCopy(tag, `tag-${i}`)}
                          >
                            {tag}
                            {copiedField === `tag-${i}` && <Check className="inline w-3 h-3 ml-1" />}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(analysis.tags.join(', '), 'all-tags')}
                        icon={copiedField === 'all-tags' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      >
                        전체 복사
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted">분석을 실행하면 태그가 생성됩니다.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 해시태그 섹션 */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'hashtags' ? '' : 'hashtags')}
            className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-secondary" />
              <span className="font-medium">해시태그 (#shorts용)</span>
            </div>
            {expandedSection === 'hashtags' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'hashtags' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                  {analysis ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {analysis.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm cursor-pointer hover:bg-secondary/20"
                            onClick={() => handleCopy(tag, `hashtag-${i}`)}
                          >
                            {tag}
                            {copiedField === `hashtag-${i}` && <Check className="inline w-3 h-3 ml-1" />}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(analysis.hashtags.join(' '), 'all-hashtags')}
                        icon={copiedField === 'all-hashtags' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      >
                        전체 복사
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted">분석을 실행하면 해시태그가 생성됩니다.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              다시 분석
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={!analysis}
              icon={<Download className="w-4 h-4" />}
            >
              메타데이터 다운로드
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SEOOptimizer;
