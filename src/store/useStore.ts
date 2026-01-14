'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Scene,
  Settings,
  Template,
  ProjectVersion,
  AspectRatio,
  ImageStyle,
  TransitionType,
  KenBurnsEffect,
  MotionEffect,
  EmotionTag,
  SubtitleStyle,
  ElevenLabsAccount,
  RenderSettings,
  TTSEngine,
} from '@/types';

// ==================== 기본값 ====================

const defaultSubtitleStyle: SubtitleStyle = {
  fontFamily: 'Noto Sans KR',
  fontSize: 24,
  fontColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  position: 'bottom',
  bold: true,
  italic: false,
  outline: true,
  outlineColor: '#000000',
};

const defaultSettings: Settings = {
  kieApiKey: '',
  elevenLabsAccounts: [
    { name: '계정 1', apiKey: '', voices: [], isActive: true },
    { name: '계정 2', apiKey: '', voices: [], isActive: false },
  ],
  youtubeApiKey: '',
  // LLM API 키
  geminiApiKey: '',
  openaiApiKey: '',
  llmProvider: 'gemini',
  // Replicate API 키
  replicateApiKey: '',
  defaultAspectRatio: '16:9',
  defaultImageStyle: 'realistic',
  defaultVoiceId: undefined,
  // 기본 즐겨찾기 보이스 3개 (사용자 제공)
  favoriteVoices: [
    { id: '8jHHF8rMqMlg8if2mOUe', name: '한 여성', description: '여성 보이스' },
    { id: 'CxErO97xpQgQXYmapDKX', name: '테오 남성', description: '남성 보이스' },
    { id: 'uyVNoMrnUku1dZyVEXwD', name: '안나킴 여성', description: '여성 보이스' },
  ],
  // 마지막 사용 설정 (자동 저장)
  lastUsedSettings: {
    ttsEngine: 'elevenlabs',
    voiceId: '8jHHF8rMqMlg8if2mOUe', // 한 여성 기본
    voiceSpeed: 1.0,
    emotion: 'normal',
    transition: 'fade',
    kenBurns: 'zoom-in',
    subtitleEnabled: true,
  },
  autoSaveInterval: 30,
  maxVersionHistory: 10,
};

const defaultRenderSettings: RenderSettings = {
  quality: 'high',
  resolution: '1080p',
  fps: 30,
  stabilization: true,
  denoiseAudio: true,
  denoiseVideo: false,
  sharpness: 50,
  bitrate: 'high',
};

// 마지막 사용 설정을 적용한 씬 생성
const createDefaultScene = (order: number, script: string = '', lastUsed?: Settings['lastUsedSettings']): Scene => ({
  id: uuidv4(),
  order,
  script,
  imageSource: 'none',
  audioGenerated: false,
  rendered: false,
  voiceId: lastUsed?.voiceId,
  voiceSpeed: lastUsed?.voiceSpeed ?? 1.0,
  emotion: lastUsed?.emotion ?? 'normal',
  ttsEngine: lastUsed?.ttsEngine ?? 'elevenlabs',
  postAudioGap: 0.5,
  transition: lastUsed?.transition ?? 'fade',
  transitionDuration: 0.5,
  kenBurns: lastUsed?.kenBurns ?? 'zoom-in',
  kenBurnsSpeed: 1.0,
  kenBurnsZoom: 20,
  motionEffect: 'none',
  motionIntensity: 1.0,
  combineEffects: true,
  subtitleEnabled: lastUsed?.subtitleEnabled ?? true,
  isProcessing: false,
});

