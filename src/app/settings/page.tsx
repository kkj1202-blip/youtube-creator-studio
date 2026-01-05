'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { ApiSettings, GeneralSettings } from '@/components/settings';
import { Tabs } from '@/components/ui';

type SettingsTab = 'api' | 'general';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');

  const tabs = [
    { id: 'api', label: 'API 키 설정', icon: <Key className="w-4 h-4" /> },
    { id: 'general', label: '일반 설정', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">설정</h1>
          <p className="text-muted">API 키와 기본 설정을 관리합니다.</p>
        </div>

        <div className="mb-6">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as SettingsTab)}
          />
        </div>

        <div className="max-w-2xl">
          {activeTab === 'api' && <ApiSettings />}
          {activeTab === 'general' && <GeneralSettings />}
        </div>
      </motion.div>
    </MainLayout>
  );
}
