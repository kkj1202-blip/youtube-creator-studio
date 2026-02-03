
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: 'active' | 'inactive' | 'processing';
  onClick?: () => void;
  className?: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  icon,
  status = 'inactive',
  onClick,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6 cursor-pointer
        bg-card/30 backdrop-blur-xl border border-white/10
        hover:bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10
        transition-all duration-300 group
        ${className}
      `}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            {icon}
          </div>
          {status === 'processing' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Processing
            </div>
          )}
        </div>
        
        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 group-hover:from-primary group-hover:to-secondary transition-all duration-300 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-muted-foreground group-hover:text-muted transition-colors duration-300 line-clamp-2">
          {description}
        </p>
        
        {/* Decorative Sparkle */}
        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/20 blur-3xl group-hover:animate-pulse" />
      </div>
    </motion.div>
  );
};
