'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  Zap,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { validateImageFile } from '@/lib/api/imageGeneration';

interface UploadedImage {
  file: File;
  preview: string;
  sceneNumber: number | null;
  extractedNumber: number | null;  // 파일명에서 추출한 숫자 (정렬용)
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface ImageUploaderProps {
  onUpload: (images: Array<{ imageUrl: string; sceneNumber: number | null }>) => void;
  onClose: () => void;
  totalScenes: number;
  existingSceneImages?: Map<number, boolean>;  // 이미 이미지가 있는 씬 번호
}

/**
 * 파일명에서 숫자 추출 (정렬 및 매칭용)
 * 예: 1.png → 1, scene_02.jpg → 2, img003.png → 3, my_image.jpg → null
 */
function extractNumberFromFilename(filename: string): number | null {
  // 확장자 제거
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // 패턴 1: 파일명이 숫자로 시작 (1.png, 001.jpg)
  const startMatch = nameWithoutExt.match(/^(\d+)/);
  if (startMatch) {
    return parseInt(startMatch[1], 10);
  }
  
  // 패턴 2: 파일명이 숫자로 끝남 (scene1.png, img_02.jpg)
  const endMatch = nameWithoutExt.match(/(\d+)$/);
  if (endMatch) {
    return parseInt(endMatch[1], 10);
  }
  
  // 패턴 3: 구분자 뒤의 숫자 (scene_1.png, 씬-02.jpg)
  const separatorMatch = nameWithoutExt.match(/[_\-\s](\d+)/);
  if (separatorMatch) {
    return parseInt(separatorMatch[1], 10);
  }
  
  // 패턴 4: 파일명 내 어떤 숫자라도 찾기
  const anyNumberMatch = nameWithoutExt.match(/(\d+)/);
  if (anyNumberMatch) {
    return parseInt(anyNumberMatch[1], 10);
  }
  
  return null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  onClose,
  totalScenes,
  existingSceneImages = new Map(),
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoMatchMode, setAutoMatchMode] = useState<'number' | 'order'>('number');

  // 이미지가 없는 씬 번호 목록 (오름차순)
  const availableSceneNumbers = useMemo(() => {
    const available: number[] = [];
    for (let i = 1; i <= totalScenes; i++) {
      if (!existingSceneImages.get(i)) {
        available.push(i);
      }
    }
    return available;
  }, [totalScenes, existingSceneImages]);

  // 이미지 자동 매칭 실행
  // 핵심: 파일명 번호가 낮은 순으로 정렬 후, 빈 씬 번호가 낮은 순으로 매칭
  const autoMatchImages = useCallback((imagesToMatch: UploadedImage[]) => {
    // 파일명에서 추출한 숫자 기준으로 정렬 (낮은 숫자 우선)
    const sortedImages = [...imagesToMatch].sort((a, b) => {
      // 숫자가 있는 것 우선
      if (a.extractedNumber === null && b.extractedNumber === null) return 0;
      if (a.extractedNumber === null) return 1;
      if (b.extractedNumber === null) return -1;
      return a.extractedNumber - b.extractedNumber;
    });

    // 이미 수동으로 설정된 씬 번호 수집
    const usedSceneNumbers = new Set<number>();
    sortedImages.forEach(img => {
      if (img.sceneNumber !== null) {
        usedSceneNumbers.add(img.sceneNumber);
      }
    });

    // 매칭 방식에 따라 처리
    if (autoMatchMode === 'number') {
      // === 파일명 번호순 매칭 ===
      // 파일명 숫자가 낮은 이미지부터 빈 씬 번호가 낮은 곳에 순서대로 할당
      // 예: 1.png, 3.png, 5.png → 빈 씬 2, 4, 6 순으로 매칭
      let availableIndex = 0;
      
      const matchedImages = sortedImages.map(img => {
        // 이미 씬 번호가 수동으로 설정된 경우 유지
        if (img.sceneNumber !== null) {
          return img;
        }

        // 다음 사용 가능한 빈 씬 찾기 (낮은 번호부터)
        while (availableIndex < availableSceneNumbers.length) {
          const nextAvailable = availableSceneNumbers[availableIndex];
          availableIndex++;
          if (!usedSceneNumbers.has(nextAvailable)) {
            usedSceneNumbers.add(nextAvailable);
            return { ...img, sceneNumber: nextAvailable };
          }
        }

        // 할당 가능한 씬이 없으면 null 유지
        return img;
      });

      return matchedImages;
    } else {
      // === 업로드 순서대로 매칭 ===
      // 원래 업로드 순서를 유지하면서 빈 씬에 순서대로 할당
      let availableIndex = 0;
      
      const matchedImages = imagesToMatch.map(img => {
        if (img.sceneNumber !== null) {
          return img;
        }

        while (availableIndex < availableSceneNumbers.length) {
          const nextAvailable = availableSceneNumbers[availableIndex];
          availableIndex++;
          if (!usedSceneNumbers.has(nextAvailable)) {
            usedSceneNumbers.add(nextAvailable);
            return { ...img, sceneNumber: nextAvailable };
          }
        }

        return img;
      });

      return matchedImages;
    }
  }, [autoMatchMode, availableSceneNumbers]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newImages: UploadedImage[] = [];

    for (const file of fileArray) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        newImages.push({
          file,
          preview: '',
          sceneNumber: null,
          extractedNumber: null,
          status: 'error',
          error: validation.error,
        });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const extractedNumber = extractNumberFromFilename(file.name);

      newImages.push({
        file,
        preview,
        sceneNumber: null,
        extractedNumber,
        status: 'pending',
      });
    }

