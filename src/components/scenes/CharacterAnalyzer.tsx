'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { ConsistencySettings } from '@/lib/imageStyles';

interface Character {
  id: string;
  name: string;
  description: string;
  appearance: string;
  role: string;
  approved: boolean;
}

interface CharacterAnalyzerProps {
  onApprove: (characters: Character[], settings: ConsistencySettings) => void;
  onClose: () => void;
}

// 대본에서 캐릭터 분석 (간단한 휴리스틱)
function analyzeCharactersFromScript(script: string): Character[] {
  const characters: Character[] = [];
  const lines = script.split('\n');
  
  // 이름 패턴들 (한국어/영어)
  const namePatterns = [
    /^([가-힣]{2,4})\s*[:：]/gm,           // 홍길동:
    /^([A-Z][a-z]+)\s*[:：]/gm,           // John:
    /\[([가-힣]{2,4})\]/g,                // [홍길동]
    /「([가-힣]{2,4})」/g,                // 「홍길동」
    /"([가-힣]{2,4})"/g,                  // "홍길동"
    /^([가-힣]{2,4})(이|가|은|는|을|를)\s/gm, // 홍길동이 말했다
  ];

  const foundNames = new Set<string>();
  
  // 패턴 매칭으로 이름 추출
  namePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(script)) !== null) {
      const name = match[1].trim();
      if (name.length >= 2 && name.length <= 10) {
        foundNames.add(name);
      }
    }
  });

  // 일반 명사 제외 (간단한 필터)
  const commonWords = new Set(['이것', '그것', '저것', '여기', '거기', '저기', '오늘', '내일', '어제']);
  
  let index = 0;
  foundNames.forEach(name => {
    if (!commonWords.has(name)) {
      characters.push({
        id: `char-${index++}`,
        name,
        description: '',
        appearance: '',
        role: index === 1 ? '주인공' : '조연',
        approved: false,
      });
    }
  });

  // 최소 1명의 캐릭터 (주인공)
  if (characters.length === 0) {
    characters.push({
      id: 'char-0',
      name: '주인공',
      description: '영상의 주요 캐릭터',
      appearance: '',
      role: '주인공',
      approved: false,
    });
  }

  return characters.slice(0, 5); // 최대 5명
}

// 배경 분석 (키워드 기반)
function analyzeBackgroundFromScript(script: string): string {
  const backgrounds: string[] = [];
  
  // 장소 키워드
  const locationKeywords = [
    { keywords: ['학교', '교실', '운동장'], bg: '학교 교실 또는 운동장' },
    { keywords: ['집', '방', '거실', '침실'], bg: '현대적인 집 내부' },
    { keywords: ['회사', '사무실', '오피스'], bg: '현대적인 사무실' },
    { keywords: ['카페', '커피숍', '스타벅스'], bg: '아늑한 카페 인테리어' },
    { keywords: ['공원', '숲', '자연', '나무'], bg: '푸른 공원과 자연' },
    { keywords: ['도시', '거리', '길', '도로'], bg: '현대 도시 거리' },
    { keywords: ['밤', '야경', '어둠'], bg: '밤하늘과 도시 야경' },
    { keywords: ['바다', '해변', '해수욕장'], bg: '맑은 바다와 해변' },
    { keywords: ['산', '등산', '정상'], bg: '웅장한 산과 자연' },
  ];
  
  const lowerScript = script.toLowerCase();
  locationKeywords.forEach(({ keywords, bg }) => {
    if (keywords.some(kw => lowerScript.includes(kw))) {
      backgrounds.push(bg);
    }
  });
  
  return backgrounds.length > 0 
    ? backgrounds.slice(0, 2).join(', ') 
    : '현대적인 배경';
}

