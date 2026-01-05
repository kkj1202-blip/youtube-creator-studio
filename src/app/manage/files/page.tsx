'use client';

import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, Card, Input, Modal, Select } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  File,
  FileVideo,
  FileAudio,
  FileImage,
  Trash2,
  Download,
  Search,
  Filter,
  Grid,
  List,
  Tag,
  HardDrive,
  AlertTriangle,
  Copy,
  MoreVertical,
  Eye,
  FolderPlus,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  StarOff,
} from 'lucide-react';
import type { SourceFile } from '@/types';

// 데모 데이터
const demoFiles: SourceFile[] = [
  { id: '1', name: '인트로_최종.mp4', type: 'video', size: 156000000, path: '/영상소스/인트로', projectId: 'proj1', createdAt: '2025-12-20', tags: ['인트로', '로고'], used: true },
  { id: '2', name: '배경음악_편안한.mp3', type: 'audio', size: 8500000, path: '/오디오/BGM', projectId: 'proj1', createdAt: '2025-12-18', tags: ['BGM', '편안함'], used: true },
  { id: '3', name: '썸네일_시안1.png', type: 'image', size: 2400000, path: '/이미지/썸네일', projectId: 'proj2', createdAt: '2025-12-22', tags: ['썸네일'], used: false },
  { id: '4', name: '미사용_클립.mp4', type: 'video', size: 450000000, path: '/영상소스/미분류', projectId: undefined, createdAt: '2025-11-15', tags: [], used: false },
  { id: '5', name: '효과음_팝.wav', type: 'audio', size: 1200000, path: '/오디오/효과음', projectId: 'proj1', createdAt: '2025-12-19', tags: ['효과음', '전환'], used: true },
  { id: '6', name: '자막_템플릿.png', type: 'image', size: 890000, path: '/이미지/자막', projectId: undefined, createdAt: '2025-12-01', tags: ['자막', '템플릿'], used: false },
  { id: '7', name: '브이로그_1월.mp4', type: 'video', size: 2100000000, path: '/영상소스/브이로그', projectId: 'proj3', createdAt: '2025-12-28', tags: ['브이로그', '1월'], used: true },
  { id: '8', name: '구독버튼_애니.mp4', type: 'video', size: 45000000, path: '/영상소스/요소', projectId: 'proj1', createdAt: '2025-12-10', tags: ['구독', '애니메이션'], used: true },
  { id: '9', name: '배경음악_긴장감.mp3', type: 'audio', size: 7200000, path: '/오디오/BGM', projectId: 'proj2', createdAt: '2025-12-25', tags: ['BGM', '긴장'], used: false },
  { id: '10', name: '썸네일_최종.psd', type: 'other', size: 85000000, path: '/이미지/썸네일', projectId: 'proj2', createdAt: '2025-12-23', tags: ['썸네일', '원본'], used: true },
  { id: '11', name: '인터뷰_원본.mp4', type: 'video', size: 3200000000, path: '/영상소스/인터뷰', projectId: undefined, createdAt: '2025-11-20', tags: ['인터뷰', '원본'], used: false },
  { id: '12', name: '로고_투명.png', type: 'image', size: 340000, path: '/이미지/로고', projectId: undefined, createdAt: '2025-10-01', tags: ['로고', '브랜딩'], used: true },
];

const projectNames: Record<string, string> = {
  proj1: 'AI 편집 튜토리얼',
  proj2: '연말 결산 영상',
  proj3: '1월 브이로그',
};

// 중복 파일 데모
const duplicateGroups = [
  { hash: 'abc123', files: ['1', '8'] }, // 인트로 관련 중복
];

