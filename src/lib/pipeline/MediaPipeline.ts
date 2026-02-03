
import { Project, Scene } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export type PipelineStage = 'idle' | 'translating' | 'voice_generation' | 'image_generation' | 'video_rendering' | 'subtitle_generation' | 'merging' | 'completed' | 'error';

export interface PipelineState {
  stage: PipelineStage;
  progress: number; // 0-100
  currentSceneId?: string;
  error?: string;
  logs: string[];
}

export type PipelineListener = (state: PipelineState) => void;

/**
 * MediaPipeline
 * 
 * Orchestrates the entire content generation flow:
 * Script -> [Translation] -> Voice -> Image -> [Video] -> Subtitle -> Final Render
 */
export class MediaPipeline {
  private state: PipelineState = {
    stage: 'idle',
    progress: 0,
    logs: []
  };

  private listeners: PipelineListener[] = [];
  private project: Project | null = null;
  private shouldStop: boolean = false;

  constructor() {}

  /**
   * Initialize with a project
   */
  public loadProject(project: Project) {
    this.project = project;
    this.log(`Project loaded: ${project.name} (${project.scenes.length} scenes)`);
  }

  /**
   * Start the pipeline
   */
  public async start() {
    if (!this.project) {
      this.setError('No project loaded');
      return;
    }

    this.shouldStop = false;
    this.updateState('translating', 0);
    
    try {
      // 1. Translation (Placeholder for now)
      await this.runTranslation();

      // 2. Voice Generation
      await this.runVoiceGeneration();

      // 3. Image Generation
      await this.runImageGeneration();

      // 4. Video Rendering (Scene level)
      await this.runSceneRendering();

      // 5. Final Merge (optional, usually scene rendering is enough for now)
      
      this.updateState('completed', 100);
      this.log('Pipeline execution completed successfully');

    } catch (error) {
      console.error(error);
      this.setError(error instanceof Error ? error.message : 'Unknown pipeline error');
    }
  }

  /**
   * Stop execution
   */
  public stop() {
    this.shouldStop = true;
    this.log('Pipeline stop requested');
  }

  // ======================== Stages ========================

  private async runTranslation() {
    if (this.shouldStop) return;
    this.log('Starting translation phase check...');
    // TODO: Implement Translation Agent integration
    // For now, pass through
    this.updateProgress(10);
  }

  private async runVoiceGeneration() {
    if (this.shouldStop) return;
    this.updateState('voice_generation', 20);
    this.log('Starting voice generation...');
    
    // TODO: Implement Voice Generation Batching
    // Iterate scenes and generate audio if missing
  }

  private async runImageGeneration() {
    if (this.shouldStop) return;
    this.updateState('image_generation', 40);
    this.log('Starting image generation...');

    // TODO: Implement Image Generation Batching
  }

  private async runSceneRendering() {
    if (this.shouldStop) return;
    this.updateState('video_rendering', 60);
    this.log('Starting video rendering...');

    // TODO: Implement FFmpeg Rendering
  }

  // ======================== State Management ========================

  public subscribe(listener: PipelineListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private updateState(stage: PipelineStage, progress: number) {
    this.state.stage = stage;
    this.state.progress = progress;
    this.notify();
  }

  private updateProgress(progress: number) {
    this.state.progress = progress;
    this.notify();
  }

  private setError(message: string) {
    this.state.stage = 'error';
    this.state.error = message;
    this.log(`ERROR: ${message}`);
    this.notify();
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`[Pipeline] ${logMessage}`);
    this.state.logs.push(logMessage);
    this.notify(); // Notify on log update too? Maybe limit this
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }
}

export const mediaPipeline = new MediaPipeline();
