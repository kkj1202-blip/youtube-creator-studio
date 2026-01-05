'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Slider, Toggle, Modal, Tabs, TextArea } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Type,
  Sparkles,
  Download,
  Copy,
  Trash2,
  Plus,
  Palette,
  Layers,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Wand2,
  Eye,
  Grid,
  Smile,
  Star,
  RefreshCw,
  Check,
  X,
  Loader2,
  Settings2,
  Layout,
  Square,
  Circle,
  Triangle,
  Hexagon,
} from 'lucide-react';

// 템플릿 타입
interface ThumbnailTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  layout: {
    textPositions: { x: number; y: number; align: string }[];
    imageAreas: { x: number; y: number; width: number; height: number }[];
    overlays: { type: string; color: string; opacity: number }[];
  };
}

// 텍스트 레이어 타입
interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
  backgroundColor: string;
  backgroundOpacity: number;
  rotation: number;
}

// 이미지 레이어 타입
interface ImageLayer {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  borderRadius: number;
  filter: string;
}

// 스티커/이모지 레이어
interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

// 데모 템플릿
const demoTemplates: ThumbnailTemplate[] = [
  { id: '1', name: '클릭 유도형', category: 'viral', preview: '🔥', layout: { textPositions: [{ x: 50, y: 30, align: 'center' }], imageAreas: [], overlays: [{ type: 'gradient', color: '#ff0000', opacity: 0.3 }] }},
  { id: '2', name: '리액션형', category: 'reaction', preview: '😱', layout: { textPositions: [{ x: 50, y: 80, align: 'center' }], imageAreas: [{ x: 60, y: 20, width: 35, height: 60 }], overlays: [] }},
  { id: '3', name: '비교형', category: 'comparison', preview: '⚔️', layout: { textPositions: [{ x: 50, y: 10, align: 'center' }], imageAreas: [{ x: 5, y: 30, width: 40, height: 60 }, { x: 55, y: 30, width: 40, height: 60 }], overlays: [] }},
  { id: '4', name: '미니멀형', category: 'minimal', preview: '✨', layout: { textPositions: [{ x: 50, y: 50, align: 'center' }], imageAreas: [], overlays: [{ type: 'solid', color: '#000000', opacity: 0.5 }] }},
  { id: '5', name: '숫자 강조형', category: 'number', preview: '🔢', layout: { textPositions: [{ x: 20, y: 50, align: 'left' }, { x: 70, y: 50, align: 'right' }], imageAreas: [], overlays: [] }},
  { id: '6', name: '질문형', category: 'question', preview: '❓', layout: { textPositions: [{ x: 50, y: 40, align: 'center' }], imageAreas: [], overlays: [{ type: 'gradient', color: '#0066ff', opacity: 0.4 }] }},
];

// 인기 이모지/스티커
const popularEmojis = ['🔥', '😱', '💰', '🎯', '⚡', '💡', '🚀', '❌', '✅', '⭐', '💎', '🏆', '👑', '💪', '🤯', '😍', '🤔', '😂', '👀', '🎬'];

// 폰트 옵션
const fontOptions = [
  { value: 'Black Han Sans', label: '블랙한산스 (임팩트)' },
  { value: 'Noto Sans KR', label: 'Noto Sans KR (기본)' },
  { value: 'Nanum Gothic', label: '나눔고딕' },
  { value: 'Jua', label: '주아 (귀여운)' },
  { value: 'Do Hyeon', label: '도현 (굵은)' },
  { value: 'Gaegu', label: '개구 (손글씨)' },
];

// 필터 옵션
const filterOptions = [
  { value: 'none', label: '없음' },
  { value: 'brightness(1.2)', label: '밝게' },
  { value: 'contrast(1.3)', label: '고대비' },
  { value: 'saturate(1.5)', label: '채도 높임' },
  { value: 'grayscale(1)', label: '흑백' },
  { value: 'sepia(0.5)', label: '세피아' },
  { value: 'blur(2px)', label: '블러' },
];

// 비율 옵션
const aspectRatioOptions = [
  { value: '16:9', label: '16:9 (YouTube)', width: 1280, height: 720 },
  { value: '1:1', label: '1:1 (Instagram)', width: 1080, height: 1080 },
  { value: '9:16', label: '9:16 (Shorts)', width: 1080, height: 1920 },
];

