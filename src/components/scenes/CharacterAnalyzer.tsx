'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Wand2,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { imageStyleLibrary, getStyleById, type ImageStyle, type StyleCategory } from '@/lib/imageStyles';

interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  role: '주인공' | '조연';
  imageUrl?: string;
  isGenerating?: boolean;
  approved: boolean;
  error?: string;
}

interface CharacterAnalyzerProps {
  onApprove: (characters: Character[]) => void;
  onClose: () => void;
}

// 대본에서 주요 캐릭터 분석
function analyzeMainCharacters(scripts: string[]): { name: string; role: '주인공' | '조연' }[] {
  const fullScript = scripts.join('\n');
  const characters: { name: string; count: number }[] = [];
  
  // 대화 패턴에서 이름 추출
  const dialoguePatterns = [
    /^([가-힣]{2,4})\s*[:：]/gm,
    /\[([가-힣]{2,4})\]/g,
    /「([가-힣]{2,4})」/g,
  ];
  
  const nameCounts = new Map<string, number>();
  
  dialoguePatterns.forEach(pattern => {
    let match;
    const tempScript = fullScript;
    while ((match = pattern.exec(tempScript)) !== null) {
      const name = match[1].trim();
      if (name.length >= 2 && name.length <= 4) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      }
    }
  });
  
  // 등장 빈도순 정렬
  const sortedNames = Array.from(nameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // 최대 3명
  
  // 결과 생성
  const result = sortedNames.map(([ name ], index) => ({
    name,
    role: (index === 0 ? '주인공' : '조연') as '주인공' | '조연',
  }));
  
  // 캐릭터가 없으면 기본값
  if (result.length === 0) {
    return [
      { name: '주인공', role: '주인공' },
      { name: '조연1', role: '조연' },
    ];
  }
  
  return result;
}

// 캐릭터 이미지 생성
async function generateCharacterImage(
  apiKey: string,
  character: Character,
  styleId: string = 'hyper-photo'
): Promise<string> {
  // 스타일 라이브러리에서 프롬프트 가져오기
  const style = getStyleById(styleId);
  const stylePrompt = style?.prompt || 'photorealistic portrait, professional photography, studio lighting, 8k uhd';
  
  const prompt = `${character.appearance || `${character.name}, Korean ${character.role === '주인공' ? 'protagonist' : 'supporting'} character`}, ${character.description || 'friendly expression'}, ${stylePrompt}, portrait shot, centered, looking at camera`;
  
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      prompt,
      aspectRatio: '1:1', // 캐릭터 프로필은 정사각형
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '이미지 생성 실패');
  }
  
  const data = await response.json();
  if (!data.imageUrl) {
    throw new Error('이미지 URL을 받지 못했습니다');
  }
  
  return data.imageUrl;
}

