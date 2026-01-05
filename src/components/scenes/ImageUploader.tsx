'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { validateImageFile, extractSceneNumber } from '@/lib/api/imageGeneration';

interface UploadedImage {
  file: File;
  preview: string;
  sceneNumber: number | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface ImageUploaderProps {
  onUpload: (images: Array<{ imageUrl: string; sceneNumber: number | null }>) => void;
  onClose: () => void;
  totalScenes: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  onClose,
  totalScenes,
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
          status: 'error',
          error: validation.error,
        });
        continue;
      }

      const preview = URL.createObjectURL(file);
      const sceneNumber = extractSceneNumber(file.name);

      newImages.push({
        file,
        preview,
        sceneNumber,
        status: 'pending',
      });
    }

    // 씬 번호로 정렬
    newImages.sort((a, b) => {
      if (a.sceneNumber === null) return 1;
      if (b.sceneNumber === null) return -1;
      return a.sceneNumber - b.sceneNumber;
    });

    setImages((prev) => [...prev, ...newImages]);
  }, []);

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

  const handleUpload = async () => {
    setIsUploading(true);
    const results: Array<{ imageUrl: string; sceneNumber: number | null }> = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.status === 'error') continue;

      setImages((prev) => {
        const newImages = [...prev];
        newImages[i] = { ...newImages[i], status: 'uploading' };
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
          sceneNumber: data.sceneNumber,
        });

        setImages((prev) => {
          const newImages = [...prev];
          newImages[i] = { ...newImages[i], status: 'success' };
          return newImages;
        });
      } catch (error) {
        setImages((prev) => {
          const newImages = [...prev];
          newImages[i] = { 
            ...newImages[i], 
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

  return (
    <div className="space-y-4">
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
          <p className="text-xs text-muted mt-2">
            파일명에 숫자가 있으면 자동으로 씬 번호를 매칭합니다 (예: 1.png, scene_2.jpg)
          </p>
        </div>
      </div>

      {/* 업로드된 이미지 목록 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              업로드할 이미지 ({images.length}개)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImages([])}
            >
              전체 삭제
            </Button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            <AnimatePresence>
              {images.map((image, index) => (
                <motion.div
                  key={`${image.file.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 p-2 bg-card-hover rounded-lg"
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
                    </p>
                  </div>

                  {/* 씬 번호 선택 */}
                  <select
                    value={image.sceneNumber ?? ''}
                    onChange={(e) => updateSceneNumber(
                      index, 
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )}
                    className="w-20 bg-card border border-border rounded px-2 py-1 text-sm"
                    disabled={image.status !== 'pending'}
                  >
                    <option value="">자동</option>
                    {Array.from({ length: totalScenes }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        씬 {i + 1}
                      </option>
                    ))}
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