export default function ThumbnailPage() {
  // 캔버스 상태
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // 레이어 상태
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    {
      id: '1',
      text: '클릭을 부르는 제목',
      x: 50,
      y: 50,
      fontSize: 64,
      fontFamily: 'Black Han Sans',
      fontColor: '#ffffff',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 10,
      outline: true,
      outlineColor: '#ff0000',
      outlineWidth: 3,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      rotation: 0,
    }
  ]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([]);
  
  // UI 상태
  const [activeTab, setActiveTab] = useState('template');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('1');
  const [selectedLayerType, setSelectedLayerType] = useState<'text' | 'image' | 'sticker'>('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [abVariants, setAbVariants] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'template', label: '템플릿', icon: <Layout className="w-4 h-4" /> },
    { id: 'text', label: '텍스트', icon: <Type className="w-4 h-4" /> },
    { id: 'image', label: '이미지', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'sticker', label: '스티커', icon: <Smile className="w-4 h-4" /> },
    { id: 'ai', label: 'AI 생성', icon: <Sparkles className="w-4 h-4" /> },
  ];

  // 현재 선택된 텍스트 레이어
  const selectedTextLayer = textLayers.find(l => l.id === selectedLayerId);

  // 텍스트 레이어 추가
  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `text_${Date.now()}`,
      text: '새 텍스트',
      x: 50,
      y: 30 + textLayers.length * 15,
      fontSize: 48,
      fontFamily: 'Black Han Sans',
      fontColor: '#ffffff',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 8,
      outline: false,
      outlineColor: '#000000',
      outlineWidth: 2,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      rotation: 0,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setSelectedLayerType('text');
  };

  // 텍스트 레이어 업데이트
  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(layers => layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // 레이어 삭제
  const deleteLayer = (id: string, type: 'text' | 'image' | 'sticker') => {
    if (type === 'text') {
      setTextLayers(layers => layers.filter(l => l.id !== id));
    } else if (type === 'image') {
      setImageLayers(layers => layers.filter(l => l.id !== id));
    } else {
      setStickerLayers(layers => layers.filter(l => l.id !== id));
    }
    setSelectedLayerId(null);
  };

  // 스티커 추가
  const addSticker = (emoji: string) => {
    const newSticker: StickerLayer = {
      id: `sticker_${Date.now()}`,
      emoji,
      x: 80,
      y: 20,
      size: 64,
      rotation: 0,
    };
    setStickerLayers([...stickerLayers, newSticker]);
    setSelectedLayerId(newSticker.id);
    setSelectedLayerType('sticker');
  };

  // 배경 이미지 업로드
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 템플릿 적용
  const applyTemplate = (template: ThumbnailTemplate) => {
    // 템플릿 기반으로 레이어 재설정
    const newTextLayers: TextLayer[] = template.layout.textPositions.map((pos, i) => ({
      id: `text_${i}`,
      text: i === 0 ? '메인 제목을 입력하세요' : '서브 텍스트',
      x: pos.x,
      y: pos.y,
      fontSize: i === 0 ? 64 : 32,
      fontFamily: 'Black Han Sans',
      fontColor: '#ffffff',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: pos.align as 'left' | 'center' | 'right',
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 10,
      outline: i === 0,
      outlineColor: '#ff0000',
      outlineWidth: 3,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      rotation: 0,
    }));
    setTextLayers(newTextLayers);
    if (newTextLayers.length > 0) {
      setSelectedLayerId(newTextLayers[0].id);
    }
  };

  // AI 썸네일 생성
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    // AI API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 데모: 프롬프트 기반으로 텍스트 생성
    const suggestions = [
      `${aiPrompt} - 충격 반전!`,
      `이거 보면 ${aiPrompt} 달라집니다`,
      `${aiPrompt}? 진짜 됩니다`,
    ];
    
    setTextLayers([{
      ...textLayers[0],
      text: suggestions[Math.floor(Math.random() * suggestions.length)],
    }]);
    
    setIsGenerating(false);
  };

  // A/B 테스트 변형 생성
  const generateABVariants = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const variants = [
      '버전 A: 질문형 - "이것도 모르세요?"',
      '버전 B: 숫자형 - "단 3분만에 마스터"',
      '버전 C: 감정형 - "충격! 진짜 됩니다"',
      '버전 D: 비교형 - "전 vs 후 차이점"',
    ];
    
    setAbVariants(variants);
    setShowABTest(true);
    setIsGenerating(false);
  };

  // 다운로드
  const handleDownload = () => {
    // Canvas 렌더링 후 다운로드 (실제 구현 필요)
    alert('썸네일이 다운로드됩니다.\n\n현재는 데모 버전입니다.');
  };

  // 캔버스 크기
  const getCanvasSize = () => {
    const ratio = aspectRatioOptions.find(r => r.value === aspectRatio);
    return ratio || aspectRatioOptions[0];
  };

  const canvasSize = getCanvasSize();
  const previewScale = aspectRatio === '9:16' ? 0.25 : aspectRatio === '1:1' ? 0.4 : 0.5;

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                🎨 AI 썸네일 스튜디오
              </h1>
              <p className="text-sm text-muted">
                클릭을 부르는 썸네일을 쉽게 만드세요
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={aspectRatio}
                onChange={setAspectRatio}
                options={aspectRatioOptions.map(r => ({ value: r.value, label: r.label }))}
              />
              <Button
                variant="outline"
                onClick={generateABVariants}
                disabled={isGenerating}
                icon={<Grid className="w-4 h-4" />}
              >
                A/B 테스트
              </Button>
              <Button
                variant="primary"
                onClick={handleDownload}
                icon={<Download className="w-4 h-4" />}
              >
                다운로드
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 좌측: 캔버스 미리보기 */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex items-center justify-center bg-[#0a0a0f] overflow-hidden">
              {/* 썸네일 캔버스 */}
              <div
                className="relative border-2 border-border rounded-lg overflow-hidden"
                style={{
                  width: canvasSize.width * previewScale,
                  height: canvasSize.height * previewScale,
                  backgroundColor: backgroundColor,
                }}
              >
                {/* 배경 이미지 */}
                {backgroundImage && (
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* 텍스트 레이어들 */}
                {textLayers.map(layer => (
                  <div
                    key={layer.id}
                    className={`absolute cursor-move select-none ${
                      selectedLayerId === layer.id ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                      fontFamily: layer.fontFamily,
                      fontSize: layer.fontSize * previewScale,
                      fontWeight: layer.fontWeight,
                      fontStyle: layer.fontStyle,
                      color: layer.fontColor,
                      textAlign: layer.textAlign,
                      textShadow: layer.shadow 
                        ? `${layer.shadowBlur/2}px ${layer.shadowBlur/2}px ${layer.shadowBlur}px ${layer.shadowColor}`
                        : 'none',
                      WebkitTextStroke: layer.outline 
                        ? `${layer.outlineWidth}px ${layer.outlineColor}`
                        : 'none',
                      backgroundColor: layer.backgroundOpacity > 0 
                        ? `${layer.backgroundColor}${Math.round(layer.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                        : 'transparent',
                      padding: layer.backgroundOpacity > 0 ? '4px 12px' : '0',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setSelectedLayerType('text');
                    }}
                  >
                    {layer.text}
                  </div>
                ))}

                {/* 스티커 레이어들 */}
                {stickerLayers.map(sticker => (
                  <div
                    key={sticker.id}
                    className={`absolute cursor-move select-none ${
                      selectedLayerId === sticker.id ? 'ring-2 ring-primary rounded-full' : ''
                    }`}
                    style={{
                      left: `${sticker.x}%`,
                      top: `${sticker.y}%`,
                      transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                      fontSize: sticker.size * previewScale,
                    }}
                    onClick={() => {
                      setSelectedLayerId(sticker.id);
                      setSelectedLayerType('sticker');
                    }}
                  >
                    {sticker.emoji}
                  </div>
                ))}

                {/* 캔버스 크기 표시 */}
                <div className="absolute bottom-2 right-2 text-xs text-white/50 bg-black/50 px-2 py-1 rounded">
                  {canvasSize.width} x {canvasSize.height}
                </div>
              </div>
            </Card>

            {/* 레이어 목록 */}
            <Card className="mt-4 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">레이어</h3>
                <Button variant="ghost" size="sm" onClick={addTextLayer} icon={<Plus className="w-3 h-3" />}>
                  텍스트 추가
                </Button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {textLayers.map((layer, i) => (
                  <div
                    key={layer.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                      selectedLayerId === layer.id ? 'bg-primary/20' : 'hover:bg-card-hover'
                    }`}
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setSelectedLayerType('text');
                    }}
                  >
                    <Type className="w-3 h-3 text-muted" />
                    <span className="flex-1 text-sm truncate">{layer.text}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id, 'text');
                      }}
                      className="p-1 hover:bg-error/20 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-error" />
                    </button>
                  </div>
                ))}
                {stickerLayers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                      selectedLayerId === sticker.id ? 'bg-primary/20' : 'hover:bg-card-hover'
                    }`}
                    onClick={() => {
                      setSelectedLayerId(sticker.id);
                      setSelectedLayerType('sticker');
                    }}
                  >
                    <span>{sticker.emoji}</span>
                    <span className="flex-1 text-sm">스티커</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(sticker.id, 'sticker');
                      }}
                      className="p-1 hover:bg-error/20 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-error" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 우측: 속성 편집 패널 */}
          <Card className="w-80 flex flex-col overflow-hidden">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* 템플릿 탭 */}
              {activeTab === 'template' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">인기 템플릿</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {demoTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="aspect-video bg-card-hover rounded-lg flex flex-col items-center justify-center hover:bg-primary/20 transition-colors border border-border"
                        >
                          <span className="text-2xl mb-1">{template.preview}</span>
                          <span className="text-xs text-muted">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">배경</h4>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted">배경색</label>
                          <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted">배경 이미지</label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleBackgroundUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            icon={<Upload className="w-3 h-3" />}
                          >
                            업로드
                          </Button>
                        </div>
                      </div>
                      {backgroundImage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBackgroundImage(null)}
                          icon={<Trash2 className="w-3 h-3" />}
                        >
                          배경 제거
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 텍스트 탭 */}
              {activeTab === 'text' && selectedTextLayer && (
                <div className="space-y-4">
                  <TextArea
                    label="텍스트"
                    value={selectedTextLayer.text}
                    onChange={(e) => updateTextLayer(selectedTextLayer.id, { text: e.target.value })}
                    rows={2}
                  />

                  <Select
                    label="폰트"
                    value={selectedTextLayer.fontFamily}
                    onChange={(v) => updateTextLayer(selectedTextLayer.id, { fontFamily: v })}
                    options={fontOptions}
                  />

                  <Slider
                    label="크기"
                    value={selectedTextLayer.fontSize}
                    onChange={(v) => updateTextLayer(selectedTextLayer.id, { fontSize: v })}
                    min={12}
                    max={120}
                    unit="px"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted">글자색</label>
                      <input
                        type="color"
                        value={selectedTextLayer.fontColor}
                        onChange={(e) => updateTextLayer(selectedTextLayer.id, { fontColor: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">정렬</label>
                      <div className="flex border border-border rounded overflow-hidden">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            onClick={() => updateTextLayer(selectedTextLayer.id, { textAlign: align as 'left' | 'center' | 'right' })}
                            className={`flex-1 p-2 ${selectedTextLayer.textAlign === align ? 'bg-primary text-white' : 'hover:bg-card-hover'}`}
                          >
                            {align === 'left' && <AlignLeft className="w-3 h-3 mx-auto" />}
                            {align === 'center' && <AlignCenter className="w-3 h-3 mx-auto" />}
                            {align === 'right' && <AlignRight className="w-3 h-3 mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Toggle
                      label="굵게"
                      checked={selectedTextLayer.fontWeight === 'bold'}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { fontWeight: v ? 'bold' : 'normal' })}
                    />
                    <Toggle
                      label="기울임"
                      checked={selectedTextLayer.fontStyle === 'italic'}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { fontStyle: v ? 'italic' : 'normal' })}
                    />
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Toggle
                      label="그림자"
                      checked={selectedTextLayer.shadow}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { shadow: v })}
                    />
                    {selectedTextLayer.shadow && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted">그림자 색</label>
                          <input
                            type="color"
                            value={selectedTextLayer.shadowColor}
                            onChange={(e) => updateTextLayer(selectedTextLayer.id, { shadowColor: e.target.value })}
                            className="w-full h-6 rounded cursor-pointer"
                          />
                        </div>
                        <Slider
                          label="블러"
                          value={selectedTextLayer.shadowBlur}
                          onChange={(v) => updateTextLayer(selectedTextLayer.id, { shadowBlur: v })}
                          min={0}
                          max={30}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Toggle
                      label="외곽선"
                      checked={selectedTextLayer.outline}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { outline: v })}
                    />
                    {selectedTextLayer.outline && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted">외곽선 색</label>
                          <input
                            type="color"
                            value={selectedTextLayer.outlineColor}
                            onChange={(e) => updateTextLayer(selectedTextLayer.id, { outlineColor: e.target.value })}
                            className="w-full h-6 rounded cursor-pointer"
                          />
                        </div>
                        <Slider
                          label="두께"
                          value={selectedTextLayer.outlineWidth}
                          onChange={(v) => updateTextLayer(selectedTextLayer.id, { outlineWidth: v })}
                          min={1}
                          max={10}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Slider
                      label="위치 X"
                      value={selectedTextLayer.x}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { x: v })}
                      min={0}
                      max={100}
                      unit="%"
                    />
                    <Slider
                      label="위치 Y"
                      value={selectedTextLayer.y}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { y: v })}
                      min={0}
                      max={100}
                      unit="%"
                    />
                    <Slider
                      label="회전"
                      value={selectedTextLayer.rotation}
                      onChange={(v) => updateTextLayer(selectedTextLayer.id, { rotation: v })}
                      min={-45}
                      max={45}
                      unit="°"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'text' && !selectedTextLayer && (
                <div className="text-center py-8 text-muted">
                  <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>텍스트 레이어를 선택하거나</p>
                  <Button variant="ghost" size="sm" onClick={addTextLayer} className="mt-2">
                    새 텍스트 추가
                  </Button>
                </div>
              )}

              {/* 이미지 탭 */}
              {activeTab === 'image' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted" />
                    <p className="text-sm text-muted mb-2">이미지 업로드</p>
                    <Button variant="outline" size="sm">
                      파일 선택
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted">
                      💡 팁: 얼굴이 나온 사진은 클릭률을 높여줍니다.
                      감정 표현이 과장된 이미지가 효과적입니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 스티커 탭 */}
              {activeTab === 'sticker' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">인기 이모지</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {popularEmojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addSticker(emoji)}
                          className="text-2xl p-2 rounded hover:bg-card-hover transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted">
                      💡 팁: 🔥, ⚡, 💰 같은 이모지는 시선을 끕니다.
                      하지만 과하면 역효과!
                    </p>
                  </div>
                </div>
              )}

              {/* AI 생성 탭 */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <TextArea
                    label="영상 주제 설명"
                    placeholder="예: 주식 투자로 월 100만원 버는 방법"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || isGenerating}
                    isLoading={isGenerating}
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    AI 제목 생성
                  </Button>

                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-2">추천 스타일</h4>
                    <div className="space-y-2">
                      {[
                        { name: '충격형', example: '"이거 실화임?" 스타일' },
                        { name: '숫자형', example: '"단 3일만에..." 스타일' },
                        { name: '질문형', example: '"아직도 이렇게?" 스타일' },
                        { name: '비밀형', example: '"아무도 모르는..." 스타일' },
                      ].map(style => (
                        <button
                          key={style.name}
                          onClick={() => setAiPrompt(prev => `${prev} (${style.name} 스타일)`)}
                          className="w-full p-2 text-left rounded bg-card-hover hover:bg-primary/10 transition-colors"
                        >
                          <span className="text-sm font-medium">{style.name}</span>
                          <span className="text-xs text-muted block">{style.example}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* A/B 테스트 모달 */}
        <Modal
          isOpen={showABTest}
          onClose={() => setShowABTest(false)}
          title="🧪 A/B 테스트 변형"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              여러 버전을 만들어 어떤 썸네일이 더 효과적인지 테스트하세요.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {abVariants.map((variant, i) => (
                <div
                  key={i}
                  className="p-4 border border-border rounded-lg hover:border-primary cursor-pointer"
                >
                  <div className="aspect-video bg-card-hover rounded mb-2 flex items-center justify-center">
                    <span className="text-4xl">🖼️</span>
                  </div>
                  <p className="text-sm">{variant}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowABTest(false)}>
                닫기
              </Button>
              <Button variant="primary" icon={<Download className="w-4 h-4" />}>
                모두 다운로드
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
