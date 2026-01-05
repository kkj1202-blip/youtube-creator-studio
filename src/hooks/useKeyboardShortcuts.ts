'use client';

import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutConfig[];
}

export const shortcutCategories = {
  file: '파일',
  edit: '편집',
  view: '보기',
  playback: '재생',
  navigation: '탐색',
  tools: '도구',
};

export const defaultShortcuts: Omit<ShortcutConfig, 'action'>[] = [
  // 파일 관련
  { key: 's', ctrl: true, description: '프로젝트 저장', category: 'file' },
  { key: 'o', ctrl: true, description: '프로젝트 열기', category: 'file' },
  { key: 'n', ctrl: true, description: '새 프로젝트', category: 'file' },
  { key: 'e', ctrl: true, description: '내보내기', category: 'file' },
  
  // 편집 관련
  { key: 'z', ctrl: true, description: '실행 취소', category: 'edit' },
  { key: 'z', ctrl: true, shift: true, description: '다시 실행', category: 'edit' },
  { key: 'Delete', description: '선택 삭제', category: 'edit' },
  { key: 'a', ctrl: true, description: '전체 선택', category: 'edit' },
  
  // 보기 관련
  { key: 'p', ctrl: true, description: '미리보기', category: 'view' },
  { key: 'f', ctrl: true, shift: true, description: '전체화면', category: 'view' },
  
  // 재생 관련
  { key: ' ', description: '재생/일시정지', category: 'playback' },
  { key: 'ArrowLeft', description: '5초 뒤로', category: 'playback' },
  { key: 'ArrowRight', description: '5초 앞으로', category: 'playback' },
  
  // 탐색 관련
  { key: 'ArrowUp', description: '이전 씬', category: 'navigation' },
  { key: 'ArrowDown', description: '다음 씬', category: 'navigation' },
  { key: '1', ctrl: true, description: '씬 탭으로 이동', category: 'navigation' },
  { key: '2', ctrl: true, description: '설정 탭으로 이동', category: 'navigation' },
  
  // 도구 관련
  { key: 'g', ctrl: true, description: '이미지 생성', category: 'tools' },
  { key: 'Enter', ctrl: true, description: '음성 생성', category: 'tools' },
  { key: 'r', ctrl: true, shift: true, description: '씬 렌더링', category: 'tools' },
  { key: '/', ctrl: true, description: '단축키 도움말', category: 'tools' },
];

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // 입력 필드에서는 단축키 비활성화
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Ctrl+S는 항상 허용
      if (!(event.ctrlKey && event.key === 's')) {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : (!event.ctrlKey && !event.metaKey);
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// 단축키 표시용 유틸
export function formatShortcut(config: Omit<ShortcutConfig, 'action'>): string {
  const parts: string[] = [];
  
  if (config.ctrl) {
    // Mac의 경우 Cmd, 그 외에는 Ctrl
    parts.push(typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (config.shift) parts.push('Shift');
  if (config.alt) parts.push('Alt');
  
  // 특수 키 표시
  let keyDisplay = config.key;
  switch (config.key.toLowerCase()) {
    case ' ': keyDisplay = 'Space'; break;
    case 'arrowleft': keyDisplay = '←'; break;
    case 'arrowright': keyDisplay = '→'; break;
    case 'arrowup': keyDisplay = '↑'; break;
    case 'arrowdown': keyDisplay = '↓'; break;
    case 'delete': keyDisplay = 'Del'; break;
    case 'enter': keyDisplay = '↵'; break;
    default: keyDisplay = config.key.toUpperCase();
  }
  
  parts.push(keyDisplay);
  
  return parts.join(' + ');
}

export default useKeyboardShortcuts;