export default function FilesPage() {
  const [files, setFiles] = useState<SourceFile[]>(demoFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUsed, setFilterUsed] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [starredFiles, setStarredFiles] = useState<Set<string>>(new Set(['1', '7']));

  // 파일 아이콘
  const getFileIcon = (type: SourceFile['type']) => {
    switch (type) {
      case 'video': return <FileVideo className="w-5 h-5 text-primary" />;
      case 'audio': return <FileAudio className="w-5 h-5 text-success" />;
      case 'image': return <FileImage className="w-5 h-5 text-warning" />;
      default: return <File className="w-5 h-5 text-muted" />;
    }
  };

  // 파일 크기 포맷
  const formatSize = (bytes: number) => {
    if (bytes >= 1000000000) return `${(bytes / 1000000000).toFixed(1)} GB`;
    if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
    if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  // 필터링 및 정렬
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // 검색
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.tags.some(t => t.toLowerCase().includes(query)) ||
        f.path.toLowerCase().includes(query)
      );
    }

    // 타입 필터
    if (filterType !== 'all') {
      result = result.filter(f => f.type === filterType);
    }

    // 사용 여부 필터
    if (filterUsed === 'used') {
      result = result.filter(f => f.used);
    } else if (filterUsed === 'unused') {
      result = result.filter(f => !f.used);
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'size': return b.size - a.size;
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return 0;
      }
    });

    return result;
  }, [files, searchQuery, filterType, filterUsed, sortBy]);

  // 통계 계산
  const stats = useMemo(() => {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const unusedSize = files.filter(f => !f.used).reduce((sum, f) => sum + f.size, 0);
    const videoCount = files.filter(f => f.type === 'video').length;
    const audioCount = files.filter(f => f.type === 'audio').length;
    const imageCount = files.filter(f => f.type === 'image').length;
    const unusedCount = files.filter(f => !f.used).length;

    return { totalSize, unusedSize, videoCount, audioCount, imageCount, unusedCount };
  }, [files]);

  // 파일 선택
  const toggleFileSelection = (id: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedFiles(newSelection);
  };

  // 전체 선택
  const selectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  // 선택 파일 삭제
  const deleteSelectedFiles = () => {
    setFiles(files.filter(f => !selectedFiles.has(f.id)));
    setSelectedFiles(new Set());
    setShowDeleteModal(false);
  };

  // 즐겨찾기 토글
  const toggleStar = (id: string) => {
    const newStarred = new Set(starredFiles);
    if (newStarred.has(id)) {
      newStarred.delete(id);
    } else {
      newStarred.add(id);
    }
    setStarredFiles(newStarred);
  };

  // 미사용 파일 정리 추천
  const unusedFiles = files.filter(f => !f.used);
  const canSaveSpace = stats.unusedSize;

  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                📁 소스 파일 정리기
              </h1>
              <p className="text-muted">
                영상 소스 파일을 효율적으로 관리하세요
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAnalysisModal(true)}
                icon={<HardDrive className="w-4 h-4" />}
              >
                용량 분석
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowUploadModal(true)}
                icon={<Upload className="w-4 h-4" />}
              >
                파일 업로드
              </Button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            <Card className="p-3 text-center">
              <HardDrive className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{formatSize(stats.totalSize)}</p>
              <p className="text-xs text-muted">총 용량</p>
            </Card>
            <Card className="p-3 text-center">
              <FileVideo className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{stats.videoCount}</p>
              <p className="text-xs text-muted">영상</p>
            </Card>
            <Card className="p-3 text-center">
              <FileAudio className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-lg font-bold text-foreground">{stats.audioCount}</p>
              <p className="text-xs text-muted">오디오</p>
            </Card>
            <Card className="p-3 text-center">
              <FileImage className="w-5 h-5 mx-auto mb-1 text-warning" />
              <p className="text-lg font-bold text-foreground">{stats.imageCount}</p>
              <p className="text-xs text-muted">이미지</p>
            </Card>
            <Card className="p-3 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-error" />
              <p className="text-lg font-bold text-foreground">{stats.unusedCount}</p>
              <p className="text-xs text-muted">미사용</p>
            </Card>
            <Card className="p-3 text-center bg-error/10">
              <Trash2 className="w-5 h-5 mx-auto mb-1 text-error" />
              <p className="text-lg font-bold text-error">{formatSize(stats.unusedSize)}</p>
              <p className="text-xs text-muted">절약 가능</p>
            </Card>
          </div>

          {/* 필터 바 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="파일명, 태그, 경로로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'all', label: '모든 유형' },
                { value: 'video', label: '🎬 영상' },
                { value: 'audio', label: '🎵 오디오' },
                { value: 'image', label: '🖼️ 이미지' },
                { value: 'other', label: '📄 기타' },
              ]}
            />
            <Select
              value={filterUsed}
              onChange={setFilterUsed}
              options={[
                { value: 'all', label: '전체 파일' },
                { value: 'used', label: '✅ 사용 중' },
                { value: 'unused', label: '⚠️ 미사용' },
              ]}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'date', label: '📅 날짜순' },
                { value: 'name', label: '🔤 이름순' },
                { value: 'size', label: '📊 크기순' },
              ]}
            />
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-card text-muted hover:bg-card-hover'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-card text-muted hover:bg-card-hover'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 선택된 파일 액션 바 */}
        <AnimatePresence>
          {selectedFiles.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between"
            >
              <span className="text-sm font-medium">
                {selectedFiles.size}개 파일 선택됨
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set())}>
                  선택 해제
                </Button>
                <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                  다운로드
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setShowDeleteModal(true)}
                >
                  삭제
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 파일 목록 */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {/* 헤더 */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-12 gap-2 p-3 border-b border-border text-sm font-medium text-muted">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                  onChange={selectAll}
                  className="rounded border-border"
                />
              </div>
              <div className="col-span-4">파일명</div>
              <div className="col-span-2">경로</div>
              <div className="col-span-1 text-right">크기</div>
              <div className="col-span-2">프로젝트</div>
              <div className="col-span-1">상태</div>
              <div className="col-span-1"></div>
            </div>
          )}

          {/* 파일 리스트 */}
          <div className={`flex-1 overflow-auto p-3 ${viewMode === 'grid' ? 'grid grid-cols-4 gap-3' : ''}`}>
            {filteredFiles.map((file) => (
              viewMode === 'list' ? (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`grid grid-cols-12 gap-2 p-2 rounded-lg hover:bg-card-hover items-center ${
                    selectedFiles.has(file.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="col-span-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="rounded border-border"
                    />
                    <button onClick={() => toggleStar(file.id)}>
                      {starredFiles.has(file.id) ? (
                        <Star className="w-4 h-4 text-warning fill-warning" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted hover:text-warning" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                  <div className="col-span-2 text-xs text-muted truncate">
                    {file.path}
                  </div>
                  <div className="col-span-1 text-xs text-right text-muted">
                    {formatSize(file.size)}
                  </div>
                  <div className="col-span-2 text-xs">
                    {file.projectId ? (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {projectNames[file.projectId] || '알 수 없음'}
                      </span>
                    ) : (
                      <span className="text-muted">미지정</span>
                    )}
                  </div>
                  <div className="col-span-1">
                    {file.used ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="w-3 h-3" /> 사용 중
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-error">
                        <XCircle className="w-3 h-3" /> 미사용
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button className="p-1 hover:bg-card rounded">
                      <Eye className="w-4 h-4 text-muted" />
                    </button>
                    <button className="p-1 hover:bg-card rounded">
                      <Download className="w-4 h-4 text-muted" />
                    </button>
                    <button className="p-1 hover:bg-card rounded">
                      <MoreVertical className="w-4 h-4 text-muted" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer ${
                    selectedFiles.has(file.id) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => toggleFileSelection(file.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getFileIcon(file.type)}
                    <button onClick={(e) => { e.stopPropagation(); toggleStar(file.id); }}>
                      {starredFiles.has(file.id) ? (
                        <Star className="w-4 h-4 text-warning fill-warning" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-medium truncate mb-1">{file.name}</p>
                  <p className="text-xs text-muted mb-2">{formatSize(file.size)}</p>
                  <div className="flex items-center justify-between">
                    {file.used ? (
                      <span className="text-xs text-success">✓ 사용 중</span>
                    ) : (
                      <span className="text-xs text-error">✗ 미사용</span>
                    )}
                    {file.tags.length > 0 && (
                      <span className="text-xs text-muted">
                        <Tag className="w-3 h-3 inline mr-1" />
                        {file.tags.length}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            ))}
          </div>

          {/* 빈 상태 */}
          {filteredFiles.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>검색 결과가 없습니다</p>
              </div>
            </div>
          )}
        </Card>

        {/* 삭제 확인 모달 */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="파일 삭제"
        >
          <div className="space-y-4">
            <p className="text-muted">
              선택한 {selectedFiles.size}개 파일을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="max-h-40 overflow-auto bg-card-hover rounded-lg p-2">
              {Array.from(selectedFiles).map(id => {
                const file = files.find(f => f.id === id);
                return file && (
                  <div key={id} className="flex items-center gap-2 py-1">
                    {getFileIcon(file.type)}
                    <span className="text-sm">{file.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                취소
              </Button>
              <Button variant="danger" onClick={deleteSelectedFiles}>
                삭제
              </Button>
            </div>
          </div>
        </Modal>

        {/* 용량 분석 모달 */}
        <Modal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          title="💾 용량 분석"
          size="lg"
        >
          <div className="space-y-6">
            {/* 전체 용량 */}
            <div>
              <h3 className="font-medium mb-3">전체 용량 분석</h3>
              <div className="bg-card-hover rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">총 사용량</span>
                  <span className="font-bold">{formatSize(stats.totalSize)}</span>
                </div>
                <div className="w-full h-4 bg-border rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${(files.filter(f => f.type === 'video').reduce((s, f) => s + f.size, 0) / stats.totalSize) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-success" 
                    style={{ width: `${(files.filter(f => f.type === 'audio').reduce((s, f) => s + f.size, 0) / stats.totalSize) * 100}%` }}
                  />
                  <div 
                    className="h-full bg-warning" 
                    style={{ width: `${(files.filter(f => f.type === 'image').reduce((s, f) => s + f.size, 0) / stats.totalSize) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full" /> 영상
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-success rounded-full" /> 오디오
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-warning rounded-full" /> 이미지
                  </span>
                </div>
              </div>
            </div>

            {/* 정리 추천 */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                정리 추천
              </h3>
              <div className="space-y-2">
                {unusedFiles.length > 0 && (
                  <div className="bg-error/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-error">미사용 파일 {unusedFiles.length}개</p>
                      <p className="text-xs text-muted">{formatSize(stats.unusedSize)} 절약 가능</p>
                    </div>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => {
                        setSelectedFiles(new Set(unusedFiles.map(f => f.id)));
                        setShowAnalysisModal(false);
                        setShowDeleteModal(true);
                      }}
                    >
                      정리하기
                    </Button>
                  </div>
                )}
                {duplicateGroups.length > 0 && (
                  <div className="bg-warning/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-warning">중복 의심 파일 {duplicateGroups.length}그룹</p>
                      <p className="text-xs text-muted">유사한 파일이 감지되었습니다</p>
                    </div>
                    <Button variant="outline" size="sm">
                      확인하기
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 프로젝트별 용량 */}
            <div>
              <h3 className="font-medium mb-3">프로젝트별 용량</h3>
              <div className="space-y-2">
                {Object.entries(projectNames).map(([id, name]) => {
                  const projectFiles = files.filter(f => f.projectId === id);
                  const projectSize = projectFiles.reduce((s, f) => s + f.size, 0);
                  const percentage = (projectSize / stats.totalSize) * 100;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{name}</span>
                          <span className="text-xs text-muted">{formatSize(projectSize)}</span>
                        </div>
                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted">미지정 파일</span>
                      <span className="text-xs text-muted">
                        {formatSize(files.filter(f => !f.projectId).reduce((s, f) => s + f.size, 0))}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted" 
                        style={{ width: `${(files.filter(f => !f.projectId).reduce((s, f) => s + f.size, 0) / stats.totalSize) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowAnalysisModal(false)}>
                닫기
              </Button>
            </div>
          </div>
        </Modal>

        {/* 업로드 모달 */}
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="📤 파일 업로드"
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted" />
              <p className="font-medium mb-1">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-muted">영상, 이미지, 오디오 파일 지원</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="프로젝트"
                options={[
                  { value: '', label: '선택 안 함' },
                  ...Object.entries(projectNames).map(([id, name]) => ({ value: id, label: name }))
                ]}
                value=""
                onChange={() => {}}
              />
              <Input
                label="태그"
                placeholder="태그 입력 (쉼표로 구분)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowUploadModal(false)}>
                취소
              </Button>
              <Button variant="primary">
                업로드
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
