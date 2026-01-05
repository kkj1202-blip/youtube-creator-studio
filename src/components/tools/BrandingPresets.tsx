'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Image as ImageIcon,
  Play,
  Upload,
  Trash2,
  Plus,
  Check,
  Copy,
  Download,
  Settings2,
  Eye,
  EyeOff,
  Move,
  CornerDownRight,
  CornerUpLeft,
  Youtube,
  Bell,
  ThumbsUp,
  Save,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { Button, Card, Input, Select, Slider, Toggle, Modal, Tabs, TextArea } from '@/components/ui';
import { useStore } from '@/store/useStore';

interface BrandingPresetsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BrandingPreset {
  id: string;
  name: string;
  createdAt: string;
  logo: {
    url: string | null;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: number;
    opacity: number;
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    fontSize: number;
  };
  intro: {
    enabled: boolean;
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    text: string;
    backgroundColor: string;
  };
  outro: {
    enabled: boolean;
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    text: string;
    showSubscribe: boolean;
    showEndScreen: boolean;
    backgroundColor: string;
  };
  subscribe: {
    enabled: boolean;
    style: 'minimal' | 'bounce' | 'slide' | 'glow';
    position: 'bottom-left' | 'bottom-right' | 'bottom-center';
    showAt: number; // 초 단위
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
}

const defaultPreset: BrandingPreset = {
  id: 'default',
  name: '기본 프리셋',
  createdAt: new Date().toISOString(),
  logo: {
    url: null,
    position: 'top-right',
    size: 80,
    opacity: 0.8,
  },
  watermark: {
    enabled: false,
    text: '@YourChannel',
    position: 'bottom-right',
    opacity: 0.5,
    fontSize: 14,
  },
  intro: {
    enabled: false,
    type: 'fade',
    duration: 3,
    text: '채널명',
    backgroundColor: '#1a1a2e',
  },
  outro: {
    enabled: false,
    type: 'fade',
    duration: 5,
    text: '시청해주셔서 감사합니다!',
    showSubscribe: true,
    showEndScreen: true,
    backgroundColor: '#1a1a2e',
  },
  subscribe: {
    enabled: false,
    style: 'bounce',
    position: 'bottom-right',
    showAt: 30,
  },
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    text: '#ffffff',
    background: '#1a1a2e',
  },
};

const positionOptions = [
  { value: 'top-left', label: '좌상단' },
  { value: 'top-right', label: '우상단' },
  { value: 'bottom-left', label: '좌하단' },
  { value: 'bottom-right', label: '우하단' },
];

const subscribePositionOptions = [
  { value: 'bottom-left', label: '좌하단' },
  { value: 'bottom-center', label: '중앙 하단' },
  { value: 'bottom-right', label: '우하단' },
];

const transitionOptions = [
  { value: 'none', label: '없음' },
  { value: 'fade', label: '페이드' },
  { value: 'slide', label: '슬라이드' },
  { value: 'zoom', label: '줌' },
];

const subscribeStyleOptions = [
  { value: 'minimal', label: '미니멀' },
  { value: 'bounce', label: '바운스' },
  { value: 'slide', label: '슬라이드' },
  { value: 'glow', label: '글로우' },
];

