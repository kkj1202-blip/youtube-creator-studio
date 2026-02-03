
/**
 * Standalone Subtitle Engine Interface
 * Decoupled from Project/Scene types.
 */

export interface SubtitleOptions {
  language: string; // 'en', 'ko', 'auto'
  format: 'srt' | 'vtt' | 'json';
  maxCharsPerLine?: number;
  provider?: 'openai' | 'local-whisper';
}

export interface SubtitleResult {
  rawText: string;
  formattedContent: string; // SRT or VTT content
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

export class SubtitleEngine {
  constructor(private apiKeys: Record<string, string>) {}

  /**
   * Transcribe audio/video file to subtitles
   */
  async generate(
    mediaFile: Blob | ArrayBuffer, 
    options: SubtitleOptions
  ): Promise<SubtitleResult> {
    console.log(`[SubtitleEngine] Generating subtitles (${options.format})...`);
    // Placeholder implementation
    return {
      rawText: "",
      formattedContent: "",
      segments: []
    };
  }
}
