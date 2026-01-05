'use client';

import React from 'react';
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
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import SceneCard from './SceneCard';
import { Button } from '@/components/ui';
import { generateImagePrompt } from '@/lib/api/imageGeneration';

const SceneList: React.FC = () => {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const scenes = currentProject?.scenes || [];
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      reorderScenes(oldIndex, newIndex);
    }
  };

  const handleGenerateImage = async (sceneId: string) => {
    if (!currentProject || !settings.kieApiKey) {
      alert('설정에서 이미지 생성 API 키를 입력하세요.');
      return;
    }

    const scene = currentProject.scenes.find(s => s.id === sceneId);
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
  };

  const handleGenerateAudio = async (sceneId: string) => {
    if (!currentProject) return;

    const accountIndex = currentProject.elevenLabsAccountIndex;
    const apiKey = settings.elevenLabsAccounts[accountIndex]?.apiKey;
    
    if (!apiKey) {
      alert('설정에서 ElevenLabs API 키를 입력하세요.');
      return;
    }

    const scene = currentProject.scenes.find(s => s.id === sceneId);
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
  };

  const handleRender = async (sceneId: string) => {
    if (!currentProject) return;

    const scene = currentProject.scenes.find(s => s.id === sceneId);
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
  };

  const handleDownload = async (sceneId: string) => {
    const scene = currentProject?.scenes.find(s => s.id === sceneId);
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
  };

  const scenes = currentProject?.scenes || [];

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
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={scenes.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence>
            {scenes.map((scene) => (
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
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {/* Add Scene Button */}
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
