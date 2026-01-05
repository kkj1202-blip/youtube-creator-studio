'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '@/store/useStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { sidebarOpen, saveProject, settings, currentProject } = useStore();

  // 자동 저장
  useEffect(() => {
    if (!currentProject) return;

    const interval = setInterval(() => {
      saveProject();
    }, settings.autoSaveInterval * 1000);

    return () => clearInterval(interval);
  }, [currentProject, settings.autoSaveInterval, saveProject]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.2 }}
        className="pt-16 min-h-screen"
      >
        <div className="p-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
};

export default MainLayout;
