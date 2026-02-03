
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Subtitles, 
  Languages, 
  Film, 
  Cpu, 
  Sparkles, 
  Zap,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { ModuleCard } from '@/components/media-core/ModuleCard';
import { StatusPulse } from '@/components/media-core/StatusPulse';
import { gvvaClient, TaskStatus } from '@/lib/api/gvvaClient';
import { useStore } from '@/store/useStore';

export default function NewProgramPage() {
  const { settings, getActiveAccount } = useStore();
  const [isCoreActive, setIsCoreActive] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  // Task State
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    // Check connection to Python Core on mount
    const checkConnection = async () => {
      const active = await gvvaClient.checkHealth();
      setIsCoreActive(active);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Polling Effect
  useEffect(() => {
    if (!taskId || !isPolling) return;

    const poll = async () => {
      try {
        const status = await gvvaClient.pollTaskStatus(taskId);
        setTaskStatus(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsPolling(false);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    const interval = setInterval(poll, 1000); // Poll every 1s
    return () => clearInterval(interval);
  }, [taskId, isPolling]);

  const handleModuleClick = (moduleName: string) => {
    if (!isCoreActive) {
      alert("GVVA 엔진이 오프라인입니다. 터미널에서 백엔드를 실행해주세요.");
      return;
    }
    setActiveModule(moduleName);
    setTaskId(null);
    setTaskStatus(null);
  };

  const startProcessing = async (file: File) => {
    if (!isCoreActive) return;
    
    // Retrieve keys
    const openaiKey = settings.openaiApiKey || settings.geminiApiKey; 
    const activeEleven = getActiveAccount();
    const elevenKey = activeEleven?.account.apiKey;

    if (!openaiKey) {
      alert("OpenAI API Key가 설정되지 않았습니다. 설정 페이지에서 먼저 등록해주세요.");
      return;
    }
    if (!elevenKey) {
      alert("ElevenLabs API Key가 설정되지 않았습니다. 설정 페이지에서 먼저 등록해주세요.");
      return;
    }

    try {
      setTaskStatus({ task_id: '', status: 'queued', progress: 0, message: '초기화 중...' });
      const res = await gvvaClient.processVideo(file, 'ja', {
        openai: openaiKey,
        eleven: elevenKey
      });
      setTaskId(res.task_id);
      setIsPolling(true);
    } catch (err) {
      alert(`작업 시작 오류: ${err}`);
      setTaskStatus(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 relative overflow-hidden font-sans">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <Cpu className={`w-5 h-5 ${isCoreActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-rose-500'}`} />
              <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isCoreActive ? 'text-emerald-400' : 'text-rose-500'}`}>
                {isCoreActive ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60 tracking-tight"
            >
              미디어 워크스테이션
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-white/50 max-w-lg font-light"
            >
              차세대 AI 기반 미디어 프로세싱 스위트. <br/>
              프로젝트와 별도로 독립적인 고성능 작업을 수행합니다.
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <StatusPulse />
          </motion.div>
        </div>

        {/* Modules Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Core Modules */}
          <motion.div variants={item} className="lg:col-span-2">
             <ModuleCard
              title="AI 음성 합성 (TTS)"
              description="ElevenLabs, FishAudio를 사용하여 자연스러운 음성을 생성합니다."
              icon={<Mic className="w-6 h-6 text-indigo-400" />}
              status={activeModule === 'voice' ? 'processing' : 'active'}
              onClick={() => handleModuleClick('voice')}
              className="h-full bg-gradient-to-br from-white/5 to-white/0 border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] transition-all duration-500"
            />
          </motion.div>

          <motion.div variants={item}>
            <ModuleCard
              title="자동 자막 생성"
              description="영상에서 정밀한 타임코드 자막을 추출합니다."
              icon={<Subtitles className="w-6 h-6 text-emerald-400" />}
              onClick={() => handleModuleClick('subtitle')}
              className="hover:border-emerald-500/50 hover:shadow-[0_0_30px_-10px_rgba(52,211,153,0.3)] transition-all duration-500"
            />
          </motion.div>

          <motion.div variants={item}>
            <ModuleCard
              title="뉴럴 번역기"
              description="DeepL 및 LLM을 사용하여 문맥을 파악하는 번역을 제공합니다."
              icon={<Languages className="w-6 h-6 text-blue-400" />}
              onClick={() => handleModuleClick('translator')}
              className="hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(96,165,250,0.3)] transition-all duration-500"
            />
          </motion.div>

          {/* Secondary Row */}
          <motion.div variants={item}>
            <ModuleCard
              title="비디오 렌더러"
              description="WASM 최적화가 적용된 고성능 렌더링 엔진입니다."
              icon={<Film className="w-6 h-6 text-rose-400" />}
              onClick={() => handleModuleClick('renderer')}
              className="hover:border-rose-500/50 hover:shadow-[0_0_30px_-10px_rgba(251,113,133,0.3)] transition-all duration-500"
            />
          </motion.div>

          <motion.div variants={item} className="lg:col-span-2">
             <ModuleCard
              title="원클릭 파이프라인 (GVVA)"
              description="[추천] 번역 -> 더빙 -> 자막 -> 합성을 한번에 자동화합니다."
              icon={<Layers className="w-6 h-6 text-amber-400" />}
              className="h-full border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] transition-all duration-500"
              onClick={() => handleModuleClick('pipeline')}
            />
          </motion.div>

          <motion.div variants={item}>
            <ModuleCard
              title="이펙트 라이브러리"
              description="모션 효과 및 시각 필터 관리."
              icon={<Sparkles className="w-6 h-6 text-purple-400" />}
              onClick={() => handleModuleClick('effects')}
              className="hover:border-purple-500/50 hover:shadow-[0_0_30px_-10px_rgba(192,132,252,0.3)] transition-all duration-500"
            />
          </motion.div>
        </motion.div>

        {/* Active Workspace Area */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <div className="p-1 rounded-3xl bg-gradient-to-br from-white/10 to-white/0">
            <div className="p-8 rounded-[22px] bg-[#0A0A0A] backdrop-blur-xl text-center min-h-[400px] flex flex-col items-center justify-center relative shadow-2xl">
              {!activeModule ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                    <Zap className="w-10 h-10 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-white">작업 대기 중</h2>
                  <p className="text-white/40 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                    위에서 모듈을 선택하거나, <br/>
                    영상 파일을 이곳에 끌어다 놓으세요.
                  </p>
                  
                  <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-500 ${isCoreActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isCoreActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-500'} animate-pulse`} />
                    <span className="text-sm font-medium tracking-wide">
                      {isCoreActive ? '시스템 준비 완료' : '엔진 연결 대기 중...'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full max-w-3xl">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <Layers className="w-6 h-6 text-primary" />
                      활성 모듈: <span className="text-primary uppercase tracking-wider">{activeModule}</span>
                    </h3>
                    <button 
                      onClick={() => {
                        setActiveModule(null);
                        setTaskId(null);
                        setTaskStatus(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-all"
                    >
                      닫기
                    </button>
                  </div>

                  {/* Upload Zone (Show if no task started) */}
                  {!taskStatus && (
                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-16 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if(file) startProcessing(file);
                        }}
                      />
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                        <Film className="w-10 h-10 text-white/50 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xl font-bold mb-2 text-white/90">여기를 클릭하여 파일을 선택하거나<br/>드래그하세요</p>
                      <p className="text-base text-white/40">
                        mp4, mov, avi 지원 <br/>
                        <span className="text-primary/70 text-sm mt-2 block font-medium">
                          자동 실행: 추출 &rarr; STT &rarr; 번역(JP) &rarr; TTS &rarr; 싱크 &rarr; 지문삭제
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Progress View */}
                  {taskStatus && taskStatus.status !== 'completed' && taskStatus.status !== 'failed' && (
                    <div className="text-center p-12 bg-black/40 rounded-2xl border border-white/10 shadow-inner">
                        <div className="mb-8 relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary transition-all duration-500 ease-out" 
                                    strokeDasharray={351.8}
                                    strokeDashoffset={351.8 - (351.8 * taskStatus.progress) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-white">
                                {taskStatus.progress}<span className="text-lg text-white/50 align-top ml-1">%</span>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white animate-pulse">작업 처리 중...</h3>
                        <p className="text-white/50 font-mono text-sm bg-white/5 inline-block px-4 py-1 rounded-full">{taskStatus.message}</p>
                    </div>
                  )}

                  {/* Result View (Video Player) */}
                  {taskStatus && taskStatus.status === 'completed' && taskStatus.result_url && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video relative group ring-1 ring-white/10">
                            <video 
                                src={taskStatus.result_url} 
                                controls 
                                autoPlay 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-950/30 to-emerald-900/10 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
                            <div className="text-left">
                                <h4 className="font-bold text-xl text-emerald-400 flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="w-6 h-6" /> 처리 완료
                                </h4>
                                <p className="text-sm text-emerald-200/60">서버에 안전하게 저장되었습니다.</p>
                            </div>
                            <a 
                                href={taskStatus.result_url} 
                                download 
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] hover:-translate-y-0.5"
                            >
                                <span className="text-xl">⬇</span> 영상 저장하기
                            </a>
                        </div>
                    </div>
                  )}
                  
                  {/* Error View */}
                  {taskStatus && taskStatus.status === 'failed' && (
                     <div className="text-center p-12 bg-red-500/5 rounded-2xl border border-red-500/20 backdrop-blur-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]">
                            <span className="text-4xl">⚠</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-red-400">처리 실패</h3>
                        <p className="text-red-300/70 mb-8 max-w-lg mx-auto bg-red-500/5 p-4 rounded-lg font-mono text-sm border border-red-500/10">{taskStatus.message}</p>
                        <button 
                            onClick={() => setTaskStatus(null)}
                            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-medium transition-all"
                        >
                            다시 시도하기
                        </button>
                     </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
