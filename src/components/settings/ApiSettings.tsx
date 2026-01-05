'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Youtube,
  Image as ImageIcon,
  Volume2,
  AlertCircle,
  Loader2,
  Star,
  StarOff,
  Power,
  PowerOff,
  Search,
  Play,
  Pause,
  Tag,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Input, Card, Badge } from '@/components/ui';
import type { VoiceOption, FavoriteVoice } from '@/types';

// 카테고리 옵션
const categoryOptions = [
  { value: '', label: '카테고리 없음' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'character', label: '캐릭터' },
  { value: 'narration', label: '나레이션' },
  { value: 'news', label: '뉴스' },
  { value: 'child', label: '어린이' },
];

const ApiSettings: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    updateElevenLabsAccount,
    toggleAccountActive,
    toggleVoiceFavorite,
    updateVoiceCategory,
    getFavoriteVoices,
    addFavoriteVoice,
    removeFavoriteVoice,
    updateFavoriteVoice,
  } = useStore();
  
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error'; message: string } | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [voiceSearch, setVoiceSearch] = useState<Record<number, string>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Record<number, boolean>>({ 0: true });
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [filterFavorites, setFilterFavorites] = useState<Record<number, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<Record<number, string>>({});
  
  // 커스텀 보이스 추가 폼
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceDesc, setNewVoiceDesc] = useState('');
  const [showAddVoiceForm, setShowAddVoiceForm] = useState(false);

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpandAccount = (index: number) => {
    setExpandedAccounts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // KIE API 테스트 (이미지 생성)
  const testKieApiKey = async () => {
    if (!settings.kieApiKey) return;

    setLoading((prev) => ({ ...prev, kie: true }));
    setTestResults((prev) => ({ ...prev, kie: null }));

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.kieApiKey,
          prompt: 'test',
          aspectRatio: '16:9',
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.imageUrl) {
        if (data.demo) {
          setTestResults((prev) => ({ 
            ...prev, 
            kie: { status: 'error', message: '데모 모드: 유효한 API 키가 필요합니다' } 
          }));
        } else {
          setTestResults((prev) => ({ 
            ...prev, 
            kie: { status: 'success', message: 'API 키가 유효합니다' } 
          }));
        }
      } else {
        setTestResults((prev) => ({ 
          ...prev, 
          kie: { status: 'error', message: data.error || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        kie: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, kie: false }));
  };

  // ElevenLabs API 테스트
  const testElevenLabsApiKey = async (accountIndex: number) => {
    const account = settings.elevenLabsAccounts[accountIndex];
    if (!account.apiKey) return;

    const key = `eleven-${accountIndex}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    setTestResults((prev) => ({ ...prev, [key]: null }));

    try {
      const response = await fetch('/api/fetch-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: account.apiKey }),
      });

      const data = await response.json();
      
      if (response.ok && data.voices) {
        if (data.demo) {
          setTestResults((prev) => ({ 
            ...prev, 
            [key]: { status: 'error', message: '데모 모드: 유효한 API 키가 필요합니다' } 
          }));
        } else {
          setTestResults((prev) => ({ 
            ...prev, 
            [key]: { status: 'success', message: `API 키 유효 (보이스 ${data.voices.length}개)` } 
          }));
        }
      } else {
        setTestResults((prev) => ({ 
          ...prev, 
          [key]: { status: 'error', message: data.error || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        [key]: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  // 보이스 목록 가져오기
  const fetchVoices = async (accountIndex: number) => {
    const account = settings.elevenLabsAccounts[accountIndex];
    if (!account.apiKey) return;

    const key = `voices-${accountIndex}`;
    setLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch('/api/fetch-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: account.apiKey }),
      });

      const data = await response.json();
      
      if (response.ok && data.voices) {
        // 기존 즐겨찾기/카테고리 정보 유지
        const existingVoices = account.voices;
        const voices: VoiceOption[] = data.voices.map((v: any) => {
          const existing = existingVoices.find((ev) => ev.id === v.voice_id);
          return {
            id: v.voice_id,
            name: v.name,
            description: v.labels?.description || v.description,
            previewUrl: v.preview_url,
            isFavorite: existing?.isFavorite || false,
            category: existing?.category || '',
          };
        });
        updateElevenLabsAccount(accountIndex, { voices });
        
        if (data.demo) {
          alert('데모 모드: 유효한 API 키를 입력하면 실제 보이스 목록을 가져올 수 있습니다.');
        }
      } else {
        alert(data.error || '보이스를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      alert('연결 오류가 발생했습니다.');
    }

    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  // YouTube API 테스트
  const testYoutubeApiKey = async () => {
    if (!settings.youtubeApiKey) return;

    setLoading((prev) => ({ ...prev, youtube: true }));
    setTestResults((prev) => ({ ...prev, youtube: null }));

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=test&key=${settings.youtubeApiKey}`
      );

      if (response.ok) {
        setTestResults((prev) => ({ 
          ...prev, 
          youtube: { status: 'success', message: 'API 키가 유효합니다' } 
        }));
      } else {
        const data = await response.json();
        setTestResults((prev) => ({ 
          ...prev, 
          youtube: { status: 'error', message: data.error?.message || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        youtube: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, youtube: false }));
  };

  // 음성 미리듣기
  const playVoicePreview = (voiceId: string, previewUrl?: string) => {
    if (!previewUrl) return;
    
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }
    
    const audio = new Audio(previewUrl);
    audio.play();
    setPlayingVoice(voiceId);
    audio.onended = () => setPlayingVoice(null);
  };

  // 필터링된 보이스 목록 가져오기
  const getFilteredVoices = (accountIndex: number) => {
    const account = settings.elevenLabsAccounts[accountIndex];
    let voices = account.voices;
    
    // 검색어 필터
    const search = voiceSearch[accountIndex]?.toLowerCase() || '';
    if (search) {
      voices = voices.filter((v) => 
        v.name.toLowerCase().includes(search) ||
        v.description?.toLowerCase().includes(search)
      );
    }
    
    // 즐겨찾기 필터
    if (filterFavorites[accountIndex]) {
      voices = voices.filter((v) => v.isFavorite);
    }
    
    // 카테고리 필터
    const category = filterCategory[accountIndex];
    if (category) {
      voices = voices.filter((v) => v.category === category);
    }
    
    // 즐겨찾기 먼저 정렬
    return voices.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // 즐겨찾기 보이스 목록
  const favoriteVoices = getFavoriteVoices();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Info Banner */}
      <Card className="bg-primary/10 border-primary/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">API 키 설정 안내</h4>
            <p className="text-sm text-muted mt-1">
              각 서비스의 API 키를 입력하면 실제 기능이 작동합니다. 
              API 키는 브라우저의 로컬 스토리지에 안전하게 저장됩니다.
            </p>
          </div>
        </div>
      </Card>

      {/* ⭐ 커스텀 즐겨찾기 보이스 (Voice ID 직접 등록) */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          즐겨찾기 보이스 (Voice ID 직접 등록)
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
            {(settings.favoriteVoices || []).length}개
          </Badge>
        </h3>
        
        <p className="text-sm text-muted mb-4">
          ElevenLabs 보이스 ID를 직접 입력하여 즐겨찾기로 등록할 수 있습니다.
          등록된 보이스는 음성 선택 시 상단에 표시됩니다.
        </p>
        
        {/* 등록된 커스텀 보이스 목록 */}
        {(settings.favoriteVoices || []).length > 0 && (
          <div className="space-y-2 mb-4">
            {(settings.favoriteVoices || []).map((voice) => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3 bg-card-hover rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <div>
                    <span className="font-medium">{voice.name}</span>
                    {voice.description && (
                      <span className="text-xs text-muted ml-2">({voice.description})</span>
                    )}
                    <p className="text-xs text-muted">ID: {voice.id}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFavoriteVoice(voice.id)}
                  className="text-error hover:bg-error/10"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* 새 보이스 추가 폼 */}
        {showAddVoiceForm ? (
          <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
            <Input
              label="Voice ID *"
              value={newVoiceId}
              onChange={(e) => setNewVoiceId(e.target.value)}
              placeholder="예: 8jHHF8rMqMlg8if2mOUe"
            />
            <Input
              label="이름 *"
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
              placeholder="예: 한 여성"
            />
            <Input
              label="설명 (선택)"
              value={newVoiceDesc}
              onChange={(e) => setNewVoiceDesc(e.target.value)}
              placeholder="예: 여성 보이스"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (newVoiceId && newVoiceName) {
                    addFavoriteVoice({
                      id: newVoiceId.trim(),
                      name: newVoiceName.trim(),
                      description: newVoiceDesc.trim() || undefined,
                    });
                    setNewVoiceId('');
                    setNewVoiceName('');
                    setNewVoiceDesc('');
                    setShowAddVoiceForm(false);
                  }
                }}
                disabled={!newVoiceId || !newVoiceName}
              >
                추가
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddVoiceForm(false);
                  setNewVoiceId('');
                  setNewVoiceName('');
                  setNewVoiceDesc('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowAddVoiceForm(true)}
            icon={<Star className="w-4 h-4" />}
          >
            새 보이스 ID 추가
          </Button>
        )}
      </Card>

      {/* 계정 보이스 즐겨찾기 (기존) */}
      {favoriteVoices.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-secondary" />
            계정 보이스 즐겨찾기
            <Badge variant="secondary">{favoriteVoices.length}개</Badge>
          </h3>
          <div className="flex flex-wrap gap-2">
            {favoriteVoices.map(({ accountIndex, voice }) => (
              <div
                key={`${accountIndex}-${voice.id}`}
                className="px-3 py-2 bg-card-hover rounded-lg text-sm flex items-center gap-2 group hover:bg-primary/10 transition-colors"
              >
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{voice.name}</span>
                <span className="text-xs text-muted">
                  (계정 {accountIndex + 1})
                </span>
                {voice.previewUrl && (
                  <button
                    onClick={() => playVoicePreview(voice.id, voice.previewUrl)}
                    className="p-1 hover:bg-primary/20 rounded"
                  >
                    {playingVoice === voice.id ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KIE (Image Generation) API */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          이미지 생성 API (KIE / Genspark)
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKeys.kie ? 'text' : 'password'}
                value={settings.kieApiKey}
                onChange={(e) => updateSettings({ kieApiKey: e.target.value })}
                placeholder="이미지 생성 API 키를 입력하세요"
                icon={<Key className="w-4 h-4" />}
              />
              <button
                onClick={() => toggleShowKey('kie')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showKeys.kie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={testKieApiKey}
              disabled={!settings.kieApiKey || loading.kie}
              isLoading={loading.kie}
            >
              테스트
            </Button>
          </div>
          {testResults.kie && (
            <div className={`flex items-center gap-2 text-sm ${testResults.kie.status === 'success' ? 'text-success' : 'text-error'}`}>
              {testResults.kie.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {testResults.kie.message}
            </div>
          )}
          <p className="text-xs text-muted">
            Genspark 이미지 생성 API 키를 입력하세요. 2D 애니, 3D 애니, 실사 스타일의 이미지를 생성할 수 있습니다.
          </p>
        </div>
      </Card>

      {/* ElevenLabs Accounts */}
      {settings.elevenLabsAccounts.map((account, index) => {
        const isExpanded = expandedAccounts[index] ?? false;
        const filteredVoices = getFilteredVoices(index);
        const favoriteCount = account.voices.filter((v) => v.isFavorite).length;
        
        return (
          <Card key={index} className={`${account.isActive ? 'border-success/50' : 'border-border opacity-75'}`}>
            {/* 계정 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-secondary" />
                  ElevenLabs {account.name}
                </h3>
                {account.isActive ? (
                  <Badge variant="primary" className="bg-success/20 text-success">
                    <Power className="w-3 h-3 mr-1" />
                    활성
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <PowerOff className="w-3 h-3 mr-1" />
                    비활성
                  </Badge>
                )}
                {account.voices.length > 0 && (
                  <Badge variant="secondary">
                    {account.voices.length}개 음성
                  </Badge>
                )}
                {favoriteCount > 0 && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {favoriteCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={account.isActive ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => toggleAccountActive(index)}
                  icon={account.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                >
                  {account.isActive ? '활성화됨' : '비활성화됨'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpandAccount(index)}
                  icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                />
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Account Name */}
                  <Input
                    label="계정 이름"
                    value={account.name}
                    onChange={(e) => updateElevenLabsAccount(index, { name: e.target.value })}
                    placeholder="계정 이름 (선택)"
                  />

                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      API 키
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type={showKeys[`eleven-${index}`] ? 'text' : 'password'}
                          value={account.apiKey}
                          onChange={(e) => updateElevenLabsAccount(index, { apiKey: e.target.value })}
                          placeholder="ElevenLabs API 키를 입력하세요"
                          icon={<Key className="w-4 h-4" />}
                        />
                        <button
                          onClick={() => toggleShowKey(`eleven-${index}`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                        >
                          {showKeys[`eleven-${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => testElevenLabsApiKey(index)}
                        disabled={!account.apiKey || loading[`eleven-${index}`]}
                        isLoading={loading[`eleven-${index}`]}
                      >
                        테스트
                      </Button>
                    </div>
                    {testResults[`eleven-${index}`] && (
                      <div className={`flex items-center gap-2 text-sm ${testResults[`eleven-${index}`]?.status === 'success' ? 'text-success' : 'text-error'}`}>
                        {testResults[`eleven-${index}`]?.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {testResults[`eleven-${index}`]?.message}
                      </div>
                    )}
                  </div>

                  {/* Voices */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-muted-foreground">
                        등록된 보이스 ({account.voices.length}개)
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchVoices(index)}
                        disabled={!account.apiKey || loading[`voices-${index}`]}
                        isLoading={loading[`voices-${index}`]}
                        icon={<RefreshCw className="w-4 h-4" />}
                      >
                        보이스 불러오기
                      </Button>
                    </div>
                    
                    {account.voices.length > 0 && (
                      <>
                        {/* 검색 및 필터 */}
                        <div className="flex flex-wrap gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <Input
                              placeholder="음성 검색..."
                              value={voiceSearch[index] || ''}
                              onChange={(e) => setVoiceSearch({ ...voiceSearch, [index]: e.target.value })}
                              icon={<Search className="w-4 h-4" />}
                            />
                          </div>
                          <Button
                            variant={filterFavorites[index] ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterFavorites({ ...filterFavorites, [index]: !filterFavorites[index] })}
                            icon={<Star className={`w-4 h-4 ${filterFavorites[index] ? 'fill-current' : ''}`} />}
                          >
                            즐겨찾기
                          </Button>
                          <select
                            value={filterCategory[index] || ''}
                            onChange={(e) => setFilterCategory({ ...filterCategory, [index]: e.target.value })}
                            className="px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
                          >
                            {categoryOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* 음성 목록 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                          {filteredVoices.map((voice) => (
                            <div
                              key={voice.id}
                              className={`p-3 rounded-lg border transition-all ${
                                voice.isFavorite 
                                  ? 'bg-yellow-500/10 border-yellow-500/30' 
                                  : 'bg-card-hover border-border'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{voice.name}</span>
                                    {voice.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {categoryOptions.find((c) => c.value === voice.category)?.label || voice.category}
                                      </Badge>
                                    )}
                                  </div>
                                  {voice.description && (
                                    <p className="text-xs text-muted mt-1 line-clamp-1">
                                      {voice.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted mt-1">
                                    ID: {voice.id}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* 미리듣기 */}
                                  {voice.previewUrl && (
                                    <button
                                      onClick={() => playVoicePreview(voice.id, voice.previewUrl)}
                                      className="p-1.5 hover:bg-primary/20 rounded transition-colors"
                                      title="미리듣기"
                                    >
                                      {playingVoice === voice.id ? (
                                        <Pause className="w-4 h-4 text-primary" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  {/* 즐겨찾기 */}
                                  <button
                                    onClick={() => toggleVoiceFavorite(index, voice.id)}
                                    className="p-1.5 hover:bg-yellow-500/20 rounded transition-colors"
                                    title={voice.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                  >
                                    {voice.isFavorite ? (
                                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    ) : (
                                      <StarOff className="w-4 h-4 text-muted" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              {/* 카테고리 선택 */}
                              <div className="mt-2">
                                <select
                                  value={voice.category || ''}
                                  onChange={(e) => updateVoiceCategory(index, voice.id, e.target.value)}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                                >
                                  {categoryOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {filteredVoices.length === 0 && (
                          <p className="text-sm text-muted text-center py-4">
                            검색 결과가 없습니다
                          </p>
                        )}
                      </>
                    )}
                    
                    {account.voices.length === 0 && (
                      <p className="text-sm text-muted py-3 text-center bg-card-hover rounded-lg">
                        API 키를 입력하고 &apos;보이스 불러오기&apos;를 클릭하세요
                      </p>
                    )}
                  </div>

                  {/* Usage Note */}
                  <p className="text-xs text-muted">
                    ElevenLabs 계정을 여러 개 등록하여 API 사용량을 분산할 수 있습니다.
                    활성화된 계정만 음성 생성에 사용됩니다.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}

      {/* YouTube API */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          YouTube Data API
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKeys.youtube ? 'text' : 'password'}
                value={settings.youtubeApiKey}
                onChange={(e) => updateSettings({ youtubeApiKey: e.target.value })}
                placeholder="YouTube Data API 키를 입력하세요"
                icon={<Key className="w-4 h-4" />}
              />
              <button
                onClick={() => toggleShowKey('youtube')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showKeys.youtube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={testYoutubeApiKey}
              disabled={!settings.youtubeApiKey || loading.youtube}
              isLoading={loading.youtube}
            >
              테스트
            </Button>
          </div>
          {testResults.youtube && (
            <div className={`flex items-center gap-2 text-sm ${testResults.youtube?.status === 'success' ? 'text-success' : 'text-error'}`}>
              {testResults.youtube?.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {testResults.youtube?.message}
            </div>
          )}
          <p className="text-xs text-muted">
            YouTube API는 트렌드 분석, 댓글 분석, 수익 대시보드 기능에 사용됩니다.
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              API 키 발급하기 →
            </a>
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default ApiSettings;
