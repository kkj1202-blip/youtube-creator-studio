'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Save, Clock, Undo2, FolderOpen, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui';

const Header: React.FC = () => {
  const {
    currentProject,
    sidebarOpen,
    saveProject,
    createProject,
    lastSavedAt,
  } = useStore();

  const formatLastSaved = () => {
    if (!lastSavedAt) return '저장되지 않음';
    const date = new Date(lastSavedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return '방금 저장됨';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전 저장`;
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.header
      initial={false}
      animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.2 }}
      className="fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-sm border-b border-border z-30 flex items-center justify-between px-6"
      style={{ left: 0 }}
    >
      {/* Left: Project Info */}
      <div className="flex items-center gap-4">
        {currentProject ? (
          <>
            <h1 className="text-lg font-semibold text-foreground">
              {currentProject.name}
            </h1>
            <span className="text-sm text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatLastSaved()}
            </span>
          </>
        ) : (
          <h1 className="text-lg font-semibold text-foreground">
            프로젝트를 선택하세요
          </h1>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => createProject()}
          icon={<Plus className="w-4 h-4" />}
        >
          새 프로젝트
        </Button>
        
        {currentProject && (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Undo2 className="w-4 h-4" />}
            >
              버전 복원
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={saveProject}
              icon={<Save className="w-4 h-4" />}
            >
              저장
            </Button>
          </>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