const BrandingPresets: React.FC<BrandingPresetsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('logo');
  const [preset, setPreset] = useState<BrandingPreset>(defaultPreset);
  const [savedPresets, setSavedPresets] = useState<BrandingPreset[]>([defaultPreset]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'intro' | 'main' | 'outro'>('main');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'logo', label: '로고', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'watermark', label: '워터마크', icon: <Eye className="w-4 h-4" /> },
    { id: 'intro', label: '인트로', icon: <CornerUpLeft className="w-4 h-4" /> },
    { id: 'outro', label: '아웃트로', icon: <CornerDownRight className="w-4 h-4" /> },
    { id: 'subscribe', label: '구독 버튼', icon: <Bell className="w-4 h-4" /> },
    { id: 'colors', label: '컬러 팔레트', icon: <Palette className="w-4 h-4" /> },
  ];

  // 로고 업로드
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreset(prev => ({
          ...prev,
          logo: { ...prev.logo, url: e.target?.result as string },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 프리셋 저장
  const handleSavePreset = () => {
    const newPreset: BrandingPreset = {
      ...preset,
      id: `preset_${Date.now()}`,
      name: `프리셋 ${savedPresets.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    setSavedPresets(prev => [...prev, newPreset]);
  };

  // 프리셋 로드
  const handleLoadPreset = (presetId: string) => {
    const found = savedPresets.find(p => p.id === presetId);
    if (found) {
      setPreset(found);
    }
  };

  // 프리셋 삭제
  const handleDeletePreset = (presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
  };

  // 프리셋 내보내기
  const handleExportPreset = () => {
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branding_preset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 프리셋 가져오기
  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as BrandingPreset;
          setPreset(imported);
        } catch (error) {
          alert('잘못된 프리셋 파일입니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  // 미리보기 위치 스타일
  const getPositionStyle = (position: string) => {
    switch (position) {
      case 'top-left': return { top: 16, left: 16 };
      case 'top-right': return { top: 16, right: 16 };
      case 'bottom-left': return { bottom: 16, left: 16 };
      case 'bottom-right': return { bottom: 16, right: 16 };
      case 'bottom-center': return { bottom: 16, left: '50%', transform: 'translateX(-50%)' };
      default: return { top: 16, right: 16 };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎨 브랜딩 프리셋" size="xl">
      <div className="flex gap-4 h-[70vh]">
        {/* 좌측: 미리보기 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">미리보기</span>
            <div className="flex gap-1">
              {['intro', 'main', 'outro'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode as any)}
                  className={`px-3 py-1 text-xs rounded ${
                    previewMode === mode ? 'bg-primary text-white' : 'bg-card-hover hover:bg-card'
                  }`}
                >
                  {mode === 'intro' ? '인트로' : mode === 'main' ? '본편' : '아웃트로'}
                </button>
              ))}
            </div>
          </div>
          
          {/* 미리보기 캔버스 */}
          <div
            className="flex-1 relative rounded-lg overflow-hidden"
            style={{ backgroundColor: preset.colors.background }}
          >
            {/* 배경 그라데이션 */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.secondary})`,
              }}
            />

            {/* 인트로 */}
            {previewMode === 'intro' && preset.intro.enabled && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: preset.intro.backgroundColor }}
              >
                <div className="text-center">
                  {preset.logo.url && (
                    <img
                      src={preset.logo.url}
                      alt="Logo"
                      className="w-24 h-24 mx-auto mb-4 object-contain"
                    />
                  )}
                  <h2
                    className="text-3xl font-bold"
                    style={{ color: preset.colors.text }}
                  >
                    {preset.intro.text}
                  </h2>
                </div>
              </motion.div>
            )}

            {/* 아웃트로 */}
            {previewMode === 'outro' && preset.outro.enabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8"
                style={{ backgroundColor: preset.outro.backgroundColor }}
              >
                <h2
                  className="text-2xl font-bold mb-6 text-center"
                  style={{ color: preset.colors.text }}
                >
                  {preset.outro.text}
                </h2>
                
                {preset.outro.showSubscribe && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex items-center gap-3 px-6 py-3 rounded-full"
                    style={{ backgroundColor: '#ff0000' }}
                  >
                    <Youtube className="w-6 h-6 text-white" />
                    <span className="text-white font-bold">구독하기</span>
                  </motion.div>
                )}

                {preset.outro.showEndScreen && (
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="w-32 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-white/70">추천 영상</span>
                    </div>
                    <div className="w-32 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-white/70">최신 영상</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 본편 */}
            {previewMode === 'main' && (
              <>
                {/* 데모 콘텐츠 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-30">🎬</span>
                </div>

                {/* 로고 */}
                {preset.logo.url && (
                  <div
                    className="absolute"
                    style={{
                      ...getPositionStyle(preset.logo.position),
                      opacity: preset.logo.opacity,
                    }}
                  >
                    <img
                      src={preset.logo.url}
                      alt="Logo"
                      style={{
                        width: preset.logo.size,
                        height: 'auto',
                      }}
                      className="object-contain"
                    />
                  </div>
                )}

                {/* 워터마크 */}
                {preset.watermark.enabled && (
                  <div
                    className="absolute"
                    style={{
                      ...getPositionStyle(preset.watermark.position),
                      opacity: preset.watermark.opacity,
                      fontSize: preset.watermark.fontSize,
                      color: preset.colors.text,
                    }}
                  >
                    {preset.watermark.text}
                  </div>
                )}

                {/* 구독 버튼 */}
                {preset.subscribe.enabled && (
                  <motion.div
                    className="absolute"
                    style={getPositionStyle(preset.subscribe.position)}
                    animate={
                      preset.subscribe.style === 'bounce'
                        ? { y: [0, -5, 0] }
                        : preset.subscribe.style === 'glow'
                        ? { boxShadow: ['0 0 0 rgba(255,0,0,0)', '0 0 20px rgba(255,0,0,0.5)', '0 0 0 rgba(255,0,0,0)'] }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: '#ff0000' }}
                    >
                      <Bell className="w-4 h-4" />
                      구독
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* 저장된 프리셋 */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">저장된 프리셋</h4>
            <div className="flex gap-2 flex-wrap">
              {savedPresets.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer ${
                    preset.id === p.id ? 'bg-primary text-white' : 'bg-card-hover hover:bg-card'
                  }`}
                  onClick={() => handleLoadPreset(p.id)}
                >
                  <span className="text-sm">{p.name}</span>
                  {savedPresets.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(p.id);
                      }}
                      className="p-0.5 hover:bg-error/20 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSavePreset}
                icon={<Plus className="w-4 h-4" />}
              >
                저장
              </Button>
            </div>
          </div>
        </div>

        {/* 우측: 설정 */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 로고 설정 */}
            {activeTab === 'logo' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {preset.logo.url ? (
                    <div className="space-y-2">
                      <img
                        src={preset.logo.url}
                        alt="Logo preview"
                        className="w-20 h-20 mx-auto object-contain"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreset(prev => ({ ...prev, logo: { ...prev.logo, url: null } }))}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        삭제
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted" />
                      <p className="text-sm text-muted mb-2">채널 로고 업로드</p>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        icon={<Upload className="w-4 h-4" />}
                      >
                        파일 선택
                      </Button>
                    </>
                  )}
                </div>

                <Select
                  label="위치"
                  value={preset.logo.position}
                  onChange={(v) => setPreset(prev => ({ ...prev, logo: { ...prev.logo, position: v as any } }))}
                  options={positionOptions}
                />

                <Slider
                  label="크기"
                  value={preset.logo.size}
                  onChange={(v) => setPreset(prev => ({ ...prev, logo: { ...prev.logo, size: v } }))}
                  min={40}
                  max={200}
                  unit="px"
                />

                <Slider
                  label="투명도"
                  value={preset.logo.opacity * 100}
                  onChange={(v) => setPreset(prev => ({ ...prev, logo: { ...prev.logo, opacity: v / 100 } }))}
                  min={10}
                  max={100}
                  unit="%"
                />
              </div>
            )}

            {/* 워터마크 설정 */}
            {activeTab === 'watermark' && (
              <div className="space-y-4">
                <Toggle
                  label="워터마크 사용"
                  checked={preset.watermark.enabled}
                  onChange={(v) => setPreset(prev => ({ ...prev, watermark: { ...prev.watermark, enabled: v } }))}
                />

                {preset.watermark.enabled && (
                  <>
                    <Input
                      label="텍스트"
                      value={preset.watermark.text}
                      onChange={(e) => setPreset(prev => ({ ...prev, watermark: { ...prev.watermark, text: e.target.value } }))}
                      placeholder="@채널명"
                    />

                    <Select
                      label="위치"
                      value={preset.watermark.position}
                      onChange={(v) => setPreset(prev => ({ ...prev, watermark: { ...prev.watermark, position: v as any } }))}
                      options={positionOptions}
                    />

                    <Slider
                      label="글자 크기"
                      value={preset.watermark.fontSize}
                      onChange={(v) => setPreset(prev => ({ ...prev, watermark: { ...prev.watermark, fontSize: v } }))}
                      min={10}
                      max={24}
                      unit="px"
                    />

                    <Slider
                      label="투명도"
                      value={preset.watermark.opacity * 100}
                      onChange={(v) => setPreset(prev => ({ ...prev, watermark: { ...prev.watermark, opacity: v / 100 } }))}
                      min={10}
                      max={100}
                      unit="%"
                    />
                  </>
                )}
              </div>
            )}

            {/* 인트로 설정 */}
            {activeTab === 'intro' && (
              <div className="space-y-4">
                <Toggle
                  label="인트로 사용"
                  checked={preset.intro.enabled}
                  onChange={(v) => setPreset(prev => ({ ...prev, intro: { ...prev.intro, enabled: v } }))}
                />

                {preset.intro.enabled && (
                  <>
                    <Input
                      label="인트로 텍스트"
                      value={preset.intro.text}
                      onChange={(e) => setPreset(prev => ({ ...prev, intro: { ...prev.intro, text: e.target.value } }))}
                      placeholder="채널명"
                    />

                    <Select
                      label="전환 효과"
                      value={preset.intro.type}
                      onChange={(v) => setPreset(prev => ({ ...prev, intro: { ...prev.intro, type: v as any } }))}
                      options={transitionOptions}
                    />

                    <Slider
                      label="길이"
                      value={preset.intro.duration}
                      onChange={(v) => setPreset(prev => ({ ...prev, intro: { ...prev.intro, duration: v } }))}
                      min={1}
                      max={10}
                      unit="초"
                    />

                    <div>
                      <label className="text-sm text-muted">배경색</label>
                      <input
                        type="color"
                        value={preset.intro.backgroundColor}
                        onChange={(e) => setPreset(prev => ({ ...prev, intro: { ...prev.intro, backgroundColor: e.target.value } }))}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 아웃트로 설정 */}
            {activeTab === 'outro' && (
              <div className="space-y-4">
                <Toggle
                  label="아웃트로 사용"
                  checked={preset.outro.enabled}
                  onChange={(v) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, enabled: v } }))}
                />

                {preset.outro.enabled && (
                  <>
                    <Input
                      label="마무리 텍스트"
                      value={preset.outro.text}
                      onChange={(e) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, text: e.target.value } }))}
                      placeholder="시청해주셔서 감사합니다!"
                    />

                    <Select
                      label="전환 효과"
                      value={preset.outro.type}
                      onChange={(v) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, type: v as any } }))}
                      options={transitionOptions}
                    />

                    <Slider
                      label="길이"
                      value={preset.outro.duration}
                      onChange={(v) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, duration: v } }))}
                      min={3}
                      max={15}
                      unit="초"
                    />

                    <Toggle
                      label="구독 버튼 표시"
                      checked={preset.outro.showSubscribe}
                      onChange={(v) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, showSubscribe: v } }))}
                    />

                    <Toggle
                      label="엔드스크린 표시"
                      checked={preset.outro.showEndScreen}
                      onChange={(v) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, showEndScreen: v } }))}
                    />

                    <div>
                      <label className="text-sm text-muted">배경색</label>
                      <input
                        type="color"
                        value={preset.outro.backgroundColor}
                        onChange={(e) => setPreset(prev => ({ ...prev, outro: { ...prev.outro, backgroundColor: e.target.value } }))}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 구독 버튼 설정 */}
            {activeTab === 'subscribe' && (
              <div className="space-y-4">
                <Toggle
                  label="구독 버튼 애니메이션"
                  checked={preset.subscribe.enabled}
                  onChange={(v) => setPreset(prev => ({ ...prev, subscribe: { ...prev.subscribe, enabled: v } }))}
                />

                {preset.subscribe.enabled && (
                  <>
                    <Select
                      label="스타일"
                      value={preset.subscribe.style}
                      onChange={(v) => setPreset(prev => ({ ...prev, subscribe: { ...prev.subscribe, style: v as any } }))}
                      options={subscribeStyleOptions}
                    />

                    <Select
                      label="위치"
                      value={preset.subscribe.position}
                      onChange={(v) => setPreset(prev => ({ ...prev, subscribe: { ...prev.subscribe, position: v as any } }))}
                      options={subscribePositionOptions}
                    />

                    <Slider
                      label="표시 시점"
                      value={preset.subscribe.showAt}
                      onChange={(v) => setPreset(prev => ({ ...prev, subscribe: { ...prev.subscribe, showAt: v } }))}
                      min={0}
                      max={120}
                      unit="초"
                    />

                    <p className="text-xs text-muted">
                      💡 팁: 영상 중간 또는 중요한 내용 후에 구독 버튼을 보여주면 효과적입니다.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 컬러 팔레트 */}
            {activeTab === 'colors' && (
              <div className="space-y-4">
                <p className="text-sm text-muted mb-2">
                  채널의 브랜드 색상을 설정하세요. 인트로, 아웃트로 등에 적용됩니다.
                </p>

                {Object.entries(preset.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setPreset(prev => ({
                        ...prev,
                        colors: { ...prev.colors, [key]: e.target.value },
                      }))}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm capitalize">
                        {key === 'primary' ? '메인 컬러' :
                         key === 'secondary' ? '보조 컬러' :
                         key === 'accent' ? '강조 컬러' :
                         key === 'text' ? '텍스트' :
                         '배경'}
                      </span>
                      <span className="text-xs text-muted ml-2">{value}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-2">추천 컬러 조합</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: '프로페셔널', colors: { primary: '#2563eb', secondary: '#3b82f6', accent: '#f59e0b', text: '#ffffff', background: '#1e293b' }},
                      { name: '게이밍', colors: { primary: '#8b5cf6', secondary: '#a855f7', accent: '#22d3ee', text: '#ffffff', background: '#0f0f1a' }},
                      { name: '뷰티', colors: { primary: '#ec4899', secondary: '#f472b6', accent: '#fbbf24', text: '#ffffff', background: '#1f1f2e' }},
                    ].map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => setPreset(prev => ({ ...prev, colors: theme.colors }))}
                        className="p-2 rounded-lg bg-card-hover hover:bg-card transition-colors"
                      >
                        <div className="flex gap-1 mb-1">
                          {Object.values(theme.colors).slice(0, 3).map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 액션 */}
          <div className="p-4 border-t border-border flex justify-between">
            <div className="flex gap-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImportPreset}
                className="hidden"
                id="import-preset"
              />
              <label htmlFor="import-preset">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<FolderOpen className="w-4 h-4" />}
                  onClick={() => document.getElementById('import-preset')?.click()}
                >
                  가져오기
                </Button>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPreset}
                icon={<Download className="w-4 h-4" />}
              >
                내보내기
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleSavePreset();
                  onClose();
                }}
                icon={<Check className="w-4 h-4" />}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BrandingPresets;
