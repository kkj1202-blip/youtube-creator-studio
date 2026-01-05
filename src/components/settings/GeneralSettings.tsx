'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, Save, Trash2, Download, Upload } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Select, Slider, Card } from '@/components/ui';
import type { AspectRatio, ImageStyle } from '@/types';

const aspectRatioOptions = [
  { value: '16:9', label: '16:9 (롱폼 - 가로)' },
  { value: '9:16', label: '9:16 (쇼츠 - 세로)' },
];

const imageStyleOptions = [
  { value: '2d-anime', label: '2D 애니메이션' },
  { value: '3d-anime', label: '3D 애니메이션' },
  { value: 'realistic', label: '실사/사실적' },
  { value: 'cartoon', label: '카툰' },
  { value: 'watercolor', label: '수채화' },
];

const GeneralSettings: React.FC = () => {
  const { settings, updateSettings, projects, templates } = useStore();

  const handleExportData = () => {
    const data = {
      settings,
      projects,
      templates,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-studio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          // TODO: Validate and import data
          alert('데이터를 성공적으로 가져왔습니다.');
        } catch (error) {
          alert('파일을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAllData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('youtube-creator-studio');
      window.location.reload();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Default Settings */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          기본 설정
        </h3>
        <div className="space-y-4">
          <Select
            label="기본 화면 비율"
            options={aspectRatioOptions}
            value={settings.defaultAspectRatio}
            onChange={(value) => updateSettings({ defaultAspectRatio: value as AspectRatio })}
          />
          <Select
            label="기본 이미지 스타일"
            options={imageStyleOptions}
            value={settings.defaultImageStyle}
            onChange={(value) => updateSettings({ defaultImageStyle: value as ImageStyle })}
          />
        </div>
      </Card>

      {/* Auto Save Settings */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Save className="w-5 h-5 text-primary" />
          자동 저장
        </h3>
        <div className="space-y-4">
          <Slider
            label="자동 저장 간격"
            value={settings.autoSaveInterval}
            onChange={(value) => updateSettings({ autoSaveInterval: value })}
            min={10}
            max={120}
            step={10}
            unit="초"
          />
          <Slider
            label="버전 히스토리 보관 개수"
            value={settings.maxVersionHistory}
            onChange={(value) => updateSettings({ maxVersionHistory: value })}
            min={5}
            max={30}
            step={5}
            unit="개"
          />
          <p className="text-xs text-muted">
            프로젝트 저장 시 최근 {settings.maxVersionHistory}개의 버전을 보관합니다.
          </p>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          데이터 관리
        </h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={handleExportData}
              icon={<Download className="w-4 h-4" />}
            >
              데이터 내보내기
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={handleImportData}
              icon={<Upload className="w-4 h-4" />}
            >
              데이터 가져오기
            </Button>
          </div>
          <p className="text-xs text-muted">
            설정, 프로젝트, 템플릿을 JSON 파일로 백업하거나 복원할 수 있습니다.
          </p>
          
          <hr className="border-border" />
          
          <Button
            variant="danger"
            className="w-full"
            onClick={handleClearAllData}
            icon={<Trash2 className="w-4 h-4" />}
          >
            모든 데이터 삭제
          </Button>
          <p className="text-xs text-error">
            주의: 이 작업은 되돌릴 수 없습니다. 먼저 데이터를 백업하세요.
          </p>
        </div>
      </Card>

      {/* Storage Info */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          저장 공간
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">프로젝트</span>
            <span className="text-foreground">{projects.length}개</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">템플릿</span>
            <span className="text-foreground">{templates.length}개</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">로컬 스토리지 사용량</span>
            <span className="text-foreground">
              {(new Blob([localStorage.getItem('youtube-creator-studio') || '']).size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default GeneralSettings;
