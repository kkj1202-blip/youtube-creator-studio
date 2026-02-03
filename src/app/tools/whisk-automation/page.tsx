'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import WhiskAutomation from '@/components/tools/WhiskAutomation';

export default function WhiskAutomationPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8">
      {/* 
        WhiskAutomation is designed as a Modal. 
        For the page view, we force it open and redirect on close.
        Since it has a portal/fixed positioning, it might act as an overlay.
        Ideally we should refactor it, but for now we wrap it.
        Or we can render it without the modal wrapper if it supports it, 
        but checking the code it renders `if (!isOpen) return null;` and a fixed overlay.
      */}
      <WhiskAutomation 
        isOpen={true} 
        onClose={() => router.push('/')} 
      />
    </div>
  );
}
