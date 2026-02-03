
export interface GVVAHealthResponse {
  status: string;
  engine: string;
  gpu_accel: string;
}

export interface ProcessResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface TaskStatus {
  task_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  result_url?: string;
}

/**
 * Client for the Python GVVA Core (on localhost:8000)
 */
export class GVVAClient {
  private baseUrl = 'http://localhost:8000';

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'operational';
    } catch (e) {
      console.error('GVVA Core unreachable:', e);
      return false;
    }
  }

  async processVideo(
    file: File, 
    targetLang: string = 'ja',
    apiKeys?: { openai?: string; eleven?: string }
  ): Promise<ProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_lang', targetLang);

    const headers: Record<string, string> = {};
    if (apiKeys?.openai) headers['x-openai-key'] = apiKeys.openai;
    if (apiKeys?.eleven) headers['x-eleven-key'] = apiKeys.eleven;

    const res = await fetch(`${this.baseUrl}/api/process-video`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GVVA Error: ${err}`);
    }

    return await res.json();
  }

  async pollTaskStatus(taskId: string): Promise<TaskStatus> {
    const res = await fetch(`${this.baseUrl}/api/task-status/${taskId}`);
    if (!res.ok) {
      throw new Error('Failed to fetch task status');
    }
    return await res.json();
  }
}

export const gvvaClient = new GVVAClient();
