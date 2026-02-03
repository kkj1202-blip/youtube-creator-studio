
'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const StatusPulse: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
      <div className="relative flex h-2.5 w-2.5">
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inline-flex h-full w-full rounded-full bg-emerald-500"
        />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
      </div>
      <span className="text-xs font-medium text-emerald-500 uppercase tracking-wider">
        System Operational
      </span>
      <div className="h-3 w-[1px] bg-white/10 mx-1" />
      <span className="text-xs text-muted-foreground font-mono">
        v2.0.0-alpha
      </span>
    </div>
  );
};
