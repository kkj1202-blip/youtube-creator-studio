'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Search, 
  Image as ImageIcon, 
  Volume2, 
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  XCircle,
  Loader2,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import SceneCard from './SceneCard';
import { Button, Input, Badge } from '@/components/ui';
import { generateImagePrompt } from '@/lib/api/imageGeneration';
import type { Scene } from '@/types';

// 페이지당 씬 수
const SCENES_PER_PAGE = 20;

// 필터 타입
type FilterType = 'all' | 'no-image' | 'no-audio' | 'no-video' | 'completed' | 'error';

interface SceneListProps {
  compact?: boolean;
}

const SceneList: React.FC<SceneListProps> = ({ compact: defaultCompact = false }) => {
  const {
    currentProject,
    activeSceneId,
    settings,
    setActiveScene,
    addScene,
    deleteScene,
    duplicateScene,
    reorderScenes,
    updateScene,
  } = useStore();

  // 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [compact, setCompact] = useState(defaultCompact);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const scenes = currentProject?.scenes || [];
  const totalScenes = scenes.length;

  // 50씬 이상이면 자동 컴팩트 모드
  useEffect(() => {
    if (totalScenes > 50 && !compact) {
      setCompact(true);
    }
  }, [totalScenes, compact]);

  // 필터링된 씬 목록 (메모이제이션)
  const filteredScenes = useMemo(() => {
    let result = scenes;

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((scene) =>
        scene.script.toLowerCase().includes(query) ||
        scene.imagePrompt?.toLowerCase().includes(query) ||
        `씬 ${scene.order + 1}`.includes(query)
      );
    }

    // 상태 필터
    switch (filter) {
      case 'no-image':
        result = result.filter((s) => !s.imageUrl);
        break;
      case 'no-audio':
        result = result.filter((s) => !s.audioGenerated);
        break;
      case 'no-video':
        result = result.filter((s) => !s.rendered);
        break;
      case 'completed':
        result = result.filter((s) => s.imageUrl && s.audioGenerated && s.rendered);
        break;
      case 'error':
        result = result.filter((s) => s.error);
        break;
    }

    return result;
  }, [scenes, searchQuery, filter]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredScenes.length / SCENES_PER_PAGE);
  const paginatedScenes = useMemo(() => {
    const start = (currentPage - 1) * SCENES_PER_PAGE;
    return filteredScenes.slice(start, start + SCENES_PER_PAGE);
  }, [filteredScenes, currentPage]);

  // 통계 계산
  const stats = useMemo(() => ({
    total: totalScenes,
    withImage: scenes.filter((s) => s.imageUrl).length,
    withAudio: scenes.filter((s) => s.audioGenerated).length,
    rendered: scenes.filter((s) => s.rendered).length,
    errors: scenes.filter((s) => s.error).length,
    processing: scenes.filter((s) => s.isProcessing).length,
  }), [scenes, totalScenes]);

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      reorderScenes(oldIndex, newIndex);
    }
  }, [scenes, reorderScenes]);

  // 이미지 생성 핸들러
  const handleGenerateImage = useCallback(async (sceneId: string) => {
    if (!currentProject || !settings.kieApiKey) {
      alert('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    const scene = currentProject.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    updateScene(sceneId, { isProcessing: true, error: undefined });

    try {
      const prompt = scene.imagePrompt || generateImagePrompt(
        scene.script,
        currentProject.imageStyle,
        currentProject.customStylePrompt
      );

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.kieApiKey,
          prompt,
          aspectRatio: currentProject.aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성 실패');
      }

      updateScene(sceneId, {
        isProcessing: false,
        imageUrl: data.imageUrl,
        imageSource: 'generated',
        imagePrompt: prompt,
      });
    } catch (error) {
      updateScene(sceneId, {
        isProcessing: false,
        error: error instanceof Error ? error.message : '이미지 생성 중 오류',
      });
    }
  }, [currentProject, settings.kieApiKey, updateScene]);

  // 음성 생성 핸들러
  const handleGenerateAudio = useCallback(async (sceneId: string) => {
    if (!currentProject) return;

    // 활성화된 계정 찾기
    const activeAccountIndex = settings.elevenLabsAccounts.findIndex(
      (acc) => acc.isActive && acc.apiKey
    );
    
    if (activeAccountIndex === -1) {
      alert('설정에서 ElevenLabs 계정을 활성화하고 API 키를 입력하세요.');
      return;
    }

    const apiKey = settings.elevenLabsAccounts[activeAccountIndex].apiKey;
    const scene = currentProject.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const voiceId = scene.voiceId || currentProject.defaultVoiceId;
    if (!voiceId) {
      alert('보이스를 선택하세요.');
      return;
    }

    updateScene(sceneId, { isProcessing: true, error: undefined });

    try {
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          voiceId,
          text: scene.script,
          speed: scene.voiceSpeed,
          emotion: scene.emotion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '음성 생성 실패');
      }

      updateScene(sceneId, {
        isProcessing: false,
        audioUrl: data.audioUrl,
        audioGenerated: true,
      });
    } catch (error) {
      updateScene(sceneId, {
        isProcessing: false,
        error: error instanceof Error ? error.message : '음성 생성 중 오류',
      });
    }
  }, [currentProject, settings.elevenLabsAccounts, updateScene]);

  // 렌더링 핸들러
  const handleRender = useCallback(async (sceneId: string) => {
    if (!currentProject) return;

    const scene = currentProject.scenes.find((s) => s.id === sceneId);
    if (!scene || !scene.imageUrl || !scene.audioUrl) {
      alert('이미지와 음성이 필요합니다.');
      return;
    }

    updateScene(sceneId, { isProcessing: true, error: undefined });

    try {
      const response = await fetch('/api/render-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          imageUrl: scene.imageUrl,
          audioUrl: scene.audioUrl,
          aspectRatio: currentProject.aspectRatio,
          transition: scene.transition,
          kenBurns: scene.kenBurns,
          subtitle: {
            enabled: scene.subtitleEnabled,
            text: scene.script,
            style: currentProject.subtitleStyle,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '렌더링 실패');
      }

      updateScene(sceneId, {
        isProcessing: false,
        videoUrl: data.videoUrl,
        rendered: true,
      });
    } catch (error) {
      updateScene(sceneId, {
        isProcessing: false,
        error: error instanceof Error ? error.message : '렌더링 중 오류',
      });
    }
  }, [currentProject, updateScene]);

  // 다운로드 핸들러
  const handleDownload = useCallback(async (sceneId: string) => {
    const scene = currentProject?.scenes.find((s) => s.id === sceneId);
    if (!scene?.videoUrl) return;

    if (scene.videoUrl.startsWith('/api/demo-video')) {
      alert('데모 모드에서는 다운로드할 수 없습니다.');
      return;
    }

    try {
      const response = await fetch(scene.videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_${scene.order + 1}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('다운로드 중 오류가 발생했습니다.');
    }
  }, [currentProject]);

  // 페이지 변경
  const changePage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // 빈 상태
  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-card-hover flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          씬이 없습니다
        </h3>
        <p className="text-muted mb-4">
          대본을 입력하거나 새 씬을 추가하세요
        </p>
        <Button onClick={() => addScene()} icon={<Plus className="w-4 h-4" />}>
          첫 씬 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* 통계 바 */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-card-hover rounded-lg text-xs">
        <Badge variant="secondary">
          총 {stats.total}씬
        </Badge>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          <ImageIcon className="w-3 h-3 mr-1" />
          {stats.withImage}
        </Badge>
        <Badge variant="secondary" className="bg-secondary/20 text-secondary">
          <Volume2 className="w-3 h-3 mr-1" />
          {stats.withAudio}
        </Badge>
        <Badge variant="secondary" className="bg-success/20 text-success">
          <Video className="w-3 h-3 mr-1" />
          {stats.rendered}
        </Badge>
        {stats.errors > 0 && (
          <Badge variant="secondary" className="bg-error/20 text-error">
            <XCircle className="w-3 h-3 mr-1" />
            {stats.errors}
          </Badge>
        )}
        {stats.processing > 0 && (
          <Badge variant="secondary" className="bg-warning/20 text-warning">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {stats.processing}
          </Badge>
        )}
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="씬 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterType);
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-card-hover border border-border rounded-lg text-sm"
        >
          <option value="all">전체</option>
          <option value="no-image">이미지 없음</option>
          <option value="no-audio">음성 없음</option>
          <option value="no-video">렌더링 안됨</option>
          <option value="completed">완료됨</option>
          <option value="error">오류</option>
        </select>
        <Button
          variant={compact ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setCompact(!compact)}
          icon={compact ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          title={compact ? '상세 보기' : '컴팩트 보기'}
        />
      </div>

      {/* 씬 목록 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={paginatedScenes.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin pr-1 ${compact ? 'space-y-1' : ''}`}>
            {paginatedScenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                isActive={scene.id === activeSceneId}
                aspectRatio={currentProject?.aspectRatio || '16:9'}
                onClick={() => setActiveScene(scene.id)}
                onDelete={() => {
                  if (confirm(`씬 ${scene.order + 1}을 삭제하시겠습니까?`)) {
                    deleteScene(scene.id);
                  }
                }}
                onDuplicate={() => duplicateScene(scene.id)}
                onGenerateImage={() => handleGenerateImage(scene.id)}
                onGenerateAudio={() => handleGenerateAudio(scene.id)}
                onRender={() => handleRender(scene.id)}
                onDownload={() => handleDownload(scene.id)}
                compact={compact}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changePage(1)}
            disabled={currentPage === 1}
            icon={<ChevronsLeft className="w-4 h-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            icon={<ChevronLeft className="w-4 h-4" />}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => changePage(Number(e.target.value))}
              className="w-12 px-2 py-1 text-center bg-card-hover border border-border rounded text-sm"
              min={1}
              max={totalPages}
            />
            <span className="text-sm text-muted">/ {totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            icon={<ChevronRight className="w-4 h-4" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changePage(totalPages)}
            disabled={currentPage === totalPages}
            icon={<ChevronsRight className="w-4 h-4" />}
          />
        </div>
      )}

      {/* 필터 결과 */}
      {(searchQuery || filter !== 'all') && (
        <div className="text-center text-sm text-muted py-2">
          {filteredScenes.length}개의 씬 표시 중 (전체 {totalScenes}개)
        </div>
      )}

      {/* 씬 추가 버튼 */}
      <Button
        variant="ghost"
        className="w-full border-dashed"
        onClick={() => addScene()}
        icon={<Plus className="w-4 h-4" />}
      >
        씬 추가
      </Button>
    </div>
  );
};

export default SceneList;
