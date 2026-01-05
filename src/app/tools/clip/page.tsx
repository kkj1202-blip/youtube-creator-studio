'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Select, Slider, Toggle, Modal, Tabs } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileVideo,
  Scissors,
  Play,
  Pause,
  Download,
  Wand2,
  Trash2,
  Plus,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  TrendingUp,
  Zap,
  Star,
  BarChart3,
  Film,
} from 'lucide-react';
import type { VideoClip, AspectRatio } from '@/types';

// 하이라이트 감지 기준
const highlightCriteria = [
  { id: 'engagement', label: '참여도 높은 구간', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'emotion', label: '감정적 하이라이트', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'action', label: '액션/변화 구간', icon: <Zap className="w-4 h-4" /> },
  { id: 'speech', label: '중요 발언', icon: <Star className="w-4 h-4" /> },
];

export default function ClipPage() {
  // 상태 관리
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  
  // 설정
  const [targetAspectRatio, setTargetAspectRatio] = useState<AspectRatio>('9:16');
  const [clipDuration, setClipDuration] = useState({ min: 15, max: 60 });
  const [maxClips, setMaxClips] = useState(5);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(['engagement', 'emotion']);
  
  // UI 상태
  const [activeTab, setActiveTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewClip, setPreviewClip] = useState<VideoClip | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'upload', label: '영상 업로드', icon: <Upload className="w-4 h-4" /> },
    { id: 'clips', label: '클립 추출', icon: <Scissors className="w-4 h-4" /> },
    { id: 'export', label: '내보내기', icon: <Download className="w-4 h-4" /> },
  ];

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.');
      return;
    }

    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setError(null);
    setClips([]);
  }, []);

  // 영상 메타데이터 로드
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration * 1000); // ms
    }
  }, []);

  // 하이라이트 자동 추출
  const handleExtractClips = async () => {
    if (!videoFile) {
      setError('먼저 영상을 업로드하세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // 분석 시뮬레이션
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProcessingProgress(i);
      }

      // 데모 클립 데이터 생성
      const totalDuration = videoDuration || 300000; // 기본 5분
      const demoClips: VideoClip[] = [
        {
          id: 'clip_1',
          start: 15000,
          end: 45000,
          duration: 30000,
          score: 95,
          reason: '🔥 높은 참여도 예상 - 핵심 내용 구간',
          transcript: '이 부분이 가장 중요한 핵심 포인트입니다. 꼭 기억하세요!',
        },
        {
          id: 'clip_2',
          start: 78000,
          end: 120000,
          duration: 42000,
          score: 88,
          reason: '😮 감정적 하이라이트 - 놀라운 반전',
          transcript: '여기서 예상치 못한 결과가 나왔는데요, 정말 놀랍지 않나요?',
        },
        {
          id: 'clip_3',
          start: 145000,
          end: 185000,
          duration: 40000,
          score: 82,
          reason: '⚡ 액션/변화 - 실시간 시연',
          transcript: '지금부터 직접 보여드릴게요. 이렇게 하면 됩니다.',
        },
        {
          id: 'clip_4',
          start: 210000,
          end: 250000,
          duration: 40000,
          score: 78,
          reason: '💡 중요 발언 - 꿀팁 공유',
          transcript: '제가 알려드리는 이 꿀팁, 다른 데서는 못 들으실 거예요.',
        },
        {
          id: 'clip_5',
          start: 275000,
          end: 295000,
          duration: 20000,
          score: 72,
          reason: '🎯 마무리 - 핵심 요약',
          transcript: '오늘 내용을 정리하자면, 이 세 가지가 가장 중요합니다.',
        },
      ].slice(0, maxClips);

      setClips(demoClips);
      setActiveTab('clips');
    } catch (err) {
      setError('클립 추출 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 시간 포맷팅
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 클립 삭제
  const handleDeleteClip = (id: string) => {
    setClips(prev => prev.filter(clip => clip.id !== id));
  };

  // 클립 수동 추가
  const handleAddClip = () => {
    const newClip: VideoClip = {
      id: `clip_manual_${Date.now()}`,
      start: currentTime,
      end: Math.min(currentTime + 30000, videoDuration),
      duration: 30000,
      score: 50,
      reason: '🎬 수동 추가',
    };
    setClips([...clips, newClip]);
  };

  // 클립 시간 업데이트
  const handleUpdateClip = (id: string, updates: Partial<VideoClip>) => {
    setClips(prev => prev.map(clip => 
      clip.id === id ? { ...clip, ...updates, duration: (updates.end || clip.end) - (updates.start || clip.start) } : clip
    ));
  };

  // 클립 미리보기
  const handlePreviewClip = (clip: VideoClip) => {
    setPreviewClip(clip);
    if (videoRef.current) {
      videoRef.current.currentTime = clip.start / 1000;
      videoRef.current.play();
    }
  };

  // 클립 다운로드 (실제로는 서버 처리 필요)
  const handleDownloadClip = async (clip: VideoClip) => {
    // 데모: 알림만 표시
    alert(`클립 다운로드 준비 중...\n\n시작: ${formatTime(clip.start)}\n종료: ${formatTime(clip.end)}\n길이: ${formatTime(clip.duration)}\n\n실제 구현 시 FFmpeg를 사용하여 클립을 추출합니다.`);
  };

  // 전체 다운로드
  const handleDownloadAll = async () => {
    alert(`${clips.length}개의 클립을 일괄 다운로드합니다.\n\n실제 구현 시 ZIP 파일로 제공됩니다.`);
  };

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-muted';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-success/20';
    if (score >= 75) return 'bg-primary/20';
    if (score >= 60) return 'bg-warning/20';
    return 'bg-muted/20';
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            ✂️ 롱폼 → 쇼츠 변환기
          </h1>
          <p className="text-muted">
            긴 영상에서 바이럴 가능성이 높은 하이라이트를 자동으로 추출합니다
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
                    롱폼 영상 업로드
                  </h3>
                  
                  <div
                    className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary/50 transition-colors cursor-pointer min-h-[200px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    
                    {videoFile ? (
                      <div className="text-center">
                        <FileVideo className="w-16 h-16 text-primary mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-2">{videoFile.name}</p>
                        <p className="text-sm text-muted mb-1">
                          {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {videoDuration > 0 && (
                          <p className="text-sm text-muted">
                            길이: {formatTime(videoDuration)}
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVideoFile(null);
                            setVideoUrl(null);
                            setClips([]);
                            setVideoDuration(0);
                          }}
                        >
                          다른 파일 선택
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Film className="w-16 h-16 text-muted mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-2">
                          롱폼 영상을 드래그하거나 클릭하세요
                        </p>
                        <p className="text-sm text-muted">
                          MP4, MOV, AVI 지원 (최대 2GB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 비디오 프리뷰 */}
                  {videoUrl && (
                    <div className="mt-4">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        onLoadedMetadata={handleVideoLoaded}
                        onTimeUpdate={() => setCurrentTime((videoRef.current?.currentTime || 0) * 1000)}
                        className="w-full rounded-lg max-h-[200px]"
                      />
                    </div>
                  )}

                  {/* 추출 버튼 */}
                  <Button
                    variant="primary"
                    className="w-full mt-4"
                    onClick={handleExtractClips}
                    disabled={!videoFile || isProcessing}
                    isLoading={isProcessing}
                    icon={<Wand2 className="w-4 h-4" />}
                  >
                    {isProcessing ? `분석 중... ${processingProgress}%` : '하이라이트 자동 추출'}
                  </Button>
                </Card>

                {/* 설정 */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    추출 설정
                  </h3>

                  <div className="space-y-4">
                    <Select
                      label="출력 비율"
                      options={[
                        { value: '9:16', label: '9:16 (쇼츠/릴스/틱톡)' },
                        { value: '16:9', label: '16:9 (유튜브)' },
                      ]}
                      value={targetAspectRatio}
                      onChange={(v) => setTargetAspectRatio(v as AspectRatio)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="최소 길이 (초)"
                        type="number"
                        value={clipDuration.min}
                        onChange={(e) => setClipDuration({ ...clipDuration, min: parseInt(e.target.value) || 15 })}
                        min={5}
                        max={300}
                      />
                      <Input
                        label="최대 길이 (초)"
                        type="number"
                        value={clipDuration.max}
                        onChange={(e) => setClipDuration({ ...clipDuration, max: parseInt(e.target.value) || 60 })}
                        min={15}
                        max={300}
                      />
                    </div>

                    <Slider
                      label="최대 클립 수"
                      value={maxClips}
                      onChange={setMaxClips}
                      min={1}
                      max={20}
                      step={1}
                      unit="개"
                    />

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        감지 기준
                      </label>
                      <div className="space-y-2">
                        {highlightCriteria.map((criterion) => (
                          <label
                            key={criterion.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCriteria.includes(criterion.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCriteria([...selectedCriteria, criterion.id]);
                                } else {
                                  setSelectedCriteria(selectedCriteria.filter(c => c !== criterion.id));
                                }
                              }}
                              className="rounded border-border"
                            />
                            {criterion.icon}
                            <span className="text-sm">{criterion.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="text-sm font-medium text-foreground mb-2">💡 팁</h4>
                      <ul className="text-xs text-muted space-y-1">
                        <li>• 15-60초 길이가 쇼츠에 최적입니다</li>
                        <li>• 감정적 반응이 있는 구간이 바이럴 가능성이 높습니다</li>
                        <li>• 수동으로 클립을 추가/수정할 수 있습니다</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Clips Tab */}
            {activeTab === 'clips' && (
              <motion.div
                key="clips"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* 클립 목록 */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Scissors className="w-5 h-5 text-primary" />
                      추출된 클립 ({clips.length}개)
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddClip}
                      disabled={!videoUrl}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      수동 추가
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {clips.length === 0 ? (
                      <div className="text-center py-12 text-muted">
                        <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>추출된 클립이 없습니다</p>
                        <p className="text-sm">영상을 업로드하고 하이라이트를 추출하세요</p>
                      </div>
                    ) : (
                      clips
                        .sort((a, b) => b.score - a.score)
                        .map((clip, index) => (
                          <motion.div
                            key={clip.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-lg border ${
                              selectedClipId === clip.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card-hover'
                            } cursor-pointer hover:border-primary/50 transition-colors`}
                            onClick={() => setSelectedClipId(clip.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`text-lg font-bold ${getScoreColor(clip.score)}`}>
                                    #{index + 1}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBg(clip.score)} ${getScoreColor(clip.score)}`}>
                                    점수: {clip.score}
                                  </span>
                                  <span className="text-xs text-muted flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(clip.start)} - {formatTime(clip.end)}
                                  </span>
                                  <span className="text-xs text-muted">
                                    ({formatTime(clip.duration)})
                                  </span>
                                </div>
                                
                                <p className="text-sm text-foreground mb-2">{clip.reason}</p>
                                
                                {clip.transcript && (
                                  <p className="text-xs text-muted italic">
                                    "{clip.transcript}"
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewClip(clip);
                                  }}
                                  icon={<Play className="w-4 h-4" />}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadClip(clip);
                                  }}
                                  icon={<Download className="w-4 h-4" />}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClip(clip.id);
                                  }}
                                  icon={<Trash2 className="w-4 h-4 text-error" />}
                                />
                              </div>
                            </div>

                            {/* 타임라인 바 */}
                            <div className="mt-3 h-2 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  marginLeft: `${(clip.start / videoDuration) * 100}%`,
                                  width: `${(clip.duration / videoDuration) * 100}%`,
                                }}
                              />
                            </div>
                          </motion.div>
                        ))
                    )}
                  </div>
                </Card>

                {/* 비디오 미리보기 */}
                <Card className="flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    미리보기
                  </h3>
                  
                  {videoUrl ? (
                    <div className="flex-1">
                      <div className={`relative ${targetAspectRatio === '9:16' ? 'aspect-[9/16] max-w-[200px] mx-auto' : 'aspect-video'} bg-black rounded-lg overflow-hidden`}>
                        <video
                          src={videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      {previewClip && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                          <p className="text-sm text-foreground">
                            현재 미리보기: 클립 #{clips.findIndex(c => c.id === previewClip.id) + 1}
                          </p>
                          <p className="text-xs text-muted">
                            {formatTime(previewClip.start)} - {formatTime(previewClip.end)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted">
                      <p>미디어를 먼저 업로드하세요</p>
                    </div>
                  )}

                  {/* 빠른 액션 */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setActiveTab('export')}
                      disabled={clips.length === 0}
                      icon={<Download className="w-4 h-4" />}
                    >
                      클립 내보내기
                    </Button>
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
                className="max-w-3xl mx-auto"
              >
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    클립 내보내기
                  </h3>

                  {clips.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                      <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>내보낼 클립이 없습니다</p>
                      <p className="text-sm">먼저 하이라이트를 추출하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 요약 */}
                      <div className="p-4 bg-success/10 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                          <span className="text-foreground font-medium">
                            {clips.length}개의 클립이 준비되었습니다
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-foreground">{clips.length}</p>
                            <p className="text-xs text-muted">총 클립</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {formatTime(clips.reduce((sum, c) => sum + c.duration, 0))}
                            </p>
                            <p className="text-xs text-muted">총 길이</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {Math.round(clips.reduce((sum, c) => sum + c.score, 0) / clips.length)}
                            </p>
                            <p className="text-xs text-muted">평균 점수</p>
                          </div>
                        </div>
                      </div>

                      {/* 클립 목록 */}
                      <div className="space-y-2">
                        {clips.map((clip, index) => (
                          <div
                            key={clip.id}
                            className="flex items-center justify-between p-3 bg-card-hover rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`font-bold ${getScoreColor(clip.score)}`}>
                                #{index + 1}
                              </span>
                              <span className="text-sm text-foreground">
                                {formatTime(clip.start)} - {formatTime(clip.end)}
                              </span>
                              <span className="text-xs text-muted">
                                ({formatTime(clip.duration)})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadClip(clip)}
                              icon={<Download className="w-4 h-4" />}
                            >
                              다운로드
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* 일괄 다운로드 */}
                      <div className="pt-4 border-t border-border">
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={handleDownloadAll}
                          icon={<Download className="w-4 h-4" />}
                        >
                          전체 클립 다운로드 (ZIP)
                        </Button>
                        <p className="text-xs text-muted text-center mt-2">
                          모든 클립이 {targetAspectRatio} 비율로 변환되어 다운로드됩니다
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
