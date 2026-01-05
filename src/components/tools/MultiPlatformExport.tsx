'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Youtube,
  Instagram,
  Film,
  Smartphone,
  Monitor,
  Square,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Image,
} from 'lucide-react';
import { Button, Card, Modal, Toggle, Select, Slider } from '@/components/ui';
import { useStore } from '@/store/useStore';

interface MultiPlatformExportProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  maxDuration: number; // 초
  description: string;
  color: string;
  features: string[];
}

interface ExportJob {
  platformId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  outputUrl?: string;
  error?: string;
}

const platforms: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube (16:9)',
    icon: <Youtube className="w-5 h-5" />,
    aspectRatio: '16:9',
    dimensions: { width: 1920, height: 1080 },
    maxDuration: 43200, // 12시간
    description: '표준 유튜브 영상',
    color: '#ff0000',
    features: ['HD 1080p', '풀 길이 지원', '최적화된 인코딩'],
  },
  {
    id: 'youtube-4k',
    name: 'YouTube 4K (16:9)',
    icon: <Youtube className="w-5 h-5" />,
    aspectRatio: '16:9',
    dimensions: { width: 3840, height: 2160 },
    maxDuration: 43200,
    description: '4K 고화질 유튜브 영상',
    color: '#ff0000',
    features: ['4K Ultra HD', '고품질 출력', 'HDR 지원'],
  },
  {
    id: 'shorts',
    name: 'YouTube Shorts (9:16)',
    icon: <Smartphone className="w-5 h-5" />,
    aspectRatio: '9:16',
    dimensions: { width: 1080, height: 1920 },
    maxDuration: 60,
    description: '쇼츠/릴스/틱톡용 세로 영상',
    color: '#ff0000',
    features: ['60초 제한', '세로 영상', '모바일 최적화'],
  },
  {
    id: 'tiktok',
    name: 'TikTok (9:16)',
    icon: <Film className="w-5 h-5" />,
    aspectRatio: '9:16',
    dimensions: { width: 1080, height: 1920 },
    maxDuration: 180,
    description: '틱톡용 세로 영상 (3분)',
    color: '#69c9d0',
    features: ['3분 지원', '워터마크 없음', '고품질'],
  },
  {
    id: 'reels',
    name: 'Instagram Reels (9:16)',
    icon: <Instagram className="w-5 h-5" />,
    aspectRatio: '9:16',
    dimensions: { width: 1080, height: 1920 },
    maxDuration: 90,
    description: '인스타그램 릴스용 (90초)',
    color: '#e4405f',
    features: ['90초 지원', '인스타 최적화', '세로 영상'],
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed (1:1)',
    icon: <Square className="w-5 h-5" />,
    aspectRatio: '1:1',
    dimensions: { width: 1080, height: 1080 },
    maxDuration: 60,
    description: '인스타그램 피드용 정사각형',
    color: '#e4405f',
    features: ['정사각형', '피드 최적화', '60초 제한'],
  },
  {
    id: 'instagram-45',
    name: 'Instagram Feed (4:5)',
    icon: <Instagram className="w-5 h-5" />,
    aspectRatio: '4:5',
    dimensions: { width: 1080, height: 1350 },
    maxDuration: 60,
    description: '인스타그램 피드용 세로형',
    color: '#e4405f',
    features: ['4:5 비율', '세로 피드 최적화', '60초 제한'],
  },
];

const qualityOptions = [
  { value: 'low', label: '빠른 (720p)', bitrate: 2500 },
  { value: 'medium', label: '표준 (1080p)', bitrate: 5000 },
  { value: 'high', label: '고품질 (1080p+)', bitrate: 8000 },
  { value: 'ultra', label: '최고 품질 (4K)', bitrate: 15000 },
];

