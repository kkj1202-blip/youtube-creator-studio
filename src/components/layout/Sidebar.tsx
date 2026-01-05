'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Image,
  MessageSquare,
  FileText,
  Scissors,
  TrendingUp,
  BarChart3,
  Calendar,
  FolderOpen,
  Music,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'editor', label: '영상 제작기', icon: <Film className="w-5 h-5" />, href: '/' },
];

const toolsNavItems: NavItem[] = [
  { id: 'thumbnail', label: '썸네일 생성기', icon: <Image className="w-5 h-5" />, href: '/tools/thumbnail' },
  { id: 'subtitle', label: '자막 생성기', icon: <MessageSquare className="w-5 h-5" />, href: '/tools/subtitle' },
  { id: 'script', label: '대본 작성 AI', icon: <FileText className="w-5 h-5" />, href: '/tools/script' },
  { id: 'clip', label: '롱폼→쇼츠 변환', icon: <Scissors className="w-5 h-5" />, href: '/tools/clip' },
];

const analysisNavItems: NavItem[] = [
  { id: 'trend', label: '트렌드 분석', icon: <TrendingUp className="w-5 h-5" />, href: '/analysis/trend' },
  { id: 'comments', label: '댓글 분석', icon: <MessageSquare className="w-5 h-5" />, href: '/analysis/comments' },
  { id: 'revenue', label: '수익 대시보드', icon: <BarChart3 className="w-5 h-5" />, href: '/analysis/revenue' },
];

const manageNavItems: NavItem[] = [
  { id: 'calendar', label: '콘텐츠 캘린더', icon: <Calendar className="w-5 h-5" />, href: '/manage/calendar' },
  { id: 'files', label: '소스 파일 정리', icon: <FolderOpen className="w-5 h-5" />, href: '/manage/files' },
  { id: 'bgm', label: 'BGM 라이브러리', icon: <Music className="w-5 h-5" />, href: '/manage/bgm' },
];

const NavSection: React.FC<{ title: string; items: NavItem[]; collapsed: boolean }> = ({
  title,
  items,
  collapsed,
}) => {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-primary/20 text-primary border-l-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-card-hover'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className={isActive ? 'text-primary' : ''}>{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold gradient-text whitespace-nowrap"
              >
                Creator Studio
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        <NavSection title="메인" items={mainNavItems} collapsed={!sidebarOpen} />
        <NavSection title="제작 도구" items={toolsNavItems} collapsed={!sidebarOpen} />
        <NavSection title="분석" items={analysisNavItems} collapsed={!sidebarOpen} />
        <NavSection title="관리" items={manageNavItems} collapsed={!sidebarOpen} />
      </div>

      {/* Settings & Collapse */}
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
            text-muted-foreground hover:text-foreground hover:bg-card-hover
            ${!sidebarOpen ? 'justify-center' : ''}
          `}
        >
          <Settings className="w-5 h-5" />
          {sidebarOpen && <span className="text-sm font-medium">설정</span>}
        </Link>
        
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
            text-muted-foreground hover:text-foreground hover:bg-card-hover
            ${!sidebarOpen ? 'justify-center' : ''}
          `}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">접기</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