export default function CharacterAnalyzer({ onApprove, onClose }: CharacterAnalyzerProps) {
  const { currentProject, updateProject } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [background, setBackground] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // 대본 분석 실행
  const handleAnalyze = useCallback(async () => {
    if (!currentProject) return;
    
    setIsAnalyzing(true);
    
    // 모든 씬의 대본 합치기
    const fullScript = currentProject.scenes
      .map(s => s.script)
      .join('\n');
    
    // 약간의 딜레이 (분석 중 느낌)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 캐릭터 분석
    const analyzedCharacters = analyzeCharactersFromScript(fullScript);
    setCharacters(analyzedCharacters);
    
    // 배경 분석
    const analyzedBg = analyzeBackgroundFromScript(fullScript);
    setBackground(analyzedBg);
    
    // 기본 색상 팔레트
    setColorPalette('밝고 선명한 색상');
    
    setHasAnalyzed(true);
    setIsAnalyzing(false);
  }, [currentProject]);

  // 캐릭터 추가
  const addCharacter = () => {
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

  // 캐릭터 승인 토글
  const toggleApprove = (id: string) => {
    setCharacters(prev =>
      prev.map(c => c.id === id ? { ...c, approved: !c.approved } : c)
    );
  };

  // 모든 캐릭터 승인
  const approveAll = () => {
    setCharacters(prev => prev.map(c => ({ ...c, approved: true })));
  };

  // 최종 승인 및 이미지 생성 시작
  const handleFinalApprove = () => {
    const approvedCharacters = characters.filter(c => c.approved);
    
    if (approvedCharacters.length === 0) {
      alert('최소 1명의 캐릭터를 승인해주세요.');
      return;
    }

    // 캐릭터 설명 조합
    const characterDescription = approvedCharacters
      .map(c => {
        const parts = [c.name];
        if (c.appearance) parts.push(c.appearance);
        if (c.description) parts.push(c.description);
        return parts.join(': ');
      })
      .join(' | ');

    const consistencySettings: ConsistencySettings = {
      characterDescription,
      backgroundDescription: background,
      colorPalette,
    };

    // 프로젝트에 저장
    updateProject({
      imageConsistency: consistencySettings,
    });

    onApprove(approvedCharacters, consistencySettings);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          캐릭터 & 배경 분석
        </h2>
        <p className="text-sm text-muted">
          대본을 분석하여 캐릭터를 추출하고, 일관된 이미지를 생성합니다.
        </p>
      </div>

      {/* 분석 시작 버튼 */}
      {!hasAnalyzed && (
        <Card className="text-center py-8">
          <Wand2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted mb-4">
            대본에서 캐릭터와 배경을 자동으로 분석합니다.
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

      {/* 분석 결과 */}
      {hasAnalyzed && (
        <>
          {/* 캐릭터 목록 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                캐릭터 ({characters.length}명)
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={approveAll}>
                  모두 승인
                </Button>
                <Button variant="ghost" size="sm" onClick={addCharacter} icon={<Plus className="w-4 h-4" />}>
                  추가
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {characters.map((char, index) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border transition-colors ${
                    char.approved 
                      ? 'bg-success/10 border-success/30' 
                      : 'bg-muted/10 border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 승인 체크박스 */}
                    <button
                      onClick={() => toggleApprove(char.id)}
                      className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        char.approved
                          ? 'bg-success border-success text-white'
                          : 'border-muted hover:border-primary'
                      }`}
                    >
                      {char.approved && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    {/* 캐릭터 정보 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={char.name}
                          onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                          placeholder="캐릭터 이름"
                          className="font-semibold"
                        />
                        <span className={`text-xs px-2 py-1 rounded ${
                          char.role === '주인공' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted'
                        }`}>
                          {char.role}
                        </span>
                      </div>
                      
                      <Input
                        value={char.appearance}
                        onChange={(e) => updateCharacter(char.id, { appearance: e.target.value })}
                        placeholder="외형 (예: 검은 머리, 파란 눈, 청바지와 흰 티셔츠)"
                      />
                      
                      <Input
                        value={char.description}
                        onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                        placeholder="추가 설명 (성격, 특징 등)"
                      />
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeCharacter(char.id)}
                      className="text-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {characters.length === 0 && (
              <div className="text-center py-8 text-muted">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>캐릭터가 없습니다. 추가해주세요.</p>
              </div>
            )}
          </Card>

          {/* 배경 & 색상 설정 */}
          <Card>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                배경 & 색상 설정
              </h3>
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3 overflow-hidden"
                >
                  <div>
                    <label className="text-sm text-muted mb-1 block">배경 설명</label>
                    <Input
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      placeholder="예: 현대적인 도시 거리, 밤하늘"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1 block">색상 팔레트</label>
                    <Input
                      value={colorPalette}
                      onChange={(e) => setColorPalette(e.target.value)}
                      placeholder="예: 따뜻한 오렌지, 부드러운 파스텔"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleAnalyze}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              다시 분석
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleFinalApprove}
              disabled={characters.filter(c => c.approved).length === 0}
              icon={<Sparkles className="w-4 h-4" />}
            >
              승인하고 이미지 생성 ({characters.filter(c => c.approved).length}명)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
