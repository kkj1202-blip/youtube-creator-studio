'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Key,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Youtube,
  Image as ImageIcon,
  Volume2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button, Input, Card } from '@/components/ui';
import type { VoiceOption } from '@/types';

const ApiSettings: React.FC = () => {
  const { settings, updateSettings, updateElevenLabsAccount } = useStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error'; message: string } | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // KIE API 테스트 (이미지 생성)
  const testKieApiKey = async () => {
    if (!settings.kieApiKey) return;

    setLoading((prev) => ({ ...prev, kie: true }));
    setTestResults((prev) => ({ ...prev, kie: null }));

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.kieApiKey,
          prompt: 'test',
          aspectRatio: '16:9',
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.imageUrl) {
        if (data.demo) {
          setTestResults((prev) => ({ 
            ...prev, 
            kie: { status: 'error', message: '데모 모드: 유효한 API 키가 필요합니다' } 
          }));
        } else {
          setTestResults((prev) => ({ 
            ...prev, 
            kie: { status: 'success', message: 'API 키가 유효합니다' } 
          }));
        }
      } else {
        setTestResults((prev) => ({ 
          ...prev, 
          kie: { status: 'error', message: data.error || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        kie: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, kie: false }));
  };

  // ElevenLabs API 테스트
  const testElevenLabsApiKey = async (accountIndex: number) => {
    const account = settings.elevenLabsAccounts[accountIndex];
    if (!account.apiKey) return;

    const key = `eleven-${accountIndex}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    setTestResults((prev) => ({ ...prev, [key]: null }));

    try {
      const response = await fetch('/api/fetch-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: account.apiKey }),
      });

      const data = await response.json();
      
      if (response.ok && data.voices) {
        if (data.demo) {
          setTestResults((prev) => ({ 
            ...prev, 
            [key]: { status: 'error', message: '데모 모드: 유효한 API 키가 필요합니다' } 
          }));
        } else {
          setTestResults((prev) => ({ 
            ...prev, 
            [key]: { status: 'success', message: `API 키 유효 (보이스 ${data.voices.length}개)` } 
          }));
        }
      } else {
        setTestResults((prev) => ({ 
          ...prev, 
          [key]: { status: 'error', message: data.error || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        [key]: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  // 보이스 목록 가져오기
  const fetchVoices = async (accountIndex: number) => {
    const account = settings.elevenLabsAccounts[accountIndex];
    if (!account.apiKey) return;

    const key = `voices-${accountIndex}`;
    setLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch('/api/fetch-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: account.apiKey }),
      });

      const data = await response.json();
      
      if (response.ok && data.voices) {
        const voices: VoiceOption[] = data.voices.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.description,
        }));
        updateElevenLabsAccount(accountIndex, { voices });
        
        if (data.demo) {
          alert('데모 모드: 유효한 API 키를 입력하면 실제 보이스 목록을 가져올 수 있습니다.');
        }
      } else {
        alert(data.error || '보이스를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      alert('연결 오류가 발생했습니다.');
    }

    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  // YouTube API 테스트
  const testYoutubeApiKey = async () => {
    if (!settings.youtubeApiKey) return;

    setLoading((prev) => ({ ...prev, youtube: true }));
    setTestResults((prev) => ({ ...prev, youtube: null }));

    try {
      // YouTube Data API v3 검증 (간단한 search 요청)
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=test&key=${settings.youtubeApiKey}`
      );

      if (response.ok) {
        setTestResults((prev) => ({ 
          ...prev, 
          youtube: { status: 'success', message: 'API 키가 유효합니다' } 
        }));
      } else {
        const data = await response.json();
        setTestResults((prev) => ({ 
          ...prev, 
          youtube: { status: 'error', message: data.error?.message || 'API 키가 유효하지 않습니다' } 
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({ 
        ...prev, 
        youtube: { status: 'error', message: '연결 오류가 발생했습니다' } 
      }));
    }

    setLoading((prev) => ({ ...prev, youtube: false }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Info Banner */}
      <Card className="bg-primary/10 border-primary/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">API 키 설정 안내</h4>
            <p className="text-sm text-muted mt-1">
              각 서비스의 API 키를 입력하면 실제 기능이 작동합니다. 
              API 키는 브라우저의 로컬 스토리지에 안전하게 저장됩니다.
            </p>
          </div>
        </div>
      </Card>

      {/* KIE (Image Generation) API */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          이미지 생성 API (KIE / Genspark)
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKeys.kie ? 'text' : 'password'}
                value={settings.kieApiKey}
                onChange={(e) => updateSettings({ kieApiKey: e.target.value })}
                placeholder="이미지 생성 API 키를 입력하세요"
                icon={<Key className="w-4 h-4" />}
              />
              <button
                onClick={() => toggleShowKey('kie')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showKeys.kie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={testKieApiKey}
              disabled={!settings.kieApiKey || loading.kie}
              isLoading={loading.kie}
            >
              테스트
            </Button>
          </div>
          {testResults.kie && (
            <div className={`flex items-center gap-2 text-sm ${testResults.kie.status === 'success' ? 'text-success' : 'text-error'}`}>
              {testResults.kie.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {testResults.kie.message}
            </div>
          )}
          <p className="text-xs text-muted">
            Genspark 이미지 생성 API 키를 입력하세요. 2D 애니, 3D 애니, 실사 스타일의 이미지를 생성할 수 있습니다.
          </p>
        </div>
      </Card>

      {/* ElevenLabs Accounts */}
      {settings.elevenLabsAccounts.map((account, index) => (
        <Card key={index}>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-secondary" />
            ElevenLabs {account.name}
            <span className="text-xs font-normal text-muted bg-card-hover px-2 py-1 rounded">
              계정 {index + 1}
            </span>
          </h3>
          <div className="space-y-4">
            {/* Account Name */}
            <Input
              label="계정 이름"
              value={account.name}
              onChange={(e) => updateElevenLabsAccount(index, { name: e.target.value })}
              placeholder="계정 이름 (선택)"
            />

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                API 키
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showKeys[`eleven-${index}`] ? 'text' : 'password'}
                    value={account.apiKey}
                    onChange={(e) => updateElevenLabsAccount(index, { apiKey: e.target.value })}
                    placeholder="ElevenLabs API 키를 입력하세요"
                    icon={<Key className="w-4 h-4" />}
                  />
                  <button
                    onClick={() => toggleShowKey(`eleven-${index}`)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showKeys[`eleven-${index}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => testElevenLabsApiKey(index)}
                  disabled={!account.apiKey || loading[`eleven-${index}`]}
                  isLoading={loading[`eleven-${index}`]}
                >
                  테스트
                </Button>
              </div>
              {testResults[`eleven-${index}`] && (
                <div className={`flex items-center gap-2 text-sm ${testResults[`eleven-${index}`]?.status === 'success' ? 'text-success' : 'text-error'}`}>
                  {testResults[`eleven-${index}`]?.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {testResults[`eleven-${index}`]?.message}
                </div>
              )}
            </div>

            {/* Voices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-muted-foreground">
                  등록된 보이스 ({account.voices.length}개)
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchVoices(index)}
                  disabled={!account.apiKey || loading[`voices-${index}`]}
                  isLoading={loading[`voices-${index}`]}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  보이스 불러오기
                </Button>
              </div>
              {account.voices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {account.voices.map((voice) => (
                    <div
                      key={voice.id}
                      className="px-3 py-1.5 bg-card-hover rounded-lg text-sm flex items-center gap-2 group"
                    >
                      <Volume2 className="w-3 h-3 text-primary" />
                      <span>{voice.name}</span>
                      <span className="text-xs text-muted hidden group-hover:inline">
                        {voice.id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted py-3 text-center bg-card-hover rounded-lg">
                  API 키를 입력하고 &apos;보이스 불러오기&apos;를 클릭하세요
                </p>
              )}
            </div>

            {/* Usage Note */}
            <p className="text-xs text-muted">
              ElevenLabs 계정을 {index + 1}개 이상 등록하여 API 사용량을 분산할 수 있습니다.
            </p>
          </div>
        </Card>
      ))}

      {/* YouTube API */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          YouTube Data API
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKeys.youtube ? 'text' : 'password'}
                value={settings.youtubeApiKey}
                onChange={(e) => updateSettings({ youtubeApiKey: e.target.value })}
                placeholder="YouTube Data API 키를 입력하세요"
                icon={<Key className="w-4 h-4" />}
              />
              <button
                onClick={() => toggleShowKey('youtube')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showKeys.youtube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={testYoutubeApiKey}
              disabled={!settings.youtubeApiKey || loading.youtube}
              isLoading={loading.youtube}
            >
              테스트
            </Button>
          </div>
          {testResults.youtube && (
            <div className={`flex items-center gap-2 text-sm ${testResults.youtube?.status === 'success' ? 'text-success' : 'text-error'}`}>
              {testResults.youtube?.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {testResults.youtube?.message}
            </div>
          )}
          <p className="text-xs text-muted">
            YouTube API는 트렌드 분석, 댓글 분석, 수익 대시보드 기능에 사용됩니다.
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              API 키 발급하기 →
            </a>
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default ApiSettings;
