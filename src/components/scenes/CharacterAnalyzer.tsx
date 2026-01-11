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
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { imageStyleLibrary, getStyleById, getAllStyles } from '@/lib/imageStyles';

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
  status?: string; // API 상태 표시
}

interface CharacterAnalyzerProps {
  onApprove: (characters: Character[]) => void;
  onClose: () => void;
}

// 대본에서 주요 캐릭터 분석
function analyzeMainCharacters(scripts: string[]): { name: string; role: '주인공' | '조연' }[] {
  const fullScript = scripts.join('\n');
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
  
  const sortedNames = Array.from(nameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const result = sortedNames.map(([ name ], index) => ({
    name,
    role: (index === 0 ? '주인공' : '조연') as '주인공' | '조연',
  }));
  
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
  styleId: string = 'hyper-photo',
  onStatusChange?: (status: string) => void
): Promise<string> {
  const style = getStyleById(styleId);
  const stylePrompt = style?.prompt || 'photorealistic portrait, professional photography, studio lighting, 8k uhd';
  
  const characterDesc = character.appearance || `${character.name}, Korean ${character.role === '주인공' ? 'protagonist' : 'supporting'} character`;
  const extraDesc = character.description || 'friendly expression';
  const prompt = `${characterDesc}, ${extraDesc}, ${stylePrompt}, portrait shot, centered, looking at camera`;
  
  console.log('[CharacterAnalyzer] ========== API 호출 시작 ==========');
  console.log('[CharacterAnalyzer] Character:', character.name);
  console.log('[CharacterAnalyzer] Prompt:', prompt);
  console.log('[CharacterAnalyzer] Style:', style?.name || styleId);
  console.log('[CharacterAnalyzer] API Key (first 8 chars):', apiKey?.slice(0, 8) + '...');
  
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
    console.log('[CharacterAnalyzer] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('[CharacterAnalyzer] Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[CharacterAnalyzer] JSON 파싱 실패:', parseError);
      throw new Error(`응답 파싱 실패: ${responseText.slice(0, 100)}`);
    }
    
    console.log('[CharacterAnalyzer] Parsed response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      const errorMsg = data.error || `HTTP 오류 ${response.status}`;
      console.error('[CharacterAnalyzer] API 에러:', errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!data.imageUrl) {
      console.error('[CharacterAnalyzer] imageUrl 없음. 전체 응답:', data);
      throw new Error('이미지 URL을 받지 못했습니다. taskId: ' + (data.taskId || 'none'));
    }
    
    console.log('[CharacterAnalyzer] ========== 성공! ==========');
    console.log('[CharacterAnalyzer] Image URL:', data.imageUrl);
    onStatusChange?.('완료!');
    return data.imageUrl;
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

  const hasApiKey = !!settings.kieApiKey;
  const allStyles = getAllStyles();

  // 1단계: 대본 분석
  const handleAnalyze = useCallback(async () => {
    if (!currentProject) return;
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
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

  const addCharacter = () => {
    if (characters.length >= 5) return;
    setCharacters(prev => [...prev, {
      id: `char-${Date.now()}`,
      name: '',
      description: '',
      appearance: '',
      role: '조연',
      approved: false,
    }]);
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // 개별 이미지 생성
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
    
    console.log('[CharacterAnalyzer] 시작: 캐릭터', char.name);
    updateCharacter(charId, { isGenerating: true, error: undefined, status: '시작 중...' });
    
    try {
      const imageUrl = await generateCharacterImage(
        settings.kieApiKey, 
        char, 
        selectedStyle,
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
    console.log('[CharacterAnalyzer] 캐릭터 수:', characters.length);
    console.log('[CharacterAnalyzer] 선택된 스타일:', selectedStyle);
    console.log('[CharacterAnalyzer] API Key:', settings.kieApiKey ? '설정됨' : '없음');
    
    setGeneratingAll(true);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (char.imageUrl) {
        console.log(`[CharacterAnalyzer] ${char.name}: 이미 이미지 있음, 스킵`);
        continue;
      }
      
      console.log(`[CharacterAnalyzer] ${i+1}/${characters.length} 생성 중: ${char.name}`);
      updateCharacter(char.id, { isGenerating: true, error: undefined, status: `${i+1}/${characters.length} 생성 중...` });
      
      try {
        const imageUrl = await generateCharacterImage(
          settings.kieApiKey, 
          char, 
          selectedStyle,
          (status) => updateCharacter(char.id, { status })
        );
        updateCharacter(char.id, { imageUrl, isGenerating: false, status: undefined });
        successCount++;
        console.log(`[CharacterAnalyzer] ${char.name}: 성공!`);
      } catch (error) {
        failCount++;
        const errMsg = error instanceof Error ? error.message : '생성 실패';
        console.error(`[CharacterAnalyzer] ${char.name}: 실패 -`, errMsg);
        updateCharacter(char.id, { 
          isGenerating: false, 
          error: errMsg,
          status: undefined
        });
      }
      
      // 다음 요청 전 대기
      if (i < characters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`[CharacterAnalyzer] ========== 완료: 성공 ${successCount}, 실패 ${failCount} ==========`);
    setGeneratingAll(false);
    
    // 하나라도 성공하면 review로
    if (successCount > 0) {
      setStep('review');
    } else if (failCount > 0) {
      alert(`모든 이미지 생성 실패. 콘솔을 확인해주세요.`);
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

  const approvedCount = characters.filter(c => c.approved && c.imageUrl).length;
  const generatedCount = characters.filter(c => c.imageUrl).length;
  const selectedStyleName = getStyleById(selectedStyle)?.name || selectedStyle;

  return (
    <div className="space-y-4">
      {/* 간소화된 헤더 + 단계 표시 */}
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

      {/* 1단계: 분석 */}
      {step === 'analyze' && (
        <div className="text-center py-6">
          <p className="text-sm text-muted mb-4">대본에서 주요 캐릭터를 추출합니다.</p>
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            isLoading={isAnalyzing}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isAnalyzing ? '분석 중...' : '대본 분석하기'}
          </Button>
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
            <h3 className="text-sm font-medium">캐릭터 ({characters.length}명)</h3>
            <Button variant="ghost" size="sm" onClick={addCharacter} disabled={characters.length >= 5} icon={<Plus className="w-3 h-3" />}>
              추가
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto">
            {characters.map((char) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg border border-border bg-card"
              >
                {/* 이미지 영역 */}
                <div className="aspect-square rounded-lg bg-muted/20 overflow-hidden relative mb-3">
                  {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                  ) : char.isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <span className="text-xs text-muted">{char.status || '생성 중...'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateSingleImage(char.id)}
                      disabled={!char.name.trim() || !hasApiKey}
                      className="w-full h-full flex flex-col items-center justify-center hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-10 h-10 text-muted mb-1" />
                      <span className="text-xs text-muted">클릭하여 생성</span>
                    </button>
                  )}
                  
                  {char.imageUrl && !char.isGenerating && (
                    <button
                      onClick={() => generateSingleImage(char.id)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-black/60 hover:bg-black/80"
                    >
                      <RefreshCw className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>

                {/* 입력 필드 */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={char.name}
                      onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                      placeholder="이름"
                      className="flex-1 text-sm"
                    />
                    <span className={`text-xs px-2 py-1.5 rounded ${char.role === '주인공' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted'}`}>
                      {char.role}
                    </span>
                    <button onClick={() => removeCharacter(char.id)} className="text-muted hover:text-error p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={char.appearance}
                    onChange={(e) => updateCharacter(char.id, { appearance: e.target.value })}
                    placeholder="외형 (예: 20대 여성, 긴 검은머리)"
                    className="text-sm"
                  />
                  {char.error && (
                    <div className="text-xs text-error bg-error/10 p-2 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{char.error}
                    </div>
                  )}
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
              {generatingAll ? '생성 중...' : `이미지 생성 (${characters.length}명)`}
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
          
          <p className="text-xs text-muted">마음에 드는 캐릭터를 클릭하여 선택하세요.</p>

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
                      <div className="text-xs text-white/70">{char.role}</div>
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
