'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Slider, Toggle, TextArea, Modal, Tabs } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileAudio,
  FileVideo,
  Play,
  Pause,
  Download,
  Wand2,
  Type,
  Palette,
  Settings2,
  Trash2,
  Plus,
  Edit3,
  Copy,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { SubtitleSegment, SubtitleWord, SubtitleStyle, AspectRatio, SubtitleFormat } from '@/types';

// 기본 자막 스타일
const defaultSubtitleStyle: SubtitleStyle = {
  fontFamily: 'Noto Sans KR',
  fontSize: 24,
  fontColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  position: 'bottom',
  bold: true,
  italic: false,
  outline: true,
  outlineColor: '#000000',
};

// 쇼츠용 스타일 프리셋
const stylePresets = {
  classic: {
    name: '클래식',
    style: { ...defaultSubtitleStyle },
  },
  shorts: {
    name: '쇼츠 (강조)',
    style: {
      ...defaultSubtitleStyle,
      fontSize: 32,
      position: 'center' as const,
      bold: true,
      backgroundColor: '#ff0000',
      backgroundOpacity: 0.9,
    },
  },
  minimal: {
    name: '미니멀',
    style: {
      ...defaultSubtitleStyle,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      outline: true,
      outlineColor: '#000000',
    },
  },
  neon: {
    name: '네온',
    style: {
      ...defaultSubtitleStyle,
      fontColor: '#00ff88',
      backgroundColor: '#1a1a2e',
      backgroundOpacity: 0.8,
      outline: true,
      outlineColor: '#ff00ff',
    },
  },
};

// 폰트 옵션
const fontOptions = [
  { value: 'Noto Sans KR', label: 'Noto Sans KR (기본)' },
  { value: 'Pretendard', label: 'Pretendard' },
  { value: 'Spoqa Han Sans Neo', label: '스포카 한 산스' },
  { value: 'IBM Plex Sans KR', label: 'IBM Plex Sans KR' },
  { value: 'Gmarket Sans', label: '지마켓 산스' },
  { value: 'Black Han Sans', label: '블랙 한 산스' },
];

// 위치 옵션
const positionOptions = [
  { value: 'top', label: '상단' },
  { value: 'center', label: '중앙' },
  { value: 'bottom', label: '하단' },
];

