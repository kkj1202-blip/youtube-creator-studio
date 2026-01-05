'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Wand2,
  Download,
  RefreshCw,
  Type,
  Palette,
  Layout,
  Sparkles,
} from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Button, Input, Select, Card, TextArea, Toggle } from '@/components/ui';

const styleOptions = [
  { value: 'youtube-standard', label: 'YouTube 표준 (얼굴 강조)' },
  { value: 'text-focus', label: '텍스트 중심' },
  { value: 'minimal', label: '미니멀' },
  { value: 'dramatic', label: '드라마틱' },
  { value: 'colorful', label: '컬러풀' },
];

const aspectOptions = [
  { value: '16:9', label: '16:9 (YouTube 표준)' },
  { value: '1:1', label: '1:1 (정사각형)' },
];

export default function ThumbnailPage() {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [style, setStyle] = useState('youtube-standard');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [includeText, setIncludeText] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!title && !keywords) return;
    
    setIsGenerating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Demo generated images
    const demoImages = [
      'https://via.placeholder.com/1280x720/8b5cf6/ffffff?text=Thumbnail+1',
      'https://via.placeholder.com/1280x720/3b82f6/ffffff?text=Thumbnail+2',
      'https://via.placeholder.com/1280x720/06b6d4/ffffff?text=Thumbnail+3',
      'https://via.placeholder.com/1280x720/10b981/ffffff?text=Thumbnail+4',
    ];
    
    setGeneratedImages(demoImages);
    setSelectedImage(demoImages[0]);
    setIsGenerating(false);
  };

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-primary" />
            AI 썸네일 생성기
          </h1>
          <p className="text-muted">
            클릭률 높은 YouTube 썸네일을 AI로 자동 생성합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Panel */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                콘텐츠 정보
              </h3>
              <div className="space-y-4">
                <Input
                  label="영상 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="썸네일에 들어갈 핵심 문구"
                />
                <Input
                  label="부제목 (선택)"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="추가 설명 문구"
                />
                <TextArea
                  label="키워드"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="관련 키워드를 입력하세요 (쉼표로 구분)"
                  rows={2}
                />
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                스타일 설정
              </h3>
              <div className="space-y-4">
                <Select
                  label="썸네일 스타일"
                  options={styleOptions}
                  value={style}
                  onChange={setStyle}
                />
                <Select
                  label="비율"
                  options={aspectOptions}
                  value={aspectRatio}
                  onChange={setAspectRatio}
                />
                <Toggle
                  label="텍스트 포함"
                  checked={includeText}
                  onChange={setIncludeText}
                />
              </div>
            </Card>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleGenerate}
              disabled={(!title && !keywords) || isGenerating}
              isLoading={isGenerating}
              icon={<Wand2 className="w-4 h-4" />}
            >
              {isGenerating ? '생성 중...' : '썸네일 생성하기'}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                미리보기
              </h3>
              
              {/* Main Preview */}
              <div className="aspect-video bg-card-hover rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Selected thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Sparkles className="w-12 h-12 text-muted mx-auto mb-2" />
                    <p className="text-muted">
                      썸네일을 생성해주세요
                    </p>
                  </div>
                )}
              </div>

              {/* Generated Options */}
              {generatedImages.length > 0 && (
                <>
                  <p className="text-sm text-muted mb-2">생성된 썸네일</p>
                  <div className="grid grid-cols-4 gap-2">
                    {generatedImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === img
                            ? 'border-primary'
                            : 'border-transparent hover:border-border'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Option ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Actions */}
            {selectedImage && (
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleGenerate}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  다시 생성
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    // TODO: Implement download
                    alert('다운로드 기능은 API 연동 후 사용 가능합니다.');
                  }}
                >
                  다운로드
                </Button>
              </div>
            )}

            {/* Tips */}
            <Card className="bg-primary/5 border-primary/20">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                클릭률 높이는 팁
              </h4>
              <ul className="text-sm text-muted space-y-1">
                <li>• 얼굴이 있는 썸네일이 더 높은 클릭률을 보입니다</li>
                <li>• 제목은 3~5단어로 간결하게</li>
                <li>• 밝고 대비가 강한 색상 사용</li>
                <li>• 호기심을 자극하는 표현 사용</li>
              </ul>
            </Card>
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
}
