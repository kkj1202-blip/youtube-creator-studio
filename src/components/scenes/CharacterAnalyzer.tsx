'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Wand2,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  RefreshCw,
  ThumbsUp,
  AlertCircle,
  ChevronDown,
  Brain,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { imageStyleLibrary, getStyleById } from '@/lib/imageStyles';
import { analyzeCharacters, generateCharacterImagePrompt, Character as LLMCharacter, LLMConfig } from '@/lib/api/llm';

interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  role: '주인공' | '조연' | '단역';
  gender: '남성' | '여성' | '불명';
  ageRange: string;
  personality: string;
  relationship: string;
  imageUrl?: string;
  isGenerating?: boolean;
  approved: boolean;
  error?: string;
  status?: string;
  generatedPrompt?: string;
}

interface CharacterAnalyzerProps {
  onApprove: (characters: Character[]) => void;
  onClose: () => void;
}

// 캐릭터 이미지 생성
async function generateCharacterImage(
  apiKey: string,
  prompt: string,
  onStatusChange?: (status: string) => void
): Promise<string> {
  console.log('[CharacterAnalyzer] ========== API 호출 시작 ==========');
  console.log('[CharacterAnalyzer] Prompt:', prompt);
  
  onStatusChange?.('API 요청 중...');

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        prompt,
        aspectRatio: '1:1',
      }),
    });
    
    console.log('[CharacterAnalyzer] Response status:', response.status);
    
    const responseText = await response.text();
    console.log('[CharacterAnalyzer] Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[CharacterAnalyzer] JSON 파싱 실패:', parseError);
      throw new Error(`응답 파싱 실패: ${responseText.slice(0, 100)}`);
    }
    
    if (!response.ok) {
      const errorMsg = data.error || `HTTP 오류 ${response.status}`;
      console.error('[CharacterAnalyzer] API 에러:', errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!data.imageUrl) {
      throw new Error('이미지 URL을 받지 못했습니다.');
    }
    
    console.log('[CharacterAnalyzer] ========== 성공! ==========');
    
    // 프록시 URL로 변환 (CORS 문제 해결)
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
    
    onStatusChange?.('완료!');
    return proxyUrl;
  } catch (error) {
    console.error('[CharacterAnalyzer] ========== 에러 발생 ==========');
    console.error('[CharacterAnalyzer] Error:', error);
    onStatusChange?.('실패');
    throw error;
  }
}