const createDefaultProject = (name: string = '새 프로젝트'): Project => ({
  id: uuidv4(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aspectRatio: '16:9',
  imageStyle: 'realistic',
  // 마스터 이미지 스타일 (2026 라이브러리)
  masterImageStyleId: undefined,
  masterImageStylePrompt: undefined,
  // 이미지 일관성 설정
  imageConsistency: {
    characterDescription: undefined,
    backgroundDescription: undefined,
    colorPalette: undefined,
    artDirection: undefined,
  },
  scenes: [],
  defaultVoiceSpeed: 1.0,
  defaultEmotion: 'normal',
  elevenLabsAccountIndex: 0,
  defaultTransition: 'fade',
  defaultKenBurns: 'zoom-in',
  defaultKenBurnsSpeed: 1.0,
  defaultKenBurnsZoom: 20,
  defaultMotionEffect: 'none',
  defaultMotionIntensity: 1.0,
  defaultCombineEffects: true,
  defaultPostAudioGap: 0.5,
  defaultTTSEngine: 'elevenlabs',
  bgmEnabled: false,
  bgmVolume: 0.3,
  subtitleEnabled: true,
  subtitleStyle: defaultSubtitleStyle,
  renderSettings: defaultRenderSettings,
  renderQuality: 'high',
});

// ==================== 스토어 타입 ====================

interface AppState {
  // 현재 프로젝트
  currentProject: Project | null;
  
  // 저장된 프로젝트 목록
  projects: Project[];
  
  // 템플릿
  templates: Template[];
  
  // 설정
  settings: Settings;
  
  // 버전 히스토리
  versionHistory: ProjectVersion[];
  
  // UI 상태
  activeSceneId: string | null;
  sidebarOpen: boolean;
  currentTab: 'editor' | 'preview' | 'settings';
  
  // 자동 저장 타이머
  lastSavedAt: string | null;
  
  // ==================== 프로젝트 액션 ====================
  createProject: (name?: string) => void;
  loadProject: (projectId: string) => void;
  saveProject: () => void;
  deleteProject: (projectId: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  duplicateProject: (projectId: string) => void;
  
  // ==================== 씬 액션 ====================
  parseScriptToScenes: (script: string) => void;
  addScene: (afterSceneId?: string) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  duplicateScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  setActiveScene: (sceneId: string | null) => void;
  
  // ==================== 일괄 작업 액션 ====================
  generateAllImages: () => Promise<void>;
  generateAllAudio: () => Promise<void>;
  renderAllScenes: () => Promise<void>;
  applyToAllScenes: (updates: Partial<Scene>) => void;
  
  // ==================== 템플릿 액션 ====================
  saveAsTemplate: (name: string, description?: string) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  
  // ==================== 설정 액션 ====================
  updateSettings: (updates: Partial<Settings>) => void;
  updateElevenLabsAccount: (index: number, account: Partial<ElevenLabsAccount>) => void;
  toggleAccountActive: (index: number) => void;
  toggleVoiceFavorite: (accountIndex: number, voiceId: string) => void;
  updateVoiceCategory: (accountIndex: number, voiceId: string, category: string) => void;
  getFavoriteVoices: () => { accountIndex: number; voice: import('@/types').VoiceOption }[];
  getActiveAccount: () => { index: number; account: ElevenLabsAccount } | null;
  
  // 커스텀 즐겨찾기 보이스 관리
  addFavoriteVoice: (voice: import('@/types').FavoriteVoice) => void;
  removeFavoriteVoice: (voiceId: string) => void;
  updateFavoriteVoice: (voiceId: string, updates: Partial<import('@/types').FavoriteVoice>) => void;
  
  // ==================== 버전 히스토리 액션 ====================
  saveVersion: () => void;
  restoreVersion: (versionId: string) => void;
  clearOldVersions: () => void;
  
  // ==================== UI 액션 ====================
  setSidebarOpen: (open: boolean) => void;
  setCurrentTab: (tab: 'editor' | 'preview' | 'settings') => void;
}

// ==================== 스토어 구현 ====================

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      currentProject: null,
      projects: [],
      templates: [],
      settings: defaultSettings,
      versionHistory: [],
      activeSceneId: null,
      sidebarOpen: true,
      currentTab: 'editor',
      lastSavedAt: null,

      // ==================== 프로젝트 액션 ====================
      
      createProject: (name) => {
        const newProject = createDefaultProject(name);
        set((state) => ({
          currentProject: newProject,
          projects: [...state.projects, newProject],
          activeSceneId: null,
        }));
      },

      loadProject: (projectId) => {
        const { projects } = get();
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          set({
            currentProject: { ...project },
            activeSceneId: project.scenes[0]?.id || null,
          });
        }
      },

      saveProject: () => {
        const { currentProject, projects } = get();
        if (!currentProject) return;

        const updatedProject = {
          ...currentProject,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          currentProject: updatedProject,
          projects: state.projects.map((p) =>
            p.id === updatedProject.id ? updatedProject : p
          ),
          lastSavedAt: new Date().toISOString(),
        }));

        // 버전 저장
        get().saveVersion();
      },

      deleteProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProject:
            state.currentProject?.id === projectId ? null : state.currentProject,
          versionHistory: state.versionHistory.filter(
            (v) => v.projectId !== projectId
          ),
        }));
      },

      updateProject: (updates) => {
        set((state) => ({
          currentProject: state.currentProject
            ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
            : null,
        }));
      },

      duplicateProject: (projectId) => {
        const { projects } = get();
        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const duplicated: Project = {
          ...project,
          id: uuidv4(),
          name: `${project.name} (복사본)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scenes: project.scenes.map((s) => ({ ...s, id: uuidv4() })),
        };

        set((state) => ({
          projects: [...state.projects, duplicated],
        }));
      },

      // ==================== 씬 액션 ====================

      parseScriptToScenes: (script) => {
        const { settings } = get();
        const lines = script.split('\n\n').filter((line) => line.trim());
        const scenes = lines.map((line, index) =>
          createDefaultScene(index, line.trim(), settings.lastUsedSettings)
        );

        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                scenes,
                updatedAt: new Date().toISOString(),
              }
            : null,
          activeSceneId: scenes[0]?.id || null,
        }));
      },

      addScene: (afterSceneId) => {
        set((state) => {
          if (!state.currentProject) return state;

          const scenes = [...state.currentProject.scenes];
          let insertIndex = scenes.length;

          if (afterSceneId) {
            const afterIndex = scenes.findIndex((s) => s.id === afterSceneId);
            if (afterIndex !== -1) {
              insertIndex = afterIndex + 1;
            }
          }

          const newScene = createDefaultScene(insertIndex, '', state.settings.lastUsedSettings);
          scenes.splice(insertIndex, 0, newScene);

          // 순서 재정렬
          const reorderedScenes = scenes.map((s, i) => ({ ...s, order: i }));

          return {
            currentProject: {
              ...state.currentProject,
              scenes: reorderedScenes,
              updatedAt: new Date().toISOString(),
            },
            activeSceneId: newScene.id,
          };
        });
      },

      updateScene: (sceneId, updates) => {
        set((state) => {
          if (!state.currentProject) return state;

          const scenes = state.currentProject.scenes.map((s) =>
            s.id === sceneId ? { ...s, ...updates } : s
          );

          // 마지막 사용 설정 업데이트 (음성/영상 관련 설정만)
          const lastUsedUpdates: Partial<Settings['lastUsedSettings']> = {};
          if (updates.ttsEngine !== undefined) lastUsedUpdates.ttsEngine = updates.ttsEngine;
          if (updates.voiceId !== undefined) lastUsedUpdates.voiceId = updates.voiceId;
          if (updates.voiceSpeed !== undefined) lastUsedUpdates.voiceSpeed = updates.voiceSpeed;
          if (updates.emotion !== undefined) lastUsedUpdates.emotion = updates.emotion;
          if (updates.transition !== undefined) lastUsedUpdates.transition = updates.transition;
          if (updates.kenBurns !== undefined) lastUsedUpdates.kenBurns = updates.kenBurns;
          if (updates.subtitleEnabled !== undefined) lastUsedUpdates.subtitleEnabled = updates.subtitleEnabled;

          const newSettings = Object.keys(lastUsedUpdates).length > 0
            ? {
                ...state.settings,
                lastUsedSettings: {
                  ...state.settings.lastUsedSettings,
                  ...lastUsedUpdates,
                },
              }
            : state.settings;

          return {
            currentProject: {
              ...state.currentProject,
              scenes,
              updatedAt: new Date().toISOString(),
            },
            settings: newSettings,
          };
        });
      },

      deleteScene: (sceneId) => {
        set((state) => {
          if (!state.currentProject) return state;

          const scenes = state.currentProject.scenes
            .filter((s) => s.id !== sceneId)
            .map((s, i) => ({ ...s, order: i }));

          const newActiveId =
            state.activeSceneId === sceneId
              ? scenes[0]?.id || null
              : state.activeSceneId;

          return {
            currentProject: {
              ...state.currentProject,
              scenes,
              updatedAt: new Date().toISOString(),
            },
            activeSceneId: newActiveId,
          };
        });
      },

      duplicateScene: (sceneId) => {
        set((state) => {
          if (!state.currentProject) return state;

          const sceneIndex = state.currentProject.scenes.findIndex(
            (s) => s.id === sceneId
          );
          if (sceneIndex === -1) return state;

          const originalScene = state.currentProject.scenes[sceneIndex];
          const duplicatedScene: Scene = {
            ...originalScene,
            id: uuidv4(),
            audioUrl: undefined,
            audioGenerated: false,
            videoUrl: undefined,
            rendered: false,
            isProcessing: false,
            error: undefined,
          };

          const scenes = [...state.currentProject.scenes];
          scenes.splice(sceneIndex + 1, 0, duplicatedScene);

          const reorderedScenes = scenes.map((s, i) => ({ ...s, order: i }));

          return {
            currentProject: {
              ...state.currentProject,
              scenes: reorderedScenes,
              updatedAt: new Date().toISOString(),
            },
            activeSceneId: duplicatedScene.id,
          };
        });
      },

      reorderScenes: (fromIndex, toIndex) => {
        set((state) => {
          if (!state.currentProject) return state;

          const scenes = [...state.currentProject.scenes];
          const [movedScene] = scenes.splice(fromIndex, 1);
          scenes.splice(toIndex, 0, movedScene);

          const reorderedScenes = scenes.map((s, i) => ({ ...s, order: i }));

          return {
            currentProject: {
              ...state.currentProject,
              scenes: reorderedScenes,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      setActiveScene: (sceneId) => {
        set({ activeSceneId: sceneId });
      },

      // ==================== 일괄 작업 액션 ====================

      generateAllImages: async () => {
        const { currentProject, settings } = get();
        if (!currentProject) {
          console.error('[Store] generateAllImages: No current project');
          return;
        }
        if (!settings.kieApiKey) {
          console.error('[Store] generateAllImages: No API key');
          alert('설정에서 이미지 생성 API 키를 입력하세요.');
          return;
        }

        console.log('[Store] generateAllImages: Starting...');
        try {
          const { generateAllImages } = await import('@/lib/api/batchProcessor');
          const result = await generateAllImages(
            currentProject,
            settings.kieApiKey,
            (progress) => {
              console.log(`[Store] Image progress: ${progress.completed}/${progress.total}`);
            },
            (sceneId, updates) => {
              get().updateScene(sceneId, updates);
            }
          );
          console.log(`[Store] generateAllImages complete: ${result.completed} success, ${result.failed} failed`);
          if (result.failed > 0) {
            alert(`이미지 생성 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
          }
        } catch (error) {
          console.error('[Store] generateAllImages error:', error);
          alert('이미지 생성 중 오류가 발생했습니다.');
        }
      },

      generateAllAudio: async () => {
        const { currentProject, settings } = get();
        if (!currentProject) {
          console.error('[Store] generateAllAudio: No current project');
          return;
        }

        // 활성 ElevenLabs 계정 찾기
        const activeAccountIndex = settings.elevenLabsAccounts.findIndex(
          (acc) => acc.isActive && acc.apiKey
        );
        if (activeAccountIndex === -1) {
          console.error('[Store] generateAllAudio: No active ElevenLabs account');
          alert('설정에서 ElevenLabs API 키를 입력하고 계정을 활성화하세요.');
          return;
        }

        const apiKey = settings.elevenLabsAccounts[activeAccountIndex].apiKey;
        const defaultVoiceId = currentProject.defaultVoiceId ||
          settings.elevenLabsAccounts[activeAccountIndex].voices[0]?.id ||
          settings.favoriteVoices?.[0]?.id;

        if (!defaultVoiceId) {
          alert('기본 보이스를 선택하세요.');
          return;
        }

        console.log('[Store] generateAllAudio: Starting...');
        try {
          const { generateAllVoices } = await import('@/lib/api/batchProcessor');
          const result = await generateAllVoices(
            currentProject,
            apiKey,
            defaultVoiceId,
            (progress) => {
              console.log(`[Store] Audio progress: ${progress.completed}/${progress.total}`);
            },
            (sceneId, updates) => {
              get().updateScene(sceneId, updates);
            }
          );
          console.log(`[Store] generateAllAudio complete: ${result.completed} success, ${result.failed} failed`);
          if (result.failed > 0) {
            alert(`음성 생성 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
          }
        } catch (error) {
          console.error('[Store] generateAllAudio error:', error);
          alert('음성 생성 중 오류가 발생했습니다.');
        }
      },

      renderAllScenes: async () => {
        const { currentProject } = get();
        if (!currentProject) {
          console.error('[Store] renderAllScenes: No current project');
          return;
        }

        // 브라우저 환경 체크
        if (typeof window === 'undefined') {
          console.error('[Store] renderAllScenes: Not in browser environment');
          alert('렌더링은 브라우저에서만 가능합니다.');
          return;
        }

        console.log('[Store] renderAllScenes: Starting...');
        try {
          const { renderAllScenes } = await import('@/lib/api/batchProcessor');
          const result = await renderAllScenes(
            currentProject,
            (progress) => {
              console.log(`[Store] Render progress: ${progress.completed}/${progress.total}`);
            },
            (sceneId, updates) => {
              get().updateScene(sceneId, updates);
            }
          );
          console.log(`[Store] renderAllScenes complete: ${result.completed} success, ${result.failed} failed`);
          if (result.failed > 0) {
            alert(`렌더링 완료: ${result.completed}개 성공, ${result.failed}개 실패`);
          } else if (result.completed > 0) {
            alert('모든 씬 렌더링이 완료되었습니다!');
          }
        } catch (error) {
          console.error('[Store] renderAllScenes error:', error);
          alert('렌더링 중 오류가 발생했습니다.');
        }
      },

      applyToAllScenes: (updates) => {
        set((state) => {
          if (!state.currentProject) return state;

          const scenes = state.currentProject.scenes.map((s) => ({
            ...s,
            ...updates,
          }));

          return {
            currentProject: {
              ...state.currentProject,
              scenes,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },

      // ==================== 템플릿 액션 ====================

      saveAsTemplate: (name, description) => {
        const { currentProject } = get();
        if (!currentProject) return;

        const template: Template = {
          id: uuidv4(),
          name,
          description,
          createdAt: new Date().toISOString(),
          aspectRatio: currentProject.aspectRatio,
          imageStyle: currentProject.imageStyle,
          customStylePrompt: currentProject.customStylePrompt,
          defaultVoiceId: currentProject.defaultVoiceId,
          defaultVoiceSpeed: currentProject.defaultVoiceSpeed,
          defaultEmotion: currentProject.defaultEmotion,
          defaultTransition: currentProject.defaultTransition,
          defaultKenBurns: currentProject.defaultKenBurns,
          defaultPostAudioGap: currentProject.defaultPostAudioGap,
          bgmEnabled: currentProject.bgmEnabled,
          subtitleEnabled: currentProject.subtitleEnabled,
          subtitleStyle: currentProject.subtitleStyle,
        };

        set((state) => ({
          templates: [...state.templates, template],
        }));
      },

      loadTemplate: (templateId) => {
        const { templates, currentProject } = get();
        const template = templates.find((t) => t.id === templateId);
        if (!template || !currentProject) return;

        set((state) => ({
          currentProject: {
            ...currentProject,
            aspectRatio: template.aspectRatio,
            imageStyle: template.imageStyle,
            customStylePrompt: template.customStylePrompt,
            defaultVoiceId: template.defaultVoiceId,
            defaultVoiceSpeed: template.defaultVoiceSpeed,
            defaultEmotion: template.defaultEmotion,
            defaultTransition: template.defaultTransition,
            defaultKenBurns: template.defaultKenBurns,
            defaultPostAudioGap: template.defaultPostAudioGap,
            bgmEnabled: template.bgmEnabled,
            subtitleEnabled: template.subtitleEnabled,
            subtitleStyle: template.subtitleStyle,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      deleteTemplate: (templateId) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
        }));
      },

      // ==================== 설정 액션 ====================

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      updateElevenLabsAccount: (index, account) => {
        set((state) => {
          const accounts = [...state.settings.elevenLabsAccounts];
          accounts[index] = { ...accounts[index], ...account };
          return {
            settings: { ...state.settings, elevenLabsAccounts: accounts },
          };
        });
      },

      toggleAccountActive: (index) => {
        set((state) => {
          const accounts = state.settings.elevenLabsAccounts.map((acc, i) => ({
            ...acc,
            isActive: i === index ? !acc.isActive : acc.isActive,
          }));
          return {
            settings: { ...state.settings, elevenLabsAccounts: accounts },
          };
        });
      },

      toggleVoiceFavorite: (accountIndex, voiceId) => {
        set((state) => {
          const accounts = [...state.settings.elevenLabsAccounts];
          const voices = accounts[accountIndex].voices.map((v) =>
            v.id === voiceId ? { ...v, isFavorite: !v.isFavorite } : v
          );
          accounts[accountIndex] = { ...accounts[accountIndex], voices };
          return {
            settings: { ...state.settings, elevenLabsAccounts: accounts },
          };
        });
      },

      updateVoiceCategory: (accountIndex, voiceId, category) => {
        set((state) => {
          const accounts = [...state.settings.elevenLabsAccounts];
          const voices = accounts[accountIndex].voices.map((v) =>
            v.id === voiceId ? { ...v, category } : v
          );
          accounts[accountIndex] = { ...accounts[accountIndex], voices };
          return {
            settings: { ...state.settings, elevenLabsAccounts: accounts },
          };
        });
      },

      getFavoriteVoices: () => {
        const { settings } = get();
        const favorites: { accountIndex: number; voice: import('@/types').VoiceOption }[] = [];
        settings.elevenLabsAccounts.forEach((account, accountIndex) => {
          account.voices
            .filter((v) => v.isFavorite)
            .forEach((voice) => favorites.push({ accountIndex, voice }));
        });
        return favorites;
      },

      getActiveAccount: () => {
        const { settings } = get();
        const index = settings.elevenLabsAccounts.findIndex((acc) => acc.isActive && acc.apiKey);
        if (index === -1) return null;
        return { index, account: settings.elevenLabsAccounts[index] };
      },

      // 커스텀 즐겨찾기 보이스 추가
      addFavoriteVoice: (voice) => {
        set((state) => {
          // 중복 체크
          if (state.settings.favoriteVoices?.some(v => v.id === voice.id)) {
            return state;
          }
          return {
            settings: {
              ...state.settings,
              favoriteVoices: [...(state.settings.favoriteVoices || []), voice],
            },
          };
        });
      },

      // 커스텀 즐겨찾기 보이스 삭제
      removeFavoriteVoice: (voiceId) => {
        set((state) => ({
          settings: {
            ...state.settings,
            favoriteVoices: (state.settings.favoriteVoices || []).filter(v => v.id !== voiceId),
          },
        }));
      },

      // 커스텀 즐겨찾기 보이스 수정
      updateFavoriteVoice: (voiceId, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            favoriteVoices: (state.settings.favoriteVoices || []).map(v =>
              v.id === voiceId ? { ...v, ...updates } : v
            ),
          },
        }));
      },

      // ==================== 버전 히스토리 액션 ====================

      saveVersion: () => {
        const { currentProject, versionHistory, settings } = get();
        if (!currentProject) return;

        const version: ProjectVersion = {
          id: uuidv4(),
          projectId: currentProject.id,
          savedAt: new Date().toISOString(),
          data: { ...currentProject },
        };

        // 같은 프로젝트의 버전만 필터링
        const projectVersions = versionHistory.filter(
          (v) => v.projectId === currentProject.id
        );

        // 최대 버전 수 초과 시 오래된 것 제거
        const otherVersions = versionHistory.filter(
          (v) => v.projectId !== currentProject.id
        );

        let updatedProjectVersions = [...projectVersions, version];
        if (updatedProjectVersions.length > settings.maxVersionHistory) {
          updatedProjectVersions = updatedProjectVersions.slice(
            -settings.maxVersionHistory
          );
        }

        set({
          versionHistory: [...otherVersions, ...updatedProjectVersions],
        });
      },

      restoreVersion: (versionId) => {
        const { versionHistory } = get();
        const version = versionHistory.find((v) => v.id === versionId);
        if (!version) return;

        set((state) => ({
          currentProject: { ...version.data },
          projects: state.projects.map((p) =>
            p.id === version.data.id ? version.data : p
          ),
        }));
      },

      clearOldVersions: () => {
        const { currentProject, settings } = get();
        if (!currentProject) return;

        set((state) => {
          const projectVersions = state.versionHistory
            .filter((v) => v.projectId === currentProject.id)
            .slice(-settings.maxVersionHistory);

          const otherVersions = state.versionHistory.filter(
            (v) => v.projectId !== currentProject.id
          );

          return {
            versionHistory: [...otherVersions, ...projectVersions],
          };
        });
      },

      // ==================== UI 액션 ====================

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      setCurrentTab: (tab) => {
        set({ currentTab: tab });
      },
    }),
    {
      name: 'youtube-creator-studio',
      partialize: (state) => {
        // 프로젝트 저장 시 용량 최적화
        // URL 유효성 체크 (blob:, data: 제외, 외부 URL만 저장)
        const isValidExternalUrl = (url: string | undefined): boolean => {
          if (!url) return false;
          if (url.startsWith('blob:')) return false;
          if (url.startsWith('data:')) return false;
          // http/https URL만 저장
          return url.startsWith('http://') || url.startsWith('https://');
        };

        const optimizeScene = (scene: Scene) => ({
          // 필수 필드만 저장
          id: scene.id,
          order: scene.order,
          script: scene.script,
          imagePrompt: scene.imagePrompt,
          // 이미지 URL: 외부 URL만 저장 (blob, data URL 제외)
          imageUrl: isValidExternalUrl(scene.imageUrl) ? scene.imageUrl : undefined,
          imageSource: scene.imageSource,
          // 음성 URL: 외부 URL만 저장 (ElevenLabs 등에서 생성된 URL 보존)
          audioUrl: isValidExternalUrl(scene.audioUrl) ? scene.audioUrl : undefined,
          audioGenerated: isValidExternalUrl(scene.audioUrl) ? scene.audioGenerated : false,
          // 비디오 URL: blob URL이므로 저장하지 않음 (재생성 필요)
          videoUrl: undefined,
          rendered: false,
          // 설정값들
          voiceId: scene.voiceId,
          voiceSpeed: scene.voiceSpeed,
          emotion: scene.emotion,
          ttsEngine: scene.ttsEngine,
          postAudioGap: scene.postAudioGap,
          transition: scene.transition,
          transitionDuration: scene.transitionDuration,
          kenBurns: scene.kenBurns,
          kenBurnsSpeed: scene.kenBurnsSpeed,
          kenBurnsZoom: scene.kenBurnsZoom,
          motionEffect: scene.motionEffect,
          motionIntensity: scene.motionIntensity,
          combineEffects: scene.combineEffects,
          subtitleEnabled: scene.subtitleEnabled,
          subtitleText: scene.subtitleText,
          isProcessing: false,
          error: undefined,
        });

        const optimizeProject = (project: Project) => ({
          ...project,
          scenes: project.scenes.map(optimizeScene),
        });

        // 프로젝트가 너무 많으면 최근 10개만 저장
        const recentProjects = state.projects.slice(-10).map(optimizeProject);

        return {
          projects: recentProjects,
          templates: state.templates.slice(-20), // 템플릿도 최근 20개만
          settings: state.settings,
          // 버전 히스토리는 최근 2개만 저장 (대용량 프로젝트 고려)
          versionHistory: state.versionHistory.slice(-2).map(v => ({
            ...v,
            data: optimizeProject(v.data),
          })),
        };
      },
      // 저장 전 용량 체크
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Store rehydrated:', {
            projects: state.projects?.length || 0,
            templates: state.templates?.length || 0,
          });
        }
      },
    }
  )
);

export default useStore;