    // 기존 이미지와 합치고 자동 매칭 실행
    setImages(prev => {
      const combined = [...prev, ...newImages];
      return autoMatchImages(combined);
    });
  }, [autoMatchImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  const updateSceneNumber = useCallback((index: number, sceneNumber: number | null) => {
    setImages((prev) => {
      const newImages = [...prev];
      newImages[index] = { ...newImages[index], sceneNumber };
      return newImages;
    });
  }, []);

  // 전체 재매칭 실행
  const handleReMatch = useCallback(() => {
    setImages(prev => {
      // 모든 씬 번호 초기화 후 재매칭
      const resetImages = prev.map(img => ({ ...img, sceneNumber: null }));
      return autoMatchImages(resetImages);
    });
  }, [autoMatchImages]);

  // 숫자순 정렬 토글
  const handleSortByNumber = useCallback(() => {
    setImages(prev => {
      return [...prev].sort((a, b) => {
        if (a.extractedNumber === null && b.extractedNumber === null) return 0;
        if (a.extractedNumber === null) return 1;
        if (b.extractedNumber === null) return -1;
        return a.extractedNumber - b.extractedNumber;
      });
    });
  }, []);

  const handleUpload = async () => {
    setIsUploading(true);
    const results: Array<{ imageUrl: string; sceneNumber: number | null }> = [];

    // 씬 번호순으로 정렬하여 업로드
    const sortedImages = [...images].sort((a, b) => {
      if (a.sceneNumber === null && b.sceneNumber === null) return 0;
      if (a.sceneNumber === null) return 1;
      if (b.sceneNumber === null) return -1;
      return a.sceneNumber - b.sceneNumber;
    });

    for (let i = 0; i < sortedImages.length; i++) {
      const image = sortedImages[i];
      const originalIndex = images.findIndex(img => img.file === image.file);
      if (image.status === 'error') continue;

      setImages((prev) => {
        const newImages = [...prev];
        newImages[originalIndex] = { ...newImages[originalIndex], status: 'uploading' };
        return newImages;
      });

      try {
        const formData = new FormData();
        formData.append('file', image.file);
        if (image.sceneNumber !== null) {
          formData.append('sceneNumber', String(image.sceneNumber));
        }

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const data = await response.json();
        results.push({
          imageUrl: data.imageUrl,
          sceneNumber: image.sceneNumber,
        });

        setImages((prev) => {
          const newImages = [...prev];
          newImages[originalIndex] = { ...newImages[originalIndex], status: 'success' };
          return newImages;
        });
      } catch (error) {
        setImages((prev) => {
          const newImages = [...prev];
          newImages[originalIndex] = { 
            ...newImages[originalIndex], 
            status: 'error',
            error: '업로드 중 오류가 발생했습니다.',
          };
          return newImages;
        });
      }
    }

    setIsUploading(false);
    
    if (results.length > 0) {
      onUpload(results);
    }
  };

  const pendingCount = images.filter((img) => img.status === 'pending').length;
  const successCount = images.filter((img) => img.status === 'success').length;
  const matchedCount = images.filter((img) => img.sceneNumber !== null && img.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* 설명 및 자동 매칭 옵션 */}
      <div className="bg-card-hover rounded-lg p-3">
        <div className="flex items-start gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">자동 씬 매칭</p>
            <p className="text-muted text-xs mt-1">
              {autoMatchMode === 'number' 
                ? '파일명 숫자가 낮은 이미지부터 빈 씬 번호가 낮은 곳에 순서대로 매칭됩니다.'
                : '업로드된 순서대로 빈 씬에 차례로 매칭됩니다.'
              }
              <br />
              <span className="text-primary">
                {autoMatchMode === 'number'
                  ? '예: 1.png, 5.png, 10.png → 빈 씬 1, 2, 3 순서로 할당'
                  : '예: 첫 번째 이미지 → 첫 번째 빈 씬'
                }
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setAutoMatchMode('number')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              autoMatchMode === 'number' 
                ? 'bg-primary text-white' 
                : 'bg-card text-muted hover:text-foreground'
            }`}
          >
            파일명 번호순 매칭
          </button>
          <button
            onClick={() => setAutoMatchMode('order')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              autoMatchMode === 'order' 
                ? 'bg-primary text-white' 
                : 'bg-card text-muted hover:text-foreground'
            }`}
          >
            업로드 순서대로 매칭
          </button>
        </div>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="pointer-events-none">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted'}`} />
          <p className="text-foreground font-medium mb-1">
            이미지를 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-muted">
            JPG, PNG, WebP, GIF (최대 10MB)
          </p>
          <p className="text-xs text-primary mt-2 font-medium">
            💡 파일명 숫자가 낮은 이미지부터 빈 씬에 순서대로 매칭됩니다
          </p>
        </div>
      </div>

      {/* 업로드된 이미지 목록 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              업로드할 이미지 ({images.length}개)
              {matchedCount > 0 && (
                <span className="ml-2 text-xs text-success">
                  {matchedCount}개 자동 매칭됨
                </span>
              )}
            </h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSortByNumber}
                title="파일 번호순 정렬"
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                정렬
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReMatch}
                title="전체 재매칭"
              >
                <Zap className="w-3 h-3 mr-1" />
                재매칭
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImages([])}
              >
                전체 삭제
              </Button>
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            <AnimatePresence>
              {images.map((image, index) => (
                <motion.div
                  key={`${image.file.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    image.sceneNumber !== null 
                      ? 'bg-success/10 border border-success/20' 
                      : 'bg-card-hover'
                  }`}
                >
                  {/* 이미지 미리보기 */}
                  <div className="w-16 h-10 rounded overflow-hidden bg-card flex-shrink-0">
                    {image.preview ? (
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted" />
                      </div>
                    )}
                  </div>

                  {/* 파일 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {image.file.name}
                    </p>
                    <p className="text-xs text-muted">
                      {(image.file.size / 1024).toFixed(1)} KB
                      {image.extractedNumber !== null && (
                        <span className="ml-2 text-primary">
                          추출: #{image.extractedNumber}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 씬 번호 선택 */}
                  <select
                    value={image.sceneNumber ?? ''}
                    onChange={(e) => updateSceneNumber(
                      index, 
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )}
                    className={`w-24 border rounded px-2 py-1 text-sm ${
                      image.sceneNumber !== null
                        ? 'bg-success/20 border-success/50 text-foreground'
                        : 'bg-card border-border'
                    }`}
                    disabled={image.status !== 'pending'}
                  >
                    <option value="">미지정</option>
                    {Array.from({ length: totalScenes }, (_, i) => {
                      const sceneNum = i + 1;
                      const isUsed = existingSceneImages.get(sceneNum);
                      const isAssigned = images.some(
                        (img, imgIdx) => imgIdx !== index && img.sceneNumber === sceneNum
                      );
                      return (
                        <option 
                          key={sceneNum} 
                          value={sceneNum}
                          disabled={isUsed || isAssigned}
                        >
                          씬 {sceneNum}{isUsed ? ' (있음)' : isAssigned ? ' (할당됨)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* 상태 아이콘 */}
                  <div className="flex-shrink-0">
                    {image.status === 'pending' && (
                      <button
                        onClick={() => removeImage(index)}
                        className="p-1 hover:bg-card rounded text-muted hover:text-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {image.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    )}
                    {image.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                    {image.status === 'error' && (
                      <div className="tooltip" data-tooltip={image.error}>
                        <AlertCircle className="w-4 h-4 text-error" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 매칭 안내 */}
          {pendingCount > 0 && matchedCount < pendingCount && (
            <p className="text-xs text-warning">
              ⚠️ {pendingCount - matchedCount}개 이미지가 씬에 매칭되지 않았습니다. 
              수동으로 씬 번호를 선택하거나, &apos;재매칭&apos; 버튼을 눌러주세요.
            </p>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleUpload}
          disabled={pendingCount === 0 || isUploading}
          isLoading={isUploading}
        >
          {isUploading 
            ? `업로드 중... (${successCount}/${images.length})`
            : `${pendingCount}개 이미지 업로드`
          }
        </Button>
      </div>
    </div>
  );
};

export default ImageUploader;
