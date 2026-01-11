'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check, Palette, Sparkles, X } from 'lucide-react';
import { imageStyleLibrary, ImageStyle, StyleCategory, ConsistencySettings } from '@/lib/imageStyles';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ImageStyleSelectorProps {
  selectedStyleId?: string;
  onStyleSelect: (style: ImageStyle | null) => void;
  consistencySettings?: ConsistencySettings;
  onConsistencyChange?: (settings: ConsistencySettings) => void;
  compact?: boolean;
}

export function ImageStyleSelector({
  selectedStyleId,
  onStyleSelect,
  consistencySettings,
  onConsistencyChange,
  compact = false,
}: ImageStyleSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showConsistencySettings, setShowConsistencySettings] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const selectedStyle = selectedStyleId
    ? imageStyleLibrary.flatMap(c => c.styles).find(s => s.id === selectedStyleId)
    : null;

  const handleStyleSelect = (style: ImageStyle) => {
    if (selectedStyleId === style.id) {
      onStyleSelect(null);
    } else {
      onStyleSelect(style);
    }
  };

  const handleConsistencyChange = (field: keyof ConsistencySettings, value: string) => {
    if (onConsistencyChange) {
      onConsistencyChange({
        ...consistencySettings,
        [field]: value || undefined,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 선택된 스타일 표시 */}
      {selectedStyle && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">선택된 스타일:</span>
              <span className="text-primary font-semibold">{selectedStyle.name}</span>
            </div>
            <button
              onClick={() => onStyleSelect(null)}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {!compact && (
            <p className="text-xs text-muted mt-2 line-clamp-2">{selectedStyle.prompt}</p>
          )}
        </div>
      )}

      {/* 카테고리별 스타일 목록 */}
      <div className="space-y-2">
        {imageStyleLibrary.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            selectedStyleId={selectedStyleId}
            onStyleSelect={handleStyleSelect}
            compact={compact}
          />
        ))}
      </div>

      {/* 일관성 설정 (펼침/접기) */}
      {onConsistencyChange && (
        <div className="border-t border-border pt-4 mt-4">
          <button
            onClick={() => setShowConsistencySettings(!showConsistencySettings)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full"
          >
            {showConsistencySettings ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Palette className="w-4 h-4" />
            <span>캐릭터/배경 일관성 설정</span>
          </button>

          <AnimatePresence>
            {showConsistencySettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      캐릭터 외형 설명 (모든 씬에 적용)
                    </label>
                    <Input
                      value={consistencySettings?.characterDescription || ''}
                      onChange={(e) => handleConsistencyChange('characterDescription', e.target.value)}
                      placeholder="예: 검은 머리의 10대 소년, 파란 후드티, 둥근 안경"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      배경 설명 (모든 씬에 적용)
                    </label>
                    <Input
                      value={consistencySettings?.backgroundDescription || ''}
                      onChange={(e) => handleConsistencyChange('backgroundDescription', e.target.value)}
                      placeholder="예: 현대적인 도시 배경, 네온사인이 빛나는 밤거리"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      색상 팔레트
                    </label>
                    <Input
                      value={consistencySettings?.colorPalette || ''}
                      onChange={(e) => handleConsistencyChange('colorPalette', e.target.value)}
                      placeholder="예: 따뜻한 오렌지, 부드러운 보라색, 파스텔 톤"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1 block">
                      추가 아트 디렉션
                    </label>
                    <Input
                      value={consistencySettings?.artDirection || ''}
                      onChange={(e) => handleConsistencyChange('artDirection', e.target.value)}
                      placeholder="예: 밝고 희망찬 분위기, 코믹한 표현 강조"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: StyleCategory;
  isExpanded: boolean;
  onToggle: () => void;
  selectedStyleId?: string;
  onStyleSelect: (style: ImageStyle) => void;
  compact?: boolean;
}

function CategorySection({
  category,
  isExpanded,
  onToggle,
  selectedStyleId,
  onStyleSelect,
  compact,
}: CategorySectionProps) {
  const hasSelectedStyle = category.styles.some(s => s.id === selectedStyleId);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* 카테고리 헤더 */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors ${
          hasSelectedStyle ? 'bg-primary/5' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <span className="font-medium">{category.name}</span>
          <span className="text-xs text-muted">({category.styles.length})</span>
          {hasSelectedStyle && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              선택됨
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted" />
        )}
      </button>

      {/* 스타일 목록 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`p-2 border-t border-border bg-muted/10 ${compact ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
              {category.styles.map((style) => (
                <StyleItem
                  key={style.id}
                  style={style}
                  isSelected={selectedStyleId === style.id}
                  onSelect={() => onStyleSelect(style)}
                  compact={compact}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StyleItemProps {
  style: ImageStyle;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

function StyleItem({ style, isSelected, onSelect, compact }: StyleItemProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div
      className={`relative rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50 hover:bg-muted/20'
      }`}
      onClick={onSelect}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              <span className={`text-sm font-medium ${compact ? 'line-clamp-1' : ''}`}>
                {style.name}
              </span>
            </div>
            {!compact && (
              <p
                className="text-xs text-muted mt-1 line-clamp-2 cursor-help"
                onMouseEnter={() => setShowPrompt(true)}
                onMouseLeave={() => setShowPrompt(false)}
              >
                {style.prompt.slice(0, 80)}...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 프롬프트 툴팁 */}
      <AnimatePresence>
        {showPrompt && !compact && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 left-0 right-0 top-full mt-1 p-3 bg-background border border-border rounded-lg shadow-lg"
          >
            <p className="text-xs text-foreground">{style.prompt}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 간단한 스타일 선택 드롭다운 (컴팩트 버전)
export function ImageStyleDropdown({
  selectedStyleId,
  onStyleSelect,
}: {
  selectedStyleId?: string;
  onStyleSelect: (style: ImageStyle | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedStyle = selectedStyleId
    ? imageStyleLibrary.flatMap(c => c.styles).find(s => s.id === selectedStyleId)
    : null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2 truncate">
          <Palette className="w-4 h-4" />
          {selectedStyle ? selectedStyle.name : '이미지 스타일 선택'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-background border border-border rounded-lg shadow-lg"
          >
            <div className="p-1">
              {/* 선택 해제 옵션 */}
              <button
                onClick={() => {
                  onStyleSelect(null);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded transition-colors text-muted"
              >
                스타일 없음
              </button>

              {imageStyleLibrary.map((category) => (
                <div key={category.id}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted flex items-center gap-1 border-t border-border mt-1 pt-2">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                  {category.styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        onStyleSelect(style);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded transition-colors flex items-center gap-2 ${
                        selectedStyleId === style.id ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      {selectedStyleId === style.id && <Check className="w-3 h-3" />}
                      <span className="truncate">{style.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImageStyleSelector;
