'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Image as ImageIcon,
  Volume2,
  Video,
  Play,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import type { Scene } from '@/types';
import { Badge, Button } from '@/components/ui';

interface SceneCardProps {
  scene: Scene;
  isActive: boolean;
  aspectRatio: '16:9' | '9:16';
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGenerateImage: () => void;
  onGenerateAudio: () => void;
  onRender: () => void;
  onDownload: () => void;
}

const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  isActive,
  aspectRatio,
  onClick,
  onDelete,
  onDuplicate,
  onGenerateImage,
  onGenerateAudio,
  onRender,
  onDownload,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusBadge = () => {
    if (scene.error) {
      return <Badge variant="error">오류</Badge>;
    }
    if (scene.isProcessing) {
      return <Badge variant="warning">처리 중</Badge>;
    }
    if (scene.rendered) {
      return <Badge variant="success">완료</Badge>;
    }
    if (scene.audioGenerated && scene.imageUrl) {
      return <Badge variant="primary">렌더링 대기</Badge>;
    }
    return <Badge variant="default">준비중</Badge>;
  };

  const aspectRatioClass = aspectRatio === '9:16' 
    ? 'aspect-[9/16] max-h-24' 
    : 'aspect-video';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-card border rounded-xl transition-all duration-200 overflow-hidden
        ${isActive ? 'border-primary ring-1 ring-primary/50' : 'border-border hover:border-primary/50'}
        ${isDragging ? 'shadow-2xl z-50' : ''}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer"
        onClick={onClick}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-card-hover text-muted cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Scene Number */}
        <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
          {scene.order + 1}
        </span>

        {/* Status Icons */}
        <div className="flex items-center gap-1.5 flex-1">
          {/* Image Status */}
          <div 
            className={`p-1 rounded transition-colors ${scene.imageUrl ? 'text-success bg-success/10' : 'text-muted'}`}
            title={scene.imageUrl ? '이미지 있음' : '이미지 없음'}
          >
            {scene.imageUrl ? <Check className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </div>

          {/* Audio Status */}
          <div 
            className={`p-1 rounded transition-colors ${scene.audioGenerated ? 'text-success bg-success/10' : 'text-muted'}`}
            title={scene.audioGenerated ? '음성 있음' : '음성 없음'}
          >
            {scene.audioGenerated ? <Check className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </div>

          {/* Render Status */}
          <div 
            className={`p-1 rounded transition-colors ${scene.rendered ? 'text-success bg-success/10' : 'text-muted'}`}
            title={scene.rendered ? '렌더링 완료' : '렌더링 안됨'}
          >
            {scene.rendered ? <Check className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Processing Indicator */}
        {scene.isProcessing && (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {/* Content Preview */}
      <div className="p-3" onClick={onClick}>
        <div className="flex gap-3">
          {/* Image Preview */}
          <div className={`${aspectRatioClass} w-20 flex-shrink-0 bg-card-hover rounded-lg overflow-hidden`}>
            {scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={`씬 ${scene.order + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted" />
              </div>
            )}
          </div>

          {/* Script Preview */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">
              {scene.script || '대본을 입력하세요...'}
            </p>
            {scene.script && (
              <p className="text-xs text-muted mt-1">
                {scene.script.length}자 • ~{Math.ceil(scene.script.length / 5.8)}초
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {scene.error && (
          <div className="flex items-center gap-2 p-2 mt-2 bg-error/10 rounded-lg text-error text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{scene.error}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-card-hover/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
          disabled={scene.isProcessing}
          className="text-xs px-2 py-1"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onGenerateAudio(); }}
          disabled={scene.isProcessing || !scene.script}
          className="text-xs px-2 py-1"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onRender(); }}
          disabled={scene.isProcessing || !scene.imageUrl || !scene.audioGenerated}
          className="text-xs px-2 py-1"
        >
          <Video className="w-3.5 h-3.5" />
        </Button>

        {scene.rendered && scene.videoUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="text-xs px-2 py-1"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}

        <div className="flex-1" />

        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1.5 rounded hover:bg-card-hover text-muted hover:text-foreground transition-colors"
          title="복제"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded hover:bg-error/20 text-muted hover:text-error transition-colors"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

export default SceneCard;
