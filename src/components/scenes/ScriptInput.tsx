'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wand2, Upload, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, TextArea, Card } from '@/components/ui';

interface ScriptInputProps {
  onComplete: () => void;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ onComplete }) => {
  const { parseScriptToScenes, currentProject } = useStore();
  const [script, setScript] = useState('');

  const handleParse = () => {
    if (!script.trim()) return;
    parseScriptToScenes(script);
    onComplete();
  };

  const exampleScript = `안녕하세요, 오늘은 인공지능의 미래에 대해 이야기해보겠습니다.

인공지능은 우리 생활의 모든 영역에서 혁명을 일으키고 있습니다.

의료, 교육, 금융 등 다양한 분야에서 AI가 활용되고 있죠.

특히 최근에는 생성형 AI의 발전이 눈부십니다.

앞으로 AI는 더욱 발전하여 우리의 삶을 편리하게 만들어 줄 것입니다.

시청해주셔서 감사합니다. 좋아요와 구독 부탁드립니다!`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          대본 입력
        </h2>
        <p className="text-muted">
          영상의 대본을 입력하세요. 빈 줄(엔터 2번)로 씬을 구분합니다.
        </p>
      </div>

      <Card className="mb-6">
        <TextArea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={`대본을 입력하세요...\n\n빈 줄로 씬을 구분합니다.\n\n예시:\n첫 번째 씬의 대본입니다.\n\n두 번째 씬의 대본입니다.\n\n세 번째 씬의 대본입니다.`}
          rows={12}
          className="text-base"
        />
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted">
            {script.split('\n\n').filter(s => s.trim()).length} 개의 씬 감지됨
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScript(exampleScript)}
          >
            예시 대본 불러오기
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          className="flex-1"
          icon={<Upload className="w-4 h-4" />}
        >
          텍스트 파일 업로드
        </Button>
        
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleParse}
          disabled={!script.trim()}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          씬 분리하기
        </Button>
      </div>

      {/* Tips */}
      <Card className="mt-8 bg-primary/5 border-primary/20">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          작성 팁
        </h3>
        <ul className="text-sm text-muted space-y-2">
          <li>• 각 씬은 <strong className="text-foreground">빈 줄(엔터 2번)</strong>로 구분됩니다</li>
          <li>• 한 씬에 너무 많은 내용을 넣지 마세요 (10~30초 분량 권장)</li>
          <li>• 나레이션 스타일로 작성하면 TTS 품질이 좋아집니다</li>
          <li>• 특수문자나 이모지는 TTS에서 제외될 수 있습니다</li>
        </ul>
      </Card>
    </motion.div>
  );
};

export default ScriptInput;
