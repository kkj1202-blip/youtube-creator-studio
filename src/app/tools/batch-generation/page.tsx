"use client";

import { useState } from 'react';

// Simplified type definition
interface Scene {
  id: string;
  index: number;
  timecode: string;
  content: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

export default function BatchGenerationPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data.scenes) {
        setScenes(data.scenes.map((s: any) => ({ ...s, status: 'pending' })));
      }
    } catch (err) {
      alert('Failed to parse Excel file.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Start Batch Logic
  const startBatch = async () => {
    if (scenes.length === 0) return;
    setIsProcessing(true);

    // Filter pending tasks
    const pendingScenes = scenes.filter(s => s.status === 'pending' || s.status === 'failed');

    for (const scene of pendingScenes) {
      if (!scene.prompt) continue;

      // Update State: Generating
      updateSceneStatus(scene.id, 'processing');
      setCurrentProcessingId(scene.id);

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             prompt: scene.prompt,
             whiskMode: 'api', // API Queued Mode
             imageSource: 'whisk'
          })
        });

        const data = await res.json();

        if (data.success && data.imageUrl) {
           updateSceneStatus(scene.id, 'completed', data.imageUrl);
        } else {
           updateSceneStatus(scene.id, 'failed', undefined, data.error || 'Unknown Error');
        }

      } catch (e: any) {
        updateSceneStatus(scene.id, 'failed', undefined, e.message);
      }
    }

    setIsProcessing(false);
    setCurrentProcessingId(null);
  };

  const updateSceneStatus = (id: string, status: Scene['status'], imageUrl?: string, error?: string) => {
    setScenes(prev => prev.map(s => {
        if (s.id === id) {
            return { ...s, status, imageUrl, error };
        }
        return s;
    }));
  };

  return (
    <div className="flex h-screen bg-[#111111] text-white">
      {/* Sidebar Mockup - Ideally import shared sidebar */}
      <div className="w-64 bg-[#1e1e1e] border-r border-[#333] p-4 hidden md:block">
        <h1 className="text-xl font-bold mb-8 text-yellow-400">G-Labs Auto</h1>
        <div className="space-y-2">
            <div className="p-2 bg-[#333] rounded">Batch Generation</div>
            <div className="p-2 text-gray-400">Settings</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#333] flex items-center justify-between px-6 bg-[#1a1a1a]">
            <h2 className="text-lg font-semibold">Excel Batch Processing</h2>
            <div className="flex gap-4">
                <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="hidden" 
                    id="excel-upload"
                    onChange={handleFileUpload}
                />
                <label 
                    htmlFor="excel-upload"
                    className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                    {isUploading ? 'Uploading...' : 'Import Excel'}
                </label>
                
                <button
                    onClick={startBatch}
                    disabled={isProcessing || scenes.length === 0}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        isProcessing 
                        ? 'bg-yellow-600 cursor-wait' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    {isProcessing ? 'Processing Queue...' : 'Start Batch'}
                </button>
            </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-auto p-6">
            {scenes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-[#333] rounded-lg">
                    <p className="text-xl mb-2">No Scenes Loaded</p>
                    <p className="text-sm">Import an Excel file to start</p>
                </div>
            ) : (
                <div className="bg-[#1e1e1e] rounded-lg border border-[#333] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#252525] text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-4 w-16">#</th>
                                <th className="p-4 w-24">Time</th>
                                <th className="p-4 w-1/4">Content</th>
                                <th className="p-4">Prompt</th>
                                <th className="p-4 w-32">Status</th>
                                <th className="p-4 w-32">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {scenes.map((scene) => (
                                <tr key={scene.id} className="hover:bg-[#2a2a2a] transition-colors">
                                    <td className="p-4 text-gray-500">{scene.index}</td>
                                    <td className="p-4 font-mono text-sm text-yellow-500">{scene.timecode}</td>
                                    <td className="p-4 text-gray-300 text-sm truncate max-w-[200px]">{scene.content}</td>
                                    <td className="p-4 text-gray-400 text-xs italic truncate max-w-[300px]">{scene.prompt}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                            scene.status === 'completed' ? 'bg-green-900 text-green-300' :
                                            scene.status === 'processing' ? 'bg-yellow-900 text-yellow-300 animate-pulse' :
                                            scene.status === 'failed' ? 'bg-red-900 text-red-300' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {scene.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {scene.imageUrl ? (
                                            <a href={scene.imageUrl} target="_blank" rel="noopener noreferrer">
                                                <img 
                                                    src={scene.imageUrl} 
                                                    alt="Result" 
                                                    className="w-16 h-9 object-cover rounded border border-gray-600 hover:border-white transition-colors"
                                                />
                                            </a>
                                        ) : scene.status === 'failed' ? (
                                            <span className="text-red-500 text-xs" title={scene.error}>Error</span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
