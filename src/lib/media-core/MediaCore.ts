
import { VoiceEngine, VoiceGenerationOptions } from './VoiceEngine';
import { SubtitleEngine, SubtitleOptions } from './SubtitleEngine';

/**
 * MediaCore - The Standalone Media Lab
 * 
 * Usage:
 * const core = new MediaCore({ openai: '...', elevenlabs: '...' });
 * const audio = await core.voice.generate({...});
 * const subs = await core.subtitle.generate(audio, {...});
 */
export class MediaCore {
  public voice: VoiceEngine;
  public subtitle: SubtitleEngine;

  constructor(private apiKeys: Record<string, string>) {
    this.voice = new VoiceEngine(apiKeys);
    this.subtitle = new SubtitleEngine(apiKeys);
  }

  /**
   * Helper: Translate text directly
   */
  async translate(text: string, targetLang: string): Promise<string> {
    // Placeholder for generic translation
    return text;
  }
}