export default function CharacterAnalyzer({ onApprove, onClose }: CharacterAnalyzerProps) {
  const { currentProject, settings, updateProject } = useStore();
  const [step, setStep] = useState<'analyze' | 'generate' | 'review'>('analyze');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('hyper-photo');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const hasApiKey = !!settings.kieApiKey;
  const hasLLMKey = !!settings.geminiApiKey || !!settings.openaiApiKey;
  
  const getLLMConfig = (): LLMConfig => ({
    provider: settings.llmProvider || 'gemini',
    geminiApiKey: settings.geminiApiKey,
    openaiApiKey: settings.openaiApiKey,
  });

  // 1단계: LLM으로 대본 분석
  const handleAnalyze = useCallback(async () => {
    if (!currentProject) return;
    
    if (!hasLLMKey) {
      setAnalysisError('설정에서 Gemini 또는 OpenAI API 키를 입력하세요.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      console.log('[CharacterAnalyzer] LLM 대본 분석 시작...');
      const scripts = currentProject.scenes.map(s => s.script);
      
      const llmCharacters = await analyzeCharacters(getLLMConfig(), scripts);
      
      console.log('[CharacterAnalyzer] LLM 분석 결과:', llmCharacters);
      
      if (llmCharacters.length === 0) {
        throw new Error('캐릭터를 찾을 수 없습니다. 대본을 확인해주세요.');
      }
      
      const chars: Character[] = llmCharacters.map((char, idx) => ({
        id: `char-${idx}`,
        name: char.name,
        role: char.role as '주인공' | '조연' | '단역',
        gender: char.gender as '남성' | '여성' | '불명',
        ageRange: char.ageRange,
        appearance: char.appearance,
        personality: char.personality,
        relationship: char.relationship,
        description: `${char.personality}. ${char.relationship}`,
        approved: false,
      }));
      
      setCharacters(chars);
      setStep('generate');
    } catch (error) {
      console.error('[CharacterAnalyzer] 분석 오류:', error);
      setAnalysisError(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentProject, settings]);

  const addCharacter = () => {
    if (characters.length >= 5) return;
    setCharacters(prev => [...prev, {
      id: `char-${Date.now()}`,
      name: '',
      description: '',
      appearance: '',
      role: '조연',
      gender: '불명',
      ageRange: '',
      personality: '',
      relationship: '',
      approved: false,
    }]);
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // LLM으로 캐릭터별 이미지 프롬프트 생성 후 이미지 생성
  const generateSingleImage = async (charId: string) => {
    if (!hasApiKey) {
      alert('설정에서 KIE API 키를 입력하세요.');
      return;
    }
    
    const char = characters.find(c => c.id === charId);
    if (!char || !char.name.trim()) {
      alert('캐릭터 이름을 입력하세요.');
      return;
    }
    
    updateCharacter(charId, { isGenerating: true, error: undefined, status: 'LLM 프롬프트 생성 중...' });
    
    try {
      let prompt: string;
      
      // LLM API 키가 있으면 LLM으로 프롬프트 생성
      if (hasLLMKey) {
        const style = getStyleById(selectedStyle);
        const llmChar: LLMCharacter = {
          name: char.name,
          role: char.role,
          gender: char.gender,
          ageRange: char.ageRange,
          appearance: char.appearance || `${char.gender} ${char.ageRange}`,
          personality: char.personality || '친근함',
          relationship: char.relationship || '',
        };
        
        prompt = await generateCharacterImagePrompt(
          getLLMConfig(),
          llmChar,
          style?.name || 'photorealistic'
        );
        console.log('[CharacterAnalyzer] LLM 생성 프롬프트:', prompt);
      } else {
        // LLM 없이 기본 프롬프트
        const style = getStyleById(selectedStyle);
        const stylePrompt = style?.prompt || 'photorealistic portrait';
        prompt = `portrait of ${char.appearance || char.name}, ${char.gender}, ${char.ageRange}, ${stylePrompt}, centered, looking at camera, highly detailed`;
      }
      
      updateCharacter(charId, { status: '이미지 생성 중...', generatedPrompt: prompt });
      
      const imageUrl = await generateCharacterImage(
        settings.kieApiKey, 
        prompt,
        (status) => updateCharacter(charId, { status })
      );
      
      updateCharacter(charId, { imageUrl, isGenerating: false, status: undefined });
    } catch (error) {
      console.error('[CharacterAnalyzer] Error:', error);
      updateCharacter(charId, { 
        isGenerating: false, 
        error: error instanceof Error ? error.message : '생성 실패',
        status: undefined
      });
    }
  };

  // 모든 캐릭터 이미지 생성
  const handleGenerateAll = async () => {
    if (!hasApiKey) {
      alert('설정에서 KIE API 키를 입력하세요.');
      return;
    }
    
    const invalidChars = characters.filter(c => !c.name.trim());
    if (invalidChars.length > 0) {
      alert('모든 캐릭터의 이름을 입력해주세요.');
      return;
    }
    
    console.log('[CharacterAnalyzer] ========== 전체 생성 시작 ==========');
    setGeneratingAll(true);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (char.imageUrl) {
        console.log(`[CharacterAnalyzer] ${char.name}: 이미 이미지 있음, 스킵`);
        continue;
      }
      
      updateCharacter(char.id, { isGenerating: true, error: undefined, status: `${i+1}/${characters.length} LLM 프롬프트 생성 중...` });
      
      try {
        let prompt: string;
        
        if (hasLLMKey) {
          const style = getStyleById(selectedStyle);
          const llmChar: LLMCharacter = {
            name: char.name,
            role: char.role,
            gender: char.gender,
            ageRange: char.ageRange,
            appearance: char.appearance || `${char.gender} ${char.ageRange}`,
            personality: char.personality || '친근함',
            relationship: char.relationship || '',
          };
          
          prompt = await generateCharacterImagePrompt(
            getLLMConfig(),
            llmChar,
            style?.name || 'photorealistic'
          );
        } else {
          const style = getStyleById(selectedStyle);
          const stylePrompt = style?.prompt || 'photorealistic portrait';
          prompt = `portrait of ${char.appearance || char.name}, ${char.gender}, ${char.ageRange}, ${stylePrompt}, centered, looking at camera`;
        }
        
        updateCharacter(char.id, { status: `${i+1}/${characters.length} 이미지 생성 중...`, generatedPrompt: prompt });
        
        const imageUrl = await generateCharacterImage(
          settings.kieApiKey, 
          prompt,
          (status) => updateCharacter(char.id, { status: `${i+1}/${characters.length} ${status}` })
        );
        
        updateCharacter(char.id, { imageUrl, isGenerating: false, status: undefined });
        successCount++;
      } catch (error) {
        failCount++;
        updateCharacter(char.id, { 
          isGenerating: false, 
          error: error instanceof Error ? error.message : '생성 실패',
          status: undefined
        });
      }
      
      // 다음 요청 전 대기
      if (i < characters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    setGeneratingAll(false);
    
    if (successCount > 0) {
      setStep('review');
    } else if (failCount > 0) {
      alert('모든 이미지 생성 실패. 콘솔을 확인해주세요.');
    }
  };

  const toggleApprove = (id: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, approved: !c.approved } : c));
  };

  const handleFinalApprove = () => {
    const approvedCharacters = characters.filter(c => c.approved && c.imageUrl);
    
    if (approvedCharacters.length === 0) {
      alert('최소 1명의 캐릭터를 승인해주세요.');
      return;
    }

    // 캐릭터 정보를 프로젝트에 저장 (일관성 유지용)
    const characterDescription = approvedCharacters
      .map(c => `${c.name}(${c.role}, ${c.gender}, ${c.ageRange}): ${c.appearance}`)
      .join(' | ');
    
    const artDirection = approvedCharacters
      .map(c => c.generatedPrompt || c.appearance)
      .join(' | ');
    
    updateProject({
      imageConsistency: {
        characterDescription,
        artDirection: `캐릭터 일관성: ${artDirection}`,
      },
    });

    onApprove(approvedCharacters);
  };

  const approvedCount = characters.filter(c => c.approved && c.imageUrl).length;
  const generatedCount = characters.filter(c => c.imageUrl).length;

  return (
    <div className="space-y-4">
      {/* 단계 표시 */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          {['분석', '생성', '승인'].map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === ['analyze', 'generate', 'review'][i] ? 'bg-primary text-white' : 
                ['analyze', 'generate', 'review'].indexOf(step) > i ? 'bg-success text-white' : 
                'bg-muted/30 text-muted'
              }`}>
                {i + 1}
              </div>
              <span className="text-xs text-muted">{label}</span>
              {i < 2 && <div className="w-4 h-0.5 bg-muted/30 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* 1단계: LLM 분석 */}
      {step === 'analyze' && (
        <div className="text-center py-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Brain className="w-8 h-8" />
            <span className="text-lg font-semibold">AI 대본 분석</span>
          </div>
          
          <p className="text-sm text-muted">
            {hasLLMKey 
              ? 'LLM이 대본을 분석하여 캐릭터의 이름, 외형, 성격, 관계를 자동으로 추출합니다.'
              : '⚠️ 설정에서 Gemini 또는 OpenAI API 키를 입력하면 더 정확한 분석이 가능합니다.'}
          </p>
          
          {analysisError && (
            <div className="text-sm text-error bg-error/10 p-3 rounded-lg flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              {analysisError}
            </div>
          )}
          
          <Button
            variant="primary"
            size="lg"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            isLoading={isAnalyzing}
            icon={<Sparkles className="w-5 h-5" />}
          >
            {isAnalyzing ? 'AI 분석 중...' : '대본 분석하기'}
          </Button>
          
          {!hasLLMKey && (
            <p className="text-xs text-warning">
              LLM API 키 없이도 기본 분석은 가능하지만, 캐릭터 외형이 정확하지 않을 수 있습니다.
            </p>
          )}
        </div>
      )}

      {/* 2단계: 캐릭터 정보 & 이미지 생성 */}
      {step === 'generate' && (
        <>
          {/* 스타일 드롭다운 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium whitespace-nowrap">스타일:</label>
            <div className="relative flex-1">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none"
              >
                {imageStyleLibrary.map(cat => (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                    {cat.styles.map(style => (
                      <option key={style.id} value={style.id}>{style.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>

          {/* 캐릭터 목록 */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              캐릭터 ({characters.length}명)
            </h3>
            <Button variant="ghost" size="sm" onClick={addCharacter} disabled={characters.length >= 5} icon={<Plus className="w-3 h-3" />}>
              추가
            </Button>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {characters.map((char) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex gap-4">
                  {/* 이미지 영역 */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg bg-muted/20 overflow-hidden relative">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : char.isGenerating ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mb-1" />
                        <span className="text-xs text-muted text-center px-2">{char.status || '생성 중...'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateSingleImage(char.id)}
                        disabled={!char.name.trim() || !hasApiKey}
                        className="w-full h-full flex flex-col items-center justify-center hover:bg-muted/30 transition-colors disabled:opacity-50"
                      >
                        <ImageIcon className="w-8 h-8 text-muted mb-1" />
                        <span className="text-xs text-muted">클릭하여 생성</span>
                      </button>
                    )}
                    
                    {char.imageUrl && !char.isGenerating && (
                      <button
                        onClick={() => generateSingleImage(char.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80"
                      >
                        <RefreshCw className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>

                  {/* 정보 영역 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={char.name}
                        onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                        placeholder="이름"
                        className="flex-1 text-sm font-medium"
                      />
                      <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                        char.role === '주인공' ? 'bg-primary/20 text-primary' : 
                        char.role === '조연' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-muted/30 text-muted'
                      }`}>
                        {char.role}
                      </span>
                      <button onClick={() => removeCharacter(char.id)} className="text-muted hover:text-error p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-muted/20 rounded">{char.gender}</span>
                      <span className="px-2 py-0.5 bg-muted/20 rounded">{char.ageRange || '나이 미상'}</span>
                    </div>
                    
                    <Input
                      value={char.appearance}
                      onChange={(e) => updateCharacter(char.id, { appearance: e.target.value })}
                      placeholder="외형 (예: 긴 검은 머리, 날카로운 눈매, 단정한 정장)"
                      className="text-sm"
                    />
                    
                    <Input
                      value={char.personality}
                      onChange={(e) => updateCharacter(char.id, { personality: e.target.value })}
                      placeholder="성격 (예: 차분하고 지적인)"
                      className="text-sm"
                    />
                    
                    {char.error && (
                      <div className="text-xs text-error bg-error/10 p-2 rounded flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{char.error}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {!hasApiKey && (
            <div className="text-sm text-warning bg-warning/10 p-2 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />설정에서 KIE API 키를 입력하세요.
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep('analyze')}>뒤로</Button>
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleGenerateAll}
              disabled={generatingAll || characters.length === 0 || !hasApiKey}
              isLoading={generatingAll}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {generatingAll ? '생성 중...' : `전체 이미지 생성 (${characters.length}명)`}
            </Button>
          </div>
        </>
      )}

      {/* 3단계: 승인 */}
      {step === 'review' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">캐릭터 승인</h3>
            <span className="text-xs text-muted">{approvedCount}/{generatedCount} 선택됨</span>
          </div>
          
          <p className="text-xs text-muted">마음에 드는 캐릭터를 클릭하여 선택하세요. 승인된 캐릭터의 외형이 전체 씬에 적용됩니다.</p>

          <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
            {characters.filter(c => c.imageUrl).map((char) => (
              <motion.div
                key={char.id}
                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                  char.approved ? 'border-success' : 'border-transparent hover:border-primary/50'
                }`}
                onClick={() => toggleApprove(char.id)}
              >
                <img src={char.imageUrl} alt={char.name} className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-sm">{char.name}</div>
                      <div className="text-xs text-white/70">{char.role} · {char.gender} · {char.ageRange}</div>
                    </div>
                    {char.approved && (
                      <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); generateSingleImage(char.id); }}
                  disabled={char.isGenerating}
                  className="absolute top-2 right-2 p-1.5 rounded bg-black/60 hover:bg-black/80"
                >
                  {char.isGenerating ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <RefreshCw className="w-3 h-3 text-white" />}
                </button>
              </motion.div>
            ))}
          </div>

          {generatedCount === 0 && (
            <div className="text-center py-4 text-muted">
              <p>생성된 이미지가 없습니다.</p>
              <Button variant="ghost" size="sm" onClick={() => setStep('generate')} className="mt-2">다시 생성</Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep('generate')}>뒤로</Button>
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleFinalApprove}
              disabled={approvedCount === 0}
              icon={<ThumbsUp className="w-4 h-4" />}
            >
              승인하고 전체 씬 생성 ({approvedCount}명)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