export default function CharacterAnalyzer({ onApprove, onClose }: CharacterAnalyzerProps) {
  const { currentProject, settings, updateProject } = useStore();
  const [step, setStep] = useState<'analyze' | 'generate' | 'review'>('analyze');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('hyper-photo');
  const [selectedCategory, setSelectedCategory] = useState('cinematic');
  const [generatingAll, setGeneratingAll] = useState(false);

  const hasApiKey = !!settings.kieApiKey;

  // 1단계: 대본 분석
  const handleAnalyze = useCallback(async () => {
    if (!currentProject) return;
    
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const scripts = currentProject.scenes.map(s => s.script);
    const analyzed = analyzeMainCharacters(scripts);
    
    const chars: Character[] = analyzed.map((char, idx) => ({
      id: `char-${idx}`,
      name: char.name,
      role: char.role,
      description: '',
      appearance: '',
      approved: false,
    }));
    
    setCharacters(chars);
    setStep('generate');
    setIsAnalyzing(false);
  }, [currentProject]);

  // 캐릭터 추가
  const addCharacter = () => {
    if (characters.length >= 5) return;
    setCharacters(prev => [
      ...prev,
      {
        id: `char-${Date.now()}`,
        name: '',
        description: '',
        appearance: '',
        role: '조연',
        approved: false,
      }
    ]);
  };

  // 캐릭터 삭제
  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // 캐릭터 수정
  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  // 개별 캐릭터 이미지 생성
  const generateSingleImage = async (charId: string) => {
    if (!hasApiKey) {
      alert('설정에서 KIE API 키를 입력하세요.');
      return;
    }
    
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    
    updateCharacter(charId, { isGenerating: true, error: undefined });
    
    try {
      const imageUrl = await generateCharacterImage(settings.kieApiKey, char, selectedStyle);
      updateCharacter(charId, { imageUrl, isGenerating: false });
    } catch (error) {
      updateCharacter(charId, { 
        isGenerating: false, 
        error: error instanceof Error ? error.message : '생성 실패' 
      });
    }
  };

  // 2단계: 모든 캐릭터 이미지 생성
  const handleGenerateAll = async () => {
    if (!hasApiKey) {
      alert('설정에서 KIE API 키를 입력하세요.');
      return;
    }
    
    // 이름이 없는 캐릭터 확인
    const invalidChars = characters.filter(c => !c.name.trim());
    if (invalidChars.length > 0) {
      alert('모든 캐릭터의 이름을 입력해주세요.');
      return;
    }
    
    setGeneratingAll(true);
    
    // 순차적으로 생성 (동시 요청 제한)
    for (const char of characters) {
      if (char.imageUrl) continue; // 이미 생성된 건 스킵
      
      updateCharacter(char.id, { isGenerating: true, error: undefined });
      
      try {
        const imageUrl = await generateCharacterImage(settings.kieApiKey, char, selectedStyle);
        updateCharacter(char.id, { imageUrl, isGenerating: false });
      } catch (error) {
        updateCharacter(char.id, { 
          isGenerating: false, 
          error: error instanceof Error ? error.message : '생성 실패' 
        });
      }
      
      // 요청 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setGeneratingAll(false);
    setStep('review');
  };

  // 캐릭터 승인/거부
  const toggleApprove = (id: string) => {
    setCharacters(prev =>
      prev.map(c => c.id === id ? { ...c, approved: !c.approved } : c)
    );
  };

  // 3단계: 최종 승인 → 전체 씬 이미지 생성
  const handleFinalApprove = () => {
    const approvedCharacters = characters.filter(c => c.approved && c.imageUrl);
    
    if (approvedCharacters.length === 0) {
      alert('최소 1명의 캐릭터를 승인해주세요.');
      return;
    }

    // 프로젝트에 캐릭터 일관성 정보 저장
    const characterDescription = approvedCharacters
      .map(c => `${c.name}(${c.role}): ${c.appearance || '기본 외형'}, ${c.description || ''}`)
      .join(' | ');
    
    updateProject({
      imageConsistency: {
        characterDescription,
        artDirection: `캐릭터 일관성 유지: ${approvedCharacters.map(c => c.name).join(', ')}`,
      },
    });

    onApprove(approvedCharacters);
  };

  // 현재 선택된 카테고리의 스타일 목록
  const currentCategory = imageStyleLibrary.find(c => c.id === selectedCategory);
  const currentStyles = currentCategory?.styles || [];

  const approvedCount = characters.filter(c => c.approved && c.imageUrl).length;
  const generatedCount = characters.filter(c => c.imageUrl).length;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* 헤더 */}
      <div className="text-center sticky top-0 bg-card pt-2 pb-4 z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          캐릭터 분석 & 이미지 생성
        </h2>
        <p className="text-sm text-muted">
          {step === 'analyze' && '대본을 분석하여 주요 캐릭터를 추출합니다.'}
          {step === 'generate' && '캐릭터 정보를 입력하고 이미지를 생성하세요.'}
          {step === 'review' && '마음에 드는 캐릭터를 승인하세요.'}
        </p>
        
        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {['analyze', 'generate', 'review'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s ? 'bg-primary text-white' : 
                ['analyze', 'generate', 'review'].indexOf(step) > i ? 'bg-success text-white' : 
                'bg-muted/30 text-muted'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 ${['analyze', 'generate', 'review'].indexOf(step) > i ? 'bg-success' : 'bg-muted/30'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 1단계: 분석 시작 */}
      {step === 'analyze' && (
        <Card className="text-center py-8">
          <Wand2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted mb-2">
            대본에서 주요 캐릭터(2~3명)를 자동으로 추출합니다.
          </p>
          <p className="text-xs text-muted mb-6">
            추출 후 캐릭터별로 이미지를 생성하고, 마음에 드는 걸 선택하세요.
          </p>
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            isLoading={isAnalyzing}
            icon={isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          >
            {isAnalyzing ? '분석 중...' : '대본 분석하기'}
          </Button>
        </Card>
      )}

      {/* 2단계: 캐릭터 정보 입력 & 이미지 생성 */}
      {step === 'generate' && (
        <>
          {/* 스타일 선택 */}
          <Card>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              이미지 스타일 ({imageStyleLibrary.reduce((acc, c) => acc + c.styles.length, 0)}개)
            </h3>
            
            {/* 카테고리 탭 */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {imageStyleLibrary.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    // 카테고리 변경 시 첫 번째 스타일 선택
                    if (cat.styles.length > 0) {
                      setSelectedStyle(cat.styles[0].id);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm transition-colors ${
                    selectedCategory === cat.id 
                      ? 'bg-primary text-white' 
                      : 'bg-muted/20 hover:bg-muted/30'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* 스타일 그리드 */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {currentStyles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedStyle === style.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm truncate">{style.name}</div>
                </button>
              ))}
            </div>
            
            {/* 선택된 스타일 미리보기 */}
            {selectedStyle && (
              <div className="mt-3 p-2 bg-muted/10 rounded-lg">
                <div className="text-xs text-muted">선택됨: <span className="text-primary font-medium">{getStyleById(selectedStyle)?.name}</span></div>
              </div>
            )}
          </Card>

          {/* 캐릭터 목록 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                캐릭터 ({characters.length}명)
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addCharacter}
                disabled={characters.length >= 5}
                icon={<Plus className="w-4 h-4" />}
              >
                추가
              </Button>
            </div>

            <div className="space-y-4">
              {characters.map((char, index) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-border bg-muted/5"
                >
                  <div className="flex items-start gap-4">
                    {/* 이미지 미리보기 / 생성 버튼 */}
                    <div className="w-24 h-24 rounded-lg bg-muted/20 flex-shrink-0 overflow-hidden relative">
                      {char.imageUrl ? (
                        <img 
                          src={char.imageUrl} 
                          alt={char.name}
                          className="w-full h-full object-cover"
                        />
                      ) : char.isGenerating ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <button
                          onClick={() => generateSingleImage(char.id)}
                          disabled={!char.name.trim() || !hasApiKey}
                          className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-muted/30 transition-colors disabled:opacity-50"
                        >
                          <ImageIcon className="w-6 h-6 text-muted" />
                          <span className="text-xs text-muted">생성</span>
                        </button>
                      )}
                      
                      {/* 재생성 버튼 */}
                      {char.imageUrl && !char.isGenerating && (
                        <button
                          onClick={() => generateSingleImage(char.id)}
                          className="absolute top-1 right-1 p-1 rounded bg-black/50 hover:bg-black/70 transition-colors"
                          title="다시 생성"
                        >
                          <RefreshCw className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>

                    {/* 캐릭터 정보 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={char.name}
                          onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                          placeholder="캐릭터 이름"
                          className="flex-1"
                        />
                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                          char.role === '주인공' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted'
                        }`}>
                          {char.role}
                        </span>
                        <button
                          onClick={() => removeCharacter(char.id)}
                          className="text-muted hover:text-error transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Input
                        value={char.appearance}
                        onChange={(e) => updateCharacter(char.id, { appearance: e.target.value })}
                        placeholder="외형 (예: 20대 여성, 긴 검은 머리, 안경)"
                      />
                      
                      <Input
                        value={char.description}
                        onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                        placeholder="추가 설명 (예: 밝은 미소, 캐주얼 의상)"
                      />
                      
                      {char.error && (
                        <div className="text-xs text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {char.error}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {characters.length === 0 && (
              <div className="text-center py-8 text-muted">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>캐릭터를 추가해주세요.</p>
              </div>
            )}
          </Card>

          {/* API 키 경고 */}
          {!hasApiKey && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              설정에서 KIE API 키를 입력해주세요.
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 sticky bottom-0 bg-card py-4">
            <Button variant="ghost" onClick={() => setStep('analyze')}>
              뒤로
            </Button>
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleGenerateAll}
              disabled={generatingAll || characters.length === 0 || !hasApiKey}
              isLoading={generatingAll}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {generatingAll ? '생성 중...' : `캐릭터 이미지 생성 (${characters.length}명)`}
            </Button>
          </div>
        </>
      )}

      {/* 3단계: 승인 */}
      {step === 'review' && (
        <>
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              캐릭터 승인
              <span className="text-sm text-muted ml-auto">
                {approvedCount}/{generatedCount} 승인됨
              </span>
            </h3>

            <p className="text-sm text-muted mb-4">
              마음에 드는 캐릭터를 선택하세요. 선택한 캐릭터로 전체 씬 이미지가 생성됩니다.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {characters.filter(c => c.imageUrl).map((char) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                    char.approved 
                      ? 'border-success bg-success/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleApprove(char.id)}
                >
                  <img 
                    src={char.imageUrl} 
                    alt={char.name}
                    className="w-full aspect-square object-cover"
                  />
                  
                  {/* 이름 오버레이 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{char.name}</div>
                        <div className="text-xs text-white/70">{char.role}</div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        char.approved ? 'bg-success' : 'bg-white/20'
                      }`}>
                        {char.approved ? (
                          <ThumbsUp className="w-4 h-4 text-white" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 재생성 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateSingleImage(char.id);
                    }}
                    disabled={char.isGenerating}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-50"
                    title="다시 생성"
                  >
                    {char.isGenerating ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-white" />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>

            {generatedCount === 0 && (
              <div className="text-center py-8 text-muted">
                <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>생성된 캐릭터 이미지가 없습니다.</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep('generate')}
                  className="mt-2"
                >
                  다시 생성하기
                </Button>
              </div>
            )}
          </Card>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 sticky bottom-0 bg-card py-4">
            <Button variant="ghost" onClick={() => setStep('generate')}>
              뒤로
            </Button>
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleFinalApprove}
              disabled={approvedCount === 0}
              icon={<Sparkles className="w-4 h-4" />}
            >
              승인하고 전체 씬 이미지 생성 ({approvedCount}명)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
