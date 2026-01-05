'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: string[];
}

const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  description,
  icon,
  features = [],
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto py-16 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      
      <h1 className="text-3xl font-bold text-foreground mb-3">
        {title}
      </h1>
      <p className="text-lg text-muted mb-8">
        {description}
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning/20 text-warning rounded-full text-sm font-medium mb-8">
        <Construction className="w-4 h-4" />
        개발 중
      </div>

      {features.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-left mb-8">
          <h3 className="font-semibold text-foreground mb-4">예정된 기능</h3>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted">
                <span className="text-primary">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />}>
          메인으로 돌아가기
        </Button>
      </Link>
    </motion.div>
  );
};

export default ComingSoon;
