import React, { useState, useRef, useEffect } from 'react';
import { buildFinalPrompt } from '@/lib/imageStyles';
import { Button, Input } from '@/components/ui';
import { Play, Square, FolderOpen, FileText, Terminal, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface WhiskAutomationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export default function WhiskAutomation({ isOpen, onClose }: WhiskAutomationProps) {
  // Settings - Load from localStorage with defaults
  const [mode, setMode] = useState<'api' | 'dom'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('whisk_mode') as 'api' | 'dom') || 'api';
    }
    return 'api';
  });
  const [prompts, setPrompts] = useState('');
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);
  const [waitKey, setWaitKey] = useState(5);
  const [startIndex, setStartIndex] = useState(1);
  const [prefix, setPrefix] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisk_prefix') || 'image';
    }
    return 'image';
  });
  const [outputDir, setOutputDir] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whisk_outputDir') || 'public/uploads/whisk_batch';
    }
    return 'public/uploads/whisk_batch';
  });

  // Reference Images State
  const [subjectPath, setSubjectPath] = useState('');
  const [stylePath, setStylePath] = useState('');
  const [compositionPath, setCompositionPath] = useState('');

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [isServerOnline, setIsServerOnline] = useState(false);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whisk_mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whisk_prefix', prefix);
    }
  }, [prefix]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whisk_outputDir', outputDir);
    }
  }, [outputDir]);

  useEffect(() => {
    const checkServer = async () => {
        try {
            const res = await fetch('http://localhost:8000/docs', { method: 'HEAD' });
            setIsServerOnline(res.ok);
        } catch {
            setIsServerOnline(false);
        }
    };
    if (isOpen) {
        checkServer();
        const interval = setInterval(checkServer, 5000);
        return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleSelectFile = async (setter: (path: string) => void) => {
    try {
        const res = await fetch('http://localhost:8000/api/utils/select-file');
        const data = await res.json();
        if (data.path) {
            // Convert backward slashes to forward slashes for consistency
            const path = data.path.replace(/\\/g, '/');
            setter(path);
        }
    } catch (e) {
        console.error('Failed to select file:', e);
        alert('파일 선택 창을 열 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    addLog('⛔ 사용자에 의해 자동화가 중지되었습니다.', 'warning');
  };

  const runAutomation = async () => {
    const promptList = prompts.split('\n').map(p => p.trim()).filter(p => p);
    if (promptList.length === 0) {
      addLog('❌ 프롬프트가 입력되지 않았습니다.', 'error');
      return;
    }

    setIsRunning(true);
    setLogs([]); // Clear logs on start? Optional
    addLog(`🚀 자동화 시작... (프롬프트 ${promptList.length}개, 각 ${imagesPerPrompt}장)`, 'info');
    
    // Calculate total
    const total = promptList.length * imagesPerPrompt;
    setTotalSteps(total);
    setCurrentStep(0);
    setProgress(0);

    abortControllerRef.current = new AbortController();
    let globalIndex = startIndex;

    try {
      for (let i = 0; i < promptList.length; i++) {
        const prompt = promptList[i];
        
        for (let j = 0; j < imagesPerPrompt; j++) {
          if (!isRunning && !abortControllerRef.current) break; // Double check

          const stepNum = (i * imagesPerPrompt) + j + 1;
          setCurrentStep(stepNum);
          setProgress((stepNum / total) * 100);

          const filename = `${prefix}_${String(globalIndex).padStart(4, '0')}.jpg`;

          // Detect if references are being used
          const hasReferences = !!(subjectPath || stylePath || compositionPath);

          // Apply the global prompt logic
          const optimizedPrompt = buildFinalPrompt(
              prompt,      // treat input as scene description
              '',          // no separate style prompt in this tool
              {},          // empty consistency settings
              hasReferences
          );
          
          addLog(`생성 중 [${stepNum}/${total}]: ${filename} - "${optimizedPrompt.substring(0, 30)}..."`, 'info');

          try {
            const bodyPayload: any = {
              prompt: optimizedPrompt,
              output_dir: outputDir,
              filename,
              mode, // api or dom
            };

            // Add references if selected
            if (subjectPath) bodyPayload.subject_path = subjectPath;
            if (stylePath) bodyPayload.style_path = stylePath;
            if (compositionPath) bodyPayload.composition_path = compositionPath;

            const response = await fetch('http://localhost:8000/api/generate-image-queued', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload),
              signal: abortControllerRef.current?.signal
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data.success) {
                addLog(`✅ 성공: ${data.image_url || data.full_path}`, 'success');
            } else {
                 addLog(`❌ 실패: ${data?.error || '알 수 없는 오류'}`, 'error');
            }

          } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
              throw new Error('중지됨');
            }
            const errMsg = err instanceof Error ? err.message : String(err);
            addLog(`❌ 오류: ${errMsg}`, 'error');
          }

          globalIndex++;
          
          if (stepNum < total) {
              addLog(`⏳ ${waitKey}초 대기 중...`, 'info');
              await new Promise(resolve => setTimeout(resolve, waitKey * 1000));
          }
        }
      }
      addLog('🎉 자동화 작업이 완료되었습니다!', 'success');
    } catch (e: any) {
       addLog(`⏹️ 중지됨: ${e.message}`, 'warning');
    } finally {
       setIsRunning(false);
       abortControllerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[80vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Whisk 자동화 도구 (Pro)</h2>
                {isServerOnline ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-medium">SERVER ON</span>
                ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium animate-pulse">SERVER OFF</span>
                )}
            </div>
            <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Settings */}
            <div className="w-80 border-r border-border p-6 bg-card/30 overflow-y-auto space-y-6">
                
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted flex items-center gap-2">
                         <Settings className="w-4 h-4" /> 생성 설정
                    </h3>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-muted">모드 (Mode)</label>
                        <select 
                            value={mode} 
                            onChange={(e) => setMode(e.target.value as 'api' | 'dom')}
                            className="w-full bg-background border border-border rounded p-2 text-sm"
                        >
                            <option value="api">⚡ API 모드 (빠름 & 안정적)</option>
                            <option value="dom">🐢 DOM 모드 (브라우저 제어)</option>
                        </select>
                        <p className="text-[10px] text-muted">API 모드는 캐시된 인증을, DOM 모드는 크롬 브라우저를 사용합니다.</p>
                    </div>

                    <Input 
                        label="프롬프트 당 생성 수 (장)" 
                        type="number" 
                        value={imagesPerPrompt} 
                        onChange={(e) => setImagesPerPrompt(parseInt(e.target.value) || 1)}
                    />
                     <Input 
                        label="대기 시간 (초)" 
                        type="number" 
                        value={waitKey} 
                        onChange={(e) => setWaitKey(parseInt(e.target.value) || 5)}
                    />
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted flex items-center gap-2">
                         <FolderOpen className="w-4 h-4" /> 래퍼런스 이미지 (선택)
                    </h3>
                    
                    {/* Subject Reference */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted">피사체 (Subject)</label>
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-background border border-border rounded p-2 text-sm text-muted-foreground truncate"
                                value={subjectPath} 
                                readOnly
                                placeholder="파일 선택..."
                            />
                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleSelectFile(setSubjectPath)}>
                                선택
                            </Button>
                             {subjectPath && (
                                <Button variant="ghost" size="sm" className="shrink-0 text-red-400" onClick={() => setSubjectPath('')}>
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Style Reference */}
                     <div className="space-y-1">
                        <label className="text-xs text-muted">스타일 (Style)</label>
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-background border border-border rounded p-2 text-sm text-muted-foreground truncate"
                                value={stylePath} 
                                readOnly
                                placeholder="파일 선택..."
                            />
                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleSelectFile(setStylePath)}>
                                선택
                            </Button>
                             {stylePath && (
                                <Button variant="ghost" size="sm" className="shrink-0 text-red-400" onClick={() => setStylePath('')}>
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Composition Reference */}
                     <div className="space-y-1">
                        <label className="text-xs text-muted">구도 (Composition)</label>
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-background border border-border rounded p-2 text-sm text-muted-foreground truncate"
                                value={compositionPath} 
                                readOnly
                                placeholder="파일 선택..."
                            />
                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleSelectFile(setCompositionPath)}>
                                선택
                            </Button>
                             {compositionPath && (
                                <Button variant="ghost" size="sm" className="shrink-0 text-red-400" onClick={() => setCompositionPath('')}>
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted flex items-center gap-2">
                         <FolderOpen className="w-4 h-4" /> 파일 저장 설정
                    </h3>
                    <Input 
                        label="시작 번호 (인덱스)" 
                        type="number" 
                        value={startIndex} 
                        onChange={(e) => setStartIndex(parseInt(e.target.value) || 1)}
                    />
                     <Input 
                        label="파일명 접두사 (Prefix)" 
                        value={prefix} 
                        onChange={(e) => setPrefix(e.target.value)}
                    />
                     <div className="space-y-1">
                        <label className="text-xs text-muted">저장 폴더 경로</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-background border border-border rounded p-2 text-sm"
                                value={outputDir} 
                                onChange={(e) => setOutputDir(e.target.value)}
                                placeholder="public/uploads/..."
                            />
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="w-9 h-9 p-0 flex items-center justify-center shrink-0" 
                                onClick={async () => {
                                    try {
                                        const res = await fetch('http://localhost:8000/api/utils/select-folder');
                                        const data = await res.json();
                                        if (data.path) {
                                            const path = data.path.replace(/\\/g, '/');
                                            setOutputDir(path);
                                        }
                                    } catch (e) {
                                        console.error('Failed to select folder:', e);
                                        alert('폴더 선택 창을 열 수 없습니다.');
                                    }
                                }}
                                title="폴더 선택"
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Prompts & Logs */}
            <div className="flex-1 flex flex-col bg-background">
                {/* Prompts Area */}
                <div className="flex-1 p-6 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-muted flex items-center gap-2">
                            <FileText className="w-4 h-4" /> 프롬프트 대기열 (Queue)
                        </label>
                        <span className="text-xs text-muted">한 줄에 하나의 프롬프트를 입력하세요</span>
                    </div>
                    <textarea 
                        className="flex-1 w-full bg-card border border-border rounded-lg p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-primary/50 outline-none"
                        placeholder={`프롬프트를 입력하세요...\n예시:\nA futuristic city with flying cars\nA calm zen garden in spring`}
                        value={prompts}
                        onChange={(e) => setPrompts(e.target.value)}
                        disabled={isRunning}
                    />
                </div>

                {/* Status Bar */}
                <div className="h-16 border-t border-border px-6 flex items-center justify-between bg-card/50">
                    <div className="flex items-center gap-4 flex-1 mr-8">
                        {isRunning ? (
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs text-muted">
                                    <span>진행 중... {currentStep}/{totalSteps}</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <span className="text-sm text-muted">준비 완료</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isRunning ? (
                            <Button variant="danger" onClick={handleStop} icon={<Square className="w-4 h-4 fill-current"/>}>
                                중지 (Stop)
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={runAutomation} icon={<Play className="w-4 h-4 fill-current"/>}>
                                자동화 시작 (Start)
                            </Button>
                        )}
                    </div>
                </div>

                {/* Logs Console */}
                <div className="h-48 border-t border-border bg-black/90 p-4 overflow-y-auto font-mono text-xs">
                    <div className="flex items-center gap-2 text-muted mb-2 sticky top-0 bg-black/90 pb-2 border-b border-white/10">
                        <Terminal className="w-3 h-3" />
                        <span>Console Output</span>
                    </div>
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className={`flex gap-2 ${
                                log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                log.type === 'warning' ? 'text-yellow-400' :
                                'text-gray-400'
                            }`}>
                                <span className="opacity-50">[{log.timestamp}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
