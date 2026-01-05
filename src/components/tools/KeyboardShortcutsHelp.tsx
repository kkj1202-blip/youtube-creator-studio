'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command } from 'lucide-react';
import { Modal, Card } from '@/components/ui';
import { defaultShortcuts, formatShortcut, shortcutCategories } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  // 카테고리별로 그룹화
  const groupedShortcuts = defaultShortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof defaultShortcuts>);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⌨️ 키보드 단축키" size="lg">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        <p className="text-sm text-muted">
          Creator Studio에서 사용할 수 있는 키보드 단축키입니다.
          {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') 
            ? ' Mac에서는 Ctrl 대신 ⌘ (Command) 키를 사용합니다.'
            : ''
          }
        </p>

        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {shortcutCategories[category as keyof typeof shortcutCategories] || category}
            </h3>
            <Card className="overflow-hidden">
              <table className="w-full">
                <tbody>
                  {shortcuts.map((shortcut, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-transparent' : 'bg-card-hover/50'}
                    >
                      <td className="py-2 px-4 text-sm">
                        {shortcut.description}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-background rounded border border-border">
                          {formatShortcut(shortcut).split(' + ').map((key, i, arr) => (
                            <React.Fragment key={i}>
                              <span className="px-1">{key}</span>
                              {i < arr.length - 1 && <span className="text-muted">+</span>}
                            </React.Fragment>
                          ))}
                        </kbd>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))}

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">추가 팁</h4>
          <ul className="text-sm text-muted space-y-1">
            <li>• 입력 필드에서는 대부분의 단축키가 비활성화됩니다.</li>
            <li>• Ctrl+S (저장)는 어디서든 작동합니다.</li>
            <li>• 미리보기 모드에서 Space로 재생/일시정지할 수 있습니다.</li>
            <li>• 씬 목록에서 화살표 키로 빠르게 이동할 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