export default function SubtitlePage() {
  // 상태 관리
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [style, setStyle] = useState<SubtitleStyle>(defaultSubtitleStyle);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [highlightWords, setHighlightWords] = useState<string[]>(['중요', '핵심', '꿀팁', '주의']);
  const [autoEmoji, setAutoEmoji] = useState(true);
  
  // 파일 상태
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
  
  // UI 상태
  const [activeTab, setActiveTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SubtitleSegment | null>(null);
  
  // Refs
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'upload', label: '업로드', icon: <Upload className="w-4 h-4" /> },
    { id: 'edit', label: '자막 편집', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'style', label: '스타일', icon: <Palette className="w-4 h-4" /> },
    { id: 'export', label: '내보내기', icon: <Download className="w-4 h-4" /> },
  ];

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      setError('지원하지 않는 파일 형식입니다. 영상 또는 오디오 파일을 업로드하세요.');
      return;
    }

    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'audio');
    setMediaUrl(URL.createObjectURL(file));
    setError(null);
    setSegments([]);
  }, []);

  // 자막 자동 생성 (Whisper API 시뮬레이션)
  const handleGenerateSubtitles = async () => {
    if (!mediaFile) {
      setError('먼저 파일을 업로드하세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // 프로그레스 시뮬레이션
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProcessingProgress(i);
      }

      // 데모 자막 데이터 생성
      const demoSegments: SubtitleSegment[] = [
        {
          id: '1',
          text: '안녕하세요, 오늘은 중요한 꿀팁을 알려드릴게요.',
          start: 0,
          end: 3500,
          words: [
            { text: '안녕하세요,', start: 0, end: 800, confidence: 0.98 },
            { text: '오늘은', start: 850, end: 1200, confidence: 0.95 },
            { text: '중요한', start: 1250, end: 1800, confidence: 0.97, isHighlight: true },
            { text: '꿀팁을', start: 1850, end: 2500, confidence: 0.96, isHighlight: true, emoji: '🍯' },
            { text: '알려드릴게요.', start: 2550, end: 3500, confidence: 0.94 },
          ],
        },
        {
          id: '2',
          text: '먼저 주의해야 할 점이 있어요.',
          start: 4000,
          end: 6500,
          words: [
            { text: '먼저', start: 4000, end: 4500, confidence: 0.96 },
            { text: '주의해야', start: 4550, end: 5300, confidence: 0.97, isHighlight: true, emoji: '⚠️' },
            { text: '할', start: 5350, end: 5600, confidence: 0.98 },
            { text: '점이', start: 5650, end: 6000, confidence: 0.95 },
            { text: '있어요.', start: 6050, end: 6500, confidence: 0.94 },
          ],
        },
        {
          id: '3',
          text: '이 핵심 내용을 꼭 기억하세요!',
          start: 7000,
          end: 9500,
          words: [
            { text: '이', start: 7000, end: 7200, confidence: 0.99 },
            { text: '핵심', start: 7250, end: 7800, confidence: 0.97, isHighlight: true, emoji: '⭐' },
            { text: '내용을', start: 7850, end: 8400, confidence: 0.96 },
            { text: '꼭', start: 8450, end: 8700, confidence: 0.98 },
            { text: '기억하세요!', start: 8750, end: 9500, confidence: 0.95 },
          ],
        },
        {
          id: '4',
          text: '구독과 좋아요 부탁드려요!',
          start: 10000,
          end: 12000,
          words: [
            { text: '구독과', start: 10000, end: 10600, confidence: 0.97, emoji: '🔔' },
            { text: '좋아요', start: 10650, end: 11200, confidence: 0.96, emoji: '👍' },
            { text: '부탁드려요!', start: 11250, end: 12000, confidence: 0.95 },
          ],
        },
      ];

      setSegments(demoSegments);
      setActiveTab('edit');
    } catch (err) {
      setError('자막 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 시간 포맷팅
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // SRT 포맷 변환
  const toSRT = (segments: SubtitleSegment[]): string => {
    return segments.map((seg, i) => {
      const startTime = formatSRTTime(seg.start);
      const endTime = formatSRTTime(seg.end);
      return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    }).join('\n');
  };

  const formatSRTTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  // VTT 포맷 변환
  const toVTT = (segments: SubtitleSegment[]): string => {
    const header = 'WEBVTT\n\n';
    const content = segments.map((seg, i) => {
      const startTime = formatVTTTime(seg.start);
      const endTime = formatVTTTime(seg.end);
      return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    }).join('\n');
    return header + content;
  };

  const formatVTTTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // 내보내기
  const handleExport = (format: SubtitleFormat) => {
    let content = '';
    let filename = `subtitles_${Date.now()}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'srt':
        content = toSRT(segments);
        filename += '.srt';
        break;
      case 'vtt':
        content = toVTT(segments);
        filename += '.vtt';
        mimeType = 'text/vtt';
        break;
      case 'json':
        content = JSON.stringify({ segments, style }, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 세그먼트 수정
  const handleUpdateSegment = (id: string, updates: Partial<SubtitleSegment>) => {
    setSegments(prev => prev.map(seg => 
      seg.id === id ? { ...seg, ...updates } : seg
    ));
  };

  // 세그먼트 삭제
  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  // 세그먼트 추가
  const handleAddSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newStart = lastSegment ? lastSegment.end + 500 : 0;
    const newSegment: SubtitleSegment = {
      id: `seg_${Date.now()}`,
      text: '새 자막을 입력하세요',
      start: newStart,
      end: newStart + 3000,
      words: [],
    };
    setSegments([...segments, newSegment]);
    setEditingSegment(newSegment);
  };

  // 스타일 프리셋 적용
  const applyPreset = (presetKey: keyof typeof stylePresets) => {
    setStyle(stylePresets[presetKey].style);
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            🎬 자막 자동 생성기
          </h1>
          <p className="text-muted">
            영상/오디오에서 자막을 자동으로 생성하고 스타일을 편집하세요
          </p>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 mb-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* 파일 업로드 */}
                <Card className="flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    파일 업로드
                  </h3>
                  
                  <div
                    className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    
                    {mediaFile ? (
                      <div className="text-center">
                        {mediaType === 'video' ? (
                          <FileVideo className="w-16 h-16 text-primary mx-auto mb-4" />
                        ) : (
                          <FileAudio className="w-16 h-16 text-primary mx-auto mb-4" />
                        )}
                        <p className="text-foreground font-medium mb-2">{mediaFile.name}</p>
                        <p className="text-sm text-muted">
                          {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMediaFile(null);
                            setMediaUrl(null);
                            setMediaType(null);
                            setSegments([]);
                          }}
                        >
                          다른 파일 선택
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-2">
                          영상 또는 오디오 파일을 드래그하거나 클릭하세요
                        </p>
                        <p className="text-sm text-muted">
                          MP4, MOV, MP3, WAV 지원 (최대 500MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 미디어 프리뷰 */}
                  {mediaUrl && (
                    <div className="mt-4">
                      {mediaType === 'video' ? (
                        <video
                          ref={mediaRef as React.RefObject<HTMLVideoElement>}
                          src={mediaUrl}
                          controls
                          className="w-full rounded-lg max-h-[200px]"
                        />
                      ) : (
                        <audio
                          ref={mediaRef as React.RefObject<HTMLAudioElement>}
                          src={mediaUrl}
                          controls
                          className="w-full"
                        />
                      )}
                    </div>
                  )}

                  {/* 자막 생성 버튼 */}
                  <Button
                    variant="primary"
                    className="w-full mt-4"
                    onClick={handleGenerateSubtitles}
                    disabled={!mediaFile || isProcessing}
                    isLoading={isProcessing}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    {isProcessing ? `자막 생성 중... ${processingProgress}%` : '자막 자동 생성'}
                  </Button>
                </Card>

                {/* 설정 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-primary" />
                    생성 설정
                  </h3>

                  <div className="space-y-4">
                    <Select
                      label="화면 비율"
                      options={[
                        { value: '16:9', label: '16:9 (롱폼)' },
                        { value: '9:16', label: '9:16 (쇼츠)' },
                      ]}
                      value={aspectRatio}
                      onChange={(v) => setAspectRatio(v as AspectRatio)}
                    />

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        강조 단어 (쉼표로 구분)
                      </label>
                      <Input
                        value={highlightWords.join(', ')}
                        onChange={(e) => setHighlightWords(
                          e.target.value.split(',').map(w => w.trim()).filter(w => w)
                        )}
                        placeholder="중요, 핵심, 꿀팁, 주의"
                      />
                      <p className="text-xs text-muted mt-1">
                        이 단어들은 자막에서 자동으로 강조됩니다
                      </p>
                    </div>

                    <Toggle
                      label="이모지 자동 삽입"
                      checked={autoEmoji}
                      onChange={setAutoEmoji}
                    />

                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="text-sm font-medium text-foreground mb-2">💡 팁</h4>
                      <ul className="text-xs text-muted space-y-1">
                        <li>• 명확한 음성일수록 정확도가 높아집니다</li>
                        <li>• 배경 소음이 적을수록 좋습니다</li>
                        <li>• 한국어 음성을 자동 인식합니다</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Edit Tab */}
            {activeTab === 'edit' && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* 자막 목록 */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Type className="w-5 h-5 text-primary" />
                      자막 편집 ({segments.length}개)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        disabled={segments.length === 0}
                        icon={<Eye className="w-4 h-4" />}
                      >
                        미리보기
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddSegment}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        추가
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {segments.length === 0 ? (
                      <div className="text-center py-12 text-muted">
                        <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>자막이 없습니다</p>
                        <p className="text-sm">파일을 업로드하고 자막을 생성하세요</p>
                      </div>
                    ) : (
                      segments.map((segment, index) => (
                        <motion.div
                          key={segment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 rounded-lg border ${
                            selectedSegmentId === segment.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card-hover'
                          } cursor-pointer hover:border-primary/50 transition-colors`}
                          onClick={() => setSelectedSegmentId(segment.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-muted bg-background px-2 py-1 rounded">
                                  #{index + 1}
                                </span>
                                <span className="text-xs text-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(segment.start)} - {formatTime(segment.end)}
                                </span>
                              </div>
                              <p className="text-foreground">
                                {segment.words.map((word, wi) => (
                                  <span
                                    key={wi}
                                    className={`${word.isHighlight ? 'text-primary font-bold' : ''}`}
                                  >
                                    {word.emoji && <span className="mr-1">{word.emoji}</span>}
                                    {word.text}{' '}
                                  </span>
                                ))}
                                {segment.words.length === 0 && segment.text}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSegment(segment);
                                }}
                                icon={<Edit3 className="w-4 h-4" />}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSegment(segment.id);
                                }}
                                icon={<Trash2 className="w-4 h-4 text-error" />}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </Card>

                {/* 타임라인 / 미디어 */}
                <Card className="flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    미디어
                  </h3>
                  
                  {mediaUrl ? (
                    <div className="flex-1">
                      {mediaType === 'video' ? (
                        <video
                          src={mediaUrl}
                          controls
                          className="w-full rounded-lg"
                        />
                      ) : (
                        <audio src={mediaUrl} controls className="w-full" />
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted">
                      <p>미디어를 먼저 업로드하세요</p>
                    </div>
                  )}

                  {/* 퀵 액션 */}
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('style')}
                      icon={<Palette className="w-4 h-4" />}
                    >
                      스타일 편집
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setActiveTab('export')}
                      disabled={segments.length === 0}
                      icon={<Download className="w-4 h-4" />}
                    >
                      내보내기
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Style Tab */}
            {activeTab === 'style' && (
              <motion.div
                key="style"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* 스타일 설정 */}
                <Card className="overflow-y-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    자막 스타일
                  </h3>

                  {/* 프리셋 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      스타일 프리셋
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(stylePresets).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key as keyof typeof stylePresets)}
                          className="p-3 rounded-lg border border-border hover:border-primary text-left transition-colors"
                        >
                          <span className="text-sm font-medium">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Select
                      label="폰트"
                      options={fontOptions}
                      value={style.fontFamily}
                      onChange={(v) => setStyle({ ...style, fontFamily: v })}
                    />

                    <Slider
                      label="글자 크기"
                      value={style.fontSize}
                      onChange={(v) => setStyle({ ...style, fontSize: v })}
                      min={12}
                      max={72}
                      step={2}
                      unit="px"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          글자 색상
                        </label>
                        <input
                          type="color"
                          value={style.fontColor}
                          onChange={(e) => setStyle({ ...style, fontColor: e.target.value })}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          배경 색상
                        </label>
                        <input
                          type="color"
                          value={style.backgroundColor}
                          onChange={(e) => setStyle({ ...style, backgroundColor: e.target.value })}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <Slider
                      label="배경 투명도"
                      value={style.backgroundOpacity}
                      onChange={(v) => setStyle({ ...style, backgroundOpacity: v })}
                      min={0}
                      max={1}
                      step={0.1}
                    />

                    <Select
                      label="위치"
                      options={positionOptions}
                      value={style.position}
                      onChange={(v) => setStyle({ ...style, position: v as 'top' | 'center' | 'bottom' })}
                    />

                    <div className="flex gap-4">
                      <Toggle
                        label="굵게"
                        checked={style.bold}
                        onChange={(v) => setStyle({ ...style, bold: v })}
                      />
                      <Toggle
                        label="기울임"
                        checked={style.italic}
                        onChange={(v) => setStyle({ ...style, italic: v })}
                      />
                      <Toggle
                        label="외곽선"
                        checked={style.outline}
                        onChange={(v) => setStyle({ ...style, outline: v })}
                      />
                    </div>

                    {style.outline && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          외곽선 색상
                        </label>
                        <input
                          type="color"
                          value={style.outlineColor}
                          onChange={(e) => setStyle({ ...style, outlineColor: e.target.value })}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </Card>

                {/* 미리보기 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    미리보기
                  </h3>
                  
                  <div
                    className={`relative rounded-lg overflow-hidden bg-gray-900 ${
                      aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px] mx-auto' : 'aspect-video'
                    }`}
                  >
                    {/* 배경 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />
                    
                    {/* 자막 */}
                    <div
                      className={`absolute left-4 right-4 ${
                        style.position === 'top' ? 'top-4' :
                        style.position === 'center' ? 'top-1/2 -translate-y-1/2' :
                        'bottom-4'
                      }`}
                    >
                      <div
                        className="px-4 py-2 rounded-lg inline-block"
                        style={{
                          fontFamily: style.fontFamily,
                          fontSize: `${style.fontSize}px`,
                          color: style.fontColor,
                          backgroundColor: `${style.backgroundColor}${Math.round(style.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                          fontWeight: style.bold ? 'bold' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal',
                          textShadow: style.outline ? `2px 2px 0 ${style.outlineColor}, -2px -2px 0 ${style.outlineColor}, 2px -2px 0 ${style.outlineColor}, -2px 2px 0 ${style.outlineColor}` : 'none',
                        }}
                      >
                        <span className="text-primary font-bold">중요한</span> 내용을 강조합니다 ⭐
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    자막 내보내기
                  </h3>

                  {segments.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                      <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>내보낼 자막이 없습니다</p>
                      <p className="text-sm">먼저 자막을 생성하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-success/10 rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="text-foreground">
                          {segments.length}개의 자막이 준비되었습니다
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => handleExport('srt')}
                          className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <h4 className="font-semibold text-foreground mb-1">SRT</h4>
                          <p className="text-xs text-muted">
                            가장 범용적인 자막 형식
                          </p>
                        </button>
                        <button
                          onClick={() => handleExport('vtt')}
                          className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <h4 className="font-semibold text-foreground mb-1">VTT</h4>
                          <p className="text-xs text-muted">
                            웹 표준 자막 형식
                          </p>
                        </button>
                        <button
                          onClick={() => handleExport('json')}
                          className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <h4 className="font-semibold text-foreground mb-1">JSON</h4>
                          <p className="text-xs text-muted">
                            스타일 포함 내보내기
                          </p>
                        </button>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          자막 미리보기 (SRT)
                        </h4>
                        <pre className="p-4 bg-card-hover rounded-lg text-xs text-muted overflow-x-auto max-h-[200px] overflow-y-auto">
                          {toSRT(segments.slice(0, 3))}
                          {segments.length > 3 && '\n... (더 많은 자막)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 자막 편집 모달 */}
        <Modal
          isOpen={!!editingSegment}
          onClose={() => setEditingSegment(null)}
          title="자막 편집"
          size="lg"
        >
          {editingSegment && (
            <div className="space-y-4">
              <TextArea
                label="자막 텍스트"
                value={editingSegment.text}
                onChange={(e) => setEditingSegment({ ...editingSegment, text: e.target.value })}
                rows={3}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="시작 시간 (ms)"
                  type="number"
                  value={editingSegment.start}
                  onChange={(e) => setEditingSegment({ 
                    ...editingSegment, 
                    start: parseInt(e.target.value) || 0 
                  })}
                />
                <Input
                  label="종료 시간 (ms)"
                  type="number"
                  value={editingSegment.end}
                  onChange={(e) => setEditingSegment({ 
                    ...editingSegment, 
                    end: parseInt(e.target.value) || 0 
                  })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditingSegment(null)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleUpdateSegment(editingSegment.id, editingSegment);
                    setEditingSegment(null);
                  }}
                >
                  저장
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
