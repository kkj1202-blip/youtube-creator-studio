import React, { useState, useMemo } from 'react';
import { Modal, Button } from '@/components/ui';
import { Download, Split } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exportNativeVrewProject } from '@/lib/api/exportService';

interface VrewBatchExportProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VrewBatchExport({ isOpen, onClose }: VrewBatchExportProps) {
  const { currentProject } = useStore();
  const [splitSize, setSplitSize] = useState<number>(0); // 0 = All
  const [isExporting, setIsExporting] = useState(false);

  // Split preview calculation
  const batches = useMemo(() => {
    if (!currentProject?.scenes.length) return [];
    
    const total = currentProject.scenes.length;
    const size = splitSize === 0 ? total : splitSize;
    const result = [];
    
    for (let i = 0; i < total; i += size) {
        const start = i + 1;
        const end = Math.min(i + size, total);
        result.push({
            name: `vrew_project_${String(result.length + 1).padStart(2, '0')}`,
            range: `${start} ~ ${end} (총 ${end - start + 1}씬)`,
            start,
            end
        });
    }
    return result;
  }, [currentProject, splitSize]);

  const handleExport = async () => {
    if (!currentProject) return;
    
    setIsExporting(true);
    try {
        await exportNativeVrewProject(currentProject, splitSize);
        alert('🎉 Vrew 실행파일(.vrew) 생성이 완료되었습니다.');
        onClose();
    } catch (e: any) {
        alert(`Export failed: ${e.message}`);
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vrew 파일 내보내기" size="lg">
      <div className="space-y-6">
        <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Split className="w-4 h-4" /> 분할 단위 선택
            </h3>
            <div className="flex gap-2">
                {[0, 5, 10, 20].map((size) => (
                    <button
                        key={size}
                        onClick={() => setSplitSize(size)}
                        className={`flex-1 py-3 px-4 rounded-xl border border-border text-sm font-medium transition-all
                            ${splitSize === size 
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/20' 
                                : 'bg-card hover:bg-card-hover'
                            }
                        `}
                    >
                        {size === 0 ? '전체' : `${size}씬씩`}
                    </button>
                ))}
            </div>
            <p className="text-xs text-muted mt-2 ml-1">
                {splitSize === 0 
                    ? '전체 씬을 하나의 Vrew 프로젝트(.vrew)로 생성합니다.' 
                    : `${splitSize}개 씬마다 별도의 Vrew 프로젝트 파일(.vrew)을 생성하여 ZIP으로 묶습니다.`}
            </p>
        </div>

        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-card flex justify-between items-center">
                <span className="text-sm font-medium text-muted">분할 범위 미리보기</span>
                <span className="text-xs text-primary font-bold">{batches.length}개 파일 생성</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {batches.map((batch, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-card-hover transition-colors text-sm">
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {i + 1}
                            </span>
                            <span className="font-medium">{batch.name}.vrew</span>
                        </div>
                        <span className="text-muted">{batch.range}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
             <Button 
                variant="primary" 
                size="lg"
                onClick={handleExport}
                isLoading={isExporting}
                icon={<Download className="w-5 h-5"/>}
            >
                Vrew 파일 다운로드
            </Button>
        </div>
      </div>
    </Modal>
  );
}