const MultiPlatformExport: React.FC<MultiPlatformExportProps> = ({ isOpen, onClose }) => {
  const { currentProject } = useStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube']);
  const [quality, setQuality] = useState('medium');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fps, setFps] = useState(30);
  const [audioBitrate, setAudioBitrate] = useState(192);

  // 플랫폼 선택 토글
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  // 내보내기 시작
  const handleExport = async () => {
    if (selectedPlatforms.length === 0) return;

    setIsExporting(true);
    
    // 초기 job 생성
    const initialJobs: ExportJob[] = selectedPlatforms.map(platformId => ({
      platformId,
      status: 'pending',
      progress: 0,
    }));
    setExportJobs(initialJobs);

    // 각 플랫폼별로 순차적 처리 (시뮬레이션)
    for (let i = 0; i < selectedPlatforms.length; i++) {
      const platformId = selectedPlatforms[i];
      
      // processing 상태로 변경
      setExportJobs(prev => prev.map(job => 
        job.platformId === platformId 
          ? { ...job, status: 'processing' }
          : job
      ));

      // 진행률 시뮬레이션
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setExportJobs(prev => prev.map(job => 
          job.platformId === platformId 
            ? { ...job, progress }
            : job
        ));
      }

      // 완료
      setExportJobs(prev => prev.map(job => 
        job.platformId === platformId 
          ? { ...job, status: 'completed', outputUrl: `/exports/${platformId}_${Date.now()}.mp4` }
          : job
      ));
    }

    setIsExporting(false);
  };

  // 다운로드
  const handleDownload = (job: ExportJob) => {
    // 실제로는 outputUrl로 다운로드
    alert(`${job.platformId} 영상 다운로드 시작\n\n현재는 데모 버전입니다.`);
  };

  // 전체 다운로드 (ZIP)
  const handleDownloadAll = () => {
    const completed = exportJobs.filter(j => j.status === 'completed');
    alert(`${completed.length}개 파일을 ZIP으로 다운로드합니다.\n\n현재는 데모 버전입니다.`);
  };

  // 플랫폼 정보 가져오기
  const getPlatform = (id: string) => platforms.find(p => p.id === id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📤 다중 플랫폼 내보내기" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 플랫폼 선택 */}
        <div>
          <h3 className="text-sm font-medium mb-3">내보낼 플랫폼 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                disabled={isExporting}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div style={{ color: platform.color }}>
                    {platform.icon}
                  </div>
                  <span className="font-medium text-sm">{platform.name}</span>
                  {selectedPlatforms.includes(platform.id) && (
                    <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted mb-2">{platform.description}</p>
                <div className="flex flex-wrap gap-1">
                  {platform.features.map((feature, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-card-hover rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted">
                  {platform.dimensions.width} × {platform.dimensions.height}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 품질 설정 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">출력 설정</h3>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary flex items-center gap-1"
            >
              고급 설정
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="영상 품질"
              value={quality}
              onChange={setQuality}
              options={qualityOptions.map(q => ({ value: q.value, label: q.label }))}
            />
            <div>
              <label className="text-sm text-muted block mb-1">
                예상 출력 크기
              </label>
              <div className="p-2 bg-card-hover rounded text-sm">
                {selectedPlatforms.length > 0 
                  ? `약 ${(selectedPlatforms.length * 50 * (qualityOptions.find(q => q.value === quality)?.bitrate || 5000) / 5000).toFixed(0)}MB`
                  : '-'
                }
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  <Slider
                    label="프레임레이트 (FPS)"
                    value={fps}
                    onChange={setFps}
                    min={24}
                    max={60}
                    step={6}
                    unit="fps"
                  />
                  <Slider
                    label="오디오 비트레이트"
                    value={audioBitrate}
                    onChange={setAudioBitrate}
                    min={128}
                    max={320}
                    step={64}
                    unit="kbps"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 내보내기 진행 상태 */}
        {exportJobs.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">내보내기 진행 상태</h3>
            <div className="space-y-3">
              {exportJobs.map((job) => {
                const platform = getPlatform(job.platformId);
                return (
                  <div
                    key={job.platformId}
                    className="flex items-center gap-4 p-3 bg-card-hover rounded-lg"
                  >
                    <div style={{ color: platform?.color }}>
                      {platform?.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{platform?.name}</span>
                        <span className="text-xs text-muted">
                          {job.status === 'pending' && '대기 중'}
                          {job.status === 'processing' && `${job.progress}%`}
                          {job.status === 'completed' && '완료'}
                          {job.status === 'error' && '오류'}
                        </span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            job.status === 'completed' ? 'bg-success' :
                            job.status === 'error' ? 'bg-error' :
                            'bg-primary'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      {job.status === 'pending' && (
                        <div className="w-8 h-8 flex items-center justify-center text-muted">
                          <Loader2 className="w-4 h-4 opacity-30" />
                        </div>
                      )}
                      {job.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {job.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(job)}
                          icon={<Download className="w-4 h-4" />}
                        />
                      )}
                      {job.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-error" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 전체 완료 시 */}
            {exportJobs.every(j => j.status === 'completed') && (
              <div className="mt-4 pt-4 border-t border-border flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleDownloadAll}
                  icon={<Download className="w-4 h-4" />}
                >
                  전체 다운로드 (ZIP)
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* 미리보기 정보 */}
        {selectedPlatforms.length > 0 && !isExporting && exportJobs.length === 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              내보내기 미리보기
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {selectedPlatforms.slice(0, 3).map((id) => {
                const platform = getPlatform(id);
                return (
                  <div key={id} className="p-3 bg-card-hover rounded-lg">
                    <div
                      className="mx-auto mb-2 bg-background rounded flex items-center justify-center overflow-hidden"
                      style={{
                        width: platform?.aspectRatio === '16:9' ? 120 : platform?.aspectRatio === '9:16' ? 45 : platform?.aspectRatio === '4:5' ? 60 : 80,
                        height: platform?.aspectRatio === '16:9' ? 67.5 : platform?.aspectRatio === '9:16' ? 80 : platform?.aspectRatio === '4:5' ? 75 : 80,
                      }}
                    >
                      {currentProject?.scenes?.[0]?.imageUrl ? (
                        <img
                          src={currentProject.scenes[0].imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-6 h-6 text-muted" />
                      )}
                    </div>
                    <span className="text-xs text-muted">{platform?.aspectRatio}</span>
                  </div>
                );
              })}
              {selectedPlatforms.length > 3 && (
                <div className="p-3 bg-card-hover rounded-lg flex items-center justify-center">
                  <span className="text-sm text-muted">+{selectedPlatforms.length - 3}개 더</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted">
            {selectedPlatforms.length}개 플랫폼 선택됨
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={selectedPlatforms.length === 0 || isExporting}
              isLoading={isExporting}
              icon={<Download className="w-4 h-4" />}
            >
              {isExporting ? '내보내는 중...' : '내보내기 시작'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MultiPlatformExport;
