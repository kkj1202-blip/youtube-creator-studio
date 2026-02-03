
/**
 * Standalone Voice Engine Interface
 * Decoupled from Project/Scene types.
 */

export interface VoiceGenerationOptions {
  text: string;
  voiceId: string; // Provider specific ID
  provider: 'elevenlabs' | 'fishaudio' | 'kokoro' | 'openai';
  speed?: number; // 0.5 - 2.0
  emotion?: string; // Generic emotion tag
  outputFormat?: 'mp3' | 'wav' | 'pcm';
}

export interface VoiceProvider {
  id: string;
  name: string;
  generate(options: VoiceGenerationOptions): Promise<ArrayBuffer>;
  getVoices(): Promise<any[]>;
}

export class VoiceEngine {
  // Registry of providers
  // selectProvider(name)
  // generate(options)
  
  constructor(private apiKeys: Record<string, string>) {}

  async generate(options: VoiceGenerationOptions): Promise<ArrayBuffer> {
    console.log(`[VoiceEngine] Generating audio via ${options.provider}...`);
    // Placeholder implementation
    return new ArrayBuffer(0);
  }
}
