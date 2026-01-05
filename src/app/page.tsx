'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  Settings2,
  Layers,
  Play,
  FileText,
  Sparkles,
} from 'lucide-react';
import { MainLayout } from '@/components/layout';
import {
  SceneList,
  SceneEditor,
  ScriptInput,
  ProjectSettings,
  BatchActions,
} from '@/components/scenes';
import { Button, Card, Modal, Input, Tabs } from '@/components/ui';
import { useStore } from '@/store/useStore';

type EditorView = 'input' | 'editor';
type EditorTab = 'scenes' | 'settings';

export default function Home() {
  const {
    currentProject,
    projects,
    createProject,
    loadProject,
    deleteProject,
  } = useStore();

  const [view, setView] = useState<EditorView>('input');
  const [activeTab, setActiveTab] = useState<EditorTab>('scenes');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentProject && currentProject.scenes.length > 0) {
      setView('editor');
    }
  }, [currentProject]);

  const handleCreateProject = () => {
    createProject(newProjectName || '새 프로젝트');
    setNewProjectName('');
    setShowNewProjectModal(false);
    setView('input');
  };

  const handleLoadProject = (projectId: string) => {
    loadProject(projectId);
    setShowProjectsModal(false);
    setView('editor');
  };

  const tabs = [
    { id: 'scenes', label: '씬 편집', icon: <Layers className="w-4 h-4" /> },
    { id: 'settings', label: '프로젝트 설정', icon: <Settings2 className="w-4 h-4" /> },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold gradient-text">Creator Studio</span>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      {/* No Project Selected */}
      {!currentProject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto py-16"
        >
          <div className="text-center mb-12">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Creator Studio
            </h1>
            <p className="text-lg text-muted">
              유튜버를 위한 올인원 영상 제작 도구
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              hover
              onClick={() => setShowNewProjectModal(true)}
              className="p-8 text-center cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                새 프로젝트
              </h3>
              <p className="text-sm text-muted">
                새로운 영상 프로젝트를 시작합니다
              </p>
            </Card>

            <Card
              hover
              onClick={() => setShowProjectsModal(true)}
              className="p-8 text-center cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                프로젝트 열기
              </h3>
              <p className="text-sm text-muted">
                저장된 프로젝트 {projects.length}개
              </p>
            </Card>
          </div>

          {/* Recent Projects */}
          {projects.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                최근 프로젝트
              </h2>
              <div className="space-y-2">
                {projects.slice(-3).reverse().map((project) => (
                  <Card
                    key={project.id}
                    hover
                    onClick={() => handleLoadProject(project.id)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-card-hover flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted">
                          {project.scenes.length}개의 씬 • {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <span className="text-xs text-muted bg-card-hover px-2 py-1 rounded">
                        {project.aspectRatio}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Project Editor */}
      {currentProject && (
        <AnimatePresence mode="wait">
          {view === 'input' ? (
            <ScriptInput
              key="input"
              onComplete={() => setView('editor')}
            />
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Tabs */}
              <div className="flex items-center justify-between mb-6">
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={(id) => setActiveTab(id as EditorTab)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('input')}
                  icon={<FileText className="w-4 h-4" />}
                >
                  대본 다시 입력
                </Button>
              </div>

              {activeTab === 'scenes' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Scene List */}
                  <div className="lg:col-span-1 space-y-4">
                    <SceneList />
                  </div>

                  {/* Scene Editor */}
                  <div className="lg:col-span-1">
                    <Card className="h-[calc(100vh-200px)] overflow-hidden">
                      <SceneEditor />
                    </Card>
                  </div>

                  {/* Batch Actions */}
                  <div className="lg:col-span-1">
                    <BatchActions />
                  </div>
                </div>
              ) : (
                <ProjectSettings />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="새 프로젝트"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="프로젝트 이름"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="프로젝트 이름을 입력하세요"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowNewProjectModal(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleCreateProject}
            >
              만들기
            </Button>
          </div>
        </div>
      </Modal>

      {/* Projects List Modal */}
      <Modal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        title="프로젝트 목록"
        size="lg"
      >
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">저장된 프로젝트가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-4 bg-card-hover rounded-lg hover:bg-card-hover/80 transition-colors"
              >
                <div className="flex-1 cursor-pointer" onClick={() => handleLoadProject(project.id)}>
                  <h3 className="font-medium text-foreground">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted">
                    {project.scenes.length}개의 씬 • {project.aspectRatio} • 
                    {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoadProject(project.id)}
                >
                  열기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('이 프로젝트를 삭제하시겠습니까?')) {
                      deleteProject(project.id);
                    }
                  }}
                  className="text-error hover:text-error"
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
